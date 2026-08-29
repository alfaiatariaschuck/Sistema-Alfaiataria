import React, { useMemo, useState } from "react";
import { Card } from "./ui";
import { BRASS, INK, LINE, TEXT_MUTED } from "../lib/constants";

// Mesma cor da "recompra" (BRASS) já usada em todo o sistema; as outras
// duas são só pra esse gráfico — pra distinguir camisas x alfaiataria x
// planilha antiga sem repetir cor.
const AZUL = "#2A78D6";
const VIOLETA = "#4A3AA7";
const ALTURA_GRAFICO = 150;

// Camisas e peças de alfaiataria "Doação" saem da conta — não são venda de
// verdade (mesmo critério já usado no Painel e no Relatório). A planilha
// antiga não distingue tipo de peça, então entra separada, sem mistura.
function calcularVendasPorAno(clientesEnriquecidos) {
  const porAno = new Map();
  function bucket(ano) {
    if (!porAno.has(ano)) porAno.set(ano, { camisas: 0, alfaiataria: 0, historico: 0 });
    return porAno.get(ano);
  }
  clientesEnriquecidos.forEach((c) => {
    (c.pedidos || []).forEach((p) => {
      if (!p.dataPedido || p.status === "Doação") return;
      bucket(p.dataPedido.slice(0, 4)).camisas += parseFloat(p.quantidade) || 0;
    });
    (c.pecas || []).forEach((p) => {
      if (!p.dataPedido || p.status === "Doação") return;
      bucket(p.dataPedido.slice(0, 4)).alfaiataria += 1;
    });
    (c.historico || []).forEach((h) => {
      bucket(String(h.ano)).historico += parseFloat(h.quantidade) || 0;
    });
  });
  return [...porAno.entries()]
    .map(([ano, v]) => ({ ano, ...v, total: v.camisas + v.alfaiataria + v.historico }))
    .sort((a, b) => a.ano.localeCompare(b.ano));
}

const SEGMENTOS = [
  { chave: "alfaiataria", label: "Alfaiataria", cor: BRASS },
  { chave: "camisas", label: "Camisas", cor: AZUL },
  { chave: "historico", label: "Planilha antiga", cor: VIOLETA },
];

export default function VendasPorAno({ clientes }) {
  const dados = useMemo(() => calcularVendasPorAno(clientes), [clientes]);
  const [hover, setHover] = useState(null);
  const maxTotal = Math.max(1, ...dados.map((d) => d.total));

  if (dados.length === 0) return null;

  return (
    <Card style={{ padding: 20 }} className="mb-6">
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <div className="fx-serif" style={{ fontSize: 15, fontWeight: 600 }}>
          Peças vendidas por ano
        </div>
        <div className="flex items-center gap-3" style={{ fontSize: 11, color: TEXT_MUTED }}>
          {SEGMENTOS.map((s) => (
            <span key={s.chave} className="flex items-center gap-1.5">
              <span style={{ width: 9, height: 9, borderRadius: 2, background: s.cor, display: "inline-block" }} /> {s.label}
            </span>
          ))}
        </div>
      </div>
      <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 20 }}>
        Quantidade vendida por ano — camisas e alfaiataria excluem Doação (não é venda); a planilha antiga não separa o
        tipo de peça, então entra à parte.
      </div>

      <div className="flex items-end gap-2 md:gap-4" style={{ minHeight: ALTURA_GRAFICO + 50 }}>
        {dados.map((d) => {
          const alturaTotal = (d.total / maxTotal) * ALTURA_GRAFICO;
          const emFoco = hover === d.ano;
          let restante = alturaTotal;
          let primeiroNaoZero = true;
          const partes = SEGMENTOS.map((s) => {
            const valor = d[s.chave];
            if (valor <= 0) return null;
            const altura = d.total > 0 ? (valor / d.total) * alturaTotal : 0;
            const topo = primeiroNaoZero;
            primeiroNaoZero = false;
            return { ...s, valor, altura, topo };
          }).filter(Boolean);

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
                  {d.ano}: {d.total} peça(s) · {d.camisas} camisa(s) · {d.alfaiataria} alfaiataria · {d.historico} planilha antiga
                </div>
              )}
              <div className="fx-mono" style={{ fontSize: 13, fontWeight: 700, color: emFoco ? BRASS : INK, marginBottom: 6 }}>
                {d.total}
              </div>
              <div className="flex flex-col justify-end w-full" style={{ height: ALTURA_GRAFICO, maxWidth: 44, margin: "0 auto" }}>
                {partes.map((parte, i) => (
                  <div
                    key={parte.chave}
                    style={{
                      height: Math.max(parte.altura, 3),
                      background: parte.cor,
                      borderRadius: parte.topo ? "4px 4px 0 0" : "0 0 0 0",
                      marginBottom: i < partes.length - 1 ? 2 : 0,
                      opacity: emFoco ? 1 : 0.9,
                    }}
                  />
                ))}
              </div>
              <div className="fx-mono" style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 8 }}>
                {d.ano}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 pt-4" style={{ borderTop: `1px solid ${LINE}`, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ color: TEXT_MUTED }}>
              <th style={{ textAlign: "left", padding: "4px 8px", fontWeight: 600 }}>Ano</th>
              <th style={{ textAlign: "right", padding: "4px 8px", fontWeight: 600 }}>Camisas</th>
              <th style={{ textAlign: "right", padding: "4px 8px", fontWeight: 600 }}>Alfaiataria</th>
              <th style={{ textAlign: "right", padding: "4px 8px", fontWeight: 600 }}>Planilha antiga</th>
              <th style={{ textAlign: "right", padding: "4px 8px", fontWeight: 600 }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {dados.map((d) => (
              <tr key={d.ano} className="fx-mono" style={{ borderTop: `1px solid ${LINE}` }}>
                <td style={{ padding: "5px 8px" }}>{d.ano}</td>
                <td style={{ padding: "5px 8px", textAlign: "right" }}>{d.camisas}</td>
                <td style={{ padding: "5px 8px", textAlign: "right" }}>{d.alfaiataria}</td>
                <td style={{ padding: "5px 8px", textAlign: "right" }}>{d.historico}</td>
                <td style={{ padding: "5px 8px", textAlign: "right", fontWeight: 700 }}>{d.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
