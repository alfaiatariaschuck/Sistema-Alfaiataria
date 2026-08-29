import React from "react";
import { AlertTriangle } from "lucide-react";
import { Empty, Pill } from "./ui";
import { BRASS, INK, LINE, STATUS_ALFAIATARIA, TEXT_MUTED, inputStyle } from "../lib/constants";
import { diasAte, fmtData, statusParaEtapa } from "../lib/helpers";

const VERMELHO = "#9C4A1E";

const SITUACOES = ["Aguardando", "Em Produção", "Pausado"];

// Tabela compartilhada entre a tela do dono (Controle de Produção,
// edição completa) e a tela do Ícaro (edição restrita) — mesma "cara"
// nos dois lados, só muda o que cada um pode mexer.
export default function TabelaControleProducao({ pecas, podeEditarAtribuicao, responsaveisConhecidos, onCampo, onAbrir }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${LINE}`, background: "#F7F4EC" }}>
            {["Nº", "Cliente", "Peça", "Prioridade", "Responsável", "Situação", "Etapa", "%", "Dias", "Obs."].map((h) => (
              <th key={h} style={{ textAlign: "left", padding: "8px 10px", fontWeight: 600, fontSize: 11, color: TEXT_MUTED, textTransform: "uppercase", whiteSpace: "nowrap" }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {pecas.map((p, i) => {
            const etapa = statusParaEtapa("alfaiataria", p.status);
            const diasAberto = p.dataPedido ? -diasAte(p.dataPedido) : 0;
            const atrasado = p.status !== "Entregue" && p.previsaoEntrega && p.previsaoEntrega < new Date().toISOString().slice(0, 10);
            return (
              <tr key={p.id} style={{ borderBottom: `1px solid ${LINE}` }} className="fx-row-hover">
                <td style={{ padding: "8px 10px", color: TEXT_MUTED }}>{i + 1}</td>
                <td onClick={() => onAbrir && onAbrir(p.id)} style={{ padding: "8px 10px", fontWeight: 600, cursor: onAbrir ? "pointer" : "default" }}>
                  {p.cliente || "Sem nome"}
                </td>
                <td style={{ padding: "8px 10px" }}>{p.tipoPeca}</td>
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
                    <Pill text="Entregue" style={{ bg: "#DCEBDD", fg: "#2C6E31" }} />
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
                <td className="fx-mono" style={{ padding: "8px 10px", color: BRASS, fontWeight: 700 }}>
                  {etapa.percentual}%
                </td>
                <td className="fx-mono" style={{ padding: "8px 10px", color: TEXT_MUTED, whiteSpace: "nowrap" }}>
                  {diasAberto}d
                </td>
                <td style={{ padding: "8px 10px", maxWidth: 160, fontSize: 11, color: TEXT_MUTED, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={p.observacoes}>
                  {p.observacoes || "—"}
                </td>
              </tr>
            );
          })}
          {pecas.length === 0 && (
            <tr>
              <td colSpan={10} style={{ padding: 24 }}>
                <Empty texto="Nenhuma peça em produção." />
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
