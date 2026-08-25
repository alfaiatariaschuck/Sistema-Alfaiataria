import { useCallback, useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

function rowParaNota(row) {
  return {
    id: row.id,
    descricao: row.descricao,
    valor: row.valor,
    dataEsperada: row.data_esperada,
  };
}

// Lista de anotações de vendas futuras — puramente um lembrete pro dono não
// esquecer de uma venda que pode vir por aí. Nunca entra em nenhum cálculo
// de saldo/projeção (diferente de previsoes_venda, que entra).
export function useNotasVendaFutura() {
  const [notas, setNotas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const [emAndamento, setEmAndamento] = useState(0);

  async function comIndicador(fn) {
    setEmAndamento((n) => n + 1);
    try {
      return await fn();
    } finally {
      setEmAndamento((n) => n - 1);
    }
  }

  const recarregar = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("notas_venda_futura").select("*").order("criado_em", { ascending: false });
    if (error) {
      setErro(error.message);
    } else {
      setErro(null);
      setNotas(data.map(rowParaNota));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  async function criarNota({ descricao, valor, dataEsperada }) {
    return comIndicador(async () => {
      const { error } = await supabase.from("notas_venda_futura").insert({
        descricao,
        valor: valor === "" || valor == null ? null : Number(valor),
        data_esperada: dataEsperada || null,
      });
      if (error) throw error;
      await recarregar();
    });
  }

  async function removerNota(id) {
    return comIndicador(async () => {
      const { error } = await supabase.from("notas_venda_futura").delete().eq("id", id);
      if (error) throw error;
      await recarregar();
    });
  }

  return {
    notas,
    loading,
    erro,
    limparErro: () => setErro(null),
    saving: emAndamento > 0,
    recarregar,
    criarNota,
    removerNota,
  };
}
