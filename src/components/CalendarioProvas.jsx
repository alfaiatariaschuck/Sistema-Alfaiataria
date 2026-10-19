import React, { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Pencil, X } from "lucide-react";
import { Card, Empty, Field, PageTitle, Pill } from "./ui";
import { BRASS, INK, LINE, TEXT_MUTED, inputStyle } from "../lib/constants";
import { fmtData, hojeISO } from "../lib/helpers";

// Calendário de Provas — mesmo padrão visual da Agenda Comercial
// (components/AgendaComercial.jsx), mas alimentado pelas peças de
// alfaiataria em vez de uma tabela de agendamentos à parte. Usado tanto
// no login do dono (Shell.jsx) quanto no do Ícaro (ShellProducao.jsx) —
// cada um passa sua própria função de atualizar (atualizarCampo do
// dono, atualizarProva do Ícaro) e sua própria lista de peças, já
// filtrada pelo RLS de cada papel.
export default function CalendarioProvas({ pecas, onAtualizarProva, onAbrir, tituloCompacto }) {
  const hoje = hojeISO();
  const hojeInicial = new Date(hoje + "T00:00:00");
  const [mes, setMes] = useState(hojeInicial.getMonth());
  const [ano, setAno] = useState(hojeInicial.getFullYear());
  const [diaSelecionado, setDiaSelecionado] = useState(null);
  const [editando, setEditando] = useState(null);
  const [edicao, setEdicao] = useState({ dataProva: "", horaProva: "" });

  // Só peça com prova marcada e ainda não entregue — prova de peça já
  // entregue é passado, não serve pra organizar nada.
  const comProva = useMemo(() => (pecas || []).filter((p) => p.dataProva && p.status !== "Entregue"), [pecas]);

  const porDia = useMemo(() => {
    const mapa = new Map();
    comProva.forEach((p) => {
      if (!mapa.has(p.dataProva)) mapa.set(p.dataProva, []);
      mapa.get(p.dataProva).push(p);
    });
    return mapa;
  }, [comProva]);

  const listados = useMemo(() => {
    const base = diaSelecionado ? comProva.filter((p) => p.dataProva === diaSelecionado) : comProva.filter((p) => p.dataProva >= hoje);
    return [...base].sort((a, b) => (a.dataProva + (a.horaProva || "")).localeCompare(b.dataProva + (b.horaProva || "")));
  }, [comProva, diaSelecionado, hoje]);

  function abrirEdicao(p) {
    if (editando === p.id) {
      setEditando(null);
      return;
    }
    setEditando(p.id);
    setEdicao({ dataProva: p.dataProva, horaProva: p.horaProva || "" });
  }

  async function salvarEdicao(id) {
    if (!edicao.dataProva) return;
    await onAtualizarProva(id, edicao.dataProva, edicao.horaProva);
    setEditando(null);
  }

  async function limparProva(id) {
    await onAtualizarProva(id, "", "");
    setEditando(null);
  }

  return (
    <div>
      {tituloCompacto ? (
        <div className="fx-serif mb-1" style={{ fontSize: 15, fontWeight: 600 }}>
          {tituloCompacto}
        </div>
      ) : (
        <PageTitle eyebrow="Alfaiataria" title="Calendário de Provas" />
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
              return (
                <button
                  key={i}
                  onClick={() => setDiaSelecionado(selecionado ? null : iso)}
                  title={doDia.map((p) => `${p.horaProva ? p.horaProva + " " : ""}${p.cliente} (${p.tipoPeca})`).join(", ") || undefined}
                  style={{
                    minHeight: 44,
                    border: selecionado ? `2px solid ${BRASS}` : ehHoje ? `2px solid ${INK}` : `1px solid ${LINE}`,
                    borderRadius: 6,
                    padding: 4,
                    textAlign: "left",
                    background: doDia.length > 0 ? "#FCEFC7" : "transparent",
                  }}
                >
                  <div style={{ fontSize: 10, fontWeight: ehHoje ? 700 : 500, color: ehHoje ? BRASS : INK }}>{dia}</div>
                  {doDia.length > 0 && (
                    <div className="fx-mono" style={{ fontSize: 9, color: "#8A6A0C", fontWeight: 700, marginTop: 2 }}>
                      {doDia.length}
                    </div>
                  )}
                </button>
              );
            });
          })()}
        </div>
      </Card>

      <Card style={{ padding: 20 }}>
        <div className="flex items-center justify-between mb-3">
          <div className="fx-serif" style={{ fontSize: 15, fontWeight: 600 }}>
            {diaSelecionado ? `Provas de ${fmtData(diaSelecionado)}` : "Próximas provas"}
          </div>
          {diaSelecionado && (
            <button onClick={() => setDiaSelecionado(null)} className="flex items-center gap-1" style={{ color: BRASS, fontSize: 12, fontWeight: 600 }}>
              <X size={13} /> ver todas
            </button>
          )}
        </div>
        {listados.length === 0 && <Empty texto={diaSelecionado ? "Nenhuma prova marcada nesse dia." : "Nenhuma prova marcada ainda."} />}
        {listados.map((p) => (
          <div key={p.id} className="py-2.5" style={{ borderBottom: `1px solid ${LINE}` }}>
            <div className="flex items-center justify-between">
              <button onClick={() => onAbrir && onAbrir(p.id)} className="text-left" disabled={!onAbrir}>
                <div className="flex items-center gap-1.5">
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{p.cliente}</span>
                  <Pill text={p.tipoPeca} style={{ bg: "#EDEAE0", fg: INK }} />
                </div>
                <div style={{ fontSize: 11, color: TEXT_MUTED }}>
                  {fmtData(p.dataProva)}
                  {p.horaProva ? ` às ${p.horaProva}` : ""} · {p.status}
                </div>
              </button>
              <button onClick={() => abrirEdicao(p)} title="Remarcar data/hora" className="flex-shrink-0">
                <Pencil size={14} color={TEXT_MUTED} />
              </button>
            </div>
            {editando === p.id && (
              <div className="mt-2 p-3" style={{ background: "#F3EEDF", borderRadius: 8 }}>
                <div className="grid gap-2 mb-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
                  <Field label="Data da prova">
                    <input type="date" style={inputStyle} value={edicao.dataProva} onChange={(e) => setEdicao({ ...edicao, dataProva: e.target.value })} />
                  </Field>
                  <Field label="Hora (opcional)">
                    <input type="time" style={inputStyle} value={edicao.horaProva} onChange={(e) => setEdicao({ ...edicao, horaProva: e.target.value })} />
                  </Field>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <button onClick={() => salvarEdicao(p.id)} style={{ background: INK, color: "#FFF", padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
                    Salvar
                  </button>
                  <button onClick={() => limparProva(p.id)} style={{ color: "#9C4A1E", fontSize: 12, fontWeight: 600 }}>
                    remover prova
                  </button>
                  <button onClick={() => setEditando(null)} style={{ color: TEXT_MUTED, fontSize: 12 }}>
                    cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </Card>
    </div>
  );
}
