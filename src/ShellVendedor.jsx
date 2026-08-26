import React, { useState } from "react";
import { ChevronRight, ClipboardList, LogOut, Plus, Ruler } from "lucide-react";
import { useAuth } from "./contexts/AuthContext";
import { usePedidos } from "./hooks/usePedidos";
import { useNomesClientes } from "./hooks/useNomesClientes";
import { salvarDadosPessoaisCliente } from "./lib/clientes";
import { BRASS, CANVAS, INK, INK_SOFT, LINE, STATUS_STYLE, TEXT_MUTED } from "./lib/constants";
import { brl, fmtData } from "./lib/helpers";
import { Card, Empty, Pill } from "./components/ui";
import VendedorNovoPedido from "./pages/VendedorNovoPedido";
import DetalhePedidoVendedor from "./pages/DetalhePedidoVendedor";

// App enxuto pro vendedor: só a ficha de pedido de camisa (criar e
// editar o que ele mesmo lançou) — nada de painéis, financeiro,
// alfaiataria, planos ou configurações, tanto pela tela quanto pelo
// banco (RLS).
export default function ShellVendedor() {
  const { sair, perfil } = useAuth();
  const [tab, setTab] = useState("novo");
  const [selecionado, setSelecionado] = useState(null);
  const { pedidos, loading, saving, criarPedido, atualizarCampo, atualizarSubcampo, adicionarTecido, atualizarTecido } = usePedidos();
  const { nomesClientes, recarregarNomesClientes } = useNomesClientes();

  async function salvar(p) {
    const { clienteId } = await criarPedido(p);
    // Se o cliente já tiver dados pessoais cadastrados, a gravação é
    // barrada pelo RLS (o vendedor só pode criar, não sobrescrever) e
    // falha em silêncio — não impede o pedido de ter sido lançado.
    await salvarDadosPessoaisCliente(clienteId, p.dadosPessoais);
    await recarregarNomesClientes();
  }

  const atual = pedidos.find((p) => p.id === selecionado);

  return (
    <div style={{ background: CANVAS, minHeight: "100vh", fontFamily: "'Inter', sans-serif", color: INK }}>
      <div style={{ background: INK }} className="px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Ruler size={18} color={BRASS} />
          <span className="fx-serif" style={{ color: "#F5F1E8", fontSize: 16, fontWeight: 600 }}>
            Schuck
          </span>
          <span style={{ color: "#8593A3", fontSize: 12 }}>· {perfil?.nome || "Vendedor"}</span>
        </div>
        <div className="flex items-center gap-3">
          <span style={{ color: "#6B7A8C", fontSize: 11 }}>{saving ? "Salvando…" : "Sincronizado"}</span>
          <button onClick={sair} className="flex items-center gap-1.5" style={{ color: "#A9B4C0", fontSize: 13, fontWeight: 500 }}>
            <LogOut size={14} /> Sair
          </button>
        </div>
      </div>

      <div className="px-5 pt-4 flex gap-2" style={{ maxWidth: 768, margin: "0 auto" }}>
        <button
          onClick={() => {
            setTab("novo");
            setSelecionado(null);
          }}
          className="flex items-center gap-2"
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 13,
            background: tab === "novo" ? INK : "#EDEAE0",
            color: tab === "novo" ? "#FFF" : INK_SOFT,
          }}
        >
          <Plus size={15} /> Novo Pedido
        </button>
        <button
          onClick={() => {
            setTab("pedidos");
            setSelecionado(null);
          }}
          className="flex items-center gap-2"
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 13,
            background: tab === "pedidos" ? INK : "#EDEAE0",
            color: tab === "pedidos" ? "#FFF" : INK_SOFT,
          }}
        >
          <ClipboardList size={15} /> Meus Pedidos
        </button>
      </div>

      <div className="max-w-3xl mx-auto px-5 py-6">
        {tab === "novo" && <VendedorNovoPedido onSalvar={salvar} nomesClientes={nomesClientes} nomeVendedor={perfil?.nome} />}

        {tab === "pedidos" && atual && (
          <DetalhePedidoVendedor
            pedido={atual}
            onVoltar={() => setSelecionado(null)}
            onCampo={atualizarCampo}
            onSub={atualizarSubcampo}
            onAddTecido={adicionarTecido}
            onTecido={atualizarTecido}
          />
        )}

        {tab === "pedidos" && !atual && (
          <Card>
            {loading && (
              <div className="p-6" style={{ fontSize: 13, color: TEXT_MUTED }}>
                Carregando…
              </div>
            )}
            {!loading && pedidos.length === 0 && (
              <div className="p-6">
                <Empty texto="Você ainda não lançou nenhum pedido." />
              </div>
            )}
            {!loading &&
              pedidos.map((p, i) => (
                <button
                  key={p.id}
                  onClick={() => setSelecionado(p.id)}
                  className="w-full flex items-center justify-between px-5 py-3 text-left"
                  style={{ borderBottom: i < pedidos.length - 1 ? `1px solid ${LINE}` : "none" }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{p.cliente || "Sem nome"}</div>
                    <div style={{ fontSize: 12, color: TEXT_MUTED }}>
                      Pedido {fmtData(p.dataPedido)} · {p.quantidade} un
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="fx-mono" style={{ fontSize: 13, fontWeight: 600 }}>
                      {brl(parseFloat(p.aReceber.valor) || 0)}
                    </span>
                    <Pill text={p.status} style={STATUS_STYLE[p.status]} />
                    <ChevronRight size={16} color={TEXT_MUTED} />
                  </div>
                </button>
              ))}
          </Card>
        )}
      </div>
    </div>
  );
}
