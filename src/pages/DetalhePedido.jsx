import React, { useState } from "react";
import { CheckCircle2, Clock, Printer, RefreshCw, Save, Trash2 } from "lucide-react";
import { Card, Field, Pill } from "../components/ui";
import { CampoDescricao } from "../components/CampoComOpcoes";
import { BRASS, BRASS_SOFT, DESC_CAMPOS, FORMAS_PAGAMENTO, INK_SOFT, LINE, MEDIDA_LABELS, STATUS, TEXT_MUTED, inputStyle } from "../lib/constants";
import { finalDaMedida } from "../lib/helpers";
import FichaImprimivel from "./FichaImprimivel";

export default function DetalhePedido({ pedido: p, onVoltar, onCampo, onSub, onRemover, onAddTecido, onTecido, onConverterPlano }) {
  const [mostrarFicha, setMostrarFicha] = useState(false);
  const [confirmado, setConfirmado] = useState(false);
  const [convertendo, setConvertendo] = useState(false);

  function set(campo, valor) {
    onCampo(p.id, campo, valor);
  }
  function setSub(grupo, sub, valor) {
    onSub(p.id, grupo, sub, valor);
  }
  async function converter() {
    if (
      !confirm(
        `Converter o pedido de ${p.cliente} num Plano de Assinatura? Ele sai da lista de Pedidos e vira um plano de controle — você emite o pedido de verdade quando quiser, na aba Planos de Assinatura.`
      )
    )
      return;
    setConvertendo(true);
    try {
      await onConverterPlano(p);
    } finally {
      setConvertendo(false);
    }
  }
  function salvar() {
    setConfirmado(true);
    setTimeout(() => setConfirmado(false), 2500);
  }

  return (
    <div>
      <button onClick={onVoltar} className="mb-4 flex items-center gap-1" style={{ color: BRASS, fontSize: 13, fontWeight: 600 }}>
        ← voltar para pedidos
      </button>
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="uppercase" style={{ color: BRASS, fontSize: 11, letterSpacing: 1.5, fontWeight: 600 }}>
            Pedido
          </div>
          <div className="flex items-center gap-2">
            <h1 className="fx-serif" style={{ fontSize: 26, fontWeight: 600 }}>
              {p.cliente}
            </h1>
            {p.recompra && <Pill text="↻ Recompra" style={{ bg: BRASS_SOFT, fg: BRASS }} />}
            {p.assinatura && <Pill text="📦 Assinatura" style={{ bg: BRASS_SOFT, fg: BRASS }} />}
          </div>
        </div>
        <button
          onClick={() => {
            if (confirm("Excluir este pedido?")) onRemover(p.id);
          }}
          className="flex items-center gap-1"
          style={{ color: "#9C4A1E", fontSize: 13 }}
        >
          <Trash2 size={14} /> Excluir
        </button>
      </div>

      <button
        onClick={() => setMostrarFicha(true)}
        className="flex items-center gap-2 mb-6"
        style={{ background: BRASS, color: "#FFF", padding: "9px 18px", borderRadius: 8, fontWeight: 600, fontSize: 13 }}
      >
        <Printer size={15} /> Gerar ficha em PDF (para a Fabi)
      </button>

      {mostrarFicha && <FichaImprimivel pedido={p} onFechar={() => setMostrarFicha(false)} />}

      <div className="grid gap-6" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <Card style={{ padding: 20 }}>
          <div className="fx-serif mb-3" style={{ fontSize: 15, fontWeight: 600 }}>
            Status do pedido
          </div>
          <Field label="Status">
            <select style={inputStyle} value={p.status} onChange={(e) => set("status", e.target.value)}>
              {STATUS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
          <div className="grid gap-3" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <Field label="Previsão de entrega">
              <input type="date" style={inputStyle} value={p.previsaoEntrega} onChange={(e) => set("previsaoEntrega", e.target.value)} />
            </Field>
            <Field label="Qtd entregue">
              <div className="flex gap-1">
                <input type="number" style={inputStyle} value={p.qtEntregue} onChange={(e) => set("qtEntregue", e.target.value)} />
                <button
                  type="button"
                  onClick={() => set("qtEntregue", (parseFloat(p.qtEntregue) || 0) + 1)}
                  title="Dar baixa de +1 entrega"
                  style={{ background: BRASS_SOFT, color: BRASS, padding: "0 12px", borderRadius: 6, fontWeight: 700, fontSize: 14 }}
                >
                  +1
                </button>
              </div>
            </Field>
          </div>
          <label className="flex items-center gap-2 mt-3" style={{ cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={!!p.assinatura}
              onChange={(e) => set("assinatura", e.target.checked)}
              style={{ width: 16, height: 16, accentColor: BRASS }}
            />
            <span style={{ fontSize: 13, fontWeight: 600 }}>📦 Cliente Plano de Assinatura</span>
          </label>
          {p.assinatura && (
            <button
              type="button"
              onClick={converter}
              disabled={convertendo}
              className="flex items-center gap-2 mt-2"
              style={{ background: BRASS, color: "#FFF", padding: "7px 14px", borderRadius: 6, fontWeight: 600, fontSize: 12, opacity: convertendo ? 0.7 : 1 }}
            >
              <RefreshCw size={13} /> {convertendo ? "Convertendo…" : "Converter em Plano de Assinatura"}
            </button>
          )}
          <div className="mt-3">
            <div className="flex justify-between mb-1" style={{ fontSize: 12, color: INK_SOFT }}>
              <span>Progresso do pedido</span>
              <span className="fx-mono">
                {p.qtEntregue || 0} / {p.quantidade || 0}
              </span>
            </div>
            <div style={{ background: LINE, borderRadius: 4, height: 8 }}>
              <div
                style={{
                  width: `${Math.min(100, ((parseFloat(p.qtEntregue) || 0) / (parseFloat(p.quantidade) || 1)) * 100)}%`,
                  background: BRASS,
                  height: 8,
                  borderRadius: 4,
                }}
              />
            </div>
          </div>
        </Card>

        <Card style={{ padding: 20 }}>
          <div className="fx-serif mb-3" style={{ fontSize: 15, fontWeight: 600 }}>
            Financeiro
          </div>
          <div className="grid gap-3" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <Field label="A receber (R$)">
              <input type="number" step="0.01" style={inputStyle} value={p.aReceber.valor} onChange={(e) => setSub("aReceber", "valor", e.target.value)} />
            </Field>
            <Field label="Forma de pagamento">
              <select style={inputStyle} value={p.formaPagamento || ""} onChange={(e) => set("formaPagamento", e.target.value)}>
                <option value="">Selecione</option>
                {FORMAS_PAGAMENTO.map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>
            </Field>
            <Field label="Status recebimento">
              <select style={inputStyle} value={p.aReceber.statusPagamento} onChange={(e) => setSub("aReceber", "statusPagamento", e.target.value)}>
                <option>Pendente</option>
                <option>Recebido</option>
              </select>
            </Field>
            <Field label="Valor Fabiana (R$)">
              <input
                type="number"
                step="0.01"
                style={inputStyle}
                value={p.pagoFabiana.valor}
                onChange={(e) => setSub("pagoFabiana", "valor", e.target.value)}
              />
            </Field>
            <Field label="Status pagamento Fabiana">
              <select style={inputStyle} value={p.pagoFabiana.statusPagamento} onChange={(e) => setSub("pagoFabiana", "statusPagamento", e.target.value)}>
                <option>Pendente</option>
                <option>Pago</option>
              </select>
            </Field>
          </div>
        </Card>
      </div>

      <Card style={{ padding: 20 }} className="mt-6">
        <div className="fx-serif mb-3" style={{ fontSize: 15, fontWeight: 600 }}>
          Medidas (cm)
        </div>
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
          {MEDIDA_LABELS.map((label) => {
            const fin = finalDaMedida(label, p.medidas[label]);
            return (
              <Field key={label} label={label}>
                <input
                  type="number"
                  step="0.5"
                  style={inputStyle}
                  value={p.medidas[label]}
                  onChange={(e) => setSub("medidas", label, e.target.value)}
                />
                {fin !== null && (
                  <span className="fx-mono" style={{ fontSize: 11, color: BRASS }}>
                    final: {fin} cm
                  </span>
                )}
              </Field>
            );
          })}
        </div>
      </Card>

      <Card style={{ padding: 20 }} className="mt-6">
        <div className="fx-serif mb-3" style={{ fontSize: 15, fontWeight: 600 }}>
          Características
        </div>
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
          {DESC_CAMPOS.map((campo) => (
            <CampoDescricao key={campo.label} campo={campo} valor={p.descricao[campo.label]} onChange={(v) => setSub("descricao", campo.label, v)} />
          ))}
        </div>
      </Card>

      <Card style={{ padding: 20 }} className="mt-6">
        <div className="flex items-center justify-between mb-1">
          <div className="fx-serif" style={{ fontSize: 15, fontWeight: 600 }}>
            Tecido
          </div>
          <button type="button" onClick={() => onAddTecido(p.id)} style={{ color: BRASS, fontSize: 13, fontWeight: 600 }}>
            + adicionar item
          </button>
        </div>
        <div style={{ fontSize: 11, color: TEXT_MUTED }} className="mb-3">
          "Fornecedor" é uso interno seu — nunca aparece na ficha impressa pra Fabi. Marque "comprado" quando fechar a compra.
        </div>
        {p.tecidos.map((t) => (
          <div key={t.id} className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-2 pb-2 items-center" style={{ borderBottom: `1px solid ${LINE}` }}>
            <input style={inputStyle} placeholder="Código" value={t.codigo} onChange={(e) => onTecido(p.id, t.id, "codigo", e.target.value)} />
            <input
              style={{ ...inputStyle, background: BRASS_SOFT }}
              placeholder="Fornecedor (interno)"
              value={t.fornecedor || ""}
              onChange={(e) => onTecido(p.id, t.id, "fornecedor", e.target.value)}
            />
            <input type="number" style={inputStyle} placeholder="Qtd" value={t.qtd} onChange={(e) => onTecido(p.id, t.id, "qtd", e.target.value)} />
            <input style={inputStyle} placeholder="Observação" value={t.numero} onChange={(e) => onTecido(p.id, t.id, "numero", e.target.value)} />
            <button
              type="button"
              onClick={() => onTecido(p.id, t.id, "comprado", !t.comprado)}
              className="flex items-center justify-center gap-1"
              style={{
                background: t.comprado ? "#DCEBDD" : "#F6E3D9",
                color: t.comprado ? "#2C6E31" : "#9C4A1E",
                padding: "8px 10px",
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {t.comprado ? (
                <>
                  <CheckCircle2 size={13} /> Comprado
                </>
              ) : (
                <>
                  <Clock size={13} /> Comprar
                </>
              )}
            </button>
          </div>
        ))}
      </Card>

      <div className="flex items-center gap-3 mt-6">
        <button
          onClick={salvar}
          className="flex items-center gap-2"
          style={{ background: confirmado ? "#2C6E31" : "#16212E", color: "#FFF", padding: "10px 22px", borderRadius: 8, fontWeight: 600, fontSize: 14 }}
        >
          <Save size={15} /> {confirmado ? "Salvo ✓" : "Salvar"}
        </button>
        {!confirmado && (
          <span style={{ fontSize: 12, color: TEXT_MUTED }}>Cada campo já é salvo sozinho assim que você edita — este botão é só pra confirmar.</span>
        )}
      </div>
    </div>
  );
}
