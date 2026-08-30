import React, { useMemo } from "react";
import { AlertTriangle, CalendarDays, Clock, Eye, Flame, PackageCheck, Scissors, Timer, UserCheck } from "lucide-react";
import { Card, PageTitle, StatCard } from "../components/ui";
import TabelaControleProducao from "../components/TabelaControleProducao";
import { TEXT_MUTED } from "../lib/constants";
import { fmtData, hojeISO, previsaoEfetivaDe, previsaoEstimada } from "../lib/helpers";

const VERMELHO = "#9C4A1E";
const AMARELO = "#8A6A0C";
const ETAPAS_PROVA = ["Prova na Tela", "Prova na Caixa", "Prova Final"];

// Réplica da planilha "Controle de Produção": fila de peças em aberto +
// um painel de indicadores parecido com a aba DASHBOARD dela, incluindo
// uma previsão de entrega estimada (início/fila + média de produção) pra
// quem ainda não tem uma previsão definida manualmente.
export default function ControleProducao({
  pecas,
  onCampo,
  onPausar,
  onRetomar,
  onDesfazerInicio,
  mediaDiasProducao,
  mediaDiasPorTipo,
  previsoesFila,
  equipe,
  irParaPeca,
}) {
  const abertas = useMemo(() => pecas.filter((p) => p.status !== "Entregue"), [pecas]);
  const hoje = hojeISO();
  const mesAtual = hoje.slice(0, 7);

  const emProducao = abertas.filter((p) => p.situacao === "Em Produção").length;
  const aguardando = abertas.filter((p) => p.situacao === "Aguardando").length;
  const pausados = abertas.filter((p) => p.situacao === "Pausado").length;
  const urgentes = abertas.filter((p) => p.prioridade === "Alta").length;
  const emProva = abertas.filter((p) => ETAPAS_PROVA.includes(p.status)).length;
  const entreguesMes = pecas.filter((p) => p.status === "Entregue" && p.dataEntrega && p.dataEntrega.slice(0, 7) === mesAtual).length;
  const freelancersHoje = (equipe || []).filter((m) => m.ativo && m.trabalhandoHoje).length;

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

  const responsaveisConhecidos = useMemo(
    () => [...new Set([...(equipe || []).filter((m) => m.ativo).map((m) => m.nome), ...pecas.map((p) => p.responsavel).filter(Boolean)])],
    [pecas, equipe]
  );

  return (
    <div>
      <PageTitle eyebrow="Alfaiataria — fila de produção" title="Controle de Produção" />

      <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
        <StatCard label="Peças abertas" value={abertas.length} icon={Scissors} />
        <StatCard label="Em produção" value={emProducao} icon={PackageCheck} />
        <StatCard label="Aguardando" value={aguardando} icon={Clock} />
        <StatCard label="Pausados" value={pausados} icon={Clock} />
        <StatCard label="Em prova agora" value={emProva} icon={Eye} />
        <StatCard label="Urgentes (Alta)" value={urgentes} icon={Flame} accent={urgentes > 0 ? VERMELHO : undefined} />
        <StatCard label="Entregues (mês)" value={entreguesMes} icon={PackageCheck} />
        <StatCard label="Freelancers hoje" value={freelancersHoje} icon={UserCheck} />
        <StatCard label="Tempo médio de produção" value={mediaDiasProducao !== null ? `${mediaDiasProducao}d` : "—"} icon={Timer} />
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

      <Card style={{ padding: 0, overflow: "hidden" }}>
        <TabelaControleProducao
          pecas={abertas}
          podeEditarAtribuicao
          responsaveisConhecidos={responsaveisConhecidos}
          onCampo={onCampo}
          onAbrir={irParaPeca}
          onMarcarInicio={(id) => onCampo(id, "dataInicioProducao", hojeISO())}
          onPausar={onPausar}
          onRetomar={onRetomar}
          onDesfazerInicio={onDesfazerInicio}
          mediaDiasPorTipo={mediaDiasPorTipo}
          previsoesFila={previsoesFila}
        />
      </Card>
    </div>
  );
}
