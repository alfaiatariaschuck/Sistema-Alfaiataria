import { useCallback, useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { diasEntre, hojeISO } from "../lib/helpers";

// Consulta separada da do dono — só as colunas que o Ícaro pode ver.
// Sem valor_total, valor_pago, forma_pagamento, valor_venda,
// status_pagamento_venda nem nada de pagamento: mesmo que o RLS já
// restrinja o resto do banco pra esse papel, essa tela nem pede esses
// campos, então eles nunca chegam a trafegar até o navegador dele.
const SELECT_PRODUCAO =
  "id, cliente_id, data_pedido, previsao_entrega, data_entrega, data_inicio_producao, data_pausa_inicio, dias_pausados, tipo_peca, status, observacoes, observacoes_producao, responsavel, prioridade, situacao, medidas, caracteristicas, clientes(nome), tecidos(codigo, qtd, numero, fornecedor)";

function rowParaPecaProducao(row) {
  return {
    id: row.id,
    clienteId: row.cliente_id,
    cliente: row.clientes?.nome || "",
    tipoPeca: row.tipo_peca,
    dataPedido: row.data_pedido,
    previsaoEntrega: row.previsao_entrega || "",
    dataEntrega: row.data_entrega || "",
    dataInicioProducao: row.data_inicio_producao || "",
    dataPausaInicio: row.data_pausa_inicio || "",
    diasPausados: row.dias_pausados || 0,
    status: row.status,
    observacoes: row.observacoes || "",
    observacoesProducao: row.observacoes_producao || "",
    responsavel: row.responsavel || "",
    prioridade: row.prioridade || "Normal",
    situacao: row.situacao || "Aguardando",
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
    setPecas((prev) => prev.map((p) => (p.id === id ? { ...p, dataInicioProducao: hojeISO(), situacao: "Em Produção" } : p)));
    await supabase.from("pedidos_alfaiataria").update({ data_inicio_producao: hojeISO(), situacao: "Em Produção" }).eq("id", id);
  }

  async function atualizarStatus(id, status) {
    setPecas((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));
    await supabase.from("pedidos_alfaiataria").update({ status }).eq("id", id);
  }

  async function atualizarSituacao(id, situacao) {
    setPecas((prev) => prev.map((p) => (p.id === id ? { ...p, situacao } : p)));
    await supabase.from("pedidos_alfaiataria").update({ situacao }).eq("id", id);
  }

  // Cliente viajou, sumiu, não dá pra provar — pausa o relógio da
  // produção real até ele voltar (sem contar esses dias contra o Ícaro).
  async function pausar(id) {
    setPecas((prev) => prev.map((p) => (p.id === id ? { ...p, situacao: "Pausado", dataPausaInicio: hojeISO() } : p)));
    await supabase.from("pedidos_alfaiataria").update({ situacao: "Pausado", data_pausa_inicio: hojeISO() }).eq("id", id);
  }

  async function retomar(id) {
    const pecaAtual = pecas.find((p) => p.id === id);
    if (!pecaAtual) return;
    const dias = pecaAtual.dataPausaInicio ? diasEntre(pecaAtual.dataPausaInicio, hojeISO()) || 0 : 0;
    const diasPausados = (pecaAtual.diasPausados || 0) + dias;
    setPecas((prev) => prev.map((p) => (p.id === id ? { ...p, situacao: "Em Produção", dataPausaInicio: "", diasPausados } : p)));
    await supabase.from("pedidos_alfaiataria").update({ situacao: "Em Produção", data_pausa_inicio: null, dias_pausados: diasPausados }).eq("id", id);
  }

  async function atualizarObservacaoProducao(id, texto) {
    setPecas((prev) => prev.map((p) => (p.id === id ? { ...p, observacoesProducao: texto } : p)));
    await supabase.from("pedidos_alfaiataria").update({ observacoes_producao: texto }).eq("id", id);
  }

  // Desfaz um início marcado por engano — zera início, pausa e dias pausados.
  async function desfazerInicio(id) {
    setPecas((prev) =>
      prev.map((p) => (p.id === id ? { ...p, dataInicioProducao: "", dataPausaInicio: "", diasPausados: 0, situacao: "Aguardando" } : p))
    );
    await supabase
      .from("pedidos_alfaiataria")
      .update({ data_inicio_producao: null, data_pausa_inicio: null, dias_pausados: 0, situacao: "Aguardando" })
      .eq("id", id);
  }

  return {
    pecas,
    loading,
    recarregar,
    marcarInicio,
    atualizarStatus,
    atualizarSituacao,
    pausar,
    retomar,
    desfazerInicio,
    atualizarObservacaoProducao,
  };
}
