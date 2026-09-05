import React, { useMemo, useState } from "react";
import { Calculator } from "lucide-react";
import { Card } from "./ui";
import { BRASS, INK, LINE, TEXT_MUTED, inputStyle } from "../lib/constants";
import { brl } from "../lib/helpers";
import { custoCamisa } from "../lib/vendasMensais";

const VERMELHO = "#9C4A1E";
const VERDE = "#2C6E31";
const MESES_MEDIA = 3;
const PERCENTUAIS_TESTE = [5, 8, 10, 12, 15];

// Médias reais da camisaria nos últimos MESES_MEDIA meses JÁ FECHADOS
// (pula o mês corrente, que está sempre incompleto) — mesma conta de
// custo/margem usada em Vendedor/Pedidos Vendidos (custoCamisa), só que
// virando uma média ponderada por camisa (soma tudo, divide pela
// quantidade total, em vez de tirar média das médias mensais).
function mediasCamisariaUltimosMeses(pedidos, custoAviamentosPorPecaBase, maoDeObraPadrao, nMeses) {
  const hoje = new Date();
  let somaValor = 0;
  let somaCusto = 0;
  let somaQtd = 0;
  let somaPagoFabi = 0;
  for (let i = 1; i <= nMeses; i++) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    const chaveMes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    (pedidos || [])
      .filter((p) => p.status !== "Doação" && (p.dataPedido || "").slice(0, 7) === chaveMes)
      .forEach((p) => {
        const valor = parseFloat(p.aReceber?.valor) || 0;
        const qtd = parseFloat(p.quantidade) || 0;
        const { custo } = custoCamisa(p, custoAviamentosPorPecaBase, maoDeObraPadrao);
        somaValor += valor;
        somaCusto += custo;
        somaQtd += qtd;
        somaPagoFabi += parseFloat(p.pagoFabiana?.valor) || 0;
      });
  }
  return {
    qtdCamisasMediaMes: somaQtd / nMeses,
    ticketMedio: somaQtd > 0 ? somaValor / somaQtd : 0,
    custoMedioPorCamisa: somaQtd > 0 ? somaCusto / somaQtd : 0,
    margemMediaPorCamisa: somaQtd > 0 ? (somaValor - somaCusto) / somaQtd : 0,
    margemPercentual: somaValor > 0 ? ((somaValor - somaCusto) / somaValor) * 100 : 0,
    custoMedioFabiPorCamisa: somaQtd > 0 ? somaPagoFabi / somaQtd : 0,
  };
}

