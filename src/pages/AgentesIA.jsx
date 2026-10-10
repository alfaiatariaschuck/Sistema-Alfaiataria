import React, { useEffect, useMemo, useState } from "react";
import { Copy, Package, ShieldAlert, Sparkles, Sunrise, Wallet } from "lucide-react";
import { Card, Field, PageTitle } from "../components/ui";
import { BRASS, HORAS_REFERENCIA_TIPO_PECA, TEXT_MUTED, TIPOS_SAIDA_SEM_VENDA, inputStyle } from "../lib/constants";
import { brl, custoAviamentoComposicao, custoTecidoDe, diasAte, enriquecerCliente, fmtData, hojeISO, metragemParaNumero, pedidoFechado, somarDias, statusPedidoSemVenda } from "../lib/helpers";
import { chamarAgenteIA } from "../lib/agentesIA";
import { custoEquipeMensal, custoMaoDeObraPeca, custoPorHoraAlfaiataria } from "../lib/custoEquipe";
import { useConfigPrecoCamisa } from "../hooks/useConfigPrecoCamisa";
import { useConfigCustosFixos } from "../hooks/useConfigCustosFixos";
import { supabase } from "../supabaseClient";

const CHAVE_META_PROLABORE = "meta_pro_labore";
const CHAVE_META_LUCRO = "meta_lucro";
const CHAVE_CAIXA = "caixa_atual";
const CHAVE_SUMIDO = "cliente_sumido_meses";
// Início real da produção de alfaiataria — configurável de propósito,
// em vez de inferido da menor dataPedido que existir no banco: pedido
// lançado antes da produção começar de verdade (teste, pré-venda)
// distorceria a janela de "Dados para Remuneração" pra qualquer lado.
const CHAVE_INICIO_PRODUCAO_ALFAIATARIA = "inicio_producao_alfaiataria";

const CATEGORIAS_VARIAVEIS_POR_PECA = ["Material/Tecido avulso", "Aviamento Alfaiataria", "Aviamento Camisaria", "Pró-labore", "Dívida Antiga/Renegociação"];

