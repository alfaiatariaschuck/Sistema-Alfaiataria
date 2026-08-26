import React from "react";
import { AlertTriangle } from "lucide-react";
import { Card } from "./ui";

const VERMELHO = "#9C4A1E";

// Reúne num só lugar os avisos que hoje ficam espalhados em cada aba
// (pedidos atrasados, peças de alfaiataria atrasadas, despesa vencida,
// tecido com estoque baixo) — clica e já vai direto pra aba certa.
export default function CentralAlertas({ pedidosAtrasados, pecasAtrasadas, despesasAtrasadas, estoqueBaixo, irParaTab }) {
  const itens = [
    { label: "pedido(s) de camisa atrasado(s)", count: pedidosAtrasados, tab: "pedidos" },
    { label: "peça(s) de alfaiataria atrasada(s)", count: pecasAtrasadas, tab: "pedidos-alfaiataria" },
    { label: "despesa(s) vencida(s)", count: despesasAtrasadas, tab: "contas-a-pagar" },
    { label: "tecido(s) com estoque baixo", count: estoqueBaixo, tab: "estoque-camisaria" },
  ].filter((i) => i.count > 0);

  if (itens.length === 0) return null;

  return (
    <Card style={{ padding: 16 }} className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle size={16} color={VERMELHO} />
        <div style={{ fontSize: 13, fontWeight: 600 }}>Precisa de atenção</div>
      </div>
      <div className="flex flex-wrap gap-2">
        {itens.map((i) => (
          <button
            key={i.tab}
            onClick={() => irParaTab && irParaTab(i.tab)}
            style={{ background: "#F6E3D9", color: VERMELHO, padding: "6px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600 }}
          >
            {i.count} {i.label}
          </button>
        ))}
      </div>
    </Card>
  );
}
