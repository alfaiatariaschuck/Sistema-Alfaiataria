import { useCallback, useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

function rowParaPrevisao(row) {
  return {
    id: row.id,
    descricao: row.descricao || "",
    valor: row.valor,
    dataEsperada: row.data_esperada,
  };
}

export function usePrevisoesVenda() {
  const [previsoes, setPrevisoes] = useState([]);
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
    const { data, error } = await supabase.from("previsoes_venda").select("*").order("data_esperada", { ascending: true });
    if (error) {
      setErro(error.message);
    } else {
      setErro(null);
      setPrevisoes(data.map(rowParaPrevisao));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  async function criarPrevisao({ descricao, valor, dataEsperada }) {
    return comIndicador(async () => {
      const { error } = await supabase.from("previsoes_venda").insert({
        descricao: descricao || null,
        valor: Number(valor) || 0,
        data_esperada: dataEsperada,
      });
      if (error) throw error;
      await recarregar();
    });
  }

  async function removerPrevisao(id) {
    return comIndicador(async () => {
      const { error } = await supabase.from("previsoes_venda").delete().eq("id", id);
      if (error) throw error;
      await recarregar();
    });
  }

  return {
    previsoes,
    loading,
    erro,
    limparErro: () => setErro(null),
    saving: emAndamento > 0,
    recarregar,
    criarPrevisao,
    removerPrevisao,
  };
}
