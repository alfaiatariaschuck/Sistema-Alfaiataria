import React, { useState } from "react";
import { BRASS, BRASS_SOFT, CARD, INK, INK_SOFT, LINE, TEXT_MUTED } from "../lib/constants";

// Gráfico de barras simples (sem lib externa) — usado em Histórico de
// Produção e Custos do Ateliê pra qualquer série "chave/valor" com tooltip.
export function BarraSimples({ dados, sufixoValor, formatarTooltip }) {
  const [hover, setHover] = useState(null);
  const maxValor = Math.max(1, ...dados.map((d) => d.valor));
  const ALTURA = 130;

  return (
    <div className="flex items-end gap-3 flex-wrap" style={{ minHeight: ALTURA + 50 }}>
      {dados.map((d) => {
        const altura = (d.valor / maxValor) * ALTURA;
        const emFoco = hover === d.chave;
        return (
          <div
            key={d.chave}
            className="flex flex-col items-center"
            style={{ flex: "1 0 60px", minWidth: 60, position: "relative" }}
            onMouseEnter={() => setHover(d.chave)}
            onMouseLeave={() => setHover(null)}
          >
            {emFoco && (
              <div
                style={{
                  position: "absolute",
                  bottom: altura + 34,
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: INK,
                  color: "#FFF",
                  padding: "7px 11px",
                  borderRadius: 6,
                  fontSize: 11,
                  whiteSpace: "normal",
                  maxWidth: 220,
                  textAlign: "center",
                  zIndex: 10,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                }}
              >
                {formatarTooltip ? formatarTooltip(d) : `${d.chave}: ${d.valor}${sufixoValor || ""}`}
              </div>
            )}
            <div className="fx-mono" style={{ fontSize: 12, fontWeight: 700, color: emFoco ? BRASS : INK, marginBottom: 6 }}>
              {d.valor}
              {sufixoValor || ""}
            </div>
            <div
              style={{
                height: Math.max(altura, 3),
                width: "100%",
                maxWidth: 44,
                margin: "0 auto",
                background: BRASS,
                borderRadius: "4px 4px 0 0",
                opacity: emFoco ? 1 : 0.9,
              }}
            />
            <div className="fx-mono" style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 8, textAlign: "center" }}>
              {d.chave}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Gráfico de barras pareadas (2 séries) — mesmo padrão visual da
// BarraSimples, mas com duas barras lado a lado por categoria e legenda
// (obrigatória pra 2+ séries pelo skill de dataviz). Genérico: recebe
// dados já no formato {chave, a, b} e as cores/legendas/tooltip de cada
// série. formatarValor (opcional) formata o rótulo em cima de cada
// barra (ex: moeda) — por padrão mostra o número cru.
export function BarraDuasSeries({ dados, corA, corB, legendaA, legendaB, tooltipDe, notaDe, formatarValor }) {
  const [hover, setHover] = useState(null);
  const maxValor = Math.max(1, ...dados.flatMap((d) => [d.a ?? 0, d.b ?? 0]));
  const ALTURA = 130;
  const fmt = formatarValor || ((v) => v);

  return (
    <div>
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-1.5">
          <span style={{ width: 10, height: 10, borderRadius: 3, background: corA, display: "inline-block" }} />
          <span style={{ fontSize: 12, color: TEXT_MUTED }}>{legendaA}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span style={{ width: 10, height: 10, borderRadius: 3, background: corB, display: "inline-block" }} />
          <span style={{ fontSize: 12, color: TEXT_MUTED }}>{legendaB}</span>
        </div>
      </div>
      <div className="flex items-end gap-4 flex-wrap" style={{ minHeight: ALTURA + 50 }}>
        {dados.map((d) => {
          const emFoco = hover === d.chave;
          return (
            <div
              key={d.chave}
              className="flex flex-col items-center"
              style={{ flex: "1 0 90px", minWidth: 90, position: "relative" }}
              onMouseEnter={() => setHover(d.chave)}
              onMouseLeave={() => setHover(null)}
            >
              {emFoco && (
                <div
                  style={{
                    position: "absolute",
                    bottom: ALTURA + 34,
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: INK,
                    color: "#FFF",
                    padding: "7px 11px",
                    borderRadius: 6,
                    fontSize: 11,
                    whiteSpace: "normal",
                    maxWidth: 220,
                    textAlign: "center",
                    zIndex: 10,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                  }}
                >
                  {tooltipDe ? tooltipDe(d) : `${d.chave}: ${legendaA} ${d.a ?? "—"} · ${legendaB} ${d.b ?? "—"}`}
                </div>
              )}
              <div className="flex items-end gap-1.5" style={{ height: ALTURA }}>
                {[
                  { valor: d.a, cor: corA },
                  { valor: d.b, cor: corB },
                ].map((serie, i) => {
                  const altura = serie.valor ? (serie.valor / maxValor) * ALTURA : 0;
                  return (
                    <div key={i} className="flex flex-col items-center justify-end" style={{ height: ALTURA, width: 30 }}>
                      {serie.valor != null && (
                        <div className="fx-mono" style={{ fontSize: 11, fontWeight: 700, color: emFoco ? serie.cor : INK, marginBottom: 4 }}>
                          {fmt(serie.valor)}
                        </div>
                      )}
                      <div
                        style={{
                          height: Math.max(serie.valor ? altura : 0, serie.valor ? 3 : 0),
                          width: "100%",
                          background: serie.cor,
                          borderRadius: "4px 4px 0 0",
                          opacity: emFoco ? 1 : 0.9,
                        }}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="fx-mono" style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 8, textAlign: "center" }}>
                {d.chave}
              </div>
              {notaDe && notaDe(d)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PageTitle({ eyebrow, title }) {
  return (
    <div className="mb-6">
      <div className="uppercase" style={{ color: BRASS, fontSize: 11, letterSpacing: 1.5, fontWeight: 600 }}>
        {eyebrow}
      </div>
      <h1 className="fx-serif" style={{ fontSize: 28, fontWeight: 600, color: INK }}>
        {title}
      </h1>
    </div>
  );
}

export function Card({ children, style, ...rest }) {
  return (
    <div style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: 10, ...style }} {...rest}>
      {children}
    </div>
  );
}

export function Pill({ text, style }) {
  const s = style || { bg: BRASS_SOFT, fg: BRASS };
  return (
    <span
      className="fx-mono"
      style={{
        background: s.bg,
        color: s.fg,
        fontSize: 11,
        fontWeight: 500,
        padding: "3px 10px",
        borderRadius: 999,
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </span>
  );
}

export function Field({ label, children }) {
  return (
    <label className="block mb-3">
      <span className="block mb-1" style={{ fontSize: 12, fontWeight: 600, color: INK_SOFT }}>
        {label}
      </span>
      {children}
    </label>
  );
}

export function StatCard({ label, value, icon: Icon, accent }) {
  const cor = accent || BRASS;
  return (
    <Card style={{ padding: 16 }}>
      <div className="flex items-center justify-between mb-2">
        <span style={{ fontSize: 12, color: TEXT_MUTED, fontWeight: 600 }}>{label}</span>
        <Icon size={15} color={cor} />
      </div>
      <div className="fx-serif" style={{ fontSize: 22, fontWeight: 600, color: accent || INK }}>
        {value}
      </div>
    </Card>
  );
}

export function Empty({ texto }) {
  return <div style={{ color: TEXT_MUTED, fontSize: 13, padding: "12px 0" }}>{texto}</div>;
}
