import React, { useState } from "react";
import { AlertCircle, CheckCircle2, Download, FileText, Package, Wallet } from "lucide-react";
import { Card, Empty, Field, PageTitle, Pill, StatCard } from "../components/ui";
import { FORMAS_PAGAMENTO, PAG_STYLE, TEXT_MUTED, inputStyle } from "../lib/constants";
import { brl, fmtData } from "../lib/helpers";

export default function Relatorio({ pedidos }) {
  const [dataIni, setDataIni] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [forma, setForma] = useState("Todas");
  const [status, setStatus] = useState(null);

  const filtrados = pedidos
    .filter((p) => {
      if (!p.dataPedido) return false;
      if (dataIni && p.dataPedido < dataIni) return false;
      if (dataFim && p.dataPedido > dataFim) return false;
      if (forma !== "Todas" && p.formaPagamento !== forma) return false;
      return true;
    })
    .sort((a, b) => a.dataPedido.localeCompare(b.dataPedido));

  const total = filtrados.reduce((s, p) => s + (parseFloat(p.aReceber.valor) || 0), 0);

  const porForma = FORMAS_PAGAMENTO.map((f) => ({
    forma: f,
    total: filtrados.filter((p) => p.formaPagamento === f).reduce((s, p) => s + (parseFloat(p.aReceber.valor) || 0), 0),
    qtd: filtrados.filter((p) => p.formaPagamento === f).length,
  })).filter((x) => x.qtd > 0);

  function exportarCSV() {
    const linhas = [
      ["Data do Pedido", "Cliente", "Valor (R$)", "Forma de Pagamento", "Status do Pagamento"].join(";"),
      ...filtrados.map((p) =>
        [
          fmtData(p.dataPedido),
          p.cliente.replace(/;/g, ","),
          (parseFloat(p.aReceber.valor) || 0).toFixed(2).replace(".", ","),
          p.formaPagamento || "—",
          p.aReceber.statusPagamento,
        ].join(";")
      ),
    ];
    const csv = "﻿" + linhas.join("\n");
    try {
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `relatorio-pedidos-${dataIni || "inicio"}_a_${dataFim || "hoje"}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatus({ ok: true, msg: "Relatório baixado — pode abrir direto no Excel/Sheets e mandar pra contabilidade." });
    } catch {
      setStatus({ ok: false, msg: "O download não funcionou aqui — tente novamente ou peça pra eu gerar de outra forma." });
    }
  }

  return (
    <div>
      <PageTitle eyebrow="Para a contabilidade" title="Relatório" />

      <Card style={{ padding: 20 }} className="mb-6">
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
          <Field label="De">
            <input type="date" style={inputStyle} value={dataIni} onChange={(e) => setDataIni(e.target.value)} />
          </Field>
          <Field label="Até">
            <input type="date" style={inputStyle} value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
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
        <StatCard label="Pedidos no período" value={filtrados.length} icon={Package} />
        <StatCard label="Total (R$)" value={brl(total)} icon={Wallet} />
        {porForma.map((f) => (
          <StatCard key={f.forma} label={f.forma} value={`${brl(f.total)} · ${f.qtd}x`} icon={FileText} />
        ))}
      </div>

      <button
        onClick={exportarCSV}
        className="flex items-center gap-2 mb-5"
        style={{ background: "#16212E", color: "#FFF", padding: "9px 18px", borderRadius: 8, fontWeight: 600, fontSize: 13 }}
      >
        <Download size={15} /> Exportar CSV (Excel)
      </button>

      {status && (
        <div className="mb-5 px-4 py-3 rounded flex items-center gap-2" style={{ background: status.ok ? "#DCEBDD" : "#F6E3D9", color: status.ok ? "#2C6E31" : "#9C4A1E" }}>
          {status.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />} {status.msg}
        </div>
      )}

      <Card>
        {filtrados.length === 0 && (
          <div className="p-6">
            <Empty texto="Nenhum pedido no período/filtro selecionado." />
          </div>
        )}
        {filtrados.map((p, i) => (
          <div key={p.id} className="flex items-center justify-between px-5 py-3" style={{ borderBottom: i < filtrados.length - 1 ? `1px solid #E4DECF` : "none" }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{p.cliente || "Sem nome"}</div>
              <div style={{ fontSize: 12, color: TEXT_MUTED }}>
                {fmtData(p.dataPedido)} · {p.formaPagamento || "forma não informada"}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="fx-mono" style={{ fontSize: 13, fontWeight: 600 }}>
                {brl(parseFloat(p.aReceber.valor) || 0)}
              </span>
              <Pill text={p.aReceber.statusPagamento} style={PAG_STYLE[p.aReceber.statusPagamento]} />
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
