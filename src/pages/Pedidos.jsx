import React, { useState } from "react";
import { ChevronRight, Search } from "lucide-react";
import { Card, Empty, PageTitle, Pill } from "../components/ui";
import { LINE, STATUS, STATUS_STYLE, TEXT_MUTED, inputStyle } from "../lib/constants";
import { fmtData } from "../lib/helpers";
import DetalhePedido from "./DetalhePedido";

export default function Pedidos({ pedidos, selecionado, setSelecionado, ...acoes }) {
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("Todos");

  const filtrados = pedidos.filter((p) => {
    const bateBusca = p.cliente.toLowerCase().includes(busca.toLowerCase());
    const bateStatus = filtroStatus === "Todos" || p.status === filtroStatus;
    return bateBusca && bateStatus;
  });

  const atual = pedidos.find((p) => p.id === selecionado);

  if (atual) {
    return <DetalhePedido pedido={atual} onVoltar={() => setSelecionado(null)} {...acoes} />;
  }

  return (
    <div>
      <PageTitle eyebrow={`${pedidos.length} lançamentos`} title="Pedidos" />
      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <div className="flex items-center gap-2 flex-1" style={{ ...inputStyle, padding: "6px 10px" }}>
          <Search size={14} color={TEXT_MUTED} />
          <input
            placeholder="Buscar cliente…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            style={{ border: "none", outline: "none", background: "transparent", width: "100%", fontSize: 14 }}
          />
        </div>
        <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} style={{ ...inputStyle, maxWidth: 220 }}>
          <option>Todos</option>
          {STATUS.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>

      <Card>
        {filtrados.length === 0 && (
          <div className="p-6">
            <Empty texto="Nenhum pedido encontrado." />
          </div>
        )}
        {filtrados.map((p, i) => (
          <button
            key={p.id}
            onClick={() => setSelecionado(p.id)}
            className="w-full flex items-center justify-between px-5 py-3.5 text-left"
            style={{ borderBottom: i < filtrados.length - 1 ? `1px solid ${LINE}` : "none" }}
          >
            <div>
              <div className="flex items-center gap-1.5">
                <span style={{ fontWeight: 600, fontSize: 14 }}>{p.cliente || "Sem nome"}</span>
                {p.recompra && (
                  <span style={{ color: "#A9793E", fontSize: 12 }} title="Cliente recompra">
                    ↻
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12, color: TEXT_MUTED }}>
                Pedido {fmtData(p.dataPedido)} · Entrega prevista {fmtData(p.previsaoEntrega)}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Pill text={p.status} style={STATUS_STYLE[p.status]} />
              <ChevronRight size={16} color={TEXT_MUTED} />
            </div>
          </button>
        ))}
      </Card>
    </div>
  );
}
