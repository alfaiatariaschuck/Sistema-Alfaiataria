import React, { useMemo, useState } from "react";
import { AlertTriangle, ArrowDown, ArrowUp, Pause, Play } from "lucide-react";
import { Empty, Pill } from "./ui";
import { BRASS, INK, LINE, STATUS_ALFAIATARIA, TEXT_MUTED, inputStyle } from "../lib/constants";
import { diasAte, diasProducaoReal, statusParaEtapa } from "../lib/helpers";

const VERMELHO = "#9C4A1E";
const VERDE = "#2C6E31";

const SITUACOES = ["Aguardando", "Em Produção", "Pausado"];

const COLUNAS = [
  { chave: "nome", label: "Cliente" },
  { chave: "tipoPeca", label: "Peça" },
  { chave: "percentual", label: "%" },
  { chave: "diasFila", label: "Dias fila" },
  { chave: "diasProducao", label: "Dias prod." },
];

// Tabela compartilhada entre a tela do dono (Controle de Produção,
// edição completa) e a tela do Ícaro (edição restrita) — mesma "cara"
// nos dois lados, só muda o que cada um pode mexer.
export default function TabelaControleProducao({ pecas, podeEditarAtribuicao, responsaveisConhecidos, onCampo, onAbrir, onMarcarInicio, onPausar, onRetomar }) {
  const [ordenarPor, setOrdenarPor] = useState(null);
  const [ordemDesc, setOrdemDesc] = useState(false);

  const enriquecidas = useMemo(
    () =>
      pecas.map((p) => ({
        ...p,
        percentual: statusParaEtapa("alfaiataria", p.status).percentual,
        diasFila: p.dataPedido ? -diasAte(p.dataPedido) : 0,
        diasProducao: diasProducaoReal(p),
      })),
    [pecas]
  );

  const ordenadas = useMemo(() => {
    if (!ordenarPor) return enriquecidas;
    return [...enriquecidas].sort((a, b) => {
      let av = a[ordenarPor];
      let bv = b[ordenarPor];
      if (ordenarPor === "nome") {
        av = a.cliente.toLowerCase();
        bv = b.cliente.toLowerCase();
      } else {
        av = av === null ? -1 : av;
        bv = bv === null ? -1 : bv;
      }
      if (av < bv) return ordemDesc ? 1 : -1;
      if (av > bv) return ordemDesc ? -1 : 1;
      return 0;
    });
  }, [enriquecidas, ordenarPor, ordemDesc]);

  function ordenarPorColuna(coluna) {
    if (ordenarPor === coluna) {
      setOrdemDesc((v) => !v);
    } else {
      setOrdenarPor(coluna);
      setOrdemDesc(coluna === "percentual");
    }
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${LINE}`, background: "#F7F4EC" }}>
            <th style={{ padding: "8px 10px", fontWeight: 600, fontSize: 11, color: TEXT_MUTED }}>Nº</th>
            {COLUNAS.map((col) => (
              <th
                key={col.chave}
                onClick={() => ordenarPorColuna(col.chave)}
                style={{ textAlign: "left", padding: "8px 10px", fontWeight: 600, fontSize: 11, color: TEXT_MUTED, textTransform: "uppercase", whiteSpace: "nowrap", cursor: "pointer" }}
              >
                <span className="inline-flex items-center gap-1">
                  {col.label}
                  {ordenarPor === col.chave && (ordemDesc ? <ArrowDown size={11} /> : <ArrowUp size={11} />)}
                </span>
              </th>
            ))}
            {["Prioridade", "Responsável", "Situação", "Etapa", "Início/Pausa", "Obs."].map((h) => (
              <th key={h} style={{ textAlign: "left", padding: "8px 10px", fontWeight: 600, fontSize: 11, color: TEXT_MUTED, textTransform: "uppercase", whiteSpace: "nowrap" }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ordenadas.map((p, i) => {
            const atrasado = p.status !== "Entregue" && p.previsaoEntrega && p.previsaoEntrega < new Date().toISOString().slice(0, 10);
            const pausado = p.situacao === "Pausado";
            return (
              <tr key={p.id} style={{ borderBottom: `1px solid ${LINE}` }} className="fx-row-hover">
                <td style={{ padding: "8px 10px", color: TEXT_MUTED }}>{i + 1}</td>
                <td onClick={() => onAbrir && onAbrir(p.id)} style={{ padding: "8px 10px", fontWeight: 600, cursor: onAbrir ? "pointer" : "default" }}>
                  {p.cliente || "Sem nome"}
                </td>
                <td style={{ padding: "8px 10px" }}>{p.tipoPeca}</td>
                <td className="fx-mono" style={{ padding: "8px 10px", color: BRASS, fontWeight: 700 }}>
                  {p.percentual}%
                </td>
                <td className="fx-mono" style={{ padding: "8px 10px", color: TEXT_MUTED, whiteSpace: "nowrap" }} title="Desde o dia que fechou o cliente — inclui espera na fila">
                  {p.diasFila}d
                </td>
                <td className="fx-mono" style={{ padding: "8px 10px", color: pausado ? BRASS : TEXT_MUTED, whiteSpace: "nowrap" }} title="Desde o início real da produção, descontando pausas">
                  {p.diasProducao === null ? "—" : `${p.diasProducao}d`}
                </td>
                <td style={{ padding: "8px 10px" }}>
                  {podeEditarAtribuicao ? (
                    <select style={{ ...inputStyle, fontSize: 12, padding: "4px 6px" }} value={p.prioridade} onChange={(e) => onCampo(p.id, "prioridade", e.target.value)}>
                      <option>Normal</option>
                      <option>Alta</option>
                    </select>
                  ) : (
                    <Pill text={p.prioridade} style={p.prioridade === "Alta" ? { bg: "#F6E3D9", fg: VERMELHO } : { bg: "#EDEAE0", fg: TEXT_MUTED }} />
                  )}
                </td>
                <td style={{ padding: "8px 10px" }}>
                  {podeEditarAtribuicao ? (
                    <>
                      <input
                        style={{ ...inputStyle, fontSize: 12, padding: "4px 6px", width: 110 }}
                        list="lista-responsaveis-producao"
                        value={p.responsavel}
                        onChange={(e) => onCampo(p.id, "responsavel", e.target.value)}
                        placeholder="—"
                      />
                      <datalist id="lista-responsaveis-producao">
                        {(responsaveisConhecidos || []).map((r) => (
                          <option key={r} value={r} />
                        ))}
                      </datalist>
                    </>
                  ) : (
                    <span style={{ color: TEXT_MUTED }}>{p.responsavel || "—"}</span>
                  )}
                </td>
                <td style={{ padding: "8px 10px" }}>
                  {p.status === "Entregue" ? (
                    <Pill text="Entregue" style={{ bg: "#DCEBDD", fg: VERDE }} />
                  ) : atrasado ? (
                    <span className="flex items-center gap-1" style={{ color: VERMELHO, fontWeight: 600, fontSize: 12 }}>
                      <AlertTriangle size={12} /> Atrasado
                    </span>
                  ) : (
                    <select style={{ ...inputStyle, fontSize: 12, padding: "4px 6px" }} value={p.situacao} onChange={(e) => onCampo(p.id, "situacao", e.target.value)}>
                      {SITUACOES.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  )}
                </td>
                <td style={{ padding: "8px 10px" }}>
                  <select
                    style={{ ...inputStyle, fontSize: 12, padding: "4px 6px" }}
                    value={p.status}
                    onChange={(e) => onCampo(p.id, "status", e.target.value)}
                  >
                    {(podeEditarAtribuicao ? STATUS_ALFAIATARIA : STATUS_ALFAIATARIA.filter((s) => s !== "Entregue")).map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </td>
                <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>
                  {p.status === "Entregue" ? (
                    <span style={{ fontSize: 11, color: TEXT_MUTED }}>{p.diasProducao !== null ? `${p.diasProducao}d de produção` : "—"}</span>
                  ) : !p.dataInicioProducao ? (
                    <button
                      onClick={() => onMarcarInicio(p.id)}
                      className="flex items-center gap-1"
                      style={{ background: "#EDEAE0", color: BRASS, padding: "5px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600 }}
                    >
                      <Play size={11} /> Início
                    </button>
                  ) : pausado ? (
                    <button
                      onClick={() => onRetomar(p.id)}
                      className="flex items-center gap-1"
                      style={{ background: "#DCEBDD", color: VERDE, padding: "5px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600 }}
                    >
                      <Play size={11} /> Retomar
                    </button>
                  ) : (
                    <button
                      onClick={() => onPausar(p.id)}
                      className="flex items-center gap-1"
                      style={{ background: "#F6E3D9", color: VERMELHO, padding: "5px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600 }}
                    >
                      <Pause size={11} /> Pausar
                    </button>
                  )}
                </td>
                <td style={{ padding: "8px 10px", maxWidth: 160, fontSize: 11, color: TEXT_MUTED, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={p.observacoes}>
                  {p.observacoes || "—"}
                </td>
              </tr>
            );
          })}
          {ordenadas.length === 0 && (
            <tr>
              <td colSpan={12} style={{ padding: 24 }}>
                <Empty texto="Nenhuma peça em produção." />
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
