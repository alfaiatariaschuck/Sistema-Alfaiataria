import React, { useState } from "react";
import { Field } from "./ui";
import { TEXT_MUTED, inputStyle } from "../lib/constants";

// Seleção com opção de digitar algo fora da lista ("Outro")
export function CampoComOpcoes({ label, obs, opcoes, valor, onChange }) {
  const [modoOutro, setModoOutro] = useState(!!valor && !opcoes.includes(valor));
  return (
    <Field label={label}>
      <select
        style={inputStyle}
        value={modoOutro ? "__outro__" : valor}
        onChange={(e) => {
          if (e.target.value === "__outro__") {
            setModoOutro(true);
            onChange("");
          } else {
            setModoOutro(false);
            onChange(e.target.value);
          }
        }}
      >
        <option value="">Selecione</option>
        {opcoes.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
        <option value="__outro__">Outro (digitar)</option>
      </select>
      {modoOutro && (
        <input style={{ ...inputStyle, marginTop: 6 }} placeholder="Digite aqui" value={valor} onChange={(e) => onChange(e.target.value)} />
      )}
      {obs && <span style={{ fontSize: 10, color: TEXT_MUTED }}>{obs}</span>}
    </Field>
  );
}

// Campo de característica: texto livre se não tiver "opcoes", senão seleção+Outro
export function CampoDescricao({ campo, valor, onChange }) {
  if (!campo.opcoes) {
    return (
      <Field label={campo.label}>
        <input style={inputStyle} value={valor} onChange={(e) => onChange(e.target.value)} />
      </Field>
    );
  }
  return <CampoComOpcoes label={campo.label} opcoes={campo.opcoes} obs={campo.obs} valor={valor} onChange={onChange} />;
}
