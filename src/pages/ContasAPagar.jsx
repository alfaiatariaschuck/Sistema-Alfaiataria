import React, { useState } from "react";
import { CheckCircle2, Plus, Trash2, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { Card, Empty, Field, PageTitle, StatCard } from "../components/ui";
import { BRASS, CATEGORIAS_DESPESA, INK, LINE, TEXT_MUTED, inputStyle } from "../lib/constants";
import { brl, fmtData, hojeISO, valorRecebidoEfetivo } from "../lib/helpers";

const VERMELHO = "#9C4A1E";
const VERDE = "#2C6E31";

function somarDias(iso, dias) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

export default function ContasAPagar({
  pedidos,
  pecas,
  despesas,
  previsoes,
  onCriarDespesa,
  onMarcarPaga,
  onRemoverDespesa,
  onCriarPrevisao,
  onRemoverPrevisao,
  irParaPedido,
  irParaPeca,
}) {
  const [verTudo, setVerTudo] = useState(false);
  const [formDespesa, setFormDespesa] = useState(false);
  const [nova, setNova] = useState({ descricao: "", categoria: "", valor: "", vencimento: hojeISO(), recorrente: false });
  const [formPrevisao, setFormPrevisao] = useState(false);
  const [novaPrevisao, setNovaPrevisao] = useState({ descricao: "", valor: "", dataEsperada: hojeISO() });
  const [erro, setErro] = useState(null);

  const hoje = hojeISO();
  const limite14 = somarDias(hoje, 14);
  const dentroDaJanela = (dataISO) => verTudo || (dataISO || hoje) <= limite14;

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

  const receberPendente = [
    ...pedidos
      .filter((p) => parseFloat(p.aReceber.valor) > 0)
      .map((p) => {
        const valor = parseFloat(p.aReceber.valor) || 0;
        const recebido = recebidoEfetivo(p, valor, p.aReceber.statusPagamento);
        return { id: p.id, tipo: "camisa", nome: p.cliente, pendente: Math.max(0, valor - recebido), dataRef: p.previsaoEntrega || p.dataPedido };
      })
      .filter((x) => x.pendente > 0),
    ...(pecas || [])
      .filter((p) => parseFloat(p.valorVenda) > 0)
      .map((p) => {
        const valor = parseFloat(p.valorVenda) || 0;
        const recebido = recebidoEfetivo(p, valor, p.statusPagamentoVenda || "Pendente");
        return { id: p.id, tipo: "peca", nome: p.cliente, pendente: Math.max(0, valor - recebido), dataRef: p.previsaoEntrega || p.dataPedido };
      })
      .filter((x) => x.pendente > 0),
  ];

  const despesasPendentes = despesas.filter((d) => d.status === "Pendente");
  const despesasJanela = despesasPendentes.filter((d) => dentroDaJanela(d.vencimento)).sort((a, b) => a.vencimento.localeCompare(b.vencimento));
  const receberJanela = receberPendente.filter((p) => dentroDaJanela(p.dataRef));
  const previsoesJanela = previsoes.filter((p) => dentroDaJanela(p.dataEsperada));

  const totalDespesas = despesasJanela.reduce((s, d) => s + (parseFloat(d.valor) || 0), 0);
  const totalReceita = receberJanela.reduce((s, p) => s + p.pendente, 0) + previsoesJanela.reduce((s, p) => s + (parseFloat(p.valor) || 0), 0);
  const saldo = totalReceita - totalDespesas;

  async function salvarDespesa(e) {
    e.preventDefault();
    if (!nova.descricao.trim() || !nova.valor) return;
    setErro(null);
    try {
      await onCriarDespesa(nova);
      setNova({ descricao: "", categoria: "", valor: "", vencimento: hojeISO(), recorrente: false });
      setFormDespesa(false);
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

  return (
    <div>
      <PageTitle eyebrow="Financeiro" title="Contas a Pagar" />

      <div className="flex items-center gap-2 mb-5">
        <button
          onClick={() => setVerTudo(false)}
          style={{ background: !verTudo ? INK : "#EDEAE0", color: !verTudo ? "#FFF" : INK, padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600 }}
        >
          Próximos 14 dias
        </button>
        <button
          onClick={() => setVerTudo(true)}
          style={{ background: verTudo ? INK : "#EDEAE0", color: verTudo ? "#FFF" : INK, padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600 }}
        >
          Ver tudo
        </button>
      </div>

      <div className="grid gap-4 mb-8" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>
        <StatCard label="A pagar no período" value={brl(totalDespesas)} icon={TrendingDown} accent={VERMELHO} />
        <StatCard label="A receber no período" value={brl(totalReceita)} icon={TrendingUp} accent={VERDE} />
        <StatCard label="Saldo previsto" value={brl(saldo)} icon={Wallet} accent={saldo < 0 ? VERMELHO : VERDE} />
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
                <Field label="Valor (R$)">
                  <input type="number" step="0.01" style={inputStyle} value={nova.valor} onChange={(e) => setNova({ ...nova, valor: e.target.value })} required />
                </Field>
                <Field label="Vencimento">
                  <input type="date" style={inputStyle} value={nova.vencimento} onChange={(e) => setNova({ ...nova, vencimento: e.target.value })} required />
                </Field>
              </div>
              <label className="flex items-center gap-2 mb-2" style={{ cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={nova.recorrente}
                  onChange={(e) => setNova({ ...nova, recorrente: e.target.checked })}
                  style={{ width: 15, height: 15, accentColor: BRASS }}
                />
                <span style={{ fontSize: 12, fontWeight: 600 }}>Recorrente — ao marcar como paga, já lança a do mês seguinte</span>
              </label>
              <button type="submit" style={{ background: INK, color: "#FFF", padding: "7px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
                Salvar
              </button>
            </form>
          )}

          {despesasJanela.length === 0 && <Empty texto={verTudo ? "Nenhuma despesa pendente." : "Nada vencendo nos próximos 14 dias."} />}
          {despesasJanela.map((d) => {
            const atrasada = d.vencimento < hoje;
            return (
              <div key={d.id} className="flex items-center justify-between py-2" style={{ borderBottom: `1px solid ${LINE}` }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>
                    {d.descricao} {d.recorrente && "↻"}
                  </div>
                  <div style={{ fontSize: 11, color: atrasada ? VERMELHO : TEXT_MUTED }}>
                    {d.categoria ? `${d.categoria} · ` : ""}vence {fmtData(d.vencimento)}
                    {atrasada ? " — atrasada" : ""}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="fx-mono" style={{ fontSize: 13, fontWeight: 600 }}>
                    {brl(d.valor)}
                  </span>
                  <button onClick={() => onMarcarPaga(d.id)} title="Marcar como paga">
                    <CheckCircle2 size={16} color={VERDE} />
                  </button>
                  <button onClick={() => onRemoverDespesa(d.id)} title="Remover">
                    <Trash2 size={14} color={VERMELHO} />
                  </button>
                </div>
              </div>
            );
          })}
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
            <Empty texto={verTudo ? "Nada a receber." : "Nada esperado nos próximos 14 dias."} />
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
                <div key={p.id} className="flex items-center justify-between py-1.5">
                  <div>
                    <div style={{ fontSize: 12 }}>{p.descricao || "Previsão de venda"}</div>
                    <div style={{ fontSize: 11, color: TEXT_MUTED }}>esperado {fmtData(p.dataEsperada)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="fx-mono" style={{ fontSize: 12, fontWeight: 600, color: "#5B3E96" }}>
                      {brl(p.valor)}
                    </span>
                    <button onClick={() => onRemoverPrevisao(p.id)} title="Remover">
                      <Trash2 size={13} color={VERMELHO} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
