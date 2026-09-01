import React from "react";
import { Field } from "./ui";
import { BRASS, INK_SOFT, TEXT_MUTED, inputStyle } from "../lib/constants";
import { brl } from "../lib/helpers";

// Bloco de pagamento reutilizável — à vista (um valor + status) ou
// dividido em entrada + restante na entrega, cada um com seu status.
// Quando `formasPagamento` é passado, cada parte ganha também um select
// de forma de pagamento — pra cobrir o caso de o cliente pagar parte no
// PIX e parte no cartão (a forma "de cima", única, continua sendo a do
// caso à vista).
export function CampoPagamento({
  valor,
  statusPagamento,
  onValor,
  onStatus,
  dividido,
  onToggleDividido,
  valorEntrada,
  statusEntrada,
  onValorEntrada,
  onStatusEntrada,
  valorRestante,
  statusRestante,
  onValorRestante,
  onStatusRestante,
  formasPagamento,
  formaPagamentoEntrada,
  onFormaPagamentoEntrada,
  formaPagamentoRestante,
  onFormaPagamentoRestante,
  labelValor = "Valor (R$)",
  labelPago = "Recebido",
  labelDividido = "Pagamento dividido (entrada + entrega)",
  labelEntrada = "Entrada (R$)",
  labelStatusEntrada = "Status da entrada",
  labelFormaEntrada = "Forma de pagamento (entrada)",
  labelRestante = "Restante na entrega (R$)",
  labelStatusRestante = "Status do restante",
  labelFormaRestante = "Forma de pagamento (restante)",
  labelFalta = "Falta receber",
}) {
  const falta =
    (statusEntrada !== labelPago ? parseFloat(valorEntrada) || 0 : 0) + (statusRestante !== labelPago ? parseFloat(valorRestante) || 0 : 0);

  return (
    <div>
      <label className="flex items-center gap-2 mb-2" style={{ cursor: "pointer" }}>
        <input type="checkbox" checked={!!dividido} onChange={(e) => onToggleDividido(e.target.checked)} style={{ width: 15, height: 15, accentColor: BRASS }} />
        <span style={{ fontSize: 12, fontWeight: 600 }}>{labelDividido}</span>
      </label>

      {!dividido && (
        <div className="grid gap-3" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <Field label={labelValor}>
            <input type="number" step="0.01" style={inputStyle} value={valor} onChange={(e) => onValor(e.target.value)} />
          </Field>
          <Field label="Status">
            <select style={inputStyle} value={statusPagamento || "Pendente"} onChange={(e) => onStatus(e.target.value)}>
              <option>Pendente</option>
              <option>{labelPago}</option>
            </select>
          </Field>
        </div>
      )}

      {dividido && (
        <>
          <div className="grid gap-3" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <Field label={labelEntrada}>
              <input type="number" step="0.01" style={inputStyle} value={valorEntrada} onChange={(e) => onValorEntrada(e.target.value)} />
            </Field>
            <Field label={labelStatusEntrada}>
              <select style={inputStyle} value={statusEntrada || "Pendente"} onChange={(e) => onStatusEntrada(e.target.value)}>
                <option>Pendente</option>
                <option>{labelPago}</option>
              </select>
            </Field>
            {formasPagamento && (
              <Field label={labelFormaEntrada}>
                <select style={inputStyle} value={formaPagamentoEntrada || ""} onChange={(e) => onFormaPagamentoEntrada(e.target.value)}>
                  <option value="">Selecione</option>
                  {formasPagamento.map((f) => (
                    <option key={f}>{f}</option>
                  ))}
                </select>
              </Field>
            )}
            <Field label={labelRestante}>
              <input type="number" step="0.01" style={inputStyle} value={valorRestante} onChange={(e) => onValorRestante(e.target.value)} />
            </Field>
            <Field label={labelStatusRestante}>
              <select style={inputStyle} value={statusRestante || "Pendente"} onChange={(e) => onStatusRestante(e.target.value)}>
                <option>Pendente</option>
                <option>{labelPago}</option>
              </select>
            </Field>
            {formasPagamento && (
              <Field label={labelFormaRestante}>
                <select style={inputStyle} value={formaPagamentoRestante || ""} onChange={(e) => onFormaPagamentoRestante(e.target.value)}>
                  <option value="">Selecione</option>
                  {formasPagamento.map((f) => (
                    <option key={f}>{f}</option>
                  ))}
                </select>
              </Field>
            )}
          </div>
          <div className="flex justify-between" style={{ fontSize: 12, color: INK_SOFT }}>
            <span>
              Total: <strong>{brl((parseFloat(valorEntrada) || 0) + (parseFloat(valorRestante) || 0))}</strong>
            </span>
            {falta > 0 && (
              <span style={{ color: TEXT_MUTED }}>
                {labelFalta}: <strong>{brl(falta)}</strong>
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
