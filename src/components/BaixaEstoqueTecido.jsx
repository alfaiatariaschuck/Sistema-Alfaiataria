import React, { useState } from "react";
import { PackageMinus } from "lucide-react";
import { BRASS, INK, TEXT_MUTED, inputStyle } from "../lib/constants";

// Só aparece quando o código do tecido bate com algum item rastreado no
// Estoque de Tecido — você digita quantos metros esse pedido específico
// usa e confirma com um clique; nada é descontado sozinho sem você
// confirmar (evita baixa duplicada ou por engano).
export default function BaixaEstoqueTecido({ codigo, estoque, onDarBaixa, motivo }) {
  const [metros, setMetros] = useState("");
  const [confirmado, setConfirmado] = useState(null);
  const [erro, setErro] = useState(null);

  const item = (estoque || []).find((e) => e.codigo.trim().toLowerCase() === (codigo || "").trim().toLowerCase());
  if (!item) return null;

  async function confirmar() {
    const valor = parseFloat(metros);
    if (!valor || valor <= 0) return;
    setErro(null);
    try {
      const novoSaldo = await onDarBaixa(item.id, valor, motivo);
      setConfirmado({ usado: valor, saldo: novoSaldo });
      setMetros("");
      setTimeout(() => setConfirmado(null), 6000);
    } catch (e) {
      setErro("Não consegui dar baixa (" + e.message + ").");
    }
  }

  return (
    <div className="mt-2 p-2" style={{ background: "#F3EEDF", borderRadius: 6, border: `1px dashed ${BRASS}` }}>
      <div className="flex items-center gap-1.5 mb-1.5" style={{ fontSize: 11, color: INK, fontWeight: 600 }}>
        <PackageMinus size={12} color={BRASS} /> Esse código tem estoque — saldo atual: {item.saldoMetros.toFixed(1)}m
      </div>
      {confirmado ? (
        <div style={{ fontSize: 11, color: "#2C6E31" }}>
          ✓ Baixa de {confirmado.usado.toFixed(1)}m registrada — restam {confirmado.saldo.toFixed(1)}m no estoque.
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <input
            type="number"
            step="0.1"
            placeholder="metros usados"
            style={{ ...inputStyle, padding: "5px 8px", fontSize: 12, width: 110 }}
            value={metros}
            onChange={(e) => setMetros(e.target.value)}
          />
          <button type="button" onClick={confirmar} style={{ background: BRASS, color: "#FFF", padding: "5px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
            Dar baixa
          </button>
        </div>
      )}
      {erro && <div style={{ fontSize: 11, color: "#9C4A1E", marginTop: 4 }}>{erro}</div>}
    </div>
  );
}
