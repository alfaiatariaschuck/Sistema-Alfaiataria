import React, { useMemo } from "react";
import { Card, PageTitle } from "../components/ui";
import TabelaControleProducao from "../components/TabelaControleProducao";
import PainelProducaoResumo from "../components/PainelProducaoResumo";
import { hojeISO } from "../lib/helpers";

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

  const responsaveisConhecidos = useMemo(
    () => [...new Set([...(equipe || []).filter((m) => m.ativo).map((m) => m.nome), ...pecas.map((p) => p.responsavel).filter(Boolean)])],
    [pecas, equipe]
  );

  return (
    <div>
      <PageTitle eyebrow="Alfaiataria — fila de produção" title="Controle de Produção" />

      <PainelProducaoResumo pecas={pecas} equipe={equipe} mediaDiasProducao={mediaDiasProducao} mediaDiasPorTipo={mediaDiasPorTipo} previsoesFila={previsoesFila} />

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
