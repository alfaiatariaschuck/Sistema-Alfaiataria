import { useCallback, useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

// Catálogo de modelos disponíveis (fornecedor parceiro) — uma linha por
// combinação modelo/material/cor/numeração/local, igual à planilha que o
// Tales já usa pra controlar o que tem no showroom. Editável direto no
// Painel Sapatos, sem precisar mexer no banco na mão.
function rowParaModelo(row) {
  return {
    id: row.id,
    modelo: row.modelo,
    material: row.material,
    cor: row.cor,
    numeracao: row.numeracao,
    local: row.local || "",
  };
}

export function useModelosSapatos() {
  const [modelos, setModelos] = useState([]);
  const [loading, setLoading] = useState(true);

  const recarregar = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("modelos_sapatos").select("*").order("modelo").order("cor");
    setModelos((data || []).map(rowParaModelo));
    setLoading(false);
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  async function adicionarModelo(m) {
    const { data, error } = await supabase
      .from("modelos_sapatos")
      .insert({ modelo: m.modelo, material: m.material, cor: m.cor, numeracao: m.numeracao, local: m.local || null })
      .select()
      .single();
    if (error) throw error;
    setModelos((prev) => [...prev, rowParaModelo(data)]);
  }

  async function atualizarModelo(id, campo, valor) {
    setModelos((prev) => prev.map((m) => (m.id === id ? { ...m, [campo]: valor } : m)));
    await supabase.from("modelos_sapatos").update({ [campo]: valor }).eq("id", id);
  }

  async function removerModelo(id) {
    setModelos((prev) => prev.filter((m) => m.id !== id));
    await supabase.from("modelos_sapatos").delete().eq("id", id);
  }

  return { modelos, loading, recarregar, adicionarModelo, atualizarModelo, removerModelo };
}
