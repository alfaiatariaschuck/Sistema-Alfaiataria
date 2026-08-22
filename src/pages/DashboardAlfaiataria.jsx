import React, { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, Gift, Phone, Scissors, Target, Timer, TrendingUp, Users, Wallet } from "lucide-react";
import { Card, Empty, PageTitle, Pill, StatCard } from "../components/ui";
import { BRASS, BRASS_SOFT, INK_SOFT, LINE, STATUS, STATUS_STYLE, TEXT_MUTED } from "../lib/constants";
import { brl, diasAte, diasEntre, fmtData, hojeISO } from "../lib/helpers";
import { supabase } from "../supabaseClient";

const CHAVE_TELEFONE_ICARO = "telefone_icaro";
const CHAVE_META = "meta_vendas_alfaiataria";
const STATUS_PAINEL = STATUS.filter((s) => s !== "Pronto" && s !== "Doação");
const VERMELHO = "#9C4A1E";

export default function DashboardAlfaiataria({ pecas, irPara }) {
  const [telIcaro, setTelIcaro] = useState("");
  const [meta, setMeta] = useState(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("config").select("chave, valor").in("chave", [CHAVE_TELEFONE_ICARO, CHAVE_META]);
      (data || []).forEach((row) => {
        if (row.chave === CHAVE_TELEFONE_ICARO && row.valor) setTelIcaro(row.valor);
        if (row.chave === CHAVE_META && row.valor) setMeta(parseFloat(row.valor) || null);
      });
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
  const margem = totalVenda - pecas.filter(naoDoacao).reduce((s, p) => s + (parseFloat(p.valorTotal) || 0), 0);
  const entreguesComData = pecas.filter((p) => p.status === "Entregue" && p.dataEntrega);
  const tempoMedio = entreguesComData.length
    ? Math.round(entreguesComData.reduce((s, p) => s + (diasEntre(p.dataPedido, p.dataEntrega) || 0), 0) / entreguesComData.length)
    : null;
  const mesAtual = hojeISO().slice(0, 7);
  const vendidoNoMes = pecas
    .filter(naoDoacao)
    .filter((p) => (p.dataPedido || "").slice(0, 7) === mesAtual)
    .reduce((s, p) => s + (parseFloat(p.valorVenda) || 0), 0);
  const comPrevisao = [...abertas].filter((p) => p.previsaoEntrega).sort((a, b) => a.previsaoEntrega.localeCompare(b.previsaoEntrega));
  const atrasadas = comPrevisao.filter((p) => diasAte(p.previsaoEntrega) < 0);
  const proximas = comPrevisao.filter((p) => diasAte(p.previsaoEntrega) >= 0).slice(0, 6);

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
        <StatCard label="Total de clientes" value={new Set(pecas.map((p) => p.cliente.trim().toLowerCase())).size} icon={Users} />
        <StatCard label="Peças em aberto" value={abertas.length} icon={Scissors} />
        <StatCard label="Vendido (R$)" value={brl(totalVenda)} icon={Wallet} />
        <StatCard label="Total devido (Icaro)" value={brl(totalGeral)} icon={Wallet} />
        <StatCard label="Pago ao Icaro" value={brl(pagoGeral)} icon={CheckCircle2} />
        <StatCard label="Saldo devedor (Icaro)" value={brl(totalGeral - pagoGeral)} icon={Clock} />
        <StatCard label="Margem estimada" value={brl(margem)} icon={TrendingUp} />
        <StatCard label="Tempo médio de produção" value={tempoMedio !== null ? `${tempoMedio}d` : "—"} icon={Timer} />
        <StatCard label="Peças atrasadas" value={atrasadas.length} icon={AlertTriangle} accent={atrasadas.length > 0 ? VERMELHO : undefined} />
        <StatCard label="Doações" value={doacoes.length} icon={Gift} />
      </div>

      {meta > 0 && (
        <Card style={{ padding: 20 }} className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Target size={16} color={BRASS} />
              <div className="fx-serif" style={{ fontSize: 16, fontWeight: 600 }}>
                Meta do mês
              </div>
            </div>
            <span className="fx-mono" style={{ fontSize: 13, fontWeight: 700, color: BRASS }}>
              {brl(vendidoNoMes)} / {brl(meta)}
            </span>
          </div>
          <div style={{ background: LINE, borderRadius: 4, height: 8 }}>
            <div style={{ width: `${Math.min(100, (vendidoNoMes / meta) * 100)}%`, background: BRASS, height: 8, borderRadius: 4 }} />
          </div>
          <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 6 }}>
            {vendidoNoMes >= meta ? "Meta batida! 🎉" : `Faltam ${brl(meta - vendidoNoMes)} pra bater a meta.`}
          </div>
        </Card>
      )}

      {atrasadas.length > 0 && (
        <Card style={{ padding: 20 }} className="mb-6">
          <div className="fx-serif mb-3 flex items-center gap-2" style={{ fontSize: 16, fontWeight: 600, color: VERMELHO }}>
            <AlertTriangle size={16} /> Atrasadas ({atrasadas.length})
          </div>
          {atrasadas.map((p) => {
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
                <Pill text={dias === 0 ? "hoje" : `em ${dias}d`} style={{ bg: BRASS_SOFT, fg: "#A9793E" }} />
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
          <div className="flex justify-between pt-2 mt-1" style={{ borderTop: `1px solid ${LINE}`, fontSize: 12, fontWeight: 700 }}>
            <span>Total</span>
            <span className="fx-mono">{pecas.filter(naoDoacao).length} peças</span>
          </div>
        </Card>
      </div>
    </div>
  );
}
