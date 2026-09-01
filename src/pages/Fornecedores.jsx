import React, { useState } from "react";
import { Trash2, UserPlus } from "lucide-react";
import { Card, Empty, PageTitle } from "../components/ui";
import { BRASS, LINE, TEXT_MUTED, inputStyle } from "../lib/constants";

// Cadastro de fornecedores de tecido/aviamentos — alimenta os
// dropdowns de Compras e Aviamentos, sem precisar mexer em código
// toda vez que aparece um fornecedor novo.
export default function Fornecedores({ fornecedores, loading, onAdicionar, onCampo, onRemover }) {
  const [nomeNovo, setNomeNovo] = useState("");

  function adicionar() {
    if (!nomeNovo.trim()) return;
    onAdicionar(nomeNovo);
    setNomeNovo("");
  }

  return (
    <div>
      <PageTitle eyebrow="Cadastro — tecido e aviamentos" title="Fornecedores" />

      <Card style={{ padding: 16 }} className="mb-4">
        <div className="flex items-center gap-2">
          <input
            style={inputStyle}
            placeholder="Nome do fornecedor"
            value={nomeNovo}
            onChange={(e) => setNomeNovo(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && adicionar()}
          />
          <button
            onClick={adicionar}
            className="flex items-center gap-1.5"
            style={{ background: BRASS, color: "#FFF", padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}
          >
            <UserPlus size={15} /> Adicionar
          </button>
        </div>
      </Card>

      {loading && <div style={{ fontSize: 13, color: TEXT_MUTED }}>Carregando…</div>}

      {!loading && fornecedores.length === 0 && (
        <Card style={{ padding: 20 }}>
          <Empty texto="Nenhum fornecedor cadastrado ainda." />
        </Card>
      )}

      {!loading && fornecedores.length > 0 && (
        <Card style={{ padding: 0, overflow: "hidden" }}>
          {fornecedores.map((f, i) => (
            <div
              key={f.id}
              className="flex items-center gap-3 px-4 py-3"
              style={{ borderBottom: i < fornecedores.length - 1 ? `1px solid ${LINE}` : "none" }}
            >
              <div style={{ fontWeight: 600, fontSize: 14, width: 180, flexShrink: 0 }}>{f.nome}</div>
              <input
                style={{ ...inputStyle, padding: "6px 10px", fontSize: 12 }}
                placeholder="Contato (telefone/WhatsApp)"
                value={f.contato}
                onChange={(e) => onCampo(f.id, "contato", e.target.value)}
              />
              <input
                style={{ ...inputStyle, padding: "6px 10px", fontSize: 12, flex: 1 }}
                placeholder="Observações"
                value={f.observacoes}
                onChange={(e) => onCampo(f.id, "observacoes", e.target.value)}
              />
              <button onClick={() => onRemover(f.id)} style={{ color: TEXT_MUTED, flexShrink: 0 }}>
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
