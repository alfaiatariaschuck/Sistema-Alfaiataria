import { useCallback, useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

function rowParaMembro(row) {
  return {
    id: row.id,
    nome: row.nome,
    ativo: row.ativo,
    trabalhandoHoje: row.trabalhando_hoje,
    tiposPeca: row.tipos_peca || [],
    horasPorDia: row.horas_por_dia ?? 8,
    diasPorSemana: row.dias_por_semana ?? 5,
    tipoRemuneracao: row.tipo_remuneracao || "",
    valorRemuneracao: row.valor_remuneracao ?? "",
  };
}

const CAMPO_PARA_COLUNA = {
  trabalhandoHoje: "trabalhando_hoje",
  tiposPeca: "tipos_peca",
  horasPorDia: "horas_por_dia",
  diasPorSemana: "dias_por_semana",
  tipoRemuneracao: "tipo_remuneracao",
  valorRemuneracao: "valor_remuneracao",
};

// Equipe de produção (Ícaro + freelancers) — quem está ativo no time e
// quem está trabalhando hoje. Usado pra sugerir nomes no campo
// Responsável e pra calcular quantas peças dá pra produzir em paralelo
// na previsão de entrega.
//
// somenteVisaoPublica=true lê de "equipe_producao_publica" (view sem
// tipo_remuneracao/valor_remuneracao) em vez da tabela cheia — usado no
// login de produção (ShellProducao), que nunca precisa desses dois
// campos pra nada e não pode receber quanto cada colega ganha. A tela
// do dono (Equipe.jsx) sempre usa o padrão (tabela cheia).
export function useEquipeProducao(somenteVisaoPublica = false) {
  const [equipe, setEquipe] = useState([]);
  const [loading, setLoading] = useState(true);

  const recarregar = useCallback(async () => {
    setLoading(true);
    const fonte = somenteVisaoPublica ? "equipe_producao_publica" : "equipe_producao";
    const { data, error } = await supabase.from(fonte).select("*").order("nome");
    if (!error) setEquipe((data || []).map(rowParaMembro));
    setLoading(false);
  }, [somenteVisaoPublica]);

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
    const coluna = CAMPO_PARA_COLUNA[campo] || campo;
    setEquipe((prev) => prev.map((m) => (m.id === id ? { ...m, [campo]: valor } : m)));
    // valor_remuneracao é numeric no banco — string vazia dá erro, tem
    // que virar null (mesmo problema já visto com colunas de data).
    const valorFinal = campo === "valorRemuneracao" ? (valor === "" ? null : Number(valor)) : valor;
    await supabase.from("equipe_producao").update({ [coluna]: valorFinal }).eq("id", id);
  }

  async function removerMembro(id) {
    setEquipe((prev) => prev.filter((m) => m.id !== id));
    await supabase.from("equipe_producao").delete().eq("id", id);
  }

  return { equipe, loading, adicionarMembro, atualizarMembro, removerMembro };
}
