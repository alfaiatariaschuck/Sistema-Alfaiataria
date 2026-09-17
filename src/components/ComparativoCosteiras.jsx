import React from "react";
import { GitCompare } from "lucide-react";
import { Card } from "./ui";
import { TEXT_MUTED, LINE, BRASS } from "../lib/constants";
import { tempoMedioProducaoGenerico } from "../lib/helpers";

const COSTUREIRAS = ["Fabiana", "Milena"];

// Comparativo entre os dois ateliês de camisaria — só aparece no Painel
// Camisaria agregado (visão do Tales), nunca nos painéis individuais de
// cada costureira. Enquanto a Milena não estiver produzindo de verdade,
// a coluna dela fica em "—" naturalmente (sem pedido nenhum com
// costureira = Milena ainda).
export default function ComparativoCosteiras({ pedidos }) {
  const linhas = COSTUREIRAS.map((nome) => {
    const doAteie = (pedidos || []).filter((p) => (p.costureira || "Fabiana") === nome && p.status !== "Doação");
    const entregues = doAteie.filter((p) => p.status === "Entregue");
    const qtdEntregue = entregues.reduce((s, p) => s + (parseFloat(p.qtEntregue) || 0), 0);
    const tempoMedio = tempoMedioProducaoGenerico(doAteie);
    return { nome, qtdPedidos: doAteie.length, qtdEntregue, tempoMedio };
  });

  return (
    <Card style={{ padding: 20 }} className="mb-6">
      <div className="fx-serif mb-3 flex items-center gap-2" style={{ fontSize: 16, fontWeight: 600 }}>
        <GitCompare size={16} color={BRASS} /> Comparativo entre ateliês
      </div>
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
        {linhas.map((l) => (
          <div key={l.nome} className="p-3" style={{ border: `1px solid ${LINE}`, borderRadius: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{l.nome}</div>
            <div style={{ fontSize: 12, color: TEXT_MUTED }}>{l.qtdPedidos} pedido(s)</div>
            <div style={{ fontSize: 12, color: TEXT_MUTED }}>{l.qtdEntregue} camisa(s) entregue(s)</div>
            <div style={{ fontSize: 12, color: TEXT_MUTED }}>Tempo médio de produção: {l.tempoMedio !== null ? `${l.tempoMedio}d` : "—"}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}
