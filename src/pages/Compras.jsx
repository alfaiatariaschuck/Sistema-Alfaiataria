import React, { useMemo, useRef, useState } from "react";
import { CheckCircle2, Clock, Copy, PackageMinus, Search, Undo2 } from "lucide-react";
import { Card, Empty, PageTitle, Pill } from "../components/ui";
import { BRASS, BRASS_SOFT, FORNECEDORES_TECIDO, INK, LINE, TEXT_MUTED, inputStyle } from "../lib/constants";
import { brl, metragemParaNumero, pedidoFechado } from "../lib/helpers";
import BaixaEstoqueTecido from "../components/BaixaEstoqueTecido";

// Junta variações de digitação (maiúscula/minúscula, espaço a mais) do
// mesmo fornecedor conhecido num nome só, pra tudo ficar concentrado num
// grupo único — "imperiale", "IMPERIALE " e "Imperiale" viram "Imperiale".
function normalizarFornecedor(nome) {
  const limpo = (nome || "").trim();
  if (!limpo) return "Sem fornecedor definido";
  const canonico = FORNECEDORES_TECIDO.find((f) => f.toLowerCase() === limpo.toLowerCase());
  return canonico || limpo;
}

// A Observação (ex: "colarinho windsor") é uma nota interna pro corte/
// costura — não deve ir pro fornecedor junto do pedido de tecido.
function textoParaFornecedor(fornecedor, lista) {
  const linhas = [`*Pedido de tecido — ${fornecedor}*`, ""];
  lista.forEach((item) => {
    const partes = [`Código ${item.codigo || "—"}`, `Qtd ${item.qtd}`];
    if (item.metragem) partes.push(`Medida ${item.metragem}`);
    linhas.push(`• ${item.cliente} — ${partes.join(" · ")}`);
  });
  return linhas.join("\n");
}

