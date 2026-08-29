import React, { useMemo, useState } from "react";
import { Card } from "./ui";
import { INK, TEXT_MUTED } from "../lib/constants";
import { brl } from "../lib/helpers";

// Verde/vermelho = bateu ou não bateu a meta (mesma dupla de cor já usada
// em Metas.jsx pra "variação vs mês anterior") — cor de status, não
// identidade, por isso não tem paleta categórica nem legenda de série.
const VERDE = "#2C6E31";
const VERMELHO = "#9C4A1E";
const ALTURA_GRAFICO = 130;
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

// Doação fica de fora — mesmo critério do resto do Metas.jsx.
function vendidoNoMes(pedidos, pecas, mes) {
  const camisaria = pedidos.filter((p) => p.status !== "Doação" && (p.dataPedido || "").slice(0, 7) === mes).reduce((s, p) => s + (parseFloat(p.aReceber.valor) || 0), 0);
  const alfaiataria = (pecas || []).filter((p) => p.status !== "Doação" && (p.dataPedido || "").slice(0, 7) === mes).reduce((s, p) => s + (parseFloat(p.valorVenda) || 0), 0);
  return camisaria + alfaiataria;
}

export default function MetaPorMes({ pedidos, pecas, metaTotal }) {
  const [hover, setHover] = useState(null);
  const meses = useMemo(() => ultimosMeses(12), []);
  const dados = useMemo(() => meses.map((mes) => ({ mes, total: vendidoNoMes(pedidos, pecas, mes) })), [meses, pedidos, pecas]);
  const maxValor = Math.max(1, ...dados.map((d) => d.total));

  return (
    <Card style={{ padding: 20 }} className="mb-6">
      <div className="fx-serif mb-1" style={{ fontSize: 15, fontWeight: 600 }}>
        Cumprimento de meta — últimos 12 meses
      </div>
      <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 20 }}>
        {metaTotal > 0
          ? `Comparado à meta atual configurada (${brl(metaTotal)}/mês) — barra verde bateu a meta, vermelha não bateu.`
          : "Configure uma meta em Configurações pra ver quais meses bateram ou não."}
      </div>
      <div className="flex items-end gap-2" style={{ minHeight: ALTURA_GRAFICO + 50 }}>
        {dados.map((d) => {
          const altura = (d.total / maxValor) * ALTURA_GRAFICO;
          const bateu = metaTotal > 0 ? d.total >= metaTotal : null;
          const cor = bateu === null ? INK : bateu ? VERDE : VERMELHO;
          const emFoco = hover === d.mes;
          return (
            <div
              key={d.mes}
              className="flex flex-col items-center"
              style={{ flex: 1, minWidth: 30, position: "relative" }}
              onMouseEnter={() => setHover(d.mes)}
              onMouseLeave={() => setHover(null)}
            >
              {emFoco && (
                <div
                  style={{
                    position: "absolute",
                    bottom: altura + 34,
                    background: INK,
                    color: "#FFF",
                    padding: "7px 11px",
                    borderRadius: 6,
                    fontSize: 11,
                    whiteSpace: "nowrap",
                    zIndex: 10,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                  }}
                >
                  {rotuloMes(d.mes)}: {brl(d.total)}
                  {metaTotal > 0 ? ` (${Math.round((d.total / metaTotal) * 100)}% da meta)` : ""}
                </div>
              )}
              <div className="fx-mono" style={{ fontSize: 11, fontWeight: 700, color: cor, marginBottom: 6 }}>
                {brl(d.total)}
              </div>
              <div
                style={{
                  height: Math.max(altura, 3),
                  width: "100%",
                  maxWidth: 36,
                  margin: "0 auto",
                  background: cor,
                  borderRadius: "4px 4px 0 0",
                  opacity: emFoco ? 1 : 0.9,
                }}
              />
              <div className="fx-mono" style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 8 }}>
                {rotuloMes(d.mes)}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
