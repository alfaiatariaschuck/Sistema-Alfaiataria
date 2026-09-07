import React, { useEffect, useMemo, useState } from "react";
import { Award, CheckCircle2, ChevronDown, ChevronUp, Gift, Trophy } from "lucide-react";
import { Card, Empty, PageTitle, Pill } from "../components/ui";
import { BRASS, BRASS_SOFT, FAIXAS_INDICACAO, INK, LINE, TEXT_MUTED } from "../lib/constants";
import { adicionarHistoricoCliente } from "../lib/clientes";
import { supabase } from "../supabaseClient";

const VERDE = "#2C6E31";

function faixaAtualDe(totalPecas) {
  let atual = null;
  for (const f of FAIXAS_INDICACAO) {
    if (totalPecas >= f.pecas) atual = f;
  }
  return atual;
}
function proximaFaixaDe(totalPecas) {
  return FAIXAS_INDICACAO.find((f) => totalPecas < f.pecas) || null;
}

// Ranking de quem mais indicou clientes que viraram venda de verdade —
// direto do critério combinado com o Tales e a Ana: soma de peças
// (camisa + alfaiataria) de TODOS os clientes que essa pessoa indicou,
// acumulado (nunca zera), com prêmio físico a cada faixa batida
// (voucher, camisa de cortesia etc — ver FAIXAS_INDICACAO). "Indicado
// por" precisa estar linkado por cliente (indicadoPorClienteId) — texto
// solto sem match não entra no ranking, só aparece na ficha do cliente.
//
// As peças fechadas vêm da view "pecas_fechadas_por_cliente" (não dos
// pedidos/peças que o navegador consegue ler) — isso importa de
// verdade: o login do vendedor só enxerga, por RLS, os pedidos que ele
// mesmo criou, então somar a partir disso daria um número ERRADO
// (menor) sempre que um cliente indicado tiver comprado por outro
// caminho. A view já vem com o total certo, igual pra qualquer login.
export default function RankingIndicacao({ clientesBase, podeMarcarEntregue = true }) {
  const [pecasPorCliente, setPecasPorCliente] = useState(new Map());
  const [entregues, setEntregues] = useState(new Map());
  const [carregando, setCarregando] = useState(true);
  const [expandido, setExpandido] = useState(null);
  const [marcando, setMarcando] = useState(null);

  const ranking = useMemo(() => {
    const porId = new Map((clientesBase || []).map((c) => [c.id, c]));
    const porIndicador = new Map();
    (clientesBase || []).forEach((c) => {
      if (!c.indicadoPorClienteId) return;
      const indicador = porId.get(c.indicadoPorClienteId);
      if (!indicador) return;
      const pecas = pecasPorCliente.get(c.id) || 0;
      if (!porIndicador.has(indicador.id)) {
        porIndicador.set(indicador.id, { id: indicador.id, nome: indicador.nome, indicados: [] });
      }
      porIndicador.get(indicador.id).indicados.push({ id: c.id, nome: c.nome, pecas });
    });
    return [...porIndicador.values()]
      .map((r) => ({
        ...r,
        totalPecas: r.indicados.reduce((s, i) => s + i.pecas, 0),
        totalClientes: r.indicados.length,
      }))
      .filter((r) => r.totalPecas > 0)
      .sort((a, b) => b.totalPecas - a.totalPecas);
  }, [clientesBase, pecasPorCliente]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("pecas_fechadas_por_cliente").select("cliente_id, pecas");
      setPecasPorCliente(new Map((data || []).map((row) => [row.cliente_id, row.pecas])));
      setCarregando(false);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const ids = ranking.map((r) => r.id);
      if (ids.length === 0) return;
      const { data } = await supabase.from("clientes_historico").select("cliente_id, marco").in("cliente_id", ids).not("marco", "is", null);
      const mapa = new Map();
      (data || []).forEach((row) => {
        if (!mapa.has(row.cliente_id)) mapa.set(row.cliente_id, new Set());
        mapa.get(row.cliente_id).add(row.marco);
      });
      setEntregues(mapa);
    })();
    // eslint-disable-next-line
  }, [ranking.map((r) => r.id).join(",")]);

  async function marcarEntregue(indicadorId, faixa) {
    setMarcando(`${indicadorId}-${faixa.chave}`);
    try {
      await adicionarHistoricoCliente(indicadorId, `Prêmio de indicação entregue: ${faixa.label} (${faixa.pecas} peças indicadas)`, faixa.chave);
      const { data } = await supabase.from("clientes_historico").select("cliente_id, marco").in("cliente_id", ranking.map((r) => r.id)).not("marco", "is", null);
      const mapa = new Map();
      (data || []).forEach((row) => {
        if (!mapa.has(row.cliente_id)) mapa.set(row.cliente_id, new Set());
        mapa.get(row.cliente_id).add(row.marco);
      });
      setEntregues(mapa);
    } finally {
      setMarcando(null);
    }
  }

  return (
    <div>
      <PageTitle eyebrow="Quem indica, ganha" title="Ranking de Indicação" />

      <div className="flex items-start gap-2 mb-6 p-3" style={{ background: "#F3EEDF", borderRadius: 8, fontSize: 12, color: TEXT_MUTED }}>
        <Trophy size={16} color={BRASS} style={{ flexShrink: 0, marginTop: 1 }} />
        <div>
          Soma de peças (camisa + alfaiataria) fechadas por TODOS os clientes que a pessoa indicou, acumulado — nunca
          zera. Só entram aqui indicações linkadas a um cliente já cadastrado (campo "Indicado por" na ficha de
          pedido). Faixas de prêmio:{" "}
          {FAIXAS_INDICACAO.map((f, i) => (
            <span key={f.chave}>
              {i > 0 && " · "}
              <strong style={{ color: INK }}>{f.pecas} peças</strong>: {f.label}
            </span>
          ))}
          .
        </div>
      </div>

      <Card style={{ padding: 0, overflow: "hidden" }}>
        {carregando && <div className="p-6" style={{ fontSize: 13, color: TEXT_MUTED }}>Carregando…</div>}
        {!carregando && ranking.length === 0 && (
          <div className="p-6">
            <Empty texto="Ninguém indicou um cliente que já fechou pedido ainda." />
          </div>
        )}
        {!carregando &&
          ranking.map((r, i) => {
            const faixaAtual = faixaAtualDe(r.totalPecas);
            const proxima = proximaFaixaDe(r.totalPecas);
            const marcosEntregues = entregues.get(r.id) || new Set();
            const aberto = expandido === r.id;
            return (
              <div key={r.id} style={{ borderBottom: i < ranking.length - 1 ? `1px solid ${LINE}` : "none" }}>
                <div className="flex items-center justify-between px-5 py-4 flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex items-center justify-center"
                      style={{ width: 28, height: 28, borderRadius: "50%", background: i === 0 ? BRASS : "#EDEAE0", color: i === 0 ? "#FFF" : INK, fontWeight: 700, fontSize: 13 }}
                    >
                      {i + 1}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{r.nome}</div>
                      <div style={{ fontSize: 11, color: TEXT_MUTED }}>
                        {r.totalClientes} cliente(s) indicado(s) · {r.totalPecas} peça(s) no total
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {faixaAtual && <Pill text={`atingiu: ${faixaAtual.pecas} peças`} style={{ bg: BRASS_SOFT, fg: BRASS }} />}
                    {proxima && (
                      <span style={{ fontSize: 11, color: TEXT_MUTED }}>
                        faltam {proxima.pecas - r.totalPecas} p/ {proxima.pecas}
                      </span>
                    )}
                    <button onClick={() => setExpandido(aberto ? null : r.id)} className="flex items-center gap-1" style={{ color: BRASS, fontSize: 12, fontWeight: 600 }}>
                      {aberto ? "ocultar" : "detalhes"} {aberto ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>
                </div>

                {aberto && (
                  <div className="px-5 pb-4">
                    <div className="mb-3">
                      <div style={{ fontSize: 11, fontWeight: 600, color: TEXT_MUTED, marginBottom: 4 }}>Clientes indicados</div>
                      {r.indicados
                        .slice()
                        .sort((a, b) => b.pecas - a.pecas)
                        .map((ind) => (
                          <div key={ind.id} className="flex items-center justify-between py-1" style={{ fontSize: 12 }}>
                            <span>{ind.nome}</span>
                            <span className="fx-mono" style={{ fontWeight: 600 }}>{ind.pecas} peça(s)</span>
                          </div>
                        ))}
                    </div>

                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: TEXT_MUTED, marginBottom: 4 }}>Prêmios</div>
                      {FAIXAS_INDICACAO.map((f) => {
                        const bateu = r.totalPecas >= f.pecas;
                        const entregue = marcosEntregues.has(f.chave);
                        return (
                          <div key={f.chave} className="flex items-center justify-between py-1.5" style={{ fontSize: 12, opacity: bateu ? 1 : 0.5 }}>
                            <div className="flex items-center gap-1.5">
                              <Gift size={13} color={entregue ? VERDE : bateu ? BRASS : TEXT_MUTED} />
                              <span>
                                {f.pecas} peças — {f.label}
                              </span>
                            </div>
                            {entregue ? (
                              <span className="flex items-center gap-1" style={{ color: VERDE, fontWeight: 600 }}>
                                <CheckCircle2 size={13} /> entregue
                              </span>
                            ) : bateu ? (
                              podeMarcarEntregue ? (
                                <button
                                  onClick={() => marcarEntregue(r.id, f)}
                                  disabled={marcando === `${r.id}-${f.chave}`}
                                  style={{ color: BRASS, fontWeight: 600, textDecoration: "underline" }}
                                >
                                  {marcando === `${r.id}-${f.chave}` ? "marcando…" : "marcar como entregue"}
                                </button>
                              ) : (
                                <span style={{ color: BRASS, fontWeight: 600 }}>batido — aguardando entrega</span>
                              )
                            ) : (
                              <span style={{ color: TEXT_MUTED }}>ainda não bateu</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
      </Card>

      <div className="flex items-center gap-2 mt-4" style={{ fontSize: 11, color: TEXT_MUTED }}>
        <Award size={14} />
        {podeMarcarEntregue
          ? "Marcar como entregue é definitivo pra essa faixa — fica registrado no histórico do cliente indicador, pra nunca dar o mesmo prêmio duas vezes."
          : "Só o Tales confirma a entrega do prêmio por aqui."}
      </div>
    </div>
  );
}
