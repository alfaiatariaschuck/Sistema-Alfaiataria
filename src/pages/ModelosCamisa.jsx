import React, { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Card, Empty, PageTitle } from "../components/ui";
import { BRASS, LINE, TEXT_MUTED, inputStyle } from "../lib/constants";
import { brl, hojeISO } from "../lib/helpers";

const SEM_MODELO = "Sem tecido definido";

// Rótulo mostrado nas sugestões do pedido — código + nomenclatura
// quando o modelo tem código (ex: "M58 - 1001 — Tecido Nacional Fio 80
// CATA."), só a nomenclatura quando não tem.
export function rotuloModelo(m) {
  return m.codigo ? `${m.codigo} — ${m.nome}` : m.nome;
}

// Junta os pedidos (excluindo Doação) por tecido — quantidade e
// faturamento, pra saber quais tecidos/camisas mais vendem. Pedidos sem
// tecido preenchido caem no balde "Sem tecido definido", que serve de
// lembrete pra voltar e classificar.
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
  const [codigoNovo, setCodigoNovo] = useState("");
  const [nomeNovo, setNomeNovo] = useState("");
  const [valorRefNovo, setValorRefNovo] = useState("");
  const [periodo, setPeriodo] = useState("mes");

  function adicionar() {
    if (!nomeNovo.trim()) return;
    onAdicionar(nomeNovo, codigoNovo, valorRefNovo);
    setCodigoNovo("");
    setNomeNovo("");
    setValorRefNovo("");
  }

  const desde = periodo === "mes" ? hojeISO().slice(0, 7) + "-01" : periodo === "ano" ? hojeISO().slice(0, 4) + "-01-01" : null;
  const mix = useMemo(() => montarMix(pedidos, desde), [pedidos, desde]);

  return (
    <div>
      <PageTitle eyebrow="Camisaria — cadastro de tecidos" title="Tecidos de Camisa" />

      <Card style={{ padding: 16 }} className="mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <input
            style={{ ...inputStyle, width: 140 }}
            placeholder="Código (ex: M58 - 1001)"
            value={codigoNovo}
            onChange={(e) => setCodigoNovo(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && adicionar()}
          />
          <input
            style={{ ...inputStyle, flex: 1, minWidth: 180 }}
            placeholder="Nomenclatura (ex: Italiana Frotta e Zanone Fio 120)"
            value={nomeNovo}
            onChange={(e) => setNomeNovo(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && adicionar()}
          />
          <input
            type="number"
            min="0"
            step="0.01"
            style={{ ...inputStyle, width: 150 }}
            placeholder="Valor ref./m (R$)"
            value={valorRefNovo}
            onChange={(e) => setValorRefNovo(e.target.value)}
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
        <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 8 }}>
          Código e valor de referência são opcionais — deixe o valor em branco pra tecidos que variam muito de rolo
          pra rolo (ex: Cavalli); pra esses, continue lançando o valor real na hora da compra, em Compras. Tudo isso
          fica só de uso interno seu, nunca aparece pra Fabi nem no que vai pro contador.
        </div>
      </Card>

      {loading && <div style={{ fontSize: 13, color: TEXT_MUTED }}>Carregando…</div>}

      {!loading && modelos.length === 0 && (
        <Card style={{ padding: 20 }} className="mb-6">
          <Empty texto="Nenhum tecido cadastrado ainda." />
        </Card>
      )}

      {!loading && modelos.length > 0 && (
        <Card style={{ padding: 0, overflow: "hidden" }} className="mb-6">
          {modelos.map((m, i) => (
            <div
              key={m.id}
              className="flex items-center gap-2 px-4 py-3 flex-wrap"
              style={{ borderBottom: i < modelos.length - 1 ? `1px solid ${LINE}` : "none", opacity: m.ativo ? 1 : 0.5 }}
            >
              <input
                style={{ ...inputStyle, padding: "6px 10px", fontSize: 12, width: 130 }}
                placeholder="Código"
                value={m.codigo}
                onChange={(e) => onCampo(m.id, "codigo", e.target.value)}
              />
              <input
                style={{ ...inputStyle, padding: "6px 10px", fontSize: 13, fontWeight: 600, flex: 1, minWidth: 160 }}
                value={m.nome}
                onChange={(e) => onCampo(m.id, "nome", e.target.value)}
              />
              <input
                type="number"
                min="0"
                step="0.01"
                style={{ ...inputStyle, padding: "6px 10px", fontSize: 12, width: 120 }}
                placeholder="Varia"
                title="Valor de referência por metro — deixe em branco se varia muito"
                value={m.valorReferenciaMetro}
                onChange={(e) => onCampo(m.id, "valorReferenciaMetro", e.target.value)}
              />
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
            Mix de vendas por tecido
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
          Quantidade e faturamento de camisas vendidas (exclui Doação), agrupado pelo tecido marcado no pedido —
          quanto mais pedidos tiverem tecido preenchido, mais preciso fica.
        </div>
        {mix.length === 0 && <Empty texto="Nenhuma venda no período." />}
        {mix.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${LINE}` }}>
                  {["Tecido", "Qtd", "Faturamento", "% do total"].map((h) => (
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
