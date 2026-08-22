import React, { useState } from "react";
import { ChevronRight, Download, Package, TrendingUp, Users, Wallet } from "lucide-react";
import { Card, Empty, Field, PageTitle, Pill, StatCard } from "../components/ui";
import { FORMAS_PAGAMENTO, LINE, PAG_STYLE, STATUS_STYLE, TEXT_MUTED, TIPOS_PECA, inputStyle } from "../lib/constants";
import { brl, fmtData, valorRecebidoEfetivo } from "../lib/helpers";

const LINE_STYLE = {
  Camisaria: { bg: "#EFE1CC", fg: "#A9793E" },
  Alfaiataria: { bg: "#E9E1F5", fg: "#5B3E96" },
};

// statusPagamento aqui já reflete pagamento dividido (entrada recebida +
// restante pendente vira "Parcial", não "Pendente" com o valor inteiro).
function statusEValorPendente(p, valor, statusTotal) {
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
  return { pendente, status: pendente === 0 ? statusTotal : recebido > 0 ? "Parcial" : statusTotal };
}

function montarLinhas(pedidos, pecas, planos) {
  const camisas = pedidos
    .filter((p) => p.status !== "Doação" && !p.origemPlanoId)
    .map((p) => {
      const valor = parseFloat(p.aReceber.valor) || 0;
      const { pendente, status } = statusEValorPendente(p, valor, p.aReceber.statusPagamento || "Pendente");
      return {
        id: "pedido-" + p.id,
        linha: "Camisaria",
        tipo: "Camisa",
        cliente: p.cliente,
        dataPedido: p.dataPedido,
        quantidade: parseFloat(p.quantidade) || 0,
        valor,
        custo: parseFloat(p.pagoFabiana.valor) || 0,
        statusPagamento: status,
        pendente,
        formaPagamento: p.formaPagamento,
        status: p.status,
        origemId: p.id,
      };
    });

  const vendasPlano = (planos || [])
    .filter((pl) => pl.dataVenda && (parseFloat(pl.valorReceber) || 0) > 0)
    .map((pl) => {
      const valor = parseFloat(pl.valorReceber) || 0;
      const { pendente, status } = statusEValorPendente(pl, valor, pl.statusPagamentoVenda || "Pendente");
      return {
        id: "plano-" + pl.id,
        linha: "Camisaria",
        tipo: "Plano de Assinatura",
        cliente: pl.cliente,
        dataPedido: pl.dataVenda,
        quantidade: parseFloat(pl.quantidade) || 0,
        valor,
        custo: 0,
        statusPagamento: status,
        pendente,
        formaPagamento: pl.formaPagamento,
        status: "Venda do plano",
        origemId: null,
      };
    });

  const trajes = pecas
    .filter((p) => p.status !== "Doação")
    .map((p) => {
      const valor = parseFloat(p.valorVenda) || 0;
      const { pendente, status } = statusEValorPendente(p, valor, p.statusPagamentoVenda || "Pendente");
      return {
        id: "peca-" + p.id,
        linha: "Alfaiataria",
        tipo: p.tipoPeca,
        cliente: p.cliente,
        dataPedido: p.dataPedido,
        quantidade: 1,
        valor,
        custo: parseFloat(p.valorTotal) || 0,
        statusPagamento: status,
        pendente,
        formaPagamento: p.formaPagamento,
        status: p.status,
        origemId: p.id,
      };
    });

  return [...camisas, ...vendasPlano, ...trajes];
}

