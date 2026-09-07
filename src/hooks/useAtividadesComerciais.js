import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

// Atividades de prospecção/funil comercial (contatos, conversas,
// atendimentos, indicações recebidas), registradas por semana — direto
// do "5 números da semana" do Manual de Vendas Schuck. "Clientes novos"
// não mora aqui: já vem calculado dos pedidos reais em FunilVendas.jsx.
// RLS: o vendedor só grava/lê as próprias linhas; o dono lê de todos,
// pra acompanhar (schema_v63).
export function useAtividadesComerciais(vendedorId) {
  const [atividades, setAtividades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  async function recarregar() {
    if (!vendedorId) {
      setAtividades([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("atividades_comerciais")
      .select("*")
      .eq("vendedor_id", vendedorId)
      .order("semana", { ascending: false });
    setAtividades(
      (data || []).map((row) => ({
        semana: row.semana,
        contatos: row.contatos || 0,
        conversas: row.conversas || 0,
        atendimentos: row.atendimentos || 0,
        indicacoesRecebidas: row.indicacoes_recebidas || 0,
      }))
    );
    setLoading(false);
  }

  useEffect(() => {
    setLoading(true);
    recarregar();
    // eslint-disable-next-line
  }, [vendedorId]);

  async function salvarSemana(semana, campos) {
    setSalvando(true);
    const { error } = await supabase.from("atividades_comerciais").upsert(
      {
        vendedor_id: vendedorId,
        semana,
        contatos: campos.contatos || 0,
        conversas: campos.conversas || 0,
        atendimentos: campos.atendimentos || 0,
        indicacoes_recebidas: campos.indicacoesRecebidas || 0,
      },
      { onConflict: "vendedor_id,semana" }
    );
    if (!error) await recarregar();
    setSalvando(false);
    return !error;
  }

  return { atividades, loading, salvando, salvarSemana };
}
