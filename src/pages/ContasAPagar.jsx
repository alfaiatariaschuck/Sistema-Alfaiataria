import React, { useEffect, useState } from "react";
import { CalendarClock, CheckCircle2, ChevronLeft, ChevronRight, HelpCircle, Pencil, PiggyBank, Plus, Trash2, TrendingDown, TrendingUp, Undo2, Wallet, X } from "lucide-react";
import { Card, Empty, Field, PageTitle, Pill, StatCard } from "../components/ui";
import { BRASS, CATEGORIAS_DESPESA, FORNECEDORES_TECIDO, INK, LINE, LINHA_STYLE, TEXT_MUTED, inputStyle } from "../lib/constants";
import { brl, fmtData, hojeISO, metragemParaNumero, somarDias, valorRecebidoEfetivo } from "../lib/helpers";
import { supabase } from "../supabaseClient";

const VERMELHO = "#9C4A1E";
const VERDE = "#2C6E31";
const CHAVE_CAIXA = "caixa_atual";
const MESES_HISTORICO_FRETE = 6;

// Total de uma despesa = valor do produto/serviço + frete (quando tiver).
function totalDespesa(d) {
  return (parseFloat(d.valor) || 0) + (parseFloat(d.frete) || 0);
}

// Até quando os presets de período (7/14/30 dias) podem enxergar — não
// mostra conta do mês que vem antes da hora. Só relaxa esse teto quando
// já está na última semana do mês atual (aí olhar pro mês seguinte é
// natural, faz parte do planejamento da semana). "Ver tudo" e o De/Até
// manual continuam livres, sem esse teto.
function limiteMesAtual(hojeISOStr) {
  const d = new Date(hojeISOStr + "T00:00:00");
  const ultimoDiaMes = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const estaNaUltimaSemana = d.getDate() > ultimoDiaMes - 7;
  if (estaNaUltimaSemana) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(ultimoDiaMes).padStart(2, "0")}`;
}

function novaDespesaVazia() {
  return {
    descricao: "",
    categoria: "",
    fornecedor: "",
    valor: "",
    frete: "",
    vencimento: hojeISO(),
    recorrente: false,
    linha: "",
    parcelas: "1",
    dividirLinha: false,
    valorCamisaria: "",
    valorAlfaiataria: "",
  };
}

// Painel de edição de uma despesa — usado tanto na lista de pendentes
// quanto na lista de "últimas pagas" (uma despesa paga por engano, ou
// com valor/data errado, também precisa poder ser editada, não só
// reaberta). Extraído pra não duplicar esse formulário grande nos dois
// lugares.
function EditorDespesa({ edicaoDespesa, setEdicaoDespesa, valorPagoEdit, setValorPagoEdit, dataPagamentoEdit, setDataPagamentoEdit, onSalvar }) {
  return (
    <div className="mt-2 p-3" style={{ background: "#F3EEDF", borderRadius: 8 }}>
      <div className="grid gap-2 mb-2" style={{ gridTemplateColumns: "2fr 1fr 1fr" }}>
        <Field label="Descrição">
          <input
            style={{ ...inputStyle, padding: "6px 8px", fontSize: 12 }}
            value={edicaoDespesa.descricao}
            onChange={(e) => setEdicaoDespesa({ ...edicaoDespesa, descricao: e.target.value })}
          />
        </Field>
        <Field label="Valor (R$)">
          <input
            type="number"
            step="0.01"
            style={{ ...inputStyle, padding: "6px 8px", fontSize: 12 }}
            value={edicaoDespesa.valor}
            onChange={(e) => setEdicaoDespesa({ ...edicaoDespesa, valor: e.target.value })}
          />
        </Field>
        <Field label="Frete (R$)">
          <input
            type="number"
            step="0.01"
            style={{ ...inputStyle, padding: "6px 8px", fontSize: 12 }}
            value={edicaoDespesa.frete}
            onChange={(e) => setEdicaoDespesa({ ...edicaoDespesa, frete: e.target.value })}
          />
        </Field>
        <Field label="Vencimento">
          <input
            type="date"
            style={{ ...inputStyle, padding: "6px 8px", fontSize: 12 }}
            value={edicaoDespesa.vencimento}
            onChange={(e) => setEdicaoDespesa({ ...edicaoDespesa, vencimento: e.target.value })}
          />
        </Field>
        <Field label="Categoria">
          <input
            style={{ ...inputStyle, padding: "6px 8px", fontSize: 12 }}
            list="lista-categorias-despesa"
            value={edicaoDespesa.categoria}
            onChange={(e) => setEdicaoDespesa({ ...edicaoDespesa, categoria: e.target.value })}
          />
        </Field>
        <Field label="Fornecedor">
          <input
            style={{ ...inputStyle, padding: "6px 8px", fontSize: 12 }}
            list="lista-fornecedores-despesa"
            value={edicaoDespesa.fornecedor}
            onChange={(e) => setEdicaoDespesa({ ...edicaoDespesa, fornecedor: e.target.value })}
          />
        </Field>
        <Field label="Linha">
          <select
            style={{ ...inputStyle, padding: "6px 8px", fontSize: 12 }}
            value={edicaoDespesa.linha}
            onChange={(e) => setEdicaoDespesa({ ...edicaoDespesa, linha: e.target.value })}
          >
            <option value="">Compartilhado</option>
            <option value="Camisaria">Camisaria</option>
            <option value="Alfaiataria">Alfaiataria</option>
          </select>
        </Field>
        <Field label="Tecido Camisaria (R$)">
          <input
            type="number"
            step="0.01"
            style={{ ...inputStyle, padding: "6px 8px", fontSize: 12 }}
            value={edicaoDespesa.valorCamisaria}
            onChange={(e) => setEdicaoDespesa({ ...edicaoDespesa, valorCamisaria: e.target.value })}
            placeholder="0,00"
          />
        </Field>
        <Field label="Tecido Alfaiataria (R$)">
          <input
            type="number"
            step="0.01"
            style={{ ...inputStyle, padding: "6px 8px", fontSize: 12 }}
            value={edicaoDespesa.valorAlfaiataria}
            onChange={(e) => setEdicaoDespesa({ ...edicaoDespesa, valorAlfaiataria: e.target.value })}
            placeholder="0,00"
          />
        </Field>
      </div>
      <div style={{ fontSize: 10, color: TEXT_MUTED, marginBottom: 8 }}>
        Preenchendo Camisaria/Alfaiataria acima, lembre de ajustar o "Valor" pra a soma das duas + o que for compartilhado (o campo Valor não
        se recalcula sozinho).
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span style={{ fontSize: 11, color: TEXT_MUTED }}>Valor pago até agora:</span>
        <input
          type="number"
          step="0.01"
          style={{ ...inputStyle, padding: "6px 8px", fontSize: 12, width: 100 }}
          value={valorPagoEdit}
          onChange={(e) => setValorPagoEdit(e.target.value)}
        />
        {(parseFloat(valorPagoEdit) || 0) > 0 && (
          <>
            <span style={{ fontSize: 11, color: TEXT_MUTED }}>Pago em:</span>
            <input
              type="date"
              style={{ ...inputStyle, padding: "6px 8px", fontSize: 12, width: 135 }}
              value={dataPagamentoEdit}
              onChange={(e) => setDataPagamentoEdit(e.target.value)}
              title="Data que o pagamento de fato aconteceu — importante ajustar em lançamento retroativo, pra cair no mês certo na conferência com o extrato"
            />
          </>
        )}
        <button onClick={onSalvar} style={{ background: INK, color: "#FFF", padding: "6px 14px", borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
          Salvar
        </button>
      </div>
    </div>
  );
}

// Dar baixa por quantidade de camisas em vez de digitar um valor em R$
// — mostra quantas camisas o valor DESSA despesa específica cobre (não
// necessariamente a quantidade total do pedido — ex: pedido de 3
// camisas onde só 1 foi pra prova até agora). Cada "camisa paga" vale
// valor total ÷ quantidade; o valor pago da despesa é recalculado a
// partir da contagem, então continua sendo a mesma informação de
// sempre (não duplica nada, só dá outro jeito de editar).
function quantidadeCamisasDe(despesa, pedido) {
  return parseInt(despesa.quantidadeCamisas, 10) || parseInt(pedido?.quantidade, 10) || 1;
}

function ControleBaixaPorCamisa({ despesa, pedido, onAtualizarValorPago }) {
  const totalCamisas = quantidadeCamisasDe(despesa, pedido);
  const valorPorCamisa = totalCamisas > 0 ? totalDespesa(despesa) / totalCamisas : 0;
  const camisasPagas = valorPorCamisa > 0 ? Math.round((parseFloat(despesa.valorPago) || 0) / valorPorCamisa) : 0;

  function definir(n) {
    const seguro = Math.max(0, Math.min(totalCamisas, n));
    onAtualizarValorPago(despesa.id, seguro * valorPorCamisa);
  }

  return (
    <div className="flex items-center gap-2 mt-1" style={{ fontSize: 11, color: TEXT_MUTED }}>
      <span>Camisas pagas:</span>
      <button
        onClick={() => definir(camisasPagas - 1)}
        disabled={camisasPagas <= 0}
        style={{ background: "#EDEAE0", color: INK, width: 20, height: 20, borderRadius: 4, fontWeight: 700, opacity: camisasPagas <= 0 ? 0.4 : 1 }}
      >
        −
      </button>
      <span className="fx-mono" style={{ fontWeight: 700, color: INK }}>
        {camisasPagas} de {totalCamisas}
      </span>
      <button
        onClick={() => definir(camisasPagas + 1)}
        disabled={camisasPagas >= totalCamisas}
        style={{ background: "#EDEAE0", color: INK, width: 20, height: 20, borderRadius: 4, fontWeight: 700, opacity: camisasPagas >= totalCamisas ? 0.4 : 1 }}
      >
        +
      </button>
      <span>· {brl(valorPorCamisa)}/camisa</span>
    </div>
  );
}

// Conta única da Fabi — junta todas as despesas de mão de obra lançadas
// automaticamente (uma por pedido que entrou em produção) numa única
// visão: total de camisas e valor pendente, sem listar cliente por
// cliente. "Dar baixa" aqui reparte o pagamento pelas despesas mais
// antigas primeiro — quem entrou em produção primeiro é pago primeiro —
// e cada despesa individual continua acessível em "ver detalhes" pra
// quando precisar editar ou conferir um pedido específico.
function ContaFabiAgrupada({ despesas, pedidos, onAtualizarValorPago, onAtualizarVencimentoDespesa, renderLinha }) {
  const [aberto, setAberto] = useState(false);
  const ordenadas = [...despesas].sort((a, b) => (a.vencimento || "").localeCompare(b.vencimento || ""));
  // Vencimento único pra conta inteira — em vez de mudar pedido por
  // pedido, mudar aqui empurra o vencimento de todas as despesas do
  // grupo pra mesma data nova de uma vez.
  const vencimentoGeral = ordenadas[0]?.vencimento || "";
  function mudarVencimentoGeral(novaData) {
    if (!novaData) return;
    despesas.forEach((d) => {
      if (d.vencimento !== novaData) onAtualizarVencimentoDespesa(d.id, novaData);
    });
  }
  const infos = ordenadas.map((d) => {
    const pedido = pedidos.find((p) => p.id === d.pedidoId);
    const qtd = quantidadeCamisasDe(d, pedido);
    const unit = qtd > 0 ? totalDespesa(d) / qtd : 0;
    const pagas = unit > 0 ? Math.round((parseFloat(d.valorPago) || 0) / unit) : 0;
    return { despesa: d, qtd, unit, pagas };
  });
  const totalCamisas = infos.reduce((s, i) => s + i.qtd, 0);
  const totalPagas = infos.reduce((s, i) => s + i.pagas, 0);
  const totalPendente = infos.reduce((s, i) => s + Math.max(0, totalDespesa(i.despesa) - (parseFloat(i.despesa.valorPago) || 0)), 0);
  const atrasada = ordenadas.some((d) => d.vencimento < hojeISO());

  function definir(n) {
    let restante = Math.max(0, Math.min(totalCamisas, n));
    infos.forEach((info) => {
      const pagasAqui = Math.min(info.qtd, restante);
      restante -= pagasAqui;
      const novoValorPago = pagasAqui * info.unit;
      if (Math.abs(novoValorPago - (parseFloat(info.despesa.valorPago) || 0)) > 0.005) {
        onAtualizarValorPago(info.despesa.id, novoValorPago);
      }
    });
  }

  return (
    <div className="mb-3 p-3" style={{ background: "#F3EEDF", borderRadius: 8 }}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>Fabi — mão de obra</div>
          <div style={{ fontSize: 11, color: atrasada ? VERMELHO : TEXT_MUTED }}>
            {despesas.length} pedido{despesas.length > 1 ? "s" : ""} em aberto{atrasada ? " · tem vencimento atrasado" : ""}
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <span style={{ fontSize: 11, color: TEXT_MUTED }}>Vencimento (todos):</span>
            <input
              type="date"
              value={vencimentoGeral}
              onChange={(e) => mudarVencimentoGeral(e.target.value)}
              style={{ ...inputStyle, padding: "4px 8px", fontSize: 12, width: 135 }}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => definir(totalPagas - 1)}
            disabled={totalPagas <= 0}
            style={{ background: "#EDEAE0", color: INK, width: 24, height: 24, borderRadius: 4, fontWeight: 700, opacity: totalPagas <= 0 ? 0.4 : 1 }}
          >
            −
          </button>
          <span className="fx-mono" style={{ fontWeight: 700, color: INK, fontSize: 13 }}>
            {totalPagas} de {totalCamisas} camisas
          </span>
          <button
            onClick={() => definir(totalPagas + 1)}
            disabled={totalPagas >= totalCamisas}
            style={{ background: "#EDEAE0", color: INK, width: 24, height: 24, borderRadius: 4, fontWeight: 700, opacity: totalPagas >= totalCamisas ? 0.4 : 1 }}
          >
            +
          </button>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="fx-mono" style={{ fontSize: 16, fontWeight: 700 }}>
            {brl(totalPendente)}
          </div>
          <div style={{ fontSize: 10, color: TEXT_MUTED }}>pendente</div>
        </div>
        <button type="button" onClick={() => setAberto((v) => !v)} style={{ fontSize: 11, color: BRASS, fontWeight: 600 }}>
          {aberto ? "ocultar detalhes ▲" : "ver detalhes ▼"}
        </button>
      </div>
      {aberto && (
        <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${LINE}` }}>
          {ordenadas.map((d) => renderLinha(d))}
        </div>
      )}
    </div>
  );
}

