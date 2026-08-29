import React, { useMemo, useState } from "react";
import { Card } from "./ui";
import { BRASS, INK, TEXT_MUTED } from "../lib/constants";

const ALTURA_GRAFICO = 130;

function calcularDoacoesPorAno(doacoes, quantidadeFn) {
  const mapa = new Map();
  doacoes.forEach((p) => {
    if (!p.dataPedido) return;
    const ano = p.dataPedido.slice(0, 4);
    mapa.set(ano, (mapa.get(ano) || 0) + quantidadeFn(p));
  });
  return [...mapa.entries()].map(([ano, quantidade]) => ({ ano, quantidade })).sort((a, b) => a.ano.localeCompare(b.ano));
}

// Só conta o que foi lançado como Doação no app — a planilha antiga não
// distinguia doação de venda normal, então não entra aqui.
export default function DoacoesPorAno({ doacoes, quantidadeFn = () => 1, titulo }) {
  const dados = useMemo(() => calcularDoacoesPorAno(doacoes, quantidadeFn), [doacoes, quantidadeFn]);
  const [hover, setHover] = useState(null);
  const maxValor = Math.max(1, ...dados.map((d) => d.quantidade));

  if (dados.length === 0) return null;

  return (
    <Card style={{ padding: 20 }} className="mb-6">
      <div className="fx-serif mb-1" style={{ fontSize: 15, fontWeight: 600 }}>
        {titulo || "Doações por ano"}
      </div>
      <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 20 }}>
        Peças marcadas como Doação, por ano do pedido — só o que foi lançado no app.
      </div>
      <div className="flex items-end gap-2" style={{ minHeight: ALTURA_GRAFICO + 50 }}>
        {dados.map((d) => {
          const altura = (d.quantidade / maxValor) * ALTURA_GRAFICO;
          const emFoco = hover === d.ano;
          return (
            <div
              key={d.ano}
              className="flex flex-col items-center"
              style={{ flex: 1, minWidth: 30, position: "relative" }}
              onMouseEnter={() => setHover(d.ano)}
              onMouseLeave={() => setHover(null)}
            >
              {emFoco && (
                <div
                  style={{
                    position: "absolute",
                    bottom: altura + 34,
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
                  {d.ano}: {d.quantidade} doada(s)
                </div>
              )}
              <div className="fx-mono" style={{ fontSize: 12, fontWeight: 700, color: emFoco ? BRASS : INK, marginBottom: 6 }}>
                {d.quantidade}
              </div>
              <div
                style={{
                  height: Math.max(altura, 3),
                  width: "100%",
                  maxWidth: 36,
                  margin: "0 auto",
                  background: BRASS,
                  borderRadius: "4px 4px 0 0",
                  opacity: emFoco ? 1 : 0.9,
                }}
              />
              <div className="fx-mono" style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 8 }}>
                {d.ano}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
