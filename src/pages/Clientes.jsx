import React, { useState } from "react";
import { Search } from "lucide-react";
import { Card, Empty, PageTitle, Pill } from "../components/ui";
import { LINE, STATUS_STYLE, TEXT_MUTED, inputStyle } from "../lib/constants";
import { fmtData } from "../lib/helpers";

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
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
        {filtrados.map((c) => (
          <Card key={c.nome} style={{ padding: 18 }}>
            <div className="flex items-center justify-between mb-2">
              <div style={{ fontWeight: 600, fontSize: 15 }}>{c.nome}</div>
              {c.pedidos.length > 1 && <Pill text="recompra" />}
            </div>
            <div style={{ fontSize: 12, color: TEXT_MUTED }} className="mb-3">
              {c.pedidos.length} pedido(s)
            </div>
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
        ))}
        {filtrados.length === 0 && <Empty texto="Nenhum cliente ainda — cadastre um pedido novo." />}
      </div>
    </div>
  );
}
