import React from "react";
import { TEXT_MUTED } from "../lib/constants";
import { brl, custoAviamentoComposicao, custoTecidoDe } from "../lib/helpers";

// Mostra, na peça de alfaiataria, o custo real (tecido + aviamento da
// composição do tipo de peça + valor devido ao Ícaro) e, quando já tem
// valor de venda digitado, a margem daquela venda. Sem "preço sugerido"
// — alfaiataria não tem um catálogo de preço por tecido feito Tecidos
// de Camisa, é sob medida. Uso interno — nunca aparece na ficha do Icaro.
export default function EstimativaCustoPeca({ tecidos, tipoPeca, custoAviamentosPorPecaBase = {}, valorTotal, valorVenda }) {
  const custoTecido = custoTecidoDe(tecidos);
  const custoAviamento = custoAviamentoComposicao(tipoPeca, custoAviamentosPorPecaBase);
  const maoDeObra = parseFloat(valorTotal) || 0;
  const custo = custoTecido + custoAviamento + maoDeObra;
  const temDados = custoTecido > 0 || custoAviamento > 0 || maoDeObra > 0;

  if (!temDados) return null;

  const venda = parseFloat(valorVenda);
  const temVenda = !isNaN(venda) && venda > 0;
  const margem = temVenda ? venda - custo : null;
  const margemPercentual = temVenda && venda > 0 ? (margem / venda) * 100 : null;

  return (
    <div className="mt-3 p-3" style={{ background: "#F3EEDF", borderRadius: 8 }}>
      <div className="flex items-center gap-4 flex-wrap" style={{ fontSize: 12 }}>
        <span>
          <span style={{ color: TEXT_MUTED }}>Custo total: </span>
          <strong className="fx-mono">{brl(custo)}</strong>
        </span>
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
        Tecido {brl(custoTecido)} · Aviamento ({tipoPeca || "—"}) {brl(custoAviamento)} · Valor devido ao Icaro {brl(maoDeObra)}. Uso interno — não aparece na ficha.
      </div>
    </div>
  );
}
