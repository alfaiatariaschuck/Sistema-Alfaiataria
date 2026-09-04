import React, { useMemo, useState } from "react";
import { AlertTriangle, CalendarDays, CheckCircle2, Clock, Eye, Flame, PackageCheck, Scissors, Target, Timer, UserCheck } from "lucide-react";
import { Card, StatCard } from "./ui";
import { BRASS, TEXT_MUTED } from "../lib/constants";
import { fmtData, hojeISO, previsaoEfetivaDe, previsaoEstimada } from "../lib/helpers";
import { usePontosMelhoriaProducao } from "../hooks/usePontosMelhoriaProducao";

const VERMELHO = "#9C4A1E";
const AMARELO = "#8A6A0C";
const ETAPAS_PROVA = ["Prova na Tela", "Prova na Caixa", "Prova Final"];

// Uma linha de "ponto de melhoria" — mostra a referência vs o real
// medido, e deixa quem estiver usando o painel (Tales ou Ícaro) marcar
// quando aquele gargalo foi resolvido, com uma nota opcional de como.
function PontoMelhoriaLinha({ ponto, onBater, onDesfazer }) {
  const [nota, setNota] = useState(ponto.notaIcaro || "");

  return (
    <div className="py-3" style={{ borderTop: "1px solid #E5E0D3" }}>
      <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
        <span style={{ fontSize: 13, fontWeight: 700 }}>{ponto.titulo}</span>
        <span className="fx-mono" style={{ fontSize: 12, color: TEXT_MUTED }}>
          referência <strong>{ponto.horasReferencia}h</strong> · real <strong style={{ color: VERMELHO }}>{ponto.horasRealAnterior}h</strong>
        </span>
      </div>
      {ponto.descricao && (
        <div style={{ fontSize: 12, color: TEXT_MUTED, marginBottom: 8 }}>{ponto.descricao}</div>
      )}
      {ponto.bateuMeta ? (
        <div className="flex items-center gap-1.5" style={{ fontSize: 12, color: "#2C6E31", fontWeight: 600 }}>
          <CheckCircle2 size={14} /> Batido em {fmtData(ponto.dataBateu)}
          {ponto.notaIcaro && <span style={{ color: TEXT_MUTED, fontWeight: 400 }}> — {ponto.notaIcaro}</span>}
          <button onClick={() => onDesfazer(ponto.id)} style={{ color: TEXT_MUTED, fontSize: 11, textDecoration: "underline", marginLeft: 4 }}>
            desfazer
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 flex-wrap">
          <input
            placeholder="Como resolveu? (opcional)"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            style={{ border: "1px solid #E5E0D3", borderRadius: 6, padding: "6px 10px", fontSize: 12, flex: "1 1 200px", background: "#FBF9F3" }}
          />
          <button
            onClick={() => onBater(ponto.id, nota)}
            style={{ background: "#EDEAE0", color: BRASS, padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}
          >
            Bati essa meta
          </button>
        </div>
      )}
    </div>
  );
}

// Indicadores da fila de produção (StatCards + composição do portfólio +
// projeção de prazos) — extraído de Controle de Produção pra ser
// reaproveitado também no painel enxuto do Ícaro (ShellProducao), sem
// duplicar a lógica dos cálculos.
export default function PainelProducaoResumo({ pecas, equipe, mediaDiasProducao, mediaDiasPorTipo, previsoesFila }) {
  const { pontos, marcarComoBatido, desfazerBatido } = usePontosMelhoriaProducao();
  const abertas = useMemo(() => pecas.filter((p) => p.status !== "Entregue"), [pecas]);
  const hoje = hojeISO();
  const mesAtual = hoje.slice(0, 7);

  const emProducao = abertas.filter((p) => p.situacao === "Em Produção").length;
  const aguardando = abertas.filter((p) => p.situacao === "Aguardando").length;
  const pausados = abertas.filter((p) => p.situacao === "Pausado").length;
  const urgentes = abertas.filter((p) => p.prioridade === "Alta").length;
  const emProva = abertas.filter((p) => ETAPAS_PROVA.includes(p.status)).length;
  const entreguesMes = pecas.filter((p) => p.status === "Entregue" && p.dataEntrega && p.dataEntrega.slice(0, 7) === mesAtual).length;
  // Carinha ao lado de "Entregues (mês)" — motivacional, sem valor
  // nenhum: triste até 3, boa a partir de 4, festa a partir de 8.
  const carinhaEntregues = entreguesMes >= 8 ? "🥳" : entreguesMes >= 4 ? "😊" : "😢";
  const profissionaisAtuando = (equipe || []).filter((m) => m.ativo && m.trabalhandoHoje).length;

  // Previsão "efetiva" de cada peça aberta: a manual, se existir, senão a
  // estimada (início+média ou fila+média) — usada tanto na projeção de
  // prazos quanto pra achar a próxima entrega.
  const comPrevisaoEfetiva = useMemo(
    () =>
      abertas.map((p) => {
        const estimativa = p.dataInicioProducao ? previsaoEstimada(p, mediaDiasPorTipo?.(p.tipoPeca)) : previsoesFila?.get(p.id) || null;
        return { ...p, previsaoEfetiva: previsaoEfetivaDe(p, estimativa) };
      }),
    [abertas, mediaDiasPorTipo, previsoesFila]
  );

  const projecaoPrazos = useMemo(() => {
    const emUmaSemana = new Date(hoje + "T00:00:00");
    emUmaSemana.setDate(emUmaSemana.getDate() + 7);
    const limiteRisco = emUmaSemana.toISOString().slice(0, 10);

    let atrasadas = 0;
    let emRisco = 0;
    let noPrazo = 0;
    let semPrevisao = 0;
    comPrevisaoEfetiva.forEach((p) => {
      if (!p.previsaoEfetiva) semPrevisao++;
      else if (p.previsaoEfetiva < hoje) atrasadas++;
      else if (p.previsaoEfetiva <= limiteRisco) emRisco++;
      else noPrazo++;
    });
    return { atrasadas, emRisco, noPrazo, semPrevisao };
  }, [comPrevisaoEfetiva, hoje]);

  const proximaEntrega = useMemo(() => {
    const comData = comPrevisaoEfetiva.filter((p) => p.previsaoEfetiva).sort((a, b) => a.previsaoEfetiva.localeCompare(b.previsaoEfetiva));
    return comData[0] || null;
  }, [comPrevisaoEfetiva]);

  const composicao = useMemo(() => {
    const mapa = new Map();
    abertas.forEach((p) => mapa.set(p.tipoPeca, (mapa.get(p.tipoPeca) || 0) + 1));
    return [...mapa.entries()].sort((a, b) => b[1] - a[1]);
  }, [abertas]);

  return (
    <>
      <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
        <StatCard label="Peças abertas" value={abertas.length} icon={Scissors} />
        <StatCard label="Em produção" value={emProducao} icon={PackageCheck} />
        <StatCard label="Aguardando" value={aguardando} icon={Clock} />
        <StatCard label="Pausados" value={pausados} icon={Clock} />
        <StatCard label="Em prova agora" value={emProva} icon={Eye} />
        <StatCard label="Urgentes (Alta)" value={urgentes} icon={Flame} accent={urgentes > 0 ? VERMELHO : undefined} />
        <StatCard label="Entregues (mês)" value={entreguesMes} icon={PackageCheck} suffix={carinhaEntregues} />
        <StatCard label="Profissionais atuando" value={profissionaisAtuando} icon={UserCheck} />
        <StatCard label="Tempo médio de produção" value={mediaDiasProducao !== null && mediaDiasProducao !== undefined ? `${mediaDiasProducao}d` : "—"} icon={Timer} />
        <StatCard
          label="Próxima entrega"
          value={proximaEntrega ? `${proximaEntrega.cliente} · ${fmtData(proximaEntrega.previsaoEfetiva)}` : "—"}
          icon={CalendarDays}
        />
      </div>

      <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
        {composicao.length > 0 && (
          <Card style={{ padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: TEXT_MUTED, marginBottom: 8, textTransform: "uppercase" }}>Composição do portfólio atual</div>
            <div className="flex flex-wrap gap-4">
              {composicao.map(([tipo, qtd]) => (
                <div key={tipo} style={{ fontSize: 13 }}>
                  <strong>{qtd}</strong> <span style={{ color: TEXT_MUTED }}>{tipo}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        <Card style={{ padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: TEXT_MUTED, marginBottom: 8, textTransform: "uppercase" }} title="Com base na previsão manual, ou estimada quando não há uma definida">
            Projeção de prazos
          </div>
          <div className="flex flex-wrap gap-4">
            <div style={{ fontSize: 13 }}>
              <strong style={{ color: VERMELHO }}>{projecaoPrazos.atrasadas}</strong> <span style={{ color: TEXT_MUTED }}>atrasadas</span>
            </div>
            <div style={{ fontSize: 13 }}>
              <strong style={{ color: AMARELO }}>{projecaoPrazos.emRisco}</strong> <span style={{ color: TEXT_MUTED }}>em risco (7 dias)</span>
            </div>
            <div style={{ fontSize: 13 }}>
              <strong style={{ color: "#2C6E31" }}>{projecaoPrazos.noPrazo}</strong> <span style={{ color: TEXT_MUTED }}>no prazo</span>
            </div>
            {projecaoPrazos.semPrevisao > 0 && (
              <div style={{ fontSize: 13 }}>
                <strong>{projecaoPrazos.semPrevisao}</strong> <span style={{ color: TEXT_MUTED }}>sem previsão ainda</span>
              </div>
            )}
          </div>
        </Card>
      </div>

      {pontos.length > 0 && (
        <Card style={{ padding: 16 }} className="mb-6">
          <div className="flex items-center gap-1.5" style={{ marginBottom: 4 }}>
            <Target size={14} color={BRASS} />
            <span style={{ fontSize: 11, fontWeight: 600, color: TEXT_MUTED, textTransform: "uppercase" }}>Pontos de melhoria na produção</span>
          </div>
          <div style={{ fontSize: 12, color: TEXT_MUTED, marginBottom: 4 }}>
            Meta: voltar de ~32h pra ~23,5h por peça (Costume/Traje). Marca aqui quando resolver um desses gargalos.
          </div>
          {pontos.map((ponto) => (
            <PontoMelhoriaLinha key={ponto.id} ponto={ponto} onBater={marcarComoBatido} onDesfazer={desfazerBatido} />
          ))}
        </Card>
      )}
    </>
  );
}
