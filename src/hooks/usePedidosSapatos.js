import { useCallback, useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { encontrarOuCriarCliente } from "../lib/clientes";
import { hojeISO } from "../lib/helpers";

export function pedidoSapatoVazio() {
  return {
    cliente: "",
    modelo: "",
    material: "",
    cor: "",
    numeracao: "",
    personalizacao: "",
    quantidade: 1,
    vendedor: "Tales",
    dataPedido: hojeISO(),
    status: "Pedido registrado",
    previsaoEntrega: "",
    valorVenda: "",
    observacoes: "",
  };
}

function rowParaPedido(row) {
  return {
    id: row.id,
    clienteId: row.cliente_id,
    cliente: row.cliente,
    modelo: row.modelo,
    material: row.material,
    cor: row.cor,
    numeracao: row.numeracao,
    personalizacao: row.personalizacao || "",
    quantidade: row.quantidade ?? 1,
    vendedor: row.vendedor,
    dataPedido: row.data_pedido,
    status: row.status,
    previsaoEntrega: row.previsao_entrega || "",
    dataEntrega: row.data_entrega || "",
    valorVenda: row.valor_venda ?? "",
    observacoes: row.observacoes || "",
  };
}

const CAMPO_PARA_COLUNA = {
  modelo: "modelo",
  material: "material",
  cor: "cor",
  numeracao: "numeracao",
  personalizacao: "personalizacao",
  quantidade: "quantidade",
  vendedor: "vendedor",
  dataPedido: "data_pedido",
  status: "status",
  previsaoEntrega: "previsao_entrega",
  dataEntrega: "data_entrega",
  valorVenda: "valor_venda",
  observacoes: "observacoes",
};

const CAMPOS_NUMERICOS = ["quantidade", "valorVenda"];
const CAMPOS_DATA = ["dataPedido", "previsaoEntrega", "dataEntrega"];

export function usePedidosSapatos() {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);

  const recarregar = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("pedidos_sapatos").select("*").order("data_pedido", { ascending: false });
    if (error) setErro(error.message);
    else {
      setErro(null);
      setPedidos((data || []).map(rowParaPedido));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  async function criarPedido(p) {
    const clienteId = await encontrarOuCriarCliente(p.cliente);
    const { data, error } = await supabase
      .from("pedidos_sapatos")
      .insert({
        cliente_id: clienteId,
        cliente: p.cliente.trim(),
        modelo: p.modelo,
        material: p.material,
        cor: p.cor,
        numeracao: p.numeracao,
        personalizacao: p.personalizacao || null,
        quantidade: Number(p.quantidade) || 1,
        vendedor: p.vendedor || "Tales",
        data_pedido: p.dataPedido,
        status: p.status,
        previsao_entrega: p.previsaoEntrega || null,
        valor_venda: p.valorVenda === "" ? null : Number(p.valorVenda),
        observacoes: p.observacoes || null,
      })
      .select("id")
      .single();
    if (error) throw error;
    await recarregar();
    return { id: data.id, clienteId };
  }

  async function atualizarCampo(id, campo, valor) {
    const pedidoAtual = pedidos.find((p) => p.id === id);
    const marcarEntrega = campo === "status" && valor === "Entregue" && pedidoAtual && !pedidoAtual.dataEntrega;
    const patch = { [campo]: valor, ...(marcarEntrega ? { dataEntrega: hojeISO() } : {}) };

    setPedidos((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    const coluna = CAMPO_PARA_COLUNA[campo];
    if (!coluna) return;
    const valorFinal = CAMPOS_NUMERICOS.includes(campo)
      ? valor === ""
        ? campo === "quantidade"
          ? 1
          : null
        : Number(valor)
      : CAMPOS_DATA.includes(campo)
        ? valor === ""
          ? null
          : valor
        : valor;
    const update = { [coluna]: valorFinal };
    if (marcarEntrega) update.data_entrega = patch.dataEntrega;
    const { error } = await supabase.from("pedidos_sapatos").update(update).eq("id", id);
    if (error) setErro(error.message);
  }

  async function removerPedido(id) {
    setPedidos((prev) => prev.filter((p) => p.id !== id));
    const { error } = await supabase.from("pedidos_sapatos").delete().eq("id", id);
    if (error) setErro(error.message);
  }

  return {
    pedidos,
    loading,
    erro,
    limparErro: () => setErro(null),
    recarregar,
    criarPedido,
    atualizarCampo,
    removerPedido,
  };
}
