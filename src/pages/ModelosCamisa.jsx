import React, { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Card, Empty, PageTitle } from "../components/ui";
import { BRASS, LINE, TEXT_MUTED, inputStyle } from "../lib/constants";
import { brl, hojeISO } from "../lib/helpers";

const SEM_MODELO = "Sem modelo definido";

// Junta os pedidos (excluindo Doação) por modelo — quantidade e
// faturamento, pra saber quais modelos mais vendem. Pedidos sem modelo
// preenchido caem no balde "Sem modelo definido", que serve de lembrete
// pra voltar e classificar.
function montarMix(pedidos, desde) {
  const mapa = new Map();
  (pedidos || [])
    .filter((p) => p.status !== "Doação" && p.dataPedido && (!desde || p.dataPedido >= desde))
    .forEach((p) => {
      const nome = (p.modelo || "").trim() || SEM_MODELO;
      const atual = mapa.get(nome) || { nome, quantidade: 0, faturamento: 0 };
      atual.quantidade += parseFloat(p.quantidade) || 0;
      atual.faturamento += parseFloat(p.aReceber?.valor) || 0;
      mapa.set(nome, atual);
    });
  const linhas = [...mapa.values()].sort((a, b) => b.faturamento - a.faturamento);
  const totalFaturamento = linhas.reduce((s, l) => s + l.faturamento, 0);
  return linhas.map((l) => ({ ...l, percentual: totalFaturamento > 0 ? (l.faturamento / totalFaturamento) * 100 : 0 }));
}

export default function ModelosCamisa({ modelos, loading, pedidos, onAdicionar, onCampo, onRemover }) {
  const [nomeNovo, setNomeNovo] = useState("");
  const [periodo, setPeriodo] = useState("mes");

  function adicionar() {
    if (!nomeNovo.trim()) return;
    onAdicionar(nomeNovo);
    setNomeNovo("");
  }

  const desde = periodo === "mes" ? hojeISO().slice(0, 7) + "-01" : periodo === "ano" ? hojeISO().slice(0, 4) + "-01-01" : null;
  const mix = useMemo(() => montarMix(pedidos, desde), [pedidos, desde]);

  return (
    <div>
      <PageTitle eyebrow="Camisaria — o que você vende" title="Modelos de Camisa" />

      <Card style={{ padding: 16 }} className="mb-4">
        <div className="flex items-center gap-2">
          <input
            style={inputStyle}
            placeholder="Novo modelo (ex: Social Slim, Oxford, Casual)"
            value={nomeNovo}
            onChange={(e) => setNomeNovo(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && adicionar()}
          />
          <button
            onClick={adicionar}
            className="flex items-center gap-1.5"
            style={{ background: BRASS, color: "#FFF", padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}
          >
            <Plus size={15} /> Adicionar
          </button>
        </div>
      </Card>

      {loading && <div style={{ fontSize: 13, color: TEXT_MUTED }}>Carregando…</div>}

      {!loading && modelos.length === 0 && (
        <Card style={{ padding: 20 }} className="mb-6">
          <Empty texto="Nenhum modelo cadastrado ainda." />
        </Card>
      )}

      {!loading && modelos.length > 0 && (
        <Card style={{ padding: 0, overflow: "hidden" }} className="mb-6">
          {modelos.map((m, i) => (
            <div
              key={m.id}
              className="flex items-center gap-3 px-4 py-3"
              style={{ borderBottom: i < modelos.length - 1 ? `1px solid ${LINE}` : "none", opacity: m.ativo ? 1 : 0.5 }}
            >
              <div style={{ fontWeight: 600, fontSize: 14, flex: 1 }}>{m.nome}</div>
              <label className="flex items-center gap-1.5" style={{ cursor: "pointer", fontSize: 12, color: TEXT_MUTED }}>
                <input
                  type="checkbox"
                  checked={m.ativo}
                  onChange={(e) => onCampo(m.id, "ativo", e.target.checked)}
                  style={{ width: 14, height: 14, accentColor: BRASS }}
                />
                Ativo
              </label>
              <button onClick={() => onRemover(m.id)} style={{ color: TEXT_MUTED, flexShrink: 0 }}>
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </Card>
      )}

      <Card style={{ padding: 20 }}>
        <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
          <div className="fx-serif" style={{ fontSize: 15, fontWeight: 600 }}>
            Mix de vendas por modelo
          </div>
          <div className="flex gap-1">
            {[
              ["mes", "Este mês"],
              ["ano", "Este ano"],
              ["tudo", "Tudo"],
            ].map(([v, label]) => (
              <button
                key={v}
                onClick={() => setPeriodo(v)}
                style={{
                  padding: "5px 12px",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  background: periodo === v ? BRASS : "#EDEAE0",
                  color: periodo === v ? "#FFF" : TEXT_MUTED,
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 16 }}>
          Quantidade e faturamento de camisas vendidas (exclui Doação), agrupado pelo modelo marcado no pedido —
          quanto mais pedidos tiverem modelo preenchido, mais preciso fica.
        </div>
        {mix.length === 0 && <Empty texto="Nenhuma venda no período." />}
        {mix.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${LINE}` }}>
                  {["Modelo", "Qtd", "Faturamento", "% do total"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "6px 10px", fontWeight: 600, fontSize: 11, color: TEXT_MUTED, textTransform: "uppercase" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mix.map((l) => (
                  <tr key={l.nome} style={{ borderBottom: `1px solid ${LINE}` }}>
                    <td style={{ padding: "6px 10px", fontWeight: 600, color: l.nome === SEM_MODELO ? "#9C4A1E" : undefined }}>{l.nome}</td>
                    <td className="fx-mono" style={{ padding: "6px 10px" }}>{l.quantidade}</td>
                    <td className="fx-mono" style={{ padding: "6px 10px", fontWeight: 700 }}>{brl(l.faturamento)}</td>
                    <td className="fx-mono" style={{ padding: "6px 10px", color: BRASS }}>{l.percentual.toFixed(0)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
