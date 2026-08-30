import { useCallback, useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { encontrarOuCriarCliente } from "../lib/clientes";
import { diasEntre, hojeISO } from "../lib/helpers";

export function pecaVazia() {
  return {
    cliente: "",
    tipoPeca: "Traje",
    dataPedido: hojeISO(),
    previsaoEntrega: "",
    dataEntrega: "",
    status: "Aguardando Produção",
    valorTotal: "",
    pago: "",
    formaPagamento: "",
    valorVenda: "",
    statusPagamentoVenda: "Pendente",
    pagamentoDividido: false,
    valorEntrada: "",
    statusEntrada: "Pendente",
    valorRestante: "",
    statusRestante: "Pendente",
    observacoes: "",
    observacoesProducao: "",
    dataInicioProducao: "",
    dataPausaInicio: "",
    diasPausados: 0,
    responsavel: "",
    responsaveisSecoes: {},
    prioridade: "Normal",
    situacao: "Aguardando",
    enviadoIcaro: false,
    // medidas fica agrupada por seção — { corpo: { label: valor }, calca: {...}, colete: {...} }
    medidas: {},
    caracteristicas: {},
    tecidos: [{ codigo: "", qtd: 1, numero: "", fornecedor: "", comprado: false }],
    medidasNovas: false,
  };
}

function rowParaPeca(row) {
  return {
    id: row.id,
    clienteId: row.cliente_id,
    cliente: row.clientes?.nome || "",
    tipoPeca: row.tipo_peca,
    dataPedido: row.data_pedido,
    previsaoEntrega: row.previsao_entrega || "",
    dataEntrega: row.data_entrega || "",
    status: row.status,
    valorTotal: row.valor_total ?? "",
    pago: row.valor_pago ?? 0,
    formaPagamento: row.forma_pagamento || "",
    valorVenda: row.valor_venda ?? "",
    statusPagamentoVenda: row.status_pagamento_venda || "Pendente",
    pagamentoDividido: !!row.pagamento_dividido,
    valorEntrada: row.valor_entrada ?? "",
    statusEntrada: row.status_entrada || "Pendente",
    valorRestante: row.valor_restante ?? "",
    statusRestante: row.status_restante || "Pendente",
    observacoes: row.observacoes || "",
    observacoesProducao: row.observacoes_producao || "",
    dataInicioProducao: row.data_inicio_producao || "",
    dataPausaInicio: row.data_pausa_inicio || "",
    diasPausados: row.dias_pausados || 0,
    responsavel: row.responsavel || "",
    responsaveisSecoes: row.responsaveis_secoes || {},
    prioridade: row.prioridade || "Normal",
    situacao: row.situacao || "Aguardando",
    enviadoIcaro: row.enviado_icaro === undefined ? true : !!row.enviado_icaro,
    medidas: row.medidas || {},
    caracteristicas: row.caracteristicas || {},
    tecidos: (row.tecidos || [])
      .slice()
      .sort((a, b) => a.ordem - b.ordem)
      .map((t) => ({
        id: t.id,
        codigo: t.codigo || "",
        qtd: t.qtd ?? 1,
        numero: t.numero || "",
        fornecedor: t.fornecedor || "",
        metragem: t.metragem || "",
        comprado: !!t.comprado,
      })),
    medidasNovas: !!row.medidas_novas,
  };
}

const SELECT = "*, clientes(nome), tecidos(*)";

const CAMPO_PARA_COLUNA = {
  tipoPeca: "tipo_peca",
  dataPedido: "data_pedido",
  previsaoEntrega: "previsao_entrega",
  dataEntrega: "data_entrega",
  status: "status",
  valorTotal: "valor_total",
  pago: "valor_pago",
  formaPagamento: "forma_pagamento",
  valorVenda: "valor_venda",
  statusPagamentoVenda: "status_pagamento_venda",
  pagamentoDividido: "pagamento_dividido",
  valorEntrada: "valor_entrada",
  statusEntrada: "status_entrada",
  valorRestante: "valor_restante",
  statusRestante: "status_restante",
  observacoes: "observacoes",
  enviadoIcaro: "enviado_icaro",
  medidas: "medidas",
  caracteristicas: "caracteristicas",
  medidasNovas: "medidas_novas",
  observacoesProducao: "observacoes_producao",
  dataInicioProducao: "data_inicio_producao",
  dataPausaInicio: "data_pausa_inicio",
  diasPausados: "dias_pausados",
  responsavel: "responsavel",
  responsaveisSecoes: "responsaveis_secoes",
  prioridade: "prioridade",
  situacao: "situacao",
};

export function usePedidosAlfaiataria() {
  const [pecas, setPecas] = useState([]);
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
    const { data, error } = await supabase.from("pedidos_alfaiataria").select(SELECT).order("data_pedido", { ascending: false });
    if (error) {
      setErro(error.message);
    } else {
      setErro(null);
      setPecas(data.map(rowParaPeca));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  async function criarPeca(p) {
    return comIndicador(async () => {
      const clienteId = await encontrarOuCriarCliente(p.cliente);
      const { data: pecaRow, error } = await supabase
        .from("pedidos_alfaiataria")
        .insert({
          cliente_id: clienteId,
          tipo_peca: p.tipoPeca,
          data_pedido: p.dataPedido,
          previsao_entrega: p.previsaoEntrega || null,
          status: p.status,
          valor_total: p.valorTotal === "" ? null : Number(p.valorTotal),
          valor_pago: p.pago === "" ? 0 : Number(p.pago),
          forma_pagamento: p.formaPagamento || null,
          valor_venda: p.valorVenda === "" ? null : Number(p.valorVenda),
          status_pagamento_venda: p.statusPagamentoVenda || null,
          pagamento_dividido: !!p.pagamentoDividido,
          valor_entrada: p.valorEntrada === "" ? null : Number(p.valorEntrada),
          status_entrada: p.statusEntrada || null,
          valor_restante: p.valorRestante === "" ? null : Number(p.valorRestante),
          status_restante: p.statusRestante || null,
          medidas: p.medidas,
          caracteristicas: p.caracteristicas,
          observacoes: p.observacoes || null,
          enviado_icaro: false,
          medidas_novas: !!p.medidasNovas,
        })
        .select("id")
        .single();
      if (error) throw error;

      const tecidosParaInserir = (p.tecidos || [])
        .filter((t) => t.codigo || t.fornecedor || t.numero)
        .map((t, i) => ({
          pedido_alfaiataria_id: pecaRow.id,
          codigo: t.codigo || null,
          qtd: Number(t.qtd) || 1,
          numero: t.numero || null,
          fornecedor: t.fornecedor || null,
          comprado: !!t.comprado,
          ordem: i,
        }));
      if (tecidosParaInserir.length) {
        const { error: errTec } = await supabase.from("tecidos").insert(tecidosParaInserir);
        if (errTec) throw errTec;
      }
      await recarregar();
      return { id: pecaRow.id, clienteId };
    });
  }

  async function atualizarCampo(pecaId, campo, valor) {
    const pecaAtual = pecas.find((p) => p.id === pecaId);
    const marcarEntrega = campo === "status" && valor === "Entregue" && pecaAtual && !pecaAtual.dataEntrega;
    // Marcar (ou corrigir) a data de início já deixa a situação como "Em
    // Produção" — senão a peça fica com início lançado mas ainda
    // aparecendo como "Aguardando", o que não faz sentido.
    const marcarEmProducao = campo === "dataInicioProducao" && valor && pecaAtual && pecaAtual.situacao === "Aguardando";
    const patch = {
      [campo]: valor,
      ...(marcarEntrega ? { dataEntrega: hojeISO() } : {}),
      ...(marcarEmProducao ? { situacao: "Em Produção" } : {}),
    };

    setPecas((prev) => prev.map((p) => (p.id === pecaId ? { ...p, ...patch } : p)));
    const coluna = CAMPO_PARA_COLUNA[campo];
    if (!coluna) return;
    const valorFinal = ["valorTotal", "pago", "valorVenda", "valorEntrada", "valorRestante"].includes(campo) ? (valor === "" ? null : Number(valor)) : valor;
    await comIndicador(async () => {
      const update = { [coluna]: valorFinal };
      if (marcarEntrega) update.data_entrega = patch.dataEntrega;
      if (marcarEmProducao) update.situacao = "Em Produção";
      const { error } = await supabase.from("pedidos_alfaiataria").update(update).eq("id", pecaId);
      if (error) setErro(error.message);
    });
  }

  // Pausa/retoma a produção — pra quando o cliente viaja ou some por um
  // tempo e a peça fica parada sem culpa do Ícaro. Os dias pausados não
  // contam no tempo de produção real (diasProducaoReal, em helpers.js).
  async function pausarPeca(pecaId) {
    const patch = { situacao: "Pausado", dataPausaInicio: hojeISO() };
    setPecas((prev) => prev.map((p) => (p.id === pecaId ? { ...p, ...patch } : p)));
    await comIndicador(async () => {
      const { error } = await supabase.from("pedidos_alfaiataria").update({ situacao: "Pausado", data_pausa_inicio: patch.dataPausaInicio }).eq("id", pecaId);
      if (error) setErro(error.message);
    });
  }

  async function retomarPeca(pecaId) {
    const pecaAtual = pecas.find((p) => p.id === pecaId);
    if (!pecaAtual) return;
    const dias = pecaAtual.dataPausaInicio ? diasEntre(pecaAtual.dataPausaInicio, hojeISO()) || 0 : 0;
    const diasPausados = (pecaAtual.diasPausados || 0) + dias;
    const patch = { situacao: "Em Produção", dataPausaInicio: "", diasPausados };
    setPecas((prev) => prev.map((p) => (p.id === pecaId ? { ...p, ...patch } : p)));
    await comIndicador(async () => {
      const { error } = await supabase
        .from("pedidos_alfaiataria")
        .update({ situacao: "Em Produção", data_pausa_inicio: null, dias_pausados: diasPausados })
        .eq("id", pecaId);
      if (error) setErro(error.message);
    });
  }

  // Desfaz o início de produção — pra quando foi clicado por engano.
  // Zera início, pausa e dias pausados e volta a peça pra "Aguardando".
  async function desfazerInicioPeca(pecaId) {
    const patch = { dataInicioProducao: "", dataPausaInicio: "", diasPausados: 0, situacao: "Aguardando" };
    setPecas((prev) => prev.map((p) => (p.id === pecaId ? { ...p, ...patch } : p)));
    await comIndicador(async () => {
      const { error } = await supabase
        .from("pedidos_alfaiataria")
        .update({ data_inicio_producao: null, data_pausa_inicio: null, dias_pausados: 0, situacao: "Aguardando" })
        .eq("id", pecaId);
      if (error) setErro(error.message);
    });
  }

  async function removerPeca(pecaId) {
    setPecas((prev) => prev.filter((p) => p.id !== pecaId));
    await comIndicador(async () => {
      const { error } = await supabase.from("pedidos_alfaiataria").delete().eq("id", pecaId);
      if (error) setErro(error.message);
    });
  }

  async function adicionarTecido(pecaId) {
    const peca = pecas.find((p) => p.id === pecaId);
    const ordem = peca ? peca.tecidos.length : 0;
    await comIndicador(async () => {
      const { data, error } = await supabase
        .from("tecidos")
        .insert({ pedido_alfaiataria_id: pecaId, qtd: 1, comprado: false, ordem })
        .select()
        .single();
      if (error) {
        setErro(error.message);
        return;
      }
      setPecas((prev) =>
        prev.map((p) =>
          p.id === pecaId
            ? { ...p, tecidos: [...p.tecidos, { id: data.id, codigo: "", qtd: 1, numero: "", fornecedor: "", comprado: false }] }
            : p
        )
      );
    });
  }

  async function atualizarTecido(pecaId, tecidoId, campo, valor) {
    setPecas((prev) =>
      prev.map((p) =>
        p.id === pecaId ? { ...p, tecidos: p.tecidos.map((t) => (t.id === tecidoId ? { ...t, [campo]: valor } : t)) } : p
      )
    );
    const valorFinal = campo === "qtd" ? Number(valor) || 1 : valor;
    await comIndicador(async () => {
      const { error } = await supabase.from("tecidos").update({ [campo]: valorFinal }).eq("id", tecidoId);
      if (error) setErro(error.message);
    });
  }

  return {
    pecas,
    loading,
    erro,
    limparErro: () => setErro(null),
    saving: emAndamento > 0,
    recarregar,
    criarPeca,
    atualizarCampo,
    pausarPeca,
    retomarPeca,
    desfazerInicioPeca,
    removerPeca,
    adicionarTecido,
    atualizarTecido,
  };
}
