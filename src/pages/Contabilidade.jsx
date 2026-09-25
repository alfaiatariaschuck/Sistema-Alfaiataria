import React, { useMemo, useState } from "react";
import { BookText, ChevronLeft, ChevronRight, Info, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { Card, Empty, PageTitle, StatCard } from "../components/ui";
import FaturamentoPorMes from "../components/FaturamentoPorMes";
import { BRASS, INK, LINE, TEXT_MUTED, TIPOS_SAIDA_SEM_VENDA } from "../lib/constants";
import { brl, fmtData, hojeISO } from "../lib/helpers";

const VERDE = "#2C6E31";
const VERMELHO = "#9C4A1E";
const MESES_LONGO = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function mesAnteriorDe(mesStr) {
  const [ano, mes] = mesStr.split("-").map(Number);
  const d = new Date(ano, mes - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function mesSeguinteDe(mesStr) {
  const [ano, mes] = mesStr.split("-").map(Number);
  const d = new Date(ano, mes, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function nomeDoMes(mesStr) {
  const [ano, mes] = mesStr.split("-").map(Number);
  return `${MESES_LONGO[mes - 1]} de ${ano}`;
}

function totalDespesa(d) {
  return (parseFloat(d.valor) || 0) + (parseFloat(d.frete) || 0);
}

export default function Contabilidade({ pedidos, pecas, pedidosSapatos, despesas, irParaPedido, irParaPeca }) {
  const mesRealAtual = hojeISO().slice(0, 7);
  const [mesSelecionado, setMesSelecionado] = useState(mesRealAtual);
  const ehMesAtual = mesSelecionado === mesRealAtual;

  // Livro-caixa: só entra o que já tem data de quando o dinheiro
  // realmente entrou/saiu (regime de caixa) — nada de "vendido" ou
  // "a vencer". Despesa já tinha data_pagamento; receita (pedidos/peças)
  // ganhou data_recebimento agora (schema_v84) especialmente pra isso.
  const despesasPagasDoMes = useMemo(
    () => (despesas || []).filter((d) => d.status === "Pago" && d.dataPagamento && d.dataPagamento.slice(0, 7) === mesSelecionado),
    [despesas, mesSelecionado]
  );
  const recebidosCamisariaDoMes = useMemo(
    () => (pedidos || []).filter((p) => p.aReceber?.statusPagamento === "Recebido" && p.dataRecebimento && p.dataRecebimento.slice(0, 7) === mesSelecionado),
    [pedidos, mesSelecionado]
  );
  const recebidosAlfaiatariaDoMes = useMemo(
    () => (pecas || []).filter((p) => p.statusPagamentoVenda === "Recebido" && p.dataRecebimento && p.dataRecebimento.slice(0, 7) === mesSelecionado),
    [pecas, mesSelecionado]
  );

  const totalDespesasPagas = despesasPagasDoMes.reduce((s, d) => s + totalDespesa(d), 0);
  const totalRecebidoCamisaria = recebidosCamisariaDoMes.reduce((s, p) => s + (parseFloat(p.aReceber.valor) || 0), 0);
  const totalRecebidoAlfaiataria = recebidosAlfaiatariaDoMes.reduce((s, p) => s + (parseFloat(p.valorVenda) || 0), 0);
  const totalRecebido = totalRecebidoCamisaria + totalRecebidoAlfaiataria;
  const saldoDoMes = totalRecebido - totalDespesasPagas;

  // Faturamento do mês (competência — vendido, pago ou não) só como
  // referência ao lado do que já é caixa de verdade — mesma fórmula do DRE.
  const faturamentoDoMes = useMemo(() => {
    const pedidosMes = (pedidos || []).filter((p) => p.status !== "Doação" && (p.dataPedido || "").slice(0, 7) === mesSelecionado);
    const pecasMes = (pecas || []).filter((p) => !TIPOS_SAIDA_SEM_VENDA.includes(p.tipoSaida) && (p.dataPedido || "").slice(0, 7) === mesSelecionado);
    return pedidosMes.reduce((s, p) => s + (parseFloat(p.aReceber?.valor) || 0), 0) + pecasMes.reduce((s, p) => s + (parseFloat(p.valorVenda) || 0), 0);
  }, [pedidos, pecas, mesSelecionado]);

  // Guarda a lista de despesas de cada categoria, não só a soma — é o
  // que permite abrir "o que tem dentro desse Outros de R$X" direto na
  // tela, sem precisar me perguntar toda vez.
  const despesasPorCategoria = useMemo(() => {
    const mapa = new Map();
    despesasPagasDoMes.forEach((d) => {
      const cat = d.categoria || "Sem categoria";
      if (!mapa.has(cat)) mapa.set(cat, { total: 0, itens: [] });
      const bucket = mapa.get(cat);
      bucket.total += totalDespesa(d);
      bucket.itens.push(d);
    });
    return [...mapa.entries()]
      .map(([categoria, { total, itens }]) => ({
        categoria,
        total,
        itens: [...itens].sort((a, b) => b.dataPagamento.localeCompare(a.dataPagamento)),
      }))
      .sort((a, b) => b.total - a.total);
  }, [despesasPagasDoMes]);

  const livroDoMes = useMemo(() => {
    const linhas = [
      ...despesasPagasDoMes.map((d) => ({
        data: d.dataPagamento,
        descricao: d.fornecedor || d.descricao,
        tipo: d.categoria || "Despesa",
        valor: -totalDespesa(d),
        onClick: null,
      })),
      ...recebidosCamisariaDoMes.map((p) => ({
        data: p.dataRecebimento,
        descricao: p.cliente,
        tipo: "Camisaria",
        valor: parseFloat(p.aReceber.valor) || 0,
        onClick: () => irParaPedido && irParaPedido(p.id),
      })),
      ...recebidosAlfaiatariaDoMes.map((p) => ({
        data: p.dataRecebimento,
        descricao: p.cliente,
        tipo: "Alfaiataria",
        valor: parseFloat(p.valorVenda) || 0,
        onClick: () => irParaPeca && irParaPeca(p.id),
      })),
    ];
    return linhas.sort((a, b) => b.data.localeCompare(a.data));
  }, [despesasPagasDoMes, recebidosCamisariaDoMes, recebidosAlfaiatariaDoMes, irParaPedido, irParaPeca]);

  return (
    <div>
      <PageTitle eyebrow="Financeiro — tudo num só lugar" title="Contabilidade" />

      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => setMesSelecionado(mesAnteriorDe(mesSelecionado))}
          className="flex items-center gap-1"
          style={{ background: "#EDEAE0", color: INK, padding: "7px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600 }}
        >
          <ChevronLeft size={14} /> mês anterior
        </button>
        <div style={{ fontSize: 14, fontWeight: 700, minWidth: 160, textAlign: "center" }}>{nomeDoMes(mesSelecionado)}</div>
        <button
          onClick={() => setMesSelecionado(mesSeguinteDe(mesSelecionado))}
          disabled={ehMesAtual}
          className="flex items-center gap-1"
          style={{ background: "#EDEAE0", color: ehMesAtual ? TEXT_MUTED : INK, padding: "7px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, opacity: ehMesAtual ? 0.6 : 1 }}
        >
          mês seguinte <ChevronRight size={14} />
        </button>
        {!ehMesAtual && (
          <button onClick={() => setMesSelecionado(mesRealAtual)} style={{ color: BRASS, fontSize: 12, fontWeight: 600 }}>
            voltar pro mês atual
          </button>
        )}
      </div>

      <div className="grid gap-4 mb-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <StatCard label="Receita recebida no mês" value={brl(totalRecebido)} icon={TrendingUp} accent={VERDE} />
        <StatCard label="Despesas pagas no mês" value={brl(totalDespesasPagas)} icon={TrendingDown} accent={VERMELHO} />
        <StatCard label="Saldo do mês (caixa)" value={brl(saldoDoMes)} icon={Wallet} accent={saldoDoMes >= 0 ? VERDE : VERMELHO} />
        <StatCard label="Faturamento do mês (vendido, pago ou não)" value={brl(faturamentoDoMes)} icon={Wallet} />
      </div>
      <div className="flex items-start gap-2 mb-6 p-3" style={{ background: "#F3EEDF", borderRadius: 8, fontSize: 12, color: TEXT_MUTED }}>
        <Info size={16} style={{ flexShrink: 0, marginTop: 1 }} />
        <div>
          "Recebido"/"Pago" aqui é regime de caixa de verdade (data em que o pagamento foi confirmado no sistema), não
          data do pedido nem vencimento. A mão de obra do Ícaro (peças de alfaiataria) ainda não entra nesse total —
          ela é lançada direto na peça, sem virar despesa com data de pagamento (mesmo já feito pra Fabiana/Milena).
          Sapatos também ainda não tem controle de pagamento, só de status do pedido.
        </div>
      </div>

      <FaturamentoPorMes pedidos={pedidos} pecas={pecas} />

      <Card style={{ padding: 20 }} className="mb-6">
        <div className="fx-serif mb-3" style={{ fontSize: 15, fontWeight: 600 }}>
          Despesas por categoria — {nomeDoMes(mesSelecionado)}
        </div>
        {despesasPorCategoria.length === 0 ? (
          <Empty texto="Nenhuma despesa paga nesse mês." />
        ) : (
          despesasPorCategoria.map(({ categoria, total, itens }, i) => (
            <details key={categoria} style={{ borderBottom: i < despesasPorCategoria.length - 1 ? `1px solid ${LINE}` : "none" }}>
              <summary className="flex items-center justify-between py-1.5" style={{ fontSize: 13, cursor: "pointer" }}>
                <span style={{ fontWeight: i === 0 ? 700 : 500 }}>
                  {categoria} <span style={{ color: TEXT_MUTED, fontWeight: 400 }}>({itens.length})</span>
                </span>
                <span className="fx-mono" style={{ fontWeight: 700, color: VERMELHO }}>
                  {brl(total)}
                </span>
              </summary>
              <div className="pb-2 pl-3">
                {itens.map((d) => (
                  <div key={d.id} className="flex items-center justify-between py-1" style={{ fontSize: 12 }}>
                    <span style={{ color: TEXT_MUTED }}>
                      {fmtData(d.dataPagamento)} · {d.fornecedor || d.descricao}
                    </span>
                    <span className="fx-mono">{brl(totalDespesa(d))}</span>
                  </div>
                ))}
              </div>
            </details>
          ))
        )}
      </Card>

      <Card style={{ padding: 20 }}>
        <div className="fx-serif mb-3 flex items-center gap-2" style={{ fontSize: 15, fontWeight: 600 }}>
          <BookText size={16} color={BRASS} /> Livro do mês — {nomeDoMes(mesSelecionado)} ({livroDoMes.length})
        </div>
        {livroDoMes.length === 0 ? (
          <Empty texto="Nada confirmado (pago ou recebido) nesse mês ainda." />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  {["Data", "Descrição", "Tipo", "Valor"].map((h) => (
                    <th key={h} style={{ textAlign: "left", color: TEXT_MUTED, fontWeight: 600, fontSize: 11, padding: "0 10px 8px" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {livroDoMes.map((l, i) => (
                  <tr
                    key={i}
                    onClick={l.onClick || undefined}
                    style={{ borderBottom: `1px solid ${LINE}`, cursor: l.onClick ? "pointer" : "default" }}
                  >
                    <td className="fx-mono" style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>
                      {fmtData(l.data)}
                    </td>
                    <td style={{ padding: "8px 10px" }}>{l.descricao}</td>
                    <td style={{ padding: "8px 10px", color: TEXT_MUTED }}>{l.tipo}</td>
                    <td className="fx-mono" style={{ padding: "8px 10px", fontWeight: 700, color: l.valor >= 0 ? VERDE : VERMELHO, whiteSpace: "nowrap" }}>
                      {l.valor >= 0 ? "+ " : "− "}
                      {brl(Math.abs(l.valor))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
