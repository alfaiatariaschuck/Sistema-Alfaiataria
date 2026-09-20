import React, { useState } from "react";
import { AlertTriangle, CalendarClock, CheckCircle2, ChevronLeft, ChevronRight, PiggyBank } from "lucide-react";
import { Card, Empty, PageTitle, Pill, StatCard } from "../components/ui";
import { BRASS, INK, LINE, LINHA_STYLE, TIPOS_SAIDA_SEM_VENDA, TEXT_MUTED, inputStyle } from "../lib/constants";
import { brl, fmtData, hojeISO, valorRecebidoEfetivo } from "../lib/helpers";

const VERMELHO = "#9C4A1E";
const VERDE = "#2C6E31";

// Contas a Receber — o espelho do Contas a Pagar, só que pro lado de
// quem me deve. Diferente de despesa, pedido/peça não tem uma data de
// vencimento pronta; "Data para cobrar" é 100% manual, você decide
// quando quer cobrar cada cliente (pedido sem essa data cai à parte,
// em "sem data de cobrança", pra lembrar de definir uma).
export default function ContasAReceber({ pedidos, pecas, onAtualizarPedidoCampo, onAtualizarPedidoSubcampo, onAtualizarPecaCampo, irParaPedido, irParaPeca }) {
  const hoje = hojeISO();
  const hojeInicial = new Date(hoje + "T00:00:00");
  const [mesCalendario, setMesCalendario] = useState(hojeInicial.getMonth());
  const [anoCalendario, setAnoCalendario] = useState(hojeInicial.getFullYear());
  const [mostrarSemData, setMostrarSemData] = useState(false);

  function recebidoEfetivo(item) {
    return valorRecebidoEfetivo({
      pagamentoDividido: item.pagamentoDividido,
      valorEntrada: item.valorEntrada,
      statusEntrada: item.statusEntrada,
      valorRestante: item.valorRestante,
      statusRestante: item.statusRestante,
      valorTotal: item.valor,
      statusTotal: item.status,
    });
  }

  // Junta pedidos de camisaria (aReceber) e peças de alfaiataria
  // (valorVenda) numa lista só, com o suficiente pra editar sem precisar
  // abrir o pedido/peça inteiro.
  const itens = [
    ...(pedidos || [])
      .filter((p) => p.status !== "Doação" && parseFloat(p.aReceber.valor) > 0)
      .map((p) => ({
        id: p.id,
        tipo: "camisa",
        linha: "Camisaria",
        cliente: p.cliente,
        valor: parseFloat(p.aReceber.valor) || 0,
        status: p.aReceber.statusPagamento,
        pagamentoDividido: p.pagamentoDividido,
        valorEntrada: p.valorEntrada,
        statusEntrada: p.statusEntrada,
        valorRestante: p.valorRestante,
        statusRestante: p.statusRestante,
        dataCobranca: p.dataCobranca || "",
      })),
    ...(pecas || [])
      .filter((p) => !TIPOS_SAIDA_SEM_VENDA.includes(p.tipoSaida) && parseFloat(p.valorVenda) > 0)
      .map((p) => ({
        id: p.id,
        tipo: "peca",
        linha: "Alfaiataria",
        cliente: p.cliente,
        valor: parseFloat(p.valorVenda) || 0,
        status: p.statusPagamentoVenda || "Pendente",
        pagamentoDividido: p.pagamentoDividido,
        valorEntrada: p.valorEntrada,
        statusEntrada: p.statusEntrada,
        valorRestante: p.valorRestante,
        statusRestante: p.statusRestante,
        dataCobranca: p.dataCobranca || "",
      })),
  ]
    .map((item) => ({ ...item, pendente: Math.max(0, item.valor - recebidoEfetivo(item)) }))
    .filter((item) => item.pendente > 0.004);

  const atrasados = [...itens].filter((i) => i.dataCobranca && i.dataCobranca < hoje).sort((a, b) => a.dataCobranca.localeCompare(b.dataCobranca));
  const semData = itens.filter((i) => !i.dataCobranca);
  const proximos = [...itens].filter((i) => i.dataCobranca && i.dataCobranca >= hoje).sort((a, b) => a.dataCobranca.localeCompare(b.dataCobranca));

  const totalPendente = itens.reduce((s, i) => s + i.pendente, 0);
  const totalAtrasado = atrasados.reduce((s, i) => s + i.pendente, 0);
  const totalSemData = semData.reduce((s, i) => s + i.pendente, 0);

  // Calendário do mês — mesmo padrão do Contas a Pagar, agrupando pela
  // data de cobrança em vez de vencimento.
  const calendarioPorDia = (() => {
    const mapa = {};
    itens
      .filter((i) => {
        if (!i.dataCobranca) return false;
        const [ano, mes] = i.dataCobranca.split("-").map(Number);
        return ano === anoCalendario && mes === mesCalendario + 1;
      })
      .forEach((i) => {
        if (!mapa[i.dataCobranca]) mapa[i.dataCobranca] = { total: 0, itens: [] };
        mapa[i.dataCobranca].total += i.pendente;
        mapa[i.dataCobranca].itens.push(i);
      });
    return mapa;
  })();

  function abrir(item) {
    if (item.tipo === "camisa") irParaPedido(item.id);
    else irParaPeca(item.id);
  }

  function mudarDataCobranca(item, novaData) {
    if (item.tipo === "camisa") onAtualizarPedidoCampo(item.id, "dataCobranca", novaData);
    else onAtualizarPecaCampo(item.id, "dataCobranca", novaData);
  }

  // "Marcar recebido" fecha tudo de uma vez — se for pagamento dividido,
  // precisa marcar as duas partes (entrada e restante) como recebidas,
  // senão o saldo continua aparecendo como pendente.
  function marcarRecebido(item) {
    if (item.tipo === "camisa") {
      if (item.pagamentoDividido) {
        onAtualizarPedidoCampo(item.id, "statusEntrada", "Recebido");
        onAtualizarPedidoCampo(item.id, "statusRestante", "Recebido");
      } else {
        onAtualizarPedidoSubcampo(item.id, "aReceber", "statusPagamento", "Recebido");
      }
    } else if (item.pagamentoDividido) {
      onAtualizarPecaCampo(item.id, "statusEntrada", "Recebido");
      onAtualizarPecaCampo(item.id, "statusRestante", "Recebido");
    } else {
      onAtualizarPecaCampo(item.id, "statusPagamentoVenda", "Recebido");
    }
  }

  function renderItem(item, { destacarAtraso } = {}) {
    return (
      <div key={`${item.tipo}-${item.id}`} className="py-2" style={{ borderBottom: `1px solid ${LINE}` }}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <button onClick={() => abrir(item)} style={{ textAlign: "left" }} title="Abrir">
            <div className="flex items-center gap-1.5">
              <span style={{ fontSize: 13, fontWeight: 600 }}>{item.cliente || "Sem nome"}</span>
              <Pill text={item.linha} style={LINHA_STYLE[item.linha]} />
            </div>
            <div style={{ fontSize: 11, color: destacarAtraso ? VERMELHO : TEXT_MUTED }}>
              {item.dataCobranca ? `cobrar em ${fmtData(item.dataCobranca)}` : "sem data de cobrança definida"}
              {destacarAtraso ? " — atrasado" : ""}
            </div>
          </button>
          <div className="flex items-center gap-2">
            <span className="fx-mono" style={{ fontSize: 13, fontWeight: 600 }}>
              {brl(item.pendente)}
            </span>
            <input
              type="date"
              value={item.dataCobranca}
              onChange={(e) => mudarDataCobranca(item, e.target.value)}
              style={{ ...inputStyle, padding: "4px 8px", fontSize: 12, width: 135 }}
              title="Data para cobrar"
            />
            <button onClick={() => marcarRecebido(item)} title="Marcar como recebido">
              <CheckCircle2 size={16} color={VERDE} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageTitle eyebrow="Visão geral — financeiro" title="Contas a Receber" />

      <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <StatCard label="Total a receber" value={brl(totalPendente)} icon={PiggyBank} />
        <StatCard label="Atrasado" value={brl(totalAtrasado)} icon={AlertTriangle} accent={totalAtrasado > 0 ? VERMELHO : undefined} />
        <StatCard label="Sem data de cobrança" value={brl(totalSemData)} icon={CalendarClock} />
      </div>

      <div className="grid gap-6" style={{ gridTemplateColumns: "3fr 2fr" }}>
        <div>
          {atrasados.length > 0 && (
            <Card style={{ padding: 20 }} className="mb-6">
              <div className="fx-serif mb-1 flex items-center gap-2" style={{ fontSize: 16, fontWeight: 600, color: VERMELHO }}>
                <AlertTriangle size={16} /> Atrasados ({atrasados.length})
              </div>
              {atrasados.map((item) => renderItem(item, { destacarAtraso: true }))}
            </Card>
          )}

          <Card style={{ padding: 20 }} className="mb-6">
            <div className="fx-serif mb-1" style={{ fontSize: 16, fontWeight: 600 }}>
              Próximos a cobrar
            </div>
            {proximos.length === 0 && <Empty texto="Nada com data de cobrança marcada por enquanto." />}
            {proximos.map((item) => renderItem(item))}
          </Card>

          {semData.length > 0 && (
            <Card style={{ padding: 20 }}>
              <button type="button" className="flex items-center justify-between w-full" onClick={() => setMostrarSemData((v) => !v)}>
                <div className="fx-serif" style={{ fontSize: 16, fontWeight: 600 }}>
                  Sem data de cobrança ({semData.length})
                </div>
                <span style={{ fontSize: 11, color: BRASS, fontWeight: 600 }}>{mostrarSemData ? "ocultar ▲" : "ver ▼"}</span>
              </button>
              {mostrarSemData && semData.map((item) => renderItem(item))}
            </Card>
          )}
        </div>

        <Card style={{ padding: 20 }}>
          <div className="flex items-center justify-between mb-1">
            <div className="fx-serif" style={{ fontSize: 15, fontWeight: 600 }}>
              Calendário do mês
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  if (mesCalendario === 0) {
                    setMesCalendario(11);
                    setAnoCalendario((a) => a - 1);
                  } else {
                    setMesCalendario((m) => m - 1);
                  }
                }}
                style={{ padding: 4 }}
              >
                <ChevronLeft size={16} color={TEXT_MUTED} />
              </button>
              <span style={{ fontSize: 12, fontWeight: 600, minWidth: 110, textAlign: "center" }}>
                {new Date(anoCalendario, mesCalendario, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
              </span>
              <button
                onClick={() => {
                  if (mesCalendario === 11) {
                    setMesCalendario(0);
                    setAnoCalendario((a) => a + 1);
                  } else {
                    setMesCalendario((m) => m + 1);
                  }
                }}
                style={{ padding: 4 }}
              >
                <ChevronRight size={16} color={TEXT_MUTED} />
              </button>
            </div>
          </div>
          <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 12 }}>Dias com cobrança marcada, e quanto.</div>
          <div className="grid gap-1 mb-1" style={{ gridTemplateColumns: "repeat(7, 1fr)" }}>
            {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
              <div key={i} style={{ fontSize: 10, color: TEXT_MUTED, textAlign: "center", fontWeight: 600 }}>
                {d}
              </div>
            ))}
          </div>
          <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(7, 1fr)" }}>
            {(() => {
              const primeiroDiaSemana = new Date(anoCalendario, mesCalendario, 1).getDay();
              const diasNoMes = new Date(anoCalendario, mesCalendario + 1, 0).getDate();
              const celulas = [];
              for (let i = 0; i < primeiroDiaSemana; i++) celulas.push(null);
              for (let dia = 1; dia <= diasNoMes; dia++) celulas.push(dia);
              return celulas.map((dia, i) => {
                if (dia === null) return <div key={i} />;
                const iso = `${anoCalendario}-${String(mesCalendario + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
                const info = calendarioPorDia[iso];
                const ehHoje = iso === hoje;
                const atrasado = info && iso < hoje;
                return (
                  <div
                    key={i}
                    title={info ? info.itens.map((it) => it.cliente).join(", ") : undefined}
                    style={{
                      minHeight: 46,
                      border: ehHoje ? `2px solid ${BRASS}` : `1px solid ${LINE}`,
                      borderRadius: 6,
                      padding: 4,
                      background: atrasado ? "#F6E3D9" : info ? "#DCEBDD" : "transparent",
                    }}
                  >
                    <div style={{ fontSize: 10, fontWeight: ehHoje ? 700 : 500, color: ehHoje ? BRASS : INK }}>{dia}</div>
                    {info && (
                      <div className="fx-mono" style={{ fontSize: 9, color: atrasado ? VERMELHO : VERDE, fontWeight: 700, marginTop: 2 }}>
                        {brl(info.total)}
                      </div>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        </Card>
      </div>
    </div>
  );
}
