import { useCallback, useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

// Soma um mês mantendo o mesmo dia — quando o mês seguinte é mais curto
// (ex: vencimento dia 31 e o mês seguinte só tem 28/29/30), usa o último
// dia daquele mês em vez de "estourar" pro mês depois (o que o
// Date.setMonth faria sozinho: 31/jan + 1 mês vira 03/mar, não 28/fev).
function somarUmMes(dataISO) {
  const [ano, mes, dia] = dataISO.split("-").map(Number);
  const proximoMesIndex = mes; // mes já é 1-indexed; próximo mês (0-indexed) = mes
  const ultimoDiaProximoMes = new Date(ano, proximoMesIndex + 1, 0).getDate();
  const diaFinal = Math.min(dia, ultimoDiaProximoMes);
  const anoFinal = ano + Math.floor(proximoMesIndex / 12);
  const mesFinal = (proximoMesIndex % 12) + 1;
  return `${anoFinal}-${String(mesFinal).padStart(2, "0")}-${String(diaFinal).padStart(2, "0")}`;
}

function rowParaDespesa(row) {
  return {
    id: row.id,
    descricao: row.descricao,
    categoria: row.categoria || "",
    fornecedor: row.fornecedor || "",
    valor: row.valor,
    frete: row.frete ?? 0,
    valorPago: row.valor_pago ?? 0,
    vencimento: row.vencimento,
    status: row.status,
    recorrente: !!row.recorrente,
    linha: row.linha || "",
    valorCamisaria: row.valor_camisaria ?? "",
    valorAlfaiataria: row.valor_alfaiataria ?? "",
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

  async function criarDespesa({ descricao, categoria, fornecedor, valor, frete, vencimento, recorrente, linha, valorCamisaria, valorAlfaiataria }) {
    return comIndicador(async () => {
      const { error } = await supabase.from("despesas").insert({
        descricao,
        categoria: categoria || null,
        fornecedor: fornecedor || null,
        valor: Number(valor) || 0,
        frete: Number(frete) || 0,
        valor_pago: 0,
        vencimento,
        recorrente: !!recorrente,
        status: "Pendente",
        linha: linha || null,
        valor_camisaria: valorCamisaria === "" || valorCamisaria == null ? null : Number(valorCamisaria),
        valor_alfaiataria: valorAlfaiataria === "" || valorAlfaiataria == null ? null : Number(valorAlfaiataria),
      });
      if (error) throw error;
      await recarregar();
    });
  }

  // Edita os dados de uma despesa (descrição, categoria, fornecedor, valor,
  // frete, vencimento, linha, valor por linha) — útil pra lançar um valor
  // estimado agora e corrigir depois quando a nota fiscal/valor exato
  // chegar, sem precisar apagar e recriar.
  async function atualizarDespesa(id, { descricao, categoria, fornecedor, valor, frete, vencimento, linha, valorCamisaria, valorAlfaiataria }) {
    return comIndicador(async () => {
      const { error } = await supabase
        .from("despesas")
        .update({
          descricao,
          categoria: categoria || null,
          fornecedor: fornecedor || null,
          valor: Number(valor) || 0,
          frete: Number(frete) || 0,
          vencimento,
          linha: linha || null,
          valor_camisaria: valorCamisaria === "" || valorCamisaria == null ? null : Number(valorCamisaria),
          valor_alfaiataria: valorAlfaiataria === "" || valorAlfaiataria == null ? null : Number(valorAlfaiataria),
        })
        .eq("id", id);
      if (error) throw error;
      await recarregar();
    });
  }

  // Ao registrar um pagamento (total ou parcial), atualiza o status conforme
  // o quanto já foi pago do total (valor + frete) — e, se a despesa é
  // recorrente e ficou totalmente paga, já lança a próxima ocorrência
  // (mesmo dia, um mês depois) pendente.
  async function atualizarValorPago(id, novoValorPago) {
    const despesa = despesas.find((d) => d.id === id);
    return comIndicador(async () => {
      const pago = Math.max(0, Number(novoValorPago) || 0);
      const total = (parseFloat(despesa?.valor) || 0) + (parseFloat(despesa?.frete) || 0);
      const status = pago <= 0 ? "Pendente" : pago >= total ? "Pago" : "Parcial";
      const { error } = await supabase.from("despesas").update({ valor_pago: pago, status }).eq("id", id);
      if (error) throw error;
      if (despesa && despesa.recorrente && status === "Pago") {
        const { error: errProx } = await supabase.from("despesas").insert({
          descricao: despesa.descricao,
          categoria: despesa.categoria || null,
          fornecedor: despesa.fornecedor || null,
          valor: despesa.valor,
          frete: despesa.frete || 0,
          valor_pago: 0,
          vencimento: somarUmMes(despesa.vencimento),
          recorrente: true,
          status: "Pendente",
          linha: despesa.linha || null,
          valor_camisaria: despesa.valorCamisaria === "" || despesa.valorCamisaria == null ? null : Number(despesa.valorCamisaria),
          valor_alfaiataria: despesa.valorAlfaiataria === "" || despesa.valorAlfaiataria == null ? null : Number(despesa.valorAlfaiataria),
        });
        if (errProx) throw errProx;
      }
      await recarregar();
    });
  }

  // Atalho pro botão de "marcar como paga" — quita o valor inteiro (produto + frete) de uma vez.
  async function marcarPaga(id) {
    const despesa = despesas.find((d) => d.id === id);
    return atualizarValorPago(id, (parseFloat(despesa?.valor) || 0) + (parseFloat(despesa?.frete) || 0));
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
    atualizarDespesa,
    removerDespesa,
  };
}
