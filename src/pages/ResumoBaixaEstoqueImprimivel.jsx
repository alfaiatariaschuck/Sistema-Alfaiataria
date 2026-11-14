import React from "react";
import { createPortal } from "react-dom";
import { Printer, X } from "lucide-react";
import { fmtData, hojeISO } from "../lib/helpers";
import { imprimirComNome } from "../lib/imprimirFicha";

// Resumo simples da baixa de estoque — só código e comprometido, pra
// Fabi se orientar rápido. Pedido do Tales (14/11/2026): a ficha
// detalhada por cliente não imprimiu completa no celular dela, então
// "o melhor a fazer é só dar o resumo pra ela se orientar, código do
// tecido e comprometido" — uma tabela curta, uma linha por código,
// sempre cabe numa página só.
export default function ResumoBaixaEstoqueImprimivel({ linhas, onFechar }) {
  function imprimir() {
    imprimirComNome(`Resumo baixa de estoque - ${hojeISO()}`);
  }

  return createPortal(
    <div className="ficha-overlay" style={{ position: "fixed", inset: 0, background: "rgba(22,33,46,0.6)", zIndex: 50, overflow: "auto" }}>
      <div className="no-print" style={{ maxWidth: 600, margin: "0 auto", padding: "16px 16px 0" }}>
        <div style={{ background: "#FFF", borderRadius: 10, padding: 16, marginBottom: 12 }} className="flex flex-wrap gap-2">
          <button
            onClick={imprimir}
            className="flex items-center gap-2"
            style={{ background: "#15161A", color: "#FFF", padding: "9px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13 }}
          >
            <Printer size={15} /> Salvar como PDF / Imprimir
          </button>
          <button
            onClick={onFechar}
            style={{ background: "transparent", border: "1px solid #DAD7D0", color: "#15161A", padding: "9px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13 }}
          >
            <X size={14} className="inline mr-1" /> Fechar
          </button>
        </div>
      </div>

      <div id="ficha-print" style={{ background: "#FFF", maxWidth: 600, margin: "0 auto 40px", padding: 40, color: "#111", fontFamily: "'Inter', sans-serif" }}>
        <div style={{ borderBottom: "2px solid #111", paddingBottom: 12, marginBottom: 20 }}>
          <div className="fx-serif" style={{ fontSize: 22, fontWeight: 700, letterSpacing: 1 }}>
            SCHUCK ALFAIATARIA
          </div>
          <div style={{ fontSize: 13, color: "#555", marginTop: 2 }}>Resumo — comprometido por código</div>
          <div style={{ fontSize: 12, color: "#555" }}>gerado em {fmtData(hojeISO())}</div>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "8px", borderBottom: "1px solid #111" }}>Código</th>
              <th style={{ textAlign: "right", padding: "8px", borderBottom: "1px solid #111" }}>Comprometido</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l, i) => (
              <tr key={l.codigo} style={{ background: i % 2 === 0 ? "#F7F5EF" : "#FFF" }}>
                <td style={{ padding: "10px 8px", fontWeight: 700, fontSize: 16 }}>{l.codigo}</td>
                <td style={{ padding: "10px 8px", textAlign: "right", fontWeight: 700, fontSize: 16 }}>{l.comprometido.toFixed(1)}m</td>
              </tr>
            ))}
            {linhas.length === 0 && (
              <tr>
                <td colSpan={2} style={{ padding: "10px 8px", color: "#888" }}>
                  Nenhum item pendente de baixa no momento.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div style={{ fontSize: 12, color: "#555", marginTop: 20 }}>
          Esses são os metros já reservados em pedidos pra cada rolo — me avisa quando for cortar, pra eu dar baixa
          certinha.
        </div>
      </div>
    </div>,
    document.body
  );
}
