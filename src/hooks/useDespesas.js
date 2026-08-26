import { useCallback, useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

function rowParaDespesa(row) {
  return {
    id: row.id,
    descricao: row.descricao,
    categoria: row.categoria || "",
    fornecedor: row.fornecedor || "",
    valor: row.valor,
    valorPago: row.valor_pago ?? 0,
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

  async function criarDespesa({ descricao, categoria, fornecedor, valor, vencimento, recorrente }) {
    return comIndicador(async () => {
      const { error } = await supabase.from("despesas").insert({
        descricao,
        categoria: categoria || null,
        fornecedor: fornecedor || null,
        valor: Number(valor) || 0,
        valor_pago: 0,
        vencimento,
        recorrente: !!recorrente,
        status: "Pendente",
      });
      if (error) throw error;
      await recarregar();
    });
  }

  // Ao registrar um pagamento (total ou parcial), atualiza o status conforme
  // o quanto já foi pago — e, se a despesa é recorrente e ficou totalmente
  // paga, já lança a próxima ocorrência (mesmo dia, um mês depois) pendente.
  async function atualizarValorPago(id, novoValorPago) {
    const despesa = despesas.find((d) => d.id === id);
    return comIndicador(async () => {
      const pago = Math.max(0, Number(novoValorPago) || 0);
      const total = parseFloat(despesa?.valor) || 0;
      const status = pago <= 0 ? "Pendente" : pago >= total ? "Pago" : "Parcial";
      const { error } = await supabase.from("despesas").update({ valor_pago: pago, status }).eq("id", id);
      if (error) throw error;
      if (despesa && despesa.recorrente && status === "Pago") {
        const proxima = new Date(despesa.vencimento + "T00:00:00");
        proxima.setMonth(proxima.getMonth() + 1);
        const { error: errProx } = await supabase.from("despesas").insert({
          descricao: despesa.descricao,
          categoria: despesa.categoria || null,
          fornecedor: despesa.fornecedor || null,
          valor: despesa.valor,
          valor_pago: 0,
          vencimento: proxima.toISOString().slice(0, 10),
          recorrente: true,
          status: "Pendente",
        });
        if (errProx) throw errProx;
      }
      await recarregar();
    });
  }

  // Atalho pro botão de "marcar como paga" — quita o valor inteiro de uma vez.
  async function marcarPaga(id) {
    const despesa = despesas.find((d) => d.id === id);
    return atualizarValorPago(id, despesa?.valor || 0);
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
    atualizarValorPago,
    removerDespesa,
  };
}
