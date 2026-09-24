import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Printer } from "lucide-react";
import { inputStyle } from "../lib/constants";
import { fmtData, hojeISO } from "../lib/helpers";
import { imprimirComNome } from "../lib/imprimirFicha";

// Ficha simples pra mandar pro fornecedor externo dos sapatos — só o que
// a fábrica precisa pra produzir e gravar certo: modelo, numeração e o
// nome exato da personalização (não é o mesmo texto da ficha do Ícaro,
// que é interna e tem medida/tecido — aqui não tem nada disso).
export default function FichaImprimivelSapatos({ pedido: p, onFechar }) {
  const [mostrarTexto, setMostrarTexto] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (mostrarTexto && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [mostrarTexto]);

  function imprimir() {
    imprimirComNome(`Pedido Fabrica - ${p.cliente || "cliente"} - ${p.modelo}`);
  }

  function textoFicha() {
    const linhas = [];
    linhas.push(`*PEDIDO — ${p.modelo.toUpperCase()}*`);
    linhas.push(`Referência interna: ${p.cliente || "—"}`);
    linhas.push(`Material: ${p.material || "—"}`);
    linhas.push(`Cor: ${p.cor || "—"}`);
    linhas.push(`Numeração: ${p.numeracao || "—"}`);
    linhas.push(`Quantidade: ${p.quantidade || 1}`);
    if (p.personalizacao) linhas.push(`Personalização (gravar): ${p.personalizacao}`);
    if (p.observacoes) {
      linhas.push(``);
      linhas.push(`Observações: ${p.observacoes}`);
    }
    return linhas.join("\n");
  }

  return createPortal(
    <div className="ficha-overlay" style={{ position: "fixed", inset: 0, background: "rgba(22,33,46,0.6)", zIndex: 50, overflow: "auto" }}>
      <div className="no-print" style={{ maxWidth: 720, margin: "0 auto", padding: "16px 16px 0" }}>
        <div style={{ background: "#FFF", borderRadius: 10, padding: 16, marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, color: "#16212E" }}>Opção mais simples (funciona em qualquer lugar)</div>
          <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 8 }}>
            Toque no botão, o texto já aparece selecionado — é só copiar e colar no WhatsApp ou e-mail da fábrica.
          </div>
          <button
            onClick={() => setMostrarTexto((v) => !v)}
            className="flex items-center gap-2 mb-2"
            style={{ background: "#25D366", color: "#FFF", padding: "10px 18px", borderRadius: 8, fontWeight: 600, fontSize: 13 }}
          >
            📋 {mostrarTexto ? "Ocultar texto do pedido" : "Ver e copiar texto do pedido"}
          </button>
          {mostrarTexto && (
            <textarea
              ref={textareaRef}
              readOnly
              value={textoFicha()}
              onClick={(e) => e.target.select()}
              style={{ ...inputStyle, minHeight: 160, fontSize: 12, marginBottom: 16 }}
              className="fx-mono"
            />
          )}

          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: "#16212E" }}>
            Opção em PDF (funciona melhor no computador ou no navegador do celular)
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={imprimir}
              className="flex items-center gap-2"
              style={{ background: "#16212E", color: "#FFF", padding: "9px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13 }}
            >
              <Printer size={15} /> Salvar como PDF
            </button>
            <button
              onClick={onFechar}
              style={{ background: "transparent", border: `1px solid #E4DECF`, color: "#16212E", padding: "9px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13 }}
            >
              <X size={14} className="inline mr-1" /> Fechar
            </button>
          </div>
        </div>
      </div>

      <div id="ficha-print" style={{ background: "#FFF", maxWidth: 720, margin: "0 auto 40px", padding: 40, color: "#111", fontFamily: "'Inter', sans-serif" }}>
        <div style={{ borderBottom: "2px solid #111", paddingBottom: 12, marginBottom: 20 }}>
          <div className="fx-serif" style={{ fontSize: 22, fontWeight: 700 }}>
            Pedido — {p.modelo}
          </div>
          <div style={{ fontSize: 12, color: "#555" }}>
            Gerado em {fmtData(hojeISO())} · Referência interna: {p.cliente || "—"}
          </div>
        </div>

        {p.personalizacao && (
          <div style={{ background: "#F3EEDF", border: "2px solid #A9793E", borderRadius: 6, padding: "12px 16px", marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: "#A9793E", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>Personalização (gravar)</div>
            <div className="fx-serif" style={{ fontSize: 20, fontWeight: 700 }}>{p.personalizacao}</div>
          </div>
        )}

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginBottom: 20 }}>
          <tbody>
            {[
              ["Modelo", p.modelo || "—"],
              ["Material", p.material || "—"],
              ["Cor", p.cor || "—"],
              ["Numeração", p.numeracao || "—"],
              ["Quantidade", p.quantidade || 1],
            ].map(([label, valor], i) => (
              <tr key={label} style={{ background: i % 2 === 0 ? "#F7F5EF" : "#FFF" }}>
                <td style={{ padding: "7px 10px", fontWeight: 600, width: "35%" }}>{label}</td>
                <td style={{ padding: "7px 10px" }}>{valor}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {p.observacoes && (
          <>
            <div className="fx-serif mb-2" style={{ fontSize: 15, fontWeight: 700, borderBottom: "1px solid #ccc", paddingBottom: 4 }}>
              Observações
            </div>
            <div style={{ fontSize: 12, whiteSpace: "pre-wrap" }}>{p.observacoes}</div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
