import React from "react";
import { createPortal } from "react-dom";
import { Printer, X } from "lucide-react";
import { fmtData, hojeISO } from "../lib/helpers";
import { imprimirComNome } from "../lib/imprimirFicha";

// Versão imprimível da baixa de estoque de UM código, pra Fabi riscar/
// preencher na mão e devolver — mesmo padrão das outras fichas
// imprimíveis (FichaImprimivel, RelatorioEstoqueImprimivel). Pedido do
// Tales (14/11/2026): já baixado, comprometido e saldo bem grandes no
// topo, igual aparece na tela, pra ela não precisar entender o sistema,
// só o papel.
export default function RelatorioBaixaEstoqueImprimivel({ codigo, itemEstoque, lista, comprometido, disponivelReal, jaBaixado, onFechar }) {
  function imprimir() {
    imprimirComNome(`Baixa de estoque ${codigo} - ${hojeISO()}`);
  }

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
          <div style={{ fontSize: 13, color: "#555", marginTop: 2 }}>
            Baixa de estoque — código <strong>{codigo}</strong>
            {itemEstoque?.fornecedor ? ` (${itemEstoque.fornecedor})` : ""}
          </div>
          <div style={{ fontSize: 12, color: "#555" }}>gerado em {fmtData(hojeISO())}</div>
        </div>

        <div className="grid gap-3 mb-6" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
          <div style={{ background: "#F7F5EF", borderRadius: 8, padding: "10px 12px" }}>
            <div style={{ fontSize: 11, color: "#777" }}>Já baixado</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{jaBaixado.toFixed(1)}m</div>
          </div>
          <div style={{ background: "#F7F5EF", borderRadius: 8, padding: "10px 12px" }}>
            <div style={{ fontSize: 11, color: "#777" }}>Comprometido</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{comprometido.toFixed(1)}m</div>
          </div>
          <div style={{ background: "#F7F5EF", borderRadius: 8, padding: "10px 12px" }}>
            <div style={{ fontSize: 11, color: "#777" }}>Saldo atual</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{itemEstoque.saldoMetros.toFixed(1)}m</div>
          </div>
          <div style={{ background: "#111", borderRadius: 8, padding: "10px 12px" }}>
            <div style={{ fontSize: 11, color: "#AAA" }}>Disponível real</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#FFF" }}>{disponivelReal.toFixed(1)}m</div>
          </div>
        </div>

        <div style={{ fontSize: 12, color: "#555", marginBottom: 16 }}>
          Preenche "Metros usado" de cada cliente abaixo e marca o que já cortou — depois me devolve essa folha (foto ou
          em mãos) pra eu dar baixa certinha no sistema.
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid #111" }}>Cliente</th>
              <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid #111" }}>Qtd</th>
              <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid #111" }}>Medida lançada</th>
              <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid #111" }}>Metros usado</th>
              <th style={{ textAlign: "center", padding: "6px 8px", borderBottom: "1px solid #111" }}>Feito</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((item, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? "#F7F5EF" : "#FFF" }}>
                <td style={{ padding: "8px", fontWeight: 600 }}>{item.cliente}</td>
                <td style={{ padding: "8px" }}>{item.qtd}</td>
                <td style={{ padding: "8px" }}>{item.metragem || "—"}</td>
                <td style={{ padding: "8px", borderBottom: "1px solid #CCC", minWidth: 90 }}>&nbsp;</td>
                <td style={{ padding: "8px", textAlign: "center" }}>
                  <span style={{ display: "inline-block", width: 16, height: 16, border: "1px solid #111" }}>&nbsp;</span>
                </td>
              </tr>
            ))}
            {lista.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: "10px 8px", color: "#888" }}>
                  Nenhum item pendente de baixa nesse código.
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
