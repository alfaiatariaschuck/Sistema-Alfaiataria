import React, { useMemo, useState } from "react";
import { Card } from "./ui";
import { BRASS, INK, TEXT_MUTED } from "../lib/constants";

// Mesma paleta camisaria/alfaiataria dos outros gráficos do sistema
// (Faturamento por mês, Peças vendidas por ano).
const AZUL = "#2A78D6";
const ALTURA_GRAFICO = 130;
const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function rotuloMes(chave) {
  const [ano, mes] = chave.split("-");
  return `${MESES[parseInt(mes, 10) - 1]}/${ano.slice(2)}`;
}

function ultimosMeses(n) {
  const hoje = new Date();
  const lista = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    lista.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return lista;
}

// Doação fica de fora — não é venda de verdade, mesmo critério do resto
// do Metas.jsx.
function calcularQuantidadePorMes(pedidos, pecas, meses) {
  const mapa = new Map(meses.map((m) => [m, { camisaria: 0, alfaiataria: 0 }]));
  pedidos.forEach((p) => {
    if (p.status === "Doação" || !p.dataPedido) return;
    const mes = p.dataPedido.slice(0, 7);
    if (!mapa.has(mes)) return;
    mapa.get(mes).camisaria += parseFloat(p.quantidade) || 0;
  });
  (pecas || []).forEach((p) => {
    if (p.status === "Doação" || !p.dataPedido) return;
    const mes = p.dataPedido.slice(0, 7);
    if (!mapa.has(mes)) return;
    mapa.get(mes).alfaiataria += 1;
  });
  return meses.map((mes) => {
    const v = mapa.get(mes);
    return { mes, ...v, total: v.camisaria + v.alfaiataria };
  });
}

export default function QuantidadePorMes({ pedidos, pecas }) {
  const meses = useMemo(() => ultimosMeses(12), []);
  const dados = useMemo(() => calcularQuantidadePorMes(pedidos, pecas, meses), [pedidos, pecas, meses]);
  const [hover, setHover] = useState(null);
  const maxTotal = Math.max(1, ...dados.map((d) => d.total));

  return (
    <Card style={{ padding: 20 }} className="mb-6">
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <div className="fx-serif" style={{ fontSize: 15, fontWeight: 600 }}>
          Peças vendidas por mês
        </div>
        <div className="flex items-center gap-3" style={{ fontSize: 11, color: TEXT_MUTED }}>
          <span className="flex items-center gap-1.5">
            <span style={{ width: 9, height: 9, borderRadius: 2, background: AZUL, display: "inline-block" }} /> Camisaria
          </span>
          <span className="flex items-center gap-1.5">
            <span style={{ width: 9, height: 9, borderRadius: 2, background: BRASS, display: "inline-block" }} /> Alfaiataria
          </span>
        </div>
      </div>
      <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 20 }}>
        Quantidade de unidades vendidas por mês (não é valor em R$) — exclui Doação, últimos 12 meses.
      </div>

      <div className="flex items-end gap-2" style={{ minHeight: ALTURA_GRAFICO + 50 }}>
        {dados.map((d) => {
          const alturaTotal = (d.total / maxTotal) * ALTURA_GRAFICO;
          const alturaAlfaiataria = d.total > 0 ? (d.alfaiataria / d.total) * alturaTotal : 0;
          const alturaCamisaria = alturaTotal - alturaAlfaiataria;
          const emFoco = hover === d.mes;
          return (
            <div
              key={d.mes}
              className="flex flex-col items-center"
              style={{ flex: 1, minWidth: 30, position: "relative" }}
              onMouseEnter={() => setHover(d.mes)}
              onMouseLeave={() => setHover(null)}
            >
              {emFoco && (
                <div
                  style={{
                    position: "absolute",
                    bottom: alturaTotal + 34,
                    background: INK,
                    color: "#FFF",
                    padding: "7px 11px",
                    borderRadius: 6,
                    fontSize: 11,
                    whiteSpace: "nowrap",
                    zIndex: 10,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                  }}
                >
                  {rotuloMes(d.mes)}: {d.total} peça(s) · {d.camisaria} camisa(s) · {d.alfaiataria} alfaiataria
                </div>
              )}
              <div className="fx-mono" style={{ fontSize: 12, fontWeight: 700, color: emFoco ? BRASS : INK, marginBottom: 6 }}>
                {d.total}
              </div>
              <div className="flex flex-col justify-end w-full" style={{ height: ALTURA_GRAFICO, maxWidth: 36, margin: "0 auto" }}>
                {alturaAlfaiataria > 0 && (
                  <div
                    style={{
                      height: Math.max(alturaAlfaiataria, 3),
                      background: BRASS,
                      borderRadius: "4px 4px 0 0",
                      marginBottom: alturaCamisaria > 0 ? 2 : 0,
                      opacity: emFoco ? 1 : 0.9,
                    }}
                  />
                )}
                {alturaCamisaria > 0 && (
                  <div
                    style={{
                      height: Math.max(alturaCamisaria, 3),
                      background: AZUL,
                      borderRadius: alturaAlfaiataria > 0 ? "0 0 0 0" : "4px 4px 0 0",
                      opacity: emFoco ? 1 : 0.9,
                    }}
                  />
                )}
              </div>
              <div className="fx-mono" style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 8 }}>
                {rotuloMes(d.mes)}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
