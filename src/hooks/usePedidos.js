import { useCallback, useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { DESC_LABELS, MEDIDA_LABELS } from "../lib/constants";

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
    quantidade: 1,
    status: "Aguardando Produção",
    qtEntregue: 0,
    aReceber: { valor: "", statusPagamento: "Pendente" },
    formaPagamento: "",
    recompra: false,
    pagoFabiana: { valor: "", statusPagamento: "Pendente" },
    medidas: medidasVazias(),
    descricao: descricaoVazia(),
    tecidos: [{ codigo: "", qtd: 1, numero: "", fornecedor: "", comprado: false }],
    observacoes: "",
  };
}

function rowParaPedido(row) {
  return {
    id: row.id,
    clienteId: row.cliente_id,
    cliente: row.clientes?.nome || "",
    vendedor: row.vendedor || "",
    dataPedido: row.data_pedido,
    previsaoEntrega: row.previsao_entrega || "",
    quantidade: row.quantidade,
    status: row.status,
    qtEntregue: row.qt_entregue,
    aReceber: { valor: row.valor_receber ?? "", statusPagamento: row.status_pagamento_receber },
    formaPagamento: row.forma_pagamento || "",
    recompra: row.recompra,
    pagoFabiana: { valor: row.valor_pago_fabiana ?? "", statusPagamento: row.status_pagamento_fabiana },
    medidas: { ...medidasVazias(), ...(row.medidas || {}) },
    descricao: { ...descricaoVazia(), ...(row.descricao || {}) },
    tecidos: (row.tecidos || [])
      .slice()
      .sort((a, b) => a.ordem - b.ordem)
      .map((t) => ({
        id: t.id,
        codigo: t.codigo || "",
        qtd: t.qtd ?? 1,
        numero: t.numero || "",
        fornecedor: t.fornecedor || "",
        comprado: !!t.comprado,
      })),
    observacoes: row.observacoes || "",
  };
}

const SELECT = "*, clientes(nome), tecidos(*)";

const CAMPO_PARA_COLUNA = {
  vendedor: "vendedor",
  dataPedido: "data_pedido",
  previsaoEntrega: "previsao_entrega",
  quantidade: "quantidade",
  status: "status",
  qtEntregue: "qt_entregue",
  formaPagamento: "forma_pagamento",
  recompra: "recompra",
  medidas: "medidas",
  descricao: "descricao",
  observacoes: "observacoes",
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

  async function encontrarOuCriarCliente(nome) {
    const nomeNormalizado = nome.trim().toLowerCase();
    const { data: existente } = await supabase
      .from("clientes")
      .select("id")
      .eq("nome_normalizado", nomeNormalizado)
      .maybeSingle();
    if (existente) return existente.id;
    const { data: criado, error } = await supabase.from("clientes").insert({ nome: nome.trim() }).select("id").single();
    if (error) throw error;
    return criado.id;
  }

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
          forma_pagamento: p.formaPagamento || null,
          recompra: !!p.recompra,
          valor_pago_fabiana: p.pagoFabiana.valor === "" ? null : Number(p.pagoFabiana.valor),
          status_pagamento_fabiana: p.pagoFabiana.statusPagamento,
          medidas: p.medidas,
          descricao: p.descricao,
          observacoes: p.observacoes || null,
        })
        .select("id")
        .single();
      if (error) throw error;

      const tecidosParaInserir = (p.tecidos || [])
        .filter((t) => t.codigo || t.fornecedor || t.numero)
        .map((t, i) => ({
          pedido_id: pedidoRow.id,
          codigo: t.codigo || null,
          qtd: Number(t.qtd) || 1,
          numero: t.numero || null,
          fornecedor: t.fornecedor || null,
          comprado: !!t.comprado,
          ordem: i,
        }));
      if (tecidosParaInserir.length) {
        const { error: errTec } = await supabase.from("tecidos").insert(tecidosParaInserir);
        if (errTec) throw errTec;
      }
      await recarregar();
      return pedidoRow.id;
    });
  }

  async function atualizarCampo(pedidoId, campo, valor) {
    setPedidos((prev) => prev.map((p) => (p.id === pedidoId ? { ...p, [campo]: valor } : p)));
    const coluna = CAMPO_PARA_COLUNA[campo];
    if (!coluna) return;
    await comIndicador(async () => {
      const { error } = await supabase
        .from("pedidos")
        .update({ [coluna]: valor === "" ? null : valor })
        .eq("id", pedidoId);
      if (error) setErro(error.message);
    });
  }

  async function atualizarSubcampo(pedidoId, grupo, sub, valor) {
    setPedidos((prev) => prev.map((p) => (p.id === pedidoId ? { ...p, [grupo]: { ...p[grupo], [sub]: valor } } : p)));
    const coluna =
      grupo === "aReceber"
        ? sub === "valor"
          ? "valor_receber"
          : "status_pagamento_receber"
        : sub === "valor"
        ? "valor_pago_fabiana"
        : "status_pagamento_fabiana";
    const valorFinal = sub === "valor" ? (valor === "" ? null : Number(valor)) : valor;
    await comIndicador(async () => {
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
            ? { ...p, tecidos: [...p.tecidos, { id: data.id, codigo: "", qtd: 1, numero: "", fornecedor: "", comprado: false }] }
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
    const valorFinal = campo === "qtd" ? Number(valor) || 1 : valor;
    await comIndicador(async () => {
      const { error } = await supabase.from("tecidos").update({ [campo]: valorFinal }).eq("id", tecidoId);
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
