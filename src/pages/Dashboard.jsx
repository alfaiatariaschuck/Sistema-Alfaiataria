import React from "react";
import { AlertTriangle, CheckCircle2, Gift, PackageCheck, Shirt, Users, Wallet } from "lucide-react";
import { Card, Empty, PageTitle, Pill, StatCard } from "../components/ui";
import { BRASS_SOFT, INK_SOFT, LINE, STATUS, STATUS_STYLE, TEXT_MUTED } from "../lib/constants";
import { brl, diasAte, fmtData } from "../lib/helpers";

const STATUS_PAINEL = STATUS.filter((s) => s !== "Pronto" && s !== "Doação");
const VERMELHO = "#9C4A1E";

export default function Dashboard({ pedidos, irPara }) {
  // Doação não conta na produção nem no faturamento — é uma peça dada,
  // não vendida, então sai das contas de quantidade/valor do cliente.
  const naoDoacao = (p) => p.status !== "Doação";
  const doacoes = pedidos.filter((p) => p.status === "Doação");
  const abertos = pedidos.filter((p) => p.status !== "Entregue" && naoDoacao(p));
  const fabPendente = pedidos.filter((p) => p.pagoFabiana.statusPagamento === "Pendente" && parseFloat(p.pagoFabiana.valor) > 0);
  const fabPaga = pedidos.filter((p) => p.pagoFabiana.statusPagamento === "Pago" && parseFloat(p.pagoFabiana.valor) > 0);
  const comPrevisao = [...abertos].filter((p) => p.previsaoEntrega).sort((a, b) => a.previsaoEntrega.localeCompare(b.previsaoEntrega));
  const atrasados = comPrevisao.filter((p) => diasAte(p.previsaoEntrega) < 0);
  const proximos = comPrevisao.filter((p) => diasAte(p.previsaoEntrega) >= 0).slice(0, 6);

  const somaFab = fabPendente.reduce((s, p) => s + (parseFloat(p.pagoFabiana.valor) || 0), 0);
  const somaFabPaga = fabPaga.reduce((s, p) => s + (parseFloat(p.pagoFabiana.valor) || 0), 0);
  const camisasEmProducao = abertos.reduce((s, p) => s + (parseFloat(p.quantidade) || 0), 0);
  const camisasEntregues = abertos.reduce((s, p) => s + (parseFloat(p.qtEntregue) || 0), 0);
  const saldoAEntregar = Math.max(0, camisasEmProducao - camisasEntregues);

  return (
    <div>
      <PageTitle eyebrow="Visão geral — camisaria" title="Painel Camisaria" />
      <div className="grid gap-4 mb-8" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
        <StatCard label="Total de clientes" value={new Set(pedidos.map((p) => p.cliente.trim().toLowerCase())).size} icon={Users} />
        <StatCard label="Camisas em produção" value={camisasEmProducao} icon={Shirt} />
        <StatCard label="Entregue parcial" value={camisasEntregues} icon={PackageCheck} />
        <StatCard label="Saldo a entregar" value={saldoAEntregar} icon={Shirt} />
        <StatCard label="Pedidos atrasados" value={atrasados.length} icon={AlertTriangle} accent={atrasados.length > 0 ? VERMELHO : undefined} />
        <StatCard label="Pago à Fabiana" value={brl(somaFabPaga)} icon={CheckCircle2} />
        <StatCard label="Devido à Fabiana" value={brl(somaFab)} icon={Wallet} />
        <StatCard label="Doações" value={doacoes.reduce((s, p) => s + (parseFloat(p.quantidade) || 0), 0)} icon={Gift} />
      </div>

      {atrasados.length > 0 && (
        <Card style={{ padding: 20 }} className="mb-6">
          <div className="fx-serif mb-3 flex items-center gap-2" style={{ fontSize: 16, fontWeight: 600, color: VERMELHO }}>
            <AlertTriangle size={16} /> Atrasados ({atrasados.length})
          </div>
          {atrasados.map((p) => {
            const dias = diasAte(p.previsaoEntrega);
            return (
              <button
                key={p.id}
                onClick={() => irPara(p.id)}
                className="w-full flex items-center justify-between py-2.5"
                style={{ borderBottom: `1px solid ${LINE}`, textAlign: "left" }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{p.cliente || "Sem nome"}</div>
                  <div style={{ fontSize: 12, color: TEXT_MUTED }}>
                    {fmtData(p.previsaoEntrega)} · {p.status}
                  </div>
                </div>
                <Pill text={`${Math.abs(dias)}d atrasado`} style={{ bg: "#F6E3D9", fg: VERMELHO }} />
              </button>
            );
          })}
        </Card>
      )}

      <div className="grid gap-6" style={{ gridTemplateColumns: "1.3fr 1fr" }}>
        <Card style={{ padding: 20 }}>
          <div className="fx-serif mb-3" style={{ fontSize: 16, fontWeight: 600 }}>
            Próximas entregas
          </div>
          {proximos.length === 0 && <Empty texto="Nenhuma previsão de entrega cadastrada ainda." />}
          {proximos.map((p) => {
            const dias = diasAte(p.previsaoEntrega);
            return (
              <button
                key={p.id}
                onClick={() => irPara(p.id)}
                className="w-full flex items-center justify-between py-2.5"
                style={{ borderBottom: `1px solid ${LINE}`, textAlign: "left" }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{p.cliente || "Sem nome"}</div>
                  <div style={{ fontSize: 12, color: TEXT_MUTED }}>
                    {fmtData(p.previsaoEntrega)} · {p.status}
                  </div>
                </div>
                <Pill text={dias === 0 ? "hoje" : `em ${dias}d`} style={{ bg: BRASS_SOFT, fg: "#A9793E" }} />
              </button>
            );
          })}
        </Card>

        <Card style={{ padding: 20 }}>
          <div className="fx-serif mb-3" style={{ fontSize: 16, fontWeight: 600 }}>
            Camisas por status
          </div>
          {STATUS_PAINEL.map((s) => {
            const camisas = pedidos.filter((p) => p.status === s).reduce((acc, p) => acc + (parseFloat(p.quantidade) || 0), 0);
            const pedidosNoStatus = pedidos.filter((p) => p.status === s).length;
            const max = Math.max(
              1,
              ...STATUS_PAINEL.map((st) => pedidos.filter((p) => p.status === st).reduce((acc, p) => acc + (parseFloat(p.quantidade) || 0), 0))
            );
            return (
              <div key={s} className="mb-3">
                <div className="flex justify-between mb-1" style={{ fontSize: 12, color: INK_SOFT }}>
                  <span>
                    {s} <span style={{ color: TEXT_MUTED }}>({pedidosNoStatus} ped.)</span>
                  </span>
                  <span className="fx-mono">{camisas} un</span>
                </div>
                <div style={{ background: LINE, borderRadius: 4, height: 6 }}>
                  <div style={{ width: `${(camisas / max) * 100}%`, background: STATUS_STYLE[s].fg, height: 6, borderRadius: 4 }} />
                </div>
              </div>
            );
          })}
          <div className="flex justify-between pt-2 mt-1" style={{ borderTop: `1px solid ${LINE}`, fontSize: 12, fontWeight: 700 }}>
            <span>Total</span>
            <span className="fx-mono">
              {pedidos.filter(naoDoacao).reduce((acc, p) => acc + (parseFloat(p.quantidade) || 0), 0)} un ·{" "}
              {pedidos.filter(naoDoacao).length} ped.
            </span>
          </div>
        </Card>
      </div>
    </div>
  );
}
