import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Info, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { BarraDuasSeries, Card, PageTitle, StatCard } from "../components/ui";
import { BRASS, COR_REAL, COR_REFERENCIA, TEXT_MUTED } from "../lib/constants";
import { brl, custoAviamentoComposicao, custoTecidoDe, hojeISO } from "../lib/helpers";
import { supabase } from "../supabaseClient";

const CHAVE_ALUGUEL = "custo_aluguel_mensal";
const CHAVE_LUZ = "custo_luz_mensal";
const CHAVE_ALUGUEL_LOJA = "custo_aluguel_loja_mensal";
const CHAVE_LUZ_LOJA = "custo_luz_loja_mensal";
const CHAVE_PROLABORE = "custo_prolabore_mensal";
const CHAVE_CUSTOS_FIXOS_PJ = "custos_fixos_pj_mensal";
const CHAVE_PLANO_SAUDE_PJ = "custo_plano_saude_pj_mensal";
const MESES_HISTORICO = 6;
// Categorias que a Configuração já lança como despesa quando aperta
// "Lançar custos fixos deste mês" — servem só pra mostrar o status de
// pagamento (caixa) desses custos, não pra somar de novo no resultado
// (o valor deles já entra pelo número configurado acima).
const CATEGORIAS_CUSTO_FIXO = ["Pró-labore", "Aluguel", "Água/Luz/Internet", "Plano de Saúde"];

function brlCompacto(v) {
  const num = parseFloat(v) || 0;
  if (Math.abs(num) >= 1000) return `R$${(num / 1000).toFixed(1).replace(".", ",")}k`;
  return brl(num);
}

