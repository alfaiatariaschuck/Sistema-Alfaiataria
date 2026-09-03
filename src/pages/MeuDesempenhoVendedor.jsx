import React, { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ClipboardList, Clock, Repeat, ShoppingBag, TrendingUp, UserPlus } from "lucide-react";
import { Card, PageTitle, StatCard } from "../components/ui";
import { BRASS, INK, TEXT_MUTED } from "../lib/constants";
import { brl, temposMediosProducao } from "../lib/helpers";

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

// Painel de gestão do próprio vendedor — só com dados dele mesmo, que já
// são os únicos que ele consegue enxergar aqui dentro (o RLS já garante
// isso: "pedidos" nessa tela SÓ vem com o que ele mesmo lançou, nunca os
// de outro vendedor nem os da loja). Nada de custo, margem ou informação
// financeira/gerencial que seja só do dono — só o desempenho dele.
export default function MeuDesempenhoVendedor({ pedidos }) {
  const hojeStr = new Date().toISOString().slice(0, 10);
  const mesRealAtual = hojeStr.slice(0, 7);
  const [mesSelecionado, setMesSelecionado] = useState(mesRealAtual);

  const doMes = (pedidos || []).filter((p) => (p.dataPedido || "").slice(0, 7) === mesSelecionado);
  const doMesVendidos = doMes.filter((p) => p.status !== "Doação");

  const qtdCamisas = doMesVendidos.reduce((s, p) => s + (parseFloat(p.quantidade) || 0), 0);
  const valorVendido = doMesVendidos.reduce((s, p) => s + (parseFloat(p.aReceber?.valor) || 0), 0);
  const ticketMedio = doMesVendidos.length > 0 ? valorVendido / doMesVendidos.length : 0;
  const qtdNovos = doMesVendidos.filter((p) => !p.recompra).length;
  const qtdRecompra = doMesVendidos.filter((p) => p.recompra).length;

  // Prazo médio é sobre o histórico completo (não só o mês selecionado)
  // — com poucos pedidos entregues num único mês o número oscila demais
  // pra ser útil.
  const temposMedios = useMemo(() => temposMediosProducao(pedidos || []), [pedidos]);

  return (
    <div>
      <PageTitle eyebrow="Seu desempenho" title="Minha Gestão" />

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

      <Card style={{ padding: 20 }}>
        <div className="fx-serif mb-1" style={{ fontSize: 15, fontWeight: 600 }}>
          Prazo médio de produção
        </div>
        <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 16 }}>
          Com base em todos os seus pedidos já entregues — ajuda a saber o que prometer pro próximo cliente.
        </div>
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
          <div>
            <div className="flex items-center gap-1.5" style={{ fontSize: 11, color: TEXT_MUTED }}>
              <Clock size={12} /> Cliente novo
            </div>
            <div className="fx-mono" style={{ fontSize: 18, fontWeight: 700 }}>
              {temposMedios.novos != null ? `${temposMedios.novos}d` : "—"}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5" style={{ fontSize: 11, color: TEXT_MUTED }}>
              <Clock size={12} /> Recompra
            </div>
            <div className="fx-mono" style={{ fontSize: 18, fontWeight: 700 }}>
              {temposMedios.recompra != null ? `${temposMedios.recompra}d` : "—"}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
