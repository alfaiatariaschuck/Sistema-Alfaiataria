import { useCallback, useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

function rowParaMembro(row) {
  return { id: row.id, nome: row.nome, ativo: row.ativo, trabalhandoHoje: row.trabalhando_hoje };
}

// Equipe de produção (Ícaro + freelancers) — quem está ativo no time e
// quem está trabalhando hoje. Usado pra sugerir nomes no campo
// Responsável e pra calcular quantas peças dá pra produzir em paralelo
// na previsão de entrega.
export function useEquipeProducao() {
  const [equipe, setEquipe] = useState([]);
  const [loading, setLoading] = useState(true);

  const recarregar = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("equipe_producao").select("*").order("nome");
    if (!error) setEquipe((data || []).map(rowParaMembro));
    setLoading(false);
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  async function adicionarMembro(nome) {
    const limpo = nome.trim();
    if (!limpo) return;
    const { data, error } = await supabase.from("equipe_producao").insert({ nome: limpo }).select().single();
    if (!error) setEquipe((prev) => [...prev, rowParaMembro(data)].sort((a, b) => a.nome.localeCompare(b.nome)));
  }

  async function atualizarMembro(id, campo, valor) {
    const coluna = campo === "trabalhandoHoje" ? "trabalhando_hoje" : campo;
    setEquipe((prev) => prev.map((m) => (m.id === id ? { ...m, [campo]: valor } : m)));
    await supabase.from("equipe_producao").update({ [coluna]: valor }).eq("id", id);
  }

  async function removerMembro(id) {
    setEquipe((prev) => prev.filter((m) => m.id !== id));
    await supabase.from("equipe_producao").delete().eq("id", id);
  }

  return { equipe, loading, adicionarMembro, atualizarMembro, removerMembro };
}
