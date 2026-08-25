import { useCallback, useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

function rowParaDespesa(row) {
  return {
    id: row.id,
    descricao: row.descricao,
    categoria: row.categoria || "",
    valor: row.valor,
    vencimento: row.vencimento,
    status: row.status,
    recorrente: !!row.recorrente,
  };
}

export function useDespesas() {
  const [despesas, setDespesas] = useState([]);
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
    const { data, error } = await supabase.from("despesas").select("*").order("vencimento", { ascending: true });
    if (error) {
      setErro(error.message);
    } else {
      setErro(null);
      setDespesas(data.map(rowParaDespesa));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  async function criarDespesa({ descricao, categoria, valor, vencimento, recorrente }) {
    return comIndicador(async () => {
      const { error } = await supabase.from("despesas").insert({
        descricao,
        categoria: categoria || null,
        valor: Number(valor) || 0,
        vencimento,
        recorrente: !!recorrente,
        status: "Pendente",
      });
      if (error) throw error;
      await recarregar();
    });
  }

  // Ao marcar uma despesa recorrente como paga, já lança a próxima ocorrência
  // (mesmo dia, um mês depois) como pendente — assim ela não some da lista.
  async function marcarPaga(id) {
    const despesa = despesas.find((d) => d.id === id);
    return comIndicador(async () => {
      const { error } = await supabase.from("despesas").update({ status: "Pago" }).eq("id", id);
      if (error) throw error;
      if (despesa && despesa.recorrente) {
        const proxima = new Date(despesa.vencimento + "T00:00:00");
        proxima.setMonth(proxima.getMonth() + 1);
        const { error: errProx } = await supabase.from("despesas").insert({
          descricao: despesa.descricao,
          categoria: despesa.categoria || null,
          valor: despesa.valor,
          vencimento: proxima.toISOString().slice(0, 10),
          recorrente: true,
          status: "Pendente",
        });
        if (errProx) throw errProx;
      }
      await recarregar();
    });
  }

  async function removerDespesa(id) {
    return comIndicador(async () => {
      const { error } = await supabase.from("despesas").delete().eq("id", id);
      if (error) throw error;
      await recarregar();
    });
  }

  return {
    despesas,
    loading,
    erro,
    limparErro: () => setErro(null),
    saving: emAndamento > 0,
    recarregar,
    criarDespesa,
    marcarPaga,
    removerDespesa,
  };
}
