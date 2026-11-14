import React from "react";
import { BRASS, TEXT_MUTED } from "../lib/constants";
import { brl, estimativaCustoPedidoCamisa } from "../lib/helpers";
import { useConfigCustosFixos } from "../hooks/useConfigCustosFixos";
import SeloMargem from "./SeloMargem";

// Mostra, embaixo do tecido escolhido no pedido, o custo estimado e o
// preço sugerido (tirados da Tabela de preço de venda em Tecidos de
// Camisa) — e, se já tiver um valor de venda digitado, a margem daquela
// venda e quanto reservar de imposto sobre ela. Uso interno só (nunca
// aparece na ficha da Fabi). Some sozinho quando não há tecido/valor de
// referência suficiente pra estimar.
//
// "Modo apresentação" (pedido do Tales, 14/11/2026): esconde custo,
// margem e imposto (informação gerencial) na frente do cliente — só o
// selo colorido (SeloMargem) e o preço sugerido continuam visíveis,
// porque o preço de venda o cliente vai ver de qualquer jeito.
export default function EstimativaCustoPedido({
  tecidos,
  modelosCamisa,
  custoAviamentosPorPecaBase = {},
  metragemPadrao,
  maoDeObraPadrao,
  margemPadrao,
  valorVenda,
  onUsarSugestao,
  modoApresentacao = false,
}) {
  const { aliquotaImposto } = useConfigCustosFixos();
  const custoAviamentoCamisa = custoAviamentosPorPecaBase["Camisa"] || 0;
  const { custoEstimado, precoSugerido, temDados, usouMargemPadrao } = estimativaCustoPedidoCamisa(tecidos, modelosCamisa, {
    metragemPadrao,
    maoDeObraPadrao,
    margemPadrao,
    custoAviamentoCamisa,
  });

  if (!temDados) return null;

  const venda = parseFloat(valorVenda);
  const temVenda = !isNaN(venda) && venda > 0;
  const margem = temVenda ? venda - custoEstimado : null;
  const margemPercentual = temVenda && venda > 0 ? (margem / venda) * 100 : null;
  const impostoReservar = temVenda ? venda * ((parseFloat(aliquotaImposto) || 0) / 100) : null;

  if (modoApresentacao) {
    if (precoSugerido == null && margemPercentual == null) return null;
    return (
      <div className="mt-3 flex items-center gap-3 flex-wrap">
        {precoSugerido != null && (
          <span style={{ fontSize: 12 }}>
            <span style={{ color: TEXT_MUTED }}>Preço sugerido{usouMargemPadrao ? " (margem padrão)" : ""}: </span>
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
        <SeloMargem margemPercentual={margemPercentual} />
      </div>
    );
  }

  return (
    <div className="mt-3 p-3" style={{ background: "#F3EEDF", borderRadius: 8 }}>
      <div style={{ fontSize: 9.5, letterSpacing: 0.6, textTransform: "uppercase", color: TEXT_MUTED, fontWeight: 700, marginBottom: 6 }}>
        Informações gerenciais
      </div>
      <div className="flex items-center gap-4 flex-wrap" style={{ fontSize: 12 }}>
        <span>
          <span style={{ color: TEXT_MUTED }}>Custo estimado: </span>
          <strong className="fx-mono">{brl(custoEstimado)}</strong>
        </span>
        {precoSugerido != null && (
          <span>
            <span style={{ color: TEXT_MUTED }}>Preço sugerido{usouMargemPadrao ? " (margem padrão)" : ""}: </span>
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
          <>
            <span>
              <span style={{ color: TEXT_MUTED }}>Margem dessa venda: </span>
              <strong className="fx-mono" style={{ color: margemPercentual >= 0 ? "#2C6E31" : "#9C4A1E" }}>
                {brl(margem)} ({margemPercentual.toFixed(0)}%)
              </strong>
            </span>
            <SeloMargem margemPercentual={margemPercentual} />
          </>
        )}
        {impostoReservar != null && (
          <span>
            <span style={{ color: TEXT_MUTED }}>Reservar p/ imposto ({(parseFloat(aliquotaImposto) || 0).toFixed(1)}%): </span>
            <strong className="fx-mono">{brl(impostoReservar)}</strong>
          </span>
        )}
      </div>
      <div style={{ fontSize: 10, color: TEXT_MUTED, marginTop: 4 }}>
        Estimado com base na Tabela de preço de venda (Tecidos de Camisa). Uso interno — não aparece na ficha.
      </div>
    </div>
  );
}
