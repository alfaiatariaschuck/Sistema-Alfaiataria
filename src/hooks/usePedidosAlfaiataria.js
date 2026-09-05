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
    previsaoManual: false,
    dataLimiteEvento: "",
    dataEntrega: "",
    status: "Aguardando Produção",
    valorTotal: "",
    pago: "",
    formaPagamento: "",
    formaPagamentoEntrada: "",
    formaPagamentoRestante: "",
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
    pausas: [],
    retrabalho: false,
    retrabalhoObs: "",
    responsavel: "",
    responsaveisSecoes: {},
    prioridade: "Normal",
    situacao: "Aguardando",
    enviadoIcaro: false,
    tecidoChegou: false,
    // medidas fica agrupada por seção — { corpo: { label: valor }, calca: {...}, colete: {...} }
    medidas: {},
    caracteristicas: {},
    tecidos: [{ codigo: "", nomenclatura: "", qtd: 1, numero: "", fornecedor: "", comprado: false }],
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
    previsaoManual: !!row.previsao_manual,
    dataLimiteEvento: row.data_limite_evento || "",
    dataEntrega: row.data_entrega || "",
    status: row.status,
    valorTotal: row.valor_total ?? "",
    pago: row.valor_pago ?? 0,
    formaPagamento: row.forma_pagamento || "",
    formaPagamentoEntrada: row.forma_pagamento_entrada || "",
    formaPagamentoRestante: row.forma_pagamento_restante || "",
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
    pausas: (row.pedidos_alfaiataria_pausas || []).map((pa) => ({
      id: pa.id,
      motivo: pa.motivo,
      dataInicio: pa.data_inicio,
      dataFim: pa.data_fim || "",
      observacao: pa.observacao || "",
    })),
    retrabalho: !!row.retrabalho,
    retrabalhoObs: row.retrabalho_obs || "",
    responsavel: row.responsavel || "",
    responsaveisSecoes: row.responsaveis_secoes || {},
    prioridade: row.prioridade || "Normal",
    situacao: row.situacao || "Aguardando",
    enviadoIcaro: row.enviado_icaro === undefined ? true : !!row.enviado_icaro,
    tecidoChegou: !!row.tecido_chegou,
    medidas: row.medidas || {},
    caracteristicas: row.caracteristicas || {},
    tecidos: (row.tecidos || [])
      .slice()
      .sort((a, b) => a.ordem - b.ordem)
      .map((t) => ({
        id: t.id,
        codigo: t.codigo || "",
        nomenclatura: t.nomenclatura || "",
        qtd: t.qtd ?? 1,
        numero: t.numero || "",
        fornecedor: t.fornecedor || "",
        metragem: t.metragem || "",
        valorMetro: t.valor_metro ?? "",
        comprado: !!t.comprado,
        urgente: !!t.compra_urgente,
        metrosBaixados: t.metros_baixados ?? null,
      })),
    medidasNovas: !!row.medidas_novas,
  };
}

const SELECT = "*, clientes(nome), tecidos(*), pedidos_alfaiataria_pausas(*)";

