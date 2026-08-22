import React, { useState } from "react";
import { Save } from "lucide-react";
import { Card, Field, Pill } from "../components/ui";
import { CampoDescricao } from "../components/CampoComOpcoes";
import { CampoPagamento } from "../components/CampoPagamento";
import { ControleVozMedidas } from "../components/ControleVozMedidas";
import { BRASS, DESC_CAMPOS, FORMAS_PAGAMENTO, LINE, MEDIDA_LABELS, STATUS_STYLE, TEXT_MUTED, inputStyle, rotuloMedida } from "../lib/constants";
import { finalDaMedida, statusDividido, totalDividido } from "../lib/helpers";

// Edição restrita do próprio pedido do vendedor — mesmos campos da
// ficha de criação. Sem status de produção, qtd entregue, valor
// Fabiana ou plano de assinatura, que não são da alçada dele.
export default function DetalhePedidoVendedor({ pedido: p, onVoltar, onCampo, onSub, onAddTecido, onTecido }) {
  const [confirmado, setConfirmado] = useState(false);

  function set(campo, valor) {
    onCampo(p.id, campo, valor);
  }
  function setSub(grupo, sub, valor) {
    onSub(p.id, grupo, sub, valor);
  }
  function setPagamento(patch) {
    Object.entries(patch).forEach(([k, v]) => set(k, v));
    const next = { ...p, ...patch };
    if (next.pagamentoDividido) {
      setSub("aReceber", "valor", totalDividido(next.valorEntrada, next.valorRestante));
      setSub("aReceber", "statusPagamento", statusDividido(next.statusEntrada, next.statusRestante, "Recebido"));
    }
  }
  function salvar() {
    setConfirmado(true);
    setTimeout(() => setConfirmado(false), 2500);
  }

  return (
    <div>
      <button onClick={onVoltar} className="mb-4 flex items-center gap-1" style={{ color: BRASS, fontSize: 13, fontWeight: 600 }}>
        ← voltar pros meus pedidos
      </button>
      <div className="flex items-center gap-2 mb-6">
        <h1 className="fx-serif" style={{ fontSize: 24, fontWeight: 600 }}>
          {p.cliente}
        </h1>
        <Pill text={p.status} style={STATUS_STYLE[p.status]} />
      </div>

      <Card style={{ padding: 20 }} className="mb-5">
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
          <Field label="Data do pedido">
            <input type="date" style={inputStyle} value={p.dataPedido} onChange={(e) => set("dataPedido", e.target.value)} />
          </Field>
          <Field label="Previsão de entrega">
            <input type="date" style={inputStyle} value={p.previsaoEntrega} onChange={(e) => set("previsaoEntrega", e.target.value)} />
          </Field>
          <Field label="Quantidade">
            <input type="number" min="1" style={inputStyle} value={p.quantidade} onChange={(e) => set("quantidade", e.target.value)} />
          </Field>
          <Field label="Forma de pagamento">
            <select style={inputStyle} value={p.formaPagamento} onChange={(e) => set("formaPagamento", e.target.value)}>
              <option value="">Selecione</option>
              {FORMAS_PAGAMENTO.map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${LINE}` }}>
          <div className="fx-serif mb-2" style={{ fontSize: 14, fontWeight: 600 }}>
            Valor a receber do cliente
          </div>
          <CampoPagamento
            labelValor="Valor a receber (R$)"
            labelPago="Recebido"
            valor={p.aReceber.valor}
            statusPagamento={p.aReceber.statusPagamento}
            onValor={(v) => setSub("aReceber", "valor", v)}
            onStatus={(v) => setSub("aReceber", "statusPagamento", v)}
            dividido={p.pagamentoDividido}
            onToggleDividido={(v) => setPagamento({ pagamentoDividido: v })}
            valorEntrada={p.valorEntrada}
            statusEntrada={p.statusEntrada}
            onValorEntrada={(v) => setPagamento({ valorEntrada: v })}
            onStatusEntrada={(v) => setPagamento({ statusEntrada: v })}
            valorRestante={p.valorRestante}
            statusRestante={p.statusRestante}
            onValorRestante={(v) => setPagamento({ valorRestante: v })}
            onStatusRestante={(v) => setPagamento({ statusRestante: v })}
          />
        </div>
      </Card>

      <Card style={{ padding: 20 }} className="mb-5">
        <div className="fx-serif mb-3" style={{ fontSize: 15, fontWeight: 600 }}>
          Medidas (cm)
        </div>
        <ControleVozMedidas onMedida={(label, valor) => setSub("medidas", label, valor)} />
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
          {MEDIDA_LABELS.map((label) => {
            const fin = finalDaMedida(label, p.medidas[label]);
            return (
              <Field key={label} label={rotuloMedida(label)}>
                <input type="number" step="0.5" style={inputStyle} value={p.medidas[label]} onChange={(e) => setSub("medidas", label, e.target.value)} />
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

      <Card style={{ padding: 20 }} className="mb-5">
        <div className="fx-serif mb-3" style={{ fontSize: 15, fontWeight: 600 }}>
          Características
        </div>
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
          {DESC_CAMPOS.map((campo) => (
            <CampoDescricao key={campo.label} campo={campo} valor={p.descricao[campo.label]} onChange={(v) => setSub("descricao", campo.label, v)} />
          ))}
        </div>
      </Card>

      <Card style={{ padding: 20 }} className="mb-5">
        <div className="flex items-center justify-between mb-1">
          <div className="fx-serif" style={{ fontSize: 15, fontWeight: 600 }}>
            Tecido
          </div>
          <button type="button" onClick={() => onAddTecido(p.id)} style={{ color: BRASS, fontSize: 13, fontWeight: 600 }}>
            + adicionar item
          </button>
        </div>
        {p.tecidos.map((t) => (
          <div key={t.id} className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-2 pb-2" style={{ borderBottom: `1px solid ${LINE}` }}>
            <input style={inputStyle} placeholder="Código" value={t.codigo} onChange={(e) => onTecido(p.id, t.id, "codigo", e.target.value)} />
            <input type="number" style={inputStyle} placeholder="Qtd" value={t.qtd} onChange={(e) => onTecido(p.id, t.id, "qtd", e.target.value)} />
            <input style={inputStyle} placeholder="Observação" value={t.numero} onChange={(e) => onTecido(p.id, t.id, "numero", e.target.value)} />
          </div>
        ))}
      </Card>

      <Card style={{ padding: 20 }} className="mb-5">
        <Field label="Observações">
          <textarea style={{ ...inputStyle, minHeight: 70 }} value={p.observacoes} onChange={(e) => set("observacoes", e.target.value)} />
        </Field>
      </Card>

      <div className="flex items-center gap-3">
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