export default function ContasAPagar({
  pedidos,
  pecas,
  despesas,
  previsoes,
  notas,
  onCriarDespesa,
  onMarcarPaga,
  onAtualizarValorPago,
  onAtualizarDespesa,
  onAtualizarVencimentoDespesa,
  onRemoverDespesa,
  onCriarPrevisao,
  onAtualizarPrevisao,
  onRemoverPrevisao,
  onCriarNota,
  onRemoverNota,
  irParaPedido,
  irParaPeca,
}) {
  const [dataIniJanela, setDataIniJanela] = useState(hojeISO());
  const [dataFimJanela, setDataFimJanela] = useState(() => {
    const limite = limiteMesAtual(hojeISO());
    const candidata = somarDias(hojeISO(), 14);
    return limite && candidata > limite ? limite : candidata;
  });
  const [formDespesa, setFormDespesa] = useState(false);
  const [nova, setNova] = useState(novaDespesaVazia());
  // Vencimento de cada parcela, editável uma a uma — parcelado nem sempre
  // é mês a mês certinho (às vezes é 30/45, não 30/60/90), então só serve
  // de sugestão inicial (+30 dias da parcela anterior).
  const [vencimentosParcelas, setVencimentosParcelas] = useState([]);
  const [formPrevisao, setFormPrevisao] = useState(false);
  const [novaPrevisao, setNovaPrevisao] = useState({ descricao: "", valor: "", dataEsperada: hojeISO() });
  const [editandoPrevisao, setEditandoPrevisao] = useState(null);
  const [edicaoPrevisao, setEdicaoPrevisao] = useState({ descricao: "", valor: "", dataEsperada: "" });
  const [formNota, setFormNota] = useState(false);
  const [novaNota, setNovaNota] = useState({ descricao: "", valor: "", dataEsperada: "" });
  const [editandoDespesa, setEditandoDespesa] = useState(null);
  const [valorPagoEdit, setValorPagoEdit] = useState("");
  const [dataPagamentoEdit, setDataPagamentoEdit] = useState(hojeISO());
  const [edicaoDespesa, setEdicaoDespesa] = useState({
    descricao: "",
    categoria: "",
    fornecedor: "",
    valor: "",
    frete: "",
    vencimento: "",
    linha: "",
    valorCamisaria: "",
    valorAlfaiataria: "",
  });
  const [erro, setErro] = useState(null);
  const [caixaAtual, setCaixaAtual] = useState("");
  const [caixaSalvo, setCaixaSalvo] = useState(null);
  const hojeInicial = new Date(hojeISO() + "T00:00:00");
  const [mesCalendario, setMesCalendario] = useState(hojeInicial.getMonth());
  const [anoCalendario, setAnoCalendario] = useState(hojeInicial.getFullYear());
  const [mostrarGuia, setMostrarGuia] = useState(true);
  const [desfazerRecente, setDesfazerRecente] = useState(null);
  const [mostrarPagas, setMostrarPagas] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("config").select("valor").eq("chave", CHAVE_CAIXA).maybeSingle();
      if (data?.valor) setCaixaAtual(data.valor);
    })();
  }, []);

  async function salvarCaixa() {
    setCaixaSalvo(null);
    const { error } = await supabase.from("config").upsert({ chave: CHAVE_CAIXA, valor: caixaAtual });
    setCaixaSalvo(!error);
    setTimeout(() => setCaixaSalvo(null), 2500);
  }

  const hoje = hojeISO();
  // Período livre — data vazia de um lado significa "sem limite" desse
  // lado, então limpar os dois campos vira "ver tudo".
  const dentroDaJanela = (dataISO) => {
    const data = dataISO || hoje;
    if (dataIniJanela && data < dataIniJanela) return false;
    if (dataFimJanela && data > dataFimJanela) return false;
    return true;
  };
  function definirPeriodo(dias) {
    const limite = limiteMesAtual(hoje);
    const candidata = somarDias(hoje, dias);
    setDataIniJanela(hoje);
    setDataFimJanela(limite && candidata > limite ? limite : candidata);
  }
  function limparPeriodo() {
    setDataIniJanela("");
    setDataFimJanela("");
  }
  const verTudo = !dataIniJanela && !dataFimJanela;

  function recebidoEfetivo(p, valorTotal, statusTotal) {
    return valorRecebidoEfetivo({
      pagamentoDividido: p.pagamentoDividido,
      valorEntrada: p.valorEntrada,
      statusEntrada: p.statusEntrada,
      valorRestante: p.valorRestante,
      statusRestante: p.statusRestante,
      valorTotal,
      statusTotal,
    });
  }

  // Só entra na conta (e no filtro de período) quem tem previsão de entrega
  // real — sem isso não dá pra saber quando o dinheiro entra, então fica só
  // listado à parte, visível, mas fora do total (pra não distorcer o "falta
  // faturar" com algo sem data pra acontecer).
  const receberPendente = [
    ...pedidos
      .filter((p) => parseFloat(p.aReceber.valor) > 0)
      .map((p) => {
        const valor = parseFloat(p.aReceber.valor) || 0;
        const recebido = recebidoEfetivo(p, valor, p.aReceber.statusPagamento);
        return {
          id: p.id,
          tipo: "camisa",
          nome: p.cliente,
          pendente: Math.max(0, valor - recebido),
          temPrevisao: !!p.previsaoEntrega,
          dataRef: p.previsaoEntrega || p.dataPedido,
        };
      })
      .filter((x) => x.pendente > 0),
    ...(pecas || [])
      .filter((p) => parseFloat(p.valorVenda) > 0)
      .map((p) => {
        const valor = parseFloat(p.valorVenda) || 0;
        const recebido = recebidoEfetivo(p, valor, p.statusPagamentoVenda || "Pendente");
        return {
          id: p.id,
          tipo: "peca",
          nome: p.cliente,
          pendente: Math.max(0, valor - recebido),
          temPrevisao: !!p.previsaoEntrega,
          dataRef: p.previsaoEntrega || p.dataPedido,
        };
      })
      .filter((x) => x.pendente > 0),
  ];
  const receberComPrevisao = receberPendente.filter((p) => p.temPrevisao);
  const receberSemPrevisao = receberPendente.filter((p) => !p.temPrevisao);

  const despesasPendentes = despesas.filter((d) => d.status !== "Pago");
  // Últimas pagas — pra reabrir quando alguém clica errado e só percebe
  // depois que o aviso de "desfazer" já sumiu da tela.
  const despesasPagas = despesas
    .filter((d) => d.status === "Pago")
    .sort((a, b) => (b.vencimento || "").localeCompare(a.vencimento || ""))
    .slice(0, 15);
  // Atrasada entra na projeção sempre, não importa o período escolhido —
  // senão some da tela assim que passa da data e vira fácil de esquecer
  // que ainda precisa pagar.
  const despesasJanela = despesasPendentes
    .filter((d) => d.vencimento < hoje || dentroDaJanela(d.vencimento))
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento));
  // Despesas geradas sozinhas a partir de um pedido (a mão de obra da
  // Fabiana) ficam agrupadas numa conta só — o dono não quer ver uma
  // linha por cliente, só "Fabi — N camisas a pagar" no total.
  const despesasFabiJanela = despesasJanela.filter((d) => d.pedidoId);
  const despesasJanelaSemFabi = despesasJanela.filter((d) => !d.pedidoId);
  const receberJanela = receberComPrevisao.filter((p) => dentroDaJanela(p.dataRef));
  const previsoesJanela = previsoes.filter((p) => dentroDaJanela(p.dataEsperada));

  const totalDespesas = despesasJanela.reduce((s, d) => s + Math.max(0, totalDespesa(d) - (parseFloat(d.valorPago) || 0)), 0);
  const totalReceita = receberJanela.reduce((s, p) => s + p.pendente, 0) + previsoesJanela.reduce((s, p) => s + (parseFloat(p.valor) || 0), 0);
  const caixaNum = parseFloat(caixaAtual) || 0;

  // Tecido ainda não comprado (pedidos + peças, ver aba Compras) — é
  // dinheiro que vai sair e não está na provisão de custo mensal (essa
  // é da produção recorrente, não de compra pontual), então entra aqui
  // direto no saldo projetado como se fosse mais uma despesa pendente.
  const tecidoPendenteItens = [];
  (pedidos || []).forEach((p) => (p.tecidos || []).forEach((t) => !t.comprado && tecidoPendenteItens.push(t)));
  (pecas || []).forEach((p) => (p.tecidos || []).forEach((t) => !t.comprado && tecidoPendenteItens.push(t)));
  const tecidoPendenteComPreco = tecidoPendenteItens.filter((t) => metragemParaNumero(t.metragem) !== null && parseFloat(t.valorMetro));
  const tecidoPendente = tecidoPendenteComPreco.reduce((s, t) => s + metragemParaNumero(t.metragem) * parseFloat(t.valorMetro), 0);
  const tecidoPendenteSemPreco = tecidoPendenteItens.length - tecidoPendenteComPreco.length;

  // Saldo projetado = o que já tenho em caixa + o que ainda vou receber - o
  // que ainda vou pagar (despesas + tecido pendente de compra). Falta
  // faturar = quanto de venda nova (fora do que já está previsto) eu
  // preciso pra cobrir tudo isso com o caixa que tenho.
  const saldo = caixaNum + totalReceita - totalDespesas - tecidoPendente;
  const faltaFaturar = Math.max(0, totalDespesas + tecidoPendente - caixaNum - totalReceita);

  // Quanto devo por fornecedor — despesas em aberto (não só a janela de 14
  // dias) + tecido pendente de compra com preço já cadastrado, pra dar a
  // visão real de quanto falta pra cada um.
  const porFornecedor = (() => {
    const mapa = new Map();
    despesasPendentes
      .filter((d) => d.fornecedor)
      .forEach((d) => {
        const pendente = Math.max(0, totalDespesa(d) - (parseFloat(d.valorPago) || 0));
        mapa.set(d.fornecedor, (mapa.get(d.fornecedor) || 0) + pendente);
      });
    tecidoPendenteComPreco
      .filter((t) => (t.fornecedor || "").trim())
      .forEach((t) => {
        const nome = t.fornecedor.trim();
        mapa.set(nome, (mapa.get(nome) || 0) + metragemParaNumero(t.metragem) * parseFloat(t.valorMetro));
      });
    return [...mapa.entries()].sort((a, b) => b[1] - a[1]);
  })();

  // Quanto das despesas em aberto é de cada linha — despesas com tecido
  // discriminado (valorCamisaria/valorAlfaiataria) ratam o pendente na
  // mesma proporção; as marcadas só com "Linha" vão inteiras pra ela; o
  // resto cai em "Compartilhado".
  const porLinha = (() => {
    const totais = { Camisaria: 0, Alfaiataria: 0, Compartilhado: 0 };
    despesasPendentes.forEach((d) => {
      const pendente = Math.max(0, totalDespesa(d) - (parseFloat(d.valorPago) || 0));
      const cam = parseFloat(d.valorCamisaria) || 0;
      const alf = parseFloat(d.valorAlfaiataria) || 0;
      if (cam > 0 || alf > 0) {
        const totalTecido = cam + alf;
        totais.Camisaria += pendente * (cam / totalTecido);
        totais.Alfaiataria += pendente * (alf / totalTecido);
      } else {
        const chave = d.linha === "Camisaria" || d.linha === "Alfaiataria" ? d.linha : "Compartilhado";
        totais[chave] += pendente;
      }
    });
    return totais;
  })();

  // Quantos dias uma despesa está atrasada (positivo) ou faltam pra vencer
  // (negativo) — base pro relatório de atrasadas e pro aviso de "vence em
  // breve".
  function diasAteVencimento(venc) {
    const d1 = new Date(venc + "T00:00:00");
    const d2 = new Date(hoje + "T00:00:00");
    return Math.round((d1 - d2) / 86400000);
  }

  // Relatório de atrasadas (aging) — só despesas em aberto com vencimento
  // no passado, agrupadas por faixa de dias atrasados.
  const FAIXAS_ATRASO = [
    { rotulo: "1–7 dias", min: 1, max: 7 },
    { rotulo: "8–15 dias", min: 8, max: 15 },
    { rotulo: "16–30 dias", min: 16, max: 30 },
    { rotulo: "31+ dias", min: 31, max: Infinity },
  ];
  const despesasAtrasadas = despesasPendentes.filter((d) => diasAteVencimento(d.vencimento) < 0);
  const agingAtrasadas = FAIXAS_ATRASO.map((faixa) => {
    const itens = despesasAtrasadas.filter((d) => {
      const dias = -diasAteVencimento(d.vencimento);
      return dias >= faixa.min && dias <= faixa.max;
    });
    return { ...faixa, itens, total: itens.reduce((s, d) => s + Math.max(0, totalDespesa(d) - (parseFloat(d.valorPago) || 0)), 0) };
  }).filter((f) => f.itens.length > 0);
  const totalAtrasado = agingAtrasadas.reduce((s, f) => s + f.total, 0);

  // Vencendo em breve (próximos 3 dias, ainda não atrasada) — o "lembrete"
  // possível num app sem infraestrutura de notificação: um aviso bem
  // visível assim que a pessoa abre a página.
  const venceEmBreve = despesasPendentes.filter((d) => {
    const dias = diasAteVencimento(d.vencimento);
    return dias >= 0 && dias <= 3;
  });
  const totalVenceEmBreve = venceEmBreve.reduce((s, d) => s + Math.max(0, totalDespesa(d) - (parseFloat(d.valorPago) || 0)), 0);

  // Calendário do mês — agrupa as despesas em aberto do mês selecionado
  // por dia de vencimento, pra dar pra ver de uma vez os dias com mais
  // conta batendo junto (em vez de só uma lista corrida).
  const calendarioPorDia = (() => {
    const mapa = {};
    despesasPendentes
      .filter((d) => {
        if (!d.vencimento) return false;
        const [ano, mes] = d.vencimento.split("-").map(Number);
        return ano === anoCalendario && mes === mesCalendario + 1;
      })
      .forEach((d) => {
        const pendente = Math.max(0, totalDespesa(d) - (parseFloat(d.valorPago) || 0));
        if (!mapa[d.vencimento]) mapa[d.vencimento] = { total: 0, itens: [] };
        mapa[d.vencimento].total += pendente;
        mapa[d.vencimento].itens.push(d);
      });
    return mapa;
  })();

  // Histórico de frete — soma o frete das despesas já PAGAS (só assim dá
  // pra saber que o gasto de fato aconteceu), agrupado pelo mês de
  // vencimento — não temos data de pagamento separada, então o
  // vencimento é a melhor aproximação de quando a conta foi quitada.
  const historicoFrete = (() => {
    const meses = [];
    const hojeD = new Date(hoje + "T00:00:00");
    for (let i = MESES_HISTORICO_FRETE - 1; i >= 0; i--) {
      const d = new Date(hojeD.getFullYear(), hojeD.getMonth() - i, 1);
      const chaveMes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).replace(".", "");
      meses.push({ chaveMes, label, total: 0 });
    }
    despesas
      .filter((d) => d.status === "Pago" && parseFloat(d.frete) > 0 && d.vencimento)
      .forEach((d) => {
        const chaveMes = d.vencimento.slice(0, 7);
        const mes = meses.find((m) => m.chaveMes === chaveMes);
        if (mes) mes.total += parseFloat(d.frete) || 0;
      });
    return meses;
  })();
  const totalFreteHistorico = historicoFrete.reduce((s, m) => s + m.total, 0);

  // Histórico de contas pagas — mesmo princípio do frete, mas com o total
  // de TODAS as despesas quitadas, mês a mês. É a base pra comparar um mês
  // com o outro e enxergar se o gasto está subindo ou não.
  const historicoDespesas = (() => {
    const meses = [];
    const hojeD = new Date(hoje + "T00:00:00");
    for (let i = MESES_HISTORICO_FRETE - 1; i >= 0; i--) {
      const d = new Date(hojeD.getFullYear(), hojeD.getMonth() - i, 1);
      const chaveMes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).replace(".", "");
      meses.push({ chaveMes, label, total: 0 });
    }
    despesas
      .filter((d) => d.status === "Pago" && d.vencimento)
      .forEach((d) => {
        const chaveMes = d.vencimento.slice(0, 7);
        const mes = meses.find((m) => m.chaveMes === chaveMes);
        if (mes) mes.total += totalDespesa(d);
      });
    return meses;
  })();
  const mesesComHistorico = historicoDespesas.filter((m) => m.total > 0);
  const mediaHistoricoDespesas = mesesComHistorico.length > 0 ? mesesComHistorico.reduce((s, m) => s + m.total, 0) / mesesComHistorico.length : 0;

  // Por categoria, somando os últimos MESES_HISTORICO_FRETE meses de uma
  // vez — pra ver de cara onde o dinheiro está indo e o que dá pra cortar,
  // sem precisar escolher mês por mês.
  const porCategoriaHistorico = (() => {
    const chaveMesLimite = historicoDespesas[0]?.chaveMes;
    const mapa = new Map();
    despesas
      .filter((d) => d.status === "Pago" && d.vencimento && chaveMesLimite && d.vencimento.slice(0, 7) >= chaveMesLimite)
      .forEach((d) => {
        const chave = d.categoria || "Sem categoria";
        mapa.set(chave, (mapa.get(chave) || 0) + totalDespesa(d));
      });
    return [...mapa.entries()].sort((a, b) => b[1] - a[1]);
  })();

  // Divide um valor em N parcelas sem perder centavo no arredondamento —
  // sobra de centavo (se houver) fica nas primeiras parcelas.
  function dividirEmCentavos(valor, n) {
    const totalCentavos = Math.round((parseFloat(valor) || 0) * 100);
    const base = Math.floor(totalCentavos / n);
    const resto = totalCentavos - base * n;
    return Array.from({ length: n }, (_, i) => (base + (i < resto ? 1 : 0)) / 100);
  }

  // Ajusta a quantidade de parcelas: mantém as datas já editadas e só
  // preenche as novas com uma sugestão (+30 dias da parcela anterior) —
  // parcelado nem sempre é mês certo, às vezes é 30/45, não 30/60/90.
  function handleParcelasChange(valorStr) {
    const n = Math.max(1, parseInt(valorStr, 10) || 1);
    setVencimentosParcelas((prev) => {
      const arr = prev.slice(0, n);
      while (arr.length < n) {
        const anterior = arr[arr.length - 1] || nova.vencimento || hojeISO();
        arr.push(somarDias(anterior, 30));
      }
      return arr;
    });
    setNova((p) => ({ ...p, parcelas: String(n), recorrente: n > 1 ? false : p.recorrente }));
  }

  // Monta a lista de despesas a criar a partir do formulário — sempre UMA
  // despesa por parcela (nunca duas), mesmo quando o valor é dividido
  // entre Camisaria e Alfaiataria: nesse caso o tecido de cada linha e o
  // frete ficam discriminados dentro da mesma despesa, e valor = soma dos
  // dois — é uma dívida só com o fornecedor, só com a origem do tecido
  // anotada dentro dela.
  function montarDespesasParaCriar() {
    const n = Math.max(1, parseInt(nova.parcelas, 10) || 1);
    const valorCam = nova.dividirLinha ? parseFloat(nova.valorCamisaria) || 0 : 0;
    const valorAlf = nova.dividirLinha ? parseFloat(nova.valorAlfaiataria) || 0 : 0;
    const totalValor = nova.dividirLinha ? valorCam + valorAlf : parseFloat(nova.valor) || 0;
    const totalFrete = parseFloat(nova.frete) || 0;

    const parcelasValor = dividirEmCentavos(totalValor, n);
    const parcelasFrete = dividirEmCentavos(totalFrete, n);
    const parcelasCam = nova.dividirLinha ? dividirEmCentavos(valorCam, n) : null;
    const parcelasAlf = nova.dividirLinha ? dividirEmCentavos(valorAlf, n) : null;

    const despesas = [];
    for (let i = 0; i < n; i++) {
      const sufixoParcela = n > 1 ? ` (${i + 1}/${n})` : "";
      despesas.push({
        ...nova,
        descricao: `${nova.descricao}${sufixoParcela}`,
        valor: parcelasValor[i],
        frete: parcelasFrete[i],
        vencimento: n > 1 ? vencimentosParcelas[i] || nova.vencimento : nova.vencimento,
        linha: nova.dividirLinha ? "" : nova.linha,
        valorCamisaria: nova.dividirLinha ? parcelasCam[i] : "",
        valorAlfaiataria: nova.dividirLinha ? parcelasAlf[i] : "",
        recorrente: n > 1 ? false : nova.recorrente,
      });
    }
    return despesas;
  }

  async function salvarDespesa(e) {
    e.preventDefault();
    if (!nova.descricao.trim()) return;
    if (!nova.dividirLinha && !nova.valor) return;
    if (nova.dividirLinha && (parseFloat(nova.valorCamisaria) || 0) + (parseFloat(nova.valorAlfaiataria) || 0) <= 0) {
      setErro("Preencha o valor da Camisaria e/ou da Alfaiataria.");
      return;
    }
    setErro(null);
    try {
      for (const d of montarDespesasParaCriar()) {
        await onCriarDespesa(d);
      }
      setNova(novaDespesaVazia());
      setVencimentosParcelas([]);
      setFormDespesa(false);
    } catch (e) {
      setErro("Não consegui salvar (" + e.message + ").");
    }
  }

  // Salva de uma vez o valor pago e, se mudou algo, os dados da despesa
  // (útil pra corrigir um valor lançado como estimativa quando a nota
  // fiscal/valor exato chega).
  async function salvarEdicaoDespesa(id) {
    setErro(null);
    try {
      await onAtualizarDespesa(id, edicaoDespesa);
      await onAtualizarValorPago(id, valorPagoEdit, dataPagamentoEdit);
      setEditandoDespesa(null);
    } catch (e) {
      setErro("Não consegui salvar (" + e.message + ").");
    }
  }

  // Marca como paga e deixa um "desfazer" na tela por alguns segundos —
  // pro clique errado não virar um problema difícil de achar depois.
  async function handleMarcarPaga(d) {
    setErro(null);
    try {
      await onMarcarPaga(d.id);
      setDesfazerRecente({ id: d.id, descricao: d.descricao });
      setTimeout(() => setDesfazerRecente((atual) => (atual?.id === d.id ? null : atual)), 8000);
    } catch (e) {
      setErro("Não consegui marcar como paga (" + e.message + ").");
    }
  }

  // Reabre uma despesa (zera o valor pago, status volta a Pendente) — vale
  // tanto pro "desfazer" de cima quanto pra lista de pagas mais abaixo.
  // Atenção: se a despesa era recorrente, marcar como paga já lançou a
  // ocorrência do mês seguinte — reabrir essa aqui não desfaz aquela.
  async function reabrirDespesa(id) {
    setErro(null);
    try {
      await onAtualizarValorPago(id, 0);
      setDesfazerRecente((atual) => (atual?.id === id ? null : atual));
    } catch (e) {
      setErro("Não consegui reabrir (" + e.message + ").");
    }
  }

  function abrirEdicaoValorPago(d) {
    if (editandoDespesa === d.id) {
      setEditandoDespesa(null);
      return;
    }
    setEditandoDespesa(d.id);
    setValorPagoEdit(String(d.valorPago || ""));
    setDataPagamentoEdit(d.dataPagamento || hojeISO());
    setEdicaoDespesa({
      descricao: d.descricao,
      categoria: d.categoria,
      fornecedor: d.fornecedor,
      valor: String(d.valor ?? ""),
      frete: String(d.frete || ""),
      vencimento: d.vencimento,
      linha: d.linha || "",
      valorCamisaria: String(d.valorCamisaria || ""),
      valorAlfaiataria: String(d.valorAlfaiataria || ""),
    });
  }

  // Linha de uma despesa pendente — usada tanto na lista principal
  // quanto dentro de "ver detalhes" da conta agrupada da Fabi.
  function renderDespesaRow(d) {
    const atrasada = d.vencimento < hoje;
    const pendente = Math.max(0, totalDespesa(d) - (parseFloat(d.valorPago) || 0));
    const editando = editandoDespesa === d.id;
    const pedidoVinculado = d.pedidoId ? pedidos.find((p) => p.id === d.pedidoId) : null;
    return (
      <div key={d.id} className="py-2" style={{ borderBottom: `1px solid ${LINE}` }}>
        <div className="flex items-center justify-between">
          <button onClick={() => abrirEdicaoValorPago(d)} style={{ textAlign: "left" }} title="Editar despesa">
            <div className="flex items-center gap-1.5">
              <span style={{ fontSize: 13, fontWeight: 600 }}>
                {d.descricao} {d.recorrente && "↻"}
              </span>
              {(parseFloat(d.valorCamisaria) > 0 || parseFloat(d.valorAlfaiataria) > 0) ? (
                <>
                  {parseFloat(d.valorCamisaria) > 0 && <Pill text={`Camisaria ${brl(d.valorCamisaria)}`} style={LINHA_STYLE.Camisaria} />}
                  {parseFloat(d.valorAlfaiataria) > 0 && <Pill text={`Alfaiataria ${brl(d.valorAlfaiataria)}`} style={LINHA_STYLE.Alfaiataria} />}
                </>
              ) : (
                d.linha && <Pill text={d.linha} style={LINHA_STYLE[d.linha]} />
              )}
            </div>
            <div style={{ fontSize: 11, color: atrasada ? VERMELHO : TEXT_MUTED }}>
              {d.fornecedor ? `${d.fornecedor} · ` : d.categoria ? `${d.categoria} · ` : ""}vence {fmtData(d.vencimento)}
              {atrasada ? " — atrasada" : ""}
              {parseFloat(d.frete) > 0 && ` · frete ${brl(d.frete)}`}
            </div>
          </button>
          <div className="flex items-center gap-2">
            <div style={{ textAlign: "right" }}>
              <span className="fx-mono" style={{ fontSize: 13, fontWeight: 600 }}>
                {brl(pendente)}
              </span>
              {d.status === "Parcial" && (
                <div style={{ fontSize: 10, color: TEXT_MUTED }}>
                  {brl(d.valorPago)} de {brl(totalDespesa(d))} pago
                </div>
              )}
            </div>
            <button onClick={() => abrirEdicaoValorPago(d)} title="Editar despesa">
              <Pencil size={14} color={TEXT_MUTED} />
            </button>
            <button onClick={() => handleMarcarPaga(d)} title="Marcar como totalmente paga">
              <CheckCircle2 size={16} color={VERDE} />
            </button>
            <button onClick={() => onRemoverDespesa(d.id)} title="Remover">
              <Trash2 size={14} color={VERMELHO} />
            </button>
          </div>
        </div>
        {pedidoVinculado && quantidadeCamisasDe(d, pedidoVinculado) > 1 && (
          <ControleBaixaPorCamisa despesa={d} pedido={pedidoVinculado} onAtualizarValorPago={onAtualizarValorPago} />
        )}
        {atrasada && (
          <div className="flex items-center gap-1.5 mt-1">
            <span style={{ fontSize: 11, color: TEXT_MUTED }}>Jogar vencimento pra frente:</span>
            <input
              type="date"
              value={d.vencimento}
              onChange={(e) => e.target.value && onAtualizarVencimentoDespesa(d.id, e.target.value)}
              style={{ ...inputStyle, padding: "4px 8px", fontSize: 12, width: 135 }}
            />
          </div>
        )}
        {editando && (
          <EditorDespesa
            edicaoDespesa={edicaoDespesa}
            setEdicaoDespesa={setEdicaoDespesa}
            valorPagoEdit={valorPagoEdit}
            setValorPagoEdit={setValorPagoEdit}
            dataPagamentoEdit={dataPagamentoEdit}
            setDataPagamentoEdit={setDataPagamentoEdit}
            onSalvar={() => salvarEdicaoDespesa(d.id)}
          />
        )}
      </div>
    );
  }

  async function salvarNota(e) {
    e.preventDefault();
    if (!novaNota.descricao.trim()) return;
    setErro(null);
    try {
      await onCriarNota(novaNota);
      setNovaNota({ descricao: "", valor: "", dataEsperada: "" });
      setFormNota(false);
    } catch (e) {
      setErro("Não consegui salvar (" + e.message + ").");
    }
  }

  async function salvarPrevisao(e) {
    e.preventDefault();
    if (!novaPrevisao.valor) return;
    setErro(null);
    try {
      await onCriarPrevisao(novaPrevisao);
      setNovaPrevisao({ descricao: "", valor: "", dataEsperada: hojeISO() });
      setFormPrevisao(false);
    } catch (e) {
      setErro("Não consegui salvar (" + e.message + ").");
    }
  }

  function abrir(item) {
    if (item.tipo === "camisa") irParaPedido(item.id);
    else irParaPeca(item.id);
  }

  // Remarca uma previsão que não se confirmou — cliente só adiou, então
  // em vez de apagar e perder o registro, ajusta descrição/valor/data.
  function abrirEdicaoPrevisao(p) {
    if (editandoPrevisao === p.id) {
      setEditandoPrevisao(null);
      return;
    }
    setEditandoPrevisao(p.id);
    setEdicaoPrevisao({ descricao: p.descricao || "", valor: String(p.valor ?? ""), dataEsperada: p.dataEsperada });
  }

  async function salvarEdicaoPrevisao(id) {
    setErro(null);
    try {
      await onAtualizarPrevisao(id, edicaoPrevisao);
      setEditandoPrevisao(null);
    } catch (e) {
      setErro("Não consegui salvar (" + e.message + ").");
    }
  }

  return (
    <div>
      <PageTitle eyebrow="Financeiro" title="Contas a Pagar" />

      {desfazerRecente && (
        <div
          className="flex items-center justify-between gap-3 mb-4"
          style={{ background: "#DCEBDD", border: `1px solid ${VERDE}`, borderRadius: 8, padding: "10px 14px" }}
        >
          <span style={{ fontSize: 13, color: "#1F4D22" }}>
            ✓ <strong>{desfazerRecente.descricao}</strong> marcada como paga.
          </span>
          <button
            onClick={() => reabrirDespesa(desfazerRecente.id)}
            className="flex items-center gap-1"
            style={{ background: "#FFF", color: "#1F4D22", padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, flexShrink: 0 }}
          >
            <Undo2 size={13} /> Desfazer
          </button>
        </div>
      )}

      {mostrarGuia ? (
        <Card style={{ padding: 16 }} className="mb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <HelpCircle size={16} color={BRASS} style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={{ fontSize: 12, color: TEXT_MUTED, lineHeight: 1.6 }}>
                <strong style={{ color: INK }}>Rotina sugerida, toda semana:</strong> clique em "7 dias" abaixo → olhe o
                resumo em frase logo depois (quanto sai, quanto entra, se sobra ou falta) → se estiver faltando,
                cobre quem te deve ou corra atrás de vender mais essa semana, em vez de descobrir só quando a conta
                já venceu.
              </div>
            </div>
            <button onClick={() => setMostrarGuia(false)} title="Ocultar" style={{ flexShrink: 0 }}>
              <X size={14} color={TEXT_MUTED} />
            </button>
          </div>
        </Card>
      ) : (
        <button onClick={() => setMostrarGuia(true)} className="flex items-center gap-1 mb-4" style={{ color: BRASS, fontSize: 11, fontWeight: 600 }}>
          <HelpCircle size={13} /> como usar essa página
        </button>
      )}

      {venceEmBreve.length > 0 && (
        <div
          className="flex items-center gap-2 mb-4"
          style={{ background: "#FCEFC7", border: "1px solid #E6C97A", borderRadius: 8, padding: "12px 14px" }}
        >
          <CalendarClock size={18} color="#8A6A0C" style={{ flexShrink: 0 }} />
          <div style={{ fontSize: 13, color: "#5A4200" }}>
            <strong>
              {venceEmBreve.length} conta{venceEmBreve.length > 1 ? "s" : ""} vencendo nos próximos 3 dias
            </strong>{" "}
            — {brl(totalVenceEmBreve)} no total: {venceEmBreve.map((d) => d.descricao).join(", ")}.
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {[
          { rotulo: "7 dias", dias: 7 },
          { rotulo: "14 dias", dias: 14 },
          { rotulo: "30 dias", dias: 30 },
        ].map(({ rotulo, dias }) => {
          const limite = limiteMesAtual(hoje);
          const candidata = somarDias(hoje, dias);
          const esperado = limite && candidata > limite ? limite : candidata;
          const ativo = dataIniJanela === hoje && dataFimJanela === esperado;
          return (
            <button
              key={rotulo}
              onClick={() => definirPeriodo(dias)}
              style={{ background: ativo ? INK : "#EDEAE0", color: ativo ? "#FFF" : INK, padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600 }}
            >
              {rotulo}
            </button>
          );
        })}
        <button
          onClick={limparPeriodo}
          style={{ background: verTudo ? INK : "#EDEAE0", color: verTudo ? "#FFF" : INK, padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600 }}
        >
          Ver tudo
        </button>
        <span style={{ width: 1, height: 20, background: LINE, margin: "0 4px" }} />
        <span style={{ fontSize: 11, color: TEXT_MUTED }}>De</span>
        <input
          type="date"
          value={dataIniJanela}
          onChange={(e) => setDataIniJanela(e.target.value)}
          style={{ ...inputStyle, padding: "6px 10px", fontSize: 12, width: 145 }}
        />
        <span style={{ fontSize: 11, color: TEXT_MUTED }}>até</span>
        <input
          type="date"
          value={dataFimJanela}
          onChange={(e) => setDataFimJanela(e.target.value)}
          style={{ ...inputStyle, padding: "6px 10px", fontSize: 12, width: 145 }}
        />
      </div>
      {limiteMesAtual(hoje) && (
        <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: -12, marginBottom: 20 }}>
          Os presets de dias não mostram conta do mês que vem antes da última semana deste mês — use "Ver tudo" ou o
          De/Até acima se quiser ver antes disso.
        </div>
      )}

      <Card style={{ padding: 18, background: saldo >= 0 ? "#DCEBDD" : "#F6E3D9" }} className="mb-6">
        <div style={{ fontSize: 14, lineHeight: 1.6, color: saldo >= 0 ? "#1F4D22" : "#7A3315" }}>
          {verTudo ? (
            <>Considerando tudo que está em aberto: </>
          ) : (
            <>
              De <strong>{fmtData(dataIniJanela || hoje)}</strong> até <strong>{fmtData(dataFimJanela || hoje)}</strong>:{" "}
            </>
          )}
          você precisa pagar <strong>{brl(totalDespesas)}</strong>
          {tecidoPendente > 0 && (
            <>
              {" "}+ <strong>{brl(tecidoPendente)}</strong> de tecido ainda por comprar
            </>
          )}
          , e espera receber <strong>{brl(totalReceita)}</strong>.{" "}
          {saldo >= 0 ? (
            <>Sobra <strong>{brl(saldo)}</strong> — tá tranquilo por enquanto.</>
          ) : (
            <>
              Falta <strong>{brl(Math.abs(saldo))}</strong> — vale cobrar quem está te devendo ou correr atrás de vender
              mais nesse período.
            </>
          )}
        </div>
      </Card>

      <Card style={{ padding: 16 }} className="mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <PiggyBank size={16} color={BRASS} />
            <span style={{ fontSize: 13, fontWeight: 600 }}>Caixa atual (R$)</span>
          </div>
          <input
            type="number"
            step="0.01"
            style={{ ...inputStyle, width: 140 }}
            value={caixaAtual}
            onChange={(e) => setCaixaAtual(e.target.value)}
            placeholder="0,00"
          />
          <button onClick={salvarCaixa} style={{ background: INK, color: "#FFF", padding: "7px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
            Atualizar
          </button>
          {caixaSalvo === true && <span style={{ fontSize: 12, color: VERDE }}>✓ salvo</span>}
          {caixaSalvo === false && <span style={{ fontSize: 12, color: VERMELHO }}>não consegui salvar, tenta de novo</span>}
          <span style={{ fontSize: 11, color: TEXT_MUTED }}>Atualize aqui sempre que quiser — entra na conta do saldo projetado e do quanto falta faturar.</span>
        </div>
      </Card>

      <div className="grid gap-4 mb-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>
        <StatCard label="Caixa atual" value={brl(caixaNum)} icon={PiggyBank} />
        <StatCard label="A pagar no período" value={brl(totalDespesas)} icon={TrendingDown} accent={VERMELHO} />
        <StatCard label="Tecido pendente de compra" value={brl(tecidoPendente)} icon={TrendingDown} accent={VERMELHO} />
        <StatCard label="A receber no período" value={brl(totalReceita)} icon={TrendingUp} accent={VERDE} />
        <StatCard label="Saldo projetado" value={brl(saldo)} icon={Wallet} accent={saldo < 0 ? VERMELHO : VERDE} />
        <StatCard label="Falta faturar" value={brl(faltaFaturar)} icon={TrendingUp} accent={faltaFaturar > 0 ? VERMELHO : VERDE} />
      </div>
      <div className="mb-8">
        {tecidoPendenteSemPreco > 0 && (
          <div style={{ fontSize: 11, color: TEXT_MUTED }}>
            {tecidoPendenteSemPreco} item(ns) de tecido pendente sem metragem/preço cadastrado ainda em Compras —
            fora da soma acima, então o "tecido pendente de compra" real é maior que isso.
          </div>
        )}
      </div>

      {erro && (
        <div className="mb-4" style={{ fontSize: 12, color: VERMELHO }}>
          {erro}
        </div>
      )}

      <div className="grid gap-6" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <Card style={{ padding: 20 }}>
          <div className="flex items-center justify-between mb-3">
            <div className="fx-serif" style={{ fontSize: 15, fontWeight: 600 }}>
              Despesas
            </div>
            <button onClick={() => setFormDespesa((v) => !v)} className="flex items-center gap-1" style={{ color: BRASS, fontSize: 12, fontWeight: 600 }}>
              <Plus size={13} style={formDespesa ? { transform: "rotate(45deg)" } : {}} /> {formDespesa ? "cancelar" : "nova despesa"}
            </button>
          </div>

          {formDespesa && (
            <form onSubmit={salvarDespesa} className="mb-4 p-3" style={{ background: "#F3EEDF", borderRadius: 8 }}>
              <Field label="Descrição">
                <input style={inputStyle} value={nova.descricao} onChange={(e) => setNova({ ...nova, descricao: e.target.value })} placeholder="Ex: Aluguel" required />
              </Field>
              <div className="grid gap-3" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <Field label="Categoria">
                  <input style={inputStyle} list="lista-categorias-despesa" value={nova.categoria} onChange={(e) => setNova({ ...nova, categoria: e.target.value })} />
                  <datalist id="lista-categorias-despesa">
                    {CATEGORIAS_DESPESA.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </Field>
                <Field label="Fornecedor (opcional)">
                  <input style={inputStyle} list="lista-fornecedores-despesa" value={nova.fornecedor} onChange={(e) => setNova({ ...nova, fornecedor: e.target.value })} />
                  <datalist id="lista-fornecedores-despesa">
                    {FORNECEDORES_TECIDO.map((f) => (
                      <option key={f} value={f} />
                    ))}
                  </datalist>
                </Field>
                {!nova.dividirLinha && (
                  <Field label="Valor (R$)">
                    <input type="number" step="0.01" style={inputStyle} value={nova.valor} onChange={(e) => setNova({ ...nova, valor: e.target.value })} required />
                  </Field>
                )}
                {nova.dividirLinha && (
                  <>
                    <Field label="Tecido Camisaria (R$)">
                      <input
                        type="number"
                        step="0.01"
                        style={inputStyle}
                        value={nova.valorCamisaria}
                        onChange={(e) => setNova({ ...nova, valorCamisaria: e.target.value })}
                        placeholder="0,00"
                      />
                    </Field>
                    <Field label="Tecido Alfaiataria (R$)">
                      <input
                        type="number"
                        step="0.01"
                        style={inputStyle}
                        value={nova.valorAlfaiataria}
                        onChange={(e) => setNova({ ...nova, valorAlfaiataria: e.target.value })}
                        placeholder="0,00"
                      />
                    </Field>
                  </>
                )}
                <Field label="Frete (R$, opcional)">
                  <input type="number" step="0.01" style={inputStyle} value={nova.frete} onChange={(e) => setNova({ ...nova, frete: e.target.value })} placeholder="0,00" />
                </Field>
                <Field label="Vencimento">
                  <input type="date" style={inputStyle} value={nova.vencimento} onChange={(e) => setNova({ ...nova, vencimento: e.target.value })} required />
                </Field>
                {!nova.dividirLinha && (
                  <Field label="Linha (pra destinar o custo à operação certa)">
                    <select style={inputStyle} value={nova.linha} onChange={(e) => setNova({ ...nova, linha: e.target.value })}>
                      <option value="">Compartilhado (empresa toda)</option>
                      <option value="Camisaria">Camisaria</option>
                      <option value="Alfaiataria">Alfaiataria</option>
                    </select>
                  </Field>
                )}
                <Field label="Parcelas (boleto em Nx)">
                  <input type="number" min="1" step="1" style={inputStyle} value={nova.parcelas} onChange={(e) => handleParcelasChange(e.target.value)} />
                </Field>
              </div>
              <label className="flex items-center gap-2 mb-2" style={{ cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={nova.dividirLinha}
                  onChange={(e) => setNova({ ...nova, dividirLinha: e.target.checked, linha: "", valor: "" })}
                  style={{ width: 15, height: 15, accentColor: BRASS }}
                />
                <span style={{ fontSize: 12, fontWeight: 600 }}>
                  Mesmo fornecedor, tecido das duas linhas — discriminar quanto é de cada uma dentro dessa despesa
                </span>
              </label>
              {nova.dividirLinha && (
                <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 12 }}>
                  Uma despesa só, com o tecido de cada linha anotado dentro dela: Camisaria {brl(parseFloat(nova.valorCamisaria) || 0)} + Alfaiataria{" "}
                  {brl(parseFloat(nova.valorAlfaiataria) || 0)}
                  {parseFloat(nova.frete) > 0 && <> + frete {brl(parseFloat(nova.frete) || 0)}</>} = total da dívida com o fornecedor{" "}
                  <strong>
                    {brl((parseFloat(nova.valorCamisaria) || 0) + (parseFloat(nova.valorAlfaiataria) || 0) + (parseFloat(nova.frete) || 0))}
                  </strong>
                  .
                </div>
              )}
              {parseInt(nova.parcelas, 10) > 1 && (
                <div className="mb-3 p-3" style={{ background: "#F3EEDF", borderRadius: 8 }}>
                  <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 8 }}>
                    Lança {parseInt(nova.parcelas, 10)} despesas — ajuste o vencimento de cada uma, já que nem todo parcelamento é mês a mês certinho.
                  </div>
                  <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))" }}>
                    {vencimentosParcelas.map((venc, i) => (
                      <Field key={i} label={`Parcela ${i + 1}/${nova.parcelas}`}>
                        <input
                          type="date"
                          style={{ ...inputStyle, padding: "6px 8px", fontSize: 12 }}
                          value={venc}
                          onChange={(e) => {
                            const copia = vencimentosParcelas.slice();
                            copia[i] = e.target.value;
                            setVencimentosParcelas(copia);
                          }}
                        />
                      </Field>
                    ))}
                  </div>
                </div>
              )}
              {parseInt(nova.parcelas, 10) <= 1 && (
                <label className="flex items-center gap-2 mb-2" style={{ cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={nova.recorrente}
                    onChange={(e) => setNova({ ...nova, recorrente: e.target.checked })}
                    style={{ width: 15, height: 15, accentColor: BRASS }}
                  />
                  <span style={{ fontSize: 12, fontWeight: 600 }}>Recorrente — ao marcar como paga, já lança a do mês seguinte</span>
                </label>
              )}
              <button type="submit" style={{ background: INK, color: "#FFF", padding: "7px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
                Salvar
              </button>
            </form>
          )}

          {despesasJanela.length === 0 && <Empty texto={verTudo ? "Nenhuma despesa pendente." : "Nada vencendo no período selecionado."} />}

          {despesasFabiJanela.length > 0 && (
            <ContaFabiAgrupada
              despesas={despesasFabiJanela}
              pedidos={pedidos}
              onAtualizarValorPago={onAtualizarValorPago}
              onAtualizarVencimentoDespesa={onAtualizarVencimentoDespesa}
              renderLinha={renderDespesaRow}
            />
          )}

          {despesasJanelaSemFabi.map((d) => renderDespesaRow(d))}

          {porFornecedor.length > 0 && (
            <div className="mt-4 pt-3" style={{ borderTop: `1px solid ${LINE}` }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: TEXT_MUTED, marginBottom: 6 }}>QUANTO DEVO POR FORNECEDOR</div>
              {porFornecedor.map(([fornecedor, valor]) => (
                <div key={fornecedor} className="flex items-center justify-between py-1">
                  <span style={{ fontSize: 12 }}>{fornecedor}</span>
                  <span className="fx-mono" style={{ fontSize: 12, fontWeight: 600 }}>
                    {brl(valor)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {(porLinha.Camisaria > 0 || porLinha.Alfaiataria > 0 || porLinha.Compartilhado > 0) && (
            <div className="mt-4 pt-3" style={{ borderTop: `1px solid ${LINE}` }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: TEXT_MUTED, marginBottom: 6 }}>QUANTO É DE CADA LINHA</div>
              {[
                ["Camisaria", porLinha.Camisaria],
                ["Alfaiataria", porLinha.Alfaiataria],
                ["Compartilhado", porLinha.Compartilhado],
              ]
                .filter(([, valor]) => valor > 0)
                .map(([linha, valor]) => (
                  <div key={linha} className="flex items-center justify-between py-1">
                    <span className="flex items-center gap-1.5" style={{ fontSize: 12 }}>
                      {linha !== "Compartilhado" ? <Pill text={linha} style={LINHA_STYLE[linha]} /> : linha}
                    </span>
                    <span className="fx-mono" style={{ fontSize: 12, fontWeight: 600 }}>
                      {brl(valor)}
                    </span>
                  </div>
                ))}
            </div>
          )}

          {despesasPagas.length > 0 && (
            <div className="mt-4 pt-3" style={{ borderTop: `1px solid ${LINE}` }}>
              <button
                onClick={() => setMostrarPagas((v) => !v)}
                className="flex items-center justify-between w-full"
                style={{ fontSize: 11, fontWeight: 600, color: TEXT_MUTED, marginBottom: mostrarPagas ? 6 : 0 }}
              >
                <span>ÚLTIMAS PAGAS (CLIQUE PRA REABRIR SE FOI ENGANO)</span>
                <span>{mostrarPagas ? "ocultar" : "ver"}</span>
              </button>
              {mostrarPagas &&
                despesasPagas.map((d) => {
                  const editandoPaga = editandoDespesa === d.id;
                  return (
                    <div key={d.id} className="py-1.5">
                      <div className="flex items-center justify-between">
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600 }}>{d.descricao}</div>
                          <div style={{ fontSize: 10, color: TEXT_MUTED }}>vencia {fmtData(d.vencimento)} · pago {brl(totalDespesa(d))}</div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button onClick={() => abrirEdicaoValorPago(d)} title="Editar despesa">
                            <Pencil size={13} color={TEXT_MUTED} />
                          </button>
                          <button
                            onClick={() => reabrirDespesa(d.id)}
                            className="flex items-center gap-1"
                            style={{ color: BRASS, fontSize: 11, fontWeight: 600 }}
                          >
                            <Undo2 size={12} /> Reabrir
                          </button>
                        </div>
                      </div>
                      {editandoPaga && (
                        <EditorDespesa
                          edicaoDespesa={edicaoDespesa}
                          setEdicaoDespesa={setEdicaoDespesa}
                          valorPagoEdit={valorPagoEdit}
                          setValorPagoEdit={setValorPagoEdit}
                          dataPagamentoEdit={dataPagamentoEdit}
                          setDataPagamentoEdit={setDataPagamentoEdit}
                          onSalvar={() => salvarEdicaoDespesa(d.id)}
                        />
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </Card>

        <Card style={{ padding: 20 }}>
          <div className="flex items-center justify-between mb-3">
            <div className="fx-serif" style={{ fontSize: 15, fontWeight: 600 }}>
              Receita esperada
            </div>
            <button onClick={() => setFormPrevisao((v) => !v)} className="flex items-center gap-1" style={{ color: BRASS, fontSize: 12, fontWeight: 600 }}>
              <Plus size={13} style={formPrevisao ? { transform: "rotate(45deg)" } : {}} /> {formPrevisao ? "cancelar" : "prever venda futura"}
            </button>
          </div>

          {formPrevisao && (
            <form onSubmit={salvarPrevisao} className="mb-4 p-3" style={{ background: "#F3EEDF", borderRadius: 8 }}>
              <Field label="Descrição (opcional)">
                <input
                  style={inputStyle}
                  value={novaPrevisao.descricao}
                  onChange={(e) => setNovaPrevisao({ ...novaPrevisao, descricao: e.target.value })}
                  placeholder="Ex: Previsão de vendas de outubro"
                />
              </Field>
              <div className="grid gap-3" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <Field label="Valor esperado (R$)">
                  <input
                    type="number"
                    step="0.01"
                    style={inputStyle}
                    value={novaPrevisao.valor}
                    onChange={(e) => setNovaPrevisao({ ...novaPrevisao, valor: e.target.value })}
                    required
                  />
                </Field>
                <Field label="Data esperada">
                  <input
                    type="date"
                    style={inputStyle}
                    value={novaPrevisao.dataEsperada}
                    onChange={(e) => setNovaPrevisao({ ...novaPrevisao, dataEsperada: e.target.value })}
                    required
                  />
                </Field>
              </div>
              <button type="submit" style={{ background: INK, color: "#FFF", padding: "7px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
                Salvar
              </button>
            </form>
          )}

          {receberJanela.length === 0 && previsoesJanela.length === 0 && (
            <Empty texto={verTudo ? "Nada a receber." : "Nada esperado no período selecionado."} />
          )}

          {receberJanela.map((p) => (
            <button
              key={p.tipo + "-" + p.id}
              onClick={() => abrir(p)}
              className="w-full flex items-center justify-between py-2"
              style={{ borderBottom: `1px solid ${LINE}`, textAlign: "left" }}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{p.nome}</div>
                <div style={{ fontSize: 11, color: TEXT_MUTED }}>venda real · vence {fmtData(p.dataRef)}</div>
              </div>
              <span className="fx-mono" style={{ fontSize: 13, fontWeight: 600, color: VERDE }}>
                {brl(p.pendente)}
              </span>
            </button>
          ))}

          {previsoesJanela.length > 0 && (
            <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${LINE}` }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: TEXT_MUTED, marginBottom: 6 }}>PREVISÕES (AINDA NÃO SÃO PEDIDO)</div>
              {previsoesJanela.map((p) => (
                <div key={p.id} className="py-1.5">
                  <div className="flex items-center justify-between">
                    <button onClick={() => abrirEdicaoPrevisao(p)} style={{ textAlign: "left" }} title="Remarcar previsão">
                      <div style={{ fontSize: 12 }}>{p.descricao || "Previsão de venda"}</div>
                      <div style={{ fontSize: 11, color: TEXT_MUTED }}>esperado {fmtData(p.dataEsperada)}</div>
                    </button>
                    <div className="flex items-center gap-2">
                      <span className="fx-mono" style={{ fontSize: 12, fontWeight: 600, color: "#5B3E96" }}>
                        {brl(p.valor)}
                      </span>
                      <button onClick={() => abrirEdicaoPrevisao(p)} title="Remarcar previsão">
                        <Pencil size={13} color={TEXT_MUTED} />
                      </button>
                      <button onClick={() => onRemoverPrevisao(p.id)} title="Remover">
                        <Trash2 size={13} color={VERMELHO} />
                      </button>
                    </div>
                  </div>
                  {editandoPrevisao === p.id && (
                    <div className="flex items-center gap-2 mt-2 p-2 flex-wrap" style={{ background: "#F3EEDF", borderRadius: 6 }}>
                      <input
                        style={{ ...inputStyle, padding: "5px 8px", fontSize: 12, flex: "1 1 160px" }}
                        placeholder="Descrição"
                        value={edicaoPrevisao.descricao}
                        onChange={(e) => setEdicaoPrevisao({ ...edicaoPrevisao, descricao: e.target.value })}
                      />
                      <input
                        type="number"
                        step="0.01"
                        style={{ ...inputStyle, padding: "5px 8px", fontSize: 12, width: 100 }}
                        value={edicaoPrevisao.valor}
                        onChange={(e) => setEdicaoPrevisao({ ...edicaoPrevisao, valor: e.target.value })}
                      />
                      <input
                        type="date"
                        style={{ ...inputStyle, padding: "5px 8px", fontSize: 12 }}
                        value={edicaoPrevisao.dataEsperada}
                        onChange={(e) => setEdicaoPrevisao({ ...edicaoPrevisao, dataEsperada: e.target.value })}
                      />
                      <button
                        onClick={() => salvarEdicaoPrevisao(p.id)}
                        style={{ background: INK, color: "#FFF", padding: "5px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600 }}
                      >
                        Salvar
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {receberSemPrevisao.length > 0 && (
            <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${LINE}` }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: TEXT_MUTED, marginBottom: 6 }}>
                SEM PREVISÃO DE ENTREGA (não contabilizado acima)
              </div>
              {receberSemPrevisao.map((p) => (
                <button
                  key={p.tipo + "-" + p.id}
                  onClick={() => abrir(p)}
                  className="w-full flex items-center justify-between py-1.5"
                  style={{ textAlign: "left" }}
                >
                  <span style={{ fontSize: 12 }}>{p.nome}</span>
                  <span className="fx-mono" style={{ fontSize: 12, fontWeight: 600, color: TEXT_MUTED }}>
                    {brl(p.pendente)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-6 mt-6" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <Card style={{ padding: 20 }}>
          <div className="fx-serif mb-1" style={{ fontSize: 15, fontWeight: 600 }}>
            Contas atrasadas
          </div>
          <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 16 }}>
            {agingAtrasadas.length > 0 ? `${brl(totalAtrasado)} em aberto, vencidas.` : "Nenhuma conta atrasada agora."}
          </div>
          {agingAtrasadas.map((faixa) => (
            <div key={faixa.rotulo} className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <span style={{ fontSize: 12, fontWeight: 700, color: faixa.min >= 31 ? VERMELHO : INK }}>{faixa.rotulo}</span>
                <span className="fx-mono" style={{ fontSize: 12, fontWeight: 700 }}>{brl(faixa.total)}</span>
              </div>
              {faixa.itens.map((d) => (
                <div key={d.id} className="py-1">
                  <div className="flex items-center justify-between" style={{ fontSize: 11, color: TEXT_MUTED }}>
                    <span>{d.descricao} {d.fornecedor ? `— ${d.fornecedor}` : ""}</span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="fx-mono">{brl(Math.max(0, totalDespesa(d) - (parseFloat(d.valorPago) || 0)))}</span>
                      <button onClick={() => abrirEdicaoValorPago(d)} title="Editar despesa">
                        <Pencil size={12} color={TEXT_MUTED} />
                      </button>
                      <button onClick={() => handleMarcarPaga(d)} title="Marcar como totalmente paga">
                        <CheckCircle2 size={14} color={VERDE} />
                      </button>
                    </div>
                  </div>
                  {editandoDespesa === d.id && (
                    <EditorDespesa
                      edicaoDespesa={edicaoDespesa}
                      setEdicaoDespesa={setEdicaoDespesa}
                      valorPagoEdit={valorPagoEdit}
                      setValorPagoEdit={setValorPagoEdit}
                      dataPagamentoEdit={dataPagamentoEdit}
                      setDataPagamentoEdit={setDataPagamentoEdit}
                      onSalvar={() => salvarEdicaoDespesa(d.id)}
                    />
                  )}
                </div>
              ))}
            </div>
          ))}
        </Card>

        <Card style={{ padding: 20 }}>
          <div className="flex items-center justify-between mb-1">
            <div className="fx-serif" style={{ fontSize: 15, fontWeight: 600 }}>
              Calendário do mês
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  if (mesCalendario === 0) {
                    setMesCalendario(11);
                    setAnoCalendario((a) => a - 1);
                  } else {
                    setMesCalendario((m) => m - 1);
                  }
                }}
                style={{ padding: 4 }}
              >
                <ChevronLeft size={16} color={TEXT_MUTED} />
              </button>
              <span style={{ fontSize: 12, fontWeight: 600, minWidth: 110, textAlign: "center" }}>
                {new Date(anoCalendario, mesCalendario, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
              </span>
              <button
                onClick={() => {
                  if (mesCalendario === 11) {
                    setMesCalendario(0);
                    setAnoCalendario((a) => a + 1);
                  } else {
                    setMesCalendario((m) => m + 1);
                  }
                }}
                style={{ padding: 4 }}
              >
                <ChevronRight size={16} color={TEXT_MUTED} />
              </button>
            </div>
          </div>
          <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 12 }}>Dias com conta pendente vencendo, e quanto.</div>
          <div className="grid gap-1 mb-1" style={{ gridTemplateColumns: "repeat(7, 1fr)" }}>
            {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
              <div key={i} style={{ fontSize: 10, color: TEXT_MUTED, textAlign: "center", fontWeight: 600 }}>
                {d}
              </div>
            ))}
          </div>
          <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(7, 1fr)" }}>
            {(() => {
              const primeiroDiaSemana = new Date(anoCalendario, mesCalendario, 1).getDay();
              const diasNoMes = new Date(anoCalendario, mesCalendario + 1, 0).getDate();
              const celulas = [];
              for (let i = 0; i < primeiroDiaSemana; i++) celulas.push(null);
              for (let dia = 1; dia <= diasNoMes; dia++) celulas.push(dia);
              return celulas.map((dia, i) => {
                if (dia === null) return <div key={i} />;
                const iso = `${anoCalendario}-${String(mesCalendario + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
                const info = calendarioPorDia[iso];
                const ehHoje = iso === hoje;
                const atrasado = info && iso < hoje;
                return (
                  <div
                    key={i}
                    title={info ? info.itens.map((d) => d.descricao).join(", ") : undefined}
                    style={{
                      minHeight: 46,
                      border: ehHoje ? `2px solid ${BRASS}` : `1px solid ${LINE}`,
                      borderRadius: 6,
                      padding: 4,
                      background: atrasado ? "#F6E3D9" : info ? "#FCEFC7" : "transparent",
                    }}
                  >
                    <div style={{ fontSize: 10, fontWeight: ehHoje ? 700 : 500, color: ehHoje ? BRASS : INK }}>{dia}</div>
                    {info && (
                      <div className="fx-mono" style={{ fontSize: 9, color: atrasado ? VERMELHO : "#8A6A0C", fontWeight: 700, marginTop: 2 }}>
                        {brl(info.total)}
                      </div>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        </Card>
      </div>

      {mesesComHistorico.length > 0 && (
        <div className="grid gap-6 mt-6" style={{ gridTemplateColumns: "3fr 2fr" }}>
          <Card style={{ padding: 20 }}>
            <div className="fx-serif mb-1" style={{ fontSize: 15, fontWeight: 600 }}>
              Histórico de contas pagas
            </div>
            <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 16 }}>
              Total quitado por mês (usando o vencimento como referência de quando a conta foi paga). Média dos meses
              com movimento: <strong>{brl(mediaHistoricoDespesas)}</strong>/mês — serve de régua pra comparar: mês
              acima da média, vale olhar por quê.
            </div>
            <div className="flex items-end gap-3 flex-wrap">
              {historicoDespesas.map((m) => (
                <div key={m.chaveMes} style={{ textAlign: "center", flex: "1 0 80px" }}>
                  <div
                    className="fx-mono"
                    style={{ fontSize: 12, fontWeight: 700, color: m.total > mediaHistoricoDespesas ? VERMELHO : m.total > 0 ? BRASS : TEXT_MUTED }}
                  >
                    {brl(m.total)}
                  </div>
                  <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 4 }}>{m.label}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card style={{ padding: 20 }}>
            <div className="fx-serif mb-1" style={{ fontSize: 15, fontWeight: 600 }}>
              Onde o dinheiro foi
            </div>
            <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 16 }}>
              Soma por categoria, últimos {MESES_HISTORICO_FRETE} meses — o topo da lista é o melhor lugar pra
              procurar corte de custo.
            </div>
            {porCategoriaHistorico.map(([categoria, valor], i) => (
              <div key={categoria} className="flex items-center justify-between py-1.5" style={{ borderBottom: i < porCategoriaHistorico.length - 1 ? `1px solid ${LINE}` : "none" }}>
                <span style={{ fontSize: 12, fontWeight: i === 0 ? 700 : 500 }}>{categoria}</span>
                <span className="fx-mono" style={{ fontSize: 12, fontWeight: 700, color: i === 0 ? VERMELHO : INK }}>
                  {brl(valor)}
                </span>
              </div>
            ))}
          </Card>
        </div>
      )}

      {totalFreteHistorico > 0 && (
        <Card style={{ padding: 20 }} className="mt-6">
          <div className="fx-serif mb-1" style={{ fontSize: 15, fontWeight: 600 }}>
            Histórico de frete
          </div>
          <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 16 }}>
            Soma o frete das despesas já pagas, por mês (usando o vencimento como referência, já que não há data de
            pagamento separada). {brl(totalFreteHistorico)} nos últimos {MESES_HISTORICO_FRETE} meses.
          </div>
          <div className="flex items-end gap-3 flex-wrap">
            {historicoFrete.map((m) => (
              <div key={m.chaveMes} style={{ textAlign: "center", flex: "1 0 70px" }}>
                <div className="fx-mono" style={{ fontSize: 12, fontWeight: 700, color: m.total > 0 ? BRASS : TEXT_MUTED }}>
                  {brl(m.total)}
                </div>
                <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 4 }}>{m.label}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card style={{ padding: 20 }} className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="fx-serif" style={{ fontSize: 15, fontWeight: 600 }}>
              Anotações de vendas futuras
            </div>
            <div style={{ fontSize: 11, color: TEXT_MUTED }}>Só pra não esquecer — não entra em nenhum cálculo acima.</div>
          </div>
          <button onClick={() => setFormNota((v) => !v)} className="flex items-center gap-1" style={{ color: BRASS, fontSize: 12, fontWeight: 600 }}>
            <Plus size={13} style={formNota ? { transform: "rotate(45deg)" } : {}} /> {formNota ? "cancelar" : "nova anotação"}
          </button>
        </div>

        {formNota && (
          <form onSubmit={salvarNota} className="mb-4 p-3" style={{ background: "#F3EEDF", borderRadius: 8 }}>
            <Field label="Descrição">
              <input
                style={inputStyle}
                value={novaNota.descricao}
                onChange={(e) => setNovaNota({ ...novaNota, descricao: e.target.value })}
                placeholder="Ex: Cliente Fulano comentou que quer 2 camisas em novembro"
                required
              />
            </Field>
            <div className="grid gap-3" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <Field label="Valor estimado (opcional)">
                <input
                  type="number"
                  step="0.01"
                  style={inputStyle}
                  value={novaNota.valor}
                  onChange={(e) => setNovaNota({ ...novaNota, valor: e.target.value })}
                />
              </Field>
              <Field label="Data esperada (opcional)">
                <input
                  type="date"
                  style={inputStyle}
                  value={novaNota.dataEsperada}
                  onChange={(e) => setNovaNota({ ...novaNota, dataEsperada: e.target.value })}
                />
              </Field>
            </div>
            <button type="submit" style={{ background: INK, color: "#FFF", padding: "7px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
              Salvar
            </button>
          </form>
        )}

        {notas.length === 0 && <Empty texto="Nenhuma anotação ainda." />}
        {notas.map((n) => (
          <div key={n.id} className="flex items-center justify-between py-2" style={{ borderBottom: `1px solid ${LINE}` }}>
            <div>
              <div style={{ fontSize: 13 }}>{n.descricao}</div>
              <div style={{ fontSize: 11, color: TEXT_MUTED }}>{n.dataEsperada ? `esperado ${fmtData(n.dataEsperada)}` : "sem data"}</div>
            </div>
            <div className="flex items-center gap-2">
              {n.valor != null && (
                <span className="fx-mono" style={{ fontSize: 12, color: TEXT_MUTED }}>
                  {brl(n.valor)}
                </span>
              )}
              <button onClick={() => onRemoverNota(n.id)} title="Remover">
                <Trash2 size={13} color={VERMELHO} />
              </button>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
