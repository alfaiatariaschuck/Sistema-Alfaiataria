import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarClock, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { BarraDuasSeries, Card, Empty, PageTitle, StatCard } from "../components/ui";
import { CalculadoraMarkup } from "../components/CalculadoraMarkup";
import { BRASS, COR_REAL, COR_REFERENCIA, LINE, TEXT_MUTED } from "../lib/constants";
import { brl, custoAviamentoComposicao, custoTecidoDe, hojeISO, metragemParaNumero } from "../lib/helpers";
import { custoMensalDe } from "../lib/custoEquipe";
import { supabase } from "../supabaseClient";

const CHAVE_ALUGUEL = "custo_aluguel_mensal";
const CHAVE_LUZ = "custo_luz_mensal";
const CHAVE_PROLABORE = "custo_prolabore_mensal";
const CHAVE_CUSTOS_FIXOS_PJ = "custos_fixos_pj_mensal";
const CHAVE_PLANO_SAUDE_PJ = "custo_plano_saude_pj_mensal";
const MESES_HISTORICO = 6;

// Rótulo compacto pra caber no gráfico de barras (ex: R$4,5k) — o valor
// cheio continua no tooltip ao passar o mouse.
function brlCompacto(v) {
  const num = parseFloat(v) || 0;
  if (Math.abs(num) >= 1000) return `R$${(num / 1000).toFixed(1).replace(".", ",")}k`;
  return brl(num);
}

// Quantas sextas-feiras tem no mês/ano dados — importante porque quem
// paga a equipe toda sexta precisa saber quando o mês tem uma 5ª
// sexta extra, pra não confundir com uma semana a mais no salário
// mensal de quem já ganha fixo (só quem ganha por dia é que realmente
// trabalha e deve receber por ela).
function contarSextasNoMes(ano, mes) {
  const ultimoDia = new Date(ano, mes + 1, 0).getDate();
  let qtd = 0;
  for (let dia = 1; dia <= ultimoDia; dia++) {
    if (new Date(ano, mes, dia).getDay() === 5) qtd++;
  }
  return qtd;
}

