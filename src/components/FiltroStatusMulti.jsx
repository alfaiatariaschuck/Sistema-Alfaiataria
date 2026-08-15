import React from "react";
import { BRASS, BRASS_SOFT, INK, INK_SOFT, LINE } from "../lib/constants";

// Filtro de status por chips clicáveis — dá pra selecionar mais de um ao
// mesmo tempo. selecionados vazio (Set) = "Todos" (nenhum filtro aplicado).
export function FiltroStatusMulti({ opcoes, estilos, selecionados, onChange }) {
  function toggle(s) {
    const next = new Set(selecionados);
    if (next.has(s)) next.delete(s);
    else next.add(s);
    onChange(next);
  }
  const todosAtivos = selecionados.size === 0;

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onChange(new Set())}
        style={{
          padding: "5px 12px",
          borderRadius: 999,
          fontSize: 12,
          fontWeight: 600,
          border: `1px solid ${todosAtivos ? INK : LINE}`,
          background: todosAtivos ? INK : "#FFF",
          color: todosAtivos ? "#FFF" : INK_SOFT,
        }}
      >
        Todos
      </button>
      {opcoes.map((s) => {
        const ativo = selecionados.has(s);
        const style = (estilos && estilos[s]) || { bg: BRASS_SOFT, fg: BRASS };
        return (
          <button
            key={s}
            type="button"
            onClick={() => toggle(s)}
            style={{
              padding: "5px 12px",
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 600,
              border: `1px solid ${ativo ? style.fg : LINE}`,
              background: ativo ? style.bg : "#FFF",
              color: ativo ? style.fg : "#6B7280",
            }}
          >
            {s}
          </button>
        );
      })}
    </div>
  );
}
