import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Archive,
  BarChart3,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  FileText,
  Gauge,
  GitCompare,
  Layers,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  PackageCheck,
  PieChart,
  PiggyBank,
  Plus,
  Receipt,
  Ruler,
  Target,
  Scissors,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Users,
  Users2,
  Wallet,
} from "lucide-react";
import { useAuth } from "./contexts/AuthContext";
import { usePedidos } from "./hooks/usePedidos";
import { usePedidosAlfaiataria } from "./hooks/usePedidosAlfaiataria";
import { usePlanosAssinatura } from "./hooks/usePlanosAssinatura";
import { useNomesClientes } from "./hooks/useNomesClientes";
import { useHistoricoVendas } from "./hooks/useHistoricoVendas";
import { useTelefonesClientes } from "./hooks/useTelefonesClientes";
import { useEstoqueTecidos } from "./hooks/useEstoqueTecidos";
import { useDespesas } from "./hooks/useDespesas";
import { useEquipeProducao } from "./hooks/useEquipeProducao";
import { useFornecedores } from "./hooks/useFornecedores";
import { useAviamentos } from "./hooks/useAviamentos";
import { usePrevisoesVenda } from "./hooks/usePrevisoesVenda";
import { useNotasVendaFutura } from "./hooks/useNotasVendaFutura";
import { encontrarOuCriarCliente, salvarDadosPessoaisCliente } from "./lib/clientes";
import { BRASS, CANVAS, INK, INK_SOFT } from "./lib/constants";
import { hojeISO, mediaDiasProducaoComFallback, mediaDiasProducaoPorTipo, projetarPrevisoesFilaPorEquipe } from "./lib/helpers";
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
import ControleProducao from "./pages/ControleProducao";
import Equipe from "./pages/Equipe";
import Fornecedores from "./pages/Fornecedores";
import Aviamentos from "./pages/Aviamentos";
import HistoricoProducao from "./pages/HistoricoProducao";
import CustosAtelie from "./pages/CustosAtelie";
import CustosCamisaria from "./pages/CustosCamisaria";
import ComparativoMensal from "./pages/ComparativoMensal";
import PlanosAssinatura from "./pages/PlanosAssinatura";
import Configuracoes from "./pages/Configuracoes";
import EstoqueCamisaria from "./pages/EstoqueCamisaria";
import ContasAPagar from "./pages/ContasAPagar";
import Metas from "./pages/Metas";
import BuscaGlobal from "./components/BuscaGlobal";

