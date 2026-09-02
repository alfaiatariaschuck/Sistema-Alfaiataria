import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { BarraDuasSeries, Card, PageTitle, StatCard } from "../components/ui";
import { CalculadoraMarkup } from "../components/CalculadoraMarkup";
import { BRASS, COR_REAL, COR_REFERENCIA, TEXT_MUTED } from "../lib/constants";
import { brl, custoTecidoDe, hojeISO, metragemParaNumero } from "../lib/helpers";
import { supabase } from "../supabaseClient";

const CHAVE_ALUGUEL_LOJA = "custo_aluguel_loja_mensal";
const CHAVE_LUZ_LOJA = "custo_luz_loja_mensal";
const CHAVE_PROLABORE = "custo_prolabore_mensal";
const CHAVE_CUSTOS_FIXOS_PJ = "custos_fixos_pj_mensal";
const CHAVE_PLANO_SAUDE_PJ = "custo_plano_saude_pj_mensal";
const MESES_HISTORICO = 6;

function brlCompacto(v) {
  const num = parseFloat(v) || 0;
  if (Math.abs(num) >= 1000) return `R$${(num / 1000).toFixed(1).replace(".", ",")}k`;
  return brl(num);
}

// Espelha Custos do Ateliê, mas pro lado da camisaria: mão de obra da
// Fabiana é por pedido (não tem salário fixo aqui), aluguel/luz são os
// da loja, e os custos compartilhados da empresa (pró-labore, PJ, plano
// de saúde) são rateados por receita com a linha de alfaiataria.
export default function CustosCamisaria({ pedidos, receitaMesOutraLinha = 0, custoAviamentosPorPecaBase = {} }) {
  const [aluguelLoja, setAluguelLoja] = useState(0);
  const [luzLoja, setLuzLoja] = useState(0);
  const [prolabore, setProlabore] = useState(0);
  const [custosFixosPJ, setCustosFixosPJ] = useState(0);
  const [planoSaudePJ, setPlanoSaudePJ] = useState(0);
  const [carregandoConfig, setCarregandoConfig] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("config")
        .select("chave, valor")
        .in("chave", [CHAVE_ALUGUEL_LOJA, CHAVE_LUZ_LOJA, CHAVE_PROLABORE, CHAVE_CUSTOS_FIXOS_PJ, CHAVE_PLANO_SAUDE_PJ]);
      (data || []).forEach((row) => {
        if (row.chave === CHAVE_ALUGUEL_LOJA) setAluguelLoja(parseFloat(row.valor) || 0);
        if (row.chave === CHAVE_LUZ_LOJA) setLuzLoja(parseFloat(row.valor) || 0);
        if (row.chave === CHAVE_PROLABORE) setProlabore(parseFloat(row.valor) || 0);
        if (row.chave === CHAVE_CUSTOS_FIXOS_PJ) setCustosFixosPJ(parseFloat(row.valor) || 0);
        if (row.chave === CHAVE_PLANO_SAUDE_PJ) setPlanoSaudePJ(parseFloat(row.valor) || 0);
      });
      setCarregandoConfig(false);
    })();
  }, []);

  const hoje = new Date(hojeISO() + "T00:00:00");
  const anoAtual = hoje.getFullYear();
  const mesAtual = hoje.getMonth();
  const mesAtualStr = hojeISO().slice(0, 7);

  const custoEstrutura = aluguelLoja + luzLoja;
  const custoCompartilhado = prolabore + custosFixosPJ + planoSaudePJ;

  const pedidosDoMes = useMemo(
    () => (pedidos || []).filter((p) => p.dataPedido && p.dataPedido.slice(0, 7) === mesAtualStr),
    [pedidos, mesAtualStr]
  );
  const pedidosVendidosDoMes = useMemo(() => pedidosDoMes.filter((p) => p.status !== "Doação"), [pedidosDoMes]);

  // Pedidos com tecido lançado mas sem valor/metro cadastrado — o custo
  // deles fica de fora da conta sem avisar, então lista quem é.
  const pedidosSemValorTecido = useMemo(
    () =>
      pedidosDoMes.filter((p) =>
        (p.tecidos || []).some((t) => metragemParaNumero(t.metragem) !== null && !parseFloat(t.valorMetro))
      ),
    [pedidosDoMes]
  );

  // Mão de obra da Fabiana — não é salário fixo, é o que se paga por
  // pedido (inclui os de Doação, que ela também produz). Como o
  // pagamento dela é feito ao longo do mês, cedo no mês esse número
  // ainda está bem incompleto — por isso a opção de projetar com base
  // no que foi pago mês passado.
  const custoMaoDeObra = useMemo(
    () => pedidosDoMes.reduce((s, p) => s + (parseFloat(p.pagoFabiana?.valor) || 0), 0),
    [pedidosDoMes]
  );

  const mesAnteriorStr = useMemo(() => {
    const d = new Date(anoAtual, mesAtual - 1, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }, [anoAtual, mesAtual]);
  const custoMaoDeObraMesAnterior = useMemo(
    () =>
      (pedidos || [])
        .filter((p) => p.dataPedido && p.dataPedido.slice(0, 7) === mesAnteriorStr)
        .reduce((s, p) => s + (parseFloat(p.pagoFabiana?.valor) || 0), 0),
    [pedidos, mesAnteriorStr]
  );

  const [usarProjecaoFabiana, setUsarProjecaoFabiana] = useState(true);
  // Enquanto o valor real do mês ainda não superou o do mês passado, a
  // projeção é a estimativa mais realista — assim que o real ultrapassa,
  // já é melhor confiar nele em vez da projeção antiga.
  useEffect(() => {
    if (custoMaoDeObra >= custoMaoDeObraMesAnterior && custoMaoDeObra > 0) setUsarProjecaoFabiana(false);
    // eslint-disable-next-line
  }, [mesAtualStr]);
  const custoMaoDeObraEfetivo = usarProjecaoFabiana ? custoMaoDeObraMesAnterior : custoMaoDeObra;

  // Tecido dos pedidos de camisaria pedidos esse mês — mesmo padrão do
  // Ateliê: metragem × valor/metro cadastrado em Compras.
  const custoProducaoTecido = useMemo(() => pedidosDoMes.reduce((soma, p) => soma + custoTecidoDe(p.tecidos), 0), [pedidosDoMes]);

  const receitaMes = useMemo(
    () => pedidosVendidosDoMes.reduce((s, p) => s + (parseFloat(p.aReceber?.valor) || 0), 0),
    [pedidosVendidosDoMes]
  );
  const quantidadeVendidaMes = useMemo(
    () => pedidosVendidosDoMes.reduce((s, p) => s + (parseInt(p.quantidade, 10) || 0), 0),
    [pedidosVendidosDoMes]
  );

  // Aviamento da camisa (botões, entretela, embalagem) — cadastrado por
  // peça-base "Camisa" em Aviamentos, custo fixo por unidade (não varia
  // por pedido como o tecido). Multiplica pela quantidade vendida no mês.
  const custoAviamentoPorCamisa = custoAviamentosPorPecaBase["Camisa"] || 0;
  const custoAviamentosMes = custoAviamentoPorCamisa * quantidadeVendidaMes;

  const custoTotal = custoMaoDeObraEfetivo + custoEstrutura + custoProducaoTecido + custoAviamentosMes;

  const resultado = receitaMes - custoTotal;
  const sePagando = resultado >= 0;

  // Pró-labore é retirada pessoal do dono, dividida 50/50 entre as duas
  // linhas (independe de quem vendeu mais no mês). O resto do custo
  // compartilhado segue o rateio por receita.
  const receitaTotalAmbasLinhas = receitaMes + receitaMesOutraLinha;
  const fatiaCamisaria = receitaTotalAmbasLinhas > 0 ? receitaMes / receitaTotalAmbasLinhas : 0.5;
  const prolaboreMetade = prolabore * 0.5;
  const custoCompartilhadoRateavel = custosFixosPJ + planoSaudePJ;
  const custoCompartilhadoRateado = prolaboreMetade + custoCompartilhadoRateavel * fatiaCamisaria;
  const custoTotalComRateio = custoTotal + custoCompartilhadoRateado;

  // Simulação: quanto falta faturar esse mês pra cobrir tudo (custo
  // próprio + fatia rateada do compartilhado), e quanto isso dá por dia
  // nos dias que restam do mês.
  const metaFaturamento = custoTotalComRateio;
  const faltaFaturar = Math.max(0, metaFaturamento - receitaMes);
  const percentualAtingido = metaFaturamento > 0 ? Math.min(100, (receitaMes / metaFaturamento) * 100) : 100;
  const diasNoMes = new Date(anoAtual, mesAtual + 1, 0).getDate();
  const diasRestantes = Math.max(1, diasNoMes - hoje.getDate() + 1);
  const faturamentoPorDiaNecessario = faltaFaturar > 0 ? faltaFaturar / diasRestantes : 0;

  const historicoMensal = useMemo(() => {
    const meses = [];
    for (let i = MESES_HISTORICO - 1; i >= 0; i--) {
      const d = new Date(anoAtual, mesAtual - i, 1);
      const chaveMes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).replace(".", "");
      meses.push({ chaveMes, label });
    }
    return meses.map(({ chaveMes, label }) => {
      const receita = (pedidos || [])
        .filter((p) => p.status !== "Doação" && p.dataPedido && p.dataPedido.slice(0, 7) === chaveMes)
        .reduce((s, p) => s + (parseFloat(p.aReceber?.valor) || 0), 0);
      return { chave: label, a: Math.round(custoTotal), b: Math.round(receita) };
    });
  }, [pedidos, anoAtual, mesAtual, custoTotal]);

  const mesesQueSePagaram = historicoMensal.filter((m) => m.b >= m.a).length;

  return (
    <div>
      <PageTitle eyebrow="Camisaria — financeiro" title="Custos da Camisaria" />

      <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <StatCard label="Receita do mês (vendas camisaria)" value={brl(receitaMes)} icon={TrendingUp} />
        <StatCard label="Custo próprio da camisaria" value={brl(custoTotal)} icon={TrendingDown} />
        <StatCard
          label="Resultado da camisaria"
          value={brl(resultado)}
          icon={Wallet}
          accent={sePagando ? "#2C6E31" : "#9C4A1E"}
        />
        <StatCard label="Camisaria cobre seus custos próprios?" value={sePagando ? "Sim" : "Não"} icon={sePagando ? TrendingUp : AlertTriangle} accent={sePagando ? "#2C6E31" : "#9C4A1E"} />
      </div>

      <Card style={{ padding: 20 }} className="mb-6">
        <div className="fx-serif mb-1" style={{ fontSize: 15, fontWeight: 600 }}>
          Quanto preciso faturar esse mês
        </div>
        <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 16 }}>
          Meta = custo próprio da camisaria + fatia rateada do compartilhado (com a projeção da Fabiana, se estiver
          marcada acima). {diasRestantes} dia(s) restam no mês.
        </div>
        <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
          <div>
            <div style={{ fontSize: 11, color: TEXT_MUTED }}>Meta de faturamento do mês</div>
            <div className="fx-mono" style={{ fontSize: 16, fontWeight: 700 }}>{carregandoConfig ? "…" : brl(metaFaturamento)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: TEXT_MUTED }}>Faturado até agora</div>
            <div className="fx-mono" style={{ fontSize: 16, fontWeight: 700, color: "#2C6E31" }}>{brl(receitaMes)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: TEXT_MUTED }}>Falta faturar</div>
            <div className="fx-mono" style={{ fontSize: 16, fontWeight: 700, color: faltaFaturar > 0 ? "#9C4A1E" : "#2C6E31" }}>{brl(faltaFaturar)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: TEXT_MUTED }}>Precisa faturar/dia (resto do mês)</div>
            <div className="fx-mono" style={{ fontSize: 16, fontWeight: 700, color: BRASS }}>{brl(faturamentoPorDiaNecessario)}</div>
          </div>
        </div>
        <div style={{ background: "#EDEAE0", borderRadius: 999, height: 8, overflow: "hidden" }}>
          <div style={{ background: percentualAtingido >= 100 ? "#2C6E31" : BRASS, height: "100%", width: `${percentualAtingido}%` }} />
        </div>
        <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 6 }}>{percentualAtingido.toFixed(0)}% da meta atingida.</div>
      </Card>

      <Card style={{ padding: 20 }} className="mb-6">
        <div className="fx-serif mb-1" style={{ fontSize: 15, fontWeight: 600 }}>
          Custos compartilhados da empresa — pró-labore meio a meio, resto por receita
        </div>
        <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 16 }}>
          Pró-labore, contador, sistemas, marketing, impostos e plano de saúde são da empresa como um todo — o ateliê
          também se beneficia deles, então <strong>não entram 100% no custo próprio da camisaria acima</strong>. O
          pró-labore é dividido <strong>50/50</strong> entre as duas linhas (é retirada pessoal sua, não tem a ver
          com quem vendeu mais). Os outros custos compartilhados são rateados pela receita do mês — a camisaria
          representa {(fatiaCamisaria * 100).toFixed(0)}% dela entre as duas linhas.
        </div>
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
          <div>
            <div style={{ fontSize: 11, color: TEXT_MUTED }}>Pró-labore (metade = {brl(prolaboreMetade)})</div>
            <div className="fx-mono" style={{ fontSize: 16, fontWeight: 700 }}>{carregandoConfig ? "…" : brl(prolabore)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: TEXT_MUTED }}>Outros custos fixos PJ</div>
            <div className="fx-mono" style={{ fontSize: 16, fontWeight: 700 }}>{carregandoConfig ? "…" : brl(custosFixosPJ)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: TEXT_MUTED }}>Plano de saúde empresarial</div>
            <div className="fx-mono" style={{ fontSize: 16, fontWeight: 700 }}>{carregandoConfig ? "…" : brl(planoSaudePJ)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: TEXT_MUTED }}>Total compartilhado da empresa</div>
            <div className="fx-mono" style={{ fontSize: 16, fontWeight: 700 }}>{carregandoConfig ? "…" : brl(custoCompartilhado)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: TEXT_MUTED }}>Fatia da camisaria ({(fatiaCamisaria * 100).toFixed(0)}%)</div>
            <div className="fx-mono" style={{ fontSize: 16, fontWeight: 700, color: BRASS }}>{carregandoConfig ? "…" : brl(custoCompartilhadoRateado)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: TEXT_MUTED }}>Custo real da camisaria (com rateio)</div>
            <div className="fx-mono" style={{ fontSize: 16, fontWeight: 700 }}>{carregandoConfig ? "…" : brl(custoTotalComRateio)}</div>
          </div>
        </div>
      </Card>

      <Card style={{ padding: 20 }} className="mb-6">
        <div className="fx-serif mb-1" style={{ fontSize: 15, fontWeight: 600 }}>
          Composição do custo próprio da camisaria
        </div>
        <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 16 }}>
          Só o que é específico da linha de camisaria: valor pago à Fabiana pelos pedidos do mês + aluguel/luz da loja
          + tecido dos pedidos (pelo valor/metro cadastrado em Compras) + aviamentos (botões, entretela, embalagem —
          cadastrados em Aviamentos, peça-base "Camisa"). Não inclui os custos compartilhados da empresa (acima).
        </div>
        <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
          <div>
            <div style={{ fontSize: 11, color: TEXT_MUTED }}>Mão de obra — pago à Fabiana {usarProjecaoFabiana ? "(projetado)" : "(real até agora)"}</div>
            <div className="fx-mono" style={{ fontSize: 16, fontWeight: 700, color: usarProjecaoFabiana ? BRASS : undefined }}>{brl(custoMaoDeObraEfetivo)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: TEXT_MUTED }}>Aluguel + luz da loja</div>
            <div className="fx-mono" style={{ fontSize: 16, fontWeight: 700 }}>{carregandoConfig ? "…" : brl(custoEstrutura)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: TEXT_MUTED }}>Produção — tecido do mês</div>
            <div className="fx-mono" style={{ fontSize: 16, fontWeight: 700 }}>{brl(custoProducaoTecido)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: TEXT_MUTED }}>Produção — aviamentos do mês</div>
            <div className="fx-mono" style={{ fontSize: 16, fontWeight: 700 }}>{brl(custoAviamentosMes)}</div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap p-3" style={{ background: "#F3EEDF", borderRadius: 8, marginBottom: pedidosSemValorTecido.length > 0 ? 12 : 0 }}>
          <label className="flex items-center gap-2" style={{ cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={usarProjecaoFabiana}
              onChange={(e) => setUsarProjecaoFabiana(e.target.checked)}
              style={{ width: 15, height: 15, accentColor: BRASS }}
            />
            <span style={{ fontSize: 12, fontWeight: 600 }}>Projetar mão de obra da Fabiana com base no mês passado</span>
          </label>
          <span style={{ fontSize: 11, color: TEXT_MUTED }}>
            Pago a ela até agora esse mês: <strong>{brl(custoMaoDeObra)}</strong> · Pago mês passado inteiro: <strong>{brl(custoMaoDeObraMesAnterior)}</strong>
            {" — "}como você paga ao longo do mês, cedo no mês o valor real ainda está incompleto; a projeção usa o total do mês anterior como estimativa até fechar o mês.
          </span>
        </div>
        {pedidosSemValorTecido.length > 0 && (
          <div style={{ fontSize: 11, color: "#9C4A1E", marginTop: 12 }}>
            Sem valor/metro cadastrado (custo de tecido fora da conta): {pedidosSemValorTecido.map((p) => p.cliente).join(", ")}{" "}
            — preencha em Compras.
          </div>
        )}
      </Card>

      <CalculadoraMarkup
        custoFixoMes={custoEstrutura + custoCompartilhadoRateado}
        qtdPadrao={quantidadeVendidaMes || 1}
        custoVariavelPadrao={quantidadeVendidaMes > 0 ? (custoMaoDeObraEfetivo + custoAviamentosMes) / quantidadeVendidaMes : 0}
        unidadeLabel="camisa"
      />

      <Card style={{ padding: 20 }}>
        <div className="fx-serif mb-1" style={{ fontSize: 15, fontWeight: 600 }}>
          Receita x custo — últimos {MESES_HISTORICO} meses
        </div>
        <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 20 }}>
          A receita de cada mês é real (vendas daquele mês). O custo usa o patamar estimado de <strong>hoje</strong>{" "}
          (mão de obra, estrutura e tecido da loja atuais — sem os custos compartilhados da empresa) como régua fixa
          — não é o custo exato que valia em cada mês, é uma referência pra ver quantos meses recentes cobririam o
          custo de agora. {mesesQueSePagaram} de {historicoMensal.length} meses se pagariam com esse patamar.
        </div>
        <BarraDuasSeries
          dados={historicoMensal}
          corA={COR_REFERENCIA}
          corB={COR_REAL}
          legendaA="Custo (patamar atual)"
          legendaB="Receita real"
          formatarValor={brlCompacto}
          tooltipDe={(d) => `${d.chave}: custo (atual) ${brl(d.a)} · receita real ${brl(d.b)}`}
        />
      </Card>
    </div>
  );
}
