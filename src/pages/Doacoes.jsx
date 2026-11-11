import React, { useState } from "react";
import { AlertTriangle, ChevronRight, Search } from "lucide-react";
import { Card, Empty, PageTitle, Pill } from "../components/ui";
import { FiltroStatusMulti } from "../components/FiltroStatusMulti";
import { STATUS, STATUS_STYLE, STATUS_TECIDO, LINE, TEXT_MUTED, inputStyle } from "../lib/constants";
import { diasAte, fmtData, statusPedidoSemVenda } from "../lib/helpers";
import DetalhePedido from "./DetalhePedido";

const VERMELHO = "#9C4A1E";
const DIAS_LIMITE = 50;
// Só os 3 status de doação/uso próprio — "Doação" (legado, ainda em
// produção) e os dois finais "Entregue Doação"/"Entregue Uso Pessoal".
const STATUS_DOACAO = STATUS.filter((s) => statusPedidoSemVenda(s));

// Aba dedicada pra pedidos de doação/permuta/uso próprio — esses pedidos
// saem da lista normal de "Pedidos" assim que o status vira algum dos
// três acima (pra não ficar parecendo produção pendente de venda), mas
// isso também fazia eles "sumirem" de qualquer controle quando ainda
// precisavam passar pela produção de verdade (corte, costura etc.) antes
// de ir pro cliente. Aqui ficam todos reunidos, abertos ou já entregues,
// e o clique abre o mesmo DetalhePedido de sempre — dá pra mudar o status
// normalmente (inclusive voltar pra "Em Produção") até ele ficar pronto.
export default function Doacoes({ pedidos, selecionado, setSelecionado, ...acoes }) {
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState(new Set());

  const filtrados = pedidos
    .filter((p) => statusPedidoSemVenda(p.status))
    .filter((p) => {
      const bateBusca = p.cliente.toLowerCase().includes(busca.toLowerCase());
      const bateStatus = statusFiltro.size === 0 || statusFiltro.has(p.status);
      return bateBusca && bateStatus;
    })
    .sort((a, b) => (b.dataPedido || "").localeCompare(a.dataPedido || ""));

  const atual = pedidos.find((p) => p.id === selecionado);
  if (atual) {
    return <DetalhePedido pedido={atual} onVoltar={() => setSelecionado(null)} {...acoes} />;
  }

  const totalCamisas = filtrados.reduce((s, p) => s + (parseFloat(p.quantidade) || 0), 0);

  return (
    <div>
      <PageTitle eyebrow={`${filtrados.length} pedido(s) · ${totalCamisas} camisa(s)`} title="Doações" />
      <div style={{ fontSize: 12, color: TEXT_MUTED, marginBottom: 16 }}>
        Pedidos de Doação, Permuta ou Uso Próprio — aqui ficam juntos, ainda em produção ou já entregues, pra você
        acompanhar até o fim. Clique num pedido pra mudar o status (inclusive mandar pra produção) igual num pedido
        normal.
      </div>
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
      </div>
      <div className="mb-4">
        <FiltroStatusMulti opcoes={STATUS_DOACAO} estilos={STATUS_STYLE} selecionados={statusFiltro} onChange={setStatusFiltro} />
      </div>

      <Card>
        {filtrados.length === 0 && (
          <div className="p-6">
            <Empty texto="Nenhum pedido de doação encontrado." />
          </div>
        )}
        {filtrados.map((p, i) => {
          const diasAberto = p.dataPedido ? -diasAte(p.dataPedido) : 0;
          const emProducao = p.status === "Doação";
          const atrasado = emProducao && diasAberto > DIAS_LIMITE;
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
                background: emProducao ? tecido.bg : "transparent",
              }}
            >
              <div>
                <div className="flex items-center gap-1.5">
                  {atrasado && (
                    <span title={`${diasAberto} dias desde o pedido — ainda em produção`} style={{ color: VERMELHO }}>
                      <AlertTriangle size={14} />
                    </span>
                  )}
                  <span style={{ fontWeight: 600, fontSize: 14, color: atrasado ? VERMELHO : undefined }}>{p.cliente || "Sem nome"}</span>
                </div>
                <div style={{ fontSize: 12, color: TEXT_MUTED }}>Pedido {fmtData(p.dataPedido)}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="fx-mono" style={{ fontSize: 12, color: TEXT_MUTED }}>
                  {parseFloat(p.quantidade) || 0} un
                </span>
                {emProducao && (
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
                )}
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
