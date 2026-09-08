import React, { useEffect, useMemo, useRef, useState } from "react";
import { BRASS_SOFT, CARD, INK, LINE, TEXT_MUTED, inputStyle } from "../lib/constants";

// Substitui o <input list><datalist> nativo — em muitos celulares
// (sobretudo Android/Chrome) o dropdown de sugestões do datalist
// simplesmente não abre, então o nome digitado nunca aparece como opção
// mesmo já estando cadastrado. Aqui o dropdown é feito na mão (lista
// filtrada por substring, abaixo do campo) e funciona igual em qualquer
// navegador/dispositivo.
export default function CampoAutocomplete({ value, onChange, opcoes, placeholder, required, style }) {
  const [aberto, setAberto] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function aoClicarFora(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setAberto(false);
    }
    document.addEventListener("mousedown", aoClicarFora);
    document.addEventListener("touchstart", aoClicarFora);
    return () => {
      document.removeEventListener("mousedown", aoClicarFora);
      document.removeEventListener("touchstart", aoClicarFora);
    };
  }, []);

  const filtradas = useMemo(() => {
    const termo = (value || "").trim().toLowerCase();
    const lista = opcoes || [];
    const base = termo ? lista.filter((n) => n.toLowerCase().includes(termo)) : lista;
    return base.slice(0, 30);
  }, [value, opcoes]);

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <input
        style={{ ...inputStyle, ...style }}
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setAberto(true)}
      />
      {aberto && filtradas.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 2px)",
            left: 0,
            right: 0,
            zIndex: 20,
            background: CARD,
            border: `1px solid ${LINE}`,
            borderRadius: 6,
            maxHeight: 200,
            overflowY: "auto",
            boxShadow: "0 6px 16px rgba(0,0,0,0.12)",
          }}
        >
          {filtradas.map((n) => (
            <div
              key={n}
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(n);
                setAberto(false);
              }}
              style={{ padding: "8px 10px", fontSize: 13, color: INK, cursor: "pointer" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = BRASS_SOFT)}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              {n}
            </div>
          ))}
        </div>
      )}
      {aberto && (value || "").trim() && filtradas.length === 0 && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 2px)",
            left: 0,
            right: 0,
            zIndex: 20,
            background: CARD,
            border: `1px solid ${LINE}`,
            borderRadius: 6,
            padding: "8px 10px",
            fontSize: 12,
            color: TEXT_MUTED,
          }}
        >
          Nenhum cliente cadastrado com esse nome — pode digitar um nome novo.
        </div>
      )}
    </div>
  );
}
