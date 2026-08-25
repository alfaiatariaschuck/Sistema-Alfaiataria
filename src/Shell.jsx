import React, { useMemo, useState } from "react";
import {
  AlertCircle,
  Archive,
  ClipboardList,
  FileText,
  Layers,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  PackageCheck,
  PieChart,
  Plus,
  Ruler,
  Scissors,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Users,
  Wallet,
} from "lucide-react";
import { useAuth } from "./contexts/AuthContext";
import { usePedidos } from "./hooks/usePedidos";
import { usePedidosAlfaiataria } from "./hooks/usePedidosAlfaiataria";
import { usePlanosAssinatura } from "./hooks/usePlanosAssinatura";
import { useNomesClientes } from "./hooks/useNomesClientes";
import { useEstoqueTecidos } from "./hooks/useEstoqueTecidos";
import { encontrarOuCriarCliente, salvarDadosPessoaisCliente } from "./lib/clientes";
import { BRASS, CANVAS, INK, INK_SOFT } from "./lib/constants";
import { hojeISO } from "./lib/helpers";
import Dashboard from "./pages/Dashboard";
import DashboardAlfaiataria from "./pages/DashboardAlfaiataria";
import NovoPedido from "./pages/NovoPedido";
import Pedidos from "./pages/Pedidos";
import Clientes from "./pages/Clientes";
import Compras from "./pages/Compras";
import Relatorio from "./pages/Relatorio";
import RelatorioAlfaiataria from "./pages/RelatorioAlfaiataria";
import Consolidado from "./pages/Consolidado";
import Entregues from "./pages/Entregues";
import Backup from "./pages/Backup";
import FluxoDeCaixa from "./pages/FluxoDeCaixa";
import PedidoAlfaiataria from "./pages/PedidoAlfaiataria";
import PedidosAlfaiataria from "./pages/PedidosAlfaiataria";
import PlanosAssinatura from "./pages/PlanosAssinatura";
import Configuracoes from "./pages/Configuracoes";
import EstoqueCamisaria from "./pages/EstoqueCamisaria";
import BuscaGlobal from "./components/BuscaGlobal";

const NAV = [
  { id: "dashboard", label: "Painel Camisaria", icon: LayoutDashboard, primary: true },
  { id: "novo", label: "Pedido Camisas", icon: Plus, primary: true },
  { id: "pedidos", label: "Pedidos", icon: ClipboardList, primary: true },
  { id: "entregues-camisaria", label: "Entregue Camisaria", icon: Archive, primary: false },
  { id: "entregues-alfaiataria", label: "Entregue Alfaiataria", icon: Archive, primary: false },
  { id: "compras", label: "Compras", icon: ShoppingCart, primary: true },
  { id: "estoque-camisaria", label: "Estoque Camisaria", icon: PackageCheck, primary: false },
  { id: "alfaiataria", label: "Pedido Alfaiataria", icon: Scissors, primary: true },
  { id: "pedidos-alfaiataria", label: "Pedidos Alfaiataria", icon: ListChecks, primary: true },
  { id: "planos-assinatura", label: "Planos de Assinatura", icon: PackageCheck, primary: false },
  { id: "painel-alfaiataria", label: "Painel Alfaiataria", icon: PieChart, primary: false },
  { id: "consolidado", label: "Consolidado", icon: Layers, primary: false },
  { id: "clientes", label: "Clientes", icon: Users, primary: false },
  { id: "caixa", label: "Fluxo de Caixa", icon: Wallet, primary: false },
  { id: "relatorio", label: "Relatório", icon: FileText, primary: false },
  { id: "relatorio-alfaiataria", label: "Relatório Alfaiataria", icon: FileText, primary: false },
  { id: "backup", label: "Backup", icon: ShieldCheck, primary: false },
  { id: "config", label: "Configurações", icon: Settings, primary: false },
];
const NAV_PRIMARIA = NAV.filter((n) => n.primary);
const NAV_SECUNDARIA = NAV.filter((n) => !n.primary);

