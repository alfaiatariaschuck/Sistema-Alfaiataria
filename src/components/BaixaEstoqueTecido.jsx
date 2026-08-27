import React, { useState } from "react";
import { PackageMinus } from "lucide-react";
import { BRASS, INK, TEXT_MUTED, inputStyle } from "../lib/constants";

const VERDE = "#2C6E31";

// Só aparece quando o código do tecido bate com algum item rastreado no
// Estoque de Tecido. Uma vez dada a baixa, o valor fica gravado no próprio
// item do pedido (metrosBaixados) e o widget trava nesse estado — não dá
// pra clicar "Dar baixa" de novo pro mesmo item, mesmo reabrindo o pedido
// depois (era assim que o estoque ficava negativo: reabria e baixava de novo).
export default function BaixaEstoqueTecido({ codigo, estoque, onDarBaixa, motivo, metrosBaixados, onRegistrarMetrosBaixados }) {
  const [metros, setMetros] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(null);

  const item = (estoque || []).find((e) => e.codigo.trim().toLowerCase() === (codigo || "").trim().toLowerCase());
  if (!item) return null;

  const jaBaixado = metrosBaixados !== null && metrosBaixados !== undefined;

  async function confirmar() {
    const valor = parseFloat(metros);
    if (!valor || valor <= 0) return;
    setErro(null);
    setSalvando(true);
    try {
      await onDarBaixa(item.id, valor, motivo);
      await onRegistrarMetrosBaixados(valor);
      setMetros("");
    } catch (e) {
      setErro("Não consegui dar baixa (" + e.message + ").");
    } finally {
      setSalvando(false);
    }
  }

  if (jaBaixado) {
    return (
      <div className="mt-2 p-2" style={{ background: "#DCEBDD", borderRadius: 6, border: `1px dashed ${VERDE}` }}>
        <div className="flex items-center gap-1.5" style={{ fontSize: 11, color: VERDE, fontWeight: 600 }}>
          <PackageMinus size={12} color={VERDE} /> Baixa de {parseFloat(metrosBaixados).toFixed(1)}m já registrada neste item — saldo
          atual de {item.codigo}: {item.saldoMetros.toFixed(1)}m.
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2 p-2" style={{ background: "#F3EEDF", borderRadius: 6, border: `1px dashed ${BRASS}` }}>
      <div className="flex items-center gap-1.5 mb-1.5" style={{ fontSize: 11, color: INK, fontWeight: 600 }}>
        <PackageMinus size={12} color={BRASS} /> Esse código tem estoque — saldo atual: {item.saldoMetros.toFixed(1)}m
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          step="0.1"
          placeholder="metros usados"
          style={{ ...inputStyle, padding: "5px 8px", fontSize: 12, width: 110 }}
          value={metros}
          onChange={(e) => setMetros(e.target.value)}
        />
        <button
          type="button"
          onClick={confirmar}
          disabled={salvando}
          style={{ background: BRASS, color: "#FFF", padding: "5px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, opacity: salvando ? 0.7 : 1 }}
        >
          {salvando ? "Salvando…" : "Dar baixa"}
        </button>
      </div>
      {erro && <div style={{ fontSize: 11, color: "#9C4A1E", marginTop: 4 }}>{erro}</div>}
    </div>
  );
}
