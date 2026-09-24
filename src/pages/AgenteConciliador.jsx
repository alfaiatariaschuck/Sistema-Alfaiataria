import React, { useMemo, useState } from "react";
import { CheckCircle2, GitCompare, HelpCircle, XCircle } from "lucide-react";
import { Card, Empty, PageTitle } from "../components/ui";
import { LINE, TEXT_MUTED, inputStyle } from "../lib/constants";
import { brl, fmtData } from "../lib/helpers";

const VERDE = "#2C6E31";
const VERMELHO = "#9C4A1E";
const TOLERANCIA_VALOR = 0.05;
const JANELA_DIAS = 10;

function totalDespesa(d) {
  return (parseFloat(d.valor) || 0) + (parseFloat(d.frete) || 0);
}

// Aceita "R$ 1.234,56", "1234.56", "-45,00", "(45,00)" — formato
// brasileiro é o caso comum (ponto = milhar, vírgula = decimal).
function parseValorBR(str) {
  let s = (str || "").trim().replace(/^R\$\s*/i, "");
  const negativo = s.startsWith("-") || s.endsWith("-") || (s.startsWith("(") && s.endsWith(")"));
  s = s.replace(/[()]/g, "").replace(/-/g, "");
  if (s.includes(",") && s.includes(".")) s = s.replace(/\./g, "").replace(",", ".");
  else if (s.includes(",")) s = s.replace(",", ".");
  const n = parseFloat(s);
  if (isNaN(n)) return null;
  return negativo ? -Math.abs(n) : Math.abs(n);
}

function parseDataBR(str) {
  const s = (str || "").trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) {
    let [, d, mo, y] = m;
    if (y.length === 2) y = "20" + y;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return null;
}

