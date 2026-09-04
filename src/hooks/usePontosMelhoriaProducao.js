import { useCallback, useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { hojeISO } from "../lib/helpers";

function rowParaPonto(row) {
  return {
    id: row.id,
    titulo: row.titulo,
    descricao: row.descricao,
    horasReferencia: row.horas_referencia,
    horasRealAnterior: row.horas_real_anterior,
    bateuMeta: row.bateu_meta,
    dataBateu: row.data_bateu,
    notaIcaro: row.nota_icaro,
  };
}

// Pontos de melhoria de produção (gargalos reais identificados na
// planilha do Ícaro) — carrega direto aqui, sem precisar passar por
// props do Shell/ControleProducao, porque o card fica dentro do
// PainelProducaoResumo, que é usado tanto pelo Tales (dono) quanto
// pelo Ícaro (producao); os dois já têm RLS de acesso na tabela.
export function usePontosMelhoriaProducao() {
  const [pontos, setPontos] = useState([]);
  const [loading, setLoading] = useState(true);

  const recarregar = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("pontos_melhoria_producao").select("*").order("criado_em");
    if (!error) setPontos((data || []).map(rowParaPonto));
    setLoading(false);
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  async function marcarComoBatido(id, notaIcaro) {
    const dataBateu = hojeISO();
    setPontos((prev) => prev.map((p) => (p.id === id ? { ...p, bateuMeta: true, dataBateu, notaIcaro } : p)));
    await supabase.from("pontos_melhoria_producao").update({ bateu_meta: true, data_bateu: dataBateu, nota_icaro: notaIcaro || null }).eq("id", id);
  }

  async function desfazerBatido(id) {
    setPontos((prev) => prev.map((p) => (p.id === id ? { ...p, bateuMeta: false, dataBateu: null } : p)));
    await supabase.from("pontos_melhoria_producao").update({ bateu_meta: false, data_bateu: null }).eq("id", id);
  }

  return { pontos, loading, marcarComoBatido, desfazerBatido };
}
