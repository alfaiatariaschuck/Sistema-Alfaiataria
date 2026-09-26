import React, { useState } from "react";
import { AlertTriangle, CalendarClock, ChevronRight, Package, PackageCheck, Search } from "lucide-react";
import { Card, Empty, PageTitle, Pill } from "../components/ui";
import { FiltroStatusMulti } from "../components/FiltroStatusMulti";
import { LINE, STATUS, STATUS_STYLE, TEXT_MUTED, inputStyle } from "../lib/constants";
import { diasAte, fmtData } from "../lib/helpers";
import DetalhePedido from "./DetalhePedido";
import CronogramaImprimivel from "./CronogramaImprimivel";
import PendenciasFabiana from "../components/PendenciasFabiana";
import OutrasPendencias from "../components/OutrasPendencias";

const VERMELHO = "#9C4A1E";
const DIAS_LIMITE = 40;
const STATUS_ATIVOS = STATUS.filter((s) => s !== "Entregue");

export default function Pedidos({ pedidos, selecionado, setSelecionado, titulo = "Pedidos", nomeCronograma = "Tales", incluirEntregues = false, ...acoes }) {
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState(new Set());
  const [mostrarCronograma, setMostrarCronograma] = useState(false);
  const [marcandoTodos, setMarcandoTodos] = useState(false);
  const opcoesStatus = incluirEntregues ? STATUS : STATUS_ATIVOS;

  // Pedidos entregues saem daqui — ficam no histórico da aba Entregues.
  // Exceção: telas que precisam ver TODOS os pedidos de uma pessoa (ex:
  // "Pedidos Deivid") passam incluirEntregues, senão um pedido já
  // entregue simplesmente "sumia" dessa visão específica.
  const filtrados = pedidos
    .filter((p) => incluirEntregues || p.status !== "Entregue")
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

  // Reflete o filtro atual — útil pra estatística rápida, ex: filtrar só
  // "Doação" e já ver quantos pedidos e quantas camisas foram doadas.
  const totalCamisasFiltradas = filtrados.reduce((s, p) => s + (parseFloat(p.quantidade) || 0), 0);

  // Cronograma pra Fabi: TODOS os pedidos em aberto (não só o que está
  // filtrado na tela), do mais antigo (mais urgente) pro mais novo —
  // Doação sai da lista porque não é produção pendente de verdade.
  const pedidosAbertos = pedidos
    .filter((p) => p.status !== "Entregue" && p.status !== "Doação")
    .sort((a, b) => (a.dataPedido || "").localeCompare(b.dataPedido || ""));

  // Pedido "sem tecido" é um campo novo — todo pedido antigo nasce assim
  // (nunca foi marcado), então sem essa limpeza única a tela toda vinha
  // vermelha e o destaque perdia o sentido. Marca de uma vez só o que já
  // está com tecido na real, aí só os pedidos novos ficam em vermelho.
  const semTecidoFiltrados = filtrados.filter((p) => !p.tecidoChegou && p.status !== "Entregue" && p.status !== "Doação");

  async function marcarTecidoEmTodosFiltrados() {
    if (semTecidoFiltrados.length === 0) return;
    const ok = window.confirm(
      `Marcar "tecido em casa" pros ${semTecidoFiltrados.length} pedido(s) filtrados na tela? Use só pros que já têm tecido de verdade — os que realmente faltam, deixe sem marcar.`
    );
    if (!ok) return;
    setMarcandoTodos(true);
    try {
      for (const p of semTecidoFiltrados) {
        await acoes.onCampo(p.id, "tecidoChegou", true);
      }
    } finally {
      setMarcandoTodos(false);
    }
  }

  return (
    <div>
      <PageTitle eyebrow={`${filtrados.length} pedido(s) · ${totalCamisasFiltradas} camisa(s)`} title={titulo} />
      <PendenciasFabiana pedidos={pedidos} onDefinirValorPorCamisaFabiana={acoes.onDefinirValorPorCamisaFabiana} onSelecionar={setSelecionado} />
      <OutrasPendencias pedidos={pedidos} onSelecionar={setSelecionado} />
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex items-center gap-2" style={{ ...inputStyle, maxWidth: 360, padding: "6px 10px" }}>
          <Search size={14} color={TEXT_MUTED} />
          <input
            placeholder="Buscar cliente…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            style={{ border: "none", outline: "none", background: "transparent", width: "100%", fontSize: 14 }}
          />
        </div>
        <button
          onClick={() => setMostrarCronograma(true)}
          className="flex items-center gap-2"
          style={{ background: "transparent", border: "1px solid #E4DECF", color: "#16212E", padding: "8px 14px", borderRadius: 8, fontWeight: 600, fontSize: 13 }}
        >
          <CalendarClock size={15} /> Cronograma {nomeCronograma}
        </button>
        {semTecidoFiltrados.length > 0 && (
          <button
            onClick={marcarTecidoEmTodosFiltrados}
            disabled={marcandoTodos}
            className="flex items-center gap-2"
            style={{
              background: "transparent",
              border: `1px solid ${VERMELHO}`,
              color: VERMELHO,
              padding: "8px 14px",
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 13,
              opacity: marcandoTodos ? 0.6 : 1,
            }}
          >
            <PackageCheck size={15} />
            {marcandoTodos ? "Marcando…" : `Já tenho tecido destes (${semTecidoFiltrados.length})`}
          </button>
        )}
      </div>
      <div className="mb-4">
        <FiltroStatusMulti opcoes={opcoesStatus} estilos={STATUS_STYLE} selecionados={statusFiltro} onChange={setStatusFiltro} />
      </div>

      {mostrarCronograma && <CronogramaImprimivel itens={pedidosAbertos} onFechar={() => setMostrarCronograma(false)} />}

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
          const semTecido = !p.tecidoChegou && p.status !== "Entregue" && p.status !== "Doação";
          return (
          <button
            key={p.id}
            onClick={() => setSelecionado(p.id)}
            className="w-full flex items-center justify-between px-5 py-3.5 text-left"
            style={{
              borderBottom: i < filtrados.length - 1 ? `1px solid ${LINE}` : "none",
              background: p.tecidoChegou ? "#EAF3EA" : semTecido ? "#FBE1D6" : "transparent",
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
                  background: p.tecidoChegou ? "#DCEBDD" : semTecido ? "#F6E3D9" : "#EDEAE0",
                  color: p.tecidoChegou ? "#2C6E31" : semTecido ? VERMELHO : TEXT_MUTED,
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
