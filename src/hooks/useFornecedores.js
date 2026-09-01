import { useCallback, useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

function rowParaFornecedor(row) {
  return {
    id: row.id,
    nome: row.nome,
    contato: row.contato || "",
    observacoes: row.observacoes || "",
  };
}

// Fornecedores de tecido/aviamentos — cadastro próprio, usado nos
// dropdowns de Compras e Aviamentos (substitui a lista fixa antiga).
export function useFornecedores() {
  const [fornecedores, setFornecedores] = useState([]);
  const [loading, setLoading] = useState(true);

  const recarregar = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("fornecedores").select("*").order("nome");
    if (!error) setFornecedores((data || []).map(rowParaFornecedor));
    setLoading(false);
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  async function adicionarFornecedor(nome) {
    const limpo = nome.trim();
    if (!limpo) return;
    const { data, error } = await supabase.from("fornecedores").insert({ nome: limpo }).select().single();
    if (!error) setFornecedores((prev) => [...prev, rowParaFornecedor(data)].sort((a, b) => a.nome.localeCompare(b.nome)));
  }

  async function atualizarFornecedor(id, campo, valor) {
    setFornecedores((prev) => prev.map((f) => (f.id === id ? { ...f, [campo]: valor } : f)));
    await supabase.from("fornecedores").update({ [campo]: valor }).eq("id", id);
  }

  async function removerFornecedor(id) {
    setFornecedores((prev) => prev.filter((f) => f.id !== id));
    await supabase.from("fornecedores").delete().eq("id", id);
  }

  return { fornecedores, loading, adicionarFornecedor, atualizarFornecedor, removerFornecedor };
}
