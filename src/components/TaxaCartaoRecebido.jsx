import React from "react";
import { Field } from "./ui";
import { LINE, TEXT_MUTED, inputStyle } from "../lib/constants";
import { brl } from "../lib/helpers";

const VERMELHO = "#9C4A1E";
const VERDE = "#2C6E31";

// Taxa de cartão real — em vez de estimar uma % configurada, o valor
// líquido que realmente caiu na conta (do extrato da maquininha) é
// digitado aqui, e a diferença com o valor vendido já é a taxa de
// cartão daquela venda específica, calculada sozinha (em R$ e em %).
// Fica em branco até o extrato chegar; PIX/dinheiro não precisa
// preencher (sem taxa, valor líquido = valor vendido).
export default function TaxaCartaoRecebido({ valorVenda, valorLiquidoRecebido, onChange }) {
  const venda = parseFloat(valorVenda) || 0;
  const liquido = parseFloat(valorLiquidoRecebido);
  const temLiquido = valorLiquidoRecebido !== "" && valorLiquidoRecebido != null && !isNaN(liquido);
  const taxa = temLiquido ? venda - liquido : null;
  const taxaPercentual = temLiquido && venda > 0 ? (taxa / venda) * 100 : null;

  return (
    <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${LINE}` }}>
      <Field label="Valor líquido recebido (R$) — do extrato da maquininha/banco">
        <input
          type="number"
          step="0.01"
          style={inputStyle}
          value={valorLiquidoRecebido}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Preencha quando o extrato chegar (PIX/dinheiro não precisa)"
        />
      </Field>
      {temLiquido && (
        <div className="mt-2" style={{ fontSize: 12 }}>
          <span style={{ color: TEXT_MUTED }}>Taxa de cartão: </span>
          <strong className="fx-mono" style={{ color: taxa >= 0 ? VERMELHO : VERDE }}>
            {brl(taxa)}
            {taxaPercentual != null && ` (${taxaPercentual.toFixed(1)}%)`}
          </strong>
        </div>
      )}
    </div>
  );
}
