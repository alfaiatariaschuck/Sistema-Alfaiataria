import React, { useState } from "react";
import { AlertTriangle, CalendarClock, ChevronRight, Search } from "lucide-react";
import { Card, Empty, PageTitle, Pill } from "../components/ui";
import { FiltroStatusMulti } from "../components/FiltroStatusMulti";
import { LINE, STATUS, STATUS_STYLE, STATUS_TECIDO, TEXT_MUTED, inputStyle } from "../lib/constants";
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

  // Status de tecido é campo novo e manual — todo pedido antigo nasce
  // "aguardando" (nunca foi definido), então sem essa limpeza única a
  // tela toda vinha laranja e o aviso perdia o sentido. Marca de uma vez
  // só o que já está com tecido na real, aí só os pedidos que realmente
  // faltam continuam sinalizados.
  const naoCompletosFiltrados = filtrados.filter((p) => p.statusTecido !== "completo" && p.status !== "Entregue" && p.status !== "Doação");

  async function marcarTecidoEmTodosFiltrados() {
    if (naoCompletosFiltrados.length === 0) return;
    const ok = window.confirm(
      `Marcar tecido completo pros ${naoCompletosFiltrados.length} pedido(s) filtrados na tela? Use só pros que já têm tecido de verdade — os que realmente faltam, deixe sem marcar.`
    );
    if (!ok) return;
    setMarcandoTodos(true);
    try {
      for (const p of naoCompletosFiltrados) {
        await acoes.onCampo(p.id, "statusTecido", "completo");
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
        {naoCompletosFiltrados.length > 0 && (
          <button
            onClick={marcarTecidoEmTodosFiltrados}
            disabled={marcandoTodos}
            className="flex items-center gap-2"
            style={{
              background: "transparent",
              border: `1px solid #8A6A0C`,
              color: "#8A6A0C",
              padding: "8px 14px",
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 13,
              opacity: marcandoTodos ? 0.6 : 1,
            }}
          >
            {marcandoTodos ? "Marcando…" : `Já tenho tecido destes (${naoCompletosFiltrados.length})`}
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
          const tecido = STATUS_TECIDO.find((s) => s.valor === (p.statusTecido || "aguardando")) || STATUS_TECIDO[0];
          return (
          <div
            key={p.id}
            role="button"
            tabIndex={0}
            onClick={() => setSelecionado(p.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setSelecionado(p.id);
              }
            }}
            className="w-full flex items-center justify-between px-5 py-3.5 text-left cursor-pointer"
            style={{
              borderBottom: i < filtrados.length - 1 ? `1px solid ${LINE}` : "none",
              background: naoEnviado ? "#F6E3D9" : tecido.bg,
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
              <select
                value={p.statusTecido || "aguardando"}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                  e.stopPropagation();
                  acoes.onCampo(p.id, "statusTecido", e.target.value);
                }}
                title="Status do tecido — marque manualmente"
                style={{
                  padding: "6px 10px",
                  borderRadius: 6,
                  border: "none",
                  background: tecido.bg === "transparent" ? "#EDEAE0" : tecido.bg,
                  color: tecido.fg,
                  fontWeight: 600,
                  fontSize: 12,
                  flexShrink: 0,
                }}
              >
                {STATUS_TECIDO.map((s) => (
                  <option key={s.valor} value={s.valor}>
                    {s.label}
                  </option>
                ))}
              </select>
              <Pill text={p.status} style={STATUS_STYLE[p.status]} />
              <ChevronRight size={16} color={TEXT_MUTED} />
            </div>
          </div>
          );
        })}
      </Card>
    </div>
  );
}
