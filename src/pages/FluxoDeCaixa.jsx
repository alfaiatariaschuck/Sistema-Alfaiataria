import React from "react";
import { CheckCircle2, Clock, Wallet } from "lucide-react";
import { Card, Empty, PageTitle, Pill, StatCard } from "../components/ui";
import { LINE, PAG_STYLE } from "../lib/constants";
import { brl } from "../lib/helpers";

export default function FluxoDeCaixa({ pedidos, irParaPedido }) {
  const receber = pedidos.filter((p) => parseFloat(p.aReceber.valor) > 0);
  const fab = pedidos.filter((p) => parseFloat(p.pagoFabiana.valor) > 0);

  const totalReceber = receber.reduce((s, p) => s + parseFloat(p.aReceber.valor), 0);
  const recebido = receber.filter((p) => p.aReceber.statusPagamento === "Recebido").reduce((s, p) => s + parseFloat(p.aReceber.valor), 0);
  const totalFab = fab.reduce((s, p) => s + parseFloat(p.pagoFabiana.valor), 0);
  const pagoFab = fab.filter((p) => p.pagoFabiana.statusPagamento === "Pago").reduce((s, p) => s + parseFloat(p.pagoFabiana.valor), 0);

  const saldo = recebido - pagoFab;

  return (
    <div>
      <PageTitle eyebrow="Financeiro" title="Fluxo de Caixa" />
      <div className="grid gap-4 mb-8" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
        <StatCard label="Recebido" value={brl(recebido)} icon={Wallet} />
        <StatCard label="A receber (pendente)" value={brl(totalReceber - recebido)} icon={Clock} />
        <StatCard label="Pago à Fabiana" value={brl(pagoFab)} icon={Wallet} />
        <StatCard label="Saldo em caixa" value={brl(saldo)} icon={CheckCircle2} />
      </div>

      <div className="grid gap-6" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <Card style={{ padding: 20 }}>
          <div className="fx-serif mb-3" style={{ fontSize: 15, fontWeight: 600 }}>
            A receber de clientes
          </div>
          {receber.length === 0 && <Empty texto="Nada lançado ainda." />}
          {receber.map((p) => (
            <button key={p.id} onClick={() => irParaPedido(p.id)} className="w-full flex items-center justify-between py-2" style={{ borderBottom: `1px solid ${LINE}`, textAlign: "left" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{p.cliente}</div>
                <div className="fx-mono" style={{ fontSize: 12, color: "#6B7280" }}>
                  {brl(parseFloat(p.aReceber.valor))}
                </div>
              </div>
              <Pill text={p.aReceber.statusPagamento} style={PAG_STYLE[p.aReceber.statusPagamento]} />
            </button>
          ))}
        </Card>

        <Card style={{ padding: 20 }}>
          <div className="fx-serif mb-3" style={{ fontSize: 15, fontWeight: 600 }}>
            A pagar à Fabiana
          </div>
          {fab.length === 0 && <Empty texto="Nada lançado ainda." />}
          {fab.map((p) => (
            <button key={p.id} onClick={() => irParaPedido(p.id)} className="w-full flex items-center justify-between py-2" style={{ borderBottom: `1px solid ${LINE}`, textAlign: "left" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{p.cliente}</div>
                <div className="fx-mono" style={{ fontSize: 12, color: "#6B7280" }}>
                  {brl(parseFloat(p.pagoFabiana.valor))}
                </div>
              </div>
              <Pill text={p.pagoFabiana.statusPagamento} style={PAG_STYLE[p.pagoFabiana.statusPagamento]} />
            </button>
          ))}
        </Card>
      </div>
    </div>
  );
}
