import { useCallback, useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

function rowParaItem(row) {
  return {
    id: row.id,
    pecaBase: row.peca_base,
    item: row.item,
    unidade: row.unidade || "",
    qtdPorPeca: row.qtd_por_peca ?? 1,
    valorUnitario: row.valor_unitario ?? 0,
    fornecedor: row.fornecedor || "",
    observacoes: row.observacoes || "",
    ordem: row.ordem ?? 0,
  };
}

const CAMPO_PARA_COLUNA = {
  pecaBase: "peca_base",
  qtdPorPeca: "qtd_por_peca",
  valorUnitario: "valor_unitario",
};

// Custo de aviamentos (botão, forro, zíper etc.) por peça-base — igual
// já existe pra tecido em Compras, mas aviamentos não varia por pedido,
// é fixo por tipo de peça. Custo total por peça-base = soma de
// qtdPorPeca × valorUnitario de cada item.
export function useAviamentos() {
  const [itens, setItens] = useState([]);
  const [loading, setLoading] = useState(true);

  const recarregar = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("aviamentos").select("*").order("peca_base").order("ordem");
    if (!error) setItens((data || []).map(rowParaItem));
    setLoading(false);
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  async function adicionarItem(pecaBase) {
    const ordem = itens.filter((i) => i.pecaBase === pecaBase).length;
    const { data, error } = await supabase
      .from("aviamentos")
      .insert({ peca_base: pecaBase, item: "", qtd_por_peca: 1, valor_unitario: 0, ordem })
      .select()
      .single();
    if (!error) setItens((prev) => [...prev, rowParaItem(data)]);
  }

  async function atualizarItem(id, campo, valor) {
    const coluna = CAMPO_PARA_COLUNA[campo] || campo;
    setItens((prev) => prev.map((i) => (i.id === id ? { ...i, [campo]: valor } : i)));
    const valorFinal = campo === "qtdPorPeca" || campo === "valorUnitario" ? (valor === "" ? null : Number(valor)) : valor;
    await supabase.from("aviamentos").update({ [coluna]: valorFinal }).eq("id", id);
  }

  async function removerItem(id) {
    setItens((prev) => prev.filter((i) => i.id !== id));
    await supabase.from("aviamentos").delete().eq("id", id);
  }

  // Custo total de aviamentos por peça-base — {"Calça": 53.61, ...}.
  const custoPorPecaBase = {};
  itens.forEach((i) => {
    const total = (parseFloat(i.qtdPorPeca) || 0) * (parseFloat(i.valorUnitario) || 0);
    custoPorPecaBase[i.pecaBase] = (custoPorPecaBase[i.pecaBase] || 0) + total;
  });

  return { itens, loading, adicionarItem, atualizarItem, removerItem, custoPorPecaBase, recarregar };
}
