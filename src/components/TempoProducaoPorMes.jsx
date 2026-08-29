import React, { useMemo, useState } from "react";
import { Card } from "./ui";
import { BRASS, INK, TEXT_MUTED } from "../lib/constants";
import { diasEntre } from "../lib/helpers";

const ALTURA_GRAFICO = 130;
const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function rotuloMes(chave) {
  const [ano, mes] = chave.split("-");
  return `${MESES[parseInt(mes, 10) - 1]}/${ano.slice(2)}`;
}

// Agrupa pela data de ENTREGA (não pelo pedido) — é quando a produção
// daquele mês de fato terminou. Só pedidos/peças já entregues com data
// de entrega registrada entram na média (mesmo critério do card de tempo
// médio já existente no painel).
function calcularTempoPorMes(lista) {
  const mapa = new Map();
  lista
    .filter((p) => p.status === "Entregue" && p.dataEntrega && p.dataPedido)
    .forEach((p) => {
      const dias = diasEntre(p.dataPedido, p.dataEntrega);
      if (dias === null) return;
      const mes = p.dataEntrega.slice(0, 7);
      if (!mapa.has(mes)) mapa.set(mes, []);
      mapa.get(mes).push(dias);
    });
  return [...mapa.entries()]
    .map(([mes, valores]) => ({ mes, media: Math.round(valores.reduce((s, v) => s + v, 0) / valores.length), qtd: valores.length }))
    .sort((a, b) => a.mes.localeCompare(b.mes))
    .slice(-12);
}

export default function TempoProducaoPorMes({ lista, titulo }) {
  const dados = useMemo(() => calcularTempoPorMes(lista), [lista]);
  const [hover, setHover] = useState(null);
  const maxValor = Math.max(1, ...dados.map((d) => d.media));

  if (dados.length === 0) return null;

  return (
    <Card style={{ padding: 20 }} className="mb-6">
      <div className="fx-serif mb-1" style={{ fontSize: 15, fontWeight: 600 }}>
        {titulo || "Tempo médio de produção por mês"}
      </div>
      <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 20 }}>
        Dias entre o pedido e a entrega, agrupado pelo mês em que foi entregue — só pedidos já entregues.
      </div>
      <div className="flex items-end gap-2" style={{ minHeight: ALTURA_GRAFICO + 50 }}>
        {dados.map((d) => {
          const altura = (d.media / maxValor) * ALTURA_GRAFICO;
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
                  {rotuloMes(d.mes)}: {d.media} dias em média ({d.qtd} entregue(s))
                </div>
              )}
              <div className="fx-mono" style={{ fontSize: 12, fontWeight: 700, color: emFoco ? BRASS : INK, marginBottom: 6 }}>
                {d.media}d
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
                {rotuloMes(d.mes)}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
