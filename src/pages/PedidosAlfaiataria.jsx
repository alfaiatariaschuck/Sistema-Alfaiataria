import React, { useState } from "react";
import { ChevronRight, Search } from "lucide-react";
import { Card, Empty, PageTitle, Pill } from "../components/ui";
import { FiltroStatusMulti } from "../components/FiltroStatusMulti";
import { BRASS_SOFT, LINE, STATUS, STATUS_STYLE, TEXT_MUTED, inputStyle } from "../lib/constants";
import { diasAte, fmtData } from "../lib/helpers";
import DetalhePeca from "./DetalhePeca";

function statusPagamentoDe(p) {
  const total = parseFloat(p.valorTotal) || 0;
  const pago = parseFloat(p.pago) || 0;
  if (total > 0 && pago >= total) return "Pago";
  if (pago > 0) return "Parcial";
  return "Pendente";
}

const STATUS_ATIVOS = STATUS.filter((s) => s !== "Entregue");
const VERMELHO = "#9C4A1E";
const DIAS_LIMITE = 45;

export default function PedidosAlfaiataria({ pecas, selecionada, setSelecionada, ...acoes }) {
  const [busca, setBusca] = useState("");
  const [filtroPagamento, setFiltroPagamento] = useState("Todos");
  const [statusFiltro, setStatusFiltro] = useState(new Set());

  // Peças entregues saem daqui — ficam no histórico da aba Entregues.
  const filtradas = pecas
    .filter((p) => p.status !== "Entregue")
    .filter((p) => {
      const bateBusca = p.cliente.toLowerCase().includes(busca.toLowerCase());
      const batePagamento = filtroPagamento === "Todos" || statusPagamentoDe(p) === filtroPagamento;
      const bateStatus = statusFiltro.size === 0 || statusFiltro.has(p.status);
      return bateBusca && batePagamento && bateStatus;
    });

  const atual = pecas.find((p) => p.id === selecionada);

  if (atual) {
    return <DetalhePeca peca={atual} onVoltar={() => setSelecionada(null)} {...acoes} />;
  }

  return (
    <div>
      <PageTitle eyebrow={`${pecas.filter((p) => p.status !== "Entregue").length} em aberto`} title="Pedidos Alfaiataria" />
      <div className="flex flex-col md:flex-row gap-3 mb-3">
        <div className="flex items-center gap-2 flex-1" style={{ ...inputStyle, padding: "6px 10px" }}>
          <Search size={14} color={TEXT_MUTED} />
          <input
            placeholder="Buscar cliente…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            style={{ border: "none", outline: "none", background: "transparent", width: "100%", fontSize: 14 }}
          />
        </div>
        <select value={filtroPagamento} onChange={(e) => setFiltroPagamento(e.target.value)} style={{ ...inputStyle, maxWidth: 180 }}>
          <option>Todos</option>
          <option>Pendente</option>
          <option>Parcial</option>
          <option>Pago</option>
        </select>
      </div>
      <div className="mb-4">
        <FiltroStatusMulti opcoes={STATUS_ATIVOS} estilos={STATUS_STYLE} selecionados={statusFiltro} onChange={setStatusFiltro} />
      </div>

      <Card>
        {filtradas.length === 0 && (
          <div className="p-6">
            <Empty texto="Nenhuma peça encontrada." />
          </div>
        )}
        {filtradas.map((p, i) => {
          const naoEnviado = !p.enviadoIcaro;
          const diasAberto = p.dataPedido ? -diasAte(p.dataPedido) : 0;
          const atrasada = diasAberto > DIAS_LIMITE;
          return (
            <button
              key={p.id}
              onClick={() => setSelecionada(p.id)}
              className="w-full flex items-center justify-between px-5 py-3.5 text-left"
              style={{
                borderBottom: i < filtradas.length - 1 ? `1px solid ${LINE}` : "none",
                background: naoEnviado ? "#FFF9E8" : "transparent",
              }}
            >
              <div>
                <div className="flex items-center gap-1.5">
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{p.cliente || "Sem nome"}</span>
                  <Pill text={p.tipoPeca} style={{ bg: BRASS_SOFT, fg: "#A9793E" }} />
                  {naoEnviado && <Pill text="📨 Não enviado" style={{ bg: "#DCE4EE", fg: "#2E4A6B" }} />}
                </div>
                <div style={{ fontSize: 12, color: TEXT_MUTED }}>
                  Pedido {fmtData(p.dataPedido)}
                  {p.previsaoEntrega ? ` · Entrega prevista ${fmtData(p.previsaoEntrega)}` : ""}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Pill
                  text={`${diasAberto}d em produção`}
                  style={{ bg: atrasada ? "#F6E3D9" : "#EDEAE0", fg: atrasada ? VERMELHO : TEXT_MUTED }}
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
