import { useCallback, useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { buscarTodasLinhas } from "../lib/supabasePagination";

function rowParaTecido(row) {
  return {
    id: row.id,
    codigo: row.codigo,
    fornecedor: row.fornecedor || "",
    saldoMetros: parseFloat(row.saldo_metros) || 0,
    metrosPorRolo: parseFloat(row.metros_por_rolo) || 30,
  };
}

export function useEstoqueTecidos() {
  const [estoque, setEstoque] = useState([]);
  const [movimentos, setMovimentos] = useState([]);
  const [consumoPorTecido, setConsumoPorTecido] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const [emAndamento, setEmAndamento] = useState(0);

  async function comIndicador(fn) {
    setEmAndamento((n) => n + 1);
    try {
      return await fn();
    } finally {
      setEmAndamento((n) => n - 1);
    }
  }

  const recarregar = useCallback(async () => {
    setLoading(true);
    const [{ data: tecidos, error: errTec }, { data: movs, error: errMov }] = await Promise.all([
      supabase.from("estoque_tecidos").select("*").order("codigo"),
      supabase.from("estoque_movimentos").select("*").order("criado_em", { ascending: false }).limit(40),
    ]);
    if (errTec || errMov) {
      setErro((errTec || errMov).message);
    } else {
      setErro(null);
      setEstoque((tecidos || []).map(rowParaTecido));
      setMovimentos(movs || []);
    }

    // Consumo total (saídas) por tecido, pra ranking — separado do feed
    // de "últimas movimentações" acima (esse é limitado a 40 registros no
    // total, insuficiente pra somar o histórico completo de cada código).
    const saidas = await buscarTodasLinhas(() => supabase.from("estoque_movimentos").select("estoque_id, metros").eq("tipo", "saida"));
    const porTecido = new Map();
    saidas.forEach((m) => {
      porTecido.set(m.estoque_id, (porTecido.get(m.estoque_id) || 0) + (parseFloat(m.metros) || 0));
    });
    setConsumoPorTecido([...porTecido.entries()].map(([estoqueId, totalMetros]) => ({ estoqueId, totalMetros })));

    setLoading(false);
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  function encontrarPorCodigo(codigo) {
    const chave = (codigo || "").trim().toLowerCase();
    return estoque.find((e) => e.codigo.trim().toLowerCase() === chave) || null;
  }

  // Cadastra um código novo no estoque (ou, se já existir, só atualiza
  // fornecedor/metros por rolo) — não mexe no saldo, isso é feito por
  // registrarCompra.
  async function cadastrarTecido(codigo, fornecedor, metrosPorRolo) {
    return comIndicador(async () => {
      const { error } = await supabase
        .from("estoque_tecidos")
        .upsert({ codigo: codigo.trim(), fornecedor: fornecedor || null, metros_por_rolo: Number(metrosPorRolo) || 30 }, { onConflict: "codigo_normalizado", ignoreDuplicates: false });
      if (error) throw error;
      await recarregar();
    });
  }

  // Registra uma compra (entrada) — rolos * metrosPorRolo, ou metros direto.
  async function registrarCompra(estoqueId, metros, motivo) {
    return comIndicador(async () => {
      const item = estoque.find((e) => e.id === estoqueId);
      if (!item) throw new Error("Tecido não encontrado no estoque");
      const novoSaldo = item.saldoMetros + Number(metros);
      const { error: errUpd } = await supabase.from("estoque_tecidos").update({ saldo_metros: novoSaldo, atualizado_em: new Date().toISOString() }).eq("id", estoqueId);
      if (errUpd) throw errUpd;
      const { error: errMov } = await supabase
        .from("estoque_movimentos")
        .insert({ estoque_id: estoqueId, tipo: "entrada", metros: Number(metros), motivo: motivo || "Compra registrada" });
      if (errMov) throw errMov;
      await recarregar();
    });
  }

  // Dá baixa (saída) — usado quando um pedido consome metros desse tecido.
  // Retorna o saldo resultante (pode ficar negativo — só um alerta visual,
  // não bloqueia o lançamento do pedido).
  async function darBaixa(estoqueId, metros, motivo) {
    return comIndicador(async () => {
      const item = estoque.find((e) => e.id === estoqueId);
      if (!item) throw new Error("Tecido não encontrado no estoque");
      const novoSaldo = item.saldoMetros - Number(metros);
      const { error: errUpd } = await supabase.from("estoque_tecidos").update({ saldo_metros: novoSaldo, atualizado_em: new Date().toISOString() }).eq("id", estoqueId);
      if (errUpd) throw errUpd;
      const { error: errMov } = await supabase
        .from("estoque_movimentos")
        .insert({ estoque_id: estoqueId, tipo: "saida", metros: Number(metros), motivo: motivo || "Uso em pedido" });
      if (errMov) throw errMov;
      await recarregar();
      return novoSaldo;
    });
  }

  async function removerTecido(estoqueId) {
    return comIndicador(async () => {
      const { error } = await supabase.from("estoque_tecidos").delete().eq("id", estoqueId);
      if (error) throw error;
      await recarregar();
    });
  }

  return {
    estoque,
    movimentos,
    consumoPorTecido,
    loading,
    erro,
    limparErro: () => setErro(null),
    saving: emAndamento > 0,
    recarregar,
    encontrarPorCodigo,
    cadastrarTecido,
    registrarCompra,
    darBaixa,
    removerTecido,
  };
}
