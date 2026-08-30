import React, { useMemo, useState } from "react";
import { Clock, PackageCheck, Timer, Zap } from "lucide-react";
import { Card, Empty, PageTitle, StatCard } from "../components/ui";
import { BRASS, INK, LINE, TEXT_MUTED } from "../lib/constants";
import { diasProducaoReal, fmtData } from "../lib/helpers";

// Barra simples, mesmo estilo do gráfico de tempo médio por mês já
// usado no painel — uma cor só (BRASS), rótulo direto acima da barra,
// tooltip no hover. Genérico o bastante pra servir tanto pra "por tipo"
// quanto "por responsável".
function BarraSimples({ dados, sufixoValor, formatarTooltip }) {
  const [hover, setHover] = useState(null);
  const maxValor = Math.max(1, ...dados.map((d) => d.valor));
  const ALTURA = 130;

  return (
    <div className="flex items-end gap-3" style={{ minHeight: ALTURA + 50, overflowX: "auto" }}>
      {dados.map((d) => {
        const altura = (d.valor / maxValor) * ALTURA;
        const emFoco = hover === d.chave;
        return (
          <div
            key={d.chave}
            className="flex flex-col items-center"
            style={{ flex: "1 0 60px", minWidth: 60, position: "relative" }}
            onMouseEnter={() => setHover(d.chave)}
            onMouseLeave={() => setHover(null)}
          >
            {emFoco && (
              <div
                style={{
                  position: "absolute",
                  bottom: altura + 34,
                  background: INK,
                  color: "#FFF",
                  padding: "7px 11px",
                  borderRadius: 6,
                  fontSize: 11,
                  whiteSpace: "nowrap",
                  zIndex: 10,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                }}
              >
                {formatarTooltip ? formatarTooltip(d) : `${d.chave}: ${d.valor}${sufixoValor || ""}`}
              </div>
            )}
            <div className="fx-mono" style={{ fontSize: 12, fontWeight: 700, color: emFoco ? BRASS : INK, marginBottom: 6 }}>
              {d.valor}
              {sufixoValor || ""}
            </div>
            <div
              style={{
                height: Math.max(altura, 3),
                width: "100%",
                maxWidth: 44,
                margin: "0 auto",
                background: BRASS,
                borderRadius: "4px 4px 0 0",
                opacity: emFoco ? 1 : 0.9,
              }}
            />
            <div className="fx-mono" style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 8, textAlign: "center" }}>
              {d.chave}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Histórico de produção da alfaiataria: médias reais (início -> entrega,
// já sem pausas) por tipo de peça e por responsável, com gráficos —
// pensado pra apresentação/reunião de equipe, não pra edição de nada.
export default function HistoricoProducao({ pecas }) {
  const entregues = useMemo(
    () => pecas.filter((p) => p.status === "Entregue" && p.dataInicioProducao && p.dataEntrega),
    [pecas]
  );

  const porTipo = useMemo(() => {
    const mapa = new Map();
    entregues.forEach((p) => {
      const dias = diasProducaoReal(p);
      if (dias === null) return;
      if (!mapa.has(p.tipoPeca)) mapa.set(p.tipoPeca, []);
      mapa.get(p.tipoPeca).push(dias);
    });
    return [...mapa.entries()]
      .map(([tipo, valores]) => ({
        chave: tipo,
        valor: Math.round(valores.reduce((s, v) => s + v, 0) / valores.length),
        qtd: valores.length,
      }))
      .sort((a, b) => b.valor - a.valor);
  }, [entregues]);

  const porResponsavel = useMemo(() => {
    const mapa = new Map();
    entregues.forEach((p) => {
      const nome = p.responsavel || "Sem responsável";
      const dias = diasProducaoReal(p);
      if (dias === null) return;
      if (!mapa.has(nome)) mapa.set(nome, []);
      mapa.get(nome).push(dias);
    });
    return [...mapa.entries()]
      .map(([nome, valores]) => ({
        chave: nome,
        valor: Math.round(valores.reduce((s, v) => s + v, 0) / valores.length),
        qtd: valores.length,
      }))
      .sort((a, b) => b.qtd - a.qtd);
  }, [entregues]);

  const mediaGeral = useMemo(() => {
    const validos = entregues.map((p) => diasProducaoReal(p)).filter((d) => d !== null);
    if (!validos.length) return null;
    return Math.round(validos.reduce((s, v) => s + v, 0) / validos.length);
  }, [entregues]);

  const maisRapido = porTipo[porTipo.length - 1];
  const maisLento = porTipo[0];

  const tabela = useMemo(
    () =>
      entregues
        .map((p) => ({ ...p, dias: diasProducaoReal(p) }))
        .sort((a, b) => (b.dataEntrega || "").localeCompare(a.dataEntrega || "")),
    [entregues]
  );

  if (entregues.length === 0) {
    return (
      <div>
        <PageTitle eyebrow="Alfaiataria — histórico" title="Histórico de Produção" />
        <Card style={{ padding: 20 }}>
          <Empty texto="Nenhuma peça com início e entrega registrados ainda." />
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageTitle eyebrow="Alfaiataria — histórico" title="Histórico de Produção" />

      <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <StatCard label="Peças entregues" value={entregues.length} icon={PackageCheck} />
        <StatCard label="Média geral de produção" value={mediaGeral !== null ? `${mediaGeral}d` : "—"} icon={Timer} />
        {maisRapido && <StatCard label="Mais rápida em média" value={`${maisRapido.chave} · ${maisRapido.valor}d`} icon={Zap} />}
        {maisLento && <StatCard label="Mais demorada em média" value={`${maisLento.chave} · ${maisLento.valor}d`} icon={Clock} />}
      </div>

      <Card style={{ padding: 20 }} className="mb-6">
        <div className="fx-serif mb-1" style={{ fontSize: 15, fontWeight: 600 }}>
          Média de dias de produção por tipo de peça
        </div>
        <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 20 }}>
          Do início real da produção até a entrega, já descontando pausas — só peças já entregues.
        </div>
        <BarraSimples dados={porTipo} sufixoValor="d" formatarTooltip={(d) => `${d.chave}: ${d.valor} dias em média (${d.qtd} peça(s))`} />
      </Card>

      <Card style={{ padding: 20 }} className="mb-6">
        <div className="fx-serif mb-1" style={{ fontSize: 15, fontWeight: 600 }}>
          Média de dias de produção por responsável
        </div>
        <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 20 }}>
          Mesma métrica, agrupada por quem produziu.
        </div>
        <BarraSimples dados={porResponsavel} sufixoValor="d" formatarTooltip={(d) => `${d.chave}: ${d.valor} dias em média (${d.qtd} peça(s))`} />
      </Card>

      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div className="px-5 pt-4 pb-2 fx-serif" style={{ fontSize: 15, fontWeight: 600 }}>
          Peças entregues (detalhado)
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${LINE}`, background: "#F7F4EC" }}>
                {["Cliente", "Tipo", "Responsável", "Início", "Entrega", "Dias de produção"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "8px 12px", fontWeight: 600, fontSize: 11, color: TEXT_MUTED, textTransform: "uppercase" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tabela.map((p) => (
                <tr key={p.id} style={{ borderBottom: `1px solid ${LINE}` }}>
                  <td style={{ padding: "8px 12px", fontWeight: 600 }}>{p.cliente || "Sem nome"}</td>
                  <td style={{ padding: "8px 12px" }}>{p.tipoPeca}</td>
                  <td style={{ padding: "8px 12px", color: TEXT_MUTED }}>{p.responsavel || "—"}</td>
                  <td style={{ padding: "8px 12px", color: TEXT_MUTED }}>{fmtData(p.dataInicioProducao)}</td>
                  <td style={{ padding: "8px 12px", color: TEXT_MUTED }}>{fmtData(p.dataEntrega)}</td>
                  <td className="fx-mono" style={{ padding: "8px 12px", color: BRASS, fontWeight: 700 }}>
                    {p.dias !== null ? `${p.dias}d` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
