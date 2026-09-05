import React, { useState } from "react";
import { Pencil } from "lucide-react";
import { BRASS, TEXT_MUTED, inputStyle } from "../lib/constants";

// Título do cliente com opção de correção inline — pra erro de digitação
// no lançamento (ex: vendedor digitou o nome errado), sem precisar mexer
// no banco. Corrige em cascata em todo lugar que exibe esse cliente
// (pedidos, peças, Clientes), já que tudo é ligado pelo clienteId.
export default function EditarNomeCliente({ clienteId, nome, onRenomear }) {
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(nome);
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    const novoNome = valor.trim();
    if (!novoNome || novoNome === nome) {
      setEditando(false);
      return;
    }
    setSalvando(true);
    try {
      await onRenomear(clienteId, novoNome);
      setEditando(false);
    } catch (e) {
      alert(
        e?.message?.includes("duplicate") || e?.code === "23505"
          ? "Já existe um cliente cadastrado com esse nome — parece duplicidade de verdade, não só erro de digitação. Esse caso precisa mesclar os pedidos manualmente."
          : "Não deu pra salvar o nome novo. Tenta de novo."
      );
    } finally {
      setSalvando(false);
    }
  }

  if (editando) {
    return (
      <span className="flex items-center gap-1.5 flex-wrap">
        <input
          autoFocus
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") salvar();
            if (e.key === "Escape") setEditando(false);
          }}
          style={{ ...inputStyle, fontSize: 18, fontWeight: 600, padding: "4px 8px", width: 260 }}
        />
        <button type="button" onClick={salvar} disabled={salvando} style={{ color: BRASS, fontSize: 12, fontWeight: 700 }}>
          {salvando ? "salvando…" : "Salvar"}
        </button>
        <button type="button" onClick={() => setEditando(false)} style={{ color: TEXT_MUTED, fontSize: 12 }}>
          Cancelar
        </button>
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1.5">
      <h1 className="fx-serif" style={{ fontSize: 26, fontWeight: 600 }}>
        {nome}
      </h1>
      {onRenomear && (
        <button
          type="button"
          onClick={() => {
            setValor(nome);
            setEditando(true);
          }}
          title="Corrigir nome do cliente"
          style={{ color: TEXT_MUTED }}
        >
          <Pencil size={14} />
        </button>
      )}
    </span>
  );
}
