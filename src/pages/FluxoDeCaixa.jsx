import React from "react";
import { CalendarClock, CheckCircle2, Clock, Wallet } from "lucide-react";
import { Card, Empty, PageTitle, Pill, StatCard } from "../components/ui";
import { BRASS, LINE, PAG_STYLE, TEXT_MUTED } from "../lib/constants";
import { brl, valorRecebidoEfetivo } from "../lib/helpers";

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function rotuloMes(chave) {
  const [ano, mes] = chave.split("-");
  return `${MESES[parseInt(mes, 10) - 1]}/${ano.slice(2)}`;
}

export default function FluxoDeCaixa({ pedidos, pecas, irParaPedido, irParaPeca }) {
  function linhaReceber(p, tipo, valorTotal, statusTotal) {
    const valor = parseFloat(valorTotal) || 0;
    const recebido = valorRecebidoEfetivo({
      pagamentoDividido: p.pagamentoDividido,
      valorEntrada: p.valorEntrada,
      statusEntrada: p.statusEntrada,
      valorRestante: p.valorRestante,
      statusRestante: p.statusRestante,
      valorTotal: valor,
      statusTotal,
    });
    const pendente = Math.max(0, valor - recebido);
    return {
      id: p.id,
      tipo,
      cliente: p.cliente,
      valor,
      recebido,
      pendente,
      status: pendente === 0 ? "Recebido" : recebido > 0 ? "Parcial" : "Pendente",
      dataRef: p.previsaoEntrega || p.dataPedido,
    };
  }

  const receberCamisa = pedidos.filter((p) => parseFloat(p.aReceber.valor) > 0).map((p) => linhaReceber(p, "camisa", p.aReceber.valor, p.aReceber.statusPagamento));
  const receberPeca = (pecas || [])
    .filter((p) => parseFloat(p.valorVenda) > 0)
    .map((p) => linhaReceber(p, "peca", p.valorVenda, p.statusPagamentoVenda || "Pendente"));
  const receber = [...receberCamisa, ...receberPeca];

  const pagarFab = pedidos
    .filter((p) => parseFloat(p.pagoFabiana.valor) > 0)
    .map((p) => ({ id: p.id, tipo: "camisa", cliente: p.cliente, valor: parseFloat(p.pagoFabiana.valor), pendente: p.pagoFabiana.statusPagamento !== "Pago" ? parseFloat(p.pagoFabiana.valor) : 0, status: p.pagoFabiana.statusPagamento, dataRef: p.previsaoEntrega || p.dataPedido }));
  const pagarIcaro = (pecas || [])
    .filter((p) => (parseFloat(p.valorTotal) || 0) > 0)
    .map((p) => ({
      id: p.id,
      tipo: "peca",
      cliente: p.cliente,
      valor: parseFloat(p.valorTotal) || 0,
      pendente: Math.max(0, (parseFloat(p.valorTotal) || 0) - (parseFloat(p.pago) || 0)),
      status: (parseFloat(p.valorTotal) || 0) - (parseFloat(p.pago) || 0) > 0 ? "Pendente" : "Pago",
      dataRef: p.previsaoEntrega || p.dataPedido,
    }));
  const pagar = [...pagarFab, ...pagarIcaro];

  const recebido = receber.reduce((s, p) => s + p.recebido, 0);
  const pago = pagar.reduce((s, p) => s + (p.valor - p.pendente), 0);

  const saldo = recebido - pago;

  const receberPendente = receber.filter((p) => p.pendente > 0);
  const pagarPendente = pagar.filter((p) => p.pendente > 0);

  function agruparPorMes(lista, valorFn) {
    const mapa = new Map();
    lista.forEach((item) => {
      const chave = (item.dataRef || "").slice(0, 7);
      if (!chave) return;
      if (!mapa.has(chave)) mapa.set(chave, 0);
      mapa.set(chave, mapa.get(chave) + valorFn(item));
    });
    return [...mapa.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }

  const projecaoReceber = agruparPorMes(receberPendente, (p) => p.pendente);
  const projecaoPagar = agruparPorMes(pagarPendente, (p) => p.pendente);
  const maxProjecao = Math.max(1, ...projecaoReceber.map(([, v]) => v), ...projecaoPagar.map(([, v]) => v));

  function abrir(item) {
    if (item.tipo === "camisa") irParaPedido(item.id);
    else irParaPeca(item.id);
  }

  return (
    <div>
      <PageTitle eyebrow="Financeiro — camisaria + alfaiataria" title="Fluxo de Caixa" />
      <div className="grid gap-4 mb-8" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
        <StatCard label="Recebido" value={brl(recebido)} icon={Wallet} />
        <StatCard label="A receber (pendente)" value={brl(receberPendente.reduce((s, p) => s + p.pendente, 0))} icon={Clock} />
        <StatCard label="Pago à produção (Fabi + Icaro)" value={brl(pago)} icon={Wallet} />
        <StatCard label="Saldo em caixa" value={brl(saldo)} icon={CheckCircle2} />
      </div>

      {(projecaoReceber.length > 0 || projecaoPagar.length > 0) && (
        <Card style={{ padding: 20 }} className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <CalendarClock size={16} color={BRASS} />
            <div className="fx-serif" style={{ fontSize: 16, fontWeight: 600 }}>
              Projeção — pendentes por mês
            </div>
          </div>
          <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 12 }}>
            Agrupado pela previsão de entrega (ou data do pedido, se não tiver previsão) — dá uma ideia de quando o
            dinheiro pendente deve entrar/sair.
          </div>
          <div className="grid gap-6" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#2C6E31", marginBottom: 8 }}>A receber</div>
              {projecaoReceber.length === 0 && <div style={{ fontSize: 12, color: TEXT_MUTED }}>Nada pendente.</div>}
              {projecaoReceber.map(([mes, valor]) => (
                <div key={mes} className="mb-2">
                  <div className="flex justify-between mb-1" style={{ fontSize: 12, color: "#16212E" }}>
                    <span>{rotuloMes(mes)}</span>
                    <span className="fx-mono">{brl(valor)}</span>
                  </div>
                  <div style={{ background: LINE, borderRadius: 4, height: 6 }}>
                    <div style={{ width: `${(valor / maxProjecao) * 100}%`, background: "#2C6E31", height: 6, borderRadius: 4 }} />
                  </div>
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#9C4A1E", marginBottom: 8 }}>A pagar (produção)</div>
              {projecaoPagar.length === 0 && <div style={{ fontSize: 12, color: TEXT_MUTED }}>Nada pendente.</div>}
              {projecaoPagar.map(([mes, valor]) => (
                <div key={mes} className="mb-2">
                  <div className="flex justify-between mb-1" style={{ fontSize: 12, color: "#16212E" }}>
                    <span>{rotuloMes(mes)}</span>
                    <span className="fx-mono">{brl(valor)}</span>
                  </div>
                  <div style={{ background: LINE, borderRadius: 4, height: 6 }}>
                    <div style={{ width: `${(valor / maxProjecao) * 100}%`, background: "#9C4A1E", height: 6, borderRadius: 4 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-6" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <Card style={{ padding: 20 }}>
          <div className="fx-serif mb-3" style={{ fontSize: 15, fontWeight: 600 }}>
            A receber de clientes
          </div>
          {receber.length === 0 && <Empty texto="Nada lançado ainda." />}
          {receber.map((p) => (
            <button key={p.tipo + "-" + p.id} onClick={() => abrir(p)} className="w-full flex items-center justify-between py-2" style={{ borderBottom: `1px solid ${LINE}`, textAlign: "left" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{p.cliente}</div>
                <div className="fx-mono" style={{ fontSize: 12, color: "#6B7280" }}>
                  {p.status === "Parcial" ? `${brl(p.recebido)} de ${brl(p.valor)}` : brl(p.valor)}
                </div>
              </div>
              <Pill text={p.status} style={PAG_STYLE[p.status]} />
            </button>
          ))}
        </Card>

        <Card style={{ padding: 20 }}>
          <div className="fx-serif mb-3" style={{ fontSize: 15, fontWeight: 600 }}>
            A pagar à produção (Fabi + Icaro)
          </div>
          {pagar.length === 0 && <Empty texto="Nada lançado ainda." />}
          {pagar.map((p) => (
            <button key={p.tipo + "-" + p.id} onClick={() => abrir(p)} className="w-full flex items-center justify-between py-2" style={{ borderBottom: `1px solid ${LINE}`, textAlign: "left" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{p.cliente}</div>
                <div className="fx-mono" style={{ fontSize: 12, color: "#6B7280" }}>
                  {brl(p.valor)}
                </div>
              </div>
              <Pill text={p.status} style={PAG_STYLE[p.status]} />
            </button>
          ))}
        </Card>
      </div>
    </div>
  );
}
