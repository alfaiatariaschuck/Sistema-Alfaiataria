import { useCallback, useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

function rowParaNota(row) {
  return {
    id: row.id,
    texto: row.texto,
    categoria: row.categoria,
    tags: row.tags || [],
    criadoEm: row.criado_em,
  };
}

export function useNotasCerebro() {
  const [notas, setNotas] = useState([]);
  const [loading, setLoading] = useState(true);

  const recarregar = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("notas_cerebro").select("*").order("criado_em", { ascending: false });
    setNotas((data || []).map(rowParaNota));
    setLoading(false);
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  async function criarNota({ texto, categoria, tags }) {
    const { data, error } = await supabase
      .from("notas_cerebro")
      .insert({ texto: texto.trim(), categoria: categoria.trim(), tags: tags || [] })
      .select()
      .single();
    if (error) throw error;
    setNotas((prev) => [rowParaNota(data), ...prev]);
  }

  async function atualizarCampo(id, campo, valor) {
    setNotas((prev) => prev.map((n) => (n.id === id ? { ...n, [campo]: valor } : n)));
    const coluna = campo === "texto" ? "texto" : campo === "categoria" ? "categoria" : campo === "tags" ? "tags" : null;
    if (!coluna) return;
    await supabase.from("notas_cerebro").update({ [coluna]: valor }).eq("id", id);
  }

  async function removerNota(id) {
    setNotas((prev) => prev.filter((n) => n.id !== id));
    await supabase.from("notas_cerebro").delete().eq("id", id);
  }

  return { notas, loading, recarregar, criarNota, atualizarCampo, removerNota };
}
