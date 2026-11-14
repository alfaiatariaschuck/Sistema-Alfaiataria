import React from "react";

// Veredito rápido sobre a margem de uma venda — pensado pro Tales poder
// julgar "essa venda vale a pena?" de relance, sem precisar olhar os
// números (que ficam escondidos quando "Modo apresentação" está ligado,
// na frente do cliente). Faixas confirmadas por ele em 14/11/2026.
export function veredictoMargem(margemPercentual) {
  if (margemPercentual == null || isNaN(margemPercentual)) return null;
  if (margemPercentual >= 60) return { texto: "Pode vender", bg: "#DCEBDD", fg: "#2C6E31" };
  if (margemPercentual >= 55) return { texto: "Não aprovado", bg: "#F6E3D9", fg: "#9C4A1E" };
  return { texto: "Não autorizado", bg: "#9C2B2B", fg: "#FFFFFF" };
}

export default function SeloMargem({ margemPercentual, style }) {
  const v = veredictoMargem(margemPercentual);
  if (!v) return null;
  return (
    <span
      className="fx-mono"
      style={{ background: v.bg, color: v.fg, padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, letterSpacing: 0.3, ...style }}
    >
      {v.texto}
    </span>
  );
}