const CAMPO_PARA_COLUNA = {
  tipoPeca: "tipo_peca",
  dataPedido: "data_pedido",
  previsaoEntrega: "previsao_entrega",
  previsaoManual: "previsao_manual",
  dataLimiteEvento: "data_limite_evento",
  dataEntrega: "data_entrega",
  retrabalho: "retrabalho",
  retrabalhoObs: "retrabalho_obs",
  status: "status",
  valorTotal: "valor_total",
  pago: "valor_pago",
  formaPagamento: "forma_pagamento",
  formaPagamentoEntrada: "forma_pagamento_entrada",
  formaPagamentoRestante: "forma_pagamento_restante",
  valorVenda: "valor_venda",
  statusPagamentoVenda: "status_pagamento_venda",
  pagamentoDividido: "pagamento_dividido",
  valorEntrada: "valor_entrada",
  statusEntrada: "status_entrada",
  valorRestante: "valor_restante",
  statusRestante: "status_restante",
  observacoes: "observacoes",
  enviadoIcaro: "enviado_icaro",
  tecidoChegou: "tecido_chegou",
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
          data_limite_evento: p.dataLimiteEvento || null,
          status: p.status,
          valor_total: p.valorTotal === "" ? null : Number(p.valorTotal),
          valor_pago: p.pago === "" ? 0 : Number(p.pago),
          forma_pagamento: p.formaPagamento || null,
          forma_pagamento_entrada: p.formaPagamentoEntrada || null,
          forma_pagamento_restante: p.formaPagamentoRestante || null,
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
          tecido_chegou: false,
        })
        .select("id")
        .single();
      if (error) throw error;

      const tecidosParaInserir = (p.tecidos || [])
        .filter((t) => t.codigo || t.fornecedor || t.numero || t.nomenclatura || t.metragem || t.valorMetro)
        .map((t, i) => ({
          pedido_alfaiataria_id: pecaRow.id,
          codigo: t.codigo || null,
          nomenclatura: t.nomenclatura || null,
          qtd: Number(t.qtd) || 1,
          numero: t.numero || null,
          fornecedor: t.fornecedor || null,
          metragem: t.metragem || null,
          valor_metro: t.valorMetro === "" || t.valorMetro == null ? null : Number(t.valorMetro),
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
    // Editar a previsão de entrega diretamente é um ato deliberado — a
    // partir daqui ela vira "manual" (trava, não acompanha mais a fila/
    // equipe sozinha). Limpar o campo devolve pro automático.
    const patch = {
      [campo]: valor,
      ...(marcarEntrega ? { dataEntrega: hojeISO() } : {}),
      ...(marcarEmProducao ? { situacao: "Em Produção" } : {}),
      ...(campo === "previsaoEntrega" ? { previsaoManual: !!valor } : {}),
    };

    setPecas((prev) => prev.map((p) => (p.id === pecaId ? { ...p, ...patch } : p)));
    const coluna = CAMPO_PARA_COLUNA[campo];
    if (!coluna) return;
    const CAMPOS_NUMERICOS = ["valorTotal", "pago", "valorVenda", "valorEntrada", "valorRestante"];
    // Colunas de data no Postgres não aceitam string vazia (só data
    // válida ou nulo) — um input de data pode disparar onChange com ""
    // no meio da digitação, antes de completar a data, então isso
    // precisa virar null igual já fazíamos pros campos numéricos.
    const CAMPOS_DATA = ["dataPedido", "previsaoEntrega", "dataLimiteEvento", "dataEntrega", "dataInicioProducao", "dataPausaInicio"];
    const valorFinal = CAMPOS_NUMERICOS.includes(campo)
      ? (valor === "" ? null : Number(valor))
      : CAMPOS_DATA.includes(campo)
        ? (valor === "" ? null : valor)
        : valor;
    await comIndicador(async () => {
      const update = { [coluna]: valorFinal };
      if (campo === "previsaoEntrega") update.previsao_manual = !!valor;
      if (marcarEntrega) update.data_entrega = patch.dataEntrega;
      if (marcarEmProducao) update.situacao = "Em Produção";
      const { error } = await supabase.from("pedidos_alfaiataria").update(update).eq("id", pecaId);
      if (error) setErro(error.message);
    });
  }

  // Pausa/retoma a produção — pra quando o cliente viaja ou some por um
  // tempo, ou fica esperando pra vir fazer uma prova, e a peça fica
  // parada sem culpa do Ícaro. Os dias pausados não contam no tempo de
  // produção real (diasProducaoReal, em helpers.js) — isso já valia
  // antes e continua valendo igual, motivo-agnóstico. O registro em
  // pedidos_alfaiataria_pausas é um log paralelo só pra categorizar por
  // motivo (cliente_prova vs outro) e poder reportar o gargalo do
  // cliente separado — não substitui a conta acima.
  async function pausarPeca(pecaId, motivo = "outro", observacao = "") {
    const dataInicio = hojeISO();
    const patch = { situacao: "Pausado", dataPausaInicio: dataInicio };
    setPecas((prev) =>
      prev.map((p) =>
        p.id === pecaId
          ? { ...p, ...patch, pausas: [...(p.pausas || []), { id: null, motivo, dataInicio, dataFim: "", observacao }] }
          : p
      )
    );
    await comIndicador(async () => {
      const { error } = await supabase.from("pedidos_alfaiataria").update({ situacao: "Pausado", data_pausa_inicio: dataInicio }).eq("id", pecaId);
      if (error) setErro(error.message);
      const { data: pausaRow, error: errPausa } = await supabase
        .from("pedidos_alfaiataria_pausas")
        .insert({ peca_id: pecaId, motivo, data_inicio: dataInicio, observacao: observacao || null })
        .select("id")
        .single();
      if (errPausa) setErro(errPausa.message);
      else setPecas((prev) => prev.map((p) => (p.id === pecaId ? { ...p, pausas: p.pausas.map((pa) => (pa.id === null && !pa.dataFim ? { ...pa, id: pausaRow.id } : pa)) } : p)));
    });
  }

  async function retomarPeca(pecaId) {
    const pecaAtual = pecas.find((p) => p.id === pecaId);
    if (!pecaAtual) return;
    const dias = pecaAtual.dataPausaInicio ? diasEntre(pecaAtual.dataPausaInicio, hojeISO()) || 0 : 0;
    const diasPausados = (pecaAtual.diasPausados || 0) + dias;
    const dataFim = hojeISO();
    const pausaAberta = (pecaAtual.pausas || []).find((pa) => !pa.dataFim);
    const patch = { situacao: "Em Produção", dataPausaInicio: "", diasPausados };
    setPecas((prev) =>
      prev.map((p) =>
        p.id === pecaId
          ? { ...p, ...patch, pausas: (p.pausas || []).map((pa) => (pa === pausaAberta ? { ...pa, dataFim } : pa)) }
          : p
      )
    );
    await comIndicador(async () => {
      const { error } = await supabase
        .from("pedidos_alfaiataria")
        .update({ situacao: "Em Produção", data_pausa_inicio: null, dias_pausados: diasPausados })
        .eq("id", pecaId);
      if (error) setErro(error.message);
      if (pausaAberta?.id) {
        const { error: errPausa } = await supabase.from("pedidos_alfaiataria_pausas").update({ data_fim: dataFim }).eq("id", pausaAberta.id);
        if (errPausa) setErro(errPausa.message);
      }
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
            ? { ...p, tecidos: [...p.tecidos, { id: data.id, codigo: "", nomenclatura: "", qtd: 1, numero: "", fornecedor: "", comprado: false }] }
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
    // valorMetro é "valor_metro" (numeric) no banco — string vazia dá erro, tem que virar null.
    const coluna = campo === "valorMetro" ? "valor_metro" : campo;
    const valorFinal = campo === "qtd" ? Number(valor) || 1 : campo === "valorMetro" ? (valor === "" ? null : Number(valor)) : valor;
    await comIndicador(async () => {
      const { error } = await supabase.from("tecidos").update({ [coluna]: valorFinal }).eq("id", tecidoId);
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
