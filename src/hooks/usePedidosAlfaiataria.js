import { useCallback, useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { encontrarOuCriarCliente } from "../lib/clientes";
import { hojeISO } from "../lib/helpers";

export function pecaVazia() {
  return {
    cliente: "",
    tipoPeca: "Traje",
    dataPedido: hojeISO(),
    valorTotal: "",
    pago: "",
    observacoes: "",
    // medidas fica agrupada por seção — { corpo: { label: valor }, calca: {...}, colete: {...} }
    medidas: {},
    caracteristicas: {},
  };
}

function rowParaPeca(row) {
  return {
    id: row.id,
    clienteId: row.cliente_id,
    cliente: row.clientes?.nome || "",
    tipoPeca: row.tipo_peca,
    dataPedido: row.data_pedido,
    valorTotal: row.valor_total ?? "",
    pago: row.valor_pago ?? 0,
    observacoes: row.observacoes || "",
    medidas: row.medidas || {},
    caracteristicas: row.caracteristicas || {},
  };
}

const SELECT = "*, clientes(nome)";

const CAMPO_PARA_COLUNA = {
  tipoPeca: "tipo_peca",
  dataPedido: "data_pedido",
  valorTotal: "valor_total",
  pago: "valor_pago",
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
      const { error } = await supabase.from("pedidos_alfaiataria").insert({
        cliente_id: clienteId,
        tipo_peca: p.tipoPeca,
        data_pedido: p.dataPedido,
        valor_total: p.valorTotal === "" ? null : Number(p.valorTotal),
        valor_pago: p.pago === "" ? 0 : Number(p.pago),
        medidas: p.medidas,
        caracteristicas: p.caracteristicas,
        observacoes: p.observacoes || null,
      });
      if (error) throw error;
      await recarregar();
    });
  }

  async function atualizarCampo(pecaId, campo, valor) {
    setPecas((prev) => prev.map((p) => (p.id === pecaId ? { ...p, [campo]: valor } : p)));
    const coluna = CAMPO_PARA_COLUNA[campo];
    if (!coluna) return;
    const valorFinal = ["valorTotal", "pago"].includes(campo) ? (valor === "" ? null : Number(valor)) : valor;
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
  };
}
