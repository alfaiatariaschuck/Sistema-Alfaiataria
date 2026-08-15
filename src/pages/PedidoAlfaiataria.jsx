import React, { useEffect, useState } from "react";
import { CheckCircle2, ChevronDown, ChevronUp, Clock, Printer, Scissors, Search, Trash2, Wallet } from "lucide-react";
import { Card, Empty, Field, PageTitle, Pill, StatCard } from "../components/ui";
import { CampoComOpcoes } from "../components/CampoComOpcoes";
import {
  BRASS,
  BRASS_SOFT,
  CARACTERISTICAS_TRAJE,
  INK,
  INK_SOFT,
  LINE,
  MEDIDAS_ALFAIATARIA,
  PECA_SECOES,
  TEXT_MUTED,
  TIPOS_PECA,
  inputStyle,
} from "../lib/constants";
import { brl, fmtData } from "../lib/helpers";
import { pecaVazia } from "../hooks/usePedidosAlfaiataria";
import { supabase } from "../supabaseClient";

const CHAVE_TELEFONE_ICARO = "telefone_icaro";

const STATUS_PECA_STYLE = {
  Pago: { bg: "#DCEBDD", fg: "#2C6E31" },
  Parcial: { bg: "#FCEFC7", fg: "#8A6A0C" },
  Pendente: { bg: "#F6E3D9", fg: "#9C4A1E" },
};

function statusDe(p) {
  const total = parseFloat(p.valorTotal) || 0;
  const pago = parseFloat(p.pago) || 0;
  if (total > 0 && pago >= total) return "Pago";
  if (pago > 0) return "Parcial";
  return "Pendente";
}

