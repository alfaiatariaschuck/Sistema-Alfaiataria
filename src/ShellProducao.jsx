import React, { useState } from "react";
import { ChevronDown, ChevronUp, LayoutGrid, LogOut, Ruler, Search, Table2 } from "lucide-react";
import { useAuth } from "./contexts/AuthContext";
import { usePecasProducao } from "./hooks/usePecasProducao";
import { BRASS, CANVAS, INK, INK_SOFT, LINE, MEDIDAS_ALFAIATARIA, PECA_SECOES, STATUS_ALFAIATARIA, TEXT_MUTED, inputStyle } from "./lib/constants";
import { fmtData, statusParaEtapa } from "./lib/helpers";
import { Card, Empty } from "./components/ui";
import TabelaControleProducao from "./components/TabelaControleProducao";

// App enxuto pro Ícaro: só as peças de alfaiataria em produção — sem
// valores, sem dados pessoais de cliente, sem nenhuma outra aba. Ele só
// avança o status (etapa), marca quando começou a produzir de verdade e
// escreve a observação dele. Tudo o resto (preço, telefone, CPF) não
// trafega nem chega perto dessa tela.
export default function ShellProducao() {
  const { sair, perfil } = useAuth();
  const { pecas, loading, marcarInicio, atualizarStatus, atualizarSituacao, atualizarObservacaoProducao } = usePecasProducao();
  const [busca, setBusca] = useState("");
  const [expandido, setExpandido] = useState(null);
  const [visualizacao, setVisualizacao] = useState("tabela");

  const abertas = pecas
    .filter((p) => p.status !== "Entregue")
    .filter((p) => p.cliente.toLowerCase().includes(busca.toLowerCase()));

  function onCampo(id, campo, valor) {
    if (campo === "situacao") atualizarSituacao(id, valor);
    else if (campo === "status") atualizarStatus(id, valor);
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

      <div className="max-w-3xl mx-auto px-5 py-6">
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
            <TabelaControleProducao pecas={abertas} podeEditarAtribuicao={false} onCampo={onCampo} />
          </Card>
        )}

        {visualizacao === "cards" && (
        <div className="flex flex-col gap-4">
          {abertas.map((p) => {
            const etapa = statusParaEtapa("alfaiataria", p.status);
            const aberto = expandido === p.id;
            const secoes = PECA_SECOES[p.tipoPeca] || [];
            return (
              <Card key={p.id} style={{ padding: 18 }}>
                <div className="flex items-center justify-between mb-1">
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{p.cliente || "Sem nome"}</div>
                  <span style={{ fontSize: 12, color: TEXT_MUTED }}>{p.tipoPeca}</span>
                </div>
                <div style={{ fontSize: 12, color: TEXT_MUTED }} className="mb-2">
                  Pedido {fmtData(p.dataPedido)}
                  {p.previsaoEntrega ? ` · Entrega prevista ${fmtData(p.previsaoEntrega)}` : ""}
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

                <div className="grid gap-3 mb-3" style={{ gridTemplateColumns: "1fr 1fr" }}>
                  <div>
                    <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 4 }}>Etapa</div>
                    <select style={inputStyle} value={p.status} onChange={(e) => atualizarStatus(p.id, e.target.value)}>
                      {STATUS_ALFAIATARIA.filter((s) => s !== "Entregue").map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 4 }}>Início da produção</div>
                    {p.dataInicioProducao ? (
                      <div style={{ fontSize: 13, fontWeight: 600, padding: "9px 0" }}>{fmtData(p.dataInicioProducao)}</div>
                    ) : (
                      <button
                        onClick={() => marcarInicio(p.id)}
                        style={{ background: "#EDEAE0", color: BRASS, padding: "8px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, width: "100%" }}
                      >
                        Marcar início
                      </button>
                    )}
                  </div>
                </div>

                {p.observacoes && (
                  <div className="mb-3 p-3" style={{ background: "#F3EEDF", borderRadius: 6, fontSize: 12 }}>
                    <strong>Nota do Tales:</strong> {p.observacoes}
                  </div>
                )}

                <button
                  onClick={() => setExpandido(aberto ? null : p.id)}
                  className="w-full flex items-center justify-between py-1.5"
                  style={{ borderTop: `1px solid ${LINE}`, marginTop: 4 }}
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
                            {t.fornecedor ? ` · ${t.fornecedor}` : ""}
                          </div>
                        ))}
                      </div>
                    )}
                    {secoes.map((secKey) => {
                      const sec = MEDIDAS_ALFAIATARIA[secKey];
                      const campos = sec.campos.filter((c) => p.medidas?.[secKey]?.[c.label]);
                      if (campos.length === 0) return null;
                      return (
                        <div key={secKey} className="mb-3">
                          <div style={{ fontSize: 12, fontWeight: 600, color: BRASS, marginBottom: 4 }}>{sec.titulo}</div>
                          <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))" }}>
                            {campos.map((c) => (
                              <div key={c.label} className="fx-mono" style={{ fontSize: 11, color: TEXT_MUTED }}>
                                {c.label}: <strong style={{ color: "#16212E" }}>{p.medidas[secKey][c.label]}</strong>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Sua observação</div>
                      <textarea
                        style={{ ...inputStyle, minHeight: 70 }}
                        placeholder="Escreva aqui — o Tales vê essa nota no pedido dele"
                        defaultValue={p.observacoesProducao}
                        onBlur={(e) => atualizarObservacaoProducao(p.id, e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
        )}
      </div>
    </div>
  );
}
