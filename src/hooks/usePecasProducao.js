import { useCallback, useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { hojeISO } from "../lib/helpers";

// Consulta separada da do dono — só as colunas que o Ícaro pode ver.
// Sem valor_total, valor_pago, forma_pagamento, valor_venda,
// status_pagamento_venda nem nada de pagamento: mesmo que o RLS já
// restrinja o resto do banco pra esse papel, essa tela nem pede esses
// campos, então eles nunca chegam a trafegar até o navegador dele.
const SELECT_PRODUCAO =
  "id, data_pedido, previsao_entrega, data_entrega, data_inicio_producao, tipo_peca, status, observacoes, observacoes_producao, medidas, caracteristicas, clientes(nome), tecidos(codigo, qtd, numero, fornecedor)";

function rowParaPecaProducao(row) {
  return {
    id: row.id,
    cliente: row.clientes?.nome || "",
    tipoPeca: row.tipo_peca,
    dataPedido: row.data_pedido,
    previsaoEntrega: row.previsao_entrega || "",
    dataEntrega: row.data_entrega || "",
    dataInicioProducao: row.data_inicio_producao || "",
    status: row.status,
    observacoes: row.observacoes || "",
    observacoesProducao: row.observacoes_producao || "",
    medidas: row.medidas || {},
    caracteristicas: row.caracteristicas || {},
    tecidos: row.tecidos || [],
  };
}

export function usePecasProducao() {
  const [pecas, setPecas] = useState([]);
  const [loading, setLoading] = useState(true);

  const recarregar = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("pedidos_alfaiataria").select(SELECT_PRODUCAO).order("data_pedido", { ascending: true });
    setPecas((data || []).map(rowParaPecaProducao));
    setLoading(false);
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  async function marcarInicio(id) {
    setPecas((prev) => prev.map((p) => (p.id === id ? { ...p, dataInicioProducao: hojeISO() } : p)));
    await supabase.from("pedidos_alfaiataria").update({ data_inicio_producao: hojeISO() }).eq("id", id);
  }

  async function atualizarStatus(id, status) {
    setPecas((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));
    await supabase.from("pedidos_alfaiataria").update({ status }).eq("id", id);
  }

  async function atualizarObservacaoProducao(id, texto) {
    setPecas((prev) => prev.map((p) => (p.id === id ? { ...p, observacoesProducao: texto } : p)));
    await supabase.from("pedidos_alfaiataria").update({ observacoes_producao: texto }).eq("id", id);
  }

  return { pecas, loading, recarregar, marcarInicio, atualizarStatus, atualizarObservacaoProducao };
}
