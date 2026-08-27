import React, { useMemo, useState } from "react";
import { Card } from "./ui";
import { BRASS, INK, LINE, TEXT_MUTED } from "../lib/constants";

// Cor pro segmento "cliente novo" — só usada aqui, pra distinguir de
// "recompra" (que já é BRASS em todo o resto do sistema).
const AZUL = "#2A78D6";
const ALTURA_GRAFICO = 150;

// De quem comprou em cada ano, quantos já eram clientes de antes (em
// qualquer ano anterior, somando pedidos do app + planilha antiga) vs
// quantos compraram pela primeira vez naquele ano.
function calcularPorAno(clientesEnriquecidos) {
  const porAno = new Map();
  clientesEnriquecidos.forEach((c) => {
    const anos = new Set();
    (c.todosItens || []).forEach((i) => {
      if (i.data) anos.add(i.data.slice(0, 4));
    });
    (c.historico || []).forEach((h) => anos.add(String(h.ano)));
    if (anos.size === 0) return;
    const primeiroAno = [...anos].sort()[0];
    anos.forEach((ano) => {
      if (!porAno.has(ano)) porAno.set(ano, { novos: 0, recompra: 0 });
      const bucket = porAno.get(ano);
      if (ano === primeiroAno) bucket.novos += 1;
      else bucket.recompra += 1;
    });
  });
  return [...porAno.entries()]
    .map(([ano, v]) => {
      const total = v.novos + v.recompra;
      return { ano, ...v, total, taxa: total > 0 ? Math.round((v.recompra / total) * 100) : 0 };
    })
    .sort((a, b) => a.ano.localeCompare(b.ano));
}

export default function RecompraPorAno({ clientes }) {
  const dados = useMemo(() => calcularPorAno(clientes), [clientes]);
  const [hover, setHover] = useState(null);
  const maxTotal = Math.max(1, ...dados.map((d) => d.total));

  if (dados.length === 0) return null;

  return (
    <Card style={{ padding: 20 }} className="mb-6">
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <div className="fx-serif" style={{ fontSize: 15, fontWeight: 600 }}>
          Taxa de recompra por ano
        </div>
        <div className="flex items-center gap-3" style={{ fontSize: 11, color: TEXT_MUTED }}>
          <span className="flex items-center gap-1.5">
            <span style={{ width: 9, height: 9, borderRadius: 2, background: AZUL, display: "inline-block" }} /> Cliente novo
          </span>
          <span className="flex items-center gap-1.5">
            <span style={{ width: 9, height: 9, borderRadius: 2, background: BRASS, display: "inline-block" }} /> Recompra
          </span>
        </div>
      </div>
      <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 20 }}>
        De quem comprou em cada ano, quantos já eram clientes de antes vs quantos compraram pela primeira vez —
        conta qualquer compra do ano (não só a mais recente de cada cliente), somando pedidos do app e a planilha antiga.
      </div>

      <div className="flex items-end gap-2 md:gap-4" style={{ minHeight: ALTURA_GRAFICO + 50 }}>
        {dados.map((d) => {
          const alturaTotal = (d.total / maxTotal) * ALTURA_GRAFICO;
          const alturaRecompra = d.total > 0 ? (d.recompra / d.total) * alturaTotal : 0;
          const alturaNovos = alturaTotal - alturaRecompra;
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
                  {d.ano}: {d.total} cliente(s) · {d.recompra} recompra · {d.novos} novo(s)
                </div>
              )}
              <div className="fx-mono" style={{ fontSize: 13, fontWeight: 700, color: emFoco ? BRASS : INK, marginBottom: 6 }}>
                {d.taxa}%
              </div>
              <div className="flex flex-col justify-end w-full" style={{ height: ALTURA_GRAFICO, maxWidth: 44, margin: "0 auto" }}>
                {alturaNovos > 0 && (
                  <div
                    style={{
                      height: Math.max(alturaNovos, 3),
                      background: AZUL,
                      borderRadius: "4px 4px 0 0",
                      marginBottom: alturaRecompra > 0 ? 2 : 0,
                      opacity: emFoco ? 1 : 0.9,
                    }}
                  />
                )}
                {alturaRecompra > 0 && (
                  <div
                    style={{
                      height: Math.max(alturaRecompra, 3),
                      background: BRASS,
                      borderRadius: alturaNovos > 0 ? "0 0 0 0" : "4px 4px 0 0",
                      opacity: emFoco ? 1 : 0.9,
                    }}
                  />
                )}
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
              <th style={{ textAlign: "right", padding: "4px 8px", fontWeight: 600 }}>Novos</th>
              <th style={{ textAlign: "right", padding: "4px 8px", fontWeight: 600 }}>Recompra</th>
              <th style={{ textAlign: "right", padding: "4px 8px", fontWeight: 600 }}>Total</th>
              <th style={{ textAlign: "right", padding: "4px 8px", fontWeight: 600 }}>Taxa</th>
            </tr>
          </thead>
          <tbody>
            {dados.map((d) => (
              <tr key={d.ano} className="fx-mono" style={{ borderTop: `1px solid ${LINE}` }}>
                <td style={{ padding: "5px 8px" }}>{d.ano}</td>
                <td style={{ padding: "5px 8px", textAlign: "right" }}>{d.novos}</td>
                <td style={{ padding: "5px 8px", textAlign: "right" }}>{d.recompra}</td>
                <td style={{ padding: "5px 8px", textAlign: "right", fontWeight: 700 }}>{d.total}</td>
                <td style={{ padding: "5px 8px", textAlign: "right", color: BRASS, fontWeight: 700 }}>{d.taxa}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
