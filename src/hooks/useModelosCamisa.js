import { useCallback, useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

function rowParaModelo(row) {
  return {
    id: row.id,
    nome: row.nome,
    ativo: row.ativo ?? true,
  };
}

// Catálogo de modelos de camisa (Social Slim, Casual, Oxford...) — igual
// já existe pra Fornecedores, alimenta o campo "Modelo" do pedido (texto
// livre com sugestão, não FK) e o relatório de mix de vendas.
export function useModelosCamisa() {
  const [modelos, setModelos] = useState([]);
  const [loading, setLoading] = useState(true);

  const recarregar = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("modelos_camisa").select("*").order("nome");
    if (!error) setModelos((data || []).map(rowParaModelo));
    setLoading(false);
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  async function adicionarModelo(nome) {
    const limpo = nome.trim();
    if (!limpo) return;
    const { data, error } = await supabase.from("modelos_camisa").insert({ nome: limpo }).select().single();
    if (!error) setModelos((prev) => [...prev, rowParaModelo(data)].sort((a, b) => a.nome.localeCompare(b.nome)));
  }

  async function atualizarModelo(id, campo, valor) {
    setModelos((prev) => prev.map((m) => (m.id === id ? { ...m, [campo]: valor } : m)));
    await supabase.from("modelos_camisa").update({ [campo]: valor }).eq("id", id);
  }

  async function removerModelo(id) {
    setModelos((prev) => prev.filter((m) => m.id !== id));
    await supabase.from("modelos_camisa").delete().eq("id", id);
  }

  return { modelos, loading, adicionarModelo, atualizarModelo, removerModelo, recarregar };
}
