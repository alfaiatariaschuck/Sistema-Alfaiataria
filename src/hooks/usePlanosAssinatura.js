import { useCallback, useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { encontrarOuCriarCliente } from "../lib/clientes";
import { DESC_LABELS, MEDIDA_LABELS } from "../lib/constants";

function medidasVazias() {
  return Object.fromEntries(MEDIDA_LABELS.map((l) => [l, ""]));
}
function descricaoVazia() {
  return Object.fromEntries(DESC_LABELS.map((l) => [l, ""]));
}

export function planoVazio() {
  return {
    cliente: "",
    vendedor: "",
    quantidade: 12,
    valorReceber: "",
    valorFabiana: "",
    formaPagamento: "",
    medidas: medidasVazias(),
    descricao: descricaoVazia(),
    tecidos: [{ codigo: "", qtd: 1, numero: "", fornecedor: "", comprado: false }],
    observacoes: "",
  };
}

function rowParaPlano(row) {
  return {
    id: row.id,
    clienteId: row.cliente_id,
    cliente: row.clientes?.nome || "",
    vendedor: row.vendedor || "",
    quantidade: row.quantidade,
    qtEntregue: row.qt_entregue,
    valorReceber: row.valor_receber ?? "",
    valorFabiana: row.valor_pago_fabiana ?? "",
    formaPagamento: row.forma_pagamento || "",
    medidas: { ...medidasVazias(), ...(row.medidas || {}) },
    descricao: { ...descricaoVazia(), ...(row.descricao || {}) },
    tecidos: row.tecidos || [],
    observacoes: row.observacoes || "",
    ativo: row.ativo,
  };
}

const SELECT = "*, clientes(nome)";

const CAMPO_PARA_COLUNA = {
  vendedor: "vendedor",
  quantidade: "quantidade",
  qtEntregue: "qt_entregue",
  valorReceber: "valor_receber",
  valorFabiana: "valor_pago_fabiana",
  formaPagamento: "forma_pagamento",
  medidas: "medidas",
  descricao: "descricao",
  tecidos: "tecidos",
  observacoes: "observacoes",
  ativo: "ativo",
};

export function usePlanosAssinatura() {
  const [planos, setPlanos] = useState([]);
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
    const { data, error } = await supabase.from("planos_assinatura").select(SELECT).order("created_at", { ascending: false });
    if (error) {
      setErro(error.message);
    } else {
      setErro(null);
      setPlanos(data.map(rowParaPlano));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  async function criarPlano(pl) {
    return comIndicador(async () => {
      const clienteId = await encontrarOuCriarCliente(pl.cliente);
      const { error } = await supabase.from("planos_assinatura").insert({
        cliente_id: clienteId,
        vendedor: pl.vendedor || null,
        quantidade: Number(pl.quantidade) || 1,
        valor_receber: pl.valorReceber === "" ? null : Number(pl.valorReceber),
        valor_pago_fabiana: pl.valorFabiana === "" || pl.valorFabiana == null ? null : Number(pl.valorFabiana),
        forma_pagamento: pl.formaPagamento || null,
        medidas: pl.medidas,
        descricao: pl.descricao,
        tecidos: pl.tecidos || [],
        observacoes: pl.observacoes || null,
      });
      if (error) throw error;
      await recarregar();
    });
  }

  async function atualizarCampo(planoId, campo, valor) {
    setPlanos((prev) => prev.map((pl) => (pl.id === planoId ? { ...pl, [campo]: valor } : pl)));
    const coluna = CAMPO_PARA_COLUNA[campo];
    if (!coluna) return;
    const valorFinal = ["quantidade", "qtEntregue", "valorReceber", "valorFabiana"].includes(campo) ? (valor === "" ? null : Number(valor)) : valor;
    await comIndicador(async () => {
      const { error } = await supabase.from("planos_assinatura").update({ [coluna]: valorFinal }).eq("id", planoId);
      if (error) setErro(error.message);
    });
  }

  async function atualizarMedida(planoId, label, valor) {
    const plano = planos.find((pl) => pl.id === planoId);
    const medidas = { ...(plano?.medidas || {}), [label]: valor };
    await atualizarCampo(planoId, "medidas", medidas);
  }

  async function atualizarDescricao(planoId, label, valor) {
    const plano = planos.find((pl) => pl.id === planoId);
    const descricao = { ...(plano?.descricao || {}), [label]: valor };
    await atualizarCampo(planoId, "descricao", descricao);
  }

  async function adicionarTecido(planoId) {
    const plano = planos.find((pl) => pl.id === planoId);
    const tecidos = [...(plano?.tecidos || []), { codigo: "", qtd: 1, numero: "", fornecedor: "", comprado: false }];
    await atualizarCampo(planoId, "tecidos", tecidos);
  }

  async function atualizarTecido(planoId, index, campo, valor) {
    const plano = planos.find((pl) => pl.id === planoId);
    const tecidos = (plano?.tecidos || []).map((t, i) => (i === index ? { ...t, [campo]: valor } : t));
    await atualizarCampo(planoId, "tecidos", tecidos);
  }

  async function removerPlano(planoId) {
    setPlanos((prev) => prev.filter((pl) => pl.id !== planoId));
    await comIndicador(async () => {
      const { error } = await supabase.from("planos_assinatura").delete().eq("id", planoId);
      if (error) setErro(error.message);
    });
  }

  return {
    planos,
    loading,
    erro,
    limparErro: () => setErro(null),
    saving: emAndamento > 0,
    recarregar,
    criarPlano,
    atualizarCampo,
    atualizarMedida,
    atualizarDescricao,
    adicionarTecido,
    atualizarTecido,
    removerPlano,
  };
}