export default function PedidoAlfaiataria({ pecas, onCriar, onCampo, onRemover, onAddTecido, onTecido, nomesClientes }) {
  const [novaPeca, setNovaPeca] = useState(pecaVazia());
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("Todos");
  const [telIcaro, setTelIcaro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(null);
  const [expandida, setExpandida] = useState(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("config").select("valor").eq("chave", CHAVE_TELEFONE_ICARO).maybeSingle();
      if (data?.valor) setTelIcaro(data.valor);
    })();
  }, []);

  function setMedida(secKey, label, valor) {
    setNovaPeca((prev) => ({
      ...prev,
      medidas: { ...prev.medidas, [secKey]: { ...prev.medidas[secKey], [label]: valor } },
    }));
  }
  function setCaracteristica(label, valor) {
    setNovaPeca((prev) => ({ ...prev, caracteristicas: { ...prev.caracteristicas, [label]: valor } }));
  }
  function setTecido(i, campo, valor) {
    setNovaPeca((prev) => {
      const t = [...prev.tecidos];
      t[i] = { ...t[i], [campo]: valor };
      return { ...prev, tecidos: t };
    });
  }
  function addTecido() {
    setNovaPeca((prev) => ({ ...prev, tecidos: [...prev.tecidos, { codigo: "", qtd: 1, numero: "", fornecedor: "", comprado: false }] }));
  }

  function enviarIcaro(p) {
    const digitos = telIcaro.replace(/\D/g, "");
    const linhas = [`Oi Icaro! Novo lançamento: ${p.tipoPeca} do cliente ${p.cliente || "—"}.`];
    const secoes = PECA_SECOES[p.tipoPeca] || [];
    secoes.forEach((secKey) => {
      const valores = Object.entries(p.medidas?.[secKey] || {}).filter(([, v]) => v);
      if (valores.length) linhas.push(`${MEDIDAS_ALFAIATARIA[secKey].titulo}: ` + valores.map(([k, v]) => `${k} ${v}`).join(", "));
    });
    const caract = Object.entries(p.caracteristicas || {}).filter(([, v]) => v);
    if (caract.length) linhas.push("Características: " + caract.map(([k, v]) => `${k}: ${v}`).join(", "));
    const tecidosComCodigo = (p.tecidos || []).filter((t) => t.codigo);
    if (tecidosComCodigo.length) {
      linhas.push("Tecido: " + tecidosComCodigo.map((t) => `Código ${t.codigo} · Qtd ${t.qtd}${t.numero ? " · Obs: " + t.numero : ""}`).join(" | "));
    }
    if (p.observacoes) linhas.push(`Obs: ${p.observacoes}`);
    linhas.push(`Valor: ${brl(parseFloat(p.valorTotal) || 0)}`);
    const mensagem = encodeURIComponent(linhas.join("\n"));
    const url = digitos ? `https://wa.me/${digitos}?text=${mensagem}` : `https://wa.me/?text=${mensagem}`;
    window.open(url, "_blank");
  }

  async function submeter(e) {
    e.preventDefault();
    if (!novaPeca.cliente.trim()) return;
    setSalvando(true);
    setErro(null);
    try {
      await onCriar(novaPeca);
      setNovaPeca(pecaVazia());
    } catch (e) {
      setErro("Não consegui salvar (" + e.message + "). Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  const filtradas = pecas.filter((p) => {
    const bateBusca = p.cliente.toLowerCase().includes(busca.toLowerCase());
    const bateStatus = filtroStatus === "Todos" || statusDe(p) === filtroStatus;
    return bateBusca && bateStatus;
  });

  const totalGeral = pecas.reduce((s, p) => s + (parseFloat(p.valorTotal) || 0), 0);
  const pagoGeral = pecas.reduce((s, p) => s + (parseFloat(p.pago) || 0), 0);

  return (
    <div>
      <PageTitle eyebrow="Trajes, casacos e outras peças — produção: Icaro" title="Pedido Alfaiataria" />

      <Card style={{ padding: 16 }} className="mb-6">
        <p style={{ fontSize: 13, color: INK_SOFT, lineHeight: 1.6 }}>
          Escolha o tipo de peça abaixo — o formulário mostra automaticamente as medidas e características
          certas pra cada uma (traje completo inclui corpo, calça e colete; peças avulsas mostram só o que for relevante).
        </p>
        {!telIcaro && (
          <div className="mt-3" style={{ fontSize: 12, color: "#9C4A1E" }}>
            WhatsApp do Icaro ainda não configurado — configure uma vez em <strong>Configurações</strong> no menu.
          </div>
        )}
      </Card>

      <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <StatCard label="Peças lançadas" value={pecas.length} icon={Scissors} />
        <StatCard label="Total (R$)" value={brl(totalGeral)} icon={Wallet} />
        <StatCard label="Pago ao Icaro" value={brl(pagoGeral)} icon={CheckCircle2} />
        <StatCard label="Saldo devedor" value={brl(totalGeral - pagoGeral)} icon={Clock} />
      </div>

      <Card style={{ padding: 20 }} className="mb-6">
        <div className="fx-serif mb-3" style={{ fontSize: 16, fontWeight: 600 }}>
          Novo lançamento
        </div>
        <form onSubmit={submeter}>
          <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
            <Field label="Cliente">
              <input
                style={inputStyle}
                list="lista-clientes-alfaiataria"
                value={novaPeca.cliente}
                required
                onChange={(e) => setNovaPeca({ ...novaPeca, cliente: e.target.value })}
              />
              <datalist id="lista-clientes-alfaiataria">
                {(nomesClientes || []).map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
            </Field>
            <Field label="Tipo de peça">
              <select style={inputStyle} value={novaPeca.tipoPeca} onChange={(e) => setNovaPeca({ ...novaPeca, tipoPeca: e.target.value })}>
                {TIPOS_PECA.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </Field>
            <Field label="Data">
              <input type="date" style={inputStyle} value={novaPeca.dataPedido} onChange={(e) => setNovaPeca({ ...novaPeca, dataPedido: e.target.value })} />
            </Field>
            <Field label="Valor total (R$)">
              <input
                type="number"
                step="0.01"
                style={inputStyle}
                value={novaPeca.valorTotal}
                onChange={(e) => setNovaPeca({ ...novaPeca, valorTotal: e.target.value })}
              />
            </Field>
            <Field label="Pago ao Icaro (R$)">
              <input type="number" step="0.01" style={inputStyle} value={novaPeca.pago} onChange={(e) => setNovaPeca({ ...novaPeca, pago: e.target.value })} />
            </Field>
            <Field label="Observações">
              <input style={inputStyle} value={novaPeca.observacoes} onChange={(e) => setNovaPeca({ ...novaPeca, observacoes: e.target.value })} />
            </Field>
          </div>

          {(PECA_SECOES[novaPeca.tipoPeca] || []).map((secKey) => {
            const sec = MEDIDAS_ALFAIATARIA[secKey];
            return (
              <div key={secKey} className="mb-4">
                <div className="fx-serif mb-2" style={{ fontSize: 14, fontWeight: 600, color: BRASS }}>
                  {sec.titulo}
                </div>
                <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
                  {sec.campos.map((campo) => (
                    <Field key={campo.label} label={campo.label}>
                      <input
                        type="number"
                        step="0.5"
                        style={inputStyle}
                        value={novaPeca.medidas[secKey]?.[campo.label] || ""}
                        onChange={(e) => setMedida(secKey, campo.label, e.target.value)}
                      />
                      {campo.obs && <span style={{ fontSize: 10, color: TEXT_MUTED }}>{campo.obs}</span>}
                    </Field>
                  ))}
                </div>
              </div>
            );
          })}

          {(PECA_SECOES[novaPeca.tipoPeca] || []).includes("corpo") && (
            <div className="mb-4">
              <div className="fx-serif mb-2" style={{ fontSize: 14, fontWeight: 600, color: BRASS }}>
                Características
              </div>
              <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
                {CARACTERISTICAS_TRAJE.map((campo) => (
                  <CampoComOpcoes
                    key={campo.label}
                    label={campo.label}
                    opcoes={campo.opcoes}
                    obs={campo.obs}
                    valor={novaPeca.caracteristicas[campo.label] || ""}
                    onChange={(v) => setCaracteristica(campo.label, v)}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <div className="fx-serif" style={{ fontSize: 14, fontWeight: 600, color: BRASS }}>
                Tecido
              </div>
              <button type="button" onClick={addTecido} style={{ color: BRASS, fontSize: 13, fontWeight: 600 }}>
                + adicionar item
              </button>
            </div>
            <div style={{ fontSize: 11, color: TEXT_MUTED }} className="mb-3">
              O campo "Fornecedor" é só de uso interno — nunca aparece na mensagem enviada pro Icaro.
            </div>
            {novaPeca.tecidos.map((t, i) => (
              <div key={i} className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2 pb-2" style={{ borderBottom: `1px solid ${LINE}` }}>
                <input style={inputStyle} placeholder="Código" value={t.codigo} onChange={(e) => setTecido(i, "codigo", e.target.value)} />
                <input
                  style={{ ...inputStyle, background: BRASS_SOFT }}
                  placeholder="Fornecedor (interno)"
                  value={t.fornecedor}
                  onChange={(e) => setTecido(i, "fornecedor", e.target.value)}
                />
                <input type="number" style={inputStyle} placeholder="Qtd" value={t.qtd} onChange={(e) => setTecido(i, "qtd", e.target.value)} />
                <input style={inputStyle} placeholder="Observação" value={t.numero} onChange={(e) => setTecido(i, "numero", e.target.value)} />
              </div>
            ))}
          </div>

          {erro && (
            <div className="mb-4 px-4 py-3 rounded" style={{ background: "#F6E3D9", color: "#9C4A1E", fontSize: 13 }}>
              {erro}
            </div>
          )}

          <button
            type="submit"
            disabled={salvando}
            style={{ background: INK, color: "#FFF", padding: "9px 18px", borderRadius: 8, fontWeight: 600, fontSize: 13, opacity: salvando ? 0.7 : 1 }}
          >
            {salvando ? "Salvando…" : "Salvar"}
          </button>
        </form>
      </Card>

      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <div className="flex items-center gap-2 flex-1" style={{ ...inputStyle, padding: "6px 10px" }}>
          <Search size={14} color={TEXT_MUTED} />
          <input
            placeholder="Buscar cliente…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            style={{ border: "none", outline: "none", background: "transparent", width: "100%", fontSize: 14 }}
          />
        </div>
        <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} style={{ ...inputStyle, maxWidth: 180 }}>
          <option>Todos</option>
          <option>Pendente</option>
          <option>Parcial</option>
          <option>Pago</option>
        </select>
      </div>

      <Card>
        {filtradas.length === 0 && (
          <div className="p-6">
            <Empty texto="Nenhuma peça lançada ainda." />
          </div>
        )}
        {filtradas.map((p, i) => {
          const total = parseFloat(p.valorTotal) || 0;
          const pago = parseFloat(p.pago) || 0;
          const saldo = total - pago;
          const aberta = expandida === p.id;
          return (
            <div key={p.id} style={{ borderBottom: i < filtradas.length - 1 ? `1px solid ${LINE}` : "none" }}>
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{p.cliente}</div>
                  <div style={{ fontSize: 12, color: TEXT_MUTED }}>
                    {p.tipoPeca} · {fmtData(p.dataPedido)}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="fx-mono" style={{ fontSize: 13, fontWeight: 600 }}>
                      {brl(total)}
                    </div>
                    <label className="flex items-center gap-1 justify-end" style={{ fontSize: 11, color: TEXT_MUTED }}>
                      pago
                      <input
                        type="number"
                        step="0.01"
                        value={p.pago}
                        onChange={(e) => onCampo(p.id, "pago", e.target.value)}
                        style={{ width: 70, padding: "2px 4px", borderRadius: 4, border: `1px solid ${LINE}`, fontSize: 11 }}
                        className="fx-mono"
                      />
                    </label>
                    <div className="fx-mono" style={{ fontSize: 11, color: TEXT_MUTED }}>
                      saldo {brl(saldo)}
                    </div>
                  </div>
                  <Pill text={statusDe(p)} style={STATUS_PECA_STYLE[statusDe(p)]} />
                  <button
                    onClick={() => setExpandida(aberta ? null : p.id)}
                    title="Tecido / compras"
                    style={{ background: aberta ? BRASS_SOFT : "transparent", border: `1px solid ${LINE}`, padding: "6px 8px", borderRadius: 6 }}
                  >
                    <Scissors size={13} color={BRASS} />
                    {aberta ? <ChevronUp size={13} style={{ marginLeft: 2 }} /> : <ChevronDown size={13} style={{ marginLeft: 2 }} />}
                  </button>
                  <button onClick={() => enviarIcaro(p)} title="Enviar pro Icaro no WhatsApp" style={{ background: "#25D366", color: "#FFF", padding: "6px 10px", borderRadius: 6 }}>
                    <Printer size={13} />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("Excluir este lançamento?")) onRemover(p.id);
                    }}
                  >
                    <Trash2 size={14} color="#9C4A1E" />
                  </button>
                </div>
              </div>

              {aberta && (
                <div className="px-5 pb-4" style={{ background: "#FCFAF5" }}>
                  <div className="flex items-center justify-between mb-1 pt-2">
                    <div style={{ fontSize: 12, fontWeight: 600, color: INK_SOFT }}>Tecido / compras</div>
                    <button type="button" onClick={() => onAddTecido(p.id)} style={{ color: BRASS, fontSize: 12, fontWeight: 600 }}>
                      + adicionar item
                    </button>
                  </div>
                  {p.tecidos.length === 0 && <div style={{ fontSize: 12, color: TEXT_MUTED }}>Nenhum tecido lançado ainda.</div>}
                  {p.tecidos.map((t) => (
                    <div key={t.id} className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-2 pb-2 items-center" style={{ borderBottom: `1px solid ${LINE}` }}>
                      <input style={inputStyle} placeholder="Código" value={t.codigo} onChange={(e) => onTecido(p.id, t.id, "codigo", e.target.value)} />
                      <input
                        style={{ ...inputStyle, background: BRASS_SOFT }}
                        placeholder="Fornecedor (interno)"
                        value={t.fornecedor || ""}
                        onChange={(e) => onTecido(p.id, t.id, "fornecedor", e.target.value)}
                      />
                      <input type="number" style={inputStyle} placeholder="Qtd" value={t.qtd} onChange={(e) => onTecido(p.id, t.id, "qtd", e.target.value)} />
                      <input style={inputStyle} placeholder="Observação" value={t.numero} onChange={(e) => onTecido(p.id, t.id, "numero", e.target.value)} />
                      <button
                        type="button"
                        onClick={() => onTecido(p.id, t.id, "comprado", !t.comprado)}
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
                </div>
              )}
            </div>
          );
        })}
      </Card>
    </div>
  );
}
