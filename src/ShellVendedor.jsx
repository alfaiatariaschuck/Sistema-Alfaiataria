import React, { useEffect, useRef, useState } from "react";
import { BarChart3, Calculator, CalendarDays, Camera, ChevronRight, ClipboardList, Compass, LogOut, Plus, Receipt, Ruler, Trophy } from "lucide-react";
import { useAuth } from "./contexts/AuthContext";
import { usePedidos } from "./hooks/usePedidos";
import { useNomesClientes } from "./hooks/useNomesClientes";
import { useProvadorTecidos } from "./hooks/useProvadorTecidos";
import { salvarDadosPessoaisCliente } from "./lib/clientes";
import { BRASS, CANVAS, INK, INK_SOFT, LINE, STATUS_STYLE, TEXT_MUTED } from "./lib/constants";
import { brl, fmtData } from "./lib/helpers";
import { Card, Empty, Pill } from "./components/ui";
import VendedorNovoPedido from "./pages/VendedorNovoPedido";
import DetalhePedidoVendedor from "./pages/DetalhePedidoVendedor";
import MeuDesempenhoVendedor from "./pages/MeuDesempenhoVendedor";
import MinhaComissaoVendedor from "./pages/MinhaComissaoVendedor";
import FunilVendas from "./components/FunilVendas";
import AgendaComercial from "./components/AgendaComercial";
import RankingIndicacao from "./pages/RankingIndicacao";
import Orcamento from "./pages/Orcamento";

