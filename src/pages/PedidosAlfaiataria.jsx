import React, { useState } from "react";
import { ChevronRight, Package, PackageCheck, Search } from "lucide-react";
import { Card, Empty, PageTitle, Pill } from "../components/ui";
import { FiltroStatusMulti } from "../components/FiltroStatusMulti";
import { BRASS, BRASS_SOFT, LINE, STATUS_ALFAIATARIA, STATUS_STYLE, TEXT_MUTED, inputStyle } from "../lib/constants";
import { diasAte, fmtData, statusParaEtapa } from "../lib/helpers";
import DetalhePeca from "./DetalhePeca";

function statusPagamentoDe(p) {
  const total = parseFloat(p.valorTotal) || 0;
  const pago = parseFloat(p.pago) || 0;
  if (total > 0 && pago >= total) return "Pago";
  if (pago > 0) return "Parcial";
  return "Pendente";
}

const STATUS_ATIVOS = STATUS_ALFAIATARIA.filter((s) => s !== "Entregue");
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
      <PageTitle eyebrow={`${filtradas.length} peça(s)`} title="Pedidos Alfaiataria" />
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
          const etapa = statusParaEtapa("alfaiataria", p.status);
          return (
            <button
              key={p.id}
              onClick={() => setSelecionada(p.id)}
              className="w-full flex items-center justify-between px-5 py-3.5 text-left"
              style={{
                borderBottom: i < filtradas.length - 1 ? `1px solid ${LINE}` : "none",
                background: p.tecidoChegou ? "#EAF3EA" : naoEnviado ? "#FFF9E8" : "transparent",
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
                <div className="flex items-center gap-2 mt-1" style={{ maxWidth: 180 }}>
                  <div style={{ background: LINE, borderRadius: 4, height: 5, flex: 1 }}>
                    <div style={{ width: `${etapa.percentual}%`, background: BRASS, height: 5, borderRadius: 4 }} />
                  </div>
                  <span className="fx-mono" style={{ fontSize: 10, color: TEXT_MUTED }}>
                    {etapa.percentual}%
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Pill
                  text={`${diasAberto}d em produção`}
                  style={{ bg: atrasada ? "#F6E3D9" : "#EDEAE0", fg: atrasada ? VERMELHO : TEXT_MUTED }}
                />
                <span
                  role="button"
                  title={p.tecidoChegou ? "Tecido já chegou — toque pra desmarcar" : "Tecido ainda não chegou — toque quando chegar"}
                  onClick={(e) => {
                    e.stopPropagation();
                    acoes.onCampo(p.id, "tecidoChegou", !p.tecidoChegou);
                  }}
                  className="flex items-center justify-center"
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 6,
                    background: p.tecidoChegou ? "#DCEBDD" : "#EDEAE0",
                    color: p.tecidoChegou ? "#2C6E31" : TEXT_MUTED,
                    flexShrink: 0,
                  }}
                >
                  {p.tecidoChegou ? <PackageCheck size={14} /> : <Package size={14} />}
                </span>
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
