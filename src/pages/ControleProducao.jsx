import React, { useMemo } from "react";
import { AlertTriangle, Clock, Flame, PackageCheck, Scissors, Timer } from "lucide-react";
import { Card, PageTitle, StatCard } from "../components/ui";
import TabelaControleProducao from "../components/TabelaControleProducao";
import { RESPONSAVEIS_ALFAIATARIA, TEXT_MUTED } from "../lib/constants";
import { hojeISO } from "../lib/helpers";

const VERMELHO = "#9C4A1E";

// Réplica da planilha "Controle de Produção": fila de peças em aberto +
// um painel de indicadores parecido com a aba DASHBOARD dela, incluindo
// uma previsão de entrega estimada (início/fila + média de produção) pra
// quem ainda não tem uma previsão definida manualmente.
export default function ControleProducao({ pecas, onCampo, onPausar, onRetomar, onDesfazerInicio, mediaDiasProducao, previsoesFila, irParaPeca }) {
  const abertas = useMemo(() => pecas.filter((p) => p.status !== "Entregue"), [pecas]);
  const hoje = hojeISO();

  const emProducao = abertas.filter((p) => p.situacao === "Em Produção").length;
  const atrasados = abertas.filter((p) => p.previsaoEntrega && p.previsaoEntrega < hoje).length;
  const aguardando = abertas.filter((p) => p.situacao === "Aguardando").length;
  const pausados = abertas.filter((p) => p.situacao === "Pausado").length;
  const urgentes = abertas.filter((p) => p.prioridade === "Alta").length;

  const composicao = useMemo(() => {
    const mapa = new Map();
    abertas.forEach((p) => mapa.set(p.tipoPeca, (mapa.get(p.tipoPeca) || 0) + 1));
    return [...mapa.entries()].sort((a, b) => b[1] - a[1]);
  }, [abertas]);

  const responsaveisConhecidos = useMemo(
    () => [...new Set([...RESPONSAVEIS_ALFAIATARIA, ...pecas.map((p) => p.responsavel).filter(Boolean)])],
    [pecas]
  );

  return (
    <div>
      <PageTitle eyebrow="Alfaiataria — fila de produção" title="Controle de Produção" />

      <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
        <StatCard label="Peças abertas" value={abertas.length} icon={Scissors} />
        <StatCard label="Em produção" value={emProducao} icon={PackageCheck} />
        <StatCard label="Aguardando" value={aguardando} icon={Clock} />
        <StatCard label="Pausados" value={pausados} icon={Clock} />
        <StatCard label="Atrasados" value={atrasados} icon={AlertTriangle} accent={atrasados > 0 ? VERMELHO : undefined} />
        <StatCard label="Urgentes (Alta)" value={urgentes} icon={Flame} accent={urgentes > 0 ? VERMELHO : undefined} />
        <StatCard label="Tempo médio de produção" value={mediaDiasProducao !== null ? `${mediaDiasProducao}d` : "—"} icon={Timer} />
      </div>

      {composicao.length > 0 && (
        <Card style={{ padding: 16 }} className="mb-6">
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
          mediaDiasProducao={mediaDiasProducao}
          previsoesFila={previsoesFila}
        />
      </Card>
    </div>
  );
}
