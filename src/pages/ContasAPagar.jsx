import React, { useEffect, useState } from "react";
import { CheckCircle2, PiggyBank, Plus, Trash2, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { Card, Empty, Field, PageTitle, StatCard } from "../components/ui";
import { BRASS, CATEGORIAS_DESPESA, INK, LINE, TEXT_MUTED, inputStyle } from "../lib/constants";
import { brl, fmtData, hojeISO, valorRecebidoEfetivo } from "../lib/helpers";
import { supabase } from "../supabaseClient";

const VERMELHO = "#9C4A1E";
const VERDE = "#2C6E31";
const CHAVE_CAIXA = "caixa_atual";

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
  notas,
  onCriarDespesa,
  onMarcarPaga,
  onAtualizarValorPago,
  onRemoverDespesa,
  onCriarPrevisao,
  onRemoverPrevisao,
  onCriarNota,
  onRemoverNota,
  irParaPedido,
  irParaPeca,
}) {
  const [verTudo, setVerTudo] = useState(false);
  const [formDespesa, setFormDespesa] = useState(false);
  const [nova, setNova] = useState({ descricao: "", categoria: "", valor: "", vencimento: hojeISO(), recorrente: false });
  const [formPrevisao, setFormPrevisao] = useState(false);
  const [novaPrevisao, setNovaPrevisao] = useState({ descricao: "", valor: "", dataEsperada: hojeISO() });
  const [formNota, setFormNota] = useState(false);
  const [novaNota, setNovaNota] = useState({ descricao: "", valor: "", dataEsperada: "" });
  const [editandoDespesa, setEditandoDespesa] = useState(null);
  const [valorPagoEdit, setValorPagoEdit] = useState("");
  const [erro, setErro] = useState(null);
  const [caixaAtual, setCaixaAtual] = useState("");
  const [caixaSalvo, setCaixaSalvo] = useState(null);

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

  // Só entra na conta (e no filtro de 14 dias) quem tem previsão de entrega
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
  const despesasJanela = despesasPendentes.filter((d) => dentroDaJanela(d.vencimento)).sort((a, b) => a.vencimento.localeCompare(b.vencimento));
  const receberJanela = receberComPrevisao.filter((p) => dentroDaJanela(p.dataRef));
  const previsoesJanela = previsoes.filter((p) => dentroDaJanela(p.dataEsperada));

  const totalDespesas = despesasJanela.reduce((s, d) => s + Math.max(0, (parseFloat(d.valor) || 0) - (parseFloat(d.valorPago) || 0)), 0);
  const totalReceita = receberJanela.reduce((s, p) => s + p.pendente, 0) + previsoesJanela.reduce((s, p) => s + (parseFloat(p.valor) || 0), 0);
  const caixaNum = parseFloat(caixaAtual) || 0;
  // Saldo projetado = o que já tenho em caixa + o que ainda vou receber - o
  // que ainda vou pagar. Falta faturar = quanto de venda nova (fora do que
  // já está previsto) eu preciso pra cobrir a despesa com o caixa que tenho.
  const saldo = caixaNum + totalReceita - totalDespesas;
  const faltaFaturar = Math.max(0, totalDespesas - caixaNum - totalReceita);

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

  async function salvarValorPago(id) {
    setErro(null);
    try {
      await onAtualizarValorPago(id, valorPagoEdit);
      setEditandoDespesa(null);
    } catch (e) {
      setErro("Não consegui salvar (" + e.message + ").");
    }
  }

  function abrirEdicaoValorPago(d) {
    if (editandoDespesa === d.id) {
      setEditandoDespesa(null);
      return;
    }
    setEditandoDespesa(d.id);
    setValorPagoEdit(String(d.valorPago || ""));
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

      <div className="grid gap-4 mb-8" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>
        <StatCard label="Caixa atual" value={brl(caixaNum)} icon={PiggyBank} />
        <StatCard label="A pagar no período" value={brl(totalDespesas)} icon={TrendingDown} accent={VERMELHO} />
        <StatCard label="A receber no período" value={brl(totalReceita)} icon={TrendingUp} accent={VERDE} />
        <StatCard label="Saldo projetado" value={brl(saldo)} icon={Wallet} accent={saldo < 0 ? VERMELHO : VERDE} />
        <StatCard label="Falta faturar" value={brl(faltaFaturar)} icon={TrendingUp} accent={faltaFaturar > 0 ? VERMELHO : VERDE} />
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
            const pendente = Math.max(0, (parseFloat(d.valor) || 0) - (parseFloat(d.valorPago) || 0));
            const editando = editandoDespesa === d.id;
            return (
              <div key={d.id} className="py-2" style={{ borderBottom: `1px solid ${LINE}` }}>
                <div className="flex items-center justify-between">
                  <button onClick={() => abrirEdicaoValorPago(d)} style={{ textAlign: "left" }} title="Ver/editar valor pago">
                    <div style={{ fontSize: 13, fontWeight: 600 }}>
                      {d.descricao} {d.recorrente && "↻"}
                    </div>
                    <div style={{ fontSize: 11, color: atrasada ? VERMELHO : TEXT_MUTED }}>
                      {d.categoria ? `${d.categoria} · ` : ""}vence {fmtData(d.vencimento)}
                      {atrasada ? " — atrasada" : ""}
                    </div>
                  </button>
                  <div className="flex items-center gap-2">
                    <div style={{ textAlign: "right" }}>
                      <span className="fx-mono" style={{ fontSize: 13, fontWeight: 600 }}>
                        {brl(pendente)}
                      </span>
                      {d.status === "Parcial" && (
                        <div style={{ fontSize: 10, color: TEXT_MUTED }}>
                          {brl(d.valorPago)} de {brl(d.valor)} pago
                        </div>
                      )}
                    </div>
                    <button onClick={() => onMarcarPaga(d.id)} title="Marcar como totalmente paga">
                      <CheckCircle2 size={16} color={VERDE} />
                    </button>
                    <button onClick={() => onRemoverDespesa(d.id)} title="Remover">
                      <Trash2 size={14} color={VERMELHO} />
                    </button>
                  </div>
                </div>
                {editando && (
                  <div className="flex items-center gap-2 mt-2 p-2 flex-wrap" style={{ background: "#F3EEDF", borderRadius: 6 }}>
                    <span style={{ fontSize: 11, color: TEXT_MUTED }}>Valor pago até agora (de {brl(d.valor)}):</span>
                    <input
                      type="number"
                      step="0.01"
                      style={{ ...inputStyle, width: 100 }}
                      value={valorPagoEdit}
                      onChange={(e) => setValorPagoEdit(e.target.value)}
                    />
                    <button
                      onClick={() => salvarValorPago(d.id)}
                      style={{ background: INK, color: "#FFF", padding: "5px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600 }}
                    >
                      Salvar
                    </button>
                  </div>
                )}
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
