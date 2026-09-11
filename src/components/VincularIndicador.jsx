import React, { useState } from "react";
import CampoAutocomplete from "./CampoAutocomplete";
import { BRASS, TEXT_MUTED, inputStyle } from "../lib/constants";
import { vincularIndicador } from "../lib/clientes";

// Vincula (ou cadastra do zero) quem indicou um cliente — pra contar
// no Ranking de Indicação. Cobre tanto o caso do nome já ter sido
// digitado no pedido mas sem CPF (só falta o CPF pra linkar por ID)
// quanto o de nunca ter sido capturado (cliente recompra — o campo
// "Como chegou até a Schuck" só aparece pra cliente novo — ou cliente
// antigo, de antes desse recurso existir). Usado tanto no perfil do
// cliente (Clientes.jsx) quanto direto na ficha do pedido
// (DetalhePedido.jsx/DetalhePeca.jsx), pra não depender de navegar até
// outra aba pra fazer esse ajuste.
export default function VincularIndicador({ clienteId, nomeAtual, nomesClientes, onVinculado }) {
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState(nomeAtual || "");
  const [cpf, setCpf] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function vincular() {
    if (!nome.trim()) return;
    setSalvando(true);
    try {
      await vincularIndicador(clienteId, nome, cpf);
      setAberto(false);
      setCpf("");
      onVinculado();
    } finally {
      setSalvando(false);
    }
  }

  if (!aberto) {
    return (
      <button type="button" onClick={() => setAberto(true)} style={{ color: BRASS, fontSize: 11, fontWeight: 600 }}>
        {nomeAtual ? `cadastrar CPF de ${nomeAtual} pra contar no Ranking` : "quem indicou esse cliente? cadastrar pro Ranking"}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap mt-1">
      {!nomeAtual && <CampoAutocomplete value={nome} onChange={setNome} opcoes={nomesClientes} placeholder="Nome de quem indicou" style={{ width: 160, padding: "5px 8px", fontSize: 12 }} />}
      <input
        style={{ ...inputStyle, width: 160, padding: "5px 8px", fontSize: 12 }}
        placeholder="CPF de quem indicou"
        value={cpf}
        onChange={(e) => setCpf(e.target.value)}
        autoFocus={!!nomeAtual}
      />
      <button
        type="button"
        onClick={vincular}
        disabled={salvando || !nome.trim()}
        style={{ background: "#2C6E31", color: "#FFF", padding: "5px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600, opacity: salvando || !nome.trim() ? 0.7 : 1 }}
      >
        {salvando ? "Vinculando…" : "Vincular"}
      </button>
      <button type="button" onClick={() => setAberto(false)} style={{ color: TEXT_MUTED, fontSize: 12 }}>
        cancelar
      </button>
    </div>
  );
}