function mesesAntesDe(mesStr, n) {
  const [ano, mes] = mesStr.split("-").map(Number);
  const d = new Date(ano, mes - 1 - n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function totalDespesaLinha(d) {
  return (parseFloat(d.valor) || 0) + (parseFloat(d.frete) || 0);
}

// Sem acento e minúsculo — agrupa "Fabi" e "Fabiana" como o mesmo
// fornecedor pro detector de valor fora do padrão (mesmo critério usado
// na busca de Contabilidade).
function normalizarNome(s) {
  return (s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function mediana(numeros) {
  const s = [...numeros].sort((a, b) => a - b);
  const meio = Math.floor(s.length / 2);
  return s.length % 2 ? s[meio] : (s[meio - 1] + s[meio]) / 2;
}

// Resume uma lista de itens "com problema" pro payload do Agente
// Gerente: manda só uma amostra (a IA não precisa da lista inteira pra
// priorizar o que corrigir, e isso mantém o pedido pequeno).
function resumirAchado(lista, formatarItem, limite = 6) {
  const qtd = lista.length;
  const exemplos = lista.slice(0, limite).map(formatarItem);
  return { qtd, exemplos, restantes: Math.max(0, qtd - exemplos.length) };
}

// Lista expansível de um achado do Agente Gerente — cada item vira um
// link clicável (abre o pedido/peça direto) quando `aoAbrir` é passado
// e o item tem `_tipo`; senão só mostra o texto (caso de despesas e
// estoque, que não têm tela de detalhe pra abrir a partir daqui).
function ListaAchado({ titulo, itens, formatarLinha, aoAbrir }) {
  if (!itens || itens.length === 0) return null;
  return (
    <details className="mb-2">
      <summary style={{ fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
        {titulo} <span style={{ color: "#9C4A1E" }}>({itens.length})</span>
      </summary>
      <div className="pl-3 pt-1">
        {itens.map((item, i) =>
          aoAbrir && item._tipo && item.id ? (
            <button
              key={item.id}
              onClick={() => aoAbrir(item)}
              className="block text-left"
              style={{ fontSize: 12, color: BRASS, padding: "2px 0", textDecoration: "underline" }}
            >
              {formatarLinha(item)}
            </button>
          ) : (
            <div key={item.id || i} style={{ fontSize: 12, color: TEXT_MUTED, padding: "2px 0" }}>
              {formatarLinha(item)}
            </div>
          )
        )}
      </div>
    </details>
  );
}

// Pedidos lançados antes de julho/2026 têm qualidade de dado ruim (o
// dono confirmou — foi quando passou a lançar tudo direito), então o
// ritmo de venda pro Agente de Estoque só considera daqui pra frente,
// incluindo o mês corrente mesmo incompleto (a pedido do dono).
const INICIO_DADOS_CONFIAVEIS = "2026-07";

function mesesEntre(mesInicio, mesFim) {
  const [anoI, mesI] = mesInicio.split("-").map(Number);
  const [anoF, mesF] = mesFim.split("-").map(Number);
  const chaves = [];
  let ano = anoI;
  let mes = mesI;
  while (ano < anoF || (ano === anoF && mes <= mesF)) {
    chaves.push(`${ano}-${String(mes).padStart(2, "0")}`);
    mes += 1;
    if (mes > 12) {
      mes = 1;
      ano += 1;
    }
  }
  return chaves;
}

export default function AgentesIA({ pedidos, pecas, despesas, custoAviamentosPorPecaBase, estoqueTecidos, clientes, equipe, irParaPedido, irParaPeca }) {
  const [metaProLabore, setMetaProLabore] = useState("40000");
  const [metaLucro, setMetaLucro] = useState("10000");
  const [caixaAtual, setCaixaAtual] = useState("");
  const [limiteMesesSumido, setLimiteMesesSumido] = useState(6);
  const [inicioProducaoAlfaiataria, setInicioProducaoAlfaiataria] = useState("2026-05-01");
  const [carregandoConfig, setCarregandoConfig] = useState(true);
  const { margemPadrao: margemPadraoCamisaria, metragemPadrao } = useConfigPrecoCamisa();
  const { aluguelAtelie, luzAtelie, aliquotaImposto } = useConfigCustosFixos();

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("config")
        .select("chave, valor")
        .in("chave", [CHAVE_META_PROLABORE, CHAVE_META_LUCRO, CHAVE_CAIXA, CHAVE_SUMIDO, CHAVE_INICIO_PRODUCAO_ALFAIATARIA]);
      (data || []).forEach((row) => {
        if (row.chave === CHAVE_META_PROLABORE) setMetaProLabore(row.valor || "40000");
        if (row.chave === CHAVE_META_LUCRO) setMetaLucro(row.valor || "10000");
        if (row.chave === CHAVE_CAIXA) setCaixaAtual(row.valor || "");
        if (row.chave === CHAVE_SUMIDO) setLimiteMesesSumido(parseInt(row.valor, 10) || 6);
        if (row.chave === CHAVE_INICIO_PRODUCAO_ALFAIATARIA) setInicioProducaoAlfaiataria(row.valor || "2026-05-01");
      });
      setCarregandoConfig(false);
    })();
  }, []);

  async function salvarInicioProducaoAlfaiataria(valor) {
    setInicioProducaoAlfaiataria(valor);
    await supabase.from("config").upsert({ chave: CHAVE_INICIO_PRODUCAO_ALFAIATARIA, valor });
  }

  async function salvarMetaProLabore(valor) {
    setMetaProLabore(valor);
    await supabase.from("config").upsert({ chave: CHAVE_META_PROLABORE, valor });
  }

  async function salvarMetaLucro(valor) {
    setMetaLucro(valor);
    await supabase.from("config").upsert({ chave: CHAVE_META_LUCRO, valor });
  }

  // ---------- Agente de Precificação ----------
  // Mês em andamento — o dono pediu que a análise reflita o mês atual,
  // não o mês passado. Por isso a margem/custo médio por peça usa o
  // HISTÓRICO inteiro (mais confiável, mais dado), mas a quantidade
  // "vendida este mês" é separada e calculada só dentro do mês atual —
  // são coisas diferentes e não podem ser multiplicadas uma pela outra
  // como se fosse tudo do mesmo período (foi exatamente essa mistura
  // que o próprio agente apontou como inconsistência numa análise
  // anterior, quando os custos fixos eram só do mês passado).
  const mesAtual = hojeISO().slice(0, 7);

  const camisariaResumo = useMemo(() => {
    const comVenda = (pedidos || []).filter((p) => p.status === "Entregue" && p.status !== "Doação" && parseFloat(p.aReceber?.valor) > 0);
    if (comVenda.length === 0) return null;
    // Aviamento avulso da camisa (botão extra, etiqueta, embalagem) vem
    // do catálogo cadastrado em Aviamentos — mesma fonte que Resultado
    // do Mês já usa (custoAviamentosPorPecaBase["Camisa"], custo fixo
    // por unidade). Sem isso, a margem ficava inflada.
    const custoAviamentoCamisa = (custoAviamentosPorPecaBase || {})["Camisa"] || 0;
    const vendas = comVenda.map((p) => parseFloat(p.aReceber.valor) || 0);
    const custos = comVenda.map((p) => custoTecidoDe(p.tecidos) + (parseFloat(p.pagoFabiana?.valor) || 0) + custoAviamentoCamisa);
    const precoMedio = vendas.reduce((s, v) => s + v, 0) / comVenda.length;
    const custoMedio = custos.reduce((s, v) => s + v, 0) / comVenda.length;
    const qtdMesAtual = comVenda.filter((p) => (p.dataEntrega || "").slice(0, 7) === mesAtual).length;
    return { precoMedio: Math.round(precoMedio), custoMedio: Math.round(custoMedio), qtdHistorico: comVenda.length, qtdMesAtual };
  }, [pedidos, mesAtual, custoAviamentosPorPecaBase]);

  const custoPorHoraAlfaiataria_ = useMemo(() => custoPorHoraAlfaiataria(pecas, equipe), [pecas, equipe]);

  const alfaiatariaPorTipo = useMemo(() => {
    const entregues = (pecas || []).filter(
      (p) => p.status === "Entregue" && !TIPOS_SAIDA_SEM_VENDA.includes(p.tipoSaida) && p.valorVenda !== "" && p.valorVenda != null
    );
    const mapa = new Map();
    entregues.forEach((p) => {
      const venda = parseFloat(p.valorVenda) || 0;
      // Mão de obra real da equipe (rateada pela hora de referência do
      // tipo), não mais o campo solto "valor devido ao Ícaro" — a
      // equipe é paga fixo por mês, pedido explícito do Tales.
      const custo = custoTecidoDe(p.tecidos) + custoAviamentoComposicao(p.tipoPeca, custoAviamentosPorPecaBase) + custoMaoDeObraPeca(p.tipoPeca, custoPorHoraAlfaiataria_);
      if (!mapa.has(p.tipoPeca)) mapa.set(p.tipoPeca, { vendas: [], custos: [], qtdMesAtual: 0 });
      const grupo = mapa.get(p.tipoPeca);
      grupo.vendas.push(venda);
      grupo.custos.push(custo);
      if ((p.dataEntrega || "").slice(0, 7) === mesAtual) grupo.qtdMesAtual += 1;
    });
    return [...mapa.entries()]
      .map(([tipo, { vendas, custos, qtdMesAtual }]) => {
        const qtd = vendas.length;
        const precoMedio = vendas.reduce((s, v) => s + v, 0) / qtd;
        const custoMedio = custos.reduce((s, v) => s + v, 0) / qtd;
        const margemMedia = precoMedio - custoMedio;
        return {
          tipo,
          qtdHistorico: qtd,
          qtdMesAtual,
          precoMedio: Math.round(precoMedio),
          custoMedio: Math.round(custoMedio),
          margemMedia: Math.round(margemMedia),
          margemPercentual: precoMedio > 0 ? Math.round((margemMedia / precoMedio) * 100) : 0,
        };
      })
      .sort((a, b) => b.qtdHistorico - a.qtdHistorico);
  }, [pecas, custoAviamentosPorPecaBase, mesAtual, custoPorHoraAlfaiataria_]);

  const custosFixosMesAtual = useMemo(() => {
    return (despesas || [])
      .filter((d) => d.status === "Pago" && (d.dataPagamento || "").slice(0, 7) === mesAtual && !CATEGORIAS_VARIAVEIS_POR_PECA.includes(d.categoria))
      .reduce((s, d) => s + totalDespesaLinha(d), 0);
  }, [despesas, mesAtual]);

  const [respostaPrecificacao, setRespostaPrecificacao] = useState(null);
  const [carregandoPrecificacao, setCarregandoPrecificacao] = useState(false);
  const [erroPrecificacao, setErroPrecificacao] = useState(null);

  async function gerarPrecificacao() {
    setCarregandoPrecificacao(true);
    setErroPrecificacao(null);
    setRespostaPrecificacao(null);
    try {
      const resposta = await chamarAgenteIA("precificacao", {
        metaProLabore,
        mesReferencia: mesAtual,
        custosFixosMes: custosFixosMesAtual.toFixed(2),
        camisaria: camisariaResumo ? { ...camisariaResumo, margemPadraoConfig: margemPadraoCamisaria } : null,
        alfaiataria: alfaiatariaPorTipo,
      });
      setRespostaPrecificacao(resposta);
    } catch (e) {
      setErroPrecificacao(e.message);
    } finally {
      setCarregandoPrecificacao(false);
    }
  }

  // ---------- Agente de Estoque ----------
  // Cruza o estoque de tecido já comprado (parado, mas pago) com o ritmo
  // de venda real, pra saber quantos meses esse estoque ainda cobre — e
  // quanto isso "alivia" o caixa nesse período, já que produzir com
  // tecido já pago não gera nova saída de dinheiro pra comprar mais.
  const resumoEstoque = useMemo(() => {
    const itens = estoqueTecidos || [];
    const valorTotalEstoque = itens.reduce((s, e) => s + e.saldoMetros * (e.valorMetro || 0), 0);
    const metragemNum = parseFloat(String(metragemPadrao).replace(",", ".")) || 1.5;
    const totalCamisasPossiveis = itens.reduce((s, e) => s + Math.floor(e.saldoMetros / metragemNum), 0);

    const mesesConfiaveis = mesesEntre(INICIO_DADOS_CONFIAVEIS, mesAtual);
    const qtdVendidaDesdeJulho = (pedidos || [])
      .filter((p) => !statusPedidoSemVenda(p.status) && mesesConfiaveis.includes((p.dataPedido || "").slice(0, 7)))
      .reduce((s, p) => s + (parseInt(p.quantidade, 10) || 0), 0);
    const mediaMensalVendas = mesesConfiaveis.length > 0 ? qtdVendidaDesdeJulho / mesesConfiaveis.length : 0;
    const mesesDeEstoque = mediaMensalVendas > 0 ? totalCamisasPossiveis / mediaMensalVendas : null;

    // Gasto médio mensal com compra de tecido avulso — mesma janela
    // confiável usada acima pra vendas (julho/2026 em diante, incluindo o
    // mês corrente): antes disso os 3 últimos meses fechados (jun/jul/ago)
    // davam R$0 (a compra do lote grande foi feita via Estoque, não como
    // despesa dessa categoria), o que escondia que setembro já reiniciou
    // gasto real de reposição avulsa.
    const gastoTecidoDesdeJulho = (despesas || [])
      .filter((d) => d.status === "Pago" && d.categoria === "Material/Tecido avulso" && mesesConfiaveis.includes((d.dataPagamento || "").slice(0, 7)))
      .reduce((s, d) => s + totalDespesaLinha(d), 0);

    return {
      valorTotalEstoque,
      totalCamisasPossiveis,
      mediaMensalVendas: Math.round(mediaMensalVendas * 10) / 10,
      mesesDeEstoque: mesesDeEstoque !== null ? Math.round(mesesDeEstoque * 10) / 10 : null,
      mediaGastoMensalTecido: mesesConfiaveis.length > 0 ? gastoTecidoDesdeJulho / mesesConfiaveis.length : 0,
      itensComSaldo: itens.filter((e) => e.saldoMetros > 0).length,
    };
  }, [estoqueTecidos, pedidos, despesas, metragemPadrao, mesAtual]);

  const [respostaEstoque, setRespostaEstoque] = useState(null);
  const [carregandoEstoque, setCarregandoEstoque] = useState(false);
  const [erroEstoque, setErroEstoque] = useState(null);

  async function gerarEstoque() {
    setCarregandoEstoque(true);
    setErroEstoque(null);
    setRespostaEstoque(null);
    try {
      const resposta = await chamarAgenteIA("estoque", {
        ...resumoEstoque,
        valorTotalEstoque: resumoEstoque.valorTotalEstoque.toFixed(2),
        mediaGastoMensalTecido: resumoEstoque.mediaGastoMensalTecido.toFixed(2),
      });
      setRespostaEstoque(resposta);
    } catch (e) {
      setErroEstoque(e.message);
    } finally {
      setCarregandoEstoque(false);
    }
  }

  // ---------- Agente Financeiro ----------

  const [modoTrimestreFinanceiro, setModoTrimestreFinanceiro] = useState(false);

  const resumoFinanceiroMes = useMemo(() => {
    const mesAtual = hojeISO().slice(0, 7);
    const mesInicioPeriodo = modoTrimestreFinanceiro ? mesesAntesDe(mesAtual, 2) : mesAtual;
    const daqui30dias = somarDias(hojeISO(), 30);

    const receitaCamisaria = (pedidos || [])
      .filter((p) => p.aReceber?.statusPagamento === "Recebido" && (p.dataRecebimento || "").slice(0, 7) >= mesInicioPeriodo && (p.dataRecebimento || "").slice(0, 7) <= mesAtual)
      .reduce((s, p) => s + (parseFloat(p.aReceber.valor) || 0), 0);
    const receitaAlfaiataria = (pecas || [])
      .filter((p) => p.statusPagamentoVenda === "Recebido" && (p.dataRecebimento || "").slice(0, 7) >= mesInicioPeriodo && (p.dataRecebimento || "").slice(0, 7) <= mesAtual)
      .reduce((s, p) => s + (parseFloat(p.valorVenda) || 0), 0);

    const despesasPagasMes = (despesas || []).filter(
      (d) => d.status === "Pago" && (d.dataPagamento || "").slice(0, 7) >= mesInicioPeriodo && (d.dataPagamento || "").slice(0, 7) <= mesAtual
    );
    const despesasPagas = despesasPagasMes.reduce((s, d) => s + totalDespesaLinha(d), 0);

    const porCategoriaMapa = new Map();
    despesasPagasMes.forEach((d) => {
      const cat = d.categoria || "Sem categoria";
      porCategoriaMapa.set(cat, (porCategoriaMapa.get(cat) || 0) + totalDespesaLinha(d));
    });
    const despesasPorCategoria = [...porCategoriaMapa.entries()]
      .map(([categoria, total]) => ({ categoria, total: total.toFixed(2) }))
      .sort((a, b) => parseFloat(b.total) - parseFloat(a.total));

    const proximosVencimentos = (despesas || [])
      .filter((d) => d.status !== "Pago" && d.vencimento >= hojeISO() && d.vencimento <= daqui30dias)
      .sort((a, b) => a.vencimento.localeCompare(b.vencimento))
      .map((d) => ({ data: d.vencimento, descricao: d.descricao || d.fornecedor || d.categoria, valor: totalDespesaLinha(d).toFixed(2) }));
    const totalProximosVencimentos = proximosVencimentos.reduce((s, v) => s + parseFloat(v.valor), 0);

    const receitaRecebida = receitaCamisaria + receitaAlfaiataria;
    return {
      mes: modoTrimestreFinanceiro ? `${mesInicioPeriodo} a ${mesAtual}` : mesAtual,
      receitaRecebida,
      despesasPagas,
      saldoMes: receitaRecebida - despesasPagas,
      despesasPorCategoria,
      proximosVencimentos,
      totalProximosVencimentos,
    };
  }, [pedidos, pecas, despesas, modoTrimestreFinanceiro]);

  // ---------- Dados para Remuneração ----------
  // Diagnóstico, não simulador: só calcula fatos reais da alfaiataria
  // (produção, preço, custo) pra servir de insumo confiável pra um
  // projeto de remuneração — nasceu de um caso real em que um número
  // passado "de ouvido" (print de tela) divergiu do real porque usava
  // base diferente (pedida x entregue). Aqui sempre é ao vivo, direto
  // do banco.
  const [janelaRemuneracao, setJanelaRemuneracao] = useState(6);
  const [copiadoRemuneracao, setCopiadoRemuneracao] = useState(false);
  const [mostrarLegendaRemuneracao, setMostrarLegendaRemuneracao] = useState(false);

  const dadosRemuneracao = useMemo(() => {
    const hojeD = new Date(hojeISO() + "T00:00:00");

    // Início da janela = quando a PRODUÇÃO começou de verdade, pedido
    // explícito do Tales — não a menor dataPedido que existir no banco
    // (podia ter pedido de teste/pré-venda lançado antes da operação
    // começar pra valer, o que já causou confusão). É configurável logo
    // abaixo, editável sem precisar mexer em código se um dia mudar.
    // Pedida e entregue usam a MESMA âncora agora — as duas são sobre o
    // mesmo período de operação, só contadas por data diferente cada.
    const inicioProducaoMes = inicioProducaoAlfaiataria ? inicioProducaoAlfaiataria.slice(0, 7) : null;
    const meses = [];
    for (let i = janelaRemuneracao; i >= 1; i--) {
      const d = new Date(hojeD.getFullYear(), hojeD.getMonth() - i, 1);
      const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!inicioProducaoMes || chave >= inicioProducaoMes) meses.push(chave);
    }
    const mesesPedidosSolicitados = janelaRemuneracao;
    const qtdMesesDisponiveis = meses.length;

    // Produção — pedida x entregue, sempre TODAS as peças (inclusive
    // doação/uso próprio/permuta), exatamente como o resto do sistema já
    // conta (Histórico de Produção: "vendasPorMesRaw" e "entregues").
    // Peça doada ainda ocupou hora de produção de verdade, então conta
    // pra volume/remuneração mesmo sem ter gerado receita.
    let qtdPedidaProducao = 0;
    let qtdEntregueProducao = 0;
    const porTipo = new Map();
    (pecas || []).forEach((p) => {
      if (meses.includes((p.dataPedido || "").slice(0, 7))) {
        qtdPedidaProducao += 1;
        const tipo = p.tipoPeca || "Outro";
        porTipo.set(tipo, (porTipo.get(tipo) || 0) + 1);
      }
      if (p.status === "Entregue" && p.dataInicioProducao && meses.includes((p.dataEntrega || "").slice(0, 7))) qtdEntregueProducao += 1;
    });
    const mediaPedida = meses.length > 0 ? qtdPedidaProducao / meses.length : 0;
    const mediaEntregue = meses.length > 0 ? qtdEntregueProducao / meses.length : 0;
    const porTipoLista = [...porTipo.entries()].sort((a, b) => b[1] - a[1]);

    // Preço e custo — aqui sim exclui doação/uso próprio/permuta
    // (TIPOS_SAIDA_SEM_VENDA), porque ticket médio e receita são
    // conceitos de VENDA, não de volume de produção.
    const pecasValidas = (pecas || []).filter((p) => !TIPOS_SAIDA_SEM_VENDA.includes(p.tipoSaida));
    const pecasDoPeriodo = pecasValidas.filter((p) => meses.includes((p.dataPedido || "").slice(0, 7)));
    const qtdPedidaVenda = pecasDoPeriodo.length;
    const receitaTotalPeriodo = pecasDoPeriodo.reduce((s, p) => s + (parseFloat(p.valorVenda) || 0), 0);
    const materialTotalPeriodo = pecasDoPeriodo.reduce(
      (s, p) => s + custoTecidoDe(p.tecidos) + custoAviamentoComposicao(p.tipoPeca, custoAviamentosPorPecaBase),
      0
    );
    const ticketMedio = qtdPedidaVenda > 0 ? receitaTotalPeriodo / qtdPedidaVenda : 0;
    const materialMedio = qtdPedidaVenda > 0 ? materialTotalPeriodo / qtdPedidaVenda : 0;

    // Estrutura e metas
    const estruturaMensal = (parseFloat(aluguelAtelie) || 0) + (parseFloat(luzAtelie) || 0);
    const aliquotaFracao = (parseFloat(aliquotaImposto) || 0) / 100;

    // Indicadores
    const receitaMensalMedia = meses.length > 0 ? receitaTotalPeriodo / meses.length : 0;
    const receitaLiquidaMensalMedia = receitaMensalMedia * (1 - aliquotaFracao);

    const receitaLiquidaPorPeca = ticketMedio * (1 - aliquotaFracao);
    const estruturaPorPeca = mediaPedida > 0 ? estruturaMensal / mediaPedida : 0;
    const margemDisponivelMaoDeObra = receitaLiquidaPorPeca - materialMedio - estruturaPorPeca;
    const contribuicaoPorPeca = receitaLiquidaPorPeca - materialMedio;

    // Margem de hoje — com o custo ATUAL de mão de obra (equipe
    // cadastrada), só como referência de "situação hoje". Fica de fora
    // dos outros 3 indicadores de propósito, pra eles continuarem
    // válidos depois que o modelo de remuneração mudar.
    // Custo-hora calculado pelo ritmo REAL DE ENTREGA, não de pedido —
    // pedido explícito do Tales: se o modelo novo for PJ por peça, o
    // pagamento é pela peça que sai pronta, não pela que só entrou na
    // fila. Entregue nunca supera pedida (não dá pra entregar mais do
    // que foi pedido), então usar horas de pedida infla a capacidade e
    // SUBESTIMA o custo real por peça entregue. Mesma janela (maio a
    // set, configurável acima) usada no resto da seção.
    const custoEquipeMensalAtual = custoEquipeMensal(equipe);
    let horasEntreguesPeriodo = 0;
    (pecas || []).forEach((p) => {
      if (p.status !== "Entregue" || !p.dataInicioProducao) return;
      if (!meses.includes((p.dataEntrega || "").slice(0, 7))) return;
      horasEntreguesPeriodo += HORAS_REFERENCIA_TIPO_PECA[p.tipoPeca] || 0;
    });
    const horasEntreguesPorMes = meses.length > 0 ? horasEntreguesPeriodo / meses.length : 0;
    const custoHoraEntrega = horasEntreguesPorMes > 0 ? custoEquipeMensalAtual / horasEntreguesPorMes : 0;
    const maoDeObraTotalPeriodo = pecasDoPeriodo.reduce((s, p) => s + custoMaoDeObraPeca(p.tipoPeca, custoHoraEntrega), 0);
    const maoDeObraMedioPeca = qtdPedidaVenda > 0 ? maoDeObraTotalPeriodo / qtdPedidaVenda : 0;
    const margemHojeMedioPeca = receitaLiquidaPorPeca - materialMedio - estruturaPorPeca - maoDeObraMedioPeca;
    const margemHojePct = ticketMedio > 0 ? (margemHojeMedioPeca / ticketMedio) * 100 : 0;

    // Ponto de equilíbrio completo, contando TUDO que pesa hoje
    // (estrutura do ateliê + custo fixo real da equipe) — pedido
    // explícito do Tales: essa seção é diagnóstico da situação atual,
    // não simulação, então o ponto de equilíbrio tem que refletir o
    // custo de verdade de hoje, não uma versão artificialmente sem mão
    // de obra.
    const custosFixosHoje = estruturaMensal + custoEquipeMensalAtual;
    const pontoEquilibrioHoje = contribuicaoPorPeca > 0 ? custosFixosHoje / contribuicaoPorPeca : null;

    // Valor equivalente por peça, tipo por tipo — pelo custo-hora de
    // ENTREGA (não um "preço combinado" de verdade, já que esse não
    // existe — ver nota no "valor devido ao Ícaro", campo solto, não
    // confiável). É o ponto de partida pra negociar a tabela nova de PJ
    // por peça: empata com o fixo de hoje só se o ritmo de ENTREGA se
    // mantiver na média — por isso usa custoHoraEntrega, não a versão
    // calculada por pedido (que infla a capacidade e subestimaria o
    // valor por peça nessa tabela).
    const porTipoDetalhe = porTipoLista.map(([tipo, qtd]) => {
      // qtd (produção total, inclui doação/uso próprio) e pecasTipo
      // (só venda) são pools diferentes de propósito — ticket médio e
      // material médio dividem pelo próprio pecasTipo.length, nunca
      // por qtd, senão diluiriam o valor com peça que não teve receita.
      const pecasTipo = pecasDoPeriodo.filter((p) => (p.tipoPeca || "Outro") === tipo);
      const receitaTipo = pecasTipo.reduce((s, p) => s + (parseFloat(p.valorVenda) || 0), 0);
      const materialTipo = pecasTipo.reduce((s, p) => s + custoTecidoDe(p.tecidos) + custoAviamentoComposicao(p.tipoPeca, custoAviamentosPorPecaBase), 0);
      return {
        tipo,
        qtd,
        ticketMedio: pecasTipo.length > 0 ? receitaTipo / pecasTipo.length : 0,
        materialMedio: pecasTipo.length > 0 ? materialTipo / pecasTipo.length : 0,
        horasRef: HORAS_REFERENCIA_TIPO_PECA[tipo] ?? null,
        valorEquivalente: custoMaoDeObraPeca(tipo, custoHoraEntrega),
      };
    });

    // Pior/melhor mês real do período, pra tornar concreta a
    // desvantagem de PJ por peça quando o ritmo cai: quanto a mão de
    // obra (equipe inteira) ganharia naquele mês específico sob o
    // modelo por peça (com o mix real de tipos daquele mês), comparado
    // ao fixo de hoje.
    // Agrupa por mês de ENTREGA (só peça com status Entregue), não de
    // pedido — é quando o pagamento aconteceria num modelo PJ por peça
    // de verdade (paga pelo que sai pronto, não pelo que entra na
    // fila). Peça doada/uso próprio entra (ocupou hora de trabalho de
    // verdade), só excluídas peças não entregues.
    const qtdPorMes = new Map(meses.map((m) => [m, 0]));
    (pecas || []).forEach((p) => {
      if (p.status !== "Entregue" || !p.dataInicioProducao) return;
      const m = (p.dataEntrega || "").slice(0, 7);
      if (qtdPorMes.has(m)) qtdPorMes.set(m, qtdPorMes.get(m) + 1);
    });
    const mesesComProducao = [...qtdPorMes.entries()].filter(([, q]) => q > 0).sort((a, b) => a[1] - b[1]);

    function ganhoPJPecaNoMes(mesChave) {
      return (pecas || [])
        .filter((p) => p.status === "Entregue" && p.dataInicioProducao && (p.dataEntrega || "").slice(0, 7) === mesChave)
        .reduce((s, p) => s + custoMaoDeObraPeca(p.tipoPeca, custoHoraEntrega), 0);
    }

    function montarComparativoMes(entrada) {
      if (!entrada) return null;
      const [mes, qtd] = entrada;
      const ganhoPJ = ganhoPJPecaNoMes(mes);
      const diferencaPct = custoEquipeMensalAtual > 0 ? ((ganhoPJ - custoEquipeMensalAtual) / custoEquipeMensalAtual) * 100 : 0;
      return { mes, qtd, ganhoPJ, diferencaPct };
    }

    const piorMes = montarComparativoMes(mesesComProducao[0]);
    const melhorMes = montarComparativoMes(mesesComProducao[mesesComProducao.length - 1]);

    return {
      meses,
      mesesPedidosSolicitados,
      qtdMesesDisponiveis,
      qtdPedida: qtdPedidaProducao,
      qtdEntregue: qtdEntregueProducao,
      mediaPedida,
      mediaEntregue,
      porTipoLista,
      ticketMedio,
      materialMedio,
      estruturaMensal,
      aliquotaImposto: parseFloat(aliquotaImposto) || 0,
      receitaLiquidaMensalMedia,
      margemDisponivelMaoDeObra,
      pontoEquilibrioHoje,
      maoDeObraMedioPeca,
      margemHojeMedioPeca,
      margemHojePct,
      custoEquipeMensalAtual,
      porTipoDetalhe,
      piorMes,
      melhorMes,
    };
  }, [pecas, equipe, custoAviamentosPorPecaBase, aluguelAtelie, luzAtelie, aliquotaImposto, janelaRemuneracao, inicioProducaoAlfaiataria]);

  function textoRemuneracao(d) {
    const linhas = [
      `Dados para remuneração — Schuck Alfaiataria (últimos ${janelaRemuneracao} meses fechados, ${d.meses[0]} a ${d.meses[d.meses.length - 1]})`,
      "",
      "PRODUÇÃO (toda peça produzida, inclusive doação/uso próprio/permuta — mesma base do Histórico de Produção)",
      `Peças pedidas/mês (média): ${d.mediaPedida.toFixed(2)} (total ${d.qtdPedida} no período, base: data do pedido)`,
      `Peças entregues/mês (média): ${d.mediaEntregue.toFixed(2)} (total ${d.qtdEntregue} no período, base: data de entrega, status Entregue)`,
      d.porTipoLista.length ? `Por tipo de peça (pedidas no período): ${d.porTipoLista.map(([t, n]) => `${t} ${n}`).join(", ")}` : "",
      "",
      "PREÇO E CUSTO (só peça vendida — exclui doação/uso próprio/permuta)",
      `Ticket médio de venda / peça: ${brl(d.ticketMedio)}`,
      `Material médio / peça: ${brl(d.materialMedio)}`,
      `Horas de referência por tipo: ${Object.entries(HORAS_REFERENCIA_TIPO_PECA).map(([t, h]) => `${t} ${h}h`).join(", ")}`,
      "",
      "ESTRUTURA E METAS",
      `Estrutura fixa do ateliê / mês (aluguel+luz): ${brl(d.estruturaMensal)}`,
      `Alíquota de imposto: ${d.aliquotaImposto}%`,
      "",
      "INDICADORES",
      `Receita líquida mensal média: ${brl(d.receitaLiquidaMensalMedia)}`,
      `Margem disponível pra mão de obra / peça (antes de remunerar, não depende do modelo escolhido): ${brl(d.margemDisponivelMaoDeObra)}`,
      `Ponto de equilíbrio hoje (estrutura do ateliê + custo fixo da equipe atual): ${d.pontoEquilibrioHoje !== null ? d.pontoEquilibrioHoje.toFixed(1) + " peças/mês" : "—"}`,
      "",
      `SITUAÇÃO ATUAL (referência — inclui o custo de mão de obra de hoje, calculado pelo ritmo real de ENTREGA, não de pedido)`,
      `Margem líquida de hoje / peça: ${brl(d.margemHojeMedioPeca)} (${d.margemHojePct.toFixed(0)}%), já descontando mão de obra média de ${brl(d.maoDeObraMedioPeca)}/peça pelo custo atual da equipe`,
      "",
      "VALOR EQUIVALENTE POR TIPO DE PEÇA (PJ por produtividade — não é preço combinado, é o ponto de partida pra negociar)",
      "Calculado pelo ritmo real de ENTREGA (peça que sai pronta), não de pedido — é o que o modelo por peça pagaria de verdade. Empata com o fixo de hoje só se o ritmo de entrega se manter na média. Abaixo da média, PJ por peça paga menos que o fixo de hoje; acima, paga mais.",
      ...d.porTipoDetalhe.map(
        (t) =>
          `${t.tipo}: ${t.qtd} peça(s) pedida(s) no período · ticket médio ${brl(t.ticketMedio)} · material médio ${brl(t.materialMedio)} · ${
            t.horasRef !== null ? t.horasRef + "h de referência · " : ""
          }valor equivalente ${brl(t.valorEquivalente)}/peça`
      ),
      "",
      "O QUE ISSO SIGNIFICA NOS SEUS MESES REAIS (por mês de ENTREGA)",
      d.piorMes
        ? `Mês de entrega mais fraco do período (${d.piorMes.mes}, ${d.piorMes.qtd} peça(s) entregue(s)): a mão de obra ganharia ${brl(d.piorMes.ganhoPJ)} sob PJ por peça — ${d.piorMes.diferencaPct.toFixed(0)}% ${d.piorMes.diferencaPct >= 0 ? "a mais" : "a menos"} que os ${brl(d.custoEquipeMensalAtual)} fixos de hoje.`
        : "",
      d.melhorMes
        ? `Mês de entrega mais forte do período (${d.melhorMes.mes}, ${d.melhorMes.qtd} peça(s) entregue(s)): a mão de obra ganharia ${brl(d.melhorMes.ganhoPJ)} sob PJ por peça — ${d.melhorMes.diferencaPct.toFixed(0)}% ${d.melhorMes.diferencaPct >= 0 ? "a mais" : "a menos"} que os ${brl(d.custoEquipeMensalAtual)} fixos de hoje.`
        : "",
    ];
    return linhas.filter((l) => l !== "").join("\n");
  }

  async function copiarRemuneracao() {
    const texto = textoRemuneracao(dadosRemuneracao);
    try {
      await navigator.clipboard.writeText(texto);
      setCopiadoRemuneracao(true);
      setTimeout(() => setCopiadoRemuneracao(false), 2500);
    } catch {
      setCopiadoRemuneracao(false);
    }
  }

  const [respostaFinanceiro, setRespostaFinanceiro] = useState(null);
  const [carregandoFinanceiro, setCarregandoFinanceiro] = useState(false);
  const [erroFinanceiro, setErroFinanceiro] = useState(null);

  async function gerarFinanceiro() {
    setCarregandoFinanceiro(true);
    setErroFinanceiro(null);
    setRespostaFinanceiro(null);
    try {
      const resposta = await chamarAgenteIA("financeiro", {
        ...resumoFinanceiroMes,
        caixaAtual: parseFloat(caixaAtual) || 0,
        metaProLabore,
        metaLucro,
        receitaRecebida: resumoFinanceiroMes.receitaRecebida.toFixed(2),
        despesasPagas: resumoFinanceiroMes.despesasPagas.toFixed(2),
        saldoMes: resumoFinanceiroMes.saldoMes.toFixed(2),
        totalProximosVencimentos: resumoFinanceiroMes.totalProximosVencimentos.toFixed(2),
      });
      setRespostaFinanceiro(resposta);
    } catch (e) {
      setErroFinanceiro(e.message);
    } finally {
      setCarregandoFinanceiro(false);
    }
  }

  // ---------- Agente Gerente ----------
  // Detecta inconsistências reais na operação de forma determinística
  // (regras em código, não a IA "achando" problema) e manda só o
  // resumo pro modelo priorizar e explicar o que corrigir primeiro —
  // mesmo padrão dos outros agentes: cálculo aqui, narração lá.
  const achadosOperacionais = useMemo(() => {
    const semValorTecidoLista = [
      ...(pedidos || []).filter((p) => (p.tecidos || []).some((t) => metragemParaNumero(t.metragem) !== null && !parseFloat(t.valorMetro))).map((p) => ({ ...p, _tipo: "pedido" })),
      ...(pecas || []).filter((p) => (p.tecidos || []).some((t) => metragemParaNumero(t.metragem) !== null && !parseFloat(t.valorMetro))).map((p) => ({ ...p, _tipo: "peca" })),
    ];

    const recebidoSemDataLista = [
      ...(pedidos || []).filter((p) => p.aReceber?.statusPagamento === "Recebido" && !p.dataRecebimento).map((p) => ({ ...p, _tipo: "pedido" })),
      ...(pecas || []).filter((p) => p.statusPagamentoVenda === "Recebido" && !p.dataRecebimento).map((p) => ({ ...p, _tipo: "peca" })),
    ];

    const despesaSemCategoriaLista = (despesas || []).filter((d) => d.status === "Pago" && !d.categoria);

    // Valor muito abaixo do padrão do mesmo fornecedor (é assim que o
    // R$12 da Fabiana, que devia ser R$120, teria sido pego automático).
    const porFornecedor = new Map();
    (despesas || []).forEach((d) => {
      if (d.status !== "Pago") return;
      const chave = normalizarNome(d.fornecedor || d.descricao);
      if (!chave) return;
      if (!porFornecedor.has(chave)) porFornecedor.set(chave, []);
      porFornecedor.get(chave).push(d);
    });
    const valorSuspeitoLista = [];
    porFornecedor.forEach((lista) => {
      if (lista.length < 3) return;
      const valores = lista.map((d) => totalDespesaLinha(d));
      const base = mediana(valores.filter((v) => v > 0));
      if (!base) return;
      lista.forEach((d, i) => {
        if (valores[i] > 0 && valores[i] < base * 0.15) valorSuspeitoLista.push({ ...d, valorTipico: base });
      });
    });

    // Pedidos com origemPlanoId são entregas mensais de um plano de
    // assinatura já pago na venda do plano (dinheiro contado uma vez só,
    // na origem) — não é erro esses não terem aReceber próprio, então
    // ficam de fora desse achado (mesmo critério já usado em Relatorio.jsx).
    const entregueSemValorLista = [
      ...(pedidos || [])
        .filter((p) => p.status === "Entregue" && p.status !== "Doação" && !p.origemPlanoId && !(parseFloat(p.aReceber?.valor) > 0))
        .map((p) => ({ ...p, _tipo: "pedido" })),
      ...(pecas || [])
        .filter((p) => p.status === "Entregue" && !TIPOS_SAIDA_SEM_VENDA.includes(p.tipoSaida) && !(parseFloat(p.valorVenda) > 0))
        .map((p) => ({ ...p, _tipo: "peca" })),
    ];

    const estoqueNegativoLista = (estoqueTecidos || []).filter((e) => e.saldoMetros < 0);

    // Pedido/peça com mais de 10 dias e ainda parado num passo manual
    // que alguém esqueceu de fazer — mandar pra produção (Fabiana/
    // Ícaro) ou comprar o tecido. Não é atraso normal de produção, é
    // esquecimento: 10 dias é tempo de sobra pra qualquer um dos dois
    // já ter acontecido. Pedido fechado (entregue/doação/uso pessoal)
    // não conta, óbvio.
    const LIMITE_DIAS_PARADO = 10;
    const paradoHaMais10Dias = (p) => p.dataPedido && !pedidoFechado(p.status) && diasAte(p.dataPedido) <= -LIMITE_DIAS_PARADO;

    const naoEnviadoAtrasadoLista = [
      ...(pedidos || []).filter((p) => !p.enviadoFabi && paradoHaMais10Dias(p)).map((p) => ({ ...p, _tipo: "pedido" })),
      ...(pecas || []).filter((p) => !p.enviadoIcaro && paradoHaMais10Dias(p)).map((p) => ({ ...p, _tipo: "peca" })),
    ];

    const tecidoAtrasadoLista = [
      ...(pedidos || []).filter((p) => (p.statusTecido || "aguardando") !== "completo" && paradoHaMais10Dias(p)).map((p) => ({ ...p, _tipo: "pedido" })),
      ...(pecas || []).filter((p) => (p.statusTecido || "aguardando") !== "completo" && paradoHaMais10Dias(p)).map((p) => ({ ...p, _tipo: "peca" })),
    ];

    const formatarParado = (p) => `${p.cliente || "(sem nome)"} · pedido de ${fmtData(p.dataPedido)}`;

    const achados = {
      semValorTecido: resumirAchado(semValorTecidoLista, (p) => p.cliente || "(sem nome)"),
      recebidoSemData: resumirAchado(recebidoSemDataLista, (p) => p.cliente || "(sem nome)"),
      despesaSemCategoria: resumirAchado(despesaSemCategoriaLista, (d) => `${fmtData(d.dataPagamento)} · ${d.fornecedor || d.descricao} · ${brl(totalDespesaLinha(d))}`),
      valorSuspeito: resumirAchado(
        valorSuspeitoLista,
        (d) => `${fmtData(d.dataPagamento)} · ${d.fornecedor || d.descricao} · ${brl(totalDespesaLinha(d))} (típico: ~${brl(d.valorTipico)})`
      ),
      entregueSemValor: resumirAchado(entregueSemValorLista, (p) => p.cliente || "(sem nome)"),
      estoqueNegativo: resumirAchado(estoqueNegativoLista, (e) => `${e.codigo} (${e.saldoMetros}m)`),
      naoEnviadoAtrasado: resumirAchado(naoEnviadoAtrasadoLista, formatarParado),
      tecidoAtrasado: resumirAchado(tecidoAtrasadoLista, formatarParado),
    };
    const totalAchados = Object.values(achados).reduce((s, a) => s + a.qtd, 0);
    const listasCompletas = {
      semValorTecido: semValorTecidoLista,
      recebidoSemData: recebidoSemDataLista,
      despesaSemCategoria: despesaSemCategoriaLista,
      valorSuspeito: valorSuspeitoLista,
      entregueSemValor: entregueSemValorLista,
      estoqueNegativo: estoqueNegativoLista,
      naoEnviadoAtrasado: naoEnviadoAtrasadoLista,
      tecidoAtrasado: tecidoAtrasadoLista,
    };
    return { ...achados, totalAchados, listasCompletas };
  }, [pedidos, pecas, despesas, estoqueTecidos]);

  function irParaItem(item) {
    if (item._tipo === "pedido" && irParaPedido) irParaPedido(item.id);
    else if (item._tipo === "peca" && irParaPeca) irParaPeca(item.id);
  }

  const [respostaGerente, setRespostaGerente] = useState(null);
  const [carregandoGerente, setCarregandoGerente] = useState(false);
  const [erroGerente, setErroGerente] = useState(null);

  async function gerarGerente() {
    setCarregandoGerente(true);
    setErroGerente(null);
    setRespostaGerente(null);
    try {
      // listasCompletas é só pra UI local (expandir/clicar) — não faz
      // sentido mandar os objetos inteiros dos pedidos/despesas pra IA,
      // que já recebe o resumo (qtd/exemplos) dentro de cada achado.
      const { listasCompletas, ...achadosParaIA } = achadosOperacionais;
      const resposta = await chamarAgenteIA("gerente", achadosParaIA);
      setRespostaGerente(resposta);
    } catch (e) {
      setErroGerente(e.message);
    } finally {
      setCarregandoGerente(false);
    }
  }

  // ---------- Agente Resumo do Dia ----------
  // Não recalcula nada dos outros agentes — só puxa o que eles já
  // calcularam (saldo, estoque, achados) e soma dois números rápidos
  // que ainda não existiam em lugar nenhum (tecido pendente e
  // vencimentos de 7 dias), pra virar uma leitura única de "o que
  // merece atenção hoje" em vez de abrir os 4 cards um por um.
  const clientesSumidos = useMemo(() => {
    return (clientes || [])
      .map((c) => enriquecerCliente(c, limiteMesesSumido))
      .filter((c) => c.sumido && c.totalComprado > 0)
      .sort((a, b) => b.totalComprado - a.totalComprado)
      .slice(0, 5);
  }, [clientes, limiteMesesSumido]);

  const resumoDoDia = useMemo(() => {
    const receitaMesAtual =
      (pedidos || [])
        .filter((p) => p.aReceber?.statusPagamento === "Recebido" && (p.dataRecebimento || "").slice(0, 7) === mesAtual)
        .reduce((s, p) => s + (parseFloat(p.aReceber.valor) || 0), 0) +
      (pecas || [])
        .filter((p) => p.statusPagamentoVenda === "Recebido" && (p.dataRecebimento || "").slice(0, 7) === mesAtual)
        .reduce((s, p) => s + (parseFloat(p.valorVenda) || 0), 0);
    const despesasMesAtual = (despesas || [])
      .filter((d) => d.status === "Pago" && (d.dataPagamento || "").slice(0, 7) === mesAtual)
      .reduce((s, d) => s + totalDespesaLinha(d), 0);

    const daqui7dias = somarDias(hojeISO(), 7);
    const vencimentos7dias = (despesas || []).filter((d) => d.status !== "Pago" && d.vencimento >= hojeISO() && d.vencimento <= daqui7dias);
    const totalVencimentos7dias = vencimentos7dias.reduce((s, d) => s + totalDespesaLinha(d), 0);

    const pedidosAguardandoTecido = (pedidos || []).filter(
      (p) => (p.statusTecido || "aguardando") !== "completo" && !pedidoFechado(p.status)
    ).length;

    return {
      saldoMesAtual: receitaMesAtual - despesasMesAtual,
      metaCombinada: (parseFloat(metaProLabore) || 0) + (parseFloat(metaLucro) || 0),
      mesesDeEstoque: resumoEstoque.mesesDeEstoque,
      totalAchados: achadosOperacionais.totalAchados,
      pedidosAguardandoTecido,
      qtdVencimentos7dias: vencimentos7dias.length,
      totalVencimentos7dias,
      clientesSumidos: clientesSumidos.map((c) => ({ nome: c.nome, totalComprado: c.totalComprado, mesesSemComprar: c.mesesSemComprar })),
    };
  }, [pedidos, pecas, despesas, mesAtual, metaProLabore, metaLucro, resumoEstoque, achadosOperacionais, clientesSumidos]);

  const [respostaResumoDia, setRespostaResumoDia] = useState(null);
  const [carregandoResumoDia, setCarregandoResumoDia] = useState(false);
  const [erroResumoDia, setErroResumoDia] = useState(null);

  async function gerarResumoDia() {
    setCarregandoResumoDia(true);
    setErroResumoDia(null);
    setRespostaResumoDia(null);
    try {
      const resposta = await chamarAgenteIA("resumo_dia", {
        ...resumoDoDia,
        saldoMesAtual: resumoDoDia.saldoMesAtual.toFixed(2),
        metaCombinada: resumoDoDia.metaCombinada.toFixed(2),
        totalVencimentos7dias: resumoDoDia.totalVencimentos7dias.toFixed(2),
      });
      setRespostaResumoDia(resposta);
    } catch (e) {
      setErroResumoDia(e.message);
    } finally {
      setCarregandoResumoDia(false);
    }
  }

  return (
    <div>
      <PageTitle eyebrow="Estratégico — só você vê" title="Agentes de IA" />
      <div style={{ fontSize: 12, color: TEXT_MUTED, marginBottom: 20 }}>
        Cada análise é gerada na hora, com os números reais do sistema — não fica salva em lugar nenhum além dessa tela.
      </div>

      <Card style={{ padding: 20 }} className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Sunrise size={16} color={BRASS} />
          <div className="fx-serif" style={{ fontSize: 16, fontWeight: 600 }}>
            Resumo do Dia
          </div>
        </div>
        <div style={{ fontSize: 12, color: TEXT_MUTED, marginBottom: 16 }}>
          Junta o que os outros agentes já sabem (caixa, estoque, inconsistências) com tecido pendente, vencimentos
          próximos e clientes sumidos, numa leitura só — pra decidir o que atacar primeiro sem abrir tela por tela.
        </div>

        <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
          <div>
            <div style={{ fontSize: 11, color: TEXT_MUTED }}>Saldo do mês</div>
            <div className="fx-mono" style={{ fontSize: 15, fontWeight: 700, color: resumoDoDia.saldoMesAtual >= 0 ? "#2C6E31" : "#9C4A1E" }}>
              {brl(resumoDoDia.saldoMesAtual)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: TEXT_MUTED }}>Vence em 7 dias</div>
            <div className="fx-mono" style={{ fontSize: 15, fontWeight: 700 }}>
              {brl(resumoDoDia.totalVencimentos7dias)} <span style={{ fontSize: 11, color: TEXT_MUTED }}>({resumoDoDia.qtdVencimentos7dias})</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: TEXT_MUTED }}>Tecido pendente</div>
            <div className="fx-mono" style={{ fontSize: 15, fontWeight: 700, color: resumoDoDia.pedidosAguardandoTecido > 0 ? "#9C4A1E" : undefined }}>
              {resumoDoDia.pedidosAguardandoTecido} pedido(s)
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: TEXT_MUTED }}>Estoque de tecido</div>
            <div className="fx-mono" style={{ fontSize: 15, fontWeight: 700 }}>{resumoDoDia.mesesDeEstoque ?? "—"} meses</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: TEXT_MUTED }}>Inconsistências</div>
            <div className="fx-mono" style={{ fontSize: 15, fontWeight: 700, color: resumoDoDia.totalAchados > 0 ? "#9C4A1E" : undefined }}>
              {resumoDoDia.totalAchados}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: TEXT_MUTED }}>Clientes sumidos</div>
            <div className="fx-mono" style={{ fontSize: 15, fontWeight: 700, color: resumoDoDia.clientesSumidos.length > 0 ? "#9C4A1E" : undefined }}>
              {resumoDoDia.clientesSumidos.length}
            </div>
          </div>
        </div>

        {resumoDoDia.clientesSumidos.length > 0 && (
          <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 12 }}>
            Maiores clientes sumidos (há {limiteMesesSumido}+ meses sem comprar):{" "}
            {resumoDoDia.clientesSumidos.map((c) => `${c.nome} (${c.mesesSemComprar}m)`).join(", ")}
          </div>
        )}

        <button
          onClick={gerarResumoDia}
          disabled={carregandoResumoDia}
          style={{ background: BRASS, color: "#FFF", padding: "9px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13, opacity: carregandoResumoDia ? 0.7 : 1, marginBottom: 16 }}
        >
          {carregandoResumoDia ? "Analisando…" : "Gerar resumo do dia"}
        </button>

        {erroResumoDia && <div style={{ color: "#9C4A1E", fontSize: 12, marginBottom: 12 }}>{erroResumoDia}</div>}
        {respostaResumoDia && (
          <div style={{ whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.6, background: "#F3EEDF", borderRadius: 8, padding: 16 }}>
            {respostaResumoDia}
          </div>
        )}
      </Card>

      <Card style={{ padding: 20 }} className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={16} color={BRASS} />
          <div className="fx-serif" style={{ fontSize: 16, fontWeight: 600 }}>
            Agente de Precificação
          </div>
        </div>
        <div style={{ fontSize: 12, color: TEXT_MUTED, marginBottom: 16 }}>
          Compara preço médio e custo real por tipo de peça com a sua meta de pró-labore.
        </div>

        <div className="flex items-end gap-3 mb-4 flex-wrap">
          <Field label="Meta de pró-labore mensal (R$)">
            <input
              type="number"
              style={{ ...inputStyle, maxWidth: 160 }}
              value={metaProLabore}
              onChange={(e) => salvarMetaProLabore(e.target.value)}
              disabled={carregandoConfig}
            />
          </Field>
          <button
            onClick={gerarPrecificacao}
            disabled={carregandoPrecificacao}
            style={{ background: BRASS, color: "#FFF", padding: "9px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13, opacity: carregandoPrecificacao ? 0.7 : 1 }}
          >
            {carregandoPrecificacao ? "Analisando…" : "Gerar análise"}
          </button>
        </div>

        <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 12 }}>
          Custo fixo pago neste mês (sem tecido/aviamento/pró-labore): {brl(custosFixosMesAtual)}
          {camisariaResumo ? ` · Camisaria: ${camisariaResumo.qtdMesAtual} entregue(s) este mês (${camisariaResumo.qtdHistorico} no histórico)` : " · sem histórico de camisaria com valor"}
          {alfaiatariaPorTipo.length > 0
            ? ` · Alfaiataria: ${alfaiatariaPorTipo.reduce((s, t) => s + t.qtdMesAtual, 0)} entregue(s) este mês (${alfaiatariaPorTipo.length} tipo(s) no histórico)`
            : " · sem histórico de alfaiataria com valor"}
        </div>

        {erroPrecificacao && <div style={{ color: "#9C4A1E", fontSize: 12, marginBottom: 12 }}>{erroPrecificacao}</div>}
        {respostaPrecificacao && (
          <div style={{ whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.6, background: "#F3EEDF", borderRadius: 8, padding: 16 }}>
            {respostaPrecificacao}
          </div>
        )}
      </Card>

      <Card style={{ padding: 20 }} className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Package size={16} color={BRASS} />
          <div className="fx-serif" style={{ fontSize: 16, fontWeight: 600 }}>
            Agente de Estoque
          </div>
        </div>
        <div style={{ fontSize: 12, color: TEXT_MUTED, marginBottom: 16 }}>
          Analisa quanto tempo o estoque de tecido já comprado ainda cobre a produção, e o que isso significa pro caixa.
          Ritmo de venda e gasto com tecido avulso consideram só de {INICIO_DADOS_CONFIAVEIS.slice(5, 7)}/{INICIO_DADOS_CONFIAVEIS.slice(0, 4)} pra cá (mês corrente incluso).
        </div>

        <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
          <div>
            <div style={{ fontSize: 11, color: TEXT_MUTED }}>Valor em estoque</div>
            <div className="fx-mono" style={{ fontSize: 15, fontWeight: 700 }}>{brl(resumoEstoque.valorTotalEstoque)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: TEXT_MUTED }}>Camisas possíveis</div>
            <div className="fx-mono" style={{ fontSize: 15, fontWeight: 700 }}>{resumoEstoque.totalCamisasPossiveis}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: TEXT_MUTED }}>Média vendida/mês</div>
            <div className="fx-mono" style={{ fontSize: 15, fontWeight: 700 }}>{resumoEstoque.mediaMensalVendas}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: TEXT_MUTED }}>Meses de estoque</div>
            <div className="fx-mono" style={{ fontSize: 15, fontWeight: 700 }}>{resumoEstoque.mesesDeEstoque ?? "—"}</div>
          </div>
        </div>

        <button
          onClick={gerarEstoque}
          disabled={carregandoEstoque}
          style={{ background: BRASS, color: "#FFF", padding: "9px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13, opacity: carregandoEstoque ? 0.7 : 1, marginBottom: 16 }}
        >
          {carregandoEstoque ? "Analisando…" : "Gerar análise"}
        </button>

        {resumoEstoque.itensComSaldo === 0 && (
          <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 12 }}>
            Nenhum tecido com saldo em metros cadastrado — a análise pode ficar incompleta.
          </div>
        )}

        {erroEstoque && <div style={{ color: "#9C4A1E", fontSize: 12, marginBottom: 12 }}>{erroEstoque}</div>}
        {respostaEstoque && (
          <div style={{ whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.6, background: "#F3EEDF", borderRadius: 8, padding: 16 }}>
            {respostaEstoque}
          </div>
        )}
      </Card>

      <Card style={{ padding: 20 }}>
        <div className="flex items-center gap-2 mb-1">
          <Wallet size={16} color={BRASS} />
          <div className="fx-serif" style={{ fontSize: 16, fontWeight: 600 }}>
            Agente Financeiro
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
          <div style={{ fontSize: 12, color: TEXT_MUTED }}>
            Parecer sobre {modoTrimestreFinanceiro ? "os últimos 3 meses" : "o mês atual"} (regime de caixa), os vencimentos dos próximos 30 dias, e o progresso rumo a
            pró-labore + lucro de {brl((parseFloat(metaProLabore) || 0) + (parseFloat(metaLucro) || 0))}.
          </div>
          <button
            onClick={() => setModoTrimestreFinanceiro((v) => !v)}
            style={{
              background: modoTrimestreFinanceiro ? BRASS : "#EDEAE0",
              color: modoTrimestreFinanceiro ? "#FFF" : TEXT_MUTED,
              padding: "6px 12px",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            {modoTrimestreFinanceiro ? "✓ últimos 3 meses" : "ver últimos 3 meses"}
          </button>
        </div>

        <div className="flex items-end gap-3 mb-4 flex-wrap">
          <Field label="Meta de pró-labore mensal (R$)">
            <input
              type="number"
              style={{ ...inputStyle, maxWidth: 160 }}
              value={metaProLabore}
              onChange={(e) => salvarMetaProLabore(e.target.value)}
              disabled={carregandoConfig}
            />
          </Field>
          <Field label="Meta de lucro mensal (R$)">
            <input
              type="number"
              style={{ ...inputStyle, maxWidth: 160 }}
              value={metaLucro}
              onChange={(e) => salvarMetaLucro(e.target.value)}
              disabled={carregandoConfig}
            />
          </Field>
        </div>

        <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
          <div>
            <div style={{ fontSize: 11, color: TEXT_MUTED }}>Recebido {modoTrimestreFinanceiro ? "no período" : "no mês"}</div>
            <div className="fx-mono" style={{ fontSize: 15, fontWeight: 700 }}>{brl(resumoFinanceiroMes.receitaRecebida)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: TEXT_MUTED }}>Pago {modoTrimestreFinanceiro ? "no período" : "no mês"}</div>
            <div className="fx-mono" style={{ fontSize: 15, fontWeight: 700 }}>{brl(resumoFinanceiroMes.despesasPagas)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: TEXT_MUTED }}>Saldo {modoTrimestreFinanceiro ? "do período" : "do mês"}</div>
            <div className="fx-mono" style={{ fontSize: 15, fontWeight: 700, color: resumoFinanceiroMes.saldoMes >= 0 ? "#2C6E31" : "#9C4A1E" }}>
              {brl(resumoFinanceiroMes.saldoMes)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: TEXT_MUTED }}>Em aberto (30 dias)</div>
            <div className="fx-mono" style={{ fontSize: 15, fontWeight: 700 }}>{brl(resumoFinanceiroMes.totalProximosVencimentos)}</div>
          </div>
        </div>

        <button
          onClick={gerarFinanceiro}
          disabled={carregandoFinanceiro}
          style={{ background: BRASS, color: "#FFF", padding: "9px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13, opacity: carregandoFinanceiro ? 0.7 : 1, marginBottom: 16 }}
        >
          {carregandoFinanceiro ? "Analisando…" : "Gerar parecer"}
        </button>

        {caixaAtual === "" && !carregandoConfig && (
          <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 12 }}>
            Caixa atual não está preenchido (configure em Contas a Pagar) — a análise segue sem esse número.
          </div>
        )}

        {erroFinanceiro && <div style={{ color: "#9C4A1E", fontSize: 12, marginBottom: 12 }}>{erroFinanceiro}</div>}
        {respostaFinanceiro && (
          <div style={{ whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.6, background: "#F3EEDF", borderRadius: 8, padding: 16 }}>
            {respostaFinanceiro}
          </div>
        )}

        <div style={{ borderTop: "1px solid #EDEAE0", marginTop: 20, paddingTop: 20 }}>
          <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
            <div className="fx-serif" style={{ fontSize: 15, fontWeight: 600 }}>
              Dados para Remuneração
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setMostrarLegendaRemuneracao((v) => !v)}
                style={{ background: "transparent", color: BRASS, padding: "6px 10px", borderRadius: 8, fontSize: 12, fontWeight: 600, textDecoration: "underline" }}
              >
                {mostrarLegendaRemuneracao ? "Fechar explicação" : "O que significa cada indicador?"}
              </button>
              <button
                onClick={() => setJanelaRemuneracao((v) => (v === 6 ? 12 : 6))}
                style={{ background: "#EDEAE0", color: TEXT_MUTED, padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600 }}
              >
                últimos {janelaRemuneracao} meses fechados — trocar pra {janelaRemuneracao === 6 ? 12 : 6}
              </button>
            </div>
          </div>
          <div style={{ fontSize: 12, color: TEXT_MUTED, marginBottom: 10 }}>
            Só meses fechados entram na conta — o mês atual nunca aparece aqui, mesmo que já tenha alguma peça
            lançada, pra não puxar a média pra baixo artificialmente. Diagnóstico da alfaiataria pra embasar um
            projeto de remuneração (CLT, PJ, por produtividade etc.) — fatos
            de hoje, direto do banco, não é uma simulação do modelo novo.
          </div>

          {mostrarLegendaRemuneracao && (
            <div style={{ background: "#F3EEDF", borderRadius: 8, padding: 16, marginBottom: 16, fontSize: 12.5, lineHeight: 1.6 }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>PRODUÇÃO</div>
              <p style={{ marginBottom: 8 }}>
                <strong>Peças pedidas/mês</strong>: quantas peças entraram como pedido por mês, em média. Conta tudo —
                venda, doação, uso próprio. É volume de trabalho, não de venda. <strong>Peças entregues/mês</strong>:
                quantas peças realmente saíram prontas (status Entregue) por mês, em média — normalmente menor que a
                de pedido, porque sempre tem peça em produção.
              </p>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>PREÇO E CUSTO</div>
              <p style={{ marginBottom: 8 }}>
                <strong>Ticket médio/peça</strong>: quanto você cobra, em média, por peça vendida de verdade (doação
                não entra). <strong>Material médio/peça</strong>: quanto custa, em média, o tecido + aviamento de uma
                peça vendida.
              </p>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>ESTRUTURA E METAS</div>
              <p style={{ marginBottom: 8 }}>
                <strong>Estrutura do ateliê/mês</strong>: aluguel + luz, custo fixo do espaço, independente de quanto
                se produz. <strong>Alíquota de imposto</strong>: % que sai do faturamento pro Simples Nacional.
              </p>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>INDICADORES</div>
              <p style={{ marginBottom: 8 }}>
                <strong>Receita líquida mensal média</strong>: quanto entra líquido por mês (já descontado o
                imposto), em média. <strong>Margem disponível pra mão de obra (peça)</strong>: o número mais
                importante pro projeto de remuneração — quanto sobra de cada peça vendida, depois de material,
                imposto e a fatia da estrutura do ateliê, <strong>antes de pagar quem produziu</strong>. É o teto:
                nenhum modelo de remuneração pode custar mais que isso por peça sem comer sua margem de lucro.{" "}
                <strong>Ponto de equilíbrio hoje</strong>: quantas peças por mês cobririam a estrutura do ateliê{" "}
                <strong>e</strong> o custo fixo real da equipe atual — a situação de hoje, completa, não uma versão
                hipotética sem mão de obra.
              </p>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>SITUAÇÃO ATUAL</div>
              <p style={{ marginBottom: 8 }}>
                Só referência — usa o custo de equipe de hoje, calculado pelo <strong>ritmo real de entrega</strong>{" "}
                (não de pedido, já que é isso que um modelo por produção pagaria de verdade).{" "}
                <strong>Mão de obra média hoje/peça</strong>: quanto a equipe atual custa, em média, por peça
                vendida. <strong>Margem líquida de hoje/peça</strong>: a margem real de hoje, já descontando essa mão
                de obra.
              </p>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>VALOR EQUIVALENTE POR TIPO DE PEÇA</div>
              <p style={{ marginBottom: 8 }}>
                Por tipo de peça, quanto equivaleria pagar em PJ por produtividade pra dar o mesmo total que a equipe
                ganha fixo hoje — calculado pelo ritmo real de entrega. Não é preço combinado, é ponto de partida pra
                negociar.
              </p>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>O QUE ISSO SIGNIFICA NOS SEUS MESES REAIS</div>
              <p style={{ margin: 0 }}>
                Seu mês de entrega mais fraco e mais forte do período, mostrando quanto a mão de obra ganharia sob PJ
                por peça naquele mês específico, comparado ao fixo de hoje — pra ver concretamente o efeito de um mês
                de ritmo baixo ou alto.
              </p>
            </div>
          )}
          <div className="flex items-center gap-2 flex-wrap mb-4">
            <label style={{ fontSize: 11, color: TEXT_MUTED, fontWeight: 600 }}>Início real da produção (nunca conta mês antes disso):</label>
            <input
              type="date"
              value={inicioProducaoAlfaiataria}
              onChange={(e) => salvarInicioProducaoAlfaiataria(e.target.value)}
              style={{ ...inputStyle, width: "auto", padding: "5px 8px", fontSize: 12 }}
            />
          </div>
          {dadosRemuneracao.qtdMesesDisponiveis < dadosRemuneracao.mesesPedidosSolicitados && (
            <div style={{ fontSize: 11, color: "#9C4A1E", marginBottom: 16, fontWeight: 600 }}>
              Pediu {dadosRemuneracao.mesesPedidosSolicitados} meses, mas o histórico só tem {dadosRemuneracao.qtdMesesDisponiveis} meses fechados até
              agora ({dadosRemuneracao.meses[0]} a {dadosRemuneracao.meses[dadosRemuneracao.meses.length - 1]}) — as médias abaixo usam só esses{" "}
              {dadosRemuneracao.qtdMesesDisponiveis}, nunca inventa mês vazio antes do início real da operação.
            </div>
          )}

          <div style={{ fontSize: 11, color: TEXT_MUTED, fontWeight: 700, marginBottom: 2 }}>PRODUÇÃO</div>
          <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 8 }}>
            Conta toda peça produzida, inclusive doação/uso próprio/permuta — mesma base do gráfico "Peças entregues
            por mês" em Histórico de Produção. Preço e custo logo abaixo já são só de peça vendida.
          </div>
          <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
            <div>
              <div style={{ fontSize: 11, color: TEXT_MUTED }}>Peças pedidas/mês (média)</div>
              <div className="fx-mono" style={{ fontSize: 15, fontWeight: 700 }}>{dadosRemuneracao.mediaPedida.toFixed(2)}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: TEXT_MUTED }}>Peças entregues/mês (média)</div>
              <div className="fx-mono" style={{ fontSize: 15, fontWeight: 700 }}>{dadosRemuneracao.mediaEntregue.toFixed(2)}</div>
            </div>
          </div>
          {dadosRemuneracao.porTipoLista.length > 0 && (
            <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 16 }}>
              Por tipo (pedidas no período): {dadosRemuneracao.porTipoLista.map(([t, n]) => `${t} ${n}`).join(" · ")}
            </div>
          )}

          <div style={{ fontSize: 11, color: TEXT_MUTED, fontWeight: 700, marginBottom: 6 }}>PREÇO E CUSTO</div>
          <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
            <div>
              <div style={{ fontSize: 11, color: TEXT_MUTED }}>Ticket médio / peça</div>
              <div className="fx-mono" style={{ fontSize: 15, fontWeight: 700 }}>{brl(dadosRemuneracao.ticketMedio)}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: TEXT_MUTED }}>Material médio / peça</div>
              <div className="fx-mono" style={{ fontSize: 15, fontWeight: 700 }}>{brl(dadosRemuneracao.materialMedio)}</div>
            </div>
          </div>

          <div style={{ fontSize: 11, color: TEXT_MUTED, fontWeight: 700, marginBottom: 6 }}>ESTRUTURA E METAS</div>
          <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
            <div>
              <div style={{ fontSize: 11, color: TEXT_MUTED }}>Estrutura do ateliê / mês</div>
              <div className="fx-mono" style={{ fontSize: 15, fontWeight: 700 }}>{brl(dadosRemuneracao.estruturaMensal)}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: TEXT_MUTED }}>Alíquota de imposto</div>
              <div className="fx-mono" style={{ fontSize: 15, fontWeight: 700 }}>{dadosRemuneracao.aliquotaImposto}%</div>
            </div>
          </div>

          <div style={{ fontSize: 11, color: TEXT_MUTED, fontWeight: 700, marginBottom: 6 }}>INDICADORES</div>
          <div className="grid gap-3 mb-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>
            <div>
              <div style={{ fontSize: 11, color: TEXT_MUTED }}>Receita líquida mensal média</div>
              <div className="fx-mono" style={{ fontSize: 15, fontWeight: 700 }}>{brl(dadosRemuneracao.receitaLiquidaMensalMedia)}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: TEXT_MUTED }}>Margem disponível p/ mão de obra (peça)</div>
              <div className="fx-mono" style={{ fontSize: 15, fontWeight: 700, color: dadosRemuneracao.margemDisponivelMaoDeObra >= 0 ? "#2C6E31" : "#9C4A1E" }}>
                {brl(dadosRemuneracao.margemDisponivelMaoDeObra)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: TEXT_MUTED }}>Ponto de equilíbrio hoje (c/ mão de obra atual)</div>
              <div className="fx-mono" style={{ fontSize: 15, fontWeight: 700 }}>
                {dadosRemuneracao.pontoEquilibrioHoje !== null ? `${dadosRemuneracao.pontoEquilibrioHoje.toFixed(1)} peças/mês` : "—"}
              </div>
            </div>
          </div>

          <div style={{ fontSize: 11, color: TEXT_MUTED, fontWeight: 700, marginBottom: 6, marginTop: 10 }}>
            SITUAÇÃO ATUAL <span style={{ fontWeight: 400 }}>(referência — custo de equipe de hoje pelo ritmo real de entrega, vai mudar com o modelo novo)</span>
          </div>
          <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>
            <div>
              <div style={{ fontSize: 11, color: TEXT_MUTED }}>Mão de obra média hoje / peça</div>
              <div className="fx-mono" style={{ fontSize: 15, fontWeight: 700 }}>{brl(dadosRemuneracao.maoDeObraMedioPeca)}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: TEXT_MUTED }}>Margem líquida de hoje / peça</div>
              <div className="fx-mono" style={{ fontSize: 15, fontWeight: 700, color: dadosRemuneracao.margemHojeMedioPeca >= 0 ? "#2C6E31" : "#9C4A1E" }}>
                {brl(dadosRemuneracao.margemHojeMedioPeca)} ({dadosRemuneracao.margemHojePct.toFixed(0)}%)
              </div>
            </div>
          </div>

          <div style={{ fontSize: 11, color: TEXT_MUTED, fontWeight: 700, marginBottom: 6, marginTop: 10 }}>
            VALOR EQUIVALENTE POR TIPO DE PEÇA <span style={{ fontWeight: 400 }}>(PJ por produtividade)</span>
          </div>
          <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 10, lineHeight: 1.5 }}>
            Não é um preço combinado — não existe isso hoje (o campo "valor devido ao Ícaro" é solto, não confiável,
            já que a equipe é paga fixo por mês). É o ponto de partida pra negociar a tabela nova: quanto equivaleria
            pagar por peça, pelo custo-hora calculado com o <strong>ritmo real de entrega</strong> (peça que sai
            pronta), não o de pedido. Empata com o fixo de hoje <strong>só se o ritmo de entrega se manter na
            média</strong> — abaixo da média, PJ por peça paga menos que o fixo de hoje; acima, paga mais.
          </div>
          <div style={{ overflowX: "auto", marginBottom: 14 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #DAD7D0", color: TEXT_MUTED, textAlign: "left" }}>
                  <th style={{ padding: "6px 8px", fontWeight: 600 }}>Tipo</th>
                  <th style={{ padding: "6px 8px", fontWeight: 600 }}>Qtd no período</th>
                  <th style={{ padding: "6px 8px", fontWeight: 600 }}>Ticket médio</th>
                  <th style={{ padding: "6px 8px", fontWeight: 600 }}>Material médio</th>
                  <th style={{ padding: "6px 8px", fontWeight: 600 }}>Horas ref.</th>
                  <th style={{ padding: "6px 8px", fontWeight: 600 }}>Valor equivalente/peça</th>
                </tr>
              </thead>
              <tbody>
                {dadosRemuneracao.porTipoDetalhe.map((t) => (
                  <tr key={t.tipo} style={{ borderBottom: "1px solid #EDEAE0" }}>
                    <td style={{ padding: "6px 8px", fontWeight: 600 }}>{t.tipo}</td>
                    <td className="fx-mono" style={{ padding: "6px 8px" }}>{t.qtd}</td>
                    <td className="fx-mono" style={{ padding: "6px 8px" }}>{brl(t.ticketMedio)}</td>
                    <td className="fx-mono" style={{ padding: "6px 8px" }}>{brl(t.materialMedio)}</td>
                    <td className="fx-mono" style={{ padding: "6px 8px" }}>{t.horasRef !== null ? `${t.horasRef}h` : "—"}</td>
                    <td className="fx-mono" style={{ padding: "6px 8px", fontWeight: 700 }}>{brl(t.valorEquivalente)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ fontSize: 11, color: TEXT_MUTED, fontWeight: 700, marginBottom: 6 }}>
            O QUE ISSO SIGNIFICA NOS SEUS MESES REAIS <span style={{ fontWeight: 400 }}>(por mês de entrega)</span>
          </div>
          <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
            {dadosRemuneracao.piorMes && (
              <div style={{ background: "#F6E3D9", borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 11, color: "#9C4A1E", fontWeight: 700, marginBottom: 4 }}>
                  Mês de entrega mais fraco ({dadosRemuneracao.piorMes.mes}, {dadosRemuneracao.piorMes.qtd} peça(s))
                </div>
                <div style={{ fontSize: 12.5, lineHeight: 1.5 }}>
                  A mão de obra ganharia <strong className="fx-mono">{brl(dadosRemuneracao.piorMes.ganhoPJ)}</strong> sob PJ por peça —{" "}
                  <strong>{Math.abs(dadosRemuneracao.piorMes.diferencaPct).toFixed(0)}% {dadosRemuneracao.piorMes.diferencaPct >= 0 ? "a mais" : "a menos"}</strong>{" "}
                  que os {brl(dadosRemuneracao.custoEquipeMensalAtual)} fixos de hoje.
                </div>
              </div>
            )}
            {dadosRemuneracao.melhorMes && (
              <div style={{ background: "#DCEBDD", borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 11, color: "#2C6E31", fontWeight: 700, marginBottom: 4 }}>
                  Mês de entrega mais forte ({dadosRemuneracao.melhorMes.mes}, {dadosRemuneracao.melhorMes.qtd} peça(s))
                </div>
                <div style={{ fontSize: 12.5, lineHeight: 1.5 }}>
                  A mão de obra ganharia <strong className="fx-mono">{brl(dadosRemuneracao.melhorMes.ganhoPJ)}</strong> sob PJ por peça —{" "}
                  <strong>{Math.abs(dadosRemuneracao.melhorMes.diferencaPct).toFixed(0)}% {dadosRemuneracao.melhorMes.diferencaPct >= 0 ? "a mais" : "a menos"}</strong>{" "}
                  que os {brl(dadosRemuneracao.custoEquipeMensalAtual)} fixos de hoje.
                </div>
              </div>
            )}
          </div>

          <button
            onClick={copiarRemuneracao}
            className="flex items-center gap-2"
            style={{ background: BRASS, color: "#FFF", padding: "9px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13 }}
          >
            <Copy size={14} /> {copiadoRemuneracao ? "Copiado!" : "Copiar resumo"}
          </button>
        </div>
      </Card>

      <Card style={{ padding: 20 }} className="mt-6">
        <div className="flex items-center gap-2 mb-1">
          <ShieldAlert size={16} color={BRASS} />
          <div className="fx-serif" style={{ fontSize: 16, fontWeight: 600 }}>
            Agente Gerente
          </div>
        </div>
        <div style={{ fontSize: 12, color: TEXT_MUTED, marginBottom: 16 }}>
          Varre pedidos, peças, despesas e estoque atrás de dado desalinhado (tecido sem valor cadastrado, "Recebido" sem
          data, despesa sem categoria, valor fora do padrão do fornecedor, venda entregue sem valor a receber, estoque
          negativo, pedido parado há mais de 10 dias sem enviar pra produção ou sem comprar o tecido) e te diz o que
          corrigir primeiro.
        </div>

        <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
          <div>
            <div style={{ fontSize: 11, color: TEXT_MUTED }}>Tecido sem valor/metro</div>
            <div className="fx-mono" style={{ fontSize: 15, fontWeight: 700, color: achadosOperacionais.semValorTecido.qtd > 0 ? "#9C4A1E" : undefined }}>
              {achadosOperacionais.semValorTecido.qtd}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: TEXT_MUTED }}>"Recebido" sem data</div>
            <div className="fx-mono" style={{ fontSize: 15, fontWeight: 700, color: achadosOperacionais.recebidoSemData.qtd > 0 ? "#9C4A1E" : undefined }}>
              {achadosOperacionais.recebidoSemData.qtd}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: TEXT_MUTED }}>Despesa sem categoria</div>
            <div className="fx-mono" style={{ fontSize: 15, fontWeight: 700, color: achadosOperacionais.despesaSemCategoria.qtd > 0 ? "#9C4A1E" : undefined }}>
              {achadosOperacionais.despesaSemCategoria.qtd}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: TEXT_MUTED }}>Valor fora do padrão</div>
            <div className="fx-mono" style={{ fontSize: 15, fontWeight: 700, color: achadosOperacionais.valorSuspeito.qtd > 0 ? "#9C4A1E" : undefined }}>
              {achadosOperacionais.valorSuspeito.qtd}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: TEXT_MUTED }}>Entregue sem receber</div>
            <div className="fx-mono" style={{ fontSize: 15, fontWeight: 700, color: achadosOperacionais.entregueSemValor.qtd > 0 ? "#9C4A1E" : undefined }}>
              {achadosOperacionais.entregueSemValor.qtd}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: TEXT_MUTED }}>Estoque negativo</div>
            <div className="fx-mono" style={{ fontSize: 15, fontWeight: 700, color: achadosOperacionais.estoqueNegativo.qtd > 0 ? "#9C4A1E" : undefined }}>
              {achadosOperacionais.estoqueNegativo.qtd}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: TEXT_MUTED }}>+10 dias sem enviar produção</div>
            <div className="fx-mono" style={{ fontSize: 15, fontWeight: 700, color: achadosOperacionais.naoEnviadoAtrasado.qtd > 0 ? "#9C4A1E" : undefined }}>
              {achadosOperacionais.naoEnviadoAtrasado.qtd}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: TEXT_MUTED }}>+10 dias sem comprar tecido</div>
            <div className="fx-mono" style={{ fontSize: 15, fontWeight: 700, color: achadosOperacionais.tecidoAtrasado.qtd > 0 ? "#9C4A1E" : undefined }}>
              {achadosOperacionais.tecidoAtrasado.qtd}
            </div>
          </div>
        </div>

        <div className="mb-4">
          <ListaAchado
            titulo="Tecido sem valor/metro cadastrado"
            itens={achadosOperacionais.listasCompletas.semValorTecido}
            formatarLinha={(p) => p.cliente || "(sem nome)"}
            aoAbrir={irParaItem}
          />
          <ListaAchado
            titulo='"Recebido" sem data de recebimento'
            itens={achadosOperacionais.listasCompletas.recebidoSemData}
            formatarLinha={(p) => p.cliente || "(sem nome)"}
            aoAbrir={irParaItem}
          />
          <ListaAchado
            titulo="Despesa paga sem categoria"
            itens={achadosOperacionais.listasCompletas.despesaSemCategoria}
            formatarLinha={(d) => `${fmtData(d.dataPagamento)} · ${d.fornecedor || d.descricao} · ${brl(totalDespesaLinha(d))}`}
          />
          <ListaAchado
            titulo="Despesa com valor fora do padrão do fornecedor"
            itens={achadosOperacionais.listasCompletas.valorSuspeito}
            formatarLinha={(d) => `${fmtData(d.dataPagamento)} · ${d.fornecedor || d.descricao} · ${brl(totalDespesaLinha(d))} (típico: ~${brl(d.valorTipico)})`}
          />
          <ListaAchado
            titulo='"Entregue" sem valor a receber'
            itens={achadosOperacionais.listasCompletas.entregueSemValor}
            formatarLinha={(p) => p.cliente || "(sem nome)"}
            aoAbrir={irParaItem}
          />
          <ListaAchado
            titulo="Estoque de tecido com saldo negativo"
            itens={achadosOperacionais.listasCompletas.estoqueNegativo}
            formatarLinha={(e) => `${e.codigo} (${e.saldoMetros}m)`}
          />
          <ListaAchado
            titulo="Parado há mais de 10 dias sem enviar pra produção"
            itens={achadosOperacionais.listasCompletas.naoEnviadoAtrasado}
            formatarLinha={(p) => `${p.cliente || "(sem nome)"} · pedido de ${fmtData(p.dataPedido)}`}
            aoAbrir={irParaItem}
          />
          <ListaAchado
            titulo="Parado há mais de 10 dias sem comprar o tecido"
            itens={achadosOperacionais.listasCompletas.tecidoAtrasado}
            formatarLinha={(p) => `${p.cliente || "(sem nome)"} · pedido de ${fmtData(p.dataPedido)}`}
            aoAbrir={irParaItem}
          />
        </div>

        <button
          onClick={gerarGerente}
          disabled={carregandoGerente}
          style={{ background: BRASS, color: "#FFF", padding: "9px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13, opacity: carregandoGerente ? 0.7 : 1, marginBottom: 16 }}
        >
          {carregandoGerente ? "Analisando…" : "Gerar diagnóstico"}
        </button>

        {achadosOperacionais.totalAchados === 0 && (
          <div style={{ fontSize: 11, color: "#2C6E31", marginBottom: 12 }}>Nenhuma inconsistência encontrada nesses critérios agora.</div>
        )}

        {erroGerente && <div style={{ color: "#9C4A1E", fontSize: 12, marginBottom: 12 }}>{erroGerente}</div>}
        {respostaGerente && (
          <div style={{ whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.6, background: "#F3EEDF", borderRadius: 8, padding: 16 }}>
            {respostaGerente}
          </div>
        )}
      </Card>
    </div>
  );
}
