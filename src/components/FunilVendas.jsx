import React, { useMemo, useState } from "react";
import { CalendarCheck, ChevronLeft, ChevronRight, Compass, HandCoins, Percent, Phone } from "lucide-react";
import { Card, PageTitle, StatCard } from "./ui";
import { BRASS, INK, LINE, TEXT_MUTED, inputStyle } from "../lib/constants";
import { useAtividadesComerciais } from "../hooks/useAtividadesComerciais";

const VERDE = "#2C6E31";
const VERMELHO = "#9C4A1E";

// Meta semanal de referência do Manual de Vendas Schuck ("Rotina
// Semanal") — só orientativa, não trava nada.
const META_CONTATOS = "40–50";
const META_FECHAMENTOS = "3–5";

const HISTORICO_SEMANAS = 8;

// Referência de crescimento de carteira do manual — mês do funil →
// clientes esperados na carteira (direção, não limite rígido).
const REFERENCIA_CARTEIRA = [
  { mes: 1, clientes: 10 },
  { mes: 2, clientes: 20 },
  { mes: 3, clientes: 35 },
  { mes: 6, clientes: 80 },
  { mes: 12, clientes: 150 },
];

function segundaFeiraDe(dataISO) {
  const d = new Date(dataISO + "T00:00:00");
  const diaSemana = d.getDay();
  const diff = diaSemana === 0 ? -6 : 1 - diaSemana;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}
function domingoDe(segundaISO) {
  const d = new Date(segundaISO + "T00:00:00");
  d.setDate(d.getDate() + 6);
  return d.toISOString().slice(0, 10);
}
function semanaAnteriorDe(segundaISO) {
  const d = new Date(segundaISO + "T00:00:00");
  d.setDate(d.getDate() - 7);
  return d.toISOString().slice(0, 10);
}
function semanaSeguinteDe(segundaISO) {
  const d = new Date(segundaISO + "T00:00:00");
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}
function fmtDataCurta(iso) {
  const [, mes, dia] = iso.split("-");
  return `${dia}/${mes}`;
}
function rotuloSemana(segundaISO) {
  return `${fmtDataCurta(segundaISO)} – ${fmtDataCurta(domingoDe(segundaISO))}`;
}

// Fase dos primeiros 90 dias (Manual de Vendas, seção 2) — baseada em há
// quantos dias o vendedor tem pedido próprio (proxy de "início de fato").
function faseDe(dias) {
  if (dias == null) return null;
  if (dias <= 30) return { nome: "Ativação + Prospecção", objetivo: "Reabrir conversas, gerar atendimentos e conquistar as primeiras vendas." };
  if (dias <= 60) return { nome: "Carteira + Indicação", objetivo: "Transformar compradores em relacionamento e gerar indicações." };
  if (dias <= 90) return { nome: "Escala", objetivo: "Aumentar recorrência, indicações e prospecção organizada." };
  return { nome: "Carteira em consolidação", objetivo: "Depender cada vez menos de prospecção fria — a carteira já deve alimentar o próprio funil." };
}

function referenciaCarteiraDoMes(mesDoFunil) {
  let ref = REFERENCIA_CARTEIRA[0];
  for (const r of REFERENCIA_CARTEIRA) {
    if (mesDoFunil >= r.mes) ref = r;
  }
  return ref;
}