export default function CustosAtelie({ pecas, equipe, custoAviamentosPorPecaBase = {}, receitaMesOutraLinha = 0 }) {
  const [aluguel, setAluguel] = useState(0);
  const [luz, setLuz] = useState(0);
  const [prolabore, setProlabore] = useState(0);
  const [custosFixosPJ, setCustosFixosPJ] = useState(0);
  const [planoSaudePJ, setPlanoSaudePJ] = useState(0);
  const [carregandoConfig, setCarregandoConfig] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("config")
        .select("chave, valor")
        .in("chave", [CHAVE_ALUGUEL, CHAVE_LUZ, CHAVE_PROLABORE, CHAVE_CUSTOS_FIXOS_PJ, CHAVE_PLANO_SAUDE_PJ]);
      (data || []).forEach((row) => {
        if (row.chave === CHAVE_ALUGUEL) setAluguel(parseFloat(row.valor) || 0);
        if (row.chave === CHAVE_LUZ) setLuz(parseFloat(row.valor) || 0);
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
  const sextasNoMes = contarSextasNoMes(anoAtual, mesAtual);

  const equipeAtiva = useMemo(() => (equipe || []).filter((m) => m.ativo), [equipe]);

  const equipeComCusto = useMemo(
    () => equipeAtiva.map((m) => ({ ...m, custoMensal: custoMensalDe(m) })),
    [equipeAtiva]
  );

  const custoMensalistas = useMemo(
    () => equipeComCusto.filter((m) => m.tipoRemuneracao === "mensal").reduce((s, m) => s + m.custoMensal, 0),
    [equipeComCusto]
  );
  const custoDiaristas = useMemo(
    () => equipeComCusto.filter((m) => m.tipoRemuneracao === "diaria").reduce((s, m) => s + m.custoMensal, 0),
    [equipeComCusto]
  );
  const custoEquipeTotal = custoMensalistas + custoDiaristas;
  // Estrutura do PRÓPRIO ateliê — aluguel e luz já são os campos
  // específicos de produção (não os da loja/camisaria).
  const custoEstrutura = aluguel + luz;
  // Custos da EMPRESA como um todo, não só do ateliê — pró-labore,
  // contador, sistemas, marketing, impostos, plano de saúde. Camisaria
  // também se beneficia deles, então não é justo jogar 100% no ateliê.
  const custoCompartilhado = prolabore + custosFixosPJ + planoSaudePJ;

  // Custo de produção (tecido) do mês — soma metragem × valor/metro de
  // cada item de tecido das peças de alfaiataria pedidas nesse mês,
  // reaproveitando o valor/metro cadastrado em Compras. Só entra quando
  // os dois campos estão preenchidos e a metragem dá pra entender.
  const custoProducaoTecido = useMemo(
    () =>
      (pecas || [])
        .filter((p) => p.dataPedido && p.dataPedido.slice(0, 7) === mesAtualStr)
        .reduce((soma, p) => soma + custoTecidoDe(p.tecidos), 0),
    [pecas, mesAtualStr]
  );

  // Custo de aviamentos do mês — soma as peças-base que compõem cada
  // tipo de peça vendido (ex: Traje = Paletó+Calça+Colete), pelo
  // mapeamento em COMPOSICAO_AVIAMENTOS. "Outro" não tem composição
  // conhecida e fica de fora.
  const custoAviamentos = useMemo(
    () =>
      (pecas || [])
        .filter((p) => p.dataPedido && p.dataPedido.slice(0, 7) === mesAtualStr)
        .reduce((soma, p) => soma + custoAviamentoComposicao(p.tipoPeca, custoAviamentosPorPecaBase), 0),
    [pecas, mesAtualStr, custoAviamentosPorPecaBase]
  );

  // Custo do ATELIÊ especificamente — só o que é dessa linha (mão de
  // obra, aluguel/luz do ateliê, tecido e aviamentos das peças de
  // alfaiataria). Pró-labore e custos fixos PJ NÃO entram aqui — são da
  // empresa toda, camisaria também se beneficia deles.
  const custoTotal = custoEquipeTotal + custoEstrutura + custoProducaoTecido + custoAviamentos;

  const pecasDoMes = useMemo(
    () => (pecas || []).filter((p) => p.status !== "Doação" && p.dataPedido && p.dataPedido.slice(0, 7) === mesAtualStr),
    [pecas, mesAtualStr]
  );

  // Peças com tecido lançado mas sem valor/metro cadastrado — o custo
  // delas fica de fora da conta sem avisar, então lista quem é.
  const pecasSemValorTecido = useMemo(
    () =>
      pecasDoMes.filter((p) =>
        (p.tecidos || []).some((t) => metragemParaNumero(t.metragem) !== null && !parseFloat(t.valorMetro))
      ),
    [pecasDoMes]
  );
  // Peças de tipo composto (Traje, Costume...) sem mapeamento de
  // aviamentos conhecido — hoje só "Outro" cai nesse caso.
  const pecasSemAviamento = useMemo(
    () => pecasDoMes.filter((p) => !COMPOSICAO_AVIAMENTOS[p.tipoPeca]),
    [pecasDoMes]
  );

  const receitaMes = useMemo(() => pecasDoMes.reduce((s, p) => s + (parseFloat(p.valorVenda) || 0), 0), [pecasDoMes]);

  const resultado = receitaMes - custoTotal;
  const sePagando = resultado >= 0;

  // Rateio do custo compartilhado entre as duas linhas, proporcional à
  // receita de cada uma no mês — assim nenhuma das duas carrega 100% de
  // um custo que beneficia as duas. Sem receita nenhuma das duas, divide
  // meio a meio pra não zerar a fatia.
  // Pró-labore é retirada pessoal do dono — não faz sentido ratear por
  // receita (ele não "produz" mais só porque uma linha vendeu mais).
  // Divide meio a meio entre as duas operações. O resto (contador,
  // sistemas, plano de saúde etc.) segue o rateio por receita.
  const receitaTotalAmbasLinhas = receitaMes + receitaMesOutraLinha;
  const fatiaAtelie = receitaTotalAmbasLinhas > 0 ? receitaMes / receitaTotalAmbasLinhas : 0.5;
  const prolaboreMetade = prolabore * 0.5;
  const custoCompartilhadoRateavel = custosFixosPJ + planoSaudePJ;
  const custoCompartilhadoRateado = prolaboreMetade + custoCompartilhadoRateavel * fatiaAtelie;
  const custoTotalComRateio = custoTotal + custoCompartilhadoRateado;

  const semCadastro = equipeComCusto.filter((m) => !m.tipoRemuneracao);

  // Últimos meses: receita real de cada mês (vendas) comparada ao custo
  // mensal estimado de HOJE (equipe/estrutura/pró-labore/tecido atuais) —
  // não é o custo que valia naquele mês exato, é uma régua fixa pra ver
  // quantos meses recentes teriam coberto o patamar de custo de agora.
  const historicoMensal = useMemo(() => {
    const meses = [];
    for (let i = MESES_HISTORICO - 1; i >= 0; i--) {
      const d = new Date(anoAtual, mesAtual - i, 1);
      const chaveMes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).replace(".", "");
      meses.push({ chaveMes, label });
    }
    return meses.map(({ chaveMes, label }) => {
      const receita = (pecas || [])
        .filter((p) => p.status !== "Doação" && p.dataPedido && p.dataPedido.slice(0, 7) === chaveMes)
        .reduce((s, p) => s + (parseFloat(p.valorVenda) || 0), 0);
      return { chave: label, a: Math.round(custoTotal), b: Math.round(receita) };
    });
  }, [pecas, anoAtual, mesAtual, custoTotal]);

  const mesesQueSePagaram = historicoMensal.filter((m) => m.b >= m.a).length;

  return (
    <div>
      <PageTitle eyebrow="Alfaiataria — financeiro" title="Custos do Ateliê" />

      {sextasNoMes === 5 && (
        <div
          className="flex items-center gap-2 mb-4"
          style={{ background: "#FCEFC7", border: "1px solid #E6C97A", borderRadius: 8, padding: "12px 14px" }}
        >
          <CalendarClock size={18} color="#8A6A0C" style={{ flexShrink: 0 }} />
          <div style={{ fontSize: 13, color: "#5A4200" }}>
            <strong>Este mês tem 5 sextas-feiras</strong> (em vez das 4 de costume). Se você paga a equipe toda sexta:
            quem ganha <strong>mensal</strong> (salário fixo) já tem o mês inteiro coberto no valor combinado — não
            precisa de uma 5ª parcela. Quem ganha <strong>diária</strong> trabalhou essa 5ª sexta de verdade, então
            deve receber por ela normalmente.
          </div>
        </div>
      )}

      <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <StatCard label="Receita do mês (vendas alfaiataria)" value={brl(receitaMes)} icon={TrendingUp} />
        <StatCard label="Custo próprio do ateliê" value={brl(custoTotal)} icon={TrendingDown} />
        <StatCard
          label="Resultado do ateliê"
          value={brl(resultado)}
          icon={Wallet}
          accent={sePagando ? "#2C6E31" : "#9C4A1E"}
        />
        <StatCard label="Ateliê cobre seus custos próprios?" value={sePagando ? "Sim" : "Não"} icon={sePagando ? TrendingUp : AlertTriangle} accent={sePagando ? "#2C6E31" : "#9C4A1E"} />
      </div>

      <Card style={{ padding: 20 }} className="mb-6">
        <div className="fx-serif mb-1" style={{ fontSize: 15, fontWeight: 600 }}>
          Custos compartilhados da empresa — pró-labore meio a meio, resto por receita
        </div>
        <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 16 }}>
          Pró-labore, contador, sistemas, marketing, impostos e plano de saúde são da empresa como um todo — a
          camisaria também se beneficia deles, então <strong>não entram 100% no custo próprio do ateliê acima</strong>.
          O pró-labore é dividido <strong>50/50</strong> entre as duas linhas (é retirada pessoal sua, não tem a ver
          com quem vendeu mais). Os outros custos compartilhados são rateados pela receita do mês — o ateliê
          representa {(fatiaAtelie * 100).toFixed(0)}% dela entre as duas linhas.
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
            <div style={{ fontSize: 11, color: TEXT_MUTED }}>Fatia do ateliê ({(fatiaAtelie * 100).toFixed(0)}%)</div>
            <div className="fx-mono" style={{ fontSize: 16, fontWeight: 700, color: BRASS }}>{carregandoConfig ? "…" : brl(custoCompartilhadoRateado)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: TEXT_MUTED }}>Custo real do ateliê (com rateio)</div>
            <div className="fx-mono" style={{ fontSize: 16, fontWeight: 700 }}>{carregandoConfig ? "…" : brl(custoTotalComRateio)}</div>
          </div>
        </div>
      </Card>

      {semCadastro.length > 0 && (
        <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: -12, marginBottom: 20 }}>
          {semCadastro.map((m) => m.nome).join(", ")} {semCadastro.length > 1 ? "não têm" : "não tem"} forma de pagamento cadastrada na aba Equipe — não {semCadastro.length > 1 ? "entram" : "entra"} no custo total ainda.
        </div>
      )}

      <Card style={{ padding: 20 }} className="mb-6">
        <div className="fx-serif mb-1" style={{ fontSize: 15, fontWeight: 600 }}>
          Composição do custo próprio do ateliê
        </div>
        <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 16 }}>
          Só o que é específico da linha de alfaiataria: mão de obra (equipe) + aluguel/luz do ateliê + tecido e
          aviamentos das peças pedidas esse mês. Não inclui os custos compartilhados da empresa (acima).
        </div>
        <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
          <div>
            <div style={{ fontSize: 11, color: TEXT_MUTED }}>Mão de obra — mensalistas</div>
            <div className="fx-mono" style={{ fontSize: 16, fontWeight: 700 }}>{brl(custoMensalistas)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: TEXT_MUTED }}>Mão de obra — diaristas/freelancers</div>
            <div className="fx-mono" style={{ fontSize: 16, fontWeight: 700 }}>{brl(custoDiaristas)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: TEXT_MUTED }}>Aluguel + luz do ateliê</div>
            <div className="fx-mono" style={{ fontSize: 16, fontWeight: 700 }}>{carregandoConfig ? "…" : brl(custoEstrutura)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: TEXT_MUTED }}>Produção — tecido do mês</div>
            <div className="fx-mono" style={{ fontSize: 16, fontWeight: 700 }}>{brl(custoProducaoTecido)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: TEXT_MUTED }}>Produção — aviamentos do mês</div>
            <div className="fx-mono" style={{ fontSize: 16, fontWeight: 700 }}>{brl(custoAviamentos)}</div>
          </div>
        </div>
        {pecasSemValorTecido.length > 0 && (
          <div style={{ fontSize: 11, color: "#9C4A1E", marginBottom: 4 }}>
            Sem valor/metro cadastrado (custo de tecido fora da conta): {pecasSemValorTecido.map((p) => p.cliente).join(", ")}{" "}
            — preencha em Compras.
          </div>
        )}
        {pecasSemAviamento.length > 0 && (
          <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 4 }}>
            Sem composição de aviamento conhecida (tipo "Outro"): {pecasSemAviamento.map((p) => p.cliente).join(", ")}.
          </div>
        )}

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${LINE}` }}>
                {["Nome", "Pagamento", "Valor base", "Custo estimado/mês"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "6px 10px", fontWeight: 600, fontSize: 11, color: TEXT_MUTED, textTransform: "uppercase" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {equipeComCusto.map((m) => (
                <tr key={m.id} style={{ borderBottom: `1px solid ${LINE}` }}>
                  <td style={{ padding: "6px 10px", fontWeight: 600 }}>{m.nome}</td>
                  <td style={{ padding: "6px 10px", color: TEXT_MUTED }}>
                    {m.tipoRemuneracao === "mensal" ? "Mensal" : m.tipoRemuneracao === "diaria" ? `Diária (${m.diasPorSemana}x/semana)` : "—"}
                  </td>
                  <td className="fx-mono" style={{ padding: "6px 10px", color: TEXT_MUTED }}>
                    {m.valorRemuneracao ? (m.tipoRemuneracao === "diaria" ? `${brl(m.valorRemuneracao)}/dia` : brl(m.valorRemuneracao)) : "—"}
                  </td>
                  <td className="fx-mono" style={{ padding: "6px 10px", color: BRASS, fontWeight: 700 }}>{brl(m.custoMensal)}</td>
                </tr>
              ))}
              {equipeComCusto.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: 16 }}>
                    <Empty texto="Nenhum membro ativo na equipe ainda." />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <CalculadoraMarkup
        custoFixoMes={custoEquipeTotal + custoEstrutura + custoCompartilhadoRateado}
        qtdPadrao={pecasDoMes.length || 1}
        custoVariavelPadrao={pecasDoMes.length > 0 ? (custoProducaoTecido + custoAviamentos) / pecasDoMes.length : 0}
        unidadeLabel="peça"
      />

      <Card style={{ padding: 20 }}>
        <div className="fx-serif mb-1" style={{ fontSize: 15, fontWeight: 600 }}>
          Receita x custo — últimos {MESES_HISTORICO} meses
        </div>
        <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 20 }}>
          A receita de cada mês é real (vendas daquele mês). O custo usa o patamar estimado de <strong>hoje</strong>{" "}
          (equipe, estrutura, tecido e aviamentos do ateliê — sem os custos compartilhados da empresa) como régua fixa — não é o custo exato que valia em cada mês,
          é uma referência pra ver quantos meses recentes cobririam o custo de agora.{" "}
          {mesesQueSePagaram} de {historicoMensal.length} meses se pagariam com esse patamar.
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
