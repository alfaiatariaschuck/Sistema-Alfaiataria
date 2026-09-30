import React, { useMemo } from "react";
import { Card } from "./ui";
import { BRASS, ETAPAS_ACOMPANHAMENTO_ALFAIATARIA, INK, TEXT_MUTED } from "../lib/constants";
import { diasAte, diasProducaoReal, hojeISO, previsaoEfetivaDe, previsaoEstimada, somarDias, statusParaEtapa } from "../lib/helpers";

const RISCO = "#8A6A0C";
const ATRASADO = "#9C4A1E";
const PERCENTUAIS = ETAPAS_ACOMPANHAMENTO_ALFAIATARIA.map((e) => e.percentual);

// Mesmo critério de atraso/risco já usado na Tabela de Controle de
// Produção (previsão efetiva vencida = atrasado, vencendo em 7 dias =
// risco) — só reaproveitado aqui pra colorir a barra, não recalculado
// do zero.
function situacaoDe(peca, mediaDiasPorTipo, previsoesFila) {
  const estimativa = peca.dataInicioProducao ? previsaoEstimada(peca, mediaDiasPorTipo?.(peca.tipoPeca)) : previsoesFila?.get(peca.id) || null;
  const previsaoEfetiva = previsaoEfetivaDe(peca, estimativa);
  if (!previsaoEfetiva) return "normal";
  const hoje = hojeISO();
  if (previsaoEfetiva < hoje) return "atrasado";
  if (previsaoEfetiva <= somarDias(hoje, 7)) return "risco";
  return "normal";
}

function corDaSituacao(situacao) {
  if (situacao === "atrasado") return ATRASADO;
  if (situacao === "risco") return RISCO;
  return BRASS;
}

// Painel visual da fila de alfaiataria: um funil de quantos trajes tem
// em cada etapa, e logo abaixo cada cliente com uma barra mostrando o
// quanto já andou — em espera entra com a barra vazia (0%), sem
// precisar de uma lista separada.
export default function EvolucaoTrajes({ pecas, mediaDiasPorTipo, previsoesFila, irParaPeca }) {
  const abertas = useMemo(() => (pecas || []).filter((p) => p.status !== "Entregue"), [pecas]);

  const etapas = useMemo(() => {
    const contagem = ETAPAS_ACOMPANHAMENTO_ALFAIATARIA.map(() => 0);
    abertas.forEach((p) => {
      const { percentual } = statusParaEtapa("alfaiataria", p.status);
      const idx = PERCENTUAIS.indexOf(percentual);
      contagem[idx === -1 ? PERCENTUAIS.length - 1 : idx] += 1;
    });
    const maxQtd = Math.max(...contagem, 1);
    return ETAPAS_ACOMPANHAMENTO_ALFAIATARIA.map((e, i) => ({
      label: e.label,
      qtd: contagem[i],
      largura: `${Math.max(4, Math.round((contagem[i] / maxQtd) * 100))}%`,
      cor: i === 0 ? TEXT_MUTED : BRASS,
    }));
  }, [abertas]);

  const clientes = useMemo(() => {
    return abertas
      .map((p) => {
        const { percentual } = statusParaEtapa("alfaiataria", p.status);
        const dias = p.dataInicioProducao ? diasProducaoReal(p) || 0 : p.dataPedido ? -diasAte(p.dataPedido) : 0;
        const situacao = situacaoDe(p, mediaDiasPorTipo, previsoesFila);
        return { id: p.id, nome: p.cliente || "Sem nome", percentual, dias, barCor: corDaSituacao(situacao) };
      })
      .sort((a, b) => b.dias - a.dias);
  }, [abertas, mediaDiasPorTipo, previsoesFila]);

  return (
    <div>
      <Card style={{ padding: "22px 24px" }} className="mb-6">
        <div className="fx-serif" style={{ fontSize: 16, fontWeight: 600, marginBottom: 2 }}>
          Quantos trajes em cada etapa
        </div>
        <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 18 }}>
          {abertas.length} traje(s) na fila agora.
        </div>
        <div className="flex flex-col" style={{ gap: 9 }}>
          {etapas.map((et) => (
            <div key={et.label} className="flex items-center" style={{ gap: 12 }}>
              <div style={{ width: 150, flexShrink: 0, fontSize: 12, color: INK, fontWeight: 600 }}>{et.label}</div>
              <div style={{ flexGrow: 1, background: "#F0ECE0", borderRadius: 4, height: 14, overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 4, background: et.cor, width: et.largura }} />
              </div>
              <div className="fx-mono" style={{ width: 22, textAlign: "right", fontSize: 12, fontWeight: 700, color: INK }}>
                {et.qtd}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card style={{ padding: "22px 24px" }}>
        <div className="fx-serif" style={{ fontSize: 16, fontWeight: 600, marginBottom: 2 }}>
          Evolução por cliente
        </div>
        <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 18 }}>
          Cada traje da fila, do mais antigo ao mais recente — a barra preenche conforme avança nas etapas.
        </div>
        <div className="flex flex-col" style={{ gap: 12 }}>
          {clientes.map((c) => (
            <button
              key={c.id}
              onClick={() => irParaPeca && irParaPeca(c.id)}
              className="flex items-center w-full text-left"
              style={{ gap: 14, cursor: irParaPeca ? "pointer" : "default" }}
            >
              <div style={{ width: 190, flexShrink: 0, fontSize: 13, fontWeight: 600, color: INK, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {c.nome}
              </div>
              <div style={{ flexGrow: 1, background: "#F0ECE0", borderRadius: 5, height: 16, overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 5, background: c.barCor, width: `${c.percentual}%` }} />
              </div>
              <div className="fx-mono" style={{ width: 40, flexShrink: 0, textAlign: "right", fontSize: 12, fontWeight: 700, color: INK }}>
                {c.percentual}%
              </div>
            </button>
          ))}
          {clientes.length === 0 && <div style={{ fontSize: 12, color: TEXT_MUTED }}>Nenhum traje em aberto.</div>}
        </div>
      </Card>
    </div>
  );
}
