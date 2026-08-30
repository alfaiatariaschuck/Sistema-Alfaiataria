import React, { useMemo, useState } from "react";
import { AlertTriangle, BarChart3, ChevronDown, ChevronUp, FileText, LayoutGrid, LogOut, Ruler, Search, Table2 } from "lucide-react";
import { useAuth } from "./contexts/AuthContext";
import { usePecasProducao } from "./hooks/usePecasProducao";
import { useEquipeProducao } from "./hooks/useEquipeProducao";
import { BRASS, CANVAS, INK, INK_SOFT, LINE, MEDIDAS_ALFAIATARIA, PECA_SECOES, STATUS_ALFAIATARIA, TEXT_MUTED, inputStyle } from "./lib/constants";
import { diasProducaoReal, fmtData, hojeISO, mediaDiasProducaoPorTipo, previsaoEfetivaDe, previsaoEstimada, projetarPrevisoesFilaPorEquipe, statusEvento, statusParaEtapa } from "./lib/helpers";
import { Card, Empty } from "./components/ui";
import TabelaControleProducao from "./components/TabelaControleProducao";
import HistoricoProducao from "./pages/HistoricoProducao";
import FichaImprimivelAlfaiataria from "./pages/FichaImprimivelAlfaiataria";

const NOME_SECAO = { corpo: "Paletó", calca: "Calça", colete: "Colete" };

