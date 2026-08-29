import React, { useState } from "react";
import { AlertTriangle, ArrowDownCircle, ArrowUpCircle, Package, Plus, Trash2 } from "lucide-react";
import { Card, Empty, Field, PageTitle, Pill, StatCard } from "../components/ui";
import { BRASS, FORNECEDORES_TECIDO, INK, LINE, TEXT_MUTED, inputStyle } from "../lib/constants";
import { fmtData } from "../lib/helpers";

const VERMELHO = "#9C4A1E";

export default function EstoqueCamisaria({ estoque, movimentos, consumoPorTecido, onCadastrar, onRegistrarCompra, onRemover }) {
  const [mostrarForm, setMostrarForm] = useState(false);
  const [novoCodigo, setNovoCodigo] = useState("");
  const [novoFornecedor, setNovoFornecedor] = useState("");
  const [novoMetrosPorRolo, setNovoMetrosPorRolo] = useState("30");
  const [comprando, setComprando] = useState(null);
  const [rolos, setRolos] = useState("1");
  const [erro, setErro] = useState(null);

  const totalMetros = estoque.reduce((s, e) => s + e.saldoMetros, 0);
  const baixoEstoque = estoque.filter((e) => e.saldoMetros < e.metrosPorRolo);

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
      await onCadastrar(novoCodigo, novoFornecedor, novoMetrosPorRolo);
      setNovoCodigo("");
      setNovoFornecedor("");
      setNovoMetrosPorRolo("30");
      setMostrarForm(false);
    } catch (e) {
      setErro("Não consegui cadastrar (" + e.message + ").");
    }
  }

  async function comprar(item) {
    const metros = (parseFloat(rolos) || 0) * item.metrosPorRolo;
    if (metros <= 0) return;
    try {
      await onRegistrarCompra(item.id, metros, `Compra de ${rolos} rolo(s) — ${item.fornecedor || "fornecedor não informado"}`);
      setComprando(null);
      setRolos("1");
    } catch (e) {
      setErro("Não consegui registrar a compra (" + e.message + ").");
    }
  }

  return (
    <div>
      <PageTitle eyebrow="Camisaria — controle de rolos comprados antecipado" title="Estoque de Tecido" />

      <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <StatCard label="Tecidos rastreados" value={estoque.length} icon={Package} />
        <StatCard label="Total em estoque (m)" value={totalMetros.toFixed(1)} icon={Package} />
        <StatCard label="Estoque baixo (< 1 rolo)" value={baixoEstoque.length} icon={AlertTriangle} accent={baixoEstoque.length > 0 ? VERMELHO : undefined} />
      </div>

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
              <div className="flex items-center gap-2 mb-3">
                <span className="fx-serif" style={{ fontSize: 24, fontWeight: 700, color: alerta ? VERMELHO : INK }}>
                  {item.saldoMetros.toFixed(1)}m
                </span>
                {alerta && <Pill text="estoque baixo" style={{ bg: "#F6E3D9", fg: VERMELHO }} />}
              </div>

              {comprando === item.id ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="1"
                    min="1"
                    style={{ ...inputStyle, width: 70 }}
                    value={rolos}
                    onChange={(e) => setRolos(e.target.value)}
                  />
                  <span style={{ fontSize: 12, color: TEXT_MUTED }}>rolo(s) = {((parseFloat(rolos) || 0) * item.metrosPorRolo).toFixed(1)}m</span>
                  <button onClick={() => comprar(item)} style={{ background: "#2C6E31", color: "#FFF", padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
                    Confirmar
                  </button>
                  <button onClick={() => setComprando(null)} style={{ color: TEXT_MUTED, fontSize: 12 }}>
                    cancelar
                  </button>
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