// Cada linha colada: data, descrição, valor — separados por TAB (colando
// direto do Excel) ou por 2+ espaços (colando texto corrido do extrato).
function parseLinhas(texto) {
  return (texto || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((linha) => {
      const partes = linha.includes("\t") ? linha.split("\t").map((p) => p.trim()) : linha.split(/\s{2,}/).map((p) => p.trim());
      if (partes.length < 2) return null;
      const data = parseDataBR(partes[0]);
      const valor = parseValorBR(partes[partes.length - 1]);
      const descricao = partes.slice(1, partes.length - 1).join(" ").trim() || "—";
      if (!data || valor === null) return null;
      return { data, descricao, valor: Math.abs(valor) };
    })
    .filter(Boolean);
}

function diffDias(a, b) {
  return Math.abs((new Date(a + "T00:00:00") - new Date(b + "T00:00:00")) / 86400000);
}

// Entre os candidatos dentro da tolerância de valor e da janela de dias,
// fica com o de data mais próxima — critério simples e previsível (sem
// IA), fácil de auditar se um dia o match parecer estranho.
function acharMelhorMatch(linha, candidatos) {
  let melhor = null;
  for (const c of candidatos) {
    if (!c.dataRef) continue;
    if (Math.abs(c.valor - linha.valor) > TOLERANCIA_VALOR) continue;
    const dias = diffDias(linha.data, c.dataRef);
    if (dias > JANELA_DIAS) continue;
    if (!melhor || dias < melhor.dias) melhor = { ...c, dias };
  }
  return melhor;
}

function LinhaResultado({ linha, match, cor }) {
  return (
    <div className="flex items-center justify-between gap-3 p-2" style={{ borderBottom: `1px solid ${LINE}` }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>
          {fmtData(linha.data)} · {linha.descricao}
        </div>
        {match && (
          <div style={{ fontSize: 11, color: TEXT_MUTED }}>
            {match.tipo ? `${match.tipo} · ` : ""}
            {match.nome} — no sistema consta como <strong>{match.status}</strong>
            {match.dias > 0 ? ` · ${Math.round(match.dias)}d de diferença na data` : ""}
          </div>
        )}
        {!match && <div style={{ fontSize: 11, color: TEXT_MUTED }}>Não achei nada parecido no sistema — pode ser um lançamento faltando, ou algo pessoal (PF).</div>}
      </div>
      <div className="fx-mono" style={{ fontSize: 13, fontWeight: 700, color: cor, whiteSpace: "nowrap" }}>
        {brl(linha.valor)}
      </div>
    </div>
  );
}

export default function AgenteConciliador({ despesas, pedidos, pecas, pedidosSapatos }) {
  const [textoSaidas, setTextoSaidas] = useState("");
  const [textoEntradas, setTextoEntradas] = useState("");
  const [resultado, setResultado] = useState(null);

  const candidatosSaida = useMemo(
    () =>
      (despesas || [])
        .filter((d) => totalDespesa(d) > 0)
        .map((d) => ({
          nome: d.fornecedor || d.descricao,
          valor: d.status === "Pago" && parseFloat(d.valorPago) > 0 ? parseFloat(d.valorPago) : totalDespesa(d),
          dataRef: d.dataPagamento || d.vencimento,
          status: d.status,
        })),
    [despesas]
  );

  const candidatosEntrada = useMemo(() => {
    const doCamisa = (pedidos || [])
      .filter((p) => parseFloat(p.aReceber?.valor) > 0)
      .map((p) => ({
        tipo: "Camisaria",
        nome: p.cliente,
        valor: parseFloat(p.aReceber.valor) || 0,
        dataRef: p.dataCobranca || p.previsaoEntrega || p.dataPedido,
        status: p.aReceber.statusPagamento,
      }));
    const daPeca = (pecas || [])
      .filter((p) => parseFloat(p.valorVenda) > 0)
      .map((p) => ({
        tipo: "Alfaiataria",
        nome: p.cliente,
        valor: parseFloat(p.valorVenda) || 0,
        dataRef: p.dataCobranca || p.previsaoEntrega || p.dataPedido,
        status: p.statusPagamentoVenda,
      }));
    const doSapato = (pedidosSapatos || [])
      .filter((p) => parseFloat(p.valorVenda) > 0)
      .map((p) => ({
        tipo: "Sapatos",
        nome: p.cliente,
        valor: parseFloat(p.valorVenda) || 0,
        dataRef: p.previsaoEntrega || p.dataPedido,
        status: p.status,
      }));
    return [...doCamisa, ...daPeca, ...doSapato];
  }, [pedidos, pecas, pedidosSapatos]);

  function conciliar() {
    const saidas = parseLinhas(textoSaidas);
    const entradas = parseLinhas(textoEntradas);
    const saidasBatendo = [];
    const saidasSemMatch = [];
    saidas.forEach((linha) => {
      const match = acharMelhorMatch(linha, candidatosSaida);
      (match ? saidasBatendo : saidasSemMatch).push({ linha, match });
    });
    const entradasBatendo = [];
    const entradasSemMatch = [];
    entradas.forEach((linha) => {
      const match = acharMelhorMatch(linha, candidatosEntrada);
      (match ? entradasBatendo : entradasSemMatch).push({ linha, match });
    });
    setResultado({ saidasBatendo, saidasSemMatch, entradasBatendo, entradasSemMatch });
  }

  return (
    <div>
      <PageTitle eyebrow="Agente" title="Agente Conciliador" />

      <Card style={{ padding: 16 }} className="mb-6">
        <p style={{ fontSize: 13, color: "#2A3B4D", lineHeight: 1.6 }}>
          Cole abaixo as linhas do seu extrato (uma por linha: <strong>data, descrição e valor</strong> — separados por
          tab, se colar direto do Excel, ou por dois espaços). Não precisa de IA nem de chave de API pra isso — é
          comparação direta com o que já está no sistema, tudo roda aqui no navegador, nada sai daqui.
        </p>
      </Card>

      <Card style={{ padding: 20 }} className="mb-6">
        <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Saídas do extrato (pagamentos)</div>
            <textarea
              style={{ ...inputStyle, minHeight: 160, fontSize: 12 }}
              className="fx-mono"
              placeholder={"24/09/2026\tTED Fornecedor Tecido XYZ\t1200,00\n20/09/2026\tBoleto aluguel\t2500,00"}
              value={textoSaidas}
              onChange={(e) => setTextoSaidas(e.target.value)}
            />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Entradas do extrato (recebimentos)</div>
            <textarea
              style={{ ...inputStyle, minHeight: 160, fontSize: 12 }}
              className="fx-mono"
              placeholder={"24/09/2026\tPix recebido - Marcelo\t350,00\n22/09/2026\tPix recebido - Juliana\t980,00"}
              value={textoEntradas}
              onChange={(e) => setTextoEntradas(e.target.value)}
            />
          </div>
        </div>
        <button
          onClick={conciliar}
          disabled={!textoSaidas.trim() && !textoEntradas.trim()}
          className="flex items-center gap-2 mt-4"
          style={{ background: "#16212E", color: "#FFF", padding: "9px 18px", borderRadius: 8, fontWeight: 600, fontSize: 13 }}
        >
          <GitCompare size={15} /> Conciliar
        </button>
      </Card>

      {resultado && (
        <div className="grid gap-6" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <Card style={{ padding: 20 }}>
            <div className="fx-serif mb-3 flex items-center gap-2" style={{ fontSize: 15, fontWeight: 600 }}>
              <CheckCircle2 size={16} color={VERDE} /> Saídas batendo ({resultado.saidasBatendo.length})
            </div>
            {resultado.saidasBatendo.length === 0 ? (
              <Empty texto="Nenhuma." />
            ) : (
              resultado.saidasBatendo.map((r, i) => <LinhaResultado key={i} linha={r.linha} match={r.match} cor={VERMELHO} />)
            )}
          </Card>

          <Card style={{ padding: 20 }}>
            <div className="fx-serif mb-3 flex items-center gap-2" style={{ fontSize: 15, fontWeight: 600 }}>
              <XCircle size={16} color={VERMELHO} /> Saídas sem correspondência ({resultado.saidasSemMatch.length})
            </div>
            {resultado.saidasSemMatch.length === 0 ? (
              <Empty texto="Nenhuma — tudo que saiu bate com o sistema." />
            ) : (
              resultado.saidasSemMatch.map((linha, i) => <LinhaResultado key={i} linha={linha} match={null} cor={VERMELHO} />)
            )}
          </Card>

          <Card style={{ padding: 20 }}>
            <div className="fx-serif mb-3 flex items-center gap-2" style={{ fontSize: 15, fontWeight: 600 }}>
              <CheckCircle2 size={16} color={VERDE} /> Entradas batendo ({resultado.entradasBatendo.length})
            </div>
            {resultado.entradasBatendo.length === 0 ? (
              <Empty texto="Nenhuma." />
            ) : (
              resultado.entradasBatendo.map((r, i) => <LinhaResultado key={i} linha={r.linha} match={r.match} cor={VERDE} />)
            )}
          </Card>

          <Card style={{ padding: 20 }}>
            <div className="fx-serif mb-3 flex items-center gap-2" style={{ fontSize: 15, fontWeight: 600 }}>
              <HelpCircle size={16} color={VERMELHO} /> Entradas sem correspondência ({resultado.entradasSemMatch.length})
            </div>
            {resultado.entradasSemMatch.length === 0 ? (
              <Empty texto="Nenhuma — tudo que entrou bate com o sistema." />
            ) : (
              resultado.entradasSemMatch.map((linha, i) => <LinhaResultado key={i} linha={linha} match={null} cor={VERDE} />)
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