// App enxuto pro vendedor: só a ficha de pedido de camisa (criar e
// editar o que ele mesmo lançou) — nada de painéis, financeiro,
// alfaiataria, planos ou configurações, tanto pela tela quanto pelo
// banco (RLS).
export default function ShellVendedor() {
  const { sair, perfil } = useAuth();
  const [tab, setTab] = useState("novo");
  const [selecionado, setSelecionado] = useState(null);
  const { pedidos, loading, saving, criarPedido, atualizarCampo, atualizarSubcampo, adicionarTecido, atualizarTecido } = usePedidos();
  const { nomesClientes, clientesBase, recarregarNomesClientes } = useNomesClientes();
  const { tecidos: tecidosProvador, adicionar: adicionarTecidoProvador, atualizar: atualizarTecidoProvador, remover: removerTecidoProvador } = useProvadorTecidos();

  // Mesma ponte do Shell do dono — o Provador de Tecidos (iframe) fala
  // com o sistema por postMessage pra guardar o mostruário no Supabase,
  // compartilhado com o dono, em vez de só no navegador do Deivid.
  const provadorStateRef = useRef(null);
  provadorStateRef.current = {
    tecidos: tecidosProvador,
    adicionar: adicionarTecidoProvador,
    atualizar: atualizarTecidoProvador,
    remover: removerTecidoProvador,
  };
  useEffect(() => {
    async function onMensagemProvador(e) {
      if (e.origin !== window.location.origin) return;
      const m = e.data;
      if (!m || typeof m !== "object" || m.source !== "provador-schuck") return;
      if (m.type === "provador:ping") {
        try {
          e.source.postMessage({ source: "sistema-alfaiataria", type: "provador:pong" }, "*");
        } catch {
          // iframe fechado/trocado entre o ping e a resposta — sem problema
        }
        return;
      }
      const reply = (extra) => {
        try {
          e.source.postMessage({ source: "sistema-alfaiataria", type: m.type + ":result", reqId: m.reqId, ...extra }, "*");
        } catch {
          // idem
        }
      };
      const st = provadorStateRef.current;
      try {
        if (m.type === "provador:list") reply({ fabrics: st.tecidos });
        else if (m.type === "provador:add") reply({ fabric: await st.adicionar(m.payload) });
        else if (m.type === "provador:update") {
          await st.atualizar(m.payload.id, m.payload.patch);
          reply({});
        } else if (m.type === "provador:remove") {
          await st.remover(m.payload.id);
          reply({});
        }
      } catch (err) {
        reply({ error: err?.message || "erro desconhecido" });
      }
    }
    window.addEventListener("message", onMensagemProvador);
    return () => window.removeEventListener("message", onMensagemProvador);
  }, []);

  // Mesma correção aplicada no Shell do dono: "medidas" não é subcampo de
  // aReceber/pagoFabiana, então atualizarSubcampo ignorava o update em
  // silêncio (sem coluna mapeada) — grava o objeto `medidas` inteiro via
  // atualizarCampo, que sabe gravar essa coluna.
  function atualizarMedidaPedido(pedidoId, label, valor) {
    const pedido = pedidos.find((p) => p.id === pedidoId);
    const medidas = { ...(pedido?.medidas || {}), [label]: valor };
    atualizarCampo(pedidoId, "medidas", medidas);
  }

  // Mesma correção pra "descricao" (características da camisa).
  function atualizarDescricaoPedido(pedidoId, label, valor) {
    const pedido = pedidos.find((p) => p.id === pedidoId);
    const descricao = { ...(pedido?.descricao || {}), [label]: valor };
    atualizarCampo(pedidoId, "descricao", descricao);
  }

  async function salvar(p) {
    const { clienteId } = await criarPedido(p);
    // Ele pode escrever por cima mesmo se o cliente já tiver dados
    // pessoais (schema_v79) — mas continua sem conseguir LER o que já
    // está cadastrado, então isso é sempre uma gravação "às cegas".
    await salvarDadosPessoaisCliente(clienteId, p.dadosPessoais);
    await recarregarNomesClientes();
  }

  const atual = pedidos.find((p) => p.id === selecionado);

  return (
    <div style={{ background: CANVAS, minHeight: "100vh", fontFamily: "'Inter', sans-serif", color: INK }}>
      <div style={{ background: INK }} className="px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Ruler size={18} color={BRASS} />
          <span className="fx-serif" style={{ color: "#F0EEEA", fontSize: 16, fontWeight: 600 }}>
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
        <button
          onClick={() => {
            setTab("gestao");
            setSelecionado(null);
          }}
          className="flex items-center gap-2"
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 13,
            background: tab === "gestao" ? INK : "#EDEAE0",
            color: tab === "gestao" ? "#FFF" : INK_SOFT,
          }}
        >
          <BarChart3 size={15} /> Minha Gestão
        </button>
        <button
          onClick={() => {
            setTab("comissao");
            setSelecionado(null);
          }}
          className="flex items-center gap-2"
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 13,
            background: tab === "comissao" ? INK : "#EDEAE0",
            color: tab === "comissao" ? "#FFF" : INK_SOFT,
          }}
        >
          <Calculator size={15} /> Minha Comissão
        </button>
        <button
          onClick={() => {
            setTab("funil");
            setSelecionado(null);
          }}
          className="flex items-center gap-2"
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 13,
            background: tab === "funil" ? INK : "#EDEAE0",
            color: tab === "funil" ? "#FFF" : INK_SOFT,
          }}
        >
          <Compass size={15} /> Funil de Vendas
        </button>
        <button
          onClick={() => {
            setTab("agenda");
            setSelecionado(null);
          }}
          className="flex items-center gap-2"
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 13,
            background: tab === "agenda" ? INK : "#EDEAE0",
            color: tab === "agenda" ? "#FFF" : INK_SOFT,
          }}
        >
          <CalendarDays size={15} /> Agenda
        </button>
        <button
          onClick={() => {
            setTab("ranking-indicacao");
            setSelecionado(null);
          }}
          className="flex items-center gap-2"
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 13,
            background: tab === "ranking-indicacao" ? INK : "#EDEAE0",
            color: tab === "ranking-indicacao" ? "#FFF" : INK_SOFT,
          }}
        >
          <Trophy size={15} /> Ranking de Indicação
        </button>
        <button
          onClick={() => {
            setTab("provador");
            setSelecionado(null);
          }}
          className="flex items-center gap-2"
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 13,
            background: tab === "provador" ? INK : "#EDEAE0",
            color: tab === "provador" ? "#FFF" : INK_SOFT,
          }}
        >
          <Camera size={15} /> Provador de Tecidos
        </button>
        <button
          onClick={() => {
            setTab("orcamento");
            setSelecionado(null);
          }}
          className="flex items-center gap-2"
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 13,
            background: tab === "orcamento" ? INK : "#EDEAE0",
            color: tab === "orcamento" ? "#FFF" : INK_SOFT,
          }}
        >
          <Receipt size={15} /> Orçamento
        </button>
      </div>

      <div className="max-w-3xl mx-auto px-5 py-6">
        {tab === "novo" && <VendedorNovoPedido onSalvar={salvar} nomesClientes={nomesClientes} nomeVendedor={perfil?.nome} pedidos={pedidos} />}

        {tab === "provador" && (
          <div style={{ height: "calc(100vh - 230px)", minHeight: 480, borderRadius: 10, overflow: "hidden", border: `1px solid ${LINE}` }}>
            <iframe src="/provador/index.html" title="Provador de Tecidos" style={{ width: "100%", height: "100%", border: "none" }} />
          </div>
        )}

        {tab === "orcamento" && (
          // modelosCamisa, custoAviamentosPorPecaBase e estoqueTecidos ficam de
          // fora de propósito. modelos_camisa/aviamentos são dono-only por RLS
          // (schema_v41/v46) — o login do Deivid não enxerga essas linhas mesmo
          // se eu pedir aqui, então o custo de aviamento não entra na conta dele
          // e o selo de margem fica um pouco otimista (real pode ser mais
          // baixa). estoqueTecidos foi deixado de fora à parte: o Orcamento usa
          // esse valor pra autocompletar o R$/metro quando o código bate com o
          // estoque (valorMetroDoEstoque em Orcamento.jsx), o que revelaria o
          // custo de compra do tecido pro Deivid — justamente o dado que "ele
          // não pode ver minha margem jamais" pede pra esconder. Avisar o
          // Tales sobre os dois pontos antes de confiar o selo do Deivid como
          // exato.
          <Orcamento apenasCamisa modoApresentacao pecas={[]} equipe={[]} />
        )}

        {tab === "ranking-indicacao" && <RankingIndicacao clientesBase={clientesBase} podeMarcarEntregue={false} />}

        {tab === "gestao" && <MeuDesempenhoVendedor pedidos={pedidos} />}

        {tab === "comissao" && <MinhaComissaoVendedor pedidos={pedidos} />}

        {tab === "funil" && <FunilVendas vendedorId={perfil?.id} pedidos={pedidos} podeEditar />}

        {tab === "agenda" && <AgendaComercial vendedorId={perfil?.id} podeEditar nomesClientes={nomesClientes} />}

        {tab === "pedidos" && atual && (
          <DetalhePedidoVendedor
            pedido={atual}
            onVoltar={() => setSelecionado(null)}
            onCampo={atualizarCampo}
            onSub={atualizarSubcampo}
            onMedida={atualizarMedidaPedido}
            onDescricao={atualizarDescricaoPedido}
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
