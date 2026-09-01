import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { BarraDuasSeries, Card, PageTitle, StatCard } from "../components/ui";
import { CalculadoraMarkup } from "../components/CalculadoraMarkup";
import { BRASS, COR_REAL, COR_REFERENCIA, TEXT_MUTED } from "../lib/constants";
import { brl, hojeISO, metragemParaNumero } from "../lib/helpers";
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
export default function CustosCamisaria({ pedidos, receitaMesOutraLinha = 0 }) {
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

  // Mão de obra da Fabiana — não é salário fixo, é o que se paga por
  // pedido (inclui os de Doação, que ela também produz).
  const custoMaoDeObra = useMemo(
    () => pedidosDoMes.reduce((s, p) => s + (parseFloat(p.pagoFabiana?.valor) || 0), 0),
    [pedidosDoMes]
  );

  // Tecido dos pedidos de camisaria pedidos esse mês — mesmo padrão do
  // Ateliê: metragem × valor/metro cadastrado em Compras.
  const custoProducaoTecido = useMemo(
    () =>
      pedidosDoMes.reduce((soma, p) => {
        const doTecido = (p.tecidos || []).reduce((s, t) => {
          const metros = metragemParaNumero(t.metragem);
          const valorMetro = parseFloat(t.valorMetro);
          if (metros === null || !valorMetro) return s;
          return s + metros * valorMetro;
        }, 0);
        return soma + doTecido;
      }, 0),
    [pedidosDoMes]
  );

  const custoTotal = custoMaoDeObra + custoEstrutura + custoProducaoTecido;

  const receitaMes = useMemo(
    () => pedidosVendidosDoMes.reduce((s, p) => s + (parseFloat(p.aReceber?.valor) || 0), 0),
    [pedidosVendidosDoMes]
  );
  const quantidadeVendidaMes = useMemo(
    () => pedidosVendidosDoMes.reduce((s, p) => s + (parseInt(p.quantidade, 10) || 0), 0),
    [pedidosVendidosDoMes]
  );

  const resultado = receitaMes - custoTotal;
  const sePagando = resultado >= 0;

  const receitaTotalAmbasLinhas = receitaMes + receitaMesOutraLinha;
  const fatiaCamisaria = receitaTotalAmbasLinhas > 0 ? receitaMes / receitaTotalAmbasLinhas : 0.5;
  const custoCompartilhadoRateado = custoCompartilhado * fatiaCamisaria;
  const custoTotalComRateio = custoTotal + custoCompartilhadoRateado;

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
          Custos compartilhados da empresa — rateio por receita
        </div>
        <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 16 }}>
          Pró-labore, contador, sistemas, marketing, impostos e plano de saúde são da empresa como um todo — o ateliê
          também se beneficia deles, então <strong>não entram 100% no custo próprio da camisaria acima</strong>. A
          camisaria representa {(fatiaCamisaria * 100).toFixed(0)}% da receita do mês entre as duas linhas, então é
          essa fatia do custo compartilhado que cai sobre ela abaixo.
        </div>
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
          <div>
            <div style={{ fontSize: 11, color: TEXT_MUTED }}>Pró-labore</div>
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
          + tecido dos pedidos (pelo valor/metro cadastrado em Compras). Não inclui os custos compartilhados da
          empresa (acima).
        </div>
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
          <div>
            <div style={{ fontSize: 11, color: TEXT_MUTED }}>Mão de obra — pago à Fabiana</div>
            <div className="fx-mono" style={{ fontSize: 16, fontWeight: 700 }}>{brl(custoMaoDeObra)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: TEXT_MUTED }}>Aluguel + luz da loja</div>
            <div className="fx-mono" style={{ fontSize: 16, fontWeight: 700 }}>{carregandoConfig ? "…" : brl(custoEstrutura)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: TEXT_MUTED }}>Produção — tecido do mês</div>
            <div className="fx-mono" style={{ fontSize: 16, fontWeight: 700 }}>{brl(custoProducaoTecido)}</div>
          </div>
        </div>
        {custoProducaoTecido === 0 && (
          <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 12 }}>
            Nenhum tecido com valor/metro cadastrado nos pedidos desse mês ainda — preencha em Compras pra esse
            número aparecer aqui.
          </div>
        )}
      </Card>

      <CalculadoraMarkup
        custoFixoMes={custoEstrutura + custoCompartilhadoRateado}
        qtdPadrao={quantidadeVendidaMes || 1}
        custoVariavelPadrao={quantidadeVendidaMes > 0 ? custoMaoDeObra / quantidadeVendidaMes : 0}
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
