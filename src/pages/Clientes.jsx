import React, { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, LayoutGrid, Megaphone, Plus, Search, Table2, TrendingUp, UserPlus } from "lucide-react";
import { Card, Empty, Field, PageTitle, Pill } from "../components/ui";
import DadosPessoaisCliente from "../components/DadosPessoaisCliente";
import CampoDadosPessoais, { dadosPessoaisVazio } from "../components/CampoDadosPessoais";
import AvisarClienteWhatsapp from "../components/AvisarClienteWhatsapp";
import RecompraPorAno from "../components/RecompraPorAno";
import VendasPorAno from "../components/VendasPorAno";
import { BRASS, BRASS_SOFT, INK, LINE, MEDIDAS_ALFAIATARIA, PECA_SECOES, STATUS_STYLE, TEXT_MUTED, inputStyle, rotuloMedida } from "../lib/constants";
import { brl, fmtData, mesesDesde, valorRecebidoEfetivo } from "../lib/helpers";
import { supabase } from "../supabaseClient";

const CHAVE_SUMIDO = "cliente_sumido_meses";
const VERMELHO = "#9C4A1E";

function medidasCamisaTexto(medidas) {
  return Object.entries(medidas || {}).filter(([, v]) => v !== "" && v != null);
}

function medidasPecaTexto(tipoPeca, medidas) {
  const secoes = PECA_SECOES[tipoPeca] || [];
  const linhas = [];
  secoes.forEach((secKey) => {
    const sec = MEDIDAS_ALFAIATARIA[secKey];
    if (!sec) return;
    sec.campos.forEach((campo) => {
      const v = medidas?.[secKey]?.[campo.label];
      if (v !== "" && v != null) linhas.push([campo.label, v]);
    });
  });
  return linhas;
}

const MENSAGEM_CAMPANHA_PADRAO =
  "Oi {nome}! Faz um tempo que você não aparece por aqui e sentimos sua falta — temos novidades pra te mostrar. Vem dar uma olhada? 😊";

