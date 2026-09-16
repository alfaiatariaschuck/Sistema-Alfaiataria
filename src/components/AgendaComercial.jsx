import React, { useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Plus, Trash2, X } from "lucide-react";
import { Card, Empty, Field, PageTitle, Pill } from "./ui";
import CampoAutocomplete from "./CampoAutocomplete";
import { BRASS, INK, LINE, TEXT_MUTED, inputStyle } from "../lib/constants";
import { hojeISO, fmtData } from "../lib/helpers";
import { useAgendamentosComerciais } from "../hooks/useAgendamentosComerciais";

const VERDE = "#2C6E31";
const VERMELHO = "#9C4A1E";
const STATUS_STYLE_AGENDA = {
  Agendado: { bg: "#FCEFC7", fg: "#8A6A0C" },
  Realizado: { bg: "#DCEBDD", fg: VERDE },
  Cancelado: { bg: "#F6E3D9", fg: VERMELHO },
};

function agendaVazia() {
  return { cliente: "", data: hojeISO(), hora: "", observacao: "" };
}

// Agenda comercial — calendário do mês + lista dos próximos agendamentos.
// Usado tanto no login do vendedor (podeEditar: lança/edita/exclui) quanto
// no login do dono (só leitura + marcar Realizado/Cancelado, pra
// acompanhar conforme o vendedor vai agendando) — mesma "cara" nos dois
// lados, só muda o que cada um pode mexer (igual TabelaControleProducao).
export default function AgendaComercial({ vendedorId, podeEditar = false, nomesClientes = [], tituloCompacto }) {
  const { agendamentos, loading, erro, criarAgendamento, atualizarStatus, removerAgendamento } = useAgendamentosComerciais(vendedorId);
  const hoje = hojeISO();
  const hojeInicial = new Date(hoje + "T00:00:00");
  const [mes, setMes] = useState(hojeInicial.getMonth());
  const [ano, setAno] = useState(hojeInicial.getFullYear());
  const [diaSelecionado, setDiaSelecionado] = useState(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [novo, setNovo] = useState(agendaVazia());
  const [salvando, setSalvando] = useState(false);

  const porDia = useMemo(() => {
    const mapa = new Map();
    agendamentos.forEach((a) => {
      if (!mapa.has(a.data)) mapa.set(a.data, []);
      mapa.get(a.data).push(a);
    });
    return mapa;
  }, [agendamentos]);

  const listados = useMemo(() => {
    const base = diaSelecionado ? agendamentos.filter((a) => a.data === diaSelecionado) : agendamentos.filter((a) => a.data >= hoje && a.status === "Agendado");
    return [...base].sort((a, b) => (a.data + (a.hora || "")).localeCompare(b.data + (b.hora || "")));
  }, [agendamentos, diaSelecionado, hoje]);

  async function salvar(e) {
    e.preventDefault();
    if (!novo.cliente.trim() || !novo.data) return;
    setSalvando(true);
    const ok = await criarAgendamento(novo);
    setSalvando(false);
    if (ok) {
      setNovo(agendaVazia());
      setMostrarForm(false);
    }
  }

  return (
    <div>
      {tituloCompacto ? (
        <div className="fx-serif mb-1" style={{ fontSize: 15, fontWeight: 600 }}>
          {tituloCompacto}
        </div>
      ) : (
        <PageTitle eyebrow="Reuniões e provas marcadas" title="Agenda Comercial" />
      )}

      {erro && <div className="mb-3 p-3" style={{ background: "#F6E3D9", color: VERMELHO, borderRadius: 8, fontSize: 12 }}>{erro}</div>}

      {podeEditar && (
        <div className="mb-4">
          <button
            onClick={() => setMostrarForm((v) => !v)}
            className="flex items-center gap-2"
            style={{ background: mostrarForm ? "#EDEAE0" : INK, color: mostrarForm ? INK : "#FFF", padding: "9px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13 }}
          >
            <Plus size={15} style={mostrarForm ? { transform: "rotate(45deg)" } : {}} /> {mostrarForm ? "cancelar" : "Novo agendamento"}
          </button>
          {mostrarForm && (
            <Card style={{ padding: 20 }} className="mt-3">
              <form onSubmit={salvar}>
                <div className="grid gap-3 mb-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
                  <Field label="Cliente">
                    <CampoAutocomplete value={novo.cliente} onChange={(v) => setNovo({ ...novo, cliente: v })} opcoes={nomesClientes} placeholder="Nome do cliente" required />
                  </Field>
                  <Field label="Data">
                    <input type="date" style={inputStyle} value={novo.data} onChange={(e) => setNovo({ ...novo, data: e.target.value })} required />
                  </Field>
                  <Field label="Hora (opcional)">
                    <input type="time" style={inputStyle} value={novo.hora} onChange={(e) => setNovo({ ...novo, hora: e.target.value })} />
                  </Field>
                </div>
                <Field label="Observação (opcional)">
                  <input style={inputStyle} value={novo.observacao} onChange={(e) => setNovo({ ...novo, observacao: e.target.value })} placeholder="Ex: prova de traje, apresentação de coleção…" />
                </Field>
                <button
                  type="submit"
                  disabled={salvando}
                  className="mt-3"
                  style={{ background: INK, color: "#FFF", padding: "8px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13, opacity: salvando ? 0.7 : 1 }}
                >
                  {salvando ? "Salvando…" : "Agendar"}
                </button>
              </form>
            </Card>
          )}
        </div>
      )}

      <Card style={{ padding: 20 }} className="mb-6">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <CalendarDays size={15} color={BRASS} />
            <span className="fx-serif" style={{ fontSize: 14, fontWeight: 600 }}>
              {new Date(ano, mes, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                if (mes === 0) {
                  setMes(11);
                  setAno((a) => a - 1);
                } else setMes((m) => m - 1);
              }}
              style={{ padding: 4 }}
            >
              <ChevronLeft size={16} color={TEXT_MUTED} />
            </button>
            <button
              onClick={() => {
                if (mes === 11) {
                  setMes(0);
                  setAno((a) => a + 1);
                } else setMes((m) => m + 1);
              }}
              style={{ padding: 4 }}
            >
              <ChevronRight size={16} color={TEXT_MUTED} />
            </button>
          </div>
        </div>
        <div className="grid gap-1 mb-1 mt-3" style={{ gridTemplateColumns: "repeat(7, 1fr)" }}>
          {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
            <div key={i} style={{ fontSize: 10, color: TEXT_MUTED, textAlign: "center", fontWeight: 600 }}>
              {d}
            </div>
          ))}
        </div>
        <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(7, 1fr)" }}>
          {(() => {
            const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
            const diasNoMes = new Date(ano, mes + 1, 0).getDate();
            const celulas = [];
            for (let i = 0; i < primeiroDiaSemana; i++) celulas.push(null);
            for (let dia = 1; dia <= diasNoMes; dia++) celulas.push(dia);
            return celulas.map((dia, i) => {
              if (dia === null) return <div key={i} />;
              const iso = `${ano}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
              const doDia = porDia.get(iso) || [];
              const ehHoje = iso === hoje;
              const selecionado = diaSelecionado === iso;
              const temPendente = doDia.some((a) => a.status === "Agendado");
              return (
                <button
                  key={i}
                  onClick={() => setDiaSelecionado(selecionado ? null : iso)}
                  title={doDia.map((a) => `${a.hora ? a.hora + " " : ""}${a.cliente}`).join(", ") || undefined}
                  style={{
                    minHeight: 44,
                    border: selecionado ? `2px solid ${BRASS}` : ehHoje ? `2px solid ${INK}` : `1px solid ${LINE}`,
                    borderRadius: 6,
                    padding: 4,
                    textAlign: "left",
                    background: doDia.length > 0 ? (temPendente ? "#FCEFC7" : "#DCEBDD") : "transparent",
                  }}
                >
                  <div style={{ fontSize: 10, fontWeight: ehHoje ? 700 : 500, color: ehHoje ? BRASS : INK }}>{dia}</div>
                  {doDia.length > 0 && <div className="fx-mono" style={{ fontSize: 9, color: temPendente ? "#8A6A0C" : VERDE, fontWeight: 700, marginTop: 2 }}>{doDia.length}</div>}
                </button>
              );
            });
          })()}
        </div>
      </Card>

      <Card style={{ padding: 20 }}>
        <div className="flex items-center justify-between mb-3">
          <div className="fx-serif" style={{ fontSize: 15, fontWeight: 600 }}>
            {diaSelecionado ? `Agendamentos de ${fmtData(diaSelecionado)}` : "Próximos agendamentos"}
          </div>
          {diaSelecionado && (
            <button onClick={() => setDiaSelecionado(null)} className="flex items-center gap-1" style={{ color: BRASS, fontSize: 12, fontWeight: 600 }}>
              <X size={13} /> ver todos
            </button>
          )}
        </div>
        {loading && <div style={{ fontSize: 13, color: TEXT_MUTED }}>Carregando…</div>}
        {!loading && listados.length === 0 && <Empty texto={diaSelecionado ? "Nenhum agendamento nesse dia." : "Nenhum agendamento futuro ainda."} />}
        {!loading &&
          listados.map((a) => (
            <div key={a.id} className="flex items-center justify-between py-2.5" style={{ borderBottom: `1px solid ${LINE}` }}>
              <div>
                <div className="flex items-center gap-1.5">
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{a.cliente}</span>
                  <Pill text={a.status} style={STATUS_STYLE_AGENDA[a.status]} />
                </div>
                <div style={{ fontSize: 11, color: TEXT_MUTED }}>
                  {fmtData(a.data)}
                  {a.hora ? ` às ${a.hora}` : ""}
                  {a.observacao ? ` · ${a.observacao}` : ""}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {a.status === "Agendado" && (
                  <>
                    <button onClick={() => atualizarStatus(a.id, "Realizado")} title="Marcar como realizado">
                      <CheckCircle2 size={16} color={VERDE} />
                    </button>
                    <button onClick={() => atualizarStatus(a.id, "Cancelado")} title="Cancelar">
                      <X size={16} color={VERMELHO} />
                    </button>
                  </>
                )}
                {podeEditar && (
                  <button onClick={() => removerAgendamento(a.id)} title="Excluir">
                    <Trash2 size={14} color={VERMELHO} />
                  </button>
                )}
              </div>
            </div>
          ))}
      </Card>
    </div>
  );
}
