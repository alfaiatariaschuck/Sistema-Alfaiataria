import React, { useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, Search } from "lucide-react";
import { Card, Empty, PageTitle, Pill } from "../components/ui";
import { BRASS_SOFT, INK, LINE, TEXT_MUTED, inputStyle } from "../lib/constants";
import { brl, fmtData, valorRecebidoEfetivo } from "../lib/helpers";

// Histórico de entregas — uma linha por vez (toggle interno Camisaria/
// Alfaiataria), pra não precisar de duas abas na lateral. Assim que um
// pedido/peça vira "Entregue" ele some das listas ativas (Pedidos e
// Pedidos Alfaiataria) e passa a aparecer aqui, agrupado por cliente.
export default function Entregues({ pedidos, pecas, irPara, irParaPeca }) {
  const [busca, setBusca] = useState("");
  const [expandido, setExpandido] = useState(null);
  const [tipo, setTipo] = useState("camisaria");

  const isCamisaria = tipo === "camisaria";
  const camisasEntregues = isCamisaria ? pedidos.filter((p) => p.status === "Entregue") : [];
  const pecasEntregues = isCamisaria ? [] : pecas.filter((p) => p.status === "Entregue");

  const porCliente = new Map();
  function registrar(nome, tipoItem, item) {
    const key = (nome || "").trim().toLowerCase();
    if (!key) return;
    if (!porCliente.has(key)) porCliente.set(key, { nome: nome.trim(), camisas: [], pecas: [] });
    porCliente.get(key)[tipoItem].push(item);
  }
  camisasEntregues.forEach((p) => registrar(p.cliente, "camisas", p));
  pecasEntregues.forEach((p) => registrar(p.cliente, "pecas", p));

  const clientes = [...porCliente.values()]
    .filter((c) => c.nome.toLowerCase().includes(busca.toLowerCase()))
    .sort((a, b) => b.camisas.length + b.pecas.length - (a.camisas.length + a.pecas.length));

  const totalCamisas = camisasEntregues.reduce((s, p) => s + (parseFloat(p.quantidade) || 0), 0);

  const eyebrow = isCamisaria ? `${clientes.length} clientes · ${totalCamisas} camisas` : `${clientes.length} clientes · ${pecasEntregues.length} peças`;

  // Pedidos já entregues (cliente já levou a camisa) mas que ficaram sem
  // baixa de pagamento pra Fabiana — sem valor lançado (esqueceu de
  // preencher) ou lançado mas nunca marcado como pago. Sempre visível,
  // independente do toggle Camisaria/Alfaiataria, porque é sobre
  // descuido do dono, não sobre o que está sendo olhado no momento.
  const pedidosSemPagarFabi = (pedidos || [])
    .filter((p) => p.status === "Entregue")
    .map((p) => {
      const valorFabiana = parseFloat(p.pagoFabiana?.valor) || 0;
      const pago = valorRecebidoEfetivo({
        pagamentoDividido: p.pagamentoFabianaDividido,
        valorEntrada: p.valorEntradaFabiana,
        statusEntrada: p.statusEntradaFabiana,
        valorRestante: p.valorRestanteFabiana,
        statusRestante: p.statusRestanteFabiana,
        valorTotal: valorFabiana,
        statusTotal: p.pagoFabiana?.statusPagamento,
        labelPago: "Pago",
      });
      return { ...p, valorFabiana, pendenteFabiana: Math.max(0, valorFabiana - pago) };
    })
    .filter((p) => p.valorFabiana === 0 || p.pendenteFabiana > 0)
    .sort((a, b) => (b.dataEntrega || b.dataPedido || "").localeCompare(a.dataEntrega || a.dataPedido || ""));

  return (
    <div>
      <PageTitle eyebrow={eyebrow} title="Entregues" />

      {pedidosSemPagarFabi.length > 0 && (
        <div className="mb-4 p-4" style={{ background: "#F6E3D9", border: "1px solid #E0A583", borderRadius: 8 }}>
          <div className="flex items-center gap-2 mb-2" style={{ color: "#9C4A1E", fontWeight: 700, fontSize: 13 }}>
            <AlertTriangle size={16} />
            {pedidosSemPagarFabi.length} pedido(s) entregue(s) sem baixa de pagamento pra Fabiana
          </div>
          <div className="flex flex-col gap-1">
            {pedidosSemPagarFabi.map((p) => (
              <button
                key={p.id}
                onClick={() => irPara(p.id)}
                className="w-full flex items-center justify-between"
                style={{ fontSize: 12, color: "#7A3A18", textAlign: "left", padding: "3px 0" }}
              >
                <span>
                  {p.cliente} · entregue {fmtData(p.dataEntrega || p.dataPedido)} · {p.quantidade} un
                </span>
                <span className="fx-mono" style={{ fontWeight: 700 }}>
                  {p.valorFabiana === 0 ? "sem valor lançado" : `falta ${brl(p.pendenteFabiana)}`}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 mb-4">
        {[
          { id: "camisaria", label: "Camisaria" },
          { id: "alfaiataria", label: "Alfaiataria" },
        ].map((op) => (
          <button
            key={op.id}
            onClick={() => {
              setTipo(op.id);
              setExpandido(null);
            }}
            style={{
              background: tipo === op.id ? INK : "transparent",
              color: tipo === op.id ? "#FFF" : TEXT_MUTED,
              border: `1px solid ${tipo === op.id ? INK : LINE}`,
              padding: "6px 14px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {op.label}
          </button>
        ))}
      </div>

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