export default function Clientes({ clientes, irParaPedido, irParaPeca, onCadastrar }) {
  const [busca, setBusca] = useState("");
  const [expandido, setExpandido] = useState(null);
  const [limiteMeses, setLimiteMeses] = useState(6);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novosDados, setNovosDados] = useState(dadosPessoaisVazio());
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(null);
  const [qtdMinima, setQtdMinima] = useState("");
  const [anoFiltro, setAnoFiltro] = useState("");
  const [mostrarCampanha, setMostrarCampanha] = useState(false);
  const [mostrarGrafico, setMostrarGrafico] = useState(true);
  const [mostrarGraficoVendas, setMostrarGraficoVendas] = useState(false);
  const [mensagemCampanha, setMensagemCampanha] = useState(MENSAGEM_CAMPANHA_PADRAO);
  const [visualizacao, setVisualizacao] = useState("tabela");
  const [ordenarPor, setOrdenarPor] = useState("nome");
  const [ordemDesc, setOrdemDesc] = useState(false);
  const [topN, setTopN] = useState("");
  const [mesesMinimo, setMesesMinimo] = useState("");
  const [filtroContato, setFiltroContato] = useState("");
  const [filtroRecompra, setFiltroRecompra] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroTelefone, setFiltroTelefone] = useState("");
  // Otimista: some no toque antes de esperar o servidor confirmar. Guarda
  // só as mudanças feitas nesta sessão (undefined = usa o valor do servidor).
  const [contatadosLocais, setContatadosLocais] = useState({});

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("config").select("valor").eq("chave", CHAVE_SUMIDO).maybeSingle();
      if (data?.valor) setLimiteMeses(parseInt(data.valor, 10) || 6);
    })();
  }, []);

  // Junta camisas + peças de alfaiataria pra ter a base pra filtro/campanha:
  // total comprado (unidades), se já recomprou, e o ano da última compra.
  const enriquecidos = clientes.map((c) => {
    const pecas = c.pecas || [];
    // "historico" vem da planilha antiga do dono (vendas de antes do app,
    // ou nunca lançadas aqui) — só nome/quantidade/ano, sem pedido real
    // pra abrir, então entra na conta do total comprado mas não em todosItens.
    const historico = c.historico || [];
    const totalCamisas = c.pedidos.reduce((s, p) => s + (parseFloat(p.quantidade) || 0), 0);
    const totalHistorico = historico.reduce((s, h) => s + (parseFloat(h.quantidade) || 0), 0);
    const totalComprado = totalCamisas + pecas.length + totalHistorico;
    const todosItens = [
      ...c.pedidos.map((p) => ({ tipo: "camisa", item: p, data: p.dataPedido })),
      ...pecas.map((p) => ({ tipo: "peca", item: p, data: p.dataPedido })),
    ].sort((a, b) => (b.data || "").localeCompare(a.data || ""));
    const maisRecente = todosItens[0];
    const anoPedidos = maisRecente?.data ? maisRecente.data.slice(0, 4) : null;
    const anoHistorico = historico.length ? String(Math.max(...historico.map((h) => h.ano))) : null;
    const anoUltimaCompra = [anoPedidos, anoHistorico].filter(Boolean).sort().reverse()[0] || null;
    const recompra = c.pedidos.length + pecas.length + historico.length > 1 || historico.some((h) => h.recompra);
    // Pra saber se um cliente "sumiu" mesmo quando a última compra dele só
    // existe na planilha antiga (sem data exata) — usa 31/dez do ano como
    // referência aproximada.
    const dataReferencia = maisRecente?.data || (anoHistorico ? `${anoHistorico}-12-31` : null);
    const mesesSemComprar = dataReferencia ? mesesDesde(dataReferencia) : null;
    const sumido = mesesSemComprar !== null && mesesSemComprar >= limiteMeses;
    // TODOS os anos em que o cliente comprou (não só o mais recente) — pra
    // filtrar "quem comprou em 2025", por exemplo, mesmo quem comprou de
    // novo depois (senão esse cliente só aparece no ano mais recente dele).
    const anosComCompra = new Set([...todosItens.map((i) => (i.data ? i.data.slice(0, 4) : null)).filter(Boolean), ...historico.map((h) => String(h.ano))]);
    // Marca "já mandei mensagem" da campanha — pra não mandar duas vezes
    // (e o dono avisar o Deivid quem já foi contatado, sem repetir).
    const contatadoEm = contatadosLocais[c.id] !== undefined ? contatadosLocais[c.id] : c.contatadoEm || null;
    const contatado = !!contatadoEm;
    return { ...c, historico, totalHistorico, totalComprado, anoUltimaCompra, anosComCompra, recompra, todosItens, maisRecente, mesesSemComprar, sumido, contatadoEm, contatado };
  });

  const anosDisponiveis = [...new Set(enriquecidos.flatMap((c) => [...c.anosComCompra]))].sort().reverse();

  const filtrados = enriquecidos.filter((c) => {
    const bateBusca = c.nome.toLowerCase().includes(busca.toLowerCase());
    const bateQtd = !qtdMinima || c.totalComprado >= parseFloat(qtdMinima);
    const bateAno = !anoFiltro || c.anosComCompra.has(anoFiltro);
    const bateMeses = !mesesMinimo || (c.mesesSemComprar !== null && c.mesesSemComprar >= parseFloat(mesesMinimo));
    const bateContato = !filtroContato || (filtroContato === "sim" ? c.contatado : !c.contatado);
    const bateRecompra = !filtroRecompra || (filtroRecompra === "sim" ? c.recompra : !c.recompra);
    const bateTipo = !filtroTipo || (filtroTipo === "camisaria" ? c.pedidos.length > 0 : c.pecas.length > 0);
    const bateTelefone = !filtroTelefone || (filtroTelefone === "sim" ? c.temTelefone : !c.temTelefone);
    return bateBusca && bateQtd && bateAno && bateMeses && bateContato && bateRecompra && bateTipo && bateTelefone;
  });

  const ordenados = [...filtrados].sort((a, b) => {
    let av, bv;
    if (ordenarPor === "totalComprado") {
      av = a.totalComprado;
      bv = b.totalComprado;
    } else if (ordenarPor === "anoUltimaCompra") {
      av = a.anoUltimaCompra || "";
      bv = b.anoUltimaCompra || "";
    } else if (ordenarPor === "mesesSemComprar") {
      av = a.mesesSemComprar === null ? -1 : a.mesesSemComprar;
      bv = b.mesesSemComprar === null ? -1 : b.mesesSemComprar;
    } else {
      av = a.nome.toLowerCase();
      bv = b.nome.toLowerCase();
    }
    if (av < bv) return ordemDesc ? 1 : -1;
    if (av > bv) return ordemDesc ? -1 : 1;
    return 0;
  });
  const listados = topN ? ordenados.slice(0, parseInt(topN, 10)) : ordenados;

  function ordenarPorColuna(coluna) {
    if (ordenarPor === coluna) {
      setOrdemDesc((v) => !v);
    } else {
      setOrdenarPor(coluna);
      setOrdemDesc(coluna === "totalComprado" || coluna === "mesesSemComprar");
    }
  }

  async function alternarContatado(c) {
    const novoValor = c.contatado ? null : new Date().toISOString();
    setContatadosLocais((prev) => ({ ...prev, [c.id]: novoValor }));
    const { error } = await supabase.from("clientes").update({ campanha_contatado_em: novoValor }).eq("id", c.id);
    if (error) console.error("Não consegui salvar o contato:", error);
  }

  function aplicarTopN(n) {
    setTopN(n);
    if (n) {
      setOrdenarPor("totalComprado");
      setOrdemDesc(true);
    }
  }

  // Métricas rápidas sobre a lista filtrada — dá pra medir "quantos
  // clientes compram, quanto e há quanto tempo" de relance.
  const totalPecasFiltradas = filtrados.reduce((s, c) => s + c.totalComprado, 0);
  const qtdRecompra = filtrados.filter((c) => c.recompra).length;
  const qtdSumidos = filtrados.filter((c) => c.sumido).length;
  const ticketMedio = filtrados.length ? totalPecasFiltradas / filtrados.length : 0;

  async function cadastrar(e) {
    e.preventDefault();
    if (!novoNome.trim()) return;
    setSalvando(true);
    setErro(null);
    try {
      await onCadastrar(novoNome, novosDados);
      setNovoNome("");
      setNovosDados(dadosPessoaisVazio());
      setMostrarForm(false);
    } catch (e) {
      setErro("Não consegui cadastrar (" + e.message + "). Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div>
      <PageTitle eyebrow={`${listados.length} de ${clientes.length} clientes`} title="Clientes" />

      <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
        <EstatCard label="Clientes na lista" valor={filtrados.length} />
        <EstatCard label="Peças compradas (total)" valor={totalPecasFiltradas} />
        <EstatCard label="Já recompraram" valor={`${qtdRecompra} (${filtrados.length ? Math.round((qtdRecompra / filtrados.length) * 100) : 0}%)`} />
        <EstatCard label={`Sumidos (${limiteMeses}m+)`} valor={qtdSumidos} destaque={qtdSumidos > 0} />
        <EstatCard label="Média por cliente" valor={ticketMedio.toFixed(1)} />
      </div>

      <div className="flex items-center gap-4 mb-3 flex-wrap">
        <button onClick={() => setMostrarGrafico((v) => !v)} className="flex items-center gap-2" style={{ color: BRASS, fontWeight: 600, fontSize: 12 }}>
          <TrendingUp size={14} />
          {mostrarGrafico ? "Ocultar taxa de recompra por ano" : "Ver taxa de recompra por ano"}
        </button>
        <button onClick={() => setMostrarGraficoVendas((v) => !v)} className="flex items-center gap-2" style={{ color: BRASS, fontWeight: 600, fontSize: 12 }}>
          <TrendingUp size={14} />
          {mostrarGraficoVendas ? "Ocultar peças vendidas por ano" : "Ver peças vendidas por ano"}
        </button>
      </div>
      {mostrarGrafico && <RecompraPorAno clientes={enriquecidos} />}
      {mostrarGraficoVendas && <VendasPorAno clientes={enriquecidos} />}

      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <div className="flex items-center gap-2" style={{ ...inputStyle, maxWidth: 260, padding: "6px 10px" }}>
          <Search size={14} color={TEXT_MUTED} />
          <input
            placeholder="Buscar cliente…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            style={{ border: "none", outline: "none", background: "transparent", width: "100%", fontSize: 14 }}
          />
        </div>
        <input
          type="number"
          min="1"
          placeholder="Compras mín."
          value={qtdMinima}
          onChange={(e) => setQtdMinima(e.target.value)}
          style={{ ...inputStyle, maxWidth: 130 }}
          title="Quantidade mínima comprada (camisas + peças)"
        />
        <select value={anoFiltro} onChange={(e) => setAnoFiltro(e.target.value)} style={{ ...inputStyle, maxWidth: 160 }} title="Mostra quem comprou nesse ano, mesmo quem comprou de novo depois">
          <option value="">Comprou em (ano)</option>
          {anosDisponiveis.map((ano) => (
            <option key={ano} value={ano}>
              {ano}
            </option>
          ))}
        </select>
        <input
          type="number"
          min="0"
          placeholder="Sem comprar há (mín. meses)"
          value={mesesMinimo}
          onChange={(e) => setMesesMinimo(e.target.value)}
          style={{ ...inputStyle, maxWidth: 180 }}
          title={`Deixe em branco pra não filtrar. O limite configurado de "sumido" é ${limiteMeses} meses.`}
        />
        <select value={filtroRecompra} onChange={(e) => setFiltroRecompra(e.target.value)} style={{ ...inputStyle, maxWidth: 150 }} title="Já comprou mais de uma vez?">
          <option value="">Recompra: todos</option>
          <option value="sim">Já recomprou</option>
          <option value="nao">Nunca recomprou</option>
        </select>
        <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} style={{ ...inputStyle, maxWidth: 160 }} title="O que esse cliente já comprou">
          <option value="">Tipo: todos</option>
          <option value="camisaria">Comprou camisa</option>
          <option value="alfaiataria">Comprou alfaiataria</option>
        </select>
        <select value={filtroTelefone} onChange={(e) => setFiltroTelefone(e.target.value)} style={{ ...inputStyle, maxWidth: 170 }} title="Tem telefone cadastrado (dá pra mandar WhatsApp)?">
          <option value="">Telefone: todos</option>
          <option value="sim">Tem telefone</option>
          <option value="nao">Sem telefone</option>
        </select>
        <select value={filtroContato} onChange={(e) => setFiltroContato(e.target.value)} style={{ ...inputStyle, maxWidth: 170 }} title="Quem já foi avisado da campanha">
          <option value="">Contato: todos</option>
          <option value="nao">Ainda não contatei</option>
          <option value="sim">Já contatei</option>
        </select>
        <select value={topN} onChange={(e) => aplicarTopN(e.target.value)} style={{ ...inputStyle, maxWidth: 150 }} title="Ranking de quem mais comprou">
          <option value="">Todos os clientes</option>
          <option value="10">Top 10 compradores</option>
          <option value="20">Top 20 compradores</option>
          <option value="50">Top 50 compradores</option>
        </select>
        <div className="flex items-center gap-1" style={{ background: "#EDEAE0", borderRadius: 8, padding: 3 }}>
          <button
            onClick={() => setVisualizacao("tabela")}
            className="flex items-center gap-1.5"
            style={{
              background: visualizacao === "tabela" ? INK : "transparent",
              color: visualizacao === "tabela" ? "#FFF" : INK,
              padding: "6px 10px",
              borderRadius: 6,
              fontWeight: 600,
              fontSize: 12,
            }}
          >
            <Table2 size={14} /> Tabela
          </button>
          <button
            onClick={() => setVisualizacao("cards")}
            className="flex items-center gap-1.5"
            style={{
              background: visualizacao === "cards" ? INK : "transparent",
              color: visualizacao === "cards" ? "#FFF" : INK,
              padding: "6px 10px",
              borderRadius: 6,
              fontWeight: 600,
              fontSize: 12,
            }}
          >
            <LayoutGrid size={14} /> Cards
          </button>
        </div>
        <button
          onClick={() => setMostrarCampanha((v) => !v)}
          className="flex items-center gap-2"
          style={{
            background: mostrarCampanha ? BRASS : "#EDEAE0",
            color: mostrarCampanha ? "#FFF" : INK,
            padding: "8px 14px",
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          <Megaphone size={15} /> Campanha
        </button>
        <button
          onClick={() => setMostrarForm((v) => !v)}
          className="flex items-center gap-2"
          style={{ background: mostrarForm ? "#EDEAE0" : INK, color: mostrarForm ? INK : "#FFF", padding: "8px 14px", borderRadius: 8, fontWeight: 600, fontSize: 13 }}
        >
          {mostrarForm ? <Plus size={15} style={{ transform: "rotate(45deg)" }} /> : <UserPlus size={15} />}
          {mostrarForm ? "Cancelar" : "Cadastrar cliente"}
        </button>
      </div>

      {mostrarCampanha && (
        <Card style={{ padding: 20 }} className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Megaphone size={15} color={BRASS} />
            <div className="fx-serif" style={{ fontSize: 15, fontWeight: 600 }}>
              Mensagem da campanha
            </div>
          </div>
          <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 10 }}>
            Filtre a lista abaixo (por compras mínimas, ano da última compra ou busca) pra achar quem quer reativar,
            escreva a mensagem aqui (use <strong>{"{nome}"}</strong> onde quiser o nome do cliente) e um botão de WhatsApp
            aparece em cada card filtrado — você manda um por um, sem custo nenhum.
          </div>
          <textarea
            style={{ ...inputStyle, minHeight: 70 }}
            value={mensagemCampanha}
            onChange={(e) => setMensagemCampanha(e.target.value)}
          />
        </Card>
      )}

      {mostrarForm && (
        <Card style={{ padding: 20 }} className="mb-6">
          <form onSubmit={cadastrar}>
            <Field label="Nome do cliente">
              <input style={inputStyle} value={novoNome} onChange={(e) => setNovoNome(e.target.value)} placeholder="Nome completo" required />
            </Field>
            <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${LINE}` }}>
              <CampoDadosPessoais value={novosDados} onChange={setNovosDados} />
            </div>
            {erro && (
              <div className="mt-3 px-4 py-2 rounded" style={{ background: "#F6E3D9", color: "#9C4A1E", fontSize: 13 }}>
                {erro}
              </div>
            )}
            <button
              type="submit"
              disabled={salvando}
              className="mt-4"
              style={{ background: INK, color: "#FFF", padding: "9px 18px", borderRadius: 8, fontWeight: 600, fontSize: 13, opacity: salvando ? 0.7 : 1 }}
            >
              {salvando ? "Cadastrando…" : "Cadastrar cliente"}
            </button>
          </form>
        </Card>
      )}

      {visualizacao === "tabela" && (
        <TabelaClientes
          clientes={listados}
          ordenarPor={ordenarPor}
          ordemDesc={ordemDesc}
          onOrdenar={ordenarPorColuna}
          onAlternarContatado={alternarContatado}
          onAbrir={(nome) => {
            setBusca(nome);
            setVisualizacao("cards");
          }}
        />
      )}

      {visualizacao === "cards" && (
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
        {listados.map((c) => {
          const pecas = c.pecas || [];
          const totalCamisas = c.pedidos.reduce((s, p) => s + (parseFloat(p.quantidade) || 0), 0);
          const todosItens = c.todosItens;
          const maisRecente = c.maisRecente;
          const mesesSemComprar = c.mesesSemComprar;
          const sumido = c.sumido;

          const devidoFabiana = c.pedidos
            .filter((p) => parseFloat(p.pagoFabiana.valor) > 0)
            .reduce((s, p) => {
              const pago = valorRecebidoEfetivo({
                pagamentoDividido: p.pagamentoFabianaDividido,
                valorEntrada: p.valorEntradaFabiana,
                statusEntrada: p.statusEntradaFabiana,
                valorRestante: p.valorRestanteFabiana,
                statusRestante: p.statusRestanteFabiana,
                valorTotal: p.pagoFabiana.valor,
                statusTotal: p.pagoFabiana.statusPagamento,
                labelPago: "Pago",
              });
              return s + (parseFloat(p.pagoFabiana.valor) - pago);
            }, 0);
          const devidoIcaro = pecas
            .filter((p) => (parseFloat(p.valorTotal) || 0) - (parseFloat(p.pago) || 0) > 0)
            .reduce((s, p) => s + ((parseFloat(p.valorTotal) || 0) - (parseFloat(p.pago) || 0)), 0);

          const aberto = expandido === c.nome;
          const ultimasMedidas =
            maisRecente?.tipo === "camisa"
              ? medidasCamisaTexto(maisRecente.item.medidas)
              : maisRecente?.tipo === "peca"
              ? medidasPecaTexto(maisRecente.item.tipoPeca, maisRecente.item.medidas)
              : [];

          return (
            <Card key={c.nome} style={{ padding: 18 }}>
              <div className="flex items-center justify-between mb-1">
                <div style={{ fontWeight: 600, fontSize: 15 }}>{c.nome}</div>
                <div className="flex items-center gap-1.5">
                  {sumido && <Pill text={`sumido há ${mesesSemComprar}m`} style={{ bg: "#F6E3D9", fg: VERMELHO }} />}
                  {c.recompra && <Pill text="↻ recompra" style={{ bg: BRASS_SOFT, fg: BRASS }} />}
                </div>
              </div>
              <div className="flex items-center gap-3 mb-2 flex-wrap" style={{ fontSize: 12, color: TEXT_MUTED }}>
                {c.pedidos.length > 0 && <span className="fx-mono">{totalCamisas} camisa(s)</span>}
                {pecas.length > 0 && <span className="fx-mono">{pecas.length} peça(s) de alfaiataria</span>}
                {c.totalHistorico > 0 && (
                  <span className="fx-mono" title="Vendas da planilha antiga, antes do app">
                    +{c.totalHistorico} da planilha antiga
                  </span>
                )}
              </div>
              {maisRecente && (
                <div className="flex items-center gap-2 mb-2">
                  <span style={{ fontSize: 11, color: TEXT_MUTED }}>Último pedido ({fmtData(maisRecente.data)}):</span>
                  <Pill text={maisRecente.item.status} style={STATUS_STYLE[maisRecente.item.status]} />
                </div>
              )}
              {devidoFabiana > 0 && (
                <div className="mb-1" style={{ fontSize: 12, color: "#9C4A1E" }}>
                  Devendo à Fabiana: <strong>{brl(devidoFabiana)}</strong>
                </div>
              )}
              {devidoIcaro > 0 && (
                <div className="mb-2" style={{ fontSize: 12, color: "#9C4A1E" }}>
                  Devendo ao Icaro: <strong>{brl(devidoIcaro)}</strong>
                </div>
              )}

              {mostrarCampanha && (
                <div className="mb-2 flex items-center gap-3 flex-wrap">
                  <AvisarClienteWhatsapp
                    clienteId={c.id}
                    nomeCliente={c.nome}
                    mensagem={mensagemCampanha.replace(/\{nome\}/g, c.nome.trim().split(" ")[0])}
                  />
                  <label className="flex items-center gap-1.5" style={{ fontSize: 12, color: c.contatado ? "#2C6E31" : TEXT_MUTED, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={c.contatado}
                      onChange={() => alternarContatado(c)}
                      style={{ width: 14, height: 14, accentColor: "#2C6E31" }}
                    />
                    {c.contatado ? `Já contatei (${fmtData(c.contatadoEm.slice(0, 10))})` : "Já mandei mensagem"}
                  </label>
                </div>
              )}

              <button
                onClick={() => setExpandido(aberto ? null : c.nome)}
                className="w-full flex items-center justify-between py-1.5"
                style={{ borderTop: `1px solid ${LINE}`, marginTop: 4 }}
              >
                <span style={{ fontSize: 12, color: BRASS, fontWeight: 600 }}>{aberto ? "Ocultar histórico" : "Ver histórico completo"}</span>
                {aberto ? <ChevronUp size={14} color={BRASS} /> : <ChevronDown size={14} color={BRASS} />}
              </button>

              {aberto && (
                <div className="pt-1">
                  {todosItens.map(({ tipo, item }) => (
                    <button
                      key={tipo + "-" + item.id}
                      onClick={() => (tipo === "camisa" ? irParaPedido(item.id) : irParaPeca(item.id))}
                      className="w-full flex items-center justify-between py-1.5"
                      style={{ borderTop: `1px solid ${LINE}` }}
                    >
                      <span style={{ fontSize: 12 }}>
                        {fmtData(item.dataPedido)} · {tipo === "camisa" ? "Camisa" : item.tipoPeca}
                      </span>
                      <Pill text={item.status} style={STATUS_STYLE[item.status]} />
                    </button>
                  ))}

                  {c.historico.length > 0 && (
                    <div className="mt-2 pt-2" style={{ borderTop: `1px solid ${LINE}` }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: TEXT_MUTED, marginBottom: 4 }}>
                        Planilha antiga (antes do app):
                      </div>
                      {c.historico
                        .slice()
                        .sort((a, b) => b.ano - a.ano)
                        .map((h, i) => (
                          <div key={i} className="flex items-center justify-between py-1" style={{ fontSize: 12 }}>
                            <span>
                              {h.ano} · {h.quantidade} peça(s)
                            </span>
                            {h.recompra && (
                              <span style={{ color: "#A9793E", fontSize: 11 }} title="Recompra">
                                ↻ recompra
                              </span>
                            )}
                          </div>
                        ))}
                    </div>
                  )}

                  {ultimasMedidas.length > 0 && (
                    <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${LINE}` }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: TEXT_MUTED, marginBottom: 6 }}>
                        Últimas medidas salvas ({fmtData(maisRecente.data)}) — reaproveite numa recompra:
                      </div>
                      <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))" }}>
                        {ultimasMedidas.map(([label, valor]) => (
                          <div key={label} className="fx-mono" style={{ fontSize: 11, color: TEXT_MUTED }}>
                            {maisRecente.tipo === "camisa" ? rotuloMedida(label) : label}: <strong style={{ color: "#16212E" }}>{valor}</strong>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${LINE}` }}>
                    <DadosPessoaisCliente clienteId={c.id} />
                  </div>
                </div>
              )}
            </Card>
          );
        })}
        {listados.length === 0 && <Empty texto="Nenhum cliente ainda — cadastre um pedido novo." />}
      </div>
      )}
    </div>
  );
}

function EstatCard({ label, valor, destaque }) {
  return (
    <Card style={{ padding: "12px 14px" }}>
      <div style={{ fontSize: 10, color: TEXT_MUTED, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 3 }}>{label}</div>
      <div className="fx-mono" style={{ fontSize: 20, fontWeight: 700, color: destaque ? VERMELHO : INK }}>
        {valor}
      </div>
    </Card>
  );
}

const COLUNAS_TABELA = [
  { chave: "nome", label: "Cliente" },
  { chave: "totalComprado", label: "Total" },
  { chave: "anoUltimaCompra", label: "Última compra" },
  { chave: "mesesSemComprar", label: "Inativo há" },
];

function TabelaClientes({ clientes, ordenarPor, ordemDesc, onOrdenar, onAlternarContatado, onAbrir }) {
  return (
    <Card className="mb-6" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${LINE}`, background: "#F7F4EC" }}>
              {COLUNAS_TABELA.map((col) => (
                <th
                  key={col.chave}
                  onClick={() => onOrdenar(col.chave)}
                  style={{
                    textAlign: col.chave === "nome" ? "left" : "right",
                    padding: "10px 16px",
                    fontWeight: 600,
                    fontSize: 11,
                    color: TEXT_MUTED,
                    textTransform: "uppercase",
                    letterSpacing: 0.3,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  <span className="inline-flex items-center gap-1" style={{ justifyContent: col.chave === "nome" ? "flex-start" : "flex-end" }}>
                    {col.label}
                    {ordenarPor === col.chave && (ordemDesc ? <ArrowDown size={11} /> : <ArrowUp size={11} />)}
                  </span>
                </th>
              ))}
              <th style={{ textAlign: "right", padding: "10px 16px", fontWeight: 600, fontSize: 11, color: TEXT_MUTED, textTransform: "uppercase" }}>
                Camisas
              </th>
              <th style={{ textAlign: "right", padding: "10px 16px", fontWeight: 600, fontSize: 11, color: TEXT_MUTED, textTransform: "uppercase" }}>
                Alfaiataria
              </th>
              <th style={{ textAlign: "right", padding: "10px 16px", fontWeight: 600, fontSize: 11, color: TEXT_MUTED, textTransform: "uppercase" }}>
                Planilha antiga
              </th>
              <th style={{ textAlign: "center", padding: "10px 16px", fontWeight: 600, fontSize: 11, color: TEXT_MUTED, textTransform: "uppercase" }}>
                Status
              </th>
              <th style={{ textAlign: "center", padding: "10px 16px", fontWeight: 600, fontSize: 11, color: TEXT_MUTED, textTransform: "uppercase" }}>
                Contatei
              </th>
            </tr>
          </thead>
          <tbody>
            {clientes.map((c, i) => {
              const totalCamisas = c.pedidos.reduce((s, p) => s + (parseFloat(p.quantidade) || 0), 0);
              return (
                <tr
                  key={c.nome}
                  onClick={() => onAbrir(c.nome)}
                  style={{ borderBottom: i < clientes.length - 1 ? `1px solid ${LINE}` : "none", cursor: "pointer" }}
                  className="fx-row-hover"
                >
                  <td style={{ padding: "9px 16px", fontWeight: 600 }}>{c.nome}</td>
                  <td className="fx-mono" style={{ padding: "9px 16px", textAlign: "right", fontWeight: 700 }}>
                    {c.totalComprado}
                  </td>
                  <td className="fx-mono" style={{ padding: "9px 16px", textAlign: "right", color: TEXT_MUTED }}>
                    {c.anoUltimaCompra || "—"}
                  </td>
                  <td className="fx-mono" style={{ padding: "9px 16px", textAlign: "right", color: c.sumido ? VERMELHO : TEXT_MUTED, fontWeight: c.sumido ? 700 : 400 }}>
                    {c.mesesSemComprar === null ? "—" : `${c.mesesSemComprar}m`}
                  </td>
                  <td className="fx-mono" style={{ padding: "9px 16px", textAlign: "right", color: TEXT_MUTED }}>
                    {totalCamisas || "—"}
                  </td>
                  <td className="fx-mono" style={{ padding: "9px 16px", textAlign: "right", color: TEXT_MUTED }}>
                    {(c.pecas || []).length || "—"}
                  </td>
                  <td className="fx-mono" style={{ padding: "9px 16px", textAlign: "right", color: TEXT_MUTED }}>
                    {c.totalHistorico || "—"}
                  </td>
                  <td style={{ padding: "9px 16px" }}>
                    <div className="flex items-center justify-center gap-1">
                      {c.sumido && <Pill text={`sumido ${c.mesesSemComprar}m`} style={{ bg: "#F6E3D9", fg: VERMELHO }} />}
                      {c.recompra && <Pill text="↻" style={{ bg: BRASS_SOFT, fg: BRASS }} />}
                    </div>
                  </td>
                  <td style={{ padding: "9px 16px", textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={c.contatado}
                      onChange={() => onAlternarContatado(c)}
                      title={c.contatado ? `Contatado em ${fmtData(c.contatadoEm.slice(0, 10))}` : "Marcar como já contatado"}
                      style={{ width: 15, height: 15, accentColor: "#2C6E31", cursor: "pointer" }}
                    />
                  </td>
                </tr>
              );
            })}
            {clientes.length === 0 && (
              <tr>
                <td colSpan={9} style={{ padding: 24 }}>
                  <Empty texto="Nenhum cliente encontrado." />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