export default function Shell() {
  const { sair } = useAuth();
  const [tab, setTab] = useState("dashboard");
  const [selecionado, setSelecionado] = useState(null);
  const [selecionadaPeca, setSelecionadaPeca] = useState(null);
  const [mostrarMais, setMostrarMais] = useState(false);

  const { pedidos, loading, erro, saving, recarregar, limparErro, criarPedido, atualizarCampo, atualizarSubcampo, removerPedido, adicionarTecido, atualizarTecido } =
    usePedidos();

  const {
    pecas,
    loading: loadingPecas,
    erro: erroPecas,
    saving: savingPecas,
    criarPeca,
    atualizarCampo: atualizarCampoPeca,
    removerPeca,
    adicionarTecido: adicionarTecidoPeca,
    atualizarTecido: atualizarTecidoPeca,
  } = usePedidosAlfaiataria();

  const {
    planos,
    loading: loadingPlanos,
    erro: erroPlanos,
    saving: savingPlanos,
    criarPlano,
    atualizarCampo: atualizarCampoPlano,
    atualizarMedida: atualizarMedidaPlano,
    atualizarDescricao: atualizarDescricaoPlano,
    adicionarTecido: adicionarTecidoPlano,
    atualizarTecido: atualizarTecidoPlano,
    removerPlano,
  } = usePlanosAssinatura();

  const { nomesClientes, clientesBase, recarregarNomesClientes } = useNomesClientes();
  const { estoque: estoqueTecidos, movimentos: movimentosEstoque, cadastrarTecido, registrarCompra, darBaixa: darBaixaEstoque, removerTecido: removerEstoque } = useEstoqueTecidos();

  const clientes = useMemo(() => {
    const map = new Map();
    // Parte de TODOS os clientes cadastrados (mesmo os sem pedido ainda —
    // cadastrados manualmente em Clientes), não só de quem já comprou.
    clientesBase.forEach((c) => {
      const key = c.nome.trim().toLowerCase();
      if (!key) return;
      map.set(key, { id: c.id, nome: c.nome.trim(), pedidos: [], pecas: [] });
    });
    pedidos.forEach((p) => {
      const key = p.cliente.trim().toLowerCase();
      if (!key) return;
      if (!map.has(key)) map.set(key, { id: p.clienteId, nome: p.cliente.trim(), pedidos: [], pecas: [] });
      map.get(key).pedidos.push(p);
    });
    pecas.forEach((p) => {
      const key = (p.cliente || "").trim().toLowerCase();
      if (!key) return;
      if (!map.has(key)) map.set(key, { id: p.clienteId, nome: p.cliente.trim(), pedidos: [], pecas: [] });
      map.get(key).pecas.push(p);
    });
    return [...map.values()].sort((a, b) => b.pedidos.length + b.pecas.length - (a.pedidos.length + a.pecas.length));
  }, [pedidos, pecas, clientesBase]);

  function irPara(id) {
    setTab("pedidos");
    setSelecionado(id);
  }

  function irParaPeca(id) {
    setTab("pedidos-alfaiataria");
    setSelecionadaPeca(id);
  }

  async function cadastrarClienteManual(nome, dadosPessoais) {
    const clienteId = await encontrarOuCriarCliente(nome);
    await salvarDadosPessoaisCliente(clienteId, dadosPessoais);
    await recarregarNomesClientes();
  }

  async function salvarNovoPedido(p) {
    const { id, clienteId } = await criarPedido(p);
    await salvarDadosPessoaisCliente(clienteId, p.dadosPessoais);
    await recarregarNomesClientes();
    setTab("pedidos");
    setSelecionado(id);
  }

  async function salvarNovaPeca(p) {
    const { id, clienteId } = await criarPeca(p);
    await salvarDadosPessoaisCliente(clienteId, p.dadosPessoais);
    await recarregarNomesClientes();
    irParaPeca(id);
  }

  async function salvarNovoPlano(p) {
    await criarPlano({
      cliente: p.cliente,
      vendedor: p.vendedor,
      quantidade: p.quantidade,
      dataVenda: p.dataPedido,
      valorReceber: p.aReceber.valor,
      statusPagamentoVenda: p.aReceber.statusPagamento,
      pagamentoDividido: p.pagamentoDividido,
      valorEntrada: p.valorEntrada,
      statusEntrada: p.statusEntrada,
      valorRestante: p.valorRestante,
      statusRestante: p.statusRestante,
      valorFabiana: p.pagoFabiana.valor,
      formaPagamento: p.formaPagamento,
      medidas: p.medidas,
      descricao: p.descricao,
      tecidos: p.tecidos,
      observacoes: p.observacoes,
    });
    await recarregarNomesClientes();
    setTab("planos-assinatura");
  }

  async function converterPedidoEmPlano(p) {
    await criarPlano({
      cliente: p.cliente,
      vendedor: p.vendedor,
      quantidade: p.quantidade,
      qtEntregue: p.qtEntregue,
      dataVenda: p.dataPedido,
      valorReceber: p.aReceber.valor,
      statusPagamentoVenda: p.aReceber.statusPagamento,
      pagamentoDividido: p.pagamentoDividido,
      valorEntrada: p.valorEntrada,
      statusEntrada: p.statusEntrada,
      valorRestante: p.valorRestante,
      statusRestante: p.statusRestante,
      valorFabiana: p.pagoFabiana.valor,
      formaPagamento: p.formaPagamento,
      medidas: p.medidas,
      descricao: p.descricao,
      tecidos: p.tecidos,
      observacoes: p.observacoes,
    });
    await removerPedido(p.id);
    await recarregarNomesClientes();
    setSelecionado(null);
    setTab("planos-assinatura");
  }

  async function emitirPedidoDoPlano(plano) {
    const { id } = await criarPedido({
      cliente: plano.cliente,
      vendedor: plano.vendedor,
      dataPedido: hojeISO(),
      previsaoEntrega: "",
      quantidade: 1,
      status: "Aguardando Produção",
      qtEntregue: 0,
      // A venda já foi contada na data da venda do plano — a emissão mensal
      // só controla produção/entrega, não gera receita nova.
      aReceber: { valor: "", statusPagamento: "Pendente" },
      pagamentoDividido: false,
      valorEntrada: "",
      statusEntrada: "Pendente",
      valorRestante: "",
      statusRestante: "Pendente",
      formaPagamento: plano.formaPagamento,
      recompra: true,
      assinatura: false,
      origemPlanoId: plano.id,
      pagoFabiana: { valor: plano.valorFabiana, statusPagamento: "Pendente" },
      medidas: plano.medidas,
      descricao: plano.descricao,
      tecidos: plano.tecidos && plano.tecidos.length ? plano.tecidos : [{ codigo: "", qtd: 1, numero: "", fornecedor: "", comprado: false }],
      observacoes: plano.observacoes,
    });
    await atualizarCampoPlano(plano.id, "qtEntregue", (plano.qtEntregue || 0) + 1);
    await recarregarNomesClientes();
    irPara(id);
  }

  const acoesPedido = {
    onCampo: atualizarCampo,
    onSub: atualizarSubcampo,
    onRemover: (id) => {
      removerPedido(id);
      setSelecionado(null);
    },
    onAddTecido: adicionarTecido,
    onTecido: atualizarTecido,
    onConverterPlano: converterPedidoEmPlano,
    estoqueTecidos,
    onDarBaixaEstoque: darBaixaEstoque,
  };

  function atualizarMedidaPeca(pecaId, secKey, label, valor) {
    const peca = pecas.find((p) => p.id === pecaId);
    const medidas = { ...(peca?.medidas || {}), [secKey]: { ...(peca?.medidas?.[secKey] || {}), [label]: valor } };
    atualizarCampoPeca(pecaId, "medidas", medidas);
  }
  function atualizarCaracteristicaPeca(pecaId, label, valor) {
    const peca = pecas.find((p) => p.id === pecaId);
    const caracteristicas = { ...(peca?.caracteristicas || {}), [label]: valor };
    atualizarCampoPeca(pecaId, "caracteristicas", caracteristicas);
  }

  const acoesPeca = {
    onCampo: atualizarCampoPeca,
    onMedida: atualizarMedidaPeca,
    onCaracteristica: atualizarCaracteristicaPeca,
    onRemover: (id) => {
      removerPeca(id);
      setSelecionadaPeca(null);
    },
    onAddTecido: adicionarTecidoPeca,
    onTecido: atualizarTecidoPeca,
  };

  return (
    <div style={{ background: CANVAS, minHeight: "100vh", fontFamily: "'Inter', sans-serif", color: INK }}>
      <div className="flex min-h-screen">
        <aside style={{ background: INK, width: 220, flexShrink: 0 }} className="hidden md:flex flex-col">
          <div className="px-6 pt-8 pb-6">
            <div className="flex items-center gap-2">
              <Ruler size={20} color={BRASS} />
              <span className="fx-serif" style={{ color: "#F5F1E8", fontSize: 18, fontWeight: 600 }}>
                Schuck
              </span>
            </div>
            <div style={{ color: "#8593A3", fontSize: 11, letterSpacing: 1 }} className="mt-1 uppercase">
              Controle de Pedidos
            </div>
          </div>
          <nav className="flex-1 px-3">
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setTab(item.id);
                    setSelecionado(null);
                    setSelecionadaPeca(null);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 mb-1 rounded"
                  style={{
                    background: active ? INK_SOFT : "transparent",
                    borderLeft: active ? `3px solid ${BRASS}` : "3px solid transparent",
                    color: active ? "#FFFFFF" : "#A9B4C0",
                    fontSize: 14,
                    fontWeight: active ? 600 : 500,
                    transition: "all .15s",
                  }}
                >
                  <Icon size={16} />
                  {item.label}
                </button>
              );
            })}
          </nav>
          <button onClick={sair} className="mx-3 mb-2 flex items-center gap-3 px-3 py-2.5 rounded" style={{ color: "#A9B4C0", fontSize: 13, fontWeight: 500 }}>
            <LogOut size={15} /> Sair
          </button>
          <div className="px-6 py-5" style={{ color: "#6B7A8C", fontSize: 11 }}>
            {saving || savingPecas || savingPlanos ? "Salvando…" : "Sincronizado"}
          </div>
        </aside>

        <div className="md:hidden fixed bottom-0 left-0 right-0 z-20" style={{ background: INK, borderTop: `1px solid ${INK_SOFT}` }}>
          <div className="flex justify-around py-2">
            {NAV_PRIMARIA.map((item) => {
              const Icon = item.icon;
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setTab(item.id);
                    setSelecionado(null);
                    setSelecionadaPeca(null);
                    setMostrarMais(false);
                  }}
                  className="flex flex-col items-center gap-0.5 px-2 py-1"
                >
                  <Icon size={18} color={active ? BRASS : "#8593A3"} />
                  <span style={{ fontSize: 9, color: active ? "#FFF" : "#8593A3" }}>{item.label}</span>
                </button>
              );
            })}
            <button onClick={() => setMostrarMais(true)} className="flex flex-col items-center gap-0.5 px-2 py-1">
              <Menu size={18} color={NAV_SECUNDARIA.some((n) => n.id === tab) ? BRASS : "#8593A3"} />
              <span style={{ fontSize: 9, color: NAV_SECUNDARIA.some((n) => n.id === tab) ? "#FFF" : "#8593A3" }}>Mais</span>
            </button>
          </div>
        </div>

        {mostrarMais && (
          <div className="md:hidden" style={{ position: "fixed", inset: 0, background: "rgba(22,33,46,0.6)", zIndex: 30 }} onClick={() => setMostrarMais(false)}>
            <div
              style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: INK, borderRadius: "16px 16px 0 0", padding: "20px 12px 28px" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ color: "#8593A3", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, padding: "0 12px 12px" }}>Mais opções</div>
              {NAV_SECUNDARIA.map((item) => {
                const Icon = item.icon;
                const active = tab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setTab(item.id);
                      setSelecionado(null);
                      setSelecionadaPeca(null);
                      setMostrarMais(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded"
                    style={{ background: active ? INK_SOFT : "transparent", color: active ? "#FFF" : "#A9B4C0", fontSize: 15, fontWeight: 500 }}
                  >
                    <Icon size={18} /> {item.label}
                  </button>
                );
              })}
              <button onClick={sair} className="w-full flex items-center gap-3 px-3 py-3 rounded" style={{ color: "#A9B4C0", fontSize: 15, fontWeight: 500 }}>
                <LogOut size={18} /> Sair
              </button>
            </div>
          </div>
        )}

        <main className="flex-1 px-5 md:px-10 py-8 pb-24 md:pb-8" style={{ maxWidth: 1100 }}>
          <div className="mb-5">
            <BuscaGlobal pedidos={pedidos} pecas={pecas} irPara={irPara} irParaPeca={irParaPeca} />
          </div>
          {(erro || erroPecas || erroPlanos) && (
            <div className="mb-4 px-4 py-3 rounded" style={{ background: "#F6E3D9", color: "#9C4A1E" }}>
              <div className="flex items-start gap-2">
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} /> <span>{erro || erroPecas || erroPlanos}</span>
              </div>
              <button
                onClick={() => {
                  limparErro();
                  recarregar();
                }}
                className="mt-2"
                style={{ background: "#9C4A1E", color: "#FFF", padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600 }}
              >
                Recarregar dados
              </button>
            </div>
          )}
          {loading ? (
            <div style={{ color: "#6B7280" }}>Carregando…</div>
          ) : (
            <>
              {tab === "dashboard" && <Dashboard pedidos={pedidos} irPara={irPara} />}
              {tab === "novo" && (
                <NovoPedido
                  onSalvar={salvarNovoPedido}
                  onSalvarPlano={salvarNovoPlano}
                  nomesClientes={nomesClientes}
                  pedidos={pedidos}
                  estoqueTecidos={estoqueTecidos}
                  onDarBaixaEstoque={darBaixaEstoque}
                />
              )}
              {tab === "estoque-camisaria" && (
                <EstoqueCamisaria
                  estoque={estoqueTecidos}
                  movimentos={movimentosEstoque}
                  onCadastrar={cadastrarTecido}
                  onRegistrarCompra={registrarCompra}
                  onRemover={removerEstoque}
                />
              )}
              {tab === "pedidos" && <Pedidos pedidos={pedidos} selecionado={selecionado} setSelecionado={setSelecionado} {...acoesPedido} />}
              {tab === "entregues-camisaria" && <Entregues pedidos={pedidos} pecas={pecas} tipo="camisaria" irPara={irPara} irParaPeca={irParaPeca} />}
              {tab === "entregues-alfaiataria" && !loadingPecas && (
                <Entregues pedidos={pedidos} pecas={pecas} tipo="alfaiataria" irPara={irPara} irParaPeca={irParaPeca} />
              )}
              {tab === "clientes" && (
                <Clientes clientes={clientes} irParaPedido={irPara} irParaPeca={irParaPeca} onCadastrar={cadastrarClienteManual} />
              )}
              {tab === "caixa" && <FluxoDeCaixa pedidos={pedidos} pecas={pecas} irParaPedido={irPara} irParaPeca={irParaPeca} />}
              {tab === "compras" && (
                <Compras
                  pedidos={pedidos}
                  pecas={pecas}
                  onTecidoPedido={atualizarTecido}
                  onTecidoPeca={atualizarTecidoPeca}
                  irParaPedido={irPara}
                  irParaPeca={irParaPeca}
                />
              )}
              {tab === "painel-alfaiataria" && !loadingPecas && <DashboardAlfaiataria pecas={pecas} irPara={irParaPeca} />}
              {tab === "alfaiataria" && !loadingPecas && <PedidoAlfaiataria onCriar={salvarNovaPeca} nomesClientes={nomesClientes} pecas={pecas} />}
              {tab === "pedidos-alfaiataria" && !loadingPecas && (
                <PedidosAlfaiataria pecas={pecas} selecionada={selecionadaPeca} setSelecionada={setSelecionadaPeca} {...acoesPeca} />
              )}
              {tab === "planos-assinatura" && !loadingPlanos && (
                <PlanosAssinatura
                  planos={planos}
                  onCampo={atualizarCampoPlano}
                  onMedida={atualizarMedidaPlano}
                  onDescricao={atualizarDescricaoPlano}
                  onAddTecido={adicionarTecidoPlano}
                  onTecido={atualizarTecidoPlano}
                  onRemover={removerPlano}
                  onEmitir={emitirPedidoDoPlano}
                />
              )}
              {tab === "relatorio" && <Relatorio pedidos={pedidos} planos={planos} />}
              {tab === "relatorio-alfaiataria" && !loadingPecas && <RelatorioAlfaiataria pecas={pecas} />}
              {tab === "consolidado" && !loadingPecas && !loadingPlanos && (
                <Consolidado pedidos={pedidos} pecas={pecas} planos={planos} irPara={irPara} irParaPeca={irParaPeca} />
              )}
              {tab === "backup" && <Backup pedidos={pedidos} onImportar={criarPedido} />}
              {tab === "config" && <Configuracoes />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
