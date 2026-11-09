import React, { useMemo, useState } from "react";
import { Card } from "./ui";
import { BRASS, INK, LINE, TEXT_MUTED } from "../lib/constants";
import { brl, valorRecebidoEfetivo } from "../lib/helpers";

// Mesmo verde/laranja já usados em todo o sistema pra "Pago"/"Pendente"
// (ver STATUS_PAGAMENTO em constants.js) — consistência de cor.
const VERDE = "#2C6E31";
const LARANJA = "#9C4A1E";
const ALTURA_GRAFICO = 150;
const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function rotuloMes(chave) {
  const [ano, mes] = chave.split("-");
  return `${MESES[parseInt(mes, 10) - 1]}/${ano.slice(2)}`;
}

// Quanto já foi efetivamente pago de um pedido — mesma lógica de
// valorRecebidoEfetivo já usada nos StatCards "Pago à/Devido à" do
// Dashboard, só que agrupada por mês do pedido em vez de um total único.
function pagoEfetivo(p) {
  return valorRecebidoEfetivo({
    pagamentoDividido: p.pagamentoFabianaDividido,
    valorEntrada: p.valorEntradaFabiana,
    statusEntrada: p.statusEntradaFabiana,
    valorRestante: p.valorRestanteFabiana,
    statusRestante: p.statusRestanteFabiana,
    valorTotal: p.pagoFabiana?.valor,
    statusTotal: p.pagoFabiana?.statusPagamento,
    labelPago: "Pago",
  });
}

function calcularPagoDevidoPorMes(pedidos) {
  const mapa = new Map();
  function bucket(mes) {
    if (!mapa.has(mes)) mapa.set(mes, { pago: 0, devido: 0 });
    return mapa.get(mes);
  }
  (pedidos || []).forEach((p) => {
    const total = parseFloat(p.pagoFabiana?.valor) || 0;
    if (total <= 0 || !p.dataPedido) return;
    const pago = pagoEfetivo(p);
    const b = bucket(p.dataPedido.slice(0, 7));
    b.pago += pago;
    b.devido += total - pago;
  });
  return [...mapa.entries()]
    .map(([mes, v]) => ({ mes, ...v, total: v.pago + v.devido }))
    .sort((a, b) => a.mes.localeCompare(b.mes))
    .slice(-12);
}

// Pago/devido à costureira (Fabiana, Cleci ou Aline, conforme o painel),
// por mês do pedido — pra acompanhar a evolução ao longo do tempo, não só
// o total acumulado que já aparece nos cartões do topo do painel.
export default function PagoDevidoCosteiraPorMes({ pedidos, nomeCosteiraLabel = "costureiras" }) {
  const dados = useMemo(() => calcularPagoDevidoPorMes(pedidos), [pedidos]);
  const [hover, setHover] = useState(null);
  const maxTotal = Math.max(1, ...dados.map((d) => d.total));

  if (dados.length === 0) return null;

  return (
    <Card style={{ padding: 20 }} className="mb-6">
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <div className="fx-serif" style={{ fontSize: 15, fontWeight: 600 }}>
          Pago × devido à {nomeCosteiraLabel} por mês
        </div>
        <div className="flex items-center gap-3" style={{ fontSize: 11, color: TEXT_MUTED }}>
          <span className="flex items-center gap-1.5">
            <span style={{ width: 9, height: 9, borderRadius: 2, background: VERDE, display: "inline-block" }} /> Pago
          </span>
          <span className="flex items-center gap-1.5">
            <span style={{ width: 9, height: 9, borderRadius: 2, background: LARANJA, display: "inline-block" }} /> Devido
          </span>
        </div>
      </div>
      <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 20 }}>
        Últimos 12 meses, agrupado pela data do pedido — mostra o que já foi pago e o que ainda está em aberto com a{" "}
        {nomeCosteiraLabel}.
      </div>

      <div className="flex items-end gap-2 md:gap-4" style={{ minHeight: ALTURA_GRAFICO + 50 }}>
        {dados.map((d) => {
          const alturaTotal = (d.total / maxTotal) * ALTURA_GRAFICO;
          const alturaPago = d.total > 0 ? (d.pago / d.total) * alturaTotal : 0;
          const alturaDevido = alturaTotal - alturaPago;
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
                  {rotuloMes(d.mes)}: {brl(d.total)} · Pago {brl(d.pago)} · Devido {brl(d.devido)}
                </div>
              )}
              <div className="fx-mono" style={{ fontSize: 12, fontWeight: 700, color: emFoco ? BRASS : INK, marginBottom: 6 }}>
                {brl(d.total)}
              </div>
              <div className="flex flex-col justify-end w-full" style={{ height: ALTURA_GRAFICO, maxWidth: 44, margin: "0 auto" }}>
                {alturaDevido > 0 && (
                  <div
                    style={{
                      height: Math.max(alturaDevido, 3),
                      background: LARANJA,
                      borderRadius: "4px 4px 0 0",
                      marginBottom: alturaPago > 0 ? 2 : 0,
                      opacity: emFoco ? 1 : 0.9,
                    }}
                  />
                )}
                {alturaPago > 0 && (
                  <div
                    style={{
                      height: Math.max(alturaPago, 3),
                      background: VERDE,
                      borderRadius: alturaDevido > 0 ? "0 0 0 0" : "4px 4px 0 0",
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

      <div className="mt-5 pt-4" style={{ borderTop: `1px solid ${LINE}`, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ color: TEXT_MUTED }}>
              <th style={{ textAlign: "left", padding: "4px 8px", fontWeight: 600 }}>Mês</th>
              <th style={{ textAlign: "right", padding: "4px 8px", fontWeight: 600 }}>Pago</th>
              <th style={{ textAlign: "right", padding: "4px 8px", fontWeight: 600 }}>Devido</th>
              <th style={{ textAlign: "right", padding: "4px 8px", fontWeight: 600 }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {dados.map((d) => (
              <tr key={d.mes} className="fx-mono" style={{ borderTop: `1px solid ${LINE}` }}>
                <td style={{ padding: "5px 8px" }}>{rotuloMes(d.mes)}</td>
                <td style={{ padding: "5px 8px", textAlign: "right", color: VERDE }}>{brl(d.pago)}</td>
                <td style={{ padding: "5px 8px", textAlign: "right", color: LARANJA }}>{brl(d.devido)}</td>
                <td style={{ padding: "5px 8px", textAlign: "right", fontWeight: 700 }}>{brl(d.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
