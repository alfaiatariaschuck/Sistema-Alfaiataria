import React, { useState } from "react";
import { Trash2, UserPlus } from "lucide-react";
import { Card, Empty, PageTitle } from "../components/ui";
import { BRASS, LINE, TEXT_MUTED, inputStyle } from "../lib/constants";

// Cadastro de quem produz (Ícaro + freelancers). "Ativo" é permanente;
// "Trabalhando hoje" é o que entra na conta da previsão de entrega
// (quantas peças dá pra tocar em paralelo) e no card do dashboard.
export default function Equipe({ equipe, loading, onAdicionar, onCampo, onRemover }) {
  const [nomeNovo, setNomeNovo] = useState("");

  function adicionar() {
    if (!nomeNovo.trim()) return;
    onAdicionar(nomeNovo);
    setNomeNovo("");
  }

  return (
    <div>
      <PageTitle eyebrow="Alfaiataria — produção" title="Equipe" />

      <Card style={{ padding: 16 }} className="mb-4">
        <div className="flex items-center gap-2">
          <input
            style={inputStyle}
            placeholder="Nome da pessoa (ex: Felipe)"
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

      {!loading && equipe.length === 0 && (
        <Card style={{ padding: 20 }}>
          <Empty texto="Ninguém cadastrado ainda." />
        </Card>
      )}

      {!loading && equipe.length > 0 && (
        <Card style={{ padding: 0, overflow: "hidden" }}>
          {equipe.map((m, i) => (
            <div
              key={m.id}
              className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: i < equipe.length - 1 ? `1px solid ${LINE}` : "none", opacity: m.ativo ? 1 : 0.5 }}
            >
              <div style={{ fontWeight: 600, fontSize: 14 }}>{m.nome}</div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5" style={{ fontSize: 12, color: TEXT_MUTED }}>
                  <input
                    type="checkbox"
                    checked={m.trabalhandoHoje}
                    disabled={!m.ativo}
                    onChange={(e) => onCampo(m.id, "trabalhandoHoje", e.target.checked)}
                  />
                  Trabalhando hoje
                </label>
                <label className="flex items-center gap-1.5" style={{ fontSize: 12, color: TEXT_MUTED }}>
                  <input type="checkbox" checked={m.ativo} onChange={(e) => onCampo(m.id, "ativo", e.target.checked)} />
                  Ativo
                </label>
                <button onClick={() => onRemover(m.id)} style={{ color: TEXT_MUTED }}>
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
