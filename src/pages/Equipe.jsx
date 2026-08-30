import React, { useState } from "react";
import { Trash2, UserPlus } from "lucide-react";
import { Card, Empty, PageTitle } from "../components/ui";
import { BRASS, LINE, TEXT_MUTED, TIPOS_PECA, inputStyle } from "../lib/constants";

// Cadastro de quem produz (Ícaro + freelancers). "Ativo" é permanente;
// "Trabalhando hoje" é o que entra na conta da previsão de entrega
// (quantas peças dá pra tocar em paralelo) e no card do dashboard.
// Tipos de peça = especialidade (vazio = produz qualquer tipo) — usado
// pra separar a fila por quem realmente pode fazer aquela peça (ex:
// calça só conta a capacidade de quem faz calça).
export default function Equipe({ equipe, loading, onAdicionar, onCampo, onRemover }) {
  const [nomeNovo, setNomeNovo] = useState("");

  function adicionar() {
    if (!nomeNovo.trim()) return;
    onAdicionar(nomeNovo);
    setNomeNovo("");
  }

  function alternarTipo(m, tipo) {
    const atual = m.tiposPeca || [];
    const proximo = atual.includes(tipo) ? atual.filter((t) => t !== tipo) : [...atual, tipo];
    onCampo(m.id, "tiposPeca", proximo);
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
            <div key={m.id} className="px-4 py-3" style={{ borderBottom: i < equipe.length - 1 ? `1px solid ${LINE}` : "none", opacity: m.ativo ? 1 : 0.5 }}>
              <div className="flex items-center justify-between mb-2">
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

              <div className="flex flex-wrap items-center gap-4 mb-2">
                <label className="flex items-center gap-1.5" style={{ fontSize: 12, color: TEXT_MUTED }}>
                  Horas/dia
                  <input
                    type="number"
                    min="0"
                    max="24"
                    step="0.5"
                    value={m.horasPorDia}
                    onChange={(e) => onCampo(m.id, "horasPorDia", Number(e.target.value) || 0)}
                    style={{ ...inputStyle, width: 60, padding: "4px 6px", fontSize: 12 }}
                  />
                </label>
                <label className="flex items-center gap-1.5" style={{ fontSize: 12, color: TEXT_MUTED }}>
                  Dias/semana
                  <input
                    type="number"
                    min="0"
                    max="7"
                    value={m.diasPorSemana}
                    onChange={(e) => onCampo(m.id, "diasPorSemana", Number(e.target.value) || 0)}
                    style={{ ...inputStyle, width: 50, padding: "4px 6px", fontSize: 12 }}
                  />
                </label>
                <label className="flex items-center gap-1.5" style={{ fontSize: 12, color: TEXT_MUTED }}>
                  Pagamento
                  <select
                    value={m.tipoRemuneracao}
                    onChange={(e) => onCampo(m.id, "tipoRemuneracao", e.target.value)}
                    style={{ ...inputStyle, padding: "4px 6px", fontSize: 12 }}
                  >
                    <option value="">— não informado</option>
                    <option value="mensal">Mensal (salário fixo)</option>
                    <option value="diaria">Diária (freelancer)</option>
                  </select>
                </label>
                {m.tipoRemuneracao && (
                  <label className="flex items-center gap-1.5" style={{ fontSize: 12, color: TEXT_MUTED }}>
                    {m.tipoRemuneracao === "mensal" ? "Valor/mês (R$)" : "Valor/dia (R$)"}
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={m.valorRemuneracao}
                      onChange={(e) => onCampo(m.id, "valorRemuneracao", e.target.value)}
                      style={{ ...inputStyle, width: 90, padding: "4px 6px", fontSize: 12 }}
                    />
                  </label>
                )}
              </div>

              <div>
                <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 4 }}>
                  Faz (deixe tudo desmarcado pra "qualquer tipo"):
                </div>
                <div className="flex flex-wrap gap-3">
                  {TIPOS_PECA.map((tipo) => (
                    <label key={tipo} className="flex items-center gap-1" style={{ fontSize: 12, color: TEXT_MUTED }}>
                      <input type="checkbox" checked={(m.tiposPeca || []).includes(tipo)} onChange={() => alternarTipo(m, tipo)} />
                      {tipo}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
