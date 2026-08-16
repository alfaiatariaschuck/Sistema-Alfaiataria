import React from "react";
import { BRASS, BRASS_SOFT, CARD, INK, INK_SOFT, LINE, TEXT_MUTED } from "../lib/constants";

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
