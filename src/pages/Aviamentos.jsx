import React, { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Card, Empty, PageTitle } from "../components/ui";
import { BRASS, LINE, TEXT_MUTED, inputStyle } from "../lib/constants";
import { brl } from "../lib/helpers";

// Custo de aviamentos (botão, forro, zíper, entretela...) por peça-base
// — diferente do tecido (que varia por pedido, ver Compras), aviamento
// é fixo por tipo de peça. Alimenta o custo de produção real em Custos
// do Ateliê. Peças de venda compostas (Costume = Paletó+Calça, por
// exemplo) somam os aviamentos das peças-base que as formam.
export default function Aviamentos({ itens, loading, fornecedores, onAdicionar, onCampo, onRemover }) {
  const [novaPecaBase, setNovaPecaBase] = useState("");

  const grupos = new Map();
  itens.forEach((i) => {
    if (!grupos.has(i.pecaBase)) grupos.set(i.pecaBase, []);
    grupos.get(i.pecaBase).push(i);
  });

  function criarPecaBase() {
    const nome = novaPecaBase.trim();
    if (!nome) return;
    onAdicionar(nome);
    setNovaPecaBase("");
  }

  return (
    <div>
      <PageTitle eyebrow="Custo de produção — por peça-base" title="Aviamentos" />

      <Card style={{ padding: 16 }} className="mb-4">
        <div className="flex items-center gap-2">
          <input
            style={inputStyle}
            placeholder="Nova peça-base (ex: Paletó, Calça, Colete)"
            value={novaPecaBase}
            onChange={(e) => setNovaPecaBase(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && criarPecaBase()}
          />
          <button
            onClick={criarPecaBase}
            className="flex items-center gap-1.5"
            style={{ background: BRASS, color: "#FFF", padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}
          >
            <Plus size={15} /> Nova peça-base
          </button>
        </div>
      </Card>

      {loading && <div style={{ fontSize: 13, color: TEXT_MUTED }}>Carregando…</div>}

      {!loading && grupos.size === 0 && (
        <Card style={{ padding: 20 }}>
          <Empty texto="Nenhum aviamento cadastrado ainda." />
        </Card>
      )}

      {[...grupos.entries()].map(([pecaBase, lista]) => {
        const total = lista.reduce((s, i) => s + (parseFloat(i.qtdPorPeca) || 0) * (parseFloat(i.valorUnitario) || 0), 0);
        return (
          <Card key={pecaBase} style={{ padding: 0, marginBottom: 16, overflow: "hidden" }}>
            <div className="flex items-center justify-between px-4 py-3" style={{ background: "#F7F4EC", borderBottom: `1px solid ${LINE}` }}>
              <span className="fx-serif" style={{ fontSize: 14, fontWeight: 600 }}>{pecaBase}</span>
              <span className="fx-mono" style={{ fontSize: 13, fontWeight: 700, color: BRASS }}>{brl(total)} / peça</span>
            </div>
            {lista.map((item) => (
              <div key={item.id} className="flex items-center gap-2 px-4 py-2 flex-wrap" style={{ borderBottom: `1px solid ${LINE}` }}>
                <input
                  style={{ ...inputStyle, padding: "5px 8px", fontSize: 12, flex: "2 1 160px" }}
                  placeholder="Item (ex: Botões)"
                  value={item.item}
                  onChange={(e) => onCampo(item.id, "item", e.target.value)}
                />
                <input
                  style={{ ...inputStyle, padding: "5px 8px", fontSize: 12, width: 70 }}
                  placeholder="un/m/par"
                  value={item.unidade}
                  onChange={(e) => onCampo(item.id, "unidade", e.target.value)}
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  style={{ ...inputStyle, padding: "5px 8px", fontSize: 12, width: 70 }}
                  placeholder="Qtd"
                  value={item.qtdPorPeca}
                  onChange={(e) => onCampo(item.id, "qtdPorPeca", e.target.value)}
                  title="Quantidade por peça"
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  style={{ ...inputStyle, padding: "5px 8px", fontSize: 12, width: 90 }}
                  placeholder="Valor unit."
                  value={item.valorUnitario}
                  onChange={(e) => onCampo(item.id, "valorUnitario", e.target.value)}
                />
                <select
                  value={item.fornecedor}
                  onChange={(e) => onCampo(item.id, "fornecedor", e.target.value)}
                  style={{ ...inputStyle, padding: "5px 8px", fontSize: 12, width: 130 }}
                >
                  <option value="">Fornecedor</option>
                  {fornecedores.map((f) => (
                    <option key={f.id} value={f.nome}>{f.nome}</option>
                  ))}
                </select>
                <span className="fx-mono" style={{ fontSize: 12, color: TEXT_MUTED, width: 80, textAlign: "right" }}>
                  {brl((parseFloat(item.qtdPorPeca) || 0) * (parseFloat(item.valorUnitario) || 0))}
                </span>
                <button onClick={() => onRemover(item.id)} style={{ color: TEXT_MUTED, flexShrink: 0 }}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <button
              onClick={() => onAdicionar(pecaBase)}
              className="flex items-center gap-1.5 px-4 py-2"
              style={{ color: BRASS, fontSize: 12, fontWeight: 600 }}
            >
              <Plus size={13} /> Adicionar item
            </button>
          </Card>
        );
      })}
    </div>
  );
}
