import React from "react";
import { ClipboardList, LogOut, Ruler } from "lucide-react";
import { useAuth } from "./contexts/AuthContext";
import { usePedidos } from "./hooks/usePedidos";
import { useNomesClientes } from "./hooks/useNomesClientes";
import { BRASS, CANVAS, INK, LINE, STATUS_STYLE, TEXT_MUTED } from "./lib/constants";
import { brl, fmtData } from "./lib/helpers";
import { Card, Empty, Pill } from "./components/ui";
import VendedorNovoPedido from "./pages/VendedorNovoPedido";

// App enxuto pro vendedor: só a ficha de pedido de camisa e a lista do
// que ele mesmo lançou. Nada de painéis, financeiro, alfaiataria,
// planos ou configurações — tanto pela tela quanto pelo banco (RLS).
export default function ShellVendedor() {
  const { sair, perfil } = useAuth();
  const { pedidos, loading, saving, criarPedido } = usePedidos();
  const { nomesClientes, recarregarNomesClientes } = useNomesClientes();

  async function salvar(p) {
    await criarPedido(p);
    await recarregarNomesClientes();
  }

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

      <div className="max-w-3xl mx-auto px-5 py-6">
        <VendedorNovoPedido onSalvar={salvar} nomesClientes={nomesClientes} nomeVendedor={perfil?.nome} />

        <div className="mt-8">
          <div className="flex items-center gap-2 mb-3">
            <ClipboardList size={16} color={BRASS} />
            <div className="fx-serif" style={{ fontSize: 16, fontWeight: 600 }}>
              Meus pedidos lançados
            </div>
          </div>
          <Card>
            {loading && <div className="p-6" style={{ fontSize: 13, color: TEXT_MUTED }}>Carregando…</div>}
            {!loading && pedidos.length === 0 && (
              <div className="p-6">
                <Empty texto="Você ainda não lançou nenhum pedido." />
              </div>
            )}
            {!loading &&
              pedidos.map((p, i) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between px-5 py-3"
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
                  </div>
                </div>
              ))}
          </Card>
        </div>
      </div>
    </div>
  );
}
