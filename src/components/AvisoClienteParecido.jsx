import React from "react";
import { AlertTriangle } from "lucide-react";
import { nomeParecidoExistente } from "../lib/clientes";

const AMARELO_BG = "#FFF7E0";
const AMARELO_LINHA = "#E0B24A";
const AMARELO_TEXTO = "#5C4813";

// Avisa quando o nome digitado é PARECIDO (não igual) com um cliente já
// cadastrado — o caso clássico de erro de digitação (ex: "Edosn" em vez
// de "Edson") que faz o sistema achar que é gente nova e criar um
// cadastro duplicado, sem ninguém perceber na hora.
export default function AvisoClienteParecido({ nome, nomesClientes, onEscolher }) {
  const parecido = nomeParecidoExistente(nome, nomesClientes);
  if (!parecido) return null;

  return (
    <div
      className="flex items-center justify-between gap-2 flex-wrap mt-1 mb-2"
      style={{ background: AMARELO_BG, border: `1px solid ${AMARELO_LINHA}`, borderRadius: 6, padding: "6px 10px" }}
    >
      <div className="flex items-center gap-1.5" style={{ fontSize: 11, color: AMARELO_TEXTO }}>
        <AlertTriangle size={12} color={AMARELO_TEXTO} />
        Já existe um cliente parecido: <strong>{parecido.nome}</strong> — é esse?
      </div>
      <button
        type="button"
        onClick={() => onEscolher(parecido.nome)}
        style={{ background: AMARELO_LINHA, color: "#FFF", padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}
      >
        Usar esse
      </button>
    </div>
  );
}
