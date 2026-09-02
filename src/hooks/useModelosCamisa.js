import { useCallback, useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

function rowParaModelo(row) {
  return {
    id: row.id,
    codigo: row.codigo || "",
    nome: row.nome,
    valorReferenciaMetro: row.valor_referencia_metro ?? "",
    precoVenda: row.preco_venda ?? "",
    ativo: row.ativo ?? true,
  };
}

const CAMPO_PARA_COLUNA = {
  valorReferenciaMetro: "valor_referencia_metro",
  precoVenda: "preco_venda",
};
const CAMPOS_NUMERICOS = ["valorReferenciaMetro", "precoVenda"];

// Catálogo de tecidos (camisa OU alfaiataria, conforme a tabela passada),
// categorizado por código + nomenclatura, com um valor de referência por
// metro opcional (fica em branco pros que variam muito de rolo pra rolo)
// e — só na tabela de camisa — um preço de venda tabelado. Alimenta a
// nomenclatura do item de tecido do pedido e, na camisaria, o relatório
// de mix de vendas e a tabela de preço de venda.
function useModelosTecido(tabela) {
  const [modelos, setModelos] = useState([]);
  const [loading, setLoading] = useState(true);

  const recarregar = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from(tabela).select("*").order("nome");
    if (!error) setModelos((data || []).map(rowParaModelo));
    setLoading(false);
    // eslint-disable-next-line
  }, [tabela]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  async function adicionarModelo(nome, codigo, valorReferenciaMetro) {
    const limpo = nome.trim();
    if (!limpo) return;
    const { data, error } = await supabase
      .from(tabela)
      .insert({
        nome: limpo,
        codigo: (codigo || "").trim() || null,
        valor_referencia_metro: valorReferenciaMetro === "" || valorReferenciaMetro == null ? null : Number(valorReferenciaMetro),
      })
      .select()
      .single();
    if (!error) setModelos((prev) => [...prev, rowParaModelo(data)].sort((a, b) => a.nome.localeCompare(b.nome)));
  }

  async function atualizarModelo(id, campo, valor) {
    setModelos((prev) => prev.map((m) => (m.id === id ? { ...m, [campo]: valor } : m)));
    const coluna = CAMPO_PARA_COLUNA[campo] || campo;
    const valorFinal = CAMPOS_NUMERICOS.includes(campo) ? (valor === "" ? null : Number(valor)) : valor;
    await supabase.from(tabela).update({ [coluna]: valorFinal }).eq("id", id);
  }

  async function removerModelo(id) {
    setModelos((prev) => prev.filter((m) => m.id !== id));
    await supabase.from(tabela).delete().eq("id", id);
  }

  // Importa/atualiza em massa, colado direto de uma planilha (ex: lista
  // mensal de fornecedor) — cada item é { nome, codigo, valorReferenciaMetro }.
  // "nome" é único: quem já existe é atualizado (código/valor novos),
  // quem não existe é criado. Não mexe em quem não está na lista colada.
  async function importarModelos(itens) {
    const payload = (itens || [])
      .filter((it) => it.nome && it.nome.trim())
      .map((it) => ({
        nome: it.nome.trim(),
        codigo: (it.codigo || "").trim() || null,
        valor_referencia_metro: it.valorReferenciaMetro === "" || it.valorReferenciaMetro == null ? null : Number(it.valorReferenciaMetro),
      }));
    if (payload.length === 0) return { total: 0 };
    const { error } = await supabase.from(tabela).upsert(payload, { onConflict: "nome" });
    if (error) throw error;
    await recarregar();
    return { total: payload.length };
  }

  return { modelos, loading, adicionarModelo, atualizarModelo, removerModelo, importarModelos, recarregar };
}

export function useModelosCamisa() {
  return useModelosTecido("modelos_camisa");
}

export function useModelosAlfaiataria() {
  return useModelosTecido("modelos_alfaiataria");
}