export default function Consolidado({ pedidos, pecas, planos, irPara, irParaPeca }) {
  const [busca, setBusca] = useState("");
  const [dataIni, setDataIni] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [linhaFiltro, setLinhaFiltro] = useState("Todas");
  const [forma, setForma] = useState("Todas");
  const [status, setStatus] = useState(null);

  const todas = montarLinhas(pedidos, pecas, planos);

  const filtrados = todas
    .filter((l) => {
      if (!l.dataPedido) return false;
      if (busca && !l.cliente.toLowerCase().includes(busca.toLowerCase())) return false;
      if (dataIni && l.dataPedido < dataIni) return false;
      if (dataFim && l.dataPedido > dataFim) return false;
      if (linhaFiltro !== "Todas" && l.linha !== linhaFiltro) return false;
      if (forma !== "Todas" && l.formaPagamento !== forma) return false;
      return true;
    })
    .sort((a, b) => b.dataPedido.localeCompare(a.dataPedido));

  const totalPecas = filtrados.reduce((s, l) => s + (l.quantidade || 0), 0);
  const totalVendido = filtrados.reduce((s, l) => s + (l.valor || 0), 0);
  const totalCusto = filtrados.reduce((s, l) => s + (l.custo || 0), 0);
  const margem = totalVendido - totalCusto;
  const totalPendente = filtrados.reduce((s, l) => s + (l.pendente || 0), 0);
  const ticketMedio = totalPecas ? totalVendido / totalPecas : 0;
  const totalClientes = new Set(filtrados.map((l) => l.cliente.trim().toLowerCase())).size;

  const porTipoPeca = TIPOS_PECA.map((t) => {
    const doTipo = filtrados.filter((l) => l.linha === "Alfaiataria" && l.tipo === t);
    return { tipo: t, qtd: doTipo.length, valor: doTipo.reduce((s, l) => s + l.valor, 0) };
  }).filter((x) => x.qtd > 0);

  function abrirLinha(l) {
    if (l.linha === "Camisaria" && l.origemId) irPara(l.origemId);
    else if (l.linha === "Alfaiataria" && l.origemId) irParaPeca(l.origemId);
  }

  function exportarCSV() {
    const linhas = [
      ["Data", "Linha", "Tipo", "Cliente", "Quantidade", "Valor (R$)", "Forma de Pagamento", "Status Pagamento", "Status Produção"].join(";"),
      ...filtrados.map((l) =>
        [
          fmtData(l.dataPedido),
          l.linha,
          l.tipo,
          l.cliente.replace(/;/g, ","),
          l.quantidade,
          l.valor.toFixed(2).replace(".", ","),
          l.formaPagamento || "—",
          l.statusPagamento,
          l.status,
        ].join(";")
      ),
    ];
    const csv = "﻿" + linhas.join("\n");
    try {
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `consolidado-${dataIni || "inicio"}_a_${dataFim || "hoje"}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatus({ ok: true, msg: "Consolidado baixado — pode abrir direto no Excel/Sheets." });
    } catch {
      setStatus({ ok: false, msg: "O download não funcionou aqui — tente novamente." });
    }
  }

  return (
    <div>
      <PageTitle eyebrow="Camisaria + Alfaiataria, por peça" title="Consolidado" />

      <Card style={{ padding: 20 }} className="mb-6">
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
          <Field label="Buscar cliente">
            <input style={inputStyle} value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nome do cliente" />
          </Field>
          <Field label="De">
            <input type="date" style={inputStyle} value={dataIni} onChange={(e) => setDataIni(e.target.value)} />
          </Field>
          <Field label="Até">
            <input type="date" style={inputStyle} value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
          </Field>
          <Field label="Linha">
            <select style={inputStyle} value={linhaFiltro} onChange={(e) => setLinhaFiltro(e.target.value)}>
              <option>Todas</option>
              <option>Camisaria</option>
              <option>Alfaiataria</option>
            </select>
          </Field>
          <Field label="Forma de pagamento">
            <select style={inputStyle} value={forma} onChange={(e) => setForma(e.target.value)}>
              <option>Todas</option>
              {FORMAS_PAGAMENTO.map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
          </Field>
        </div>
      </Card>

      <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <StatCard label="Peças no período" value={totalPecas} icon={Package} />
        <StatCard label="Total vendido (R$)" value={brl(totalVendido)} icon={Wallet} />
        <StatCard label="Margem estimada" value={brl(margem)} icon={TrendingUp} />
        <StatCard label="A receber (pendente)" value={brl(totalPendente)} icon={Wallet} />
        <StatCard label="Ticket médio (peça)" value={brl(ticketMedio)} icon={TrendingUp} />
        <StatCard label="Clientes no período" value={totalClientes} icon={Users} />
      </div>

      {porTipoPeca.length > 0 && (
        <Card style={{ padding: 20 }} className="mb-6">
          <div className="fx-serif mb-3" style={{ fontSize: 16, fontWeight: 600 }}>
            Alfaiataria por tipo de peça
          </div>
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))" }}>
            {porTipoPeca.map((t) => (
              <div key={t.tipo}>
                <div style={{ fontSize: 12, color: TEXT_MUTED, fontWeight: 600 }}>{t.tipo}</div>
                <div className="fx-serif" style={{ fontSize: 20, fontWeight: 600 }}>
                  {t.qtd}
                </div>
                <div className="fx-mono" style={{ fontSize: 11, color: TEXT_MUTED }}>
                  {brl(t.valor)}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <button
        onClick={exportarCSV}
        className="flex items-center gap-2 mb-5"
        style={{ background: "#16212E", color: "#FFF", padding: "9px 18px", borderRadius: 8, fontWeight: 600, fontSize: 13 }}
      >
        <Download size={15} /> Exportar CSV (Excel)
      </button>

      {status && (
        <div className="mb-5 px-4 py-3 rounded" style={{ background: status.ok ? "#DCEBDD" : "#F6E3D9", color: status.ok ? "#2C6E31" : "#9C4A1E", fontSize: 13 }}>
          {status.msg}
        </div>
      )}

      <Card>
        {filtrados.length === 0 && (
          <div className="p-6">
            <Empty texto="Nada encontrado no período/filtro selecionado." />
          </div>
        )}
        {filtrados.map((l, i) => {
          const clicavel = !!l.origemId;
          return (
            <div
              key={l.id}
              onClick={() => abrirLinha(l)}
              className="w-full flex items-center justify-between px-5 py-3.5"
              style={{
                borderBottom: i < filtrados.length - 1 ? `1px solid ${LINE}` : "none",
                cursor: clicavel ? "pointer" : "default",
              }}
            >
              <div>
                <div className="flex items-center gap-1.5">
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{l.cliente || "Sem nome"}</span>
                  <Pill text={l.linha} style={LINE_STYLE[l.linha]} />
                </div>
                <div style={{ fontSize: 12, color: TEXT_MUTED }}>
                  {l.tipo} · {fmtData(l.dataPedido)} · {l.formaPagamento || "forma não informada"} · {l.quantidade} un
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="fx-mono" style={{ fontSize: 13, fontWeight: 600 }}>
                  {brl(l.valor)}
                </span>
                <Pill text={l.statusPagamento} style={PAG_STYLE[l.statusPagamento]} />
                <Pill text={l.status} style={STATUS_STYLE[l.status] || { bg: "#EDEAE0", fg: "#2A3B4D" }} />
                {clicavel && <ChevronRight size={16} color={TEXT_MUTED} />}
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
