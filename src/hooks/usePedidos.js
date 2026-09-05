import { useCallback, useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { DESC_LABELS, MEDIDA_LABELS } from "../lib/constants";
import { encontrarOuCriarCliente } from "../lib/clientes";
import { hojeISO } from "../lib/helpers";

function medidasVazias() {
  return Object.fromEntries(MEDIDA_LABELS.map((l) => [l, ""]));
}
function descricaoVazia() {
  return Object.fromEntries(DESC_LABELS.map((l) => [l, ""]));
}

export function pedidoVazio() {
  return {
    cliente: "",
    vendedor: "",
    dataPedido: new Date().toISOString().slice(0, 10),
    previsaoEntrega: "",
    dataEntrega: "",
    quantidade: 1,
    status: "Aguardando Produção",
    qtEntregue: 0,
    aReceber: { valor: "", statusPagamento: "Pendente" },
    pagamentoDividido: false,
    valorEntrada: "",
    statusEntrada: "Pendente",
    valorRestante: "",
    statusRestante: "Pendente",
    formaPagamento: "",
    formaPagamentoEntrada: "",
    formaPagamentoRestante: "",
    recompra: false,
    assinatura: false,
    pagoFabiana: { valor: "", statusPagamento: "Pendente", qtdCamisas: "" },
    pagamentoFabianaDividido: false,
    valorEntradaFabiana: "",
    statusEntradaFabiana: "Pendente",
    valorRestanteFabiana: "",
    statusRestanteFabiana: "Pendente",
    medidas: medidasVazias(),
    descricao: descricaoVazia(),
    tecidos: [{ codigo: "", nomenclatura: "", qtd: 1, numero: "", fornecedor: "", comprado: false }],
    observacoes: "",
    enviadoFabi: false,
    medidasNovas: false,
    tecidoChegou: false,
  };
}

function rowParaPedido(row) {
  return {
    id: row.id,
    clienteId: row.cliente_id,
    criadoPor: row.criado_por || null,
    vendedorAtribuidoId: row.vendedor_atribuido_id || null,
    cliente: row.clientes?.nome || "",
    vendedor: row.vendedor || "",
    dataPedido: row.data_pedido,
    previsaoEntrega: row.previsao_entrega || "",
    dataEntrega: row.data_entrega || "",
    quantidade: row.quantidade,
    status: row.status,
    qtEntregue: row.qt_entregue,
    aReceber: { valor: row.valor_receber ?? "", statusPagamento: row.status_pagamento_receber },
    pagamentoDividido: !!row.pagamento_dividido,
    valorEntrada: row.valor_entrada ?? "",
    statusEntrada: row.status_entrada || "Pendente",
    valorRestante: row.valor_restante ?? "",
    statusRestante: row.status_restante || "Pendente",
    formaPagamento: row.forma_pagamento || "",
    formaPagamentoEntrada: row.forma_pagamento_entrada || "",
    formaPagamentoRestante: row.forma_pagamento_restante || "",
    recompra: row.recompra,
    assinatura: row.plano_assinatura,
    pagoFabiana: { valor: row.valor_pago_fabiana ?? "", statusPagamento: row.status_pagamento_fabiana, qtdCamisas: row.qtd_camisas_fabiana ?? "" },
    pagamentoFabianaDividido: !!row.pagamento_fabiana_dividido,
    valorEntradaFabiana: row.valor_entrada_fabiana ?? "",
    statusEntradaFabiana: row.status_entrada_fabiana || "Pendente",
    valorRestanteFabiana: row.valor_restante_fabiana ?? "",
    statusRestanteFabiana: row.status_restante_fabiana || "Pendente",
    medidas: { ...medidasVazias(), ...(row.medidas || {}) },
    descricao: { ...descricaoVazia(), ...(row.descricao || {}) },
    tecidos: (row.tecidos || [])
      .slice()
      .sort((a, b) => a.ordem - b.ordem)
      .map((t) => ({
        id: t.id,
        codigo: t.codigo || "",
        nomenclatura: t.nomenclatura || "",
        qtd: t.qtd ?? 1,
        numero: t.numero || "",
        fornecedor: t.fornecedor || "",
        metragem: t.metragem || "",
        valorMetro: t.valor_metro ?? "",
        comprado: !!t.comprado,
        metrosBaixados: t.metros_baixados ?? null,
      })),
    observacoes: row.observacoes || "",
    enviadoFabi: row.enviado_fabi === undefined ? true : !!row.enviado_fabi,
    medidasNovas: !!row.medidas_novas,
    tecidoChegou: !!row.tecido_chegou,
  };
}

const SELECT = "*, clientes(nome), tecidos(*)";

const CAMPO_PARA_COLUNA = {
  vendedor: "vendedor",
  vendedorAtribuidoId: "vendedor_atribuido_id",
  dataPedido: "data_pedido",
  previsaoEntrega: "previsao_entrega",
  dataEntrega: "data_entrega",
  quantidade: "quantidade",
  status: "status",
  qtEntregue: "qt_entregue",
  pagamentoDividido: "pagamento_dividido",
  valorEntrada: "valor_entrada",
  statusEntrada: "status_entrada",
  valorRestante: "valor_restante",
  statusRestante: "status_restante",
  formaPagamento: "forma_pagamento",
  formaPagamentoEntrada: "forma_pagamento_entrada",
  formaPagamentoRestante: "forma_pagamento_restante",
  pagamentoFabianaDividido: "pagamento_fabiana_dividido",
  valorEntradaFabiana: "valor_entrada_fabiana",
  statusEntradaFabiana: "status_entrada_fabiana",
  valorRestanteFabiana: "valor_restante_fabiana",
  statusRestanteFabiana: "status_restante_fabiana",
  recompra: "recompra",
  assinatura: "plano_assinatura",
  medidas: "medidas",
  descricao: "descricao",
  observacoes: "observacoes",
  enviadoFabi: "enviado_fabi",
  medidasNovas: "medidas_novas",
  tecidoChegou: "tecido_chegou",
};

export function usePedidos() {
  const [pedidos, setPedidos] = useState([]);
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
    const { data, error } = await supabase.from("pedidos").select(SELECT).order("data_pedido", { ascending: false });
    if (error) {
      setErro(error.message);
    } else {
      setErro(null);
      setPedidos(data.map(rowParaPedido));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  async function criarPedido(p) {
    return comIndicador(async () => {
      const clienteId = await encontrarOuCriarCliente(p.cliente);
      const { data: pedidoRow, error } = await supabase
        .from("pedidos")
        .insert({
          cliente_id: clienteId,
          vendedor: p.vendedor || null,
          data_pedido: p.dataPedido,
          previsao_entrega: p.previsaoEntrega || null,
          quantidade: Number(p.quantidade) || 1,
          status: p.status,
          qt_entregue: Number(p.qtEntregue) || 0,
          valor_receber: p.aReceber.valor === "" ? null : Number(p.aReceber.valor),
          status_pagamento_receber: p.aReceber.statusPagamento,
          pagamento_dividido: !!p.pagamentoDividido,
          valor_entrada: p.valorEntrada === "" ? null : Number(p.valorEntrada),
          status_entrada: p.statusEntrada || null,
          valor_restante: p.valorRestante === "" ? null : Number(p.valorRestante),
          status_restante: p.statusRestante || null,
          forma_pagamento: p.formaPagamento || null,
          forma_pagamento_entrada: p.formaPagamentoEntrada || null,
          forma_pagamento_restante: p.formaPagamentoRestante || null,
          recompra: !!p.recompra,
          plano_assinatura: !!p.assinatura,
          origem_plano_id: p.origemPlanoId || null,
          valor_pago_fabiana: p.pagoFabiana.valor === "" ? null : Number(p.pagoFabiana.valor),
          status_pagamento_fabiana: p.pagoFabiana.statusPagamento,
          qtd_camisas_fabiana: p.pagoFabiana.qtdCamisas === "" || p.pagoFabiana.qtdCamisas == null ? null : Number(p.pagoFabiana.qtdCamisas),
          pagamento_fabiana_dividido: !!p.pagamentoFabianaDividido,
          valor_entrada_fabiana: p.valorEntradaFabiana === "" ? null : Number(p.valorEntradaFabiana),
          status_entrada_fabiana: p.statusEntradaFabiana || null,
          valor_restante_fabiana: p.valorRestanteFabiana === "" ? null : Number(p.valorRestanteFabiana),
          status_restante_fabiana: p.statusRestanteFabiana || null,
          medidas: p.medidas,
          descricao: p.descricao,
          observacoes: p.observacoes || null,
          enviado_fabi: false,
          medidas_novas: !!p.medidasNovas,
          tecido_chegou: false,
        })
        .select("id")
        .single();
      if (error) throw error;

      const tecidosParaInserir = (p.tecidos || [])
        .filter((t) => t.codigo || t.fornecedor || t.numero || t.nomenclatura || t.metragem || t.valorMetro)
        .map((t, i) => ({
          pedido_id: pedidoRow.id,
          codigo: t.codigo || null,
          nomenclatura: t.nomenclatura || null,
          qtd: Number(t.qtd) || 1,
          numero: t.numero || null,
          fornecedor: t.fornecedor || null,
          metragem: t.metragem || null,
          valor_metro: t.valorMetro === "" || t.valorMetro == null ? null : Number(t.valorMetro),
          comprado: !!t.comprado,
          ordem: i,
        }));
      if (tecidosParaInserir.length) {
        const { error: errTec } = await supabase.from("tecidos").insert(tecidosParaInserir);
        if (errTec) throw errTec;
      }
      await recarregar();
      return { id: pedidoRow.id, clienteId };
    });
  }

  async function atualizarCampo(pedidoId, campo, valor) {
    // Ao marcar como Entregue, grava a data automaticamente (se ainda não
    // tiver uma) — é o que alimenta o cálculo de tempo médio de produção.
    const pedidoAtual = pedidos.find((p) => p.id === pedidoId);
    const marcarEntrega = campo === "status" && valor === "Entregue" && pedidoAtual && !pedidoAtual.dataEntrega;
    const patch = marcarEntrega ? { [campo]: valor, dataEntrega: hojeISO() } : { [campo]: valor };

    setPedidos((prev) => prev.map((p) => (p.id === pedidoId ? { ...p, ...patch } : p)));
    const coluna = CAMPO_PARA_COLUNA[campo];
    if (!coluna) return;
    await comIndicador(async () => {
      const update = { [coluna]: valor === "" ? null : valor };
      if (marcarEntrega) update.data_entrega = patch.dataEntrega;
      const { error } = await supabase.from("pedidos").update(update).eq("id", pedidoId);
      if (error) setErro(error.message);
    });
  }

  async function atualizarSubcampo(pedidoId, grupo, sub, valor) {
    setPedidos((prev) => prev.map((p) => (p.id === pedidoId ? { ...p, [grupo]: { ...p[grupo], [sub]: valor } } : p)));
    const MAPA_COLUNA = {
      aReceber: { valor: "valor_receber", statusPagamento: "status_pagamento_receber" },
      pagoFabiana: { valor: "valor_pago_fabiana", statusPagamento: "status_pagamento_fabiana", qtdCamisas: "qtd_camisas_fabiana" },
    };
    const coluna = MAPA_COLUNA[grupo]?.[sub];
    const ehNumerico = sub === "valor" || sub === "qtdCamisas";
    const valorFinal = ehNumerico ? (valor === "" ? null : Number(valor)) : valor;
    await comIndicador(async () => {
      if (!coluna) return;
      const { error } = await supabase.from("pedidos").update({ [coluna]: valorFinal }).eq("id", pedidoId);
      if (error) setErro(error.message);
    });
  }

  async function removerPedido(pedidoId) {
    setPedidos((prev) => prev.filter((p) => p.id !== pedidoId));
    await comIndicador(async () => {
      const { error } = await supabase.from("pedidos").delete().eq("id", pedidoId);
      if (error) setErro(error.message);
    });
  }

  async function adicionarTecido(pedidoId) {
    const pedido = pedidos.find((p) => p.id === pedidoId);
    const ordem = pedido ? pedido.tecidos.length : 0;
    await comIndicador(async () => {
      const { data, error } = await supabase
        .from("tecidos")
        .insert({ pedido_id: pedidoId, qtd: 1, comprado: false, ordem })
        .select()
        .single();
      if (error) {
        setErro(error.message);
        return;
      }
      setPedidos((prev) =>
        prev.map((p) =>
          p.id === pedidoId
            ? { ...p, tecidos: [...p.tecidos, { id: data.id, codigo: "", nomenclatura: "", qtd: 1, numero: "", fornecedor: "", comprado: false, metrosBaixados: null }] }
            : p
        )
      );
    });
  }

  async function atualizarTecido(pedidoId, tecidoId, campo, valor) {
    setPedidos((prev) =>
      prev.map((p) =>
        p.id === pedidoId ? { ...p, tecidos: p.tecidos.map((t) => (t.id === tecidoId ? { ...t, [campo]: valor } : t)) } : p
      )
    );
    // valorMetro é "valor_metro" (numeric) no banco — string vazia dá erro, tem que virar null.
    const coluna = campo === "valorMetro" ? "valor_metro" : campo;
    const valorFinal = campo === "qtd" ? Number(valor) || 1 : campo === "valorMetro" ? (valor === "" ? null : Number(valor)) : valor;
    await comIndicador(async () => {
      const { error } = await supabase.from("tecidos").update({ [coluna]: valorFinal }).eq("id", tecidoId);
      if (error) setErro(error.message);
    });
  }

  return {
    pedidos,
    loading,
    erro,
    limparErro: () => setErro(null),
    saving: emAndamento > 0,
    recarregar,
    criarPedido,
    atualizarCampo,
    atualizarSubcampo,
    removerPedido,
    adicionarTecido,
    atualizarTecido,
  };
}
