import React from "react";
import { Field } from "./ui";
import { BRASS, INK_SOFT, TEXT_MUTED, inputStyle } from "../lib/constants";
import { brl } from "../lib/helpers";

// Bloco de pagamento reutilizável — à vista (um valor + status) ou
// dividido em entrada + restante na entrega, cada um com seu status.
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
  labelValor = "Valor (R$)",
  labelPago = "Recebido",
}) {
  const falta =
    (statusEntrada !== labelPago ? parseFloat(valorEntrada) || 0 : 0) + (statusRestante !== labelPago ? parseFloat(valorRestante) || 0 : 0);

  return (
    <div>
      <label className="flex items-center gap-2 mb-2" style={{ cursor: "pointer" }}>
        <input type="checkbox" checked={!!dividido} onChange={(e) => onToggleDividido(e.target.checked)} style={{ width: 15, height: 15, accentColor: BRASS }} />
        <span style={{ fontSize: 12, fontWeight: 600 }}>Pagamento dividido (entrada + entrega)</span>
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
            <Field label="Entrada (R$)">
              <input type="number" step="0.01" style={inputStyle} value={valorEntrada} onChange={(e) => onValorEntrada(e.target.value)} />
            </Field>
            <Field label="Status da entrada">
              <select style={inputStyle} value={statusEntrada || "Pendente"} onChange={(e) => onStatusEntrada(e.target.value)}>
                <option>Pendente</option>
                <option>{labelPago}</option>
              </select>
            </Field>
            <Field label="Restante na entrega (R$)">
              <input type="number" step="0.01" style={inputStyle} value={valorRestante} onChange={(e) => onValorRestante(e.target.value)} />
            </Field>
            <Field label="Status do restante">
              <select style={inputStyle} value={statusRestante || "Pendente"} onChange={(e) => onStatusRestante(e.target.value)}>
                <option>Pendente</option>
                <option>{labelPago}</option>
              </select>
            </Field>
          </div>
          <div className="flex justify-between" style={{ fontSize: 12, color: INK_SOFT }}>
            <span>
              Total: <strong>{brl((parseFloat(valorEntrada) || 0) + (parseFloat(valorRestante) || 0))}</strong>
            </span>
            {falta > 0 && (
              <span style={{ color: TEXT_MUTED }}>
                Falta receber: <strong>{brl(falta)}</strong>
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