// Esboço de simulador pro combinado com o Deivid — ele ainda não tem
// histórico próprio, então a base é a MÉDIA REAL da loja (últimos meses
// fechados), não um número inventado. Três blocos: (1) o combinado atual
// (adiantamento fixo de R$1.500 quando bate a meta) — com quantas
// camisas isso se paga sozinho; (2) uma exploração de comissão em % pra
// decidir com calma o modelo definitivo; (3) se esse volume a mais vai
// exigir reforço de costureira, baseado no que já se paga à Fabi por
// camisa.
export default function SimuladorDeivid({ pedidos, custoAviamentosPorPecaBase = {}, maoDeObraPadrao = 0 }) {
  const [metaMensal, setMetaMensal] = useState("6");
  const [gatilho, setGatilho] = useState("3");
  const [adiantamento, setAdiantamento] = useState("1500");
  const [capacidadeFabi, setCapacidadeFabi] = useState("");

  const medias = useMemo(
    () => mediasCamisariaUltimosMeses(pedidos, custoAviamentosPorPecaBase, maoDeObraPadrao, MESES_MEDIA),
    [pedidos, custoAviamentosPorPecaBase, maoDeObraPadrao]
  );

  const metaNum = parseInt(metaMensal, 10) || 0;
  const gatilhoNum = parseInt(gatilho, 10) || 0;
  const adiantamentoNum = parseFloat(adiantamento) || 0;
  const margemPorCamisa = medias.margemMediaPorCamisa;

  const pontoEquilibrioCamisas = margemPorCamisa > 0 ? Math.ceil(adiantamentoNum / margemPorCamisa) : null;
  const cenarios = [gatilhoNum, metaNum, metaNum + 3, metaNum + 6].filter((v, i, arr) => v > 0 && arr.indexOf(v) === i);

  const capacidadeNum = parseFloat(capacidadeFabi) || 0;
  const demandaAtualMedia = medias.qtdCamisasMediaMes;
  const novaDemandaMedia = demandaAtualMedia + metaNum;
  const excedente = capacidadeNum > 0 ? novaDemandaMedia - capacidadeNum : null;
  const custoAdicionalMensal = excedente && excedente > 0 ? excedente * medias.custoMedioFabiPorCamisa : 0;

  return (
    <Card style={{ padding: 20 }} className="mt-6">
      <div className="flex items-center gap-1.5 mb-1">
        <Calculator size={16} color={BRASS} />
        <div className="fx-serif" style={{ fontSize: 16, fontWeight: 600 }}>
          Simulador de Vendas — Deivid (esboço)
        </div>
      </div>
      <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 16 }}>
        O Deivid ainda não tem histórico próprio, então a base aqui é a <strong>média real da camisaria</strong> nos
        últimos {MESES_MEDIA} meses fechados — {medias.qtdCamisasMediaMes.toFixed(1)} camisas/mês, ticket médio{" "}
        {brl(medias.ticketMedio)}, custo médio {brl(medias.custoMedioPorCamisa)} (tecido + aviamento + mão de obra da
        Fabi). Ajuste os campos abaixo pra testar cenários.
      </div>

      <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <div>
          <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 4 }}>Meta mensal (camisas)</div>
          <input type="number" step="1" style={inputStyle} value={metaMensal} onChange={(e) => setMetaMensal(e.target.value)} />
        </div>
        <div>
          <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 4 }}>Gatilho do adiantamento (camisas)</div>
          <input type="number" step="1" style={inputStyle} value={gatilho} onChange={(e) => setGatilho(e.target.value)} />
        </div>
        <div>
          <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 4 }}>Adiantamento fixo (R$)</div>
          <input type="number" step="0.01" style={inputStyle} value={adiantamento} onChange={(e) => setAdiantamento(e.target.value)} />
        </div>
      </div>

      <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <div>
          <div style={{ fontSize: 11, color: TEXT_MUTED }}>Margem média/camisa</div>
          <div className="fx-mono" style={{ fontSize: 18, fontWeight: 700 }}>
            {brl(margemPorCamisa)} <span style={{ fontSize: 12, color: TEXT_MUTED }}>({medias.margemPercentual.toFixed(0)}%)</span>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: TEXT_MUTED }}>Adiantamento se paga com</div>
          <div className="fx-mono" style={{ fontSize: 18, fontWeight: 700, color: BRASS }}>
            {pontoEquilibrioCamisas != null ? `${pontoEquilibrioCamisas} camisas` : "—"}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: TEXT_MUTED }}>Na meta de {metaNum || "—"} camisas</div>
          {pontoEquilibrioCamisas != null && metaNum > 0 ? (
            <div className="fx-mono" style={{ fontSize: 14, fontWeight: 700, color: metaNum >= pontoEquilibrioCamisas ? VERDE : VERMELHO }}>
              {metaNum >= pontoEquilibrioCamisas
                ? `cobre com folga de ${metaNum - pontoEquilibrioCamisas} camisa(s)`
                : `faltam ${pontoEquilibrioCamisas - metaNum} camisa(s) pra cobrir`}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: TEXT_MUTED }}>—</div>
          )}
        </div>
      </div>

      <div className="mb-6" style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 420 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${LINE}` }}>
              {["Camisas", "Margem gerada", "Adiantamento", "Sobra/falta"].map((h) => (
                <th key={h} style={{ textAlign: h === "Camisas" ? "left" : "right", padding: "6px 10px", fontWeight: 600, fontSize: 10, color: TEXT_MUTED, textTransform: "uppercase" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cenarios.map((qtd) => {
              const margemGerada = qtd * margemPorCamisa;
              const sobra = margemGerada - adiantamentoNum;
              return (
                <tr key={qtd} style={{ borderBottom: `1px solid ${LINE}` }}>
                  <td style={{ padding: "6px 10px", fontWeight: 600 }}>
                    {qtd}
                    {qtd === gatilhoNum && " (gatilho)"}
                    {qtd === metaNum && " (meta)"}
                  </td>
                  <td className="fx-mono" style={{ padding: "6px 10px", textAlign: "right" }}>{brl(margemGerada)}</td>
                  <td className="fx-mono" style={{ padding: "6px 10px", textAlign: "right" }}>{brl(adiantamentoNum)}</td>
                  <td className="fx-mono" style={{ padding: "6px 10px", textAlign: "right", fontWeight: 700, color: sobra >= 0 ? VERDE : VERMELHO }}>
                    {sobra >= 0 ? "+" : ""}
                    {brl(sobra)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="pt-4 mb-6" style={{ borderTop: `1px solid ${LINE}` }}>
        <div className="fx-serif mb-1" style={{ fontSize: 14, fontWeight: 600 }}>
          Se um dia migrar pra comissão por percentual
        </div>
        <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 12 }}>
          Só pra ir vendo — comissão calculada em cima do preço de venda (não da margem), usando o ticket médio real
          de {brl(medias.ticketMedio)}.
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 420 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${LINE}` }}>
                {["Comissão", "R$/camisa", `Total em ${metaNum || 0} camisas`, "Margem líquida da loja"].map((h) => (
                  <th key={h} style={{ textAlign: h === "Comissão" ? "left" : "right", padding: "6px 10px", fontWeight: 600, fontSize: 10, color: TEXT_MUTED, textTransform: "uppercase" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERCENTUAIS_TESTE.map((pct) => {
                const comissaoPorCamisa = medias.ticketMedio * (pct / 100);
                const margemLiquidaPorCamisa = margemPorCamisa - comissaoPorCamisa;
                const margemLiquidaPercentual = medias.ticketMedio > 0 ? (margemLiquidaPorCamisa / medias.ticketMedio) * 100 : 0;
                return (
                  <tr key={pct} style={{ borderBottom: `1px solid ${LINE}` }}>
                    <td style={{ padding: "6px 10px", fontWeight: 600 }}>{pct}%</td>
                    <td className="fx-mono" style={{ padding: "6px 10px", textAlign: "right" }}>{brl(comissaoPorCamisa)}</td>
                    <td className="fx-mono" style={{ padding: "6px 10px", textAlign: "right" }}>{brl(comissaoPorCamisa * (metaNum || 0))}</td>
                    <td className="fx-mono" style={{ padding: "6px 10px", textAlign: "right", fontWeight: 700, color: margemLiquidaPorCamisa >= 0 ? VERDE : VERMELHO }}>
                      {brl(margemLiquidaPorCamisa)} ({margemLiquidaPercentual.toFixed(0)}%)
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="pt-4" style={{ borderTop: `1px solid ${LINE}` }}>
        <div className="fx-serif mb-1" style={{ fontSize: 14, fontWeight: 600 }}>
          Vai precisar de outra costureira?
        </div>
        <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 12 }}>
          Hoje a loja vende em média {demandaAtualMedia.toFixed(1)} camisas/mês (todo mundo junto), pagando em média{" "}
          {brl(medias.custoMedioFabiPorCamisa)}/camisa à Fabi. Com a meta do Deivid ({metaNum || 0} camisas) somada,
          a demanda projetada sobe pra <strong>{novaDemandaMedia.toFixed(1)} camisas/mês</strong>. Preenche a
          capacidade mensal da Fabi abaixo pra ver se passa do limite dela.
        </div>
        <div className="flex items-center gap-3 flex-wrap mb-3">
          <div style={{ fontSize: 11, color: TEXT_MUTED }}>Capacidade mensal da Fabi (camisas)</div>
          <input type="number" step="1" style={{ ...inputStyle, width: 100 }} value={capacidadeFabi} onChange={(e) => setCapacidadeFabi(e.target.value)} />
        </div>
        {capacidadeNum > 0 && (
          <div
            className="flex items-center justify-between py-2 px-3"
            style={{ background: excedente > 0 ? "#F7EAE3" : "#EAF3EA", borderRadius: 6, fontSize: 13, fontWeight: 700 }}
          >
            {excedente > 0 ? (
              <>
                <span>Passa da capacidade em {excedente.toFixed(1)} camisa(s)/mês</span>
                <span className="fx-mono" style={{ color: VERMELHO }}>+{brl(custoAdicionalMensal)}/mês (reforço no mesmo padrão da Fabi)</span>
              </>
            ) : (
              <span style={{ color: VERDE }}>Cabe na capacidade atual da Fabi, sem reforço.</span>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
