import { useCallback, useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { encontrarOuCriarCliente } from "../lib/clientes";
import { hojeISO } from "../lib/helpers";

export function pecaVazia() {
  return {
    cliente: "",
    tipoPeca: "Traje",
    dataPedido: hojeISO(),
    previsaoEntrega: "",
    status: "Aguardando Produção",
    valorTotal: "",
    pago: "",
    valorVenda: "",
    statusPagamentoVenda: "Pendente",
    pagamentoDividido: false,
    valorEntrada: "",
    statusEntrada: "Pendente",
    valorRestante: "",
    statusRestante: "Pendente",
    observacoes: "",
    // medidas fica agrupada por seção — { corpo: { label: valor }, calca: {...}, colete: {...} }
    medidas: {},
    caracteristicas: {},
    tecidos: [{ codigo: "", qtd: 1, numero: "", fornecedor: "", comprado: false }],
  };
}

function rowParaPeca(row) {
  return {
    id: row.id,
    clienteId: row.cliente_id,
    cliente: row.clientes?.nome || "",
    tipoPeca: row.tipo_peca,
    dataPedido: row.data_pedido,
    previsaoEntrega: row.previsao_entrega || "",
    status: row.status,
    valorTotal: row.valor_total ?? "",
    pago: row.valor_pago ?? 0,
    valorVenda: row.valor_venda ?? "",
    statusPagamentoVenda: row.status_pagamento_venda || "Pendente",
    pagamentoDividido: !!row.pagamento_dividido,
    valorEntrada: row.valor_entrada ?? "",
    statusEntrada: row.status_entrada || "Pendente",
    valorRestante: row.valor_restante ?? "",
    statusRestante: row.status_restante || "Pendente",
    observacoes: row.observacoes || "",
    medidas: row.medidas || {},
    caracteristicas: row.caracteristicas || {},
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
  };
}

const SELECT = "*, clientes(nome), tecidos(*)";

const CAMPO_PARA_COLUNA = {
  tipoPeca: "tipo_peca",
  dataPedido: "data_pedido",
  previsaoEntrega: "previsao_entrega",
  status: "status",
  valorTotal: "valor_total",
  pago: "valor_pago",
  valorVenda: "valor_venda",
  statusPagamentoVenda: "status_pagamento_venda",
  pagamentoDividido: "pagamento_dividido",
  valorEntrada: "valor_entrada",
  statusEntrada: "status_entrada",
  valorRestante: "valor_restante",
  statusRestante: "status_restante",
  observacoes: "observacoes",
  medidas: "medidas",
  caracteristicas: "caracteristicas",
};

export function usePedidosAlfaiataria() {
  const [pecas, setPecas] = useState([]);
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
    const { data, error } = await supabase.from("pedidos_alfaiataria").select(SELECT).order("data_pedido", { ascending: false });
    if (error) {
      setErro(error.message);
    } else {
      setErro(null);
      setPecas(data.map(rowParaPeca));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  async function criarPeca(p) {
    return comIndicador(async () => {
      const clienteId = await encontrarOuCriarCliente(p.cliente);
      const { data: pecaRow, error } = await supabase
        .from("pedidos_alfaiataria")
        .insert({
          cliente_id: clienteId,
          tipo_peca: p.tipoPeca,
          data_pedido: p.dataPedido,
          previsao_entrega: p.previsaoEntrega || null,
          status: p.status,
          valor_total: p.valorTotal === "" ? null : Number(p.valorTotal),
          valor_pago: p.pago === "" ? 0 : Number(p.pago),
          valor_venda: p.valorVenda === "" ? null : Number(p.valorVenda),
          status_pagamento_venda: p.statusPagamentoVenda || null,
          pagamento_dividido: !!p.pagamentoDividido,
          valor_entrada: p.valorEntrada === "" ? null : Number(p.valorEntrada),
          status_entrada: p.statusEntrada || null,
          valor_restante: p.valorRestante === "" ? null : Number(p.valorRestante),
          status_restante: p.statusRestante || null,
          medidas: p.medidas,
          caracteristicas: p.caracteristicas,
          observacoes: p.observacoes || null,
        })
        .select("id")
        .single();
      if (error) throw error;

      const tecidosParaInserir = (p.tecidos || [])
        .filter((t) => t.codigo || t.fornecedor || t.numero)
        .map((t, i) => ({
          pedido_alfaiataria_id: pecaRow.id,
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
      return pecaRow.id;
    });
  }

  async function atualizarCampo(pecaId, campo, valor) {
    setPecas((prev) => prev.map((p) => (p.id === pecaId ? { ...p, [campo]: valor } : p)));
    const coluna = CAMPO_PARA_COLUNA[campo];
    if (!coluna) return;
    const valorFinal = ["valorTotal", "pago", "valorVenda", "valorEntrada", "valorRestante"].includes(campo) ? (valor === "" ? null : Number(valor)) : valor;
    await comIndicador(async () => {
      const { error } = await supabase.from("pedidos_alfaiataria").update({ [coluna]: valorFinal }).eq("id", pecaId);
      if (error) setErro(error.message);
    });
  }

  async function removerPeca(pecaId) {
    setPecas((prev) => prev.filter((p) => p.id !== pecaId));
    await comIndicador(async () => {
      const { error } = await supabase.from("pedidos_alfaiataria").delete().eq("id", pecaId);
      if (error) setErro(error.message);
    });
  }

  async function adicionarTecido(pecaId) {
    const peca = pecas.find((p) => p.id === pecaId);
    const ordem = peca ? peca.tecidos.length : 0;
    await comIndicador(async () => {
      const { data, error } = await supabase
        .from("tecidos")
        .insert({ pedido_alfaiataria_id: pecaId, qtd: 1, comprado: false, ordem })
        .select()
        .single();
      if (error) {
        setErro(error.message);
        return;
      }
      setPecas((prev) =>
        prev.map((p) =>
          p.id === pecaId
            ? { ...p, tecidos: [...p.tecidos, { id: data.id, codigo: "", qtd: 1, numero: "", fornecedor: "", comprado: false }] }
            : p
        )
      );
    });
  }

  async function atualizarTecido(pecaId, tecidoId, campo, valor) {
    setPecas((prev) =>
      prev.map((p) =>
        p.id === pecaId ? { ...p, tecidos: p.tecidos.map((t) => (t.id === tecidoId ? { ...t, [campo]: valor } : t)) } : p
      )
    );
    const valorFinal = campo === "qtd" ? Number(valor) || 1 : valor;
    await comIndicador(async () => {
      const { error } = await supabase.from("tecidos").update({ [campo]: valorFinal }).eq("id", tecidoId);
      if (error) setErro(error.message);
    });
  }

  return {
    pecas,
    loading,
    erro,
    limparErro: () => setErro(null),
    saving: emAndamento > 0,
    recarregar,
    criarPeca,
    atualizarCampo,
    removerPeca,
    adicionarTecido,
    atualizarTecido,
  };
}
