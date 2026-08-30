import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarClock, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { Card, Empty, PageTitle, StatCard } from "../components/ui";
import { BRASS, LINE, TEXT_MUTED } from "../lib/constants";
import { brl, hojeISO, metragemParaNumero } from "../lib/helpers";
import { supabase } from "../supabaseClient";

const CHAVE_ALUGUEL = "custo_aluguel_mensal";
const CHAVE_LUZ = "custo_luz_mensal";
const CHAVE_PROLABORE = "custo_prolabore_mensal";
// Semanas por mês na média (365,25/7/12) — usado pra estimar o custo
// mensal de quem recebe por diária (ex: freelancer 3x/semana).
const SEMANAS_POR_MES = 4.345;

function custoMensalDe(m) {
  if (m.tipoRemuneracao === "mensal") return parseFloat(m.valorRemuneracao) || 0;
  if (m.tipoRemuneracao === "diaria") return (parseFloat(m.valorRemuneracao) || 0) * (m.diasPorSemana || 0) * SEMANAS_POR_MES;
  return 0;
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

export default function CustosAtelie({ pecas, equipe }) {
  const [aluguel, setAluguel] = useState(0);
  const [luz, setLuz] = useState(0);
  const [prolabore, setProlabore] = useState(0);
  const [carregandoConfig, setCarregandoConfig] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("config").select("chave, valor").in("chave", [CHAVE_ALUGUEL, CHAVE_LUZ, CHAVE_PROLABORE]);
      (data || []).forEach((row) => {
        if (row.chave === CHAVE_ALUGUEL) setAluguel(parseFloat(row.valor) || 0);
        if (row.chave === CHAVE_LUZ) setLuz(parseFloat(row.valor) || 0);
        if (row.chave === CHAVE_PROLABORE) setProlabore(parseFloat(row.valor) || 0);
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
  const custoEstrutura = aluguel + luz;

  // Custo de produção (tecido) do mês — soma metragem × valor/metro de
  // cada item de tecido das peças de alfaiataria pedidas nesse mês,
  // reaproveitando o valor/metro cadastrado em Compras. Só entra quando
  // os dois campos estão preenchidos e a metragem dá pra entender.
  const custoProducaoTecido = useMemo(
    () =>
      (pecas || [])
        .filter((p) => p.dataPedido && p.dataPedido.slice(0, 7) === mesAtualStr)
        .reduce((soma, p) => {
          const doTecido = (p.tecidos || []).reduce((s, t) => {
            const metros = metragemParaNumero(t.metragem);
            const valorMetro = parseFloat(t.valorMetro);
            if (metros === null || !valorMetro) return s;
            return s + metros * valorMetro;
          }, 0);
          return soma + doTecido;
        }, 0),
    [pecas, mesAtualStr]
  );

  const custoTotal = custoEquipeTotal + custoEstrutura + prolabore + custoProducaoTecido;

  const receitaMes = useMemo(
    () =>
      pecas
        .filter((p) => p.status !== "Doação" && p.dataPedido && p.dataPedido.slice(0, 7) === mesAtualStr)
        .reduce((s, p) => s + (parseFloat(p.valorVenda) || 0), 0),
    [pecas, mesAtualStr]
  );

  const resultado = receitaMes - custoTotal;
  const sePagando = resultado >= 0;

  const semCadastro = equipeComCusto.filter((m) => !m.tipoRemuneracao);

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
        <StatCard label="Receita do mês (vendas)" value={brl(receitaMes)} icon={TrendingUp} />
        <StatCard label="Custo total estimado do mês" value={brl(custoTotal)} icon={TrendingDown} />
        <StatCard
          label="Resultado do mês"
          value={brl(resultado)}
          icon={Wallet}
          accent={sePagando ? "#2C6E31" : "#9C4A1E"}
        />
        <StatCard label="Ateliê se pagando?" value={sePagando ? "Sim" : "Não"} icon={sePagando ? TrendingUp : AlertTriangle} accent={sePagando ? "#2C6E31" : "#9C4A1E"} />
      </div>

      {semCadastro.length > 0 && (
        <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: -12, marginBottom: 20 }}>
          {semCadastro.map((m) => m.nome).join(", ")} {semCadastro.length > 1 ? "não têm" : "não tem"} forma de pagamento cadastrada na aba Equipe — não {semCadastro.length > 1 ? "entram" : "entra"} no custo total ainda.
        </div>
      )}

      <Card style={{ padding: 20 }} className="mb-6">
        <div className="fx-serif mb-1" style={{ fontSize: 15, fontWeight: 600 }}>
          Composição do custo mensal estimado
        </div>
        <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 16 }}>
          Mão de obra (equipe) + custo fixo da empresa (aluguel + luz) + custo fixo pessoal (seu pró-labore) + produção
          (tecido, pelo valor/metro cadastrado em Compras) — os três últimos configurados em Configurações.
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
            <div style={{ fontSize: 11, color: TEXT_MUTED }}>Custo fixo da empresa (aluguel + luz)</div>
            <div className="fx-mono" style={{ fontSize: 16, fontWeight: 700 }}>{carregandoConfig ? "…" : brl(custoEstrutura)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: TEXT_MUTED }}>Custo fixo pessoal (pró-labore)</div>
            <div className="fx-mono" style={{ fontSize: 16, fontWeight: 700 }}>{carregandoConfig ? "…" : brl(prolabore)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: TEXT_MUTED }}>Produção — tecido do mês</div>
            <div className="fx-mono" style={{ fontSize: 16, fontWeight: 700 }}>{brl(custoProducaoTecido)}</div>
          </div>
        </div>
        {custoProducaoTecido === 0 && (
          <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 4 }}>
            Nenhum tecido com valor/metro cadastrado nas peças pedidas esse mês ainda — preencha em Compras pra esse
            número aparecer aqui.
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
    </div>
  );
}
