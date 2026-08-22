import React, { useState } from "react";
import { ChevronDown, ChevronUp, Search } from "lucide-react";
import { Card, Empty, PageTitle, Pill } from "../components/ui";
import { BRASS_SOFT, LINE, TEXT_MUTED, inputStyle } from "../lib/constants";
import { fmtData } from "../lib/helpers";

// Histórico de entregas — pedidos de camisa e peças de alfaiataria que
// já foram marcados como "Entregue" saem das listas ativas (Pedidos e
// Pedidos Alfaiataria) e ficam aqui, agrupados por cliente.
export default function Entregues({ pedidos, pecas, irPara, irParaPeca }) {
  const [busca, setBusca] = useState("");
  const [expandido, setExpandido] = useState(null);

  const camisasEntregues = pedidos.filter((p) => p.status === "Entregue");
  const pecasEntregues = pecas.filter((p) => p.status === "Entregue");

  const porCliente = new Map();
  function registrar(nome, tipo, item) {
    const key = (nome || "").trim().toLowerCase();
    if (!key) return;
    if (!porCliente.has(key)) porCliente.set(key, { nome: nome.trim(), camisas: [], pecas: [] });
    porCliente.get(key)[tipo].push(item);
  }
  camisasEntregues.forEach((p) => registrar(p.cliente, "camisas", p));
  pecasEntregues.forEach((p) => registrar(p.cliente, "pecas", p));

  const clientes = [...porCliente.values()]
    .filter((c) => c.nome.toLowerCase().includes(busca.toLowerCase()))
    .sort((a, b) => b.camisas.length + b.pecas.length - (a.camisas.length + a.pecas.length));

  const totalCamisas = camisasEntregues.reduce((s, p) => s + (parseFloat(p.quantidade) || 0), 0);

  return (
    <div>
      <PageTitle eyebrow={`${clientes.length} clientes · ${totalCamisas} camisas · ${pecasEntregues.length} peças`} title="Entregues" />

      <div className="flex items-center gap-2 mb-4" style={{ ...inputStyle, maxWidth: 360, padding: "6px 10px" }}>
        <Search size={14} color={TEXT_MUTED} />
        <input
          placeholder="Buscar cliente…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          style={{ border: "none", outline: "none", background: "transparent", width: "100%", fontSize: 14 }}
        />
      </div>

      <Card>
        {clientes.length === 0 && (
          <div className="p-6">
            <Empty texto="Nenhuma entrega registrada ainda." />
          </div>
        )}
        {clientes.map((c, i) => {
          const aberto = expandido === c.nome;
          const total = c.camisas.length + c.pecas.length;
          const qtdCamisas = c.camisas.reduce((s, p) => s + (parseFloat(p.quantidade) || 0), 0);
          return (
            <div key={c.nome} style={{ borderBottom: i < clientes.length - 1 ? `1px solid ${LINE}` : "none" }}>
              <button onClick={() => setExpandido(aberto ? null : c.nome)} className="w-full flex items-center justify-between px-5 py-3.5 text-left">
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{c.nome}</div>
                  <div style={{ fontSize: 12, color: TEXT_MUTED }}>
                    {c.camisas.length > 0 && `${qtdCamisas} camisa(s)`}
                    {c.camisas.length > 0 && c.pecas.length > 0 && " · "}
                    {c.pecas.length > 0 && `${c.pecas.length} peça(s) de alfaiataria`}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Pill text={`${total} entrega(s)`} style={{ bg: BRASS_SOFT, fg: "#A9793E" }} />
                  {aberto ? <ChevronUp size={16} color={TEXT_MUTED} /> : <ChevronDown size={16} color={TEXT_MUTED} />}
                </div>
              </button>

              {aberto && (
                <div className="px-5 pb-4" style={{ background: "#FCFAF5" }}>
                  {c.camisas.map((p) => (
                    <button
                      key={"c-" + p.id}
                      onClick={() => irPara(p.id)}
                      className="w-full flex items-center justify-between py-2"
                      style={{ borderBottom: `1px solid ${LINE}`, textAlign: "left" }}
                    >
                      <span style={{ fontSize: 13 }}>
                        Camisa · {fmtData(p.dataPedido)} · {p.quantidade} un
                      </span>
                      <Pill text="Camisaria" style={{ bg: BRASS_SOFT, fg: "#A9793E" }} />
                    </button>
                  ))}
                  {c.pecas.map((p) => (
                    <button
                      key={"p-" + p.id}
                      onClick={() => irParaPeca(p.id)}
                      className="w-full flex items-center justify-between py-2"
                      style={{ borderBottom: `1px solid ${LINE}`, textAlign: "left" }}
                    >
                      <span style={{ fontSize: 13 }}>
                        {p.tipoPeca} · {fmtData(p.dataPedido)}
                      </span>
                      <Pill text="Alfaiataria" style={{ bg: "#E9E1F5", fg: "#5B3E96" }} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </Card>
    </div>
  );
}
