import React, { useState } from "react";
import { CheckCircle2, Clock, Search } from "lucide-react";
import { Card, Empty, PageTitle, Pill } from "../components/ui";
import { BRASS_SOFT, INK, LINE, TEXT_MUTED, inputStyle } from "../lib/constants";

export default function Compras({ pedidos, pecas, onTecidoPedido, onTecidoPeca, irParaPedido, irParaPeca }) {
  const [busca, setBusca] = useState("");
  const [filtroFornecedor, setFiltroFornecedor] = useState("Todos");
  const [filtroStatus, setFiltroStatus] = useState("Pendente");

  const itens = [];
  pedidos.forEach((p) => {
    (p.tecidos || []).forEach((t) => {
      if (!t.codigo && !t.fornecedor) return;
      itens.push({
        origem: "camisa",
        pedidoId: p.id,
        tecidoId: t.id,
        cliente: p.cliente,
        codigo: t.codigo,
        qtd: t.qtd,
        numero: t.numero,
        fornecedor: t.fornecedor || "Sem fornecedor definido",
        comprado: !!t.comprado,
        dataPedido: p.dataPedido,
      });
    });
  });
  (pecas || []).forEach((p) => {
    (p.tecidos || []).forEach((t) => {
      if (!t.codigo && !t.fornecedor) return;
      itens.push({
        origem: "alfaiataria",
        pedidoId: p.id,
        tecidoId: t.id,
        cliente: p.cliente,
        codigo: t.codigo,
        qtd: t.qtd,
        numero: t.numero,
        fornecedor: t.fornecedor || "Sem fornecedor definido",
        comprado: !!t.comprado,
        dataPedido: p.dataPedido,
        tipoPeca: p.tipoPeca,
      });
    });
  });

  const fornecedores = ["Todos", ...new Set(itens.map((i) => i.fornecedor))];

  const filtrados = itens.filter((i) => {
    if (filtroFornecedor !== "Todos" && i.fornecedor !== filtroFornecedor) return false;
    if (filtroStatus === "Pendente" && i.comprado) return false;
    if (filtroStatus === "Comprado" && !i.comprado) return false;
    if (busca && !i.cliente.toLowerCase().includes(busca.toLowerCase()) && !i.codigo.toLowerCase().includes(busca.toLowerCase())) return false;
    return true;
  });

  const porFornecedor = new Map();
  filtrados.forEach((i) => {
    if (!porFornecedor.has(i.fornecedor)) porFornecedor.set(i.fornecedor, []);
    porFornecedor.get(i.fornecedor).push(i);
  });

  const pendentes = itens.filter((i) => !i.comprado).length;

  function alternarComprado(item) {
    if (item.origem === "camisa") onTecidoPedido(item.pedidoId, item.tecidoId, "comprado", !item.comprado);
    else onTecidoPeca(item.pedidoId, item.tecidoId, "comprado", !item.comprado);
  }

  function abrirItem(item) {
    if (item.origem === "camisa") irParaPedido(item.pedidoId);
    else irParaPeca(item.pedidoId);
  }

  return (
    <div>
      <PageTitle eyebrow={`${pendentes} item(ns) pendente(s)`} title="Compras" />

      <div className="flex flex-col md:flex-row gap-3 mb-5">
        <div className="flex items-center gap-2 flex-1" style={{ ...inputStyle, padding: "6px 10px" }}>
          <Search size={14} color={TEXT_MUTED} />
          <input
            placeholder="Buscar cliente ou código…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            style={{ border: "none", outline: "none", background: "transparent", width: "100%", fontSize: 14 }}
          />
        </div>
        <select value={filtroFornecedor} onChange={(e) => setFiltroFornecedor(e.target.value)} style={{ ...inputStyle, maxWidth: 220 }}>
          {fornecedores.map((f) => (
            <option key={f}>{f}</option>
          ))}
        </select>
        <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} style={{ ...inputStyle, maxWidth: 160 }}>
          <option>Pendente</option>
          <option>Comprado</option>
          <option>Todos</option>
        </select>
      </div>

      {filtrados.length === 0 && (
        <Card style={{ padding: 20 }}>
          <Empty texto="Nenhum item de tecido encontrado com esse filtro." />
        </Card>
      )}

      {[...porFornecedor.entries()].map(([fornecedor, lista]) => (
        <Card key={fornecedor} style={{ padding: 0, marginBottom: 16, overflow: "hidden" }}>
          <div style={{ background: INK, padding: "10px 16px" }}>
            <span className="fx-serif" style={{ color: "#FFF", fontSize: 14, fontWeight: 600 }}>
              {fornecedor}
            </span>
            <span style={{ color: "#8593A3", fontSize: 12 }}> · {lista.length} item(ns)</span>
          </div>
          {lista.map((item, i) => (
            <div
              key={item.origem + "-" + item.pedidoId + "-" + item.tecidoId}
              className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: i < lista.length - 1 ? `1px solid ${LINE}` : "none" }}
            >
              <button onClick={() => abrirItem(item)} className="text-left flex-1">
                <div className="flex items-center gap-1.5">
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{item.cliente}</span>
                  {item.origem === "alfaiataria" && <Pill text={item.tipoPeca} style={{ bg: BRASS_SOFT, fg: "#A9793E" }} />}
                </div>
                <div className="fx-mono" style={{ fontSize: 11, color: TEXT_MUTED }}>
                  Código {item.codigo || "—"} · Qtd {item.qtd} {item.numero ? `· Obs: ${item.numero}` : ""}
                </div>
              </button>
              <button
                onClick={() => alternarComprado(item)}
                className="flex items-center gap-1 flex-shrink-0"
                style={{
                  background: item.comprado ? "#DCEBDD" : "#F6E3D9",
                  color: item.comprado ? "#2C6E31" : "#9C4A1E",
                  padding: "7px 12px",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {item.comprado ? (
                  <>
                    <CheckCircle2 size={13} /> Comprado
                  </>
                ) : (
                  <>
                    <Clock size={13} /> Comprar
                  </>
                )}
              </button>
            </div>
          ))}
        </Card>
      ))}
    </div>
  );
}
