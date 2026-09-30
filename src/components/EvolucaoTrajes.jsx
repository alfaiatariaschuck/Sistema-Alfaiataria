import React, { useMemo, useState } from "react";
import { Card } from "./ui";
import { BRASS, ETAPAS_ACOMPANHAMENTO_ALFAIATARIA, INK, TEXT_MUTED, inputStyle } from "../lib/constants";
import { diasAte, diasProducaoReal, fmtData, hojeISO, previsaoEfetivaDe, previsaoEstimada, somarDias, statusParaEtapa } from "../lib/helpers";

const ORDENACOES = [
  { valor: "previsao", label: "Mais próximo de entregar" },
  { valor: "dias", label: "Mais tempo na fila/produção" },
  { valor: "nome", label: "Nome do cliente (A-Z)" },
];

const RISCO = "#8A6A0C";
const ATRASADO = "#9C4A1E";
const PERCENTUAIS = ETAPAS_ACOMPANHAMENTO_ALFAIATARIA.map((e) => e.percentual);

// Mesmo critério de atraso/risco já usado na Tabela de Controle de
// Produção (previsão efetiva vencida = atrasado, vencendo em 7 dias =
// risco) — só reaproveitado aqui pra colorir a barra e ordenar por
// "mais próximo de entregar", não recalculado do zero.
function infoProducaoDe(peca, mediaDiasPorTipo, previsoesFila) {
  const estimativa = peca.dataInicioProducao ? previsaoEstimada(peca, mediaDiasPorTipo?.(peca.tipoPeca)) : previsoesFila?.get(peca.id) || null;
  const previsaoEfetiva = previsaoEfetivaDe(peca, estimativa);
  if (!previsaoEfetiva) return { previsaoEfetiva: null, situacao: "normal" };
  const hoje = hojeISO();
  if (previsaoEfetiva < hoje) return { previsaoEfetiva, situacao: "atrasado" };
  if (previsaoEfetiva <= somarDias(hoje, 7)) return { previsaoEfetiva, situacao: "risco" };
  return { previsaoEfetiva, situacao: "normal" };
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
  const [ordenacao, setOrdenacao] = useState("previsao");
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
    const lista = abertas.map((p) => {
      const { percentual } = statusParaEtapa("alfaiataria", p.status);
      const dias = p.dataInicioProducao ? diasProducaoReal(p) || 0 : p.dataPedido ? -diasAte(p.dataPedido) : 0;
      const { previsaoEfetiva, situacao } = infoProducaoDe(p, mediaDiasPorTipo, previsoesFila);
      return {
        id: p.id,
        nome: p.cliente || "Sem nome",
        percentual,
        dias,
        previsaoEfetiva,
        previsaoLabel: previsaoEfetiva ? fmtData(previsaoEfetiva) : "sem previsão",
        barCor: corDaSituacao(situacao),
      };
    });

    if (ordenacao === "previsao") {
      // Sem previsão (ainda não começou e nem tem fila estimada) fica
      // por último — não dá pra dizer "mais próximo" de algo que não
      // tem data nenhuma.
      return [...lista].sort((a, b) => {
        if (!a.previsaoEfetiva && !b.previsaoEfetiva) return b.dias - a.dias;
        if (!a.previsaoEfetiva) return 1;
        if (!b.previsaoEfetiva) return -1;
        return a.previsaoEfetiva.localeCompare(b.previsaoEfetiva);
      });
    }
    if (ordenacao === "nome") {
      return [...lista].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    }
    return [...lista].sort((a, b) => b.dias - a.dias);
  }, [abertas, mediaDiasPorTipo, previsoesFila, ordenacao]);

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
        <div className="flex items-center justify-between flex-wrap" style={{ gap: 12, marginBottom: 2 }}>
          <div className="fx-serif" style={{ fontSize: 16, fontWeight: 600 }}>
            Evolução por cliente
          </div>
          <select value={ordenacao} onChange={(e) => setOrdenacao(e.target.value)} style={{ ...inputStyle, fontSize: 12, padding: "6px 10px", width: "auto" }}>
            {ORDENACOES.map((o) => (
              <option key={o.valor} value={o.valor}>
                Ordenar: {o.label}
              </option>
            ))}
          </select>
        </div>
        <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 18 }}>
          Cada traje da fila — a barra preenche conforme avança nas etapas.
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
              <div style={{ width: 96, flexShrink: 0, textAlign: "right", fontSize: 11, color: TEXT_MUTED }}>{c.previsaoLabel}</div>
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
