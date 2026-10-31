import React from "react";
import { createPortal } from "react-dom";
import { Printer, X } from "lucide-react";
import { fmtData, hojeISO } from "../lib/helpers";
import { imprimirComNome } from "../lib/imprimirFicha";

// Relatório de estoque pra mandar pra costureira ver (ex: Fabi) enquanto
// ela não tem login no sistema — de propósito só código, fornecedor e
// saldo em metros, sem valor/metro nem nada de gestão, igual a mensagem
// de WhatsApp que já existe. Quando ela tiver acesso direto ao sistema,
// isso deixa de ser necessário.
export default function RelatorioEstoqueImprimivel({ estoque, titulo = "Estoque de Tecido Disponível", onFechar }) {
  function imprimir() {
    imprimirComNome(`${titulo} - ${hojeISO()}`);
  }

  const disponiveis = [...(estoque || [])].filter((e) => e.saldoMetros > 0).sort((a, b) => a.codigo.localeCompare(b.codigo));
  const totalMetros = disponiveis.reduce((s, e) => s + e.saldoMetros, 0);

  return createPortal(
    <div className="ficha-overlay" style={{ position: "fixed", inset: 0, background: "rgba(22,33,46,0.6)", zIndex: 50, overflow: "auto" }}>
      <div className="no-print" style={{ maxWidth: 780, margin: "0 auto", padding: "16px 16px 0" }}>
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

      <div id="ficha-print" style={{ background: "#FFF", maxWidth: 780, margin: "0 auto 40px", padding: 40, color: "#111", fontFamily: "'Inter', sans-serif" }}>
        <div style={{ borderBottom: "2px solid #111", paddingBottom: 12, marginBottom: 20 }}>
          <div className="fx-serif" style={{ fontSize: 22, fontWeight: 700, letterSpacing: 1 }}>
            SCHUCK ALFAIATARIA
          </div>
          <div style={{ fontSize: 13, color: "#555", marginTop: 2 }}>{titulo}</div>
          <div style={{ fontSize: 12, color: "#555" }}>gerado em {fmtData(hojeISO())}</div>
        </div>

        <div className="grid gap-2 mb-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", fontSize: 13 }}>
          <div>
            <div style={{ fontSize: 11, color: "#777" }}>Tecidos disponíveis</div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{disponiveis.length}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#777" }}>Total em estoque</div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{totalMetros.toFixed(1)}m</div>
          </div>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid #111" }}>Código</th>
              <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid #111" }}>Fornecedor</th>
              <th style={{ textAlign: "right", padding: "6px 8px", borderBottom: "1px solid #111" }}>Saldo</th>
            </tr>
          </thead>
          <tbody>
            {disponiveis.map((item, i) => (
              <tr key={item.id} style={{ background: i % 2 === 0 ? "#F7F5EF" : "#FFF" }}>
                <td style={{ padding: "6px 8px", fontWeight: 600 }}>{item.codigo}</td>
                <td style={{ padding: "6px 8px", color: "#555" }}>{item.fornecedor || "—"}</td>
                <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 600 }}>{item.saldoMetros.toFixed(1)}m</td>
              </tr>
            ))}
            {disponiveis.length === 0 && (
              <tr>
                <td colSpan={3} style={{ padding: "10px 8px", color: "#888" }}>
                  Nenhum tecido com saldo em estoque no momento.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>,
    document.body
  );
}
