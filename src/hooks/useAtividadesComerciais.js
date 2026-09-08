import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

// Contatos e agendamentos do funil comercial, registrados por semana à
// mão pelo próprio vendedor — "Fechamentos" e a taxa de conversão não
// moram aqui, vêm calculados dos pedidos reais em FunilVendas.jsx.
// RLS: o vendedor só grava/lê as próprias linhas; o dono lê de todos,
// pra acompanhar (schema_v63/v65).
export function useAtividadesComerciais(vendedorId) {
  const [atividades, setAtividades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(null);

  async function recarregar() {
    if (!vendedorId) {
      setAtividades([]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("atividades_comerciais")
      .select("*")
      .eq("vendedor_id", vendedorId)
      .order("semana", { ascending: false });
    if (error) setErro(error.message);
    setAtividades(
      (data || []).map((row) => ({
        semana: row.semana,
        contatos: row.contatos || 0,
        agendamentos: row.agendamentos || 0,
      }))
    );
    setLoading(false);
  }

  useEffect(() => {
    setLoading(true);
    recarregar();
    // eslint-disable-next-line
  }, [vendedorId]);

  // Não engole erro do upsert em silêncio — sem isso, uma falha (RLS,
  // conexão etc.) parecia "salvar" pro vendedor (o botão só voltava ao
  // normal) sem nunca persistir nada.
  async function salvarSemana(semana, campos) {
    setSalvando(true);
    setErro(null);
    const { error } = await supabase.from("atividades_comerciais").upsert(
      {
        vendedor_id: vendedorId,
        semana,
        contatos: campos.contatos || 0,
        agendamentos: campos.agendamentos || 0,
      },
      { onConflict: "vendedor_id,semana" }
    );
    if (error) {
      setErro(error.message);
    } else {
      await recarregar();
    }
    setSalvando(false);
    return !error;
  }

  return { atividades, loading, salvando, erro, salvarSemana };
}
