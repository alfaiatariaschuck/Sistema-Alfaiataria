import React from "react";
import { Printer, X } from "lucide-react";
import { brl, fmtData, hojeISO } from "../lib/helpers";
import { imprimirComNome } from "../lib/imprimirFicha";

export default function RelatorioImprimivel({ titulo, periodo, resumo, itens, onFechar }) {
  function imprimir() {
    imprimirComNome(`${titulo} - ${periodo}`);
  }

  return (
    <div className="ficha-overlay" style={{ position: "fixed", inset: 0, background: "rgba(22,33,46,0.6)", zIndex: 50, overflow: "auto" }}>
      <div className="no-print" style={{ maxWidth: 780, margin: "0 auto", padding: "16px 16px 0" }}>
        <div style={{ background: "#FFF", borderRadius: 10, padding: 16, marginBottom: 12 }} className="flex flex-wrap gap-2">
          <button
            onClick={imprimir}
            className="flex items-center gap-2"
            style={{ background: "#16212E", color: "#FFF", padding: "9px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13 }}
          >
            <Printer size={15} /> Salvar como PDF
          </button>
          <button
            onClick={onFechar}
            style={{ background: "transparent", border: "1px solid #E4DECF", color: "#16212E", padding: "9px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13 }}
          >
            <X size={14} className="inline mr-1" /> Fechar
          </button>
        </div>
      </div>

      <div id="ficha-print" style={{ background: "#FFF", maxWidth: 780, margin: "0 auto 40px", padding: 40, color: "#111", fontFamily: "'Inter', sans-serif" }}>
        <div style={{ borderBottom: "2px solid #111", paddingBottom: 12, marginBottom: 20 }}>
          <div className="fx-serif" style={{ fontSize: 22, fontWeight: 700, letterSpacing: 1 }}>
            SCHUCK ALFAIATARIA
          </div>
          <div style={{ fontSize: 13, color: "#555", marginTop: 2 }}>{titulo}</div>
          <div style={{ fontSize: 12, color: "#555" }}>
            {periodo} · gerado em {fmtData(hojeISO())}
          </div>
        </div>

        <div className="grid gap-2 mb-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", fontSize: 13 }}>
          {resumo.map((r) => (
            <div key={r.label}>
              <div style={{ fontSize: 11, color: "#777" }}>{r.label}</div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{r.value}</div>
            </div>
          ))}
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "5px 8px", borderBottom: "1px solid #111" }}>Data</th>
              <th style={{ textAlign: "left", padding: "5px 8px", borderBottom: "1px solid #111" }}>Cliente</th>
              <th style={{ textAlign: "left", padding: "5px 8px", borderBottom: "1px solid #111" }}>Forma</th>
              <th style={{ textAlign: "right", padding: "5px 8px", borderBottom: "1px solid #111" }}>Valor</th>
              <th style={{ textAlign: "left", padding: "5px 8px", borderBottom: "1px solid #111" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((it, i) => (
              <tr key={it.id || i} style={{ background: i % 2 === 0 ? "#F7F5EF" : "#FFF" }}>
                <td style={{ padding: "5px 8px" }}>{fmtData(it.dataPedido)}</td>
                <td style={{ padding: "5px 8px", fontWeight: 600 }}>{it.cliente || "—"}</td>
                <td style={{ padding: "5px 8px" }}>{it.formaPagamento || "—"}</td>
                <td style={{ padding: "5px 8px", textAlign: "right", fontWeight: 600 }}>{brl(parseFloat(it.aReceber?.valor) || 0)}</td>
                <td style={{ padding: "5px 8px" }}>{it.aReceber?.statusPagamento}</td>
              </tr>
            ))}
            {itens.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: "10px 8px", color: "#888" }}>
                  Nenhum pedido no período selecionado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
