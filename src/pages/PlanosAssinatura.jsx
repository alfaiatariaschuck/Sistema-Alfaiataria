import React, { useState } from "react";
import { CheckCircle2, ChevronDown, ChevronUp, Clock, PackageCheck, Search, Send, Trash2 } from "lucide-react";
import { Card, Empty, Field, PageTitle, Pill, StatCard } from "../components/ui";
import { CampoDescricao } from "../components/CampoComOpcoes";
import { BRASS, BRASS_SOFT, DESC_CAMPOS, INK_SOFT, LINE, MEDIDA_LABELS, TEXT_MUTED, inputStyle } from "../lib/constants";
import { brl, finalDaMedida } from "../lib/helpers";

export default function PlanosAssinatura({ planos, onCampo, onMedida, onDescricao, onAddTecido, onTecido, onRemover, onEmitir }) {
  const [busca, setBusca] = useState("");
  const [emitindo, setEmitindo] = useState(null);
  const [expandido, setExpandido] = useState(null);

  async function emitir(plano) {
    if (!confirm(`Emitir o pedido deste mês pro plano de ${plano.cliente}? Isso cria um pedido de verdade na aba Pedidos.`)) return;
    setEmitindo(plano.id);
    try {
      await onEmitir(plano);
    } finally {
      setEmitindo(null);
    }
  }

  const filtrados = planos.filter((pl) => pl.cliente.toLowerCase().includes(busca.toLowerCase()));
  const ativos = planos.filter((pl) => pl.ativo);

  return (
    <div>
      <PageTitle eyebrow="Clientes recorrentes — camisas" title="Planos de Assinatura" />

      <Card style={{ padding: 16 }} className="mb-6">
        <p style={{ fontSize: 13, color: INK_SOFT, lineHeight: 1.6 }}>
          Pra cadastrar um plano novo, vá em <strong>Pedido Camisas</strong> e marque a opção "Plano de Assinatura"
          antes de salvar — o formulário é o mesmo, com medidas, características e tecido. Aqui você só acompanha o
          progresso, edita e emite o pedido do mês. O plano fica só de controle — não conta nos painéis nem nos
          relatórios. Quando emitir, é criado um pedido de verdade, que vai pra aba <strong>Pedidos</strong> com tudo
          preenchido, pronto pra mandar pra Fabi.
        </p>
      </Card>

      <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <StatCard label="Planos ativos" value={ativos.length} icon={PackageCheck} />
      </div>

      <div className="flex items-center gap-2 mb-4" style={{ ...inputStyle, maxWidth: 320, padding: "6px 10px" }}>
        <Search size={14} color={TEXT_MUTED} />
        <input
          placeholder="Buscar cliente…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          style={{ border: "none", outline: "none", background: "transparent", width: "100%", fontSize: 14 }}
        />
      </div>

      <Card>
        {filtrados.length === 0 && (
          <div className="p-6">
            <Empty texto="Nenhum plano cadastrado ainda." />
          </div>
        )}
        {filtrados.map((pl, i) => {
          const aberto = expandido === pl.id;
          return (
            <div key={pl.id} style={{ borderBottom: i < filtrados.length - 1 ? `1px solid ${LINE}` : "none" }}>
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{pl.cliente}</span>
                    {!pl.ativo && <Pill text="inativo" />}
                  </div>
                  <div style={{ fontSize: 12, color: TEXT_MUTED }}>
                    {brl(parseFloat(pl.valorReceber) || 0)} por emissão · {pl.formaPagamento || "forma não definida"}
                  </div>
                  <div className="mt-1" style={{ width: 160 }}>
                    <div className="flex justify-between mb-0.5" style={{ fontSize: 11, color: INK_SOFT }}>
                      <span>Progresso</span>
                      <span className="fx-mono">
                        {pl.qtEntregue}/{pl.quantidade}
                      </span>
                    </div>
                    <div style={{ background: LINE, borderRadius: 4, height: 6 }}>
                      <div
                        style={{
                          width: `${Math.min(100, (pl.qtEntregue / (pl.quantidade || 1)) * 100)}%`,
                          background: BRASS,
                          height: 6,
                          borderRadius: 4,
                        }}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => emitir(pl)}
                    disabled={emitindo === pl.id}
                    className="flex items-center gap-1.5"
                    style={{ background: BRASS, color: "#FFF", padding: "8px 14px", borderRadius: 6, fontWeight: 600, fontSize: 12, opacity: emitindo === pl.id ? 0.7 : 1 }}
                  >
                    <Send size={13} /> {emitindo === pl.id ? "Emitindo…" : "Emitir pedido do mês"}
                  </button>
                  <button
                    onClick={() => setExpandido(aberto ? null : pl.id)}
                    title="Editar medidas / características"
                    style={{ background: aberto ? BRASS_SOFT : "transparent", border: `1px solid ${LINE}`, padding: "8px", borderRadius: 6 }}
                  >
                    {aberto ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("Excluir este plano?")) onRemover(pl.id);
                    }}
                  >
                    <Trash2 size={14} color="#9C4A1E" />
                  </button>
                </div>
              </div>

              {aberto && (
                <div className="px-5 pb-5" style={{ background: "#FCFAF5" }}>
                  <div className="grid gap-3 mb-3 pt-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
                    <Field label="Quantidade total do plano">
                      <input type="number" min="1" style={inputStyle} value={pl.quantidade} onChange={(e) => onCampo(pl.id, "quantidade", e.target.value)} />
                    </Field>
                    <Field label="Qtd entregue">
                      <div className="flex gap-1">
                        <input type="number" style={inputStyle} value={pl.qtEntregue} onChange={(e) => onCampo(pl.id, "qtEntregue", e.target.value)} />
                      </div>
                    </Field>
                    <Field label="Valor por emissão (R$)">
                      <input type="number" step="0.01" style={inputStyle} value={pl.valorReceber} onChange={(e) => onCampo(pl.id, "valorReceber", e.target.value)} />
                    </Field>
                    <Field label="Valor Fabiana (R$)">
                      <input type="number" step="0.01" style={inputStyle} value={pl.valorFabiana} onChange={(e) => onCampo(pl.id, "valorFabiana", e.target.value)} />
                      <span style={{ fontSize: 10, color: TEXT_MUTED }}>Só entra no Painel Camisaria quando você emitir o pedido.</span>
                    </Field>
                    <Field label="Ativo">
                      <select
                        style={inputStyle}
                        value={pl.ativo ? "sim" : "nao"}
                        onChange={(e) => onCampo(pl.id, "ativo", e.target.value === "sim")}
                      >
                        <option value="sim">Sim</option>
                        <option value="nao">Não</option>
                      </select>
                    </Field>
                  </div>

                  <div className="fx-serif mb-2" style={{ fontSize: 13, fontWeight: 600, color: BRASS }}>
                    Medidas (cm)
                  </div>
                  <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
                    {MEDIDA_LABELS.map((label) => {
                      const fin = finalDaMedida(label, pl.medidas[label]);
                      return (
                        <Field key={label} label={label}>
                          <input type="number" step="0.5" style={inputStyle} value={pl.medidas[label]} onChange={(e) => onMedida(pl.id, label, e.target.value)} />
                          {fin !== null && (
                            <span className="fx-mono" style={{ fontSize: 11, color: BRASS }}>
                              final: {fin} cm
                            </span>
                          )}
                        </Field>
                      );
                    })}
                  </div>

                  <div className="fx-serif mb-2" style={{ fontSize: 13, fontWeight: 600, color: BRASS }}>
                    Características
                  </div>
                  <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
                    {DESC_CAMPOS.map((campo) => (
                      <CampoDescricao key={campo.label} campo={campo} valor={pl.descricao[campo.label]} onChange={(v) => onDescricao(pl.id, campo.label, v)} />
                    ))}
                  </div>

                  <div className="flex items-center justify-between mb-1">
                    <div className="fx-serif" style={{ fontSize: 13, fontWeight: 600, color: BRASS }}>
                      Tecido
                    </div>
                    <button type="button" onClick={() => onAddTecido(pl.id)} style={{ color: BRASS, fontSize: 12, fontWeight: 600 }}>
                      + adicionar item
                    </button>
                  </div>
                  {(pl.tecidos || []).length === 0 && (
                    <div style={{ fontSize: 12, color: TEXT_MUTED }} className="mb-2">
                      Nenhum tecido lançado ainda.
                    </div>
                  )}
                  {(pl.tecidos || []).map((t, i) => (
                    <div key={i} className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-2 pb-2 items-center" style={{ borderBottom: `1px solid ${LINE}` }}>
                      <input style={inputStyle} placeholder="Código" value={t.codigo} onChange={(e) => onTecido(pl.id, i, "codigo", e.target.value)} />
                      <input
                        style={{ ...inputStyle, background: BRASS_SOFT }}
                        placeholder="Fornecedor (interno)"
                        value={t.fornecedor || ""}
                        onChange={(e) => onTecido(pl.id, i, "fornecedor", e.target.value)}
                      />
                      <input type="number" style={inputStyle} placeholder="Qtd" value={t.qtd} onChange={(e) => onTecido(pl.id, i, "qtd", e.target.value)} />
                      <input style={inputStyle} placeholder="Observação" value={t.numero} onChange={(e) => onTecido(pl.id, i, "numero", e.target.value)} />
                      <button
                        type="button"
                        onClick={() => onTecido(pl.id, i, "comprado", !t.comprado)}
                        className="flex items-center justify-center gap-1"
                        style={{
                          background: t.comprado ? "#DCEBDD" : "#F6E3D9",
                          color: t.comprado ? "#2C6E31" : "#9C4A1E",
                          padding: "8px 10px",
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        {t.comprado ? (
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

                  <Field label="Observações">
                    <textarea style={{ ...inputStyle, minHeight: 70 }} value={pl.observacoes} onChange={(e) => onCampo(pl.id, "observacoes", e.target.value)} />
                  </Field>
                </div>
              )}
            </div>
          );
        })}
      </Card>
    </div>
  );
}
