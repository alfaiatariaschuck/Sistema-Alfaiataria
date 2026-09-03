import React, { useState } from "react";
import { ChevronLeft, ChevronRight, ClipboardList, Repeat, ShoppingBag, TrendingUp, UserPlus } from "lucide-react";
import { Card, Empty, PageTitle, Pill, StatCard } from "../components/ui";
import { BRASS, INK, INK_SOFT, LINE, STATUS_STYLE, TEXT_MUTED } from "../lib/constants";
import { brl, fmtData } from "../lib/helpers";

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function mesAnteriorDe(mesStr) {
  const [ano, mes] = mesStr.split("-").map(Number);
  const d = new Date(ano, mes - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function mesSeguinteDe(mesStr) {
  const [ano, mes] = mesStr.split("-").map(Number);
  const d = new Date(ano, mes, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function nomeDoMes(mesStr) {
  const [ano, mes] = mesStr.split("-").map(Number);
  return `${MESES[mes - 1]} de ${ano}`;
}

// Painel do dono pra acompanhar o que cada vendedor lançou, mês a mês —
// os pedidos são os MESMOS da aba Pedidos (mesma tabela, mesmo registro),
// só filtrados aqui por quem tem o campo "vendedor" preenchido. Nenhum
// dado é duplicado; essa aba é só uma lente sobre o que já existe.
export default function VendedorGestao({ pedidos, irParaPedido }) {
  const hojeStr = new Date().toISOString().slice(0, 10);
  const mesRealAtual = hojeStr.slice(0, 7);
  const [mesSelecionado, setMesSelecionado] = useState(mesRealAtual);

  const pedidosDeVendedores = (pedidos || []).filter((p) => (p.vendedor || "").trim());
  const vendedoresDistintos = [...new Set(pedidosDeVendedores.map((p) => p.vendedor.trim()))].sort();

  const doMes = pedidosDeVendedores
    .filter((p) => (p.dataPedido || "").slice(0, 7) === mesSelecionado)
    .sort((a, b) => (b.dataPedido || "").localeCompare(a.dataPedido || ""));
  const doMesVendidos = doMes.filter((p) => p.status !== "Doação");

  const qtdCamisas = doMesVendidos.reduce((s, p) => s + (parseFloat(p.quantidade) || 0), 0);
  const valorVendido = doMesVendidos.reduce((s, p) => s + (parseFloat(p.aReceber?.valor) || 0), 0);
  const ticketMedio = doMesVendidos.length > 0 ? valorVendido / doMesVendidos.length : 0;
  const qtdNovos = doMesVendidos.filter((p) => !p.recompra).length;
  const qtdRecompra = doMesVendidos.filter((p) => p.recompra).length;

  return (
    <div>
      <PageTitle eyebrow={vendedoresDistintos.length > 0 ? vendedoresDistintos.join(", ") : "Nenhum vendedor ainda"} title="Vendedor" />

      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => setMesSelecionado(mesAnteriorDe(mesSelecionado))}
          className="flex items-center gap-1"
          style={{ background: "#EDEAE0", color: INK, padding: "7px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600 }}
        >
          <ChevronLeft size={14} /> mês anterior
        </button>
        <div style={{ fontSize: 14, fontWeight: 700, minWidth: 160, textAlign: "center" }}>{nomeDoMes(mesSelecionado)}</div>
        <button
          onClick={() => setMesSelecionado(mesSeguinteDe(mesSelecionado))}
          disabled={mesSelecionado === mesRealAtual}
          className="flex items-center gap-1"
          style={{
            background: "#EDEAE0",
            color: mesSelecionado === mesRealAtual ? TEXT_MUTED : INK,
            padding: "7px 12px",
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 600,
            opacity: mesSelecionado === mesRealAtual ? 0.6 : 1,
          }}
        >
          mês seguinte <ChevronRight size={14} />
        </button>
        {mesSelecionado !== mesRealAtual && (
          <button onClick={() => setMesSelecionado(mesRealAtual)} style={{ color: BRASS, fontSize: 12, fontWeight: 600 }}>
            voltar pro mês atual
          </button>
        )}
      </div>

      <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
        <StatCard label="Pedidos fechados" value={String(doMesVendidos.length)} icon={ClipboardList} />
        <StatCard label="Camisas vendidas" value={String(qtdCamisas)} icon={ShoppingBag} />
        <StatCard label="Valor vendido" value={brl(valorVendido)} icon={TrendingUp} />
        <StatCard label="Ticket médio" value={brl(ticketMedio)} icon={TrendingUp} />
        <StatCard label="Clientes novos" value={String(qtdNovos)} icon={UserPlus} />
        <StatCard label="Recompra" value={String(qtdRecompra)} icon={Repeat} />
      </div>

      <Card style={{ padding: 0, overflow: "hidden" }}>
        {doMes.length === 0 && (
          <div className="p-6">
            <Empty texto="Nenhum pedido de vendedor nesse mês." />
          </div>
        )}
        {doMes.map((p, i) => (
          <button
            key={p.id}
            onClick={() => irParaPedido(p.id)}
            className="w-full flex items-center justify-between px-5 py-3 text-left"
            style={{ borderBottom: i < doMes.length - 1 ? `1px solid ${LINE}` : "none" }}
          >
            <div>
              <div className="flex items-center gap-1.5" style={{ fontWeight: 600, fontSize: 14 }}>
                {p.cliente || "Sem nome"}
                {p.recompra && <Pill text="↻ Recompra" style={{ bg: "#EFE6D6", fg: BRASS }} />}
              </div>
              <div style={{ fontSize: 12, color: TEXT_MUTED }}>
                {p.vendedor} · {fmtData(p.dataPedido)} · {p.quantidade} un
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="fx-mono" style={{ fontSize: 13, fontWeight: 600 }}>
                {brl(parseFloat(p.aReceber?.valor) || 0)}
              </span>
              <Pill text={p.status} style={STATUS_STYLE[p.status]} />
              <ChevronRight size={16} color={TEXT_MUTED} />
            </div>
          </button>
        ))}
      </Card>
    </div>
  );
}
