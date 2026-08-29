import React from "react";
import { Printer, X } from "lucide-react";
import { fmtData, hojeISO, diasAte } from "../lib/helpers";
import { imprimirComNome } from "../lib/imprimirFicha";

const DIAS_LIMITE = 40;

// Relatório pra Fabi se organizar na produção: pedidos de camisa em aberto,
// do mais antigo (mais urgente) pro mais novo — igual à ordem que já usamos
// na tela de Pedidos, só que impresso/exportável em PDF pra mandar pra ela.
export default function CronogramaImprimivel({ itens, onFechar }) {
  function imprimir() {
    imprimirComNome(`Cronograma de Produção - Camisaria - ${fmtData(hojeISO())}`);
  }

  const atrasados = itens.filter((p) => -diasAte(p.dataPedido) > DIAS_LIMITE).length;
  const totalCamisas = itens.reduce((s, p) => s + (parseFloat(p.quantidade) || 0), 0);

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
          <div style={{ fontSize: 13, color: "#555", marginTop: 2 }}>Cronograma de Produção — Camisaria (pra Fabi)</div>
          <div style={{ fontSize: 12, color: "#555" }}>
            Do mais antigo (mais urgente) pro mais novo · gerado em {fmtData(hojeISO())}
          </div>
        </div>

        <div className="grid gap-2 mb-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", fontSize: 13 }}>
          <div>
            <div style={{ fontSize: 11, color: "#777" }}>Pedidos em aberto</div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{itens.length}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#777" }}>Camisas em aberto</div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{totalCamisas}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#777" }}>Atrasados (+{DIAS_LIMITE}d)</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: atrasados > 0 ? "#9C4A1E" : "#111" }}>{atrasados}</div>
          </div>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "5px 8px", borderBottom: "1px solid #111" }}>Pedido</th>
              <th style={{ textAlign: "left", padding: "5px 8px", borderBottom: "1px solid #111" }}>Cliente</th>
              <th style={{ textAlign: "right", padding: "5px 8px", borderBottom: "1px solid #111" }}>Qtd</th>
              <th style={{ textAlign: "right", padding: "5px 8px", borderBottom: "1px solid #111" }}>Dias em aberto</th>
              <th style={{ textAlign: "left", padding: "5px 8px", borderBottom: "1px solid #111" }}>Status</th>
              <th style={{ textAlign: "left", padding: "5px 8px", borderBottom: "1px solid #111" }}>Previsão</th>
              <th style={{ textAlign: "left", padding: "5px 8px", borderBottom: "1px solid #111" }}>Obs.</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((p, i) => {
              const diasAberto = -diasAte(p.dataPedido);
              const atrasado = diasAberto > DIAS_LIMITE;
              return (
                <tr key={p.id} style={{ background: i % 2 === 0 ? "#F7F5EF" : "#FFF" }}>
                  <td style={{ padding: "5px 8px" }}>{fmtData(p.dataPedido)}</td>
                  <td style={{ padding: "5px 8px", fontWeight: 600 }}>
                    {p.cliente || "—"}
                    {p.medidasNovas && (
                      <span style={{ marginLeft: 6, color: "#9C4A1E", fontWeight: 700 }} title="Medidas novas — não usar medida anterior">
                        ⚠ medidas novas
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "5px 8px", textAlign: "right" }}>{parseFloat(p.quantidade) || 0}</td>
                  <td style={{ padding: "5px 8px", textAlign: "right", fontWeight: atrasado ? 700 : 400, color: atrasado ? "#9C4A1E" : "#111" }}>
                    {diasAberto}d{atrasado ? " ⚠" : ""}
                  </td>
                  <td style={{ padding: "5px 8px" }}>{p.status}</td>
                  <td style={{ padding: "5px 8px" }}>{p.previsaoEntrega ? fmtData(p.previsaoEntrega) : "—"}</td>
                  <td style={{ padding: "5px 8px", fontSize: 11, color: "#555" }}>{p.observacoes || ""}</td>
                </tr>
              );
            })}
            {itens.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: "10px 8px", color: "#888" }}>
                  Nenhum pedido em aberto no momento.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
