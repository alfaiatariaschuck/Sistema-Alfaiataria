import React from "react";
import { Package, Users, Wallet } from "lucide-react";
import { Card, Empty, PageTitle, Pill, StatCard } from "../components/ui";
import { BRASS_SOFT, INK_SOFT, LINE, STATUS, STATUS_STYLE, TEXT_MUTED } from "../lib/constants";
import { brl, diasAte, fmtData } from "../lib/helpers";

export default function Dashboard({ pedidos, irPara }) {
  const abertos = pedidos.filter((p) => p.status !== "Entregue");
  const aReceberPendente = pedidos.filter((p) => p.aReceber.statusPagamento === "Pendente" && parseFloat(p.aReceber.valor) > 0);
  const fabPendente = pedidos.filter((p) => p.pagoFabiana.statusPagamento === "Pendente" && parseFloat(p.pagoFabiana.valor) > 0);
  const proximos = [...abertos]
    .filter((p) => p.previsaoEntrega)
    .sort((a, b) => a.previsaoEntrega.localeCompare(b.previsaoEntrega))
    .slice(0, 6);

  const somaReceber = aReceberPendente.reduce((s, p) => s + (parseFloat(p.aReceber.valor) || 0), 0);
  const somaFab = fabPendente.reduce((s, p) => s + (parseFloat(p.pagoFabiana.valor) || 0), 0);

  return (
    <div>
      <PageTitle eyebrow="Visão geral" title="Painel" />
      <div className="grid gap-4 mb-8" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
        <StatCard label="Pedidos em aberto" value={abertos.length} icon={Package} />
        <StatCard label="A receber pendente" value={brl(somaReceber)} icon={Wallet} />
        <StatCard label="A pagar Fabiana" value={brl(somaFab)} icon={Wallet} />
        <StatCard label="Total de clientes" value={new Set(pedidos.map((p) => p.cliente.trim().toLowerCase())).size} icon={Users} />
      </div>

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
                <Pill
                  text={dias < 0 ? `${Math.abs(dias)}d atrasado` : dias === 0 ? "hoje" : `em ${dias}d`}
                  style={dias < 0 ? { bg: "#F6E3D9", fg: "#9C4A1E" } : { bg: BRASS_SOFT, fg: "#A9793E" }}
                />
              </button>
            );
          })}
        </Card>

        <Card style={{ padding: 20 }}>
          <div className="fx-serif mb-3" style={{ fontSize: 16, fontWeight: 600 }}>
            Pedidos por status
          </div>
          {STATUS.map((s) => {
            const n = pedidos.filter((p) => p.status === s).length;
            const max = Math.max(1, ...STATUS.map((st) => pedidos.filter((p) => p.status === st).length));
            return (
              <div key={s} className="mb-3">
                <div className="flex justify-between mb-1" style={{ fontSize: 12, color: INK_SOFT }}>
                  <span>{s}</span>
                  <span className="fx-mono">{n}</span>
                </div>
                <div style={{ background: LINE, borderRadius: 4, height: 6 }}>
                  <div style={{ width: `${(n / max) * 100}%`, background: STATUS_STYLE[s].fg, height: 6, borderRadius: 4 }} />
                </div>
              </div>
            );
          })}
        </Card>
      </div>
    </div>
  );
}
