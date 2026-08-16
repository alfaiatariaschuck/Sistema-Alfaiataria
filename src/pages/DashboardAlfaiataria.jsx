import React, { useEffect, useState } from "react";
import { CheckCircle2, Clock, Gift, Phone, Scissors, Wallet } from "lucide-react";
import { Card, Empty, PageTitle, Pill, StatCard } from "../components/ui";
import { BRASS_SOFT, INK_SOFT, LINE, STATUS, STATUS_STYLE, TEXT_MUTED } from "../lib/constants";
import { brl, diasAte, fmtData } from "../lib/helpers";
import { supabase } from "../supabaseClient";

const CHAVE_TELEFONE_ICARO = "telefone_icaro";
const STATUS_PAINEL = STATUS.filter((s) => s !== "Pronto" && s !== "Doação");

export default function DashboardAlfaiataria({ pecas, irPara }) {
  const [telIcaro, setTelIcaro] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("config").select("valor").eq("chave", CHAVE_TELEFONE_ICARO).maybeSingle();
      if (data?.valor) setTelIcaro(data.valor);
    })();
  }, []);

  // Doação não conta como venda pro cliente, mas o custo de produção
  // (Icaro) continua contando normal — a peça foi feita do mesmo jeito.
  const naoDoacao = (p) => p.status !== "Doação";
  const doacoes = pecas.filter((p) => p.status === "Doação");
  const abertas = pecas.filter((p) => p.status !== "Entregue" && naoDoacao(p));
  const totalGeral = pecas.reduce((s, p) => s + (parseFloat(p.valorTotal) || 0), 0);
  const pagoGeral = pecas.reduce((s, p) => s + (parseFloat(p.pago) || 0), 0);
  const totalVenda = pecas.filter(naoDoacao).reduce((s, p) => s + (parseFloat(p.valorVenda) || 0), 0);
  const proximas = [...abertas]
    .filter((p) => p.previsaoEntrega)
    .sort((a, b) => a.previsaoEntrega.localeCompare(b.previsaoEntrega))
    .slice(0, 6);

  return (
    <div>
      <PageTitle eyebrow="Visão geral — alfaiataria" title="Painel Alfaiataria" />

      <Card style={{ padding: 16 }} className="mb-6">
        <div className="flex items-center gap-2">
          <Phone size={16} color="#A9793E" />
          <div style={{ fontSize: 13, fontWeight: 600 }}>Produção: Icaro</div>
        </div>
        {telIcaro ? (
          <div style={{ fontSize: 13, color: INK_SOFT, marginTop: 4 }}>
            WhatsApp configurado: <strong>{telIcaro}</strong>
          </div>
        ) : (
          <div style={{ fontSize: 13, color: "#9C4A1E", marginTop: 4 }}>
            WhatsApp do Icaro ainda não configurado — configure em <strong>Configurações</strong> no menu.
          </div>
        )}
      </Card>

      <div className="grid gap-4 mb-8" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
        <StatCard label="Peças em aberto" value={abertas.length} icon={Scissors} />
        <StatCard label="Vendido (R$)" value={brl(totalVenda)} icon={Wallet} />
        <StatCard label="Total devido (Icaro)" value={brl(totalGeral)} icon={Wallet} />
        <StatCard label="Pago ao Icaro" value={brl(pagoGeral)} icon={CheckCircle2} />
        <StatCard label="Saldo devedor (Icaro)" value={brl(totalGeral - pagoGeral)} icon={Clock} />
        <StatCard label="Doações" value={doacoes.length} icon={Gift} />
      </div>

      <div className="grid gap-6" style={{ gridTemplateColumns: "1.3fr 1fr" }}>
        <Card style={{ padding: 20 }}>
          <div className="fx-serif mb-3" style={{ fontSize: 16, fontWeight: 600 }}>
            Próximas entregas
          </div>
          {proximas.length === 0 && <Empty texto="Nenhuma previsão de entrega cadastrada ainda." />}
          {proximas.map((p) => {
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
                    {p.tipoPeca} · {fmtData(p.previsaoEntrega)} · {p.status}
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
            Peças por status
          </div>
          {STATUS_PAINEL.map((s) => {
            const n = pecas.filter((p) => p.status === s).length;
            const max = Math.max(1, ...STATUS_PAINEL.map((st) => pecas.filter((p) => p.status === st).length));
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