const NAV = [
  { id: "dashboard", label: "Painel Camisaria", icon: LayoutDashboard, primary: true, grupo: "Camisaria" },
  { id: "novo", label: "Pedido Camisas", icon: Plus, primary: true, grupo: "Camisaria" },
  { id: "pedidos", label: "Pedidos", icon: ClipboardList, primary: true, grupo: "Camisaria" },
  { id: "estoque-camisaria", label: "Estoque Camisaria", icon: PackageCheck, primary: false, grupo: "Camisaria" },
  { id: "planos-assinatura", label: "Planos de Assinatura", icon: PackageCheck, primary: false, grupo: "Camisaria" },
  { id: "custos-camisaria", label: "Custos da Camisaria", icon: PiggyBank, primary: false, grupo: "Camisaria" },
  { id: "relatorio", label: "Relatório", icon: FileText, primary: false, grupo: "Camisaria" },

  { id: "painel-alfaiataria", label: "Painel Alfaiataria", icon: PieChart, primary: false, grupo: "Alfaiataria" },
  { id: "alfaiataria", label: "Pedido Alfaiataria", icon: Scissors, primary: true, grupo: "Alfaiataria" },
  { id: "pedidos-alfaiataria", label: "Pedidos Alfaiataria", icon: ListChecks, primary: true, grupo: "Alfaiataria" },
  { id: "controle-producao", label: "Controle de Produção", icon: Gauge, primary: true, grupo: "Alfaiataria" },
  { id: "historico-producao", label: "Histórico de Produção", icon: BarChart3, primary: false, grupo: "Alfaiataria" },
  { id: "custos-atelie", label: "Custos do Ateliê", icon: PiggyBank, primary: false, grupo: "Alfaiataria" },
  { id: "relatorio-alfaiataria", label: "Relatório Alfaiataria", icon: FileText, primary: false, grupo: "Alfaiataria" },

  { id: "compras", label: "Compras", icon: ShoppingCart, primary: true, grupo: "Geral" },
  { id: "entregues", label: "Entregues", icon: Archive, primary: false, grupo: "Geral" },
  { id: "clientes", label: "Clientes", icon: Users, primary: false, grupo: "Geral" },
  { id: "consolidado", label: "Consolidado", icon: Layers, primary: false, grupo: "Geral" },
  { id: "comparativo-mensal", label: "Comparativo Mensal", icon: GitCompare, primary: false, grupo: "Geral" },
  { id: "metas", label: "Metas", icon: Target, primary: false, grupo: "Geral" },
  { id: "caixa", label: "Fluxo de Caixa", icon: Wallet, primary: false, grupo: "Geral" },
  { id: "contas-a-pagar", label: "Contas a Pagar", icon: Receipt, primary: false, grupo: "Geral" },

  { id: "equipe", label: "Equipe", icon: Users2, primary: false, grupo: "Sistema" },
  { id: "fornecedores", label: "Fornecedores", icon: ShoppingCart, primary: false, grupo: "Sistema" },
  { id: "aviamentos", label: "Aviamentos", icon: PackageCheck, primary: false, grupo: "Sistema" },
  { id: "backup", label: "Backup", icon: ShieldCheck, primary: false, grupo: "Sistema" },
  { id: "config", label: "Configurações", icon: Settings, primary: false, grupo: "Sistema" },
];
const GRUPOS_NAV = ["Camisaria", "Alfaiataria", "Geral", "Sistema"];
const NAV_PRIMARIA = NAV.filter((n) => n.primary);
const NAV_SECUNDARIA = NAV.filter((n) => !n.primary);