// Funil de vendas — Contatos e Agendamentos são registrados à mão pelo
// próprio vendedor (não têm outro rastro no sistema); Fechamentos e a
// taxa de conversão vêm direto dos pedidos reais, pra não
// duplicar/divergir. Usado tanto no login do vendedor (editável,
// "podeEditar") quanto no login do dono, pra acompanhar (só leitura).
export default function FunilVendas({ vendedorId, pedidos, podeEditar = false, tituloCompacto }) {
  const { atividades, loading, salvando, salvarSemana } = useAtividadesComerciais(vendedorId);
  const hojeISO = new Date().toISOString().slice(0, 10);
  const [semana, setSemana] = useState(segundaFeiraDe(hojeISO));
  const ehSemanaAtual = semana === segundaFeiraDe(hojeISO);

  const linhaSemana = atividades.find((a) => a.semana === semana);
  const [edicao, setEdicao] = useState(null);
  const editando = edicao && edicao.semana === semana ? edicao : { semana, contatos: linhaSemana?.contatos || 0, agendamentos: linhaSemana?.agendamentos || 0 };

  function setCampo(campo, valor) {
    setEdicao({ ...editando, semana, [campo]: Math.max(0, parseInt(valor, 10) || 0) });
  }

  const [salvo, setSalvo] = useState(null);
  async function salvar() {
    const ok = await salvarSemana(semana, editando);
    setSalvo(ok);
    setEdicao(null);
    setTimeout(() => setSalvo(null), 2500);
  }

  const pedidosDaSemana = useMemo(() => {
    const fim = domingoDe(semana);
    return (pedidos || []).filter((p) => p.dataPedido && p.dataPedido >= semana && p.dataPedido <= fim);
  }, [pedidos, semana]);
  const fechamentosSemana = pedidosDaSemana.filter((p) => p.status !== "Doação").length;
  const taxaConversaoSemana = editando.contatos > 0 ? (fechamentosSemana / editando.contatos) * 100 : null;

  const totalClientesCarteira = useMemo(() => {
    const ids = new Set();
    (pedidos || []).forEach((p) => {
      if (p.status !== "Doação" && p.clienteId) ids.add(p.clienteId);
    });
    return ids.size;
  }, [pedidos]);

  const primeiraDataPedido = useMemo(() => {
    const datas = (pedidos || []).map((p) => p.dataPedido).filter(Boolean).sort();
    return datas[0] || null;
  }, [pedidos]);
  const diasDesdeInicio = primeiraDataPedido ? Math.floor((Date.now() - new Date(primeiraDataPedido + "T00:00:00").getTime()) / 86400000) : null;
  const fase = faseDe(diasDesdeInicio);
  const mesDoFunil = diasDesdeInicio != null ? Math.max(1, Math.ceil((diasDesdeInicio + 1) / 30)) : null;
  const referenciaCarteira = mesDoFunil != null ? referenciaCarteiraDoMes(mesDoFunil) : null;

  const historico = useMemo(() => {
    const semanas = [];
    let cursor = semana;
    for (let i = 0; i < HISTORICO_SEMANAS; i++) {
      semanas.push(cursor);
      cursor = semanaAnteriorDe(cursor);
    }
    return semanas.map((s) => {
      const fim = domingoDe(s);
      const fechamentos = (pedidos || []).filter((p) => p.dataPedido && p.dataPedido >= s && p.dataPedido <= fim && p.status !== "Doação").length;
      const linha = atividades.find((a) => a.semana === s);
      const taxa = linha?.contatos > 0 ? (fechamentos / linha.contatos) * 100 : null;
      return { semana: s, fechamentos, taxa, ...linha };
    });
  }, [semana, pedidos, atividades]);

  const linhas = [
    { campo: "contatos", label: "Contatos", meta: META_CONTATOS, icon: Phone },
    { campo: "agendamentos", label: "Agendamentos", meta: null, icon: CalendarCheck },
  ];

  return (
    <div>
      {tituloCompacto ? (
        <div className="fx-serif mb-1" style={{ fontSize: 15, fontWeight: 600 }}>
          {tituloCompacto}
        </div>
      ) : (
        <PageTitle eyebrow="Prospecção, carteira e indicação" title="Funil de Vendas" />
      )}

      {fase && (
        <div className="flex items-start gap-2 mb-4 p-3" style={{ background: "#F3EEDF", borderRadius: 8, fontSize: 12 }}>
          <Compass size={16} color={BRASS} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <strong>Fase: {fase.nome}</strong> ({diasDesdeInicio} dia(s) desde o primeiro pedido). {fase.objetivo}
            {referenciaCarteira && (
              <>
                {" "}Você tem <strong>{totalClientesCarteira}</strong> cliente(s) na carteira — referência do manual pro mês {referenciaCarteira.mes}: {referenciaCarteira.clientes} clientes.
              </>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => setSemana(semanaAnteriorDe(semana))}
          className="flex items-center gap-1"
          style={{ background: "#EDEAE0", color: INK, padding: "7px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600 }}
        >
          <ChevronLeft size={14} /> semana anterior
        </button>
        <div style={{ fontSize: 14, fontWeight: 700, minWidth: 140, textAlign: "center" }}>{rotuloSemana(semana)}</div>
        <button
          onClick={() => setSemana(semanaSeguinteDe(semana))}
          disabled={ehSemanaAtual}
          className="flex items-center gap-1"
          style={{ background: "#EDEAE0", color: ehSemanaAtual ? TEXT_MUTED : INK, padding: "7px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, opacity: ehSemanaAtual ? 0.6 : 1 }}
        >
          semana seguinte <ChevronRight size={14} />
        </button>
        {!ehSemanaAtual && (
          <button onClick={() => setSemana(segundaFeiraDe(hojeISO))} style={{ color: BRASS, fontSize: 12, fontWeight: 600 }}>
            voltar pra semana atual
          </button>
        )}
      </div>

      <Card style={{ padding: 20 }} className="mb-6">
        <div className="fx-serif mb-1" style={{ fontSize: 15, fontWeight: 600 }}>
          Contatos, Agendamentos e Fechamentos
        </div>
        <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 16 }}>
          {podeEditar
            ? "Contatos e agendamentos são registrados por você — fechamentos e a taxa de conversão vêm sozinhos dos pedidos fechados."
            : "Contatos e agendamentos são registrados pelo próprio vendedor — fechamentos e a taxa de conversão vêm dos pedidos fechados."}
        </div>
        <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
          {linhas.map(({ campo, label, meta, icon: Icon }) =>
            podeEditar ? (
              <div key={campo}>
                <div className="flex items-center gap-1.5" style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 4 }}>
                  <Icon size={12} /> {label} {meta && <span>(meta {meta})</span>}
                </div>
                <input type="number" min="0" step="1" style={inputStyle} value={editando[campo]} onChange={(e) => setCampo(campo, e.target.value)} />
              </div>
            ) : (
              <StatCard key={campo} label={meta ? `${label} (meta ${meta})` : label} value={String(loading ? "…" : editando[campo])} icon={Icon} />
            )
          )}
          <StatCard label={`Fechamentos (meta ${META_FECHAMENTOS})`} value={String(fechamentosSemana)} icon={HandCoins} accent={fechamentosSemana > 0 ? VERDE : undefined} />
          <StatCard
            label="Taxa de conversão"
            value={taxaConversaoSemana != null ? `${taxaConversaoSemana.toFixed(0)}%` : "—"}
            icon={Percent}
            accent={taxaConversaoSemana != null ? (taxaConversaoSemana >= 10 ? VERDE : VERMELHO) : undefined}
          />
        </div>
        {podeEditar && (
          <button
            onClick={salvar}
            disabled={salvando}
            style={{ background: salvo ? VERDE : INK, color: "#FFF", padding: "9px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600 }}
          >
            {salvando ? "Salvando…" : salvo ? "Salvo ✓" : "Salvar semana"}
          </button>
        )}
      </Card>

      <Card style={{ padding: 20 }}>
        <div className="fx-serif mb-1" style={{ fontSize: 15, fontWeight: 600 }}>
          Histórico — últimas {HISTORICO_SEMANAS} semanas
        </div>
        <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 16 }}>Semana mais recente primeiro.</div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 480 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${LINE}` }}>
                {["Semana", "Contatos", "Agendamentos", "Fechamentos", "Conversão"].map((h, i) => (
                  <th key={h} style={{ textAlign: i === 0 ? "left" : "right", padding: "6px 10px", fontWeight: 600, fontSize: 10, color: TEXT_MUTED, textTransform: "uppercase" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {historico.map((h) => (
                <tr key={h.semana} style={{ borderBottom: `1px solid ${LINE}` }}>
                  <td style={{ padding: "6px 10px", fontWeight: 600, whiteSpace: "nowrap" }}>{rotuloSemana(h.semana)}</td>
                  <td className="fx-mono" style={{ padding: "6px 10px", textAlign: "right" }}>{h.contatos ?? "—"}</td>
                  <td className="fx-mono" style={{ padding: "6px 10px", textAlign: "right" }}>{h.agendamentos ?? "—"}</td>
                  <td className="fx-mono" style={{ padding: "6px 10px", textAlign: "right", fontWeight: 700, color: h.fechamentos > 0 ? VERDE : TEXT_MUTED }}>{h.fechamentos}</td>
                  <td className="fx-mono" style={{ padding: "6px 10px", textAlign: "right" }}>{h.taxa != null ? `${h.taxa.toFixed(0)}%` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
