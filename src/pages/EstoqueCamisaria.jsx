import React, { useEffect, useState } from "react";
import { AlertTriangle, ArrowDownCircle, ArrowUpCircle, ChevronDown, ChevronUp, MessageCircle, Package, Pencil, Plus, Shirt, TrendingDown, TrendingUp, Trash2, Wallet } from "lucide-react";
import { Card, Empty, Field, PageTitle, Pill, StatCard } from "../components/ui";
import { BRASS, FORNECEDORES_TECIDO, INK, LINE, TEXT_MUTED, inputStyle } from "../lib/constants";
import { brl, fmtData, mediaCamisasVendidasPorMes } from "../lib/helpers";
import { useConfigPrecoCamisa } from "../hooks/useConfigPrecoCamisa";
import { supabase } from "../supabaseClient";

const VERMELHO = "#9C4A1E";
const VERDE = "#2C6E31";
const CHAVE_TELEFONE_FABI = "telefone_fabi";

export default function EstoqueCamisaria({
  estoque,
  movimentos,
  precosHistorico,
  consumoPorTecido,
  pedidos = [],
  onCadastrar,
  onRegistrarCompra,
  onAtualizarValorMetro,
  onAtualizarPrecoVenda,
  onRemover,
  custoAviamentosPorPecaBase = {},
}) {
  const [mostrarForm, setMostrarForm] = useState(false);
  const [historicoAberto, setHistoricoAberto] = useState(null);
  const [novoCodigo, setNovoCodigo] = useState("");
  const [novoFornecedor, setNovoFornecedor] = useState("");
  const [novoMetrosPorRolo, setNovoMetrosPorRolo] = useState("30");
  const [novoValorMetro, setNovoValorMetro] = useState("");
  const [novoPrecoVenda, setNovoPrecoVenda] = useState("");
  const [comprando, setComprando] = useState(null);
  const [rolos, setRolos] = useState("1");
  const [valorMetroCompra, setValorMetroCompra] = useState("");
  const [editandoValor, setEditandoValor] = useState(null);
  const [valorEditado, setValorEditado] = useState("");
  const [editandoPrecoVenda, setEditandoPrecoVenda] = useState(null);
  const [precoVendaEditado, setPrecoVendaEditado] = useState("");
  const [erro, setErro] = useState(null);
  const [telefoneFabi, setTelefoneFabi] = useState(null);
  const { metragemPadrao, maoDeObraPadrao, margemPadrao } = useConfigPrecoCamisa();

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("config").select("valor").eq("chave", CHAVE_TELEFONE_FABI).maybeSingle();
      setTelefoneFabi(data?.valor || null);
    })();
  }, []);

  // Relatório só com código e saldo em metros — de propósito sem valor
  // por metro, valor em estoque nem nada de gestão, pra poder mandar pra
  // Fabi acompanhar o que tem disponível sem expor preço/custo.
  function mensagemEstoqueFabi() {
    const disponiveis = [...estoque].filter((e) => e.saldoMetros > 0).sort((a, b) => a.codigo.localeCompare(b.codigo));
    const linhas = disponiveis.map((e) => `${e.codigo} — ${e.saldoMetros.toFixed(1)}m`).join("\n");
    return `Estoque de tecido disponível:\n${linhas}`;
  }

  const totalMetros = estoque.reduce((s, e) => s + e.saldoMetros, 0);
  const valorTotalEstoque = estoque.reduce((s, e) => s + e.saldoMetros * (e.valorMetro || 0), 0);
  const baixoEstoque = estoque.filter((e) => e.saldoMetros < e.metrosPorRolo);

  // Potencial de faturamento — se todo esse tecido virar camisa (mesma
  // conta da Estimativa de Custo do Pedido: metragem padrão × valor/metro
  // + aviamento + mão de obra da Fabi = custo; custo × margem padrão =
  // preço de venda). É uma estimativa (assume tudo virando camisa, com o
  // padrão configurado) — tecido que vai pra alfaiataria usa outra
  // metragem, não entra certinho nessa conta.
  const metragemNum = parseFloat(String(metragemPadrao).replace(",", ".")) || 0;
  const maoDeObraNum = parseFloat(maoDeObraPadrao) || 0;
  const margemNum = parseFloat(margemPadrao) || 0;
  const custoAviamentoCamisa = custoAviamentosPorPecaBase["Camisa"] || 0;

  // Preço por camisa: usa o preço de venda fixo cadastrado nesse tecido
  // (ex: R$790 chinês x R$690 nacional) quando tiver — senão cai pra
  // sugestão de margem padrão configurada (custo × margem), igual antes.
  function potencialDe(item) {
    if (!item.valorMetro || metragemNum <= 0) return null;
    const camisasPossiveis = Math.floor(item.saldoMetros / metragemNum);
    if (camisasPossiveis <= 0) return null;
    const custoPorCamisa = item.valorMetro * metragemNum + custoAviamentoCamisa + maoDeObraNum;
    const precoPorCamisa = item.precoVendaCamisa || custoPorCamisa * (1 + margemNum / 100);
    const faturamento = camisasPossiveis * precoPorCamisa;
    const custoTotal = camisasPossiveis * custoPorCamisa;
    return { camisasPossiveis, faturamento, margem: faturamento - custoTotal };
  }

  const potenciais = estoque.map((item) => ({ item, pot: potencialDe(item) })).filter((x) => x.pot);
  const totalCamisasPossiveis = potenciais.reduce((s, x) => s + x.pot.camisasPossiveis, 0);
  const totalFaturamentoPotencial = potenciais.reduce((s, x) => s + x.pot.faturamento, 0);
  const totalMargemPotencial = potenciais.reduce((s, x) => s + x.pot.margem, 0);

  // Projeção de margem mensal: pega o ritmo real de vendas (média dos
  // últimos 3 meses fechados) e projeta quanto tempo esse estoque dura e
  // quanto de margem variável (tecido+aviamento+mão de obra já
  // descontados) ele renderia por mês nesse ritmo — não inclui custo
  // fixo/imposto, que já saem quase o mesmo todo mês independente do
  // volume vendido (isso já está no DRE).
  const mediaMensalVendas = mediaCamisasVendidasPorMes(pedidos, 3);
  const margemPorCamisaMedia = totalCamisasPossiveis > 0 ? totalMargemPotencial / totalCamisasPossiveis : 0;
  const mesesDeEstoque = mediaMensalVendas > 0 ? totalCamisasPossiveis / mediaMensalVendas : null;
  const margemMensalProjetada = mediaMensalVendas > 0 ? Math.min(mediaMensalVendas, totalCamisasPossiveis) * margemPorCamisaMedia : 0;

  const ranking = (consumoPorTecido || [])
    .map((c) => ({ ...c, codigo: estoque.find((e) => e.id === c.estoqueId)?.codigo || "Tecido removido" }))
    .sort((a, b) => b.totalMetros - a.totalMetros)
    .slice(0, 10);
  const maxConsumo = Math.max(1, ...ranking.map((r) => r.totalMetros));

  async function cadastrar(e) {
    e.preventDefault();
    if (!novoCodigo.trim()) return;
    setErro(null);
    try {
      await onCadastrar(novoCodigo, novoFornecedor, novoMetrosPorRolo, novoValorMetro, novoPrecoVenda);
      setNovoCodigo("");
      setNovoFornecedor("");
      setNovoMetrosPorRolo("30");
      setNovoValorMetro("");
      setNovoPrecoVenda("");
      setMostrarForm(false);
    } catch (e) {
      setErro("Não consegui cadastrar (" + e.message + ").");
    }
  }

  async function salvarPrecoVendaEditado(item) {
    try {
      await onAtualizarPrecoVenda(item.id, precoVendaEditado);
      setEditandoPrecoVenda(null);
      setPrecoVendaEditado("");
    } catch (e) {
      setErro("Não consegui atualizar o preço de venda (" + e.message + ").");
    }
  }

  async function comprar(item) {
    const metros = (parseFloat(rolos) || 0) * item.metrosPorRolo;
    if (metros <= 0) return;
    try {
      await onRegistrarCompra(item.id, metros, `Compra de ${rolos} rolo(s) — ${item.fornecedor || "fornecedor não informado"}`, valorMetroCompra);
      setComprando(null);
      setRolos("1");
      setValorMetroCompra("");
    } catch (e) {
      setErro("Não consegui registrar a compra (" + e.message + ").");
    }
  }

  async function salvarValorEditado(item) {
    try {
      await onAtualizarValorMetro(item.id, valorEditado);
      setEditandoValor(null);
      setValorEditado("");
    } catch (e) {
      setErro("Não consegui atualizar o valor (" + e.message + ").");
    }
  }

  return (
    <div>
      <PageTitle eyebrow="Camisaria + Alfaiataria — controle de rolos comprados antecipado" title="Estoque de Tecido" />

      <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <StatCard label="Tecidos rastreados" value={estoque.length} icon={Package} />
        <StatCard label="Total em estoque (m)" value={totalMetros.toFixed(1)} icon={Package} />
        <StatCard label="Estoque baixo (< 1 rolo)" value={baixoEstoque.length} icon={AlertTriangle} accent={baixoEstoque.length > 0 ? VERMELHO : undefined} />
        <StatCard label="Valor total em estoque" value={brl(valorTotalEstoque)} icon={Wallet} />
      </div>

      <Card style={{ padding: 16 }} className="mb-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="fx-serif" style={{ fontSize: 14, fontWeight: 600 }}>
              Relatório de estoque pra Fabi
            </div>
            <div style={{ fontSize: 11, color: TEXT_MUTED }}>
              Só código e quantos metros tem disponível de cada um — sem valor nem nenhuma informação de gestão.
            </div>
          </div>
          {telefoneFabi ? (
            <a
              href={`https://wa.me/${telefoneFabi.replace(/\D/g, "")}?text=${encodeURIComponent(mensagemEstoqueFabi())}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2"
              style={{ background: "#25D366", color: "#FFF", padding: "9px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13, width: "fit-content", flexShrink: 0 }}
            >
              <MessageCircle size={15} /> Enviar pra Fabi
            </a>
          ) : (
            <span style={{ fontSize: 12, color: TEXT_MUTED }}>Telefone da Fabi não cadastrado — adicione em Configurações.</span>
          )}
        </div>
      </Card>

      {totalCamisasPossiveis > 0 && (
        <Card style={{ padding: 20 }} className="mb-6">
          <div className="fx-serif mb-1" style={{ fontSize: 15, fontWeight: 600 }}>
            Potencial de faturamento desse estoque
          </div>
          <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 14 }}>
            Se todo esse tecido virar camisa — usa o preço de venda fixo cadastrado por tecido quando tiver, senão a
            margem padrão configurada em "Preço de venda" (metragem e mão de obra também são as configuradas ali) —
            tecido que for pra alfaiataria usa outra metragem e não entra certinho nessa conta.
          </div>
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
            <StatCard label="Camisas possíveis" value={String(totalCamisasPossiveis)} icon={Shirt} />
            <StatCard label="Faturamento potencial" value={brl(totalFaturamentoPotencial)} icon={TrendingUp} accent={BRASS} />
            <StatCard label="Margem potencial" value={brl(totalMargemPotencial)} icon={Wallet} accent={totalMargemPotencial >= 0 ? VERDE : VERMELHO} />
          </div>
        </Card>
      )}

      {totalCamisasPossiveis > 0 && (
        <Card style={{ padding: 20 }} className="mb-6">
          <div className="fx-serif mb-1" style={{ fontSize: 15, fontWeight: 600 }}>
            Projeção de margem mensal com esse estoque
          </div>
          <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 14 }}>
            {mediaMensalVendas > 0
              ? `Baseado na média de ${mediaMensalVendas.toFixed(0)} camisa(s)/mês vendidas nos últimos 3 meses fechados. Já desconta tecido, aviamento e mão de obra da Fabi — não inclui custo fixo (aluguel, luz, pró-labore) nem impostos, que saem quase o mesmo todo mês independente do volume vendido: pra ver o resultado líquido completo, olha no DRE.`
              : "Sem pedidos suficientes nos últimos 3 meses fechados pra calcular um ritmo médio de vendas ainda."}
          </div>
          {mediaMensalVendas > 0 ? (
            <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
              <StatCard label="Ritmo médio de vendas" value={`${mediaMensalVendas.toFixed(0)} camisas/mês`} icon={Shirt} />
              <StatCard label="Esse estoque dura" value={mesesDeEstoque !== null ? `~${mesesDeEstoque.toFixed(1)} meses` : "—"} icon={Package} />
              <StatCard label="Margem variável projetada/mês" value={brl(margemMensalProjetada)} icon={TrendingUp} accent={BRASS} />
            </div>
          ) : (
            <Empty texto="Assim que tiver pedidos lançados em meses anteriores, a projeção aparece aqui." />
          )}
        </Card>
      )}

      <button
        onClick={() => setMostrarForm((v) => !v)}
        className="flex items-center gap-2 mb-5"
        style={{ background: mostrarForm ? "#EDEAE0" : INK, color: mostrarForm ? INK : "#FFF", padding: "9px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13 }}
      >
        <Plus size={15} style={mostrarForm ? { transform: "rotate(45deg)" } : {}} />
        {mostrarForm ? "Cancelar" : "Cadastrar tecido no estoque"}
      </button>

      {mostrarForm && (
        <Card style={{ padding: 20 }} className="mb-6">
          <form onSubmit={cadastrar}>
            <div className="grid gap-3 mb-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
              <Field label="Código do tecido">
                <input style={inputStyle} value={novoCodigo} onChange={(e) => setNovoCodigo(e.target.value)} placeholder="Ex: CTG-104" required />
              </Field>
              <Field label="Fornecedor">
                <input style={inputStyle} list="lista-fornecedores-estoque" value={novoFornecedor} onChange={(e) => setNovoFornecedor(e.target.value)} placeholder="Ex: Cataguases" />
                <datalist id="lista-fornecedores-estoque">
                  {FORNECEDORES_TECIDO.map((f) => (
                    <option key={f} value={f} />
                  ))}
                </datalist>
              </Field>
              <Field label="Metros por rolo">
                <input type="number" step="0.5" style={inputStyle} value={novoMetrosPorRolo} onChange={(e) => setNovoMetrosPorRolo(e.target.value)} />
              </Field>
              <Field label="Valor por metro (R$)">
                <input type="number" step="0.01" min="0" style={inputStyle} placeholder="ex: 45,90" value={novoValorMetro} onChange={(e) => setNovoValorMetro(e.target.value)} />
              </Field>
              <Field label="Preço de venda por camisa (R$)">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  style={inputStyle}
                  placeholder="opcional — ex: 790"
                  value={novoPrecoVenda}
                  onChange={(e) => setNovoPrecoVenda(e.target.value)}
                />
              </Field>
            </div>
            {erro && <div className="mb-2" style={{ fontSize: 12, color: VERMELHO }}>{erro}</div>}
            <button type="submit" style={{ background: INK, color: "#FFF", padding: "8px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13 }}>
              Cadastrar
            </button>
          </form>
        </Card>
      )}

      {estoque.length === 0 && (
        <Card style={{ padding: 20 }} className="mb-6">
          <Empty texto="Nenhum tecido rastreado em estoque ainda." />
        </Card>
      )}

      <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
        {estoque.map((item) => {
          const alerta = item.saldoMetros < item.metrosPorRolo;
          return (
            <Card key={item.id} style={{ padding: 18 }}>
              <div className="flex items-center justify-between mb-1">
                <div style={{ fontWeight: 600, fontSize: 15 }}>{item.codigo}</div>
                <button onClick={() => onRemover(item.id)} title="Remover do estoque">
                  <Trash2 size={14} color={VERMELHO} />
                </button>
              </div>
              <div style={{ fontSize: 12, color: TEXT_MUTED }} className="mb-2">
                {item.fornecedor || "Fornecedor não informado"} · rolo de {item.metrosPorRolo}m
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className="fx-serif" style={{ fontSize: 24, fontWeight: 700, color: alerta ? VERMELHO : INK }}>
                  {item.saldoMetros.toFixed(1)}m
                </span>
                {alerta && <Pill text="estoque baixo" style={{ bg: "#F6E3D9", fg: VERMELHO }} />}
              </div>

              {editandoValor === item.id ? (
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    style={{ ...inputStyle, width: 90 }}
                    placeholder="R$/metro"
                    value={valorEditado}
                    onChange={(e) => setValorEditado(e.target.value)}
                    autoFocus
                  />
                  <button onClick={() => salvarValorEditado(item)} style={{ background: "#2C6E31", color: "#FFF", padding: "5px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
                    salvar
                  </button>
                  <button onClick={() => setEditandoValor(null)} style={{ color: TEXT_MUTED, fontSize: 12 }}>
                    cancelar
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 mb-3 flex-wrap" style={{ fontSize: 12, color: TEXT_MUTED }}>
                  {item.valorMetro ? (
                    <>
                      <span>
                        R$/metro <strong style={{ color: INK }}>{brl(item.valorMetro)}</strong> · valor em estoque{" "}
                        <strong style={{ color: INK }}>{brl(item.saldoMetros * item.valorMetro)}</strong>
                      </span>
                    </>
                  ) : (
                    <span>Sem valor/metro cadastrado</span>
                  )}
                  <button
                    onClick={() => {
                      setEditandoValor(item.id);
                      setValorEditado(item.valorMetro || "");
                    }}
                    title="Editar valor por metro"
                  >
                    <Pencil size={12} color={BRASS} />
                  </button>
                </div>
              )}

              {editandoPrecoVenda === item.id ? (
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    style={{ ...inputStyle, width: 90 }}
                    placeholder="R$ venda/camisa"
                    value={precoVendaEditado}
                    onChange={(e) => setPrecoVendaEditado(e.target.value)}
                    autoFocus
                  />
                  <button
                    onClick={() => salvarPrecoVendaEditado(item)}
                    style={{ background: "#2C6E31", color: "#FFF", padding: "5px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600 }}
                  >
                    salvar
                  </button>
                  <button onClick={() => setEditandoPrecoVenda(null)} style={{ color: TEXT_MUTED, fontSize: 12 }}>
                    cancelar
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 mb-3 flex-wrap" style={{ fontSize: 12, color: TEXT_MUTED }}>
                  {item.precoVendaCamisa ? (
                    <span>
                      Preço de venda/camisa <strong style={{ color: INK }}>{brl(item.precoVendaCamisa)}</strong>
                    </span>
                  ) : (
                    <span>Sem preço de venda fixo (usa margem padrão pra estimar)</span>
                  )}
                  <button
                    onClick={() => {
                      setEditandoPrecoVenda(item.id);
                      setPrecoVendaEditado(item.precoVendaCamisa || "");
                    }}
                    title="Editar preço de venda por camisa"
                  >
                    <Pencil size={12} color={BRASS} />
                  </button>
                </div>
              )}

              {(precosHistorico || []).some((h) => h.estoque_id === item.id) && (
                <div className="mb-3">
                  <button
                    type="button"
                    onClick={() => setHistoricoAberto(historicoAberto === item.id ? null : item.id)}
                    className="flex items-center gap-1"
                    style={{ color: BRASS, fontSize: 11, fontWeight: 600 }}
                  >
                    {historicoAberto === item.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    Histórico de preço
                  </button>
                  {historicoAberto === item.id && (
                    <div className="mt-2 flex flex-col gap-1">
                      {precosHistorico
                        .filter((h) => h.estoque_id === item.id)
                        .map((h, i, arr) => {
                          const anterior = arr[i + 1];
                          const delta = anterior ? h.valor_metro - anterior.valor_metro : null;
                          return (
                            <div key={h.id} className="flex items-center justify-between" style={{ fontSize: 11, color: TEXT_MUTED }}>
                              <span>{fmtData(h.criado_em.slice(0, 10))}</span>
                              <span className="flex items-center gap-1">
                                <strong style={{ color: INK }}>{brl(h.valor_metro)}</strong>
                                {delta != null && Math.abs(delta) >= 0.005 && (delta > 0 ? <TrendingUp size={11} color={VERMELHO} /> : <TrendingDown size={11} color={VERDE} />)}
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              )}

              {potencialDe(item) && (
                <div className="mb-3" style={{ fontSize: 11.5, color: TEXT_MUTED }}>
                  Dá pra fazer <strong style={{ color: INK }}>~{potencialDe(item).camisasPossiveis} camisa(s)</strong> · faturamento
                  estimado <strong style={{ color: BRASS }}>{brl(potencialDe(item).faturamento)}</strong>
                </div>
              )}

              {comprando === item.id ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <input
                      type="number"
                      step="1"
                      min="1"
                      style={{ ...inputStyle, width: 70 }}
                      value={rolos}
                      onChange={(e) => setRolos(e.target.value)}
                    />
                    <span style={{ fontSize: 12, color: TEXT_MUTED }}>rolo(s) = {((parseFloat(rolos) || 0) * item.metrosPorRolo).toFixed(1)}m</span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    style={{ ...inputStyle, width: 140 }}
                    placeholder={item.valorMetro ? `R$/metro (${brl(item.valorMetro)})` : "R$/metro dessa compra"}
                    value={valorMetroCompra}
                    onChange={(e) => setValorMetroCompra(e.target.value)}
                  />
                  <div className="flex items-center gap-2">
                    <button onClick={() => comprar(item)} style={{ background: "#2C6E31", color: "#FFF", padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
                      Confirmar
                    </button>
                    <button
                      onClick={() => {
                        setComprando(null);
                        setValorMetroCompra("");
                      }}
                      style={{ color: TEXT_MUTED, fontSize: 12 }}
                    >
                      cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setComprando(item.id)}
                  className="flex items-center gap-1"
                  style={{ background: "#EDEAE0", color: INK, padding: "7px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600 }}
                >
                  <ArrowUpCircle size={13} /> Registrar compra
                </button>
              )}
            </Card>
          );
        })}
      </div>

      {ranking.length > 0 && (
        <Card style={{ padding: 20 }} className="mb-6">
          <div className="fx-serif mb-1" style={{ fontSize: 15, fontWeight: 600 }}>
            Tecidos que mais saem (consumo total)
          </div>
          <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 16 }}>
            Soma de todas as baixas já registradas por código — ajuda a decidir o que reabastecer primeiro.
          </div>
          {ranking.map((r) => (
            <div key={r.estoqueId} className="mb-2">
              <div className="flex justify-between mb-1" style={{ fontSize: 12 }}>
                <span style={{ fontWeight: 600 }}>{r.codigo}</span>
                <span className="fx-mono" style={{ fontWeight: 700 }}>{r.totalMetros.toFixed(1)}m</span>
              </div>
              <div style={{ background: LINE, borderRadius: 4, height: 10 }}>
                <div style={{ width: `${(r.totalMetros / maxConsumo) * 100}%`, background: BRASS, height: 10, borderRadius: 4 }} />
              </div>
            </div>
          ))}
        </Card>
      )}

      {movimentos.length > 0 && (
        <Card style={{ padding: 20 }}>
          <div className="fx-serif mb-3" style={{ fontSize: 15, fontWeight: 600 }}>
            Histórico de movimentações
          </div>
          {movimentos.map((m, i) => {
            const item = estoque.find((e) => e.id === m.estoque_id);
            return (
              <div key={m.id} className="flex items-center justify-between py-2" style={{ borderBottom: i < movimentos.length - 1 ? `1px solid ${LINE}` : "none" }}>
                <div className="flex items-center gap-2">
                  {m.tipo === "entrada" ? <ArrowUpCircle size={14} color="#2C6E31" /> : <ArrowDownCircle size={14} color={BRASS} />}
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{item?.codigo || "Tecido removido"}</div>
                    <div style={{ fontSize: 11, color: TEXT_MUTED }}>
                      {m.motivo} · {fmtData(m.criado_em.slice(0, 10))}
                    </div>
                  </div>
                </div>
                <span className="fx-mono" style={{ fontSize: 13, fontWeight: 600, color: m.tipo === "entrada" ? "#2C6E31" : BRASS }}>
                  {m.tipo === "entrada" ? "+" : "-"}
                  {parseFloat(m.metros).toFixed(1)}m
                </span>
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}