export default function Compras({
  pedidos,
  pecas,
  planos = [],
  onTecidoPedido,
  onTecidoPeca,
  onTecidoPlano,
  irParaPedido,
  irParaPeca,
  irParaPlano,
  estoqueTecidos = [],
  onDarBaixaEstoque,
}) {
  const [aba, setAba] = useState("compra");
  const [busca, setBusca] = useState("");
  const [filtroFornecedor, setFiltroFornecedor] = useState("Todos");
  const [filtroStatus, setFiltroStatus] = useState("Pendente");
  const [copiado, setCopiado] = useState(null);
  const [mostrarHistorico, setMostrarHistorico] = useState(false);
  const [desfazerDisponivel, setDesfazerDisponivel] = useState(null);
  const desfazerTimeoutRef = useRef(null);

  function chaveDe(item) {
    return item.origem + "-" + item.pedidoId + "-" + item.tecidoId;
  }

  const itens = [];
  pedidos.forEach((p) => {
    const jaEntregue = pedidoFechado(p.status) || p.status === "Entregue Parcial";
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
        metragem: t.metragem || "",
        valorMetro: t.valorMetro ?? "",
        fornecedor: normalizarFornecedor(t.fornecedor),
        comprado: !!t.comprado,
        metrosBaixados: t.metrosBaixados,
        dataPedido: p.dataPedido,
        jaEntregue,
      });
    });
  });
  (pecas || []).forEach((p) => {
    const jaEntregue = p.status === "Entregue";
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
        metragem: t.metragem || "",
        valorMetro: t.valorMetro ?? "",
        fornecedor: normalizarFornecedor(t.fornecedor),
        comprado: !!t.comprado,
        metrosBaixados: t.metrosBaixados,
        dataPedido: p.dataPedido,
        tipoPeca: p.tipoPeca,
        jaEntregue,
      });
    });
  });
  // Plano de Assinatura guarda o tecido do próximo mês a emitir — ainda
  // não é um "pedido" de verdade (só vira um ao clicar em "Emitir pedido
  // do mês"), mas o tecido já precisa ser comprado antes disso, senão a
  // Fabi não tem o que cortar na hora de emitir. Plano inativo/concluído
  // sai da lista, igual peça/pedido já entregue.
  (planos || []).forEach((pl) => {
    const jaEntregue = !pl.ativo;
    (pl.tecidos || []).forEach((t, i) => {
      if (!t.codigo && !t.fornecedor) return;
      itens.push({
        origem: "plano",
        pedidoId: pl.id,
        tecidoId: i,
        cliente: pl.cliente,
        codigo: t.codigo,
        qtd: t.qtd,
        numero: t.numero,
        metragem: t.metragem || "",
        valorMetro: t.valorMetro ?? "",
        fornecedor: normalizarFornecedor(t.fornecedor),
        comprado: !!t.comprado,
        metrosBaixados: t.metrosBaixados,
        dataPedido: pl.dataVenda,
        jaEntregue,
      });
    });
  });

  // Histórico de preço por metro — junta todo item com valor/metro
  // preenchido (independente dos filtros acima), pra virar um registro de
  // quanto se pagou por fornecedor ao longo do tempo.
  const historicoPreco = useMemo(() => {
    const comValor = itens.filter((i) => i.valorMetro !== "" && i.valorMetro !== null);
    const porFornec = new Map();
    comValor.forEach((i) => {
      if (!porFornec.has(i.fornecedor)) porFornec.set(i.fornecedor, []);
      porFornec.get(i.fornecedor).push(i);
    });
    return [...porFornec.entries()]
      .map(([fornecedor, lista]) => {
        const ordenada = lista.slice().sort((a, b) => (b.dataPedido || "").localeCompare(a.dataPedido || ""));
        const media = ordenada.reduce((s, i) => s + parseFloat(i.valorMetro), 0) / ordenada.length;
        return { fornecedor, itens: ordenada, media };
      })
      .sort((a, b) => b.itens.length - a.itens.length);
  }, [itens]);

  const fornecedores = ["Todos", ...new Set(itens.map((i) => i.fornecedor))];

  const filtrados = itens.filter((i) => {
    if (filtroFornecedor !== "Todos" && i.fornecedor !== filtroFornecedor) return false;
    // Item que acabou de ser marcado/desmarcado (poucos segundos atrás)
    // continua aparecendo mesmo que o filtro de status normalmente
    // escondesse ele — dá tempo de clicar em "desfazer" antes de sumir
    // da lista, pro caso de ter clicado no item errado.
    const recemAlternado = chaveDe(i) === desfazerDisponivel;
    // Pedido/peça já entregue não é mais "pendente de compra de
    // verdade" — o tecido obviamente já saiu (a peça foi feita e
    // entregue), então fica fora da lista de pendente mesmo que
    // "comprado" nunca tenha sido marcado (mesma régua de Contas a
    // Pagar). Continua aparecendo em "Comprado"/"Todos", que é visão
    // histórica.
    if (filtroStatus === "Pendente" && i.jaEntregue && !recemAlternado) return false;
    if (filtroStatus === "Pendente" && i.comprado && !recemAlternado) return false;
    if (filtroStatus === "Comprado" && !i.comprado && !recemAlternado) return false;
    if (busca && !i.cliente.toLowerCase().includes(busca.toLowerCase()) && !i.codigo.toLowerCase().includes(busca.toLowerCase())) return false;
    return true;
  });

  const porFornecedor = new Map();
  filtrados.forEach((i) => {
    if (!porFornecedor.has(i.fornecedor)) porFornecedor.set(i.fornecedor, []);
    porFornecedor.get(i.fornecedor).push(i);
  });

  const itensPendentes = itens.filter((i) => !i.comprado && !i.jaEntregue);
  const pendentes = itensPendentes.length;
  // Quanto ainda vai precisar desembolsar em tecido não comprado — só
  // conta quem já tem metragem e valor/metro preenchidos; o resto é
  // pendente também, mas sem preço ainda pra somar (fica só no contador).
  const totalPendenteReais = itensPendentes.reduce((s, i) => {
    const metros = metragemParaNumero(i.metragem);
    const valorMetro = parseFloat(i.valorMetro);
    if (metros === null || !valorMetro) return s;
    return s + metros * valorMetro;
  }, 0);
  const pendentesSemPreco = itensPendentes.filter((i) => metragemParaNumero(i.metragem) === null || !parseFloat(i.valorMetro)).length;

  // Baixa de estoque: igual ao jeito que a Fabi manda (foto do caderno,
  // agrupado por código de tecido, cliente + metros usados por linha) —
  // só entram itens cujo código bate com algo cadastrado no Estoque de
  // Tecido (senão não tem o que dar baixa) e que ainda não tiveram baixa
  // registrada. Não filtra por "já entregue": o tecido já foi cortado
  // independente do status da peça/pedido ter avançado até Entregue.
  function encontrarEstoquePorCodigo(codigo) {
    const chave = (codigo || "").trim().toLowerCase();
    return estoqueTecidos.find((e) => e.codigo.trim().toLowerCase() === chave) || null;
  }

  const itensBaixaPendente = useMemo(
    () => itens.filter((i) => encontrarEstoquePorCodigo(i.codigo) && (i.metrosBaixados === null || i.metrosBaixados === undefined)),
    [itens, estoqueTecidos]
  );

  const porCodigo = new Map();
  itensBaixaPendente.forEach((i) => {
    const chave = i.codigo.trim();
    if (!porCodigo.has(chave)) porCodigo.set(chave, []);
    porCodigo.get(chave).push(i);
  });

  function motivoDe(item) {
    const origemLabel = item.origem === "camisa" ? "camisaria" : item.origem === "plano" ? "plano de assinatura" : "alfaiataria";
    return `Pedido de ${item.cliente} (${origemLabel})`;
  }

  function registrarMetrosBaixados(item, valor) {
    if (item.origem === "camisa") onTecidoPedido(item.pedidoId, item.tecidoId, "metros_baixados", valor);
    else if (item.origem === "plano") onTecidoPlano(item.pedidoId, item.tecidoId, "metros_baixados", valor);
    else onTecidoPeca(item.pedidoId, item.tecidoId, "metros_baixados", valor);
  }

  function alternarComprado(item) {
    if (item.origem === "camisa") onTecidoPedido(item.pedidoId, item.tecidoId, "comprado", !item.comprado);
    else if (item.origem === "plano") onTecidoPlano(item.pedidoId, item.tecidoId, "comprado", !item.comprado);
    else onTecidoPeca(item.pedidoId, item.tecidoId, "comprado", !item.comprado);

    // Clicou errado? Por alguns segundos o item continua na tela (mesmo
    // que o filtro de status normalmente escondesse ele) com um botão
    // de desfazer — depois disso, some do filtro normalmente.
    const chave = chaveDe(item);
    if (desfazerTimeoutRef.current) clearTimeout(desfazerTimeoutRef.current);
    setDesfazerDisponivel(chave);
    desfazerTimeoutRef.current = setTimeout(() => {
      setDesfazerDisponivel((atual) => (atual === chave ? null : atual));
    }, 8000);
  }

  function atualizarMetragem(item, valor) {
    if (item.origem === "camisa") onTecidoPedido(item.pedidoId, item.tecidoId, "metragem", valor);
    else if (item.origem === "plano") onTecidoPlano(item.pedidoId, item.tecidoId, "metragem", valor);
    else onTecidoPeca(item.pedidoId, item.tecidoId, "metragem", valor);
  }

  function atualizarValorMetro(item, valor) {
    if (item.origem === "camisa") onTecidoPedido(item.pedidoId, item.tecidoId, "valorMetro", valor);
    else if (item.origem === "plano") onTecidoPlano(item.pedidoId, item.tecidoId, "valorMetro", valor);
    else onTecidoPeca(item.pedidoId, item.tecidoId, "valorMetro", valor);
  }

  function abrirItem(item) {
    if (item.origem === "camisa") irParaPedido(item.pedidoId);
    else if (item.origem === "plano") irParaPlano(item.pedidoId);
    else irParaPeca(item.pedidoId);
  }

  async function copiarTexto(fornecedor, lista) {
    const texto = textoParaFornecedor(fornecedor, lista);
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(fornecedor);
      setTimeout(() => setCopiado(null), 2000);
    } catch {
      // clipboard indisponível — o botão de WhatsApp já leva o mesmo texto
    }
  }

  function abrirWhatsapp(fornecedor, lista) {
    const texto = textoParaFornecedor(fornecedor, lista);
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank");
  }

  return (
    <div>
      <PageTitle eyebrow={`${pendentes} item(ns) pendente(s)`} title="Compras" />

      <div className="flex items-center gap-2 mb-5">
        {[
          { id: "compra", label: "Pendente de compra" },
          { id: "baixa", label: `Baixa de estoque${itensBaixaPendente.length > 0 ? ` (${itensBaixaPendente.length})` : ""}` },
        ].map((op) => (
          <button
            key={op.id}
            onClick={() => setAba(op.id)}
            style={{
              background: aba === op.id ? INK : "transparent",
              color: aba === op.id ? "#FFF" : TEXT_MUTED,
              border: `1px solid ${aba === op.id ? INK : LINE}`,
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

      {aba === "baixa" ? (
        <div>
          {itensBaixaPendente.length === 0 && (
            <Card style={{ padding: 20 }}>
              <Empty texto="Nenhum item com tecido em estoque esperando baixa no momento." />
            </Card>
          )}
          {[...porCodigo.entries()].map(([codigo, lista]) => {
            const itemEstoque = encontrarEstoquePorCodigo(codigo);
            return (
              <Card key={codigo} style={{ padding: 0, marginBottom: 16, overflow: "hidden" }}>
                <div className="flex items-center justify-between" style={{ background: INK, padding: "10px 16px" }}>
                  <div className="flex items-center gap-1.5">
                    <PackageMinus size={14} color="#FFF" />
                    <span className="fx-mono" style={{ color: "#FFF", fontSize: 13, fontWeight: 700 }}>
                      {codigo}
                    </span>
                    <span style={{ color: "#8593A3", fontSize: 12 }}> · {lista.length} peça(s) · saldo {itemEstoque.saldoMetros.toFixed(1)}m</span>
                  </div>
                </div>
                {lista.map((item, i) => (
                  <div
                    key={item.origem + "-" + item.pedidoId + "-" + item.tecidoId}
                    className="flex items-center justify-between gap-3 px-4 py-3 flex-wrap"
                    style={{ borderBottom: i < lista.length - 1 ? `1px solid ${LINE}` : "none" }}
                  >
                    <button onClick={() => abrirItem(item)} className="text-left">
                      <div className="flex items-center gap-1.5">
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{item.cliente}</span>
                        {item.origem === "alfaiataria" && <Pill text={item.tipoPeca} style={{ bg: BRASS_SOFT, fg: "#A9793E" }} />}
                        {item.origem === "plano" && <Pill text="Plano de Assinatura" style={{ bg: BRASS_SOFT, fg: "#A9793E" }} />}
                      </div>
                      <div className="fx-mono" style={{ fontSize: 11, color: TEXT_MUTED }}>
                        Qtd {item.qtd} {item.metragem ? `· Medida lançada: ${item.metragem}` : ""}
                      </div>
                    </button>
                    <BaixaEstoqueTecido
                      codigo={item.codigo}
                      estoque={estoqueTecidos}
                      onDarBaixa={onDarBaixaEstoque}
                      motivo={motivoDe(item)}
                      metrosBaixados={item.metrosBaixados}
                      onRegistrarMetrosBaixados={(valor) => registrarMetrosBaixados(item, valor)}
                    />
                  </div>
                ))}
              </Card>
            );
          })}
        </div>
      ) : (
        <>
      {pendentes > 0 && (
        <Card style={{ padding: 16 }} className="mb-5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <div style={{ fontSize: 11, color: TEXT_MUTED, fontWeight: 600, textTransform: "uppercase" }}>Desembolso pendente em tecido</div>
              <div style={{ fontSize: 11, color: TEXT_MUTED }}>
                Ainda não comprado — dinheiro que vai sair e ainda não está na provisão de custo mensal.
                {pendentesSemPreco > 0 && ` ${pendentesSemPreco} item(ns) sem metragem/preço ainda, fora dessa soma.`}
              </div>
            </div>
            <span className="fx-mono" style={{ fontSize: 20, fontWeight: 700, color: "#9C4A1E" }}>{brl(totalPendenteReais)}</span>
          </div>
        </Card>
      )}

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

      {historicoPreco.length > 0 && (
        <Card style={{ padding: 16 }} className="mb-5">
          <button
            type="button"
            onClick={() => setMostrarHistorico((v) => !v)}
            className="flex items-center justify-between w-full text-left"
          >
            <div className="fx-serif" style={{ fontSize: 14, fontWeight: 600 }}>
              Histórico de preço por metro
            </div>
            <span style={{ fontSize: 12, color: TEXT_MUTED }}>{mostrarHistorico ? "Ocultar" : "Ver"}</span>
          </button>
          {mostrarHistorico && (
            <div className="mt-3" style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
              {historicoPreco.map(({ fornecedor, itens: lista, media }) => (
                <div key={fornecedor}>
                  <div className="flex items-baseline justify-between mb-1">
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{fornecedor}</span>
                    <span className="fx-mono" style={{ fontSize: 11, color: BRASS, fontWeight: 700 }}>
                      média {brl(media)}/m
                    </span>
                  </div>
                  <div style={{ maxHeight: 160, overflowY: "auto" }}>
                    {lista.map((i) => (
                      <div
                        key={i.origem + "-" + i.pedidoId + "-" + i.tecidoId}
                        className="flex items-center justify-between"
                        style={{ fontSize: 11, color: TEXT_MUTED, padding: "3px 0", borderBottom: `1px solid ${LINE}` }}
                      >
                        <span>{i.dataPedido ? new Date(i.dataPedido + "T00:00:00").toLocaleDateString("pt-BR") : "—"} · {i.codigo || "—"}</span>
                        <span className="fx-mono" style={{ fontWeight: 600 }}>{brl(i.valorMetro)}/m</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {filtrados.length === 0 && (
        <Card style={{ padding: 20 }}>
          <Empty texto="Nenhum item de tecido encontrado com esse filtro." />
        </Card>
      )}

      {[...porFornecedor.entries()].map(([fornecedor, lista]) => (
        <Card key={fornecedor} style={{ padding: 0, marginBottom: 16, overflow: "hidden" }}>
          <div className="flex items-center justify-between" style={{ background: INK, padding: "10px 16px" }}>
            <div>
              <span className="fx-serif" style={{ color: "#FFF", fontSize: 14, fontWeight: 600 }}>
                {fornecedor}
              </span>
              <span style={{ color: "#8593A3", fontSize: 12 }}> · {lista.length} item(ns)</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => copiarTexto(fornecedor, lista)}
                className="flex items-center gap-1"
                style={{ background: "rgba(255,255,255,0.12)", color: "#FFF", padding: "6px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600 }}
              >
                <Copy size={12} /> {copiado === fornecedor ? "Copiado!" : "Copiar"}
              </button>
              <button
                type="button"
                onClick={() => abrirWhatsapp(fornecedor, lista)}
                className="flex items-center gap-1"
                style={{ background: "#25D366", color: "#FFF", padding: "6px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600 }}
              >
                WhatsApp
              </button>
            </div>
          </div>
          {lista.map((item, i) => (
            <div
              key={item.origem + "-" + item.pedidoId + "-" + item.tecidoId}
              className="flex items-center justify-between gap-3 px-4 py-3"
              style={{ borderBottom: i < lista.length - 1 ? `1px solid ${LINE}` : "none" }}
            >
              <button onClick={() => abrirItem(item)} className="text-left flex-1">
                <div className="flex items-center gap-1.5">
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{item.cliente}</span>
                  {item.origem === "alfaiataria" && <Pill text={item.tipoPeca} style={{ bg: BRASS_SOFT, fg: "#A9793E" }} />}
                  {item.origem === "plano" && <Pill text="Plano de Assinatura" style={{ bg: BRASS_SOFT, fg: "#A9793E" }} />}
                </div>
                <div className="fx-mono" style={{ fontSize: 11, color: TEXT_MUTED }}>
                  Código {item.codigo || "—"} · Qtd {item.qtd} {item.numero ? `· Obs: ${item.numero}` : ""}
                </div>
              </button>
              <div className="flex flex-col items-start flex-shrink-0" style={{ width: 100 }}>
                <label style={{ fontSize: 10, color: TEXT_MUTED, fontWeight: 600 }}>Medida</label>
                <input
                  style={{ ...inputStyle, padding: "5px 8px", fontSize: 12 }}
                  placeholder="ex: 3,5m"
                  value={item.metragem}
                  onChange={(e) => atualizarMetragem(item, e.target.value)}
                />
              </div>
              <div className="flex flex-col items-start flex-shrink-0" style={{ width: 90 }}>
                <label style={{ fontSize: 10, color: TEXT_MUTED, fontWeight: 600 }}>R$/metro</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  style={{ ...inputStyle, padding: "5px 8px", fontSize: 12 }}
                  placeholder="ex: 45"
                  value={item.valorMetro}
                  onChange={(e) => atualizarValorMetro(item, e.target.value)}
                />
                {item.valorMetro !== "" && metragemParaNumero(item.metragem) !== null && (
                  <span className="fx-mono" style={{ fontSize: 10, color: TEXT_MUTED, marginTop: 2 }}>
                    Total {brl(metragemParaNumero(item.metragem) * parseFloat(item.valorMetro))}
                  </span>
                )}
              </div>
              <button
                onClick={() => alternarComprado(item)}
                className="flex items-center gap-1 flex-shrink-0"
                style={{
                  background: chaveDe(item) === desfazerDisponivel ? BRASS_SOFT : item.comprado ? "#DCEBDD" : "#F6E3D9",
                  color: chaveDe(item) === desfazerDisponivel ? BRASS : item.comprado ? "#2C6E31" : "#9C4A1E",
                  padding: "7px 12px",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {chaveDe(item) === desfazerDisponivel ? (
                  <>
                    <Undo2 size={13} /> {item.comprado ? "Marcado — desfazer" : "Desmarcado — desfazer"}
                  </>
                ) : item.comprado ? (
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
        </>
      )}
    </div>
  );
}