// Resultado do mês consolidado (Camisaria + Alfaiataria juntas) — a
// "linha de baixo" do financeiro: quanto entrou, quanto saiu de custo de
// produção e estrutura, e o que sobrou. Usa a MESMA base de custo de
// produção que Custos do Ateliê/Camisaria (tecido pelo valor/metro de
// Compras, aviamentos, mão de obra) — não soma as despesas de
// fornecedor de novo em cima disso, senão duplicaria o mesmo gasto.
export default function ResultadoMensal({ pedidos, pecas, despesas, equipe, custoAviamentosPorPecaBase = {} }) {
  const [aluguel, setAluguel] = useState(0);
  const [luz, setLuz] = useState(0);
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
        .in("chave", [CHAVE_ALUGUEL, CHAVE_LUZ, CHAVE_ALUGUEL_LOJA, CHAVE_LUZ_LOJA, CHAVE_PROLABORE, CHAVE_CUSTOS_FIXOS_PJ, CHAVE_PLANO_SAUDE_PJ]);
      (data || []).forEach((row) => {
        if (row.chave === CHAVE_ALUGUEL) setAluguel(parseFloat(row.valor) || 0);
        if (row.chave === CHAVE_LUZ) setLuz(parseFloat(row.valor) || 0);
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

  const equipeAtiva = useMemo(() => (equipe || []).filter((m) => m.ativo), [equipe]);
  const custoEquipeAtelie = useMemo(
    () =>
      equipeAtiva.reduce((s, m) => {
        if (m.tipoRemuneracao === "mensal") return s + (parseFloat(m.valorRemuneracao) || 0);
        if (m.tipoRemuneracao === "diaria") return s + (parseFloat(m.valorRemuneracao) || 0) * (m.diasPorSemana || 0) * 4.345;
        return s;
      }, 0),
    [equipeAtiva]
  );

  const pedidosDoMes = useMemo(
    () => (pedidos || []).filter((p) => p.status !== "Doação" && p.dataPedido && p.dataPedido.slice(0, 7) === mesAtualStr),
    [pedidos, mesAtualStr]
  );
  const pecasDoMes = useMemo(
    () => (pecas || []).filter((p) => p.status !== "Doação" && p.dataPedido && p.dataPedido.slice(0, 7) === mesAtualStr),
    [pecas, mesAtualStr]
  );

  const receitaCamisaria = useMemo(() => pedidosDoMes.reduce((s, p) => s + (parseFloat(p.aReceber?.valor) || 0), 0), [pedidosDoMes]);
  const receitaAlfaiataria = useMemo(() => pecasDoMes.reduce((s, p) => s + (parseFloat(p.valorVenda) || 0), 0), [pecasDoMes]);
  const faturamento = receitaCamisaria + receitaAlfaiataria;

  const custoMaoDeObraFabiana = useMemo(() => pedidosDoMes.reduce((s, p) => s + (parseFloat(p.pagoFabiana?.valor) || 0), 0), [pedidosDoMes]);

  function custoTecidoTotalDe(lista) {
    return lista.reduce((soma, item) => soma + custoTecidoDe(item.tecidos), 0);
  }
  const custoTecidoCamisaria = useMemo(() => custoTecidoTotalDe(pedidosDoMes), [pedidosDoMes]);
  const custoTecidoAlfaiataria = useMemo(() => custoTecidoTotalDe(pecasDoMes), [pecasDoMes]);

  const custoAviamentosAlfaiataria = useMemo(
    () => pecasDoMes.reduce((soma, p) => soma + custoAviamentoComposicao(p.tipoPeca, custoAviamentosPorPecaBase), 0),
    [pecasDoMes, custoAviamentosPorPecaBase]
  );
  // Aviamento da camisa (botões, entretela, embalagem) — peça-base
  // "Camisa" em Aviamentos, custo fixo por unidade × quantidade vendida.
  const quantidadeVendidaCamisaria = useMemo(() => pedidosDoMes.reduce((s, p) => s + (parseInt(p.quantidade, 10) || 0), 0), [pedidosDoMes]);
  const custoAviamentosCamisaria = (custoAviamentosPorPecaBase["Camisa"] || 0) * quantidadeVendidaCamisaria;
  const custoAviamentos = custoAviamentosAlfaiataria + custoAviamentosCamisaria;

  const custoProducao = custoMaoDeObraFabiana + custoEquipeAtelie + custoTecidoCamisaria + custoTecidoAlfaiataria + custoAviamentos;
  const custoEstrutura = aluguel + luz + aluguelLoja + luzLoja;
  const custoCompartilhado = prolabore + custosFixosPJ + planoSaudePJ;
  const custoTotal = custoProducao + custoEstrutura + custoCompartilhado;
  const resultado = faturamento - custoTotal;
  const sePagando = resultado >= 0;
  const margemPercentual = faturamento > 0 ? (resultado / faturamento) * 100 : 0;

  // Situação de caixa: dos custos fixos (Pró-labore/Aluguel/Luz/Plano de
  // Saúde) que a Configuração já lança como despesa todo mês, quanto já
  // foi efetivamente pago esse mês x quanto ainda está pendente. É só
  // status de pagamento — não é somado no resultado acima de novo.
  const despesasCustoFixoMes = useMemo(
    () => (despesas || []).filter((d) => d.vencimento && d.vencimento.slice(0, 7) === mesAtualStr && CATEGORIAS_CUSTO_FIXO.includes(d.categoria)),
    [despesas, mesAtualStr]
  );
  const totalCustoFixoLancado = despesasCustoFixoMes.reduce((s, d) => s + (parseFloat(d.valor) || 0) + (parseFloat(d.frete) || 0), 0);
  const totalCustoFixoPago = despesasCustoFixoMes.reduce((s, d) => s + (parseFloat(d.valorPago) || 0), 0);
  const totalCustoFixoPendente = Math.max(0, totalCustoFixoLancado - totalCustoFixoPago);

  const historicoMensal = useMemo(() => {
    const meses = [];
    for (let i = MESES_HISTORICO - 1; i >= 0; i--) {
      const d = new Date(anoAtual, mesAtual - i, 1);
      const chaveMes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).replace(".", "");
      meses.push({ chaveMes, label });
    }
    return meses.map(({ chaveMes, label }) => {
      const receita =
        (pedidos || [])
          .filter((p) => p.status !== "Doação" && p.dataPedido && p.dataPedido.slice(0, 7) === chaveMes)
          .reduce((s, p) => s + (parseFloat(p.aReceber?.valor) || 0), 0) +
        (pecas || [])
          .filter((p) => p.status !== "Doação" && p.dataPedido && p.dataPedido.slice(0, 7) === chaveMes)
          .reduce((s, p) => s + (parseFloat(p.valorVenda) || 0), 0);
      return { chave: label, a: Math.round(custoTotal), b: Math.round(receita) };
    });
  }, [pedidos, pecas, anoAtual, mesAtual, custoTotal]);

  const mesesQueSePagaram = historicoMensal.filter((m) => m.b >= m.a).length;

  return (
    <div>
      <PageTitle eyebrow="Camisaria + Alfaiataria, junto" title="Resultado do Mês" />

      <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <StatCard label="Faturamento do mês" value={brl(faturamento)} icon={TrendingUp} />
        <StatCard label="Custo total do mês" value={brl(custoTotal)} icon={TrendingDown} />
        <StatCard
          label="Lucro/prejuízo do mês"
          value={brl(resultado)}
          icon={Wallet}
          accent={sePagando ? "#2C6E31" : "#9C4A1E"}
        />
        <StatCard
          label="Margem do mês"
          value={`${margemPercentual.toFixed(1)}%`}
          icon={sePagando ? TrendingUp : AlertTriangle}
          accent={sePagando ? "#2C6E31" : "#9C4A1E"}
        />
      </div>

      <div
        className="flex items-start gap-2 mb-6 p-3"
        style={{ background: "#F3EEDF", borderRadius: 8, fontSize: 12, color: TEXT_MUTED }}
      >
        <Info size={16} style={{ flexShrink: 0, marginTop: 1 }} />
        <div>
          Este número usa o <strong>custo de produção</strong> (tecido pelo valor/metro cadastrado em Compras,
          aviamentos, mão de obra e estrutura) — a mesma base do Custos do Ateliê e Custos da Camisaria, agora somadas.
          Ele <strong>não soma as despesas de fornecedor lançadas em Contas a Pagar de novo</strong> em cima disso, para não
          contar o mesmo gasto de tecido duas vezes. Abaixo, a seção de caixa mostra só se os custos fixos já foram
          pagos — não altera esse resultado.
        </div>
      </div>

      <Card style={{ padding: 20 }} className="mb-6">
        <div className="fx-serif mb-1" style={{ fontSize: 15, fontWeight: 600 }}>
          Composição do custo do mês
        </div>
        <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 16 }}>
          Produção (mão de obra + tecido + aviamentos das duas linhas) + estrutura (aluguel/luz do ateliê e da loja) +
          custos compartilhados da empresa (pró-labore, PJ, plano de saúde).
        </div>
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
          <div>
            <div style={{ fontSize: 11, color: TEXT_MUTED }}>Mão de obra (equipe + Fabiana)</div>
            <div className="fx-mono" style={{ fontSize: 16, fontWeight: 700 }}>{brl(custoEquipeAtelie + custoMaoDeObraFabiana)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: TEXT_MUTED }}>Tecido (camisaria + alfaiataria)</div>
            <div className="fx-mono" style={{ fontSize: 16, fontWeight: 700 }}>{brl(custoTecidoCamisaria + custoTecidoAlfaiataria)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: TEXT_MUTED }}>Aviamentos</div>
            <div className="fx-mono" style={{ fontSize: 16, fontWeight: 700 }}>{brl(custoAviamentos)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: TEXT_MUTED }}>Aluguel + luz (ateliê e loja)</div>
            <div className="fx-mono" style={{ fontSize: 16, fontWeight: 700 }}>{carregandoConfig ? "…" : brl(custoEstrutura)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: TEXT_MUTED }}>Pró-labore</div>
            <div className="fx-mono" style={{ fontSize: 16, fontWeight: 700 }}>{carregandoConfig ? "…" : brl(prolabore)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: TEXT_MUTED }}>Outros PJ + plano de saúde</div>
            <div className="fx-mono" style={{ fontSize: 16, fontWeight: 700 }}>{carregandoConfig ? "…" : brl(custosFixosPJ + planoSaudePJ)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: TEXT_MUTED }}>Custo total do mês</div>
            <div className="fx-mono" style={{ fontSize: 16, fontWeight: 700, color: BRASS }}>{carregandoConfig ? "…" : brl(custoTotal)}</div>
          </div>
        </div>
      </Card>

      <Card style={{ padding: 20 }} className="mb-6">
        <div className="fx-serif mb-1" style={{ fontSize: 15, fontWeight: 600 }}>
          Situação de caixa dos custos fixos deste mês
        </div>
        <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 16 }}>
          Do total de pró-labore, aluguel, luz e plano de saúde lançados em Contas a Pagar esse mês, quanto já foi
          pago e quanto ainda está pendente. É informativo — o resultado acima já conta o valor cheio independente
          de já ter sido pago ou não.
        </div>
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
          <div>
            <div style={{ fontSize: 11, color: TEXT_MUTED }}>Lançado esse mês</div>
            <div className="fx-mono" style={{ fontSize: 16, fontWeight: 700 }}>{brl(totalCustoFixoLancado)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: TEXT_MUTED }}>Já pago</div>
            <div className="fx-mono" style={{ fontSize: 16, fontWeight: 700, color: "#2C6E31" }}>{brl(totalCustoFixoPago)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: TEXT_MUTED }}>Ainda pendente</div>
            <div className="fx-mono" style={{ fontSize: 16, fontWeight: 700, color: totalCustoFixoPendente > 0 ? "#9C4A1E" : "#2C6E31" }}>
              {brl(totalCustoFixoPendente)}
            </div>
          </div>
        </div>
        {despesasCustoFixoMes.length === 0 && (
          <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 12 }}>
            Nenhum custo fixo lançado em Contas a Pagar esse mês ainda — use o botão em Configurações.
          </div>
        )}
      </Card>

      <Card style={{ padding: 20 }}>
        <div className="fx-serif mb-1" style={{ fontSize: 15, fontWeight: 600 }}>
          Faturamento x custo — últimos {MESES_HISTORICO} meses
        </div>
        <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 20 }}>
          O faturamento de cada mês é real (vendas daquele mês, as duas linhas juntas). O custo usa o patamar
          estimado de <strong>hoje</strong> como régua fixa — não é o custo exato que valia em cada mês, é uma
          referência pra ver quantos meses recentes cobririam o custo de agora. {mesesQueSePagaram} de{" "}
          {historicoMensal.length} meses teriam se pagado com esse patamar.
        </div>
        <BarraDuasSeries
          dados={historicoMensal}
          corA={COR_REFERENCIA}
          corB={COR_REAL}
          legendaA="Custo (patamar atual)"
          legendaB="Faturamento real"
          formatarValor={brlCompacto}
          tooltipDe={(d) => `${d.chave}: custo (atual) ${brl(d.a)} · faturamento real ${brl(d.b)}`}
        />
      </Card>
    </div>
  );
}
