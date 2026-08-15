import React, { useState } from "react";
import { Search } from "lucide-react";
import { Card, Empty, PageTitle, Pill } from "../components/ui";
import { BRASS, BRASS_SOFT, LINE, STATUS_STYLE, TEXT_MUTED, inputStyle } from "../lib/constants";
import { brl, fmtData } from "../lib/helpers";

export default function Clientes({ clientes, irParaPedido }) {
  const [busca, setBusca] = useState("");
  const filtrados = clientes.filter((c) => c.nome.toLowerCase().includes(busca.toLowerCase()));

  return (
    <div>
      <PageTitle eyebrow={`${clientes.length} clientes`} title="Clientes" />
      <div className="flex items-center gap-2 mb-4" style={{ ...inputStyle, maxWidth: 320, padding: "6px 10px" }}>
        <Search size={14} color={TEXT_MUTED} />
        <input
          placeholder="Buscar cliente…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          style={{ border: "none", outline: "none", background: "transparent", width: "100%", fontSize: 14 }}
        />
      </div>
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
        {filtrados.map((c) => {
          const totalCamisas = c.pedidos.reduce((s, p) => s + (parseFloat(p.quantidade) || 0), 0);
          const maisRecente = [...c.pedidos].sort((a, b) => (b.dataPedido || "").localeCompare(a.dataPedido || ""))[0];
          const devidoFabiana = c.pedidos
            .filter((p) => p.pagoFabiana.statusPagamento === "Pendente" && parseFloat(p.pagoFabiana.valor) > 0)
            .reduce((s, p) => s + parseFloat(p.pagoFabiana.valor), 0);
          return (
            <Card key={c.nome} style={{ padding: 18 }}>
              <div className="flex items-center justify-between mb-1">
                <div style={{ fontWeight: 600, fontSize: 15 }}>{c.nome}</div>
                {c.pedidos.length > 1 && <Pill text="↻ recompra" style={{ bg: BRASS_SOFT, fg: BRASS }} />}
              </div>
              <div className="flex items-center gap-3 mb-2" style={{ fontSize: 12, color: TEXT_MUTED }}>
                <span>{c.pedidos.length} pedido(s)</span>
                <span>·</span>
                <span className="fx-mono">{totalCamisas} camisa(s) no total</span>
              </div>
              {maisRecente && (
                <div className="flex items-center gap-2 mb-2">
                  <span style={{ fontSize: 11, color: TEXT_MUTED }}>Status atual:</span>
                  <Pill text={maisRecente.status} style={STATUS_STYLE[maisRecente.status]} />
                </div>
              )}
              {devidoFabiana > 0 && (
                <div className="mb-2" style={{ fontSize: 12, color: "#9C4A1E" }}>
                  Devendo à Fabiana: <strong>{brl(devidoFabiana)}</strong>
                </div>
              )}
              {c.pedidos.slice(0, 3).map((p) => (
                <button
                  key={p.id}
                  onClick={() => irParaPedido(p.id)}
                  className="w-full flex items-center justify-between py-1.5"
                  style={{ borderTop: `1px solid ${LINE}` }}
                >
                  <span style={{ fontSize: 12 }}>{fmtData(p.dataPedido)}</span>
                  <Pill text={p.status} style={STATUS_STYLE[p.status]} />
                </button>
              ))}
            </Card>
          );
        })}
        {filtrados.length === 0 && <Empty texto="Nenhum cliente ainda — cadastre um pedido novo." />}
      </div>
    </div>
  );
}