export default function Shell() {
  const { sair } = useAuth();
  const [tab, setTab] = useState("dashboard");
  const [selecionado, setSelecionado] = useState(null);
  const [selecionadaPeca, setSelecionadaPeca] = useState(null);
  const [mostrarMais, setMostrarMais] = useState(false);
  // Só o grupo da aba atual começa aberto — os outros ficam recolhidos pra
  // lateral não ficar gigante; abrir/fechar não muda a aba selecionada.
  const [gruposAbertos, setGruposAbertos] = useState(() => new Set([NAV.find((n) => n.id === "dashboard")?.grupo]));

  useEffect(() => {
    const grupo = NAV.find((n) => n.id === tab)?.grupo;
    if (grupo) setGruposAbertos((prev) => (prev.has(grupo) ? prev : new Set(prev).add(grupo)));
  }, [tab]);

  const { pedidos, loading, erro, saving, recarregar, limparErro, criarPedido, atualizarCampo, atualizarSubcampo, removerPedido, adicionarTecido, atualizarTecido } =
    usePedidos();

  const {
    pecas,
    loading: loadingPecas,
    erro: erroPecas,
    saving: savingPecas,
    criarPeca,
    atualizarCampo: atualizarCampoPeca,
    pausarPeca,
    retomarPeca,
    desfazerInicioPeca,
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
  const { historicoVendas } = useHistoricoVendas();
  const { clientesComTelefone } = useTelefonesClientes();
  const { estoque: estoqueTecidos, movimentos: movimentosEstoque, consumoPorTecido, cadastrarTecido, registrarCompra, darBaixa: darBaixaEstoque, removerTecido: removerEstoque } = useEstoqueTecidos();
  const { despesas, criarDespesa, marcarPaga, atualizarValorPago, atualizarDespesa, removerDespesa } = useDespesas();
  const { equipe, loading: loadingEquipe, adicionarMembro, atualizarMembro, removerMembro } = useEquipeProducao();
  const { fornecedores, loading: loadingFornecedores, adicionarFornecedor, atualizarFornecedor, removerFornecedor } = useFornecedores();
  const { itens: aviamentos, loading: loadingAviamentos, adicionarItem: adicionarAviamento, atualizarItem: atualizarAviamento, removerItem: removerAviamento, custoPorPecaBase } = useAviamentos();
  const { previsoes, criarPrevisao, atualizarPrevisao, removerPrevisao } = usePrevisoesVenda();
  const { notas: notasVendaFutura, criarNota, removerNota } = useNotasVendaFutura();

  // Receita do mês de cada linha — usada só pra ratear os custos
  // compartilhados da empresa entre Custos do Ateliê e Custos da
  // Camisaria (cada página recebe a receita da linha "de fora").
  const mesAtualStr = hojeISO().slice(0, 7);
  const receitaMesCamisaria = useMemo(
    () =>
      (pedidos || [])
        .filter((p) => p.status !== "Doação" && p.dataPedido && p.dataPedido.slice(0, 7) === mesAtualStr)
        .reduce((s, p) => s + (parseFloat(p.aReceber?.valor) || 0), 0),
    [pedidos, mesAtualStr]
  );
  const receitaMesAlfaiataria = useMemo(
    () =>
      (pecas || [])
        .filter((p) => p.status !== "Doação" && p.dataPedido && p.dataPedido.slice(0, 7) === mesAtualStr)
        .reduce((s, p) => s + (parseFloat(p.valorVenda) || 0), 0),
    [pecas, mesAtualStr]
  );

  const clientes = useMemo(() => {
    const map = new Map();
    // Parte de TODOS os clientes cadastrados (mesmo os sem pedido ainda —
    // cadastrados manualmente em Clientes), não só de quem já comprou.
    clientesBase.forEach((c) => {
      const key = c.nome.trim().toLowerCase();
      if (!key) return;
      map.set(key, { id: c.id, nome: c.nome.trim(), pedidos: [], pecas: [], contatadoEm: c.campanha_contatado_em || null });
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
    // Vendas da planilha antiga (antes do app) — vinculadas por cliente_id,
    // não entram em pedidos/pecas (não têm medidas nem status de produção).
    const porClienteId = new Map([...map.values()].map((c) => [c.id, c]));
    historicoVendas.forEach((h) => {
      const c = porClienteId.get(h.cliente_id);
      if (!c) return;
      if (!c.historico) c.historico = [];
      c.historico.push(h);
    });
    return [...map.values()]
      .map((c) => ({ ...c, temTelefone: clientesComTelefone.has(c.id) }))
      .sort((a, b) => b.pedidos.length + b.pecas.length - (a.pedidos.length + a.pecas.length));
  }, [pedidos, pecas, clientesBase, historicoVendas, clientesComTelefone]);

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
      pagamentoFabianaDividido: false,
      valorEntradaFabiana: "",
      statusEntradaFabiana: "Pendente",
      valorRestanteFabiana: "",
      statusRestanteFabiana: "Pendente",
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
  function atualizarResponsavelSecaoPeca(pecaId, secKey, nome) {
    const peca = pecas.find((p) => p.id === pecaId);
    const responsaveisSecoes = { ...(peca?.responsaveisSecoes || {}), [secKey]: nome };
    atualizarCampoPeca(pecaId, "responsaveisSecoes", responsaveisSecoes);
  }

  const mediaDiasProducaoAlfaiataria = useMemo(() => mediaDiasProducaoComFallback(pecas), [pecas]);
  const mediaDiasPorTipoAlfaiataria = useMemo(() => {
    const cache = new Map();
    return (tipoPeca) => {
      if (!cache.has(tipoPeca)) cache.set(tipoPeca, mediaDiasProducaoPorTipo(pecas, tipoPeca));
      return cache.get(tipoPeca);
    };
  }, [pecas]);
  const pecasAbertasAlfaiataria = useMemo(() => pecas.filter((p) => p.status !== "Entregue"), [pecas]);
  const previsoesFilaAlfaiataria = useMemo(
    () => projetarPrevisoesFilaPorEquipe(pecasAbertasAlfaiataria, (p) => mediaDiasPorTipoAlfaiataria(p.tipoPeca), equipe),
    [pecasAbertasAlfaiataria, mediaDiasPorTipoAlfaiataria, equipe]
  );

  const acoesPeca = {
    onCampo: atualizarCampoPeca,
    onPausar: pausarPeca,
    onRetomar: retomarPeca,
    onDesfazerInicio: desfazerInicioPeca,
    mediaDiasPorTipo: mediaDiasPorTipoAlfaiataria,
    previsoesFila: previsoesFilaAlfaiataria,
    onMedida: atualizarMedidaPeca,
    onCaracteristica: atualizarCaracteristicaPeca,
    onResponsavelSecao: atualizarResponsavelSecaoPeca,
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
          <nav className="flex-1 px-3 overflow-y-auto">
            {GRUPOS_NAV.map((grupo) => {
              const itensGrupo = NAV.filter((n) => n.grupo === grupo);
              const aberto = gruposAbertos.has(grupo);
              return (
                <div key={grupo} className="mb-1">
                  <button
                    onClick={() =>
                      setGruposAbertos((prev) => {
                        const proximo = new Set(prev);
                        if (proximo.has(grupo)) proximo.delete(grupo);
                        else proximo.add(grupo);
                        return proximo;
                      })
                    }
                    className="w-full flex items-center justify-between px-3 py-2"
                  >
                    <span style={{ color: "#6B7A8C", fontSize: 11, fontWeight: 600, letterSpacing: 1 }} className="uppercase">
                      {grupo}
                    </span>
                    {aberto ? <ChevronDown size={13} color="#6B7A8C" /> : <ChevronRight size={13} color="#6B7A8C" />}
                  </button>
                  {aberto &&
                    itensGrupo.map((item) => {
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
                </div>
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
              {tab === "dashboard" && (
                <Dashboard
                  pedidos={pedidos}
                  pecas={pecas}
                  despesas={despesas}
                  estoqueTecidos={estoqueTecidos}
                  irPara={irPara}
                  irParaTab={setTab}
                />
              )}
              {tab === "novo" && (
                <NovoPedido
                  onSalvar={salvarNovoPedido}
                  onSalvarPlano={salvarNovoPlano}
                  nomesClientes={nomesClientes}
                  pedidos={pedidos}
                  estoqueTecidos={estoqueTecidos}
                />
              )}
              {tab === "estoque-camisaria" && (
                <EstoqueCamisaria
                  estoque={estoqueTecidos}
                  movimentos={movimentosEstoque}
                  consumoPorTecido={consumoPorTecido}
                  onCadastrar={cadastrarTecido}
                  onRegistrarCompra={registrarCompra}
                  onRemover={removerEstoque}
                />
              )}
              {tab === "pedidos" && <Pedidos pedidos={pedidos} selecionado={selecionado} setSelecionado={setSelecionado} {...acoesPedido} />}
              {tab === "entregues" && !loadingPecas && <Entregues pedidos={pedidos} pecas={pecas} irPara={irPara} irParaPeca={irParaPeca} />}
              {tab === "clientes" && (
                <Clientes clientes={clientes} irParaPedido={irPara} irParaPeca={irParaPeca} onCadastrar={cadastrarClienteManual} />
              )}
              {tab === "caixa" && <FluxoDeCaixa pedidos={pedidos} pecas={pecas} irParaPedido={irPara} irParaPeca={irParaPeca} />}
              {tab === "contas-a-pagar" && (
                <ContasAPagar
                  pedidos={pedidos}
                  pecas={pecas}
                  despesas={despesas}
                  previsoes={previsoes}
                  notas={notasVendaFutura}
                  onCriarDespesa={criarDespesa}
                  onMarcarPaga={marcarPaga}
                  onAtualizarValorPago={atualizarValorPago}
                  onAtualizarDespesa={atualizarDespesa}
                  onRemoverDespesa={removerDespesa}
                  onCriarPrevisao={criarPrevisao}
                  onAtualizarPrevisao={atualizarPrevisao}
                  onRemoverPrevisao={removerPrevisao}
                  onCriarNota={criarNota}
                  onRemoverNota={removerNota}
                  irParaPedido={irPara}
                  irParaPeca={irParaPeca}
                />
              )}
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
              {tab === "alfaiataria" && !loadingPecas && (
                <PedidoAlfaiataria
                  onCriar={salvarNovaPeca}
                  nomesClientes={nomesClientes}
                  pecas={pecas}
                  equipe={equipe}
                  custoAviamentosPorPecaBase={custoPorPecaBase}
                />
              )}
              {tab === "pedidos-alfaiataria" && !loadingPecas && (
                <PedidosAlfaiataria pecas={pecas} selecionada={selecionadaPeca} setSelecionada={setSelecionadaPeca} {...acoesPeca} />
              )}
              {tab === "controle-producao" && !loadingPecas && (
                <ControleProducao
                  pecas={pecas}
                  onCampo={atualizarCampoPeca}
                  onPausar={pausarPeca}
                  onRetomar={retomarPeca}
                  onDesfazerInicio={desfazerInicioPeca}
                  mediaDiasProducao={mediaDiasProducaoAlfaiataria}
                  mediaDiasPorTipo={mediaDiasPorTipoAlfaiataria}
                  previsoesFila={previsoesFilaAlfaiataria}
                  equipe={equipe}
                  irParaPeca={irParaPeca}
                />
              )}
              {tab === "historico-producao" && !loadingPecas && <HistoricoProducao pecas={pecas} mostrarMargem />}
              {tab === "equipe" && (
                <Equipe equipe={equipe} loading={loadingEquipe} onAdicionar={adicionarMembro} onCampo={atualizarMembro} onRemover={removerMembro} />
              )}
              {tab === "custos-atelie" && !loadingPecas && (
                <CustosAtelie pecas={pecas} equipe={equipe} custoAviamentosPorPecaBase={custoPorPecaBase} receitaMesOutraLinha={receitaMesCamisaria} />
              )}
              {tab === "custos-camisaria" && !loading && <CustosCamisaria pedidos={pedidos} receitaMesOutraLinha={receitaMesAlfaiataria} />}
              {tab === "fornecedores" && (
                <Fornecedores
                  fornecedores={fornecedores}
                  loading={loadingFornecedores}
                  onAdicionar={adicionarFornecedor}
                  onCampo={atualizarFornecedor}
                  onRemover={removerFornecedor}
                />
              )}
              {tab === "aviamentos" && (
                <Aviamentos
                  itens={aviamentos}
                  loading={loadingAviamentos}
                  fornecedores={fornecedores}
                  onAdicionar={adicionarAviamento}
                  onCampo={atualizarAviamento}
                  onRemover={removerAviamento}
                />
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
              {tab === "comparativo-mensal" && !loadingPecas && !loading && <ComparativoMensal pedidos={pedidos} pecas={pecas} />}
              {tab === "metas" && !loadingPecas && <Metas pedidos={pedidos} pecas={pecas} />}
              {tab === "backup" && <Backup pedidos={pedidos} onImportar={criarPedido} />}
              {tab === "config" && <Configuracoes despesas={despesas} onCriarDespesa={criarDespesa} />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
