import React, { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Gift, PackageCheck, Shirt, Target, Timer, TrendingUp, Users, Wallet } from "lucide-react";
import { Card, Empty, PageTitle, Pill, StatCard } from "../components/ui";
import AniversariantesDoMes from "../components/AniversariantesDoMes";
import { BRASS, BRASS_SOFT, INK_SOFT, LINE, STATUS, STATUS_STYLE, TEXT_MUTED } from "../lib/constants";
import { brl, diasAte, fmtData, hojeISO, temposMediosProducao, valorRecebidoEfetivo } from "../lib/helpers";
import CentralAlertas from "../components/CentralAlertas";
import { supabase } from "../supabaseClient";

const STATUS_PAINEL = STATUS.filter((s) => s !== "Pronto" && s !== "Doação");
const VERMELHO = "#9C4A1E";
const CHAVE_META = "meta_vendas_camisaria";

export default function Dashboard({ pedidos, pecas, despesas, estoqueTecidos, irPara, irParaTab }) {
  const [meta, setMeta] = useState(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("config").select("valor").eq("chave", CHAVE_META).maybeSingle();
      if (data?.valor) setMeta(parseFloat(data.valor) || null);
    })();
  }, []);
  // Doação não conta na produção nem no faturamento — é uma peça dada,
  // não vendida, então sai das contas de quantidade/valor do cliente.
  const naoDoacao = (p) => p.status !== "Doação";
  const doacoes = pedidos.filter((p) => p.status === "Doação");
  const abertos = pedidos.filter((p) => p.status !== "Entregue" && naoDoacao(p));

  // pagoFabiana.statusPagamento só vira "Pago" quando as DUAS partes de um
  // pagamento dividido estão pagas — por isso usamos valorRecebidoEfetivo
  // pra somar o que já foi efetivamente pago mesmo num pedido parcial.
  function pagoFabianaEfetivo(p) {
    return valorRecebidoEfetivo({
      pagamentoDividido: p.pagamentoFabianaDividido,
      valorEntrada: p.valorEntradaFabiana,
      statusEntrada: p.statusEntradaFabiana,
      valorRestante: p.valorRestanteFabiana,
      statusRestante: p.statusRestanteFabiana,
      valorTotal: p.pagoFabiana.valor,
      statusTotal: p.pagoFabiana.statusPagamento,
      labelPago: "Pago",
    });
  }
  const comCustoFabi = pedidos.filter((p) => parseFloat(p.pagoFabiana.valor) > 0);

  // Atrasado = pedido aberto há 45+ dias desde a data do pedido — não depende
  // da previsão de entrega estar preenchida (nem sempre está).
  const diasDesdePedido = (p) => (p.dataPedido ? -diasAte(p.dataPedido) : 0);
  const atrasados = abertos.filter((p) => diasDesdePedido(p) >= 45);
  const idsAtrasados = new Set(atrasados.map((p) => p.id));
  const proximos = [...abertos]
    .filter((p) => p.previsaoEntrega && !idsAtrasados.has(p.id))
    .sort((a, b) => a.previsaoEntrega.localeCompare(b.previsaoEntrega))
    .slice(0, 6);

  const somaFabPaga = comCustoFabi.reduce((s, p) => s + pagoFabianaEfetivo(p), 0);
  const somaFab = comCustoFabi.reduce((s, p) => s + ((parseFloat(p.pagoFabiana.valor) || 0) - pagoFabianaEfetivo(p)), 0);
  const camisasEmProducao = abertos.reduce((s, p) => s + (parseFloat(p.quantidade) || 0), 0);
  const camisasEntregues = abertos.reduce((s, p) => s + (parseFloat(p.qtEntregue) || 0), 0);
  const saldoAEntregar = Math.max(0, camisasEmProducao - camisasEntregues);

  // Margem = valor vendido - valor pago à Fabiana, somado em todos os pedidos
  // (doação já fica de fora, ela não entra na venda nem no custo dela).
  const naoDoacaoLista = pedidos.filter(naoDoacao);
  const totalVendido = naoDoacaoLista.reduce((s, p) => s + (parseFloat(p.aReceber.valor) || 0), 0);
  const totalCustoFabi = naoDoacaoLista.reduce((s, p) => s + (parseFloat(p.pagoFabiana.valor) || 0), 0);
  const margem = totalVendido - totalCustoFabi;

  // Tempo médio de produção, separado por tipo de cliente (novo vs recompra).
  const { novos: tempoMedioNovos, recompra: tempoMedioRecompra } = temposMediosProducao(pedidos);

  // Alertas de outras abas, reunidos aqui pra dar uma visão única do que
  // precisa de atenção sem precisar entrar em cada uma.
  const pecasAtrasadas = (pecas || []).filter((p) => p.status !== "Entregue" && p.previsaoEntrega && diasAte(p.previsaoEntrega) < 0).length;
  const despesasAtrasadas = (despesas || []).filter((d) => d.status !== "Pago" && d.vencimento < hojeISO()).length;
  const estoqueBaixo = (estoqueTecidos || []).filter((e) => e.saldoMetros < e.metrosPorRolo).length;

  // Vendido no mês corrente, pra comparar com a meta configurada.
  const mesAtual = hojeISO().slice(0, 7);
  const vendidoNoMes = naoDoacaoLista
    .filter((p) => (p.dataPedido || "").slice(0, 7) === mesAtual)
    .reduce((s, p) => s + (parseFloat(p.aReceber.valor) || 0), 0);

  return (
    <div>
      <PageTitle eyebrow="Visão geral — camisaria" title="Painel Camisaria" />

      <CentralAlertas
        pedidosAtrasados={atrasados.length}
        pecasAtrasadas={pecasAtrasadas}
        despesasAtrasadas={despesasAtrasadas}
        estoqueBaixo={estoqueBaixo}
        irParaTab={irParaTab}
      />

      <div className="grid gap-4 mb-8" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
        <StatCard label="Total de clientes" value={new Set(pedidos.map((p) => p.cliente.trim().toLowerCase())).size} icon={Users} />
        <StatCard label="Camisas em produção" value={camisasEmProducao} icon={Shirt} />
        <StatCard label="Entregue parcial" value={camisasEntregues} icon={PackageCheck} />
        <StatCard label="Saldo a entregar" value={saldoAEntregar} icon={Shirt} />
        <StatCard label="Pedidos atrasados" value={atrasados.length} icon={AlertTriangle} accent={atrasados.length > 0 ? VERMELHO : undefined} />
        <StatCard label="Pago à Fabiana" value={brl(somaFabPaga)} icon={CheckCircle2} />
        <StatCard label="Devido à Fabiana" value={brl(somaFab)} icon={Wallet} />
        <StatCard label="Margem estimada" value={brl(margem)} icon={TrendingUp} />
        <StatCard label="Tempo médio — cliente novo" value={tempoMedioNovos !== null ? `${tempoMedioNovos}d` : "—"} icon={Timer} />
        <StatCard label="Tempo médio — recompra" value={tempoMedioRecompra !== null ? `${tempoMedioRecompra}d` : "—"} icon={Timer} />
        <StatCard label="Doações" value={doacoes.reduce((s, p) => s + (parseFloat(p.quantidade) || 0), 0)} icon={Gift} />
      </div>

      <AniversariantesDoMes />

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

      {atrasados.length > 0 && (
        <Card style={{ padding: 20 }} className="mb-6">
          <div className="fx-serif mb-3 flex items-center gap-2" style={{ fontSize: 16, fontWeight: 600, color: VERMELHO }}>
            <AlertTriangle size={16} /> Atrasados ({atrasados.length})
          </div>
          {atrasados.map((p) => {
            const dias = diasDesdePedido(p);
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
                    Pedido {fmtData(p.dataPedido)} · {p.status}
                  </div>
                </div>
                <Pill text={`${dias}d desde o pedido`} style={{ bg: "#F6E3D9", fg: VERMELHO }} />
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
