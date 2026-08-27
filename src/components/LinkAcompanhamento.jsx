import React, { useState } from "react";
import { Link2 } from "lucide-react";
import { BRASS, INK } from "../lib/constants";

// Copia o link público de acompanhamento do pedido (sem login) — o dono
// manda esse link pro cliente pelo WhatsApp quando quiser, criando uma
// expectativa positiva sem precisar responder toda hora sobre prazo.
export default function LinkAcompanhamento({ tipo, pedidoId }) {
  const [copiado, setCopiado] = useState(false);
  const [erro, setErro] = useState(null);

  async function copiar() {
    setErro(null);
    try {
      const url = `${window.location.origin}/acompanhar/${tipo}/${pedidoId}`;
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 4000);
    } catch (e) {
      setErro("Não consegui copiar (" + e.message + ").");
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={copiar}
        className="flex items-center gap-2"
        style={{
          background: copiado ? "#2C6E31" : "#EDEAE0",
          color: copiado ? "#FFF" : INK,
          padding: "9px 16px",
          borderRadius: 8,
          fontWeight: 600,
          fontSize: 13,
          border: `1px solid ${copiado ? "#2C6E31" : BRASS}`,
        }}
      >
        <Link2 size={14} /> {copiado ? "Link copiado! Cole no WhatsApp do cliente" : "Copiar link de acompanhamento"}
      </button>
      {erro && (
        <div style={{ fontSize: 11, color: "#9C4A1E", marginTop: 4 }}>
          {erro}
        </div>
      )}
    </div>
  );
}
