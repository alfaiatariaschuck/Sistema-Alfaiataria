import React, { useState } from "react";
import { CalendarClock, CheckCircle2, ChevronLeft, ChevronRight, Clock, Info, Wallet } from "lucide-react";
import { Card, Empty, PageTitle, Pill, StatCard } from "../components/ui";
import FaturamentoPorMes from "../components/FaturamentoPorMes";
import { BRASS, INK, LINE, PAG_STYLE, TEXT_MUTED } from "../lib/constants";
import { brl, hojeISO, valorRecebidoEfetivo } from "../lib/helpers";

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const MESES_LONGO = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function rotuloMes(chave) {
  const [ano, mes] = chave.split("-");
  return `${MESES[parseInt(mes, 10) - 1]}/${ano.slice(2)}`;
}

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
  return `${MESES_LONGO[mes - 1]} de ${ano}`;
}

export default function FluxoDeCaixa({ pedidos, pecas, irParaPedido, irParaPeca }) {
  const mesRealAtual = hojeISO().slice(0, 7);
  const [mesSelecionado, setMesSelecionado] = useState(mesRealAtual);
  const ehMesAtual = mesSelecionado === mesRealAtual;
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

  function linhaPagarFab(p) {
    const valor = parseFloat(p.pagoFabiana.valor) || 0;
    const pago = valorRecebidoEfetivo({
      pagamentoDividido: p.pagamentoFabianaDividido,
      valorEntrada: p.valorEntradaFabiana,
      statusEntrada: p.statusEntradaFabiana,
      valorRestante: p.valorRestanteFabiana,
      statusRestante: p.statusRestanteFabiana,
      valorTotal: valor,
      statusTotal: p.pagoFabiana.statusPagamento,
      labelPago: "Pago",
    });
    const pendente = Math.max(0, valor - pago);
    return {
      id: p.id,
      tipo: "camisa",
      cliente: p.cliente,
      valor,
      pago,
      pendente,
      status: pendente === 0 ? "Pago" : pago > 0 ? "Parcial" : "Pendente",
      dataRef: p.previsaoEntrega || p.dataPedido,
    };
  }
  const pagarFab = pedidos.filter((p) => parseFloat(p.pagoFabiana.valor) > 0).map(linhaPagarFab);
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

  const receberPendente = receber.filter((p) => p.pendente > 0);
  const pagarPendente = pagar.filter((p) => p.pendente > 0);

  // Recorte do mês selecionado — agrupa pela mesma referência da
  // projeção (previsão de entrega, ou data do pedido se não tiver),
  // pra fechar o mês e comparar com o que realmente entrou/saiu.
  const receberDoMes = receber.filter((p) => (p.dataRef || "").slice(0, 7) === mesSelecionado);
  const pagarDoMes = pagar.filter((p) => (p.dataRef || "").slice(0, 7) === mesSelecionado);
  const vendidoDoMes = receberDoMes.reduce((s, p) => s + p.valor, 0);
  const recebidoDoMes = receberDoMes.reduce((s, p) => s + p.recebido, 0);
  const receberPendenteDoMes = receberDoMes.reduce((s, p) => s + p.pendente, 0);
  const pagoDoMes = pagarDoMes.reduce((s, p) => s + (p.valor - p.pendente), 0);
  const pagarPendenteDoMes = pagarDoMes.reduce((s, p) => s + p.pendente, 0);
  const saldoDoMes = recebidoDoMes - pagoDoMes;

  const mesAnterior = mesAnteriorDe(mesSelecionado);
  const receberMesAnterior = receber.filter((p) => (p.dataRef || "").slice(0, 7) === mesAnterior).reduce((s, p) => s + p.valor, 0);
  const variacao = receberMesAnterior > 0 ? ((vendidoDoMes - receberMesAnterior) / receberMesAnterior) * 100 : null;

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
          disabled={ehMesAtual}
          className="flex items-center gap-1"
          style={{
            background: "#EDEAE0",
            color: ehMesAtual ? TEXT_MUTED : INK,
            padding: "7px 12px",
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 600,
            opacity: ehMesAtual ? 0.6 : 1,
          }}
        >
          mês seguinte <ChevronRight size={14} />
        </button>
        {!ehMesAtual && (
          <button onClick={() => setMesSelecionado(mesRealAtual)} style={{ color: BRASS, fontSize: 12, fontWeight: 600 }}>
            voltar pro mês atual
          </button>
        )}
      </div>

      <div className="grid gap-4 mb-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
        <StatCard label={`Vendido em ${nomeDoMes(mesSelecionado)}`} value={brl(vendidoDoMes)} icon={Wallet} />
        <StatCard
          label="Variação vs mês anterior"
          value={variacao !== null ? `${variacao >= 0 ? "+" : ""}${variacao.toFixed(0)}%` : "—"}
          icon={Clock}
          accent={variacao !== null ? (variacao < 0 ? "#9C4A1E" : "#2C6E31") : undefined}
        />
        <StatCard label="Recebido do mês" value={brl(recebidoDoMes)} icon={Wallet} />
        <StatCard label="A receber (pendente do mês)" value={brl(receberPendenteDoMes)} icon={Clock} />
        <StatCard label="Pago à produção do mês (Fabi + Icaro)" value={brl(pagoDoMes)} icon={Wallet} />
        <StatCard label="A pagar (pendente do mês)" value={brl(pagarPendenteDoMes)} icon={Clock} />
        <StatCard label="Saldo do mês (recebido − pago à produção)" value={brl(saldoDoMes)} icon={CheckCircle2} accent={saldoDoMes >= 0 ? "#2C6E31" : "#9C4A1E"} />
      </div>
      <div className="flex items-start gap-2 mb-8 p-3" style={{ background: "#F3EEDF", borderRadius: 8, fontSize: 12, color: TEXT_MUTED }}>
        <Info size={16} style={{ flexShrink: 0, marginTop: 1 }} />
        <div>
          Esse "saldo do mês" é só a fatia da produção (o que os clientes pagam menos o que se paga à Fabi/Ícaro) —
          não inclui aluguel, pró-labore, material de fornecedor nem as outras despesas. Pro saldo completo do
          negócio, incluindo tudo isso, olha o <strong>Saldo projetado</strong> em Contas a Pagar.
        </div>
      </div>

      <FaturamentoPorMes pedidos={pedidos} pecas={pecas} />

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
            A receber de clientes — {nomeDoMes(mesSelecionado)}
          </div>
          {receberDoMes.length === 0 && <Empty texto="Nada lançado nesse mês." />}
          {receberDoMes.map((p) => (
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
            A pagar à produção (Fabi + Ícaro) — {nomeDoMes(mesSelecionado)}
          </div>
          {pagarDoMes.length === 0 && <Empty texto="Nada lançado nesse mês." />}
          {pagarDoMes.map((p) => (
            <button key={p.tipo + "-" + p.id} onClick={() => abrir(p)} className="w-full flex items-center justify-between py-2" style={{ borderBottom: `1px solid ${LINE}`, textAlign: "left" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{p.cliente}</div>
                <div className="fx-mono" style={{ fontSize: 12, color: "#6B7280" }}>
                  {p.status === "Parcial" ? `${brl(p.valor - p.pendente)} de ${brl(p.valor)}` : brl(p.valor)}
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
