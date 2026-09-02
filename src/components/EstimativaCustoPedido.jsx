import React from "react";
import { BRASS, TEXT_MUTED } from "../lib/constants";
import { brl, estimativaCustoPedidoCamisa } from "../lib/helpers";

// Mostra, embaixo do tecido escolhido no pedido, o custo estimado e o
// preço sugerido (tirados da Tabela de preço de venda em Tecidos de
// Camisa) — e, se já tiver um valor de venda digitado, a margem daquela
// venda. Uso interno só (nunca aparece na ficha da Fabi). Some sozinho
// quando não há tecido/valor de referência suficiente pra estimar.
export default function EstimativaCustoPedido({ tecidos, modelosCamisa, custoAviamentosPorPecaBase = {}, metragemPadrao, maoDeObraPadrao, valorVenda, onUsarSugestao }) {
  const custoAviamentoCamisa = custoAviamentosPorPecaBase["Camisa"] || 0;
  const { custoEstimado, precoSugerido, temDados } = estimativaCustoPedidoCamisa(tecidos, modelosCamisa, {
    metragemPadrao,
    maoDeObraPadrao,
    custoAviamentoCamisa,
  });

  if (!temDados) return null;

  const venda = parseFloat(valorVenda);
  const temVenda = !isNaN(venda) && venda > 0;
  const margem = temVenda ? venda - custoEstimado : null;
  const margemPercentual = temVenda && venda > 0 ? (margem / venda) * 100 : null;

  return (
    <div className="mt-3 p-3" style={{ background: "#F3EEDF", borderRadius: 8 }}>
      <div className="flex items-center gap-4 flex-wrap" style={{ fontSize: 12 }}>
        <span>
          <span style={{ color: TEXT_MUTED }}>Custo estimado: </span>
          <strong className="fx-mono">{brl(custoEstimado)}</strong>
        </span>
        {precoSugerido != null && (
          <span>
            <span style={{ color: TEXT_MUTED }}>Preço sugerido: </span>
            <strong className="fx-mono" style={{ color: BRASS }}>{brl(precoSugerido)}</strong>
            {onUsarSugestao && (
              <button
                type="button"
                onClick={() => onUsarSugestao(precoSugerido.toFixed(2))}
                style={{ marginLeft: 8, color: BRASS, fontWeight: 600, textDecoration: "underline" }}
              >
                usar
              </button>
            )}
          </span>
        )}
        {margemPercentual != null && (
          <span>
            <span style={{ color: TEXT_MUTED }}>Margem dessa venda: </span>
            <strong className="fx-mono" style={{ color: margemPercentual >= 0 ? "#2C6E31" : "#9C4A1E" }}>
              {brl(margem)} ({margemPercentual.toFixed(0)}%)
            </strong>
          </span>
        )}
      </div>
      <div style={{ fontSize: 10, color: TEXT_MUTED, marginTop: 4 }}>
        Estimado com base na Tabela de preço de venda (Tecidos de Camisa). Uso interno — não aparece na ficha.
      </div>
    </div>
  );
}
