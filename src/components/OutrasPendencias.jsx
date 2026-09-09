import React from "react";
import { Clock, PackageCheck } from "lucide-react";
import { Card } from "./ui";
import { TEXT_MUTED, INK } from "../lib/constants";
import { brl, diasAte, fmtData } from "../lib/helpers";
import AvisarClienteWhatsapp from "./AvisarClienteWhatsapp";

const AMARELO = "#8A6A0C";
const AMARELO_BG = "#FCEFC7";
const VERMELHO = "#9C4A1E";
const VERMELHO_BG = "#F6E3D9";
const DIAS_PAGAMENTO_ANTIGO = 15;

function faltaReceber(p) {
  if (p.pagamentoDividido) {
    const entrada = p.statusEntrada !== "Recebido" ? parseFloat(p.valorEntrada) || 0 : 0;
    const restante = p.statusRestante !== "Recebido" ? parseFloat(p.valorRestante) || 0 : 0;
    return entrada + restante;
  }
  return p.aReceber?.statusPagamento !== "Recebido" ? parseFloat(p.aReceber?.valor) || 0 : 0;
}

// Duas outras coisas que hoje só se descobre abrindo pedido por pedido:
// pedidos "Pronto" esperando o cliente vir buscar, e pagamento pendente
// há muito tempo sem cobrança — mesma ideia do painel da Fabiana, só que
// pra esses dois casos.
export default function OutrasPendencias({ pedidos, onSelecionar }) {
  const prontos = (pedidos || []).filter((p) => p.status === "Pronto");

  const pagamentosAntigos = (pedidos || [])
    .filter((p) => p.status !== "Entregue" && p.status !== "Doação")
    .map((p) => ({ p, falta: faltaReceber(p), dias: p.dataPedido ? -diasAte(p.dataPedido) : 0 }))
    .filter((x) => x.falta > 0 && x.dias > DIAS_PAGAMENTO_ANTIGO)
    .sort((a, b) => b.dias - a.dias);

  return (
    <>
      {prontos.length > 0 && (
        <Card style={{ padding: 16, marginBottom: 16, border: `1px solid ${AMARELO}` }}>
          <div className="flex items-center gap-2 mb-2">
            <PackageCheck size={16} color={AMARELO} />
            <strong style={{ color: AMARELO, fontSize: 14 }}>
              {prontos.length} pedido(s) prontos aguardando o cliente buscar
            </strong>
          </div>
          <div className="flex flex-col gap-2">
            {prontos.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-2 flex-wrap" style={{ background: AMARELO_BG, borderRadius: 6, padding: "8px 10px" }}>
                <button type="button" onClick={() => onSelecionar(p.id)} className="text-left" style={{ fontSize: 13 }}>
                  <strong style={{ color: INK }}>{p.cliente || "Sem nome"}</strong>{" "}
                  <span style={{ color: TEXT_MUTED }}>· pedido {fmtData(p.dataPedido)}</span>
                </button>
                <AvisarClienteWhatsapp clienteId={p.clienteId} nomeCliente={p.cliente} mensagem={`Oi ${p.cliente}! Seu pedido de camisa já está pronto — pode vir buscar quando quiser. 😊`} />
              </div>
            ))}
          </div>
        </Card>
      )}

      {pagamentosAntigos.length > 0 && (
        <Card style={{ padding: 16, marginBottom: 16, border: `1px solid ${VERMELHO}` }}>
          <div className="flex items-center gap-2 mb-2">
            <Clock size={16} color={VERMELHO} />
            <strong style={{ color: VERMELHO, fontSize: 14 }}>
              {pagamentosAntigos.length} pagamento(s) pendente(s) há mais de {DIAS_PAGAMENTO_ANTIGO} dias
            </strong>
          </div>
          <div className="flex flex-col gap-2">
            {pagamentosAntigos.map(({ p, falta, dias }) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelecionar(p.id)}
                className="w-full flex items-center justify-between gap-2 flex-wrap text-left"
                style={{ background: VERMELHO_BG, borderRadius: 6, padding: "8px 10px" }}
              >
                <span style={{ fontSize: 13 }}>
                  <strong style={{ color: INK }}>{p.cliente || "Sem nome"}</strong>{" "}
                  <span style={{ color: TEXT_MUTED }}>· pedido há {dias}d</span>
                </span>
                <span className="fx-mono" style={{ fontWeight: 700, fontSize: 13, color: VERMELHO }}>
                  falta {brl(falta)}
                </span>
              </button>
            ))}
          </div>
        </Card>
      )}
    </>
  );
}
