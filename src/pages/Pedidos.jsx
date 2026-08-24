import React, { useState } from "react";
import { AlertTriangle, ChevronRight, Search } from "lucide-react";
import { Card, Empty, PageTitle, Pill } from "../components/ui";
import { FiltroStatusMulti } from "../components/FiltroStatusMulti";
import { LINE, STATUS, STATUS_STYLE, TEXT_MUTED, inputStyle } from "../lib/constants";
import { diasAte, fmtData } from "../lib/helpers";
import DetalhePedido from "./DetalhePedido";

const VERMELHO = "#9C4A1E";
const DIAS_LIMITE = 40;
const STATUS_ATIVOS = STATUS.filter((s) => s !== "Entregue");

export default function Pedidos({ pedidos, selecionado, setSelecionado, ...acoes }) {
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState(new Set());

  // Pedidos entregues saem daqui — ficam no histórico da aba Entregues.
  const filtrados = pedidos
    .filter((p) => p.status !== "Entregue")
    .filter((p) => {
      const bateBusca = p.cliente.toLowerCase().includes(busca.toLowerCase());
      const bateStatus = statusFiltro.size === 0 || statusFiltro.has(p.status);
      return bateBusca && bateStatus;
    })
    .sort((a, b) => (a.dataPedido || "").localeCompare(b.dataPedido || ""));

  const atual = pedidos.find((p) => p.id === selecionado);

  if (atual) {
    return <DetalhePedido pedido={atual} onVoltar={() => setSelecionado(null)} {...acoes} />;
  }

  return (
    <div>
      <PageTitle eyebrow={`${pedidos.filter((p) => p.status !== "Entregue").length} em aberto`} title="Pedidos" />
      <div className="flex items-center gap-2 mb-4" style={{ ...inputStyle, maxWidth: 360, padding: "6px 10px" }}>
        <Search size={14} color={TEXT_MUTED} />
        <input
          placeholder="Buscar cliente…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          style={{ border: "none", outline: "none", background: "transparent", width: "100%", fontSize: 14 }}
        />
      </div>
      <div className="mb-4">
        <FiltroStatusMulti opcoes={STATUS_ATIVOS} estilos={STATUS_STYLE} selecionados={statusFiltro} onChange={setStatusFiltro} />
      </div>

      <Card>
        {filtrados.length === 0 && (
          <div className="p-6">
            <Empty texto="Nenhum pedido encontrado." />
          </div>
        )}
        {filtrados.map((p, i) => {
          const diasAberto = p.dataPedido ? -diasAte(p.dataPedido) : 0;
          const atrasado40 = diasAberto > DIAS_LIMITE && p.status !== "Entregue" && p.status !== "Doação";
          const naoEnviado = !p.enviadoFabi;
          return (
          <button
            key={p.id}
            onClick={() => setSelecionado(p.id)}
            className="w-full flex items-center justify-between px-5 py-3.5 text-left"
            style={{
              borderBottom: i < filtrados.length - 1 ? `1px solid ${LINE}` : "none",
              background: naoEnviado ? "#FFF9E8" : "transparent",
            }}
          >
            <div>
              <div className="flex items-center gap-1.5">
                {atrasado40 && (
                  <span title={`${diasAberto} dias desde o pedido — mais de ${DIAS_LIMITE} dias sem entregar`} style={{ color: VERMELHO }}>
                    <AlertTriangle size={14} />
                  </span>
                )}
                <span style={{ fontWeight: 600, fontSize: 14, color: atrasado40 ? VERMELHO : undefined }}>{p.cliente || "Sem nome"}</span>
                {p.recompra && (
                  <span style={{ color: "#A9793E", fontSize: 12 }} title="Cliente recompra">
                    ↻
                  </span>
                )}
                {naoEnviado && <Pill text="📨 Não enviado" style={{ bg: "#DCE4EE", fg: "#2E4A6B" }} />}
              </div>
              <div style={{ fontSize: 12, color: TEXT_MUTED }}>
                Pedido {fmtData(p.dataPedido)} · Entrega prevista {fmtData(p.previsaoEntrega)}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="fx-mono" style={{ fontSize: 12, color: TEXT_MUTED }}>
                {parseFloat(p.quantidade) || 0} un · entregue {parseFloat(p.qtEntregue) || 0} · saldo{" "}
                {Math.max(0, (parseFloat(p.quantidade) || 0) - (parseFloat(p.qtEntregue) || 0))}
              </span>
              <Pill
                text={`${diasAberto}d em produção`}
                style={{ bg: atrasado40 ? "#F6E3D9" : "#EDEAE0", fg: atrasado40 ? VERMELHO : TEXT_MUTED }}
              />
              <Pill text={p.status} style={STATUS_STYLE[p.status]} />
              <ChevronRight size={16} color={TEXT_MUTED} />
            </div>
          </button>
          );
        })}
      </Card>
    </div>
  );
}