// Resumo de medidas por seção — usado tanto pra peça atual quanto pro
// histórico de pedidos anteriores do mesmo cliente (mesma "cara").
function ResumoMedidas({ medidas, tipoPeca }) {
  const secoes = PECA_SECOES[tipoPeca] || [];
  return (
    <>
      {secoes.map((secKey) => {
        const sec = MEDIDAS_ALFAIATARIA[secKey];
        const campos = sec.campos.filter((c) => medidas?.[secKey]?.[c.label]);
        if (campos.length === 0) return null;
        return (
          <div key={secKey} className="mb-2">
            <div style={{ fontSize: 11, fontWeight: 600, color: BRASS, marginBottom: 3 }}>{sec.titulo}</div>
            <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))" }}>
              {campos.map((c) => (
                <div key={c.label} className="fx-mono" style={{ fontSize: 11, color: TEXT_MUTED }}>
                  {c.label}: <strong style={{ color: "#16212E" }}>{medidas[secKey][c.label]}</strong>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </>
  );
}

// App enxuto pro Ícaro: só as peças de alfaiataria em produção — sem
// valores, sem dados pessoais de cliente, sem nenhuma outra aba. Ele só
// avança o status (etapa), marca quando começou a produzir de verdade e
// escreve a observação dele. Tudo o resto (preço, telefone, CPF) não
// trafega nem chega perto dessa tela.
export default function ShellProducao() {
  const { sair, perfil } = useAuth();
  const {
    pecas,
    loading,
    marcarInicio,
    atualizarStatus,
    atualizarSituacao,
    atualizarResponsavel,
    atualizarResponsavelSecao,
    pausar,
    retomar,
    desfazerInicio,
    atualizarObservacaoProducao,
  } = usePecasProducao();
  const { equipe } = useEquipeProducao();
  const [busca, setBusca] = useState("");
  const [expandido, setExpandido] = useState(null);
  const [visualizacao, setVisualizacao] = useState("tabela");
  const [pagina, setPagina] = useState("producao");
  const [pecaFicha, setPecaFicha] = useState(null);

  const todasAbertas = useMemo(() => pecas.filter((p) => p.status !== "Entregue"), [pecas]);
  const abertas = todasAbertas.filter((p) => p.cliente.toLowerCase().includes(busca.toLowerCase()));

  const mediaDiasPorTipo = useMemo(() => {
    const cache = new Map();
    return (tipoPeca) => {
      if (!cache.has(tipoPeca)) cache.set(tipoPeca, mediaDiasProducaoPorTipo(pecas, tipoPeca));
      return cache.get(tipoPeca);
    };
  }, [pecas]);

  const previsoesFila = useMemo(
    () => projetarPrevisoesFilaPorEquipe(todasAbertas, (p) => mediaDiasPorTipo(p.tipoPeca), equipe),
    [todasAbertas, mediaDiasPorTipo, equipe]
  );

  // Contagem de atrasadas pra mostrar logo no topo — o Ícaro precisa ver
  // isso de cara, sem precisar procurar linha por linha na tabela.
  const hoje = hojeISO();
  const atrasadas = useMemo(() => {
    return todasAbertas.filter((p) => {
      const estimativa = p.dataInicioProducao ? previsaoEstimada(p, mediaDiasPorTipo(p.tipoPeca)) : previsoesFila.get(p.id);
      const previsaoEfetiva = previsaoEfetivaDe(p, estimativa);
      return previsaoEfetiva && previsaoEfetiva < hoje;
    }).length;
  }, [todasAbertas, mediaDiasPorTipo, previsoesFila, hoje]);

  const responsaveisConhecidos = useMemo(
    () => [...new Set([...equipe.filter((m) => m.ativo).map((m) => m.nome), ...pecas.map((p) => p.responsavel).filter(Boolean)])],
    [pecas, equipe]
  );

  function onCampo(id, campo, valor) {
    if (campo === "situacao") atualizarSituacao(id, valor);
    else if (campo === "status") atualizarStatus(id, valor);
    else if (campo === "responsavel") atualizarResponsavel(id, valor);
  }

  return (
    <div style={{ background: CANVAS, minHeight: "100vh", fontFamily: "'Inter', sans-serif", color: INK }}>
      <div style={{ background: INK }} className="px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Ruler size={18} color={BRASS} />
          <span className="fx-serif" style={{ color: "#F5F1E8", fontSize: 16, fontWeight: 600 }}>
            Schuck — Produção
          </span>
          <span style={{ color: "#8593A3", fontSize: 12 }}>· {perfil?.nome || "Produção"}</span>
        </div>
        <button onClick={sair} className="flex items-center gap-1.5" style={{ color: "#A9B4C0", fontSize: 13, fontWeight: 500 }}>
          <LogOut size={14} /> Sair
        </button>
      </div>

      <div className="px-5 pt-4 flex items-center gap-1" style={{ background: INK }}>
        <button
          onClick={() => setPagina("producao")}
          className="flex items-center gap-1.5"
          style={{
            background: pagina === "producao" ? CANVAS : "transparent",
            color: pagina === "producao" ? INK : "#A9B4C0",
            padding: "8px 14px",
            borderRadius: "8px 8px 0 0",
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          <Ruler size={14} /> Produção
        </button>
        <button
          onClick={() => setPagina("historico")}
          className="flex items-center gap-1.5"
          style={{
            background: pagina === "historico" ? CANVAS : "transparent",
            color: pagina === "historico" ? INK : "#A9B4C0",
            padding: "8px 14px",
            borderRadius: "8px 8px 0 0",
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          <BarChart3 size={14} /> Histórico de Produção
        </button>
      </div>

      {pagina === "historico" && (
        <div className="max-w-3xl mx-auto px-5 py-6">
          <HistoricoProducao pecas={pecas} />
        </div>
      )}

      {pagina === "producao" && (
      <div className="max-w-3xl mx-auto px-5 py-6">
        {atrasadas > 0 && (
          <div
            className="flex items-center gap-2 mb-4"
            style={{ background: "#F6E3D9", color: "#9C4A1E", padding: "10px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600 }}
          >
            <AlertTriangle size={16} /> {atrasadas} peça{atrasadas > 1 ? "s" : ""} com entrega atrasada — dá uma olhada na fila.
          </div>
        )}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <div className="flex items-center gap-2" style={{ ...inputStyle, maxWidth: 320, padding: "6px 10px" }}>
            <Search size={14} color={TEXT_MUTED} />
            <input
              placeholder="Buscar cliente…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              style={{ border: "none", outline: "none", background: "transparent", width: "100%", fontSize: 14 }}
            />
          </div>
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
              <LayoutGrid size={14} /> Cards (medidas)
            </button>
          </div>
        </div>

        {loading && <div style={{ fontSize: 13, color: TEXT_MUTED }}>Carregando…</div>}
        {!loading && abertas.length === 0 && (
          <Card style={{ padding: 20 }}>
            <Empty texto="Nenhuma peça em produção no momento." />
          </Card>
        )}

        {!loading && abertas.length > 0 && visualizacao === "tabela" && (
          <Card style={{ padding: 0, overflow: "hidden" }}>
            <TabelaControleProducao
              pecas={abertas}
              podeEditarAtribuicao={false}
              podeEditarResponsavel
              responsaveisConhecidos={responsaveisConhecidos}
              onCampo={onCampo}
              onMarcarInicio={marcarInicio}
              onPausar={pausar}
              onRetomar={retomar}
              onDesfazerInicio={desfazerInicio}
              mediaDiasPorTipo={mediaDiasPorTipo}
              previsoesFila={previsoesFila}
            />
          </Card>
        )}

        {visualizacao === "cards" && (
        <div className="flex flex-col gap-4">
          {abertas.map((p) => {
            const etapa = statusParaEtapa("alfaiataria", p.status);
            const aberto = expandido === p.id;
            const estimativaAtual = p.dataInicioProducao ? previsaoEstimada(p, mediaDiasPorTipo(p.tipoPeca)) : previsoesFila.get(p.id);
            const previsaoEfetiva = previsaoEfetivaDe(p, estimativaAtual);
            const atrasada = previsaoEfetiva && previsaoEfetiva < hoje;
            const statusEventoAtual = statusEvento({ ...p, previsaoEfetiva });
            return (
              <Card
                key={p.id}
                style={{
                  padding: 18,
                  background: statusEventoAtual === "atrasado" ? "#FBE1D6" : statusEventoAtual === "risco" ? "#FCEFC7" : undefined,
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <span style={{ fontWeight: 600, fontSize: 15 }}>{p.cliente || "Sem nome"}</span>
                    {p.dataLimiteEvento && (
                      <span
                        className="flex items-center gap-1"
                        title={`Data limite (evento): ${fmtData(p.dataLimiteEvento)}`}
                        style={{ fontSize: 11, fontWeight: 700, color: statusEventoAtual === "atrasado" ? "#9C4A1E" : statusEventoAtual === "risco" ? "#8A6A0C" : TEXT_MUTED }}
                      >
                        🎉 {fmtData(p.dataLimiteEvento)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {atrasada && (
                      <span className="flex items-center gap-1" style={{ color: "#9C4A1E", fontWeight: 600, fontSize: 11 }}>
                        <AlertTriangle size={12} /> Atrasado
                      </span>
                    )}
                    <span style={{ fontSize: 12, color: TEXT_MUTED }}>{p.tipoPeca}</span>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: TEXT_MUTED }} className="mb-2">
                  Pedido {fmtData(p.dataPedido)}
                  {previsaoEfetiva
                    ? ` · Entrega ${p.previsaoManual ? "prevista" : "estimada"} ${fmtData(previsaoEfetiva)}`
                    : ""}
                </div>

                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1" style={{ fontSize: 11, color: TEXT_MUTED }}>
                    <span>{etapa.label}</span>
                    <span className="fx-mono" style={{ fontWeight: 700, color: BRASS }}>
                      {etapa.percentual}%
                    </span>
                  </div>
                  <div style={{ background: LINE, borderRadius: 4, height: 8 }}>
                    <div style={{ width: `${etapa.percentual}%`, background: BRASS, height: 8, borderRadius: 4 }} />
                  </div>
                </div>

                <div className="mb-3">
                  <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 4 }}>Etapa</div>
                  <select style={inputStyle} value={p.status} onChange={(e) => atualizarStatus(p.id, e.target.value)}>
                    {STATUS_ALFAIATARIA.filter((s) => s !== "Entregue").map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <datalist id="lista-responsaveis-producao-cards">
                  {responsaveisConhecidos.map((r) => (
                    <option key={r} value={r} />
                  ))}
                </datalist>
                {(PECA_SECOES[p.tipoPeca] || []).length > 1 ? (
                  <div className="mb-3">
                    <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 4 }}>Responsável por parte</div>
                    <div className="flex flex-col gap-2">
                      {PECA_SECOES[p.tipoPeca].map((secKey) => (
                        <div key={secKey} className="flex items-center gap-2">
                          <span style={{ fontSize: 12, color: TEXT_MUTED, minWidth: 60 }}>{NOME_SECAO[secKey] || secKey}</span>
                          <input
                            style={inputStyle}
                            list="lista-responsaveis-producao-cards"
                            defaultValue={p.responsaveisSecoes?.[secKey] || ""}
                            onBlur={(e) => atualizarResponsavelSecao(p.id, secKey, e.target.value)}
                            placeholder="—"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="mb-3">
                    <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 4 }}>Responsável</div>
                    <input
                      style={inputStyle}
                      list="lista-responsaveis-producao-cards"
                      defaultValue={p.responsavel}
                      onBlur={(e) => atualizarResponsavel(p.id, e.target.value)}
                      placeholder="Quem vai fazer?"
                    />
                  </div>
                )}

                <div className="mb-3">
                  <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 4 }}>Início da produção</div>
                  {!p.dataInicioProducao ? (
                    <button
                      onClick={() => marcarInicio(p.id)}
                      style={{ background: "#EDEAE0", color: BRASS, padding: "8px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, width: "100%" }}
                    >
                      Marcar início
                    </button>
                  ) : (
                    <div style={{ fontSize: 13, fontWeight: 600, padding: "9px 0" }}>
                      {fmtData(p.dataInicioProducao)} · {diasProducaoReal(p)}d
                    </div>
                  )}
                </div>
                {p.dataInicioProducao && (
                  <div className="mb-3 flex items-center gap-3 flex-wrap">
                    {p.situacao === "Pausado" ? (
                      <button
                        onClick={() => retomar(p.id)}
                        style={{ background: "#DCEBDD", color: "#2C6E31", padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600 }}
                      >
                        Retomar produção
                      </button>
                    ) : (
                      <button
                        onClick={() => pausar(p.id)}
                        style={{ background: "#F6E3D9", color: "#9C4A1E", padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600 }}
                      >
                        Pausar (cliente viajou, etc.)
                      </button>
                    )}
                    <button
                      onClick={() => desfazerInicio(p.id)}
                      title="Clicou em início por engano? Desfaz aqui."
                      style={{ color: TEXT_MUTED, fontSize: 11, textDecoration: "underline" }}
                    >
                      desfazer início
                    </button>
                  </div>
                )}

                {p.observacoes && (
                  <div className="mb-3 p-3" style={{ background: "#F3EEDF", borderRadius: 6, fontSize: 12 }}>
                    <strong>Nota do Tales:</strong> {p.observacoes}
                  </div>
                )}

                <button
                  onClick={() => setPecaFicha(p)}
                  className="w-full flex items-center gap-1.5 py-1.5"
                  style={{ borderTop: `1px solid ${LINE}`, marginTop: 4, color: BRASS, fontSize: 12, fontWeight: 600 }}
                >
                  <FileText size={14} /> Ver ficha do pedido
                </button>

                <button
                  onClick={() => setExpandido(aberto ? null : p.id)}
                  className="w-full flex items-center justify-between py-1.5"
                >
                  <span style={{ fontSize: 12, color: BRASS, fontWeight: 600 }}>{aberto ? "Ocultar medidas e observações" : "Ver medidas e observações"}</span>
                  {aberto ? <ChevronUp size={14} color={BRASS} /> : <ChevronDown size={14} color={BRASS} />}
                </button>

                {aberto && (
                  <div className="pt-3">
                    {p.tecidos.length > 0 && (
                      <div className="mb-3" style={{ fontSize: 12 }}>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>Tecido</div>
                        {p.tecidos.map((t, i) => (
                          <div key={i} style={{ color: TEXT_MUTED }}>
                            {t.codigo} · Qtd {t.qtd}
                            {t.numero ? ` · ${t.numero}` : ""}
                          </div>
                        ))}
                      </div>
                    )}
                    <ResumoMedidas medidas={p.medidas} tipoPeca={p.tipoPeca} />
                    <div className="mb-3">
                      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Sua observação</div>
                      <textarea
                        style={{ ...inputStyle, minHeight: 70 }}
                        placeholder="Escreva aqui — o Tales vê essa nota no pedido dele"
                        defaultValue={p.observacoesProducao}
                        onBlur={(e) => atualizarObservacaoProducao(p.id, e.target.value)}
                      />
                    </div>
                    {(() => {
                      const historico = pecas
                        .filter((h) => h.id !== p.id && h.clienteId && h.clienteId === p.clienteId)
                        .sort((a, b) => (b.dataPedido || "").localeCompare(a.dataPedido || ""));
                      if (historico.length === 0) return null;
                      return (
                        <div style={{ borderTop: `1px solid ${LINE}`, paddingTop: 10 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Histórico de medidas deste cliente</div>
                          {historico.map((h) => (
                            <div key={h.id} className="mb-3 p-2" style={{ background: "#F3EEDF", borderRadius: 6 }}>
                              <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 4 }}>
                                {fmtData(h.dataPedido)} · {h.tipoPeca}
                              </div>
                              <ResumoMedidas medidas={h.medidas} tipoPeca={h.tipoPeca} />
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
        )}
      </div>
      )}

      {pecaFicha && (
        <FichaImprimivelAlfaiataria peca={pecaFicha} onFechar={() => setPecaFicha(null)} />
      )}
    </div>
  );
}
