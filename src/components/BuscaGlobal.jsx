import React, { useState } from "react";
import { Search, X } from "lucide-react";
import { BRASS_SOFT, INK, LINE, TEXT_MUTED } from "../lib/constants";
import { fmtData } from "../lib/helpers";

// Busca rápida por cliente — acha em Pedidos (camisa) e Pedidos
// Alfaiataria (peça) ao mesmo tempo e já leva direto pro registro,
// sem precisar entrar aba por aba procurando.
export default function BuscaGlobal({ pedidos, pecas, irPara, irParaPeca }) {
  const [query, setQuery] = useState("");
  const [aberto, setAberto] = useState(false);

  const termo = query.trim().toLowerCase();
  const resultados =
    termo.length < 2
      ? []
      : [
          ...pedidos
            .filter((p) => p.cliente.toLowerCase().includes(termo))
            .map((p) => ({ id: p.id, tipo: "camisa", cliente: p.cliente, sub: "Camisa", data: p.dataPedido })),
          ...(pecas || [])
            .filter((p) => p.cliente.toLowerCase().includes(termo))
            .map((p) => ({ id: p.id, tipo: "peca", cliente: p.cliente, sub: p.tipoPeca, data: p.dataPedido })),
        ]
          .sort((a, b) => (b.data || "").localeCompare(a.data || ""))
          .slice(0, 8);

  function abrir(r) {
    if (r.tipo === "camisa") irPara(r.id);
    else irParaPeca(r.id);
    setQuery("");
    setAberto(false);
  }

  return (
    <div style={{ position: "relative", width: "100%", maxWidth: 340 }}>
      <div className="flex items-center gap-2" style={{ background: "#FCFAF5", border: `1px solid ${LINE}`, borderRadius: 8, padding: "7px 10px" }}>
        <Search size={14} color={TEXT_MUTED} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setAberto(true)}
          onBlur={() => setTimeout(() => setAberto(false), 120)}
          placeholder="Buscar cliente…"
          style={{ border: "none", outline: "none", background: "transparent", width: "100%", fontSize: 13, color: INK }}
        />
        {query && (
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => setQuery("")}>
            <X size={13} color={TEXT_MUTED} />
          </button>
        )}
      </div>

      {aberto && termo.length >= 2 && (
        <div
          className="mt-1"
          style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#FFF", border: `1px solid ${LINE}`, borderRadius: 8, boxShadow: "0 8px 24px rgba(22,33,46,0.15)", zIndex: 40, maxHeight: 320, overflowY: "auto" }}
        >
          {resultados.length === 0 && <div style={{ padding: "12px 14px", fontSize: 12, color: TEXT_MUTED }}>Nada encontrado.</div>}
          {resultados.map((r) => (
            <button
              key={r.tipo + "-" + r.id}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => abrir(r)}
              className="w-full flex items-center justify-between px-3.5 py-2.5"
              style={{ borderBottom: `1px solid ${LINE}`, textAlign: "left" }}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: INK }}>{r.cliente}</div>
                <div style={{ fontSize: 11, color: TEXT_MUTED }}>
                  {r.sub} · {fmtData(r.data)}
                </div>
              </div>
              <span style={{ fontSize: 10, fontWeight: 600, color: "#A9793E", background: BRASS_SOFT, padding: "2px 6px", borderRadius: 4 }}>
                {r.tipo === "camisa" ? "Camisaria" : "Alfaiataria"}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
