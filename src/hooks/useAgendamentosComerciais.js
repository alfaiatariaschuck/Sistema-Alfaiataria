import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

function rowParaAgendamento(row) {
  return {
    id: row.id,
    cliente: row.cliente,
    data: row.data,
    hora: row.hora || "",
    observacao: row.observacao || "",
    status: row.status || "Agendado",
  };
}

// Agenda comercial: cada agendamento individual do vendedor (cliente,
// dia, hora), diferente do número semanal agregado do Funil de Vendas.
// RLS: o vendedor só grava/lê os próprios (schema_v77); o dono vê e
// mexe em todos, pra acompanhar em tempo real conforme o vendedor agenda.
export function useAgendamentosComerciais(vendedorId) {
  const [agendamentos, setAgendamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);

  async function recarregar() {
    if (!vendedorId) {
      setAgendamentos([]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("agendamentos_comerciais")
      .select("*")
      .eq("vendedor_id", vendedorId)
      .order("data", { ascending: true });
    if (error) setErro(error.message);
    else setErro(null);
    setAgendamentos((data || []).map(rowParaAgendamento));
    setLoading(false);
  }

  useEffect(() => {
    setLoading(true);
    recarregar();
    // eslint-disable-next-line
  }, [vendedorId]);

  async function criarAgendamento({ cliente, data, hora, observacao }) {
    setErro(null);
    const { error } = await supabase.from("agendamentos_comerciais").insert({
      vendedor_id: vendedorId,
      cliente,
      data,
      hora: hora || null,
      observacao: observacao || null,
    });
    if (error) {
      setErro(error.message);
      return false;
    }
    await recarregar();
    return true;
  }

  // Otimista — o dono muda o status de qualquer vendedor (RLS permite),
  // o vendedor só o próprio.
  async function atualizarStatus(id, status) {
    setAgendamentos((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    const { error } = await supabase.from("agendamentos_comerciais").update({ status }).eq("id", id);
    if (error) setErro(error.message);
  }

  async function removerAgendamento(id) {
    setAgendamentos((prev) => prev.filter((a) => a.id !== id));
    const { error } = await supabase.from("agendamentos_comerciais").delete().eq("id", id);
    if (error) setErro(error.message);
  }

  // Edita um campo (cliente/data/hora/observação) de um agendamento já
  // existente — antes só dava pra criar novo ou mudar status, sem jeito
  // de corrigir um reagendamento que passou batido.
  async function atualizarCampo(id, campo, valor) {
    setAgendamentos((prev) => prev.map((a) => (a.id === id ? { ...a, [campo]: valor } : a)));
    const valorFinal = campo === "hora" || campo === "observacao" ? valor || null : valor;
    const { error } = await supabase.from("agendamentos_comerciais").update({ [campo]: valorFinal }).eq("id", id);
    if (error) setErro(error.message);
  }

  return { agendamentos, loading, erro, limparErro: () => setErro(null), recarregar, criarAgendamento, atualizarStatus, atualizarCampo, removerAgendamento };
}
