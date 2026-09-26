import React, { useEffect, useMemo, useState } from "react";
import { Sparkles, Wallet } from "lucide-react";
import { Card, Field, PageTitle } from "../components/ui";
import { BRASS, TEXT_MUTED, inputStyle } from "../lib/constants";
import { brl, custoAviamentoComposicao, custoTecidoDe, hojeISO, somarDias } from "../lib/helpers";
import { chamarAgenteIA } from "../lib/agentesIA";
import { supabase } from "../supabaseClient";

const CHAVE_META_PROLABORE = "meta_pro_labore";
const CHAVE_CAIXA = "caixa_atual";

const CATEGORIAS_VARIAVEIS_POR_PECA = ["Material/Tecido avulso", "Aviamento Alfaiataria", "Aviamento Camisaria", "Pró-labore"];

function totalDespesaLinha(d) {
  return (parseFloat(d.valor) || 0) + (parseFloat(d.frete) || 0);
}

export default function AgentesIA({ pedidos, pecas, despesas, custoAviamentosPorPecaBase }) {
  const [metaProLabore, setMetaProLabore] = useState("40000");
  const [caixaAtual, setCaixaAtual] = useState("");
  const [carregandoConfig, setCarregandoConfig] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("config").select("chave, valor").in("chave", [CHAVE_META_PROLABORE, CHAVE_CAIXA]);
      (data || []).forEach((row) => {
        if (row.chave === CHAVE_META_PROLABORE) setMetaProLabore(row.valor || "40000");
        if (row.chave === CHAVE_CAIXA) setCaixaAtual(row.valor || "");
      });
      setCarregandoConfig(false);
    })();
  }, []);

  async function salvarMetaProLabore(valor) {
    setMetaProLabore(valor);
    await supabase.from("config").upsert({ chave: CHAVE_META_PROLABORE, valor });
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
    const vendas = comVenda.map((p) => parseFloat(p.aReceber.valor) || 0);
    const custos = comVenda.map((p) => custoTecidoDe(p.tecidos) + (parseFloat(p.pagoFabiana?.valor) || 0));
    const precoMedio = vendas.reduce((s, v) => s + v, 0) / comVenda.length;
    const custoMedio = custos.reduce((s, v) => s + v, 0) / comVenda.length;
    const qtdMesAtual = comVenda.filter((p) => (p.dataEntrega || "").slice(0, 7) === mesAtual).length;
    return { precoMedio: Math.round(precoMedio), custoMedio: Math.round(custoMedio), qtdHistorico: comVenda.length, qtdMesAtual };
  }, [pedidos, mesAtual]);

  const alfaiatariaPorTipo = useMemo(() => {
    const entregues = (pecas || []).filter((p) => p.status === "Entregue" && p.valorVenda !== "" && p.valorVenda != null);
    const mapa = new Map();
    entregues.forEach((p) => {
      const venda = parseFloat(p.valorVenda) || 0;
      const custo = custoTecidoDe(p.tecidos) + custoAviamentoComposicao(p.tipoPeca, custoAviamentosPorPecaBase) + (parseFloat(p.valorTotal) || 0);
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
  }, [pecas, custoAviamentosPorPecaBase, mesAtual]);

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
        camisaria: camisariaResumo,
        alfaiataria: alfaiatariaPorTipo,
      });
      setRespostaPrecificacao(resposta);
    } catch (e) {
      setErroPrecificacao(e.message);
    } finally {
      setCarregandoPrecificacao(false);
    }
  }

  // ---------- Agente Financeiro ----------

  const resumoFinanceiroMes = useMemo(() => {
    const mesAtual = hojeISO().slice(0, 7);
    const daqui30dias = somarDias(hojeISO(), 30);

    const receitaCamisaria = (pedidos || [])
      .filter((p) => p.aReceber?.statusPagamento === "Recebido" && (p.dataRecebimento || "").slice(0, 7) === mesAtual)
      .reduce((s, p) => s + (parseFloat(p.aReceber.valor) || 0), 0);
    const receitaAlfaiataria = (pecas || [])
      .filter((p) => p.statusPagamentoVenda === "Recebido" && (p.dataRecebimento || "").slice(0, 7) === mesAtual)
      .reduce((s, p) => s + (parseFloat(p.valorVenda) || 0), 0);

    const despesasPagasMes = (despesas || []).filter((d) => d.status === "Pago" && (d.dataPagamento || "").slice(0, 7) === mesAtual);
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
      mes: mesAtual,
      receitaRecebida,
      despesasPagas,
      saldoMes: receitaRecebida - despesasPagas,
      despesasPorCategoria,
      proximosVencimentos,
      totalProximosVencimentos,
    };
  }, [pedidos, pecas, despesas]);

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

  return (
    <div>
      <PageTitle eyebrow="Estratégico — só você vê" title="Agentes de IA" />
      <div style={{ fontSize: 12, color: TEXT_MUTED, marginBottom: 20 }}>
        Cada análise é gerada na hora, com os números reais do sistema — não fica salva em lugar nenhum além dessa tela.
      </div>

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

      <Card style={{ padding: 20 }}>
        <div className="flex items-center gap-2 mb-1">
          <Wallet size={16} color={BRASS} />
          <div className="fx-serif" style={{ fontSize: 16, fontWeight: 600 }}>
            Agente Financeiro
          </div>
        </div>
        <div style={{ fontSize: 12, color: TEXT_MUTED, marginBottom: 16 }}>
          Parecer sobre o mês atual (regime de caixa) e os vencimentos dos próximos 30 dias.
        </div>

        <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
          <div>
            <div style={{ fontSize: 11, color: TEXT_MUTED }}>Recebido no mês</div>
            <div className="fx-mono" style={{ fontSize: 15, fontWeight: 700 }}>{brl(resumoFinanceiroMes.receitaRecebida)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: TEXT_MUTED }}>Pago no mês</div>
            <div className="fx-mono" style={{ fontSize: 15, fontWeight: 700 }}>{brl(resumoFinanceiroMes.despesasPagas)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: TEXT_MUTED }}>Saldo do mês</div>
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
      </Card>
    </div>
  );
}
