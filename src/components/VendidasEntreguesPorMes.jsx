import React, { useMemo } from "react";
import { Card } from "./ui";
import { LINE, TEXT_MUTED, INK } from "../lib/constants";
import { statusPedidoSemVenda } from "../lib/helpers";

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function rotuloMes(chave) {
  const [ano, mes] = chave.split("-");
  return `${MESES[parseInt(mes, 10) - 1]}/${ano.slice(2)}`;
}

function ultimosMeses(n) {
  const hoje = new Date();
  const lista = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    lista.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return lista;
}

// Vendidas: pedido lançado (dataPedido) nesse mês, exclui doação/uso
// pessoal (não é venda). Entregues: pedido que virou "Entregue"
// completo com dataEntrega caindo nesse mês, não importa quando foi
// vendido — os dois números não são o mesmo recorte de pedidos de
// propósito (uma venda de agosto pode aparecer entregue em setembro).
function calcular(pedidos, meses) {
  const mapa = new Map(meses.map((m) => [m, { vendidas: 0, entregues: 0 }]));
  (pedidos || []).forEach((p) => {
    if (statusPedidoSemVenda(p.status)) return;
    const qtd = parseFloat(p.quantidade) || 0;
    const mesVenda = (p.dataPedido || "").slice(0, 7);
    if (mapa.has(mesVenda)) mapa.get(mesVenda).vendidas += qtd;
    if (p.status === "Entregue") {
      const mesEntrega = (p.dataEntrega || "").slice(0, 7);
      if (mapa.has(mesEntrega)) mapa.get(mesEntrega).entregues += qtd;
    }
  });
  return meses.map((mes) => ({ mes, ...mapa.get(mes) }));
}

export default function VendidasEntreguesPorMes({ pedidos, titulo = "Vendidas x Entregues por mês — Camisaria" }) {
  const meses = useMemo(() => ultimosMeses(12), []);
  const dados = useMemo(() => calcular(pedidos, meses), [pedidos, meses]);

  return (
    <Card style={{ padding: 20 }} className="mb-6">
      <div className="fx-serif mb-1" style={{ fontSize: 15, fontWeight: 600 }}>
        {titulo}
      </div>
      <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 16 }}>
        Vendidas: pela data do pedido. Entregues: pela data de entrega — pode incluir pedido vendido em outro mês.
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${LINE}` }}>
              <th style={{ textAlign: "left", padding: "6px 8px", color: TEXT_MUTED, fontWeight: 600, fontSize: 11 }}>Mês</th>
              <th className="fx-mono" style={{ textAlign: "right", padding: "6px 8px", color: TEXT_MUTED, fontWeight: 600, fontSize: 11 }}>
                Vendidas
              </th>
              <th className="fx-mono" style={{ textAlign: "right", padding: "6px 8px", color: TEXT_MUTED, fontWeight: 600, fontSize: 11 }}>
                Entregues
              </th>
            </tr>
          </thead>
          <tbody>
            {dados.map((d, i) => (
              <tr key={d.mes} style={{ borderBottom: i < dados.length - 1 ? `1px solid ${LINE}` : "none" }}>
                <td style={{ padding: "7px 8px", fontWeight: 600, color: INK }}>{rotuloMes(d.mes)}</td>
                <td className="fx-mono" style={{ textAlign: "right", padding: "7px 8px" }}>
                  {d.vendidas}
                </td>
                <td className="fx-mono" style={{ textAlign: "right", padding: "7px 8px" }}>
                  {d.entregues}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
