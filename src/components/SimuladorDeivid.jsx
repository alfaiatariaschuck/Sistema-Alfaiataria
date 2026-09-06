import React, { useMemo, useState } from "react";
import { Calculator } from "lucide-react";
import { Card } from "./ui";
import { BRASS, INK, LINE, TEXT_MUTED, inputStyle } from "../lib/constants";
import { brl, custoTecidoDe } from "../lib/helpers";
import { custoCamisa } from "../lib/vendasMensais";

const VERMELHO = "#9C4A1E";
const VERDE = "#2C6E31";
const MESES_MEDIA = 2;
const PERCENTUAIS_RAPIDOS = [5, 8, 10, 12, 15];

// Médias reais da camisaria nos últimos MESES_MEDIA meses JÁ FECHADOS
// (pula o mês corrente, que está sempre incompleto) — mesma conta de
// custo/margem usada em Vendedor/Pedidos Vendidos (custoCamisa), só que
// virando uma média ponderada por camisa (soma tudo, divide pela
// quantidade total, em vez de tirar média das médias mensais). Separa
// também o custo de MATERIAL (tecido+aviamento) da mão de obra, porque o
// bloco de baixo trata mão de obra à parte (capacidade da Fabi x reforço).
function mediasCamisariaUltimosMeses(pedidos, custoAviamentosPorPecaBase, maoDeObraPadrao, nMeses) {
  const hoje = new Date();
  let somaValor = 0;
  let somaCusto = 0;
  let somaMaterial = 0;
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
        const material = custoTecidoDe(p.tecidos) + (custoAviamentosPorPecaBase["Camisa"] || 0) * qtd;
        somaValor += valor;
        somaCusto += custo;
        somaMaterial += material;
        somaQtd += qtd;
        somaPagoFabi += parseFloat(p.pagoFabiana?.valor) || 0;
      });
  }
  return {
    qtdCamisasMediaMes: somaQtd / nMeses,
    ticketMedio: somaQtd > 0 ? somaValor / somaQtd : 0,
    custoMedioPorCamisa: somaQtd > 0 ? somaCusto / somaQtd : 0,
    custoMaterialMedioPorCamisa: somaQtd > 0 ? somaMaterial / somaQtd : 0,
    margemMediaPorCamisa: somaQtd > 0 ? (somaValor - somaCusto) / somaQtd : 0,
    margemPercentual: somaValor > 0 ? ((somaValor - somaCusto) / somaValor) * 100 : 0,
    custoMedioFabiPorCamisa: somaQtd > 0 ? somaPagoFabi / somaQtd : 0,
  };
}

// Custo de mão de obra pra produzir "vol" camisas/mês, dado que até
// "capacidade" a Fabi cobre no padrão dela, e o que passar disso precisa
// de reforço (possivelmente a outro custo/camisa). Sem capacidade
// definida (0), assume tudo no padrão da Fabi.
function custoMaoDeObraPara(vol, capacidade, custoFabi, custoReforco) {
  if (capacidade <= 0) return vol * custoFabi;
  if (vol <= capacidade) return vol * custoFabi;
  return capacidade * custoFabi + (vol - capacidade) * custoReforco;
}

// Esboço de simulador pro combinado com o Deivid — ele ainda não tem
// histórico próprio, então a base é a MÉDIA REAL da loja (últimos meses
// fechados), não um número inventado. Dois blocos: (1) o combinado atual
// (adiantamento fixo de R$1.500) — com quantas camisas isso se paga
// sozinho; (2) um simulador completo e integrado — receita → margem de
// produto → mão de obra (Fabi + reforço, se a meta passar da capacidade
// dela) → comissão do Deivid (% escolhido) + o fixo → o que sobra líquido
// pra empresa no final, tudo na mesma cascata, sem contar nada em dobro.
export default function SimuladorDeivid({ pedidos, custoAviamentosPorPecaBase = {}, maoDeObraPadrao = 0 }) {
  const [metaMensal, setMetaMensal] = useState("6");
  const [gatilho, setGatilho] = useState("3");
  const [adiantamento, setAdiantamento] = useState("1500");
  const [percentualComissao, setPercentualComissao] = useState("10");
  const [capacidadeFabi, setCapacidadeFabi] = useState("60");
  const [custoFabiPorCamisa, setCustoFabiPorCamisa] = useState("120");
  const [custoReforcoPorCamisa, setCustoReforcoPorCamisa] = useState("120");

  const medias = useMemo(
    () => mediasCamisariaUltimosMeses(pedidos, custoAviamentosPorPecaBase, maoDeObraPadrao, MESES_MEDIA),
    [pedidos, custoAviamentosPorPecaBase, maoDeObraPadrao]
  );

  const metaNum = parseInt(metaMensal, 10) || 0;
  const gatilhoNum = parseInt(gatilho, 10) || 0;
  const adiantamentoNum = parseFloat(adiantamento) || 0;
  const percentualNum = parseFloat(percentualComissao) || 0;
  const margemPorCamisa = medias.margemMediaPorCamisa;

  // Bloco 1 — o combinado atual (adiantamento fixo).
  const pontoEquilibrioCamisas = margemPorCamisa > 0 ? Math.ceil(adiantamentoNum / margemPorCamisa) : null;
  const cenarios = [gatilhoNum, metaNum, metaNum + 3, metaNum + 6].filter((v, i, arr) => v > 0 && arr.indexOf(v) === i);

  // Bloco 2 — cascata completa (receita → material → mão de obra
  // incremental → comissão + fixo do Deivid → sobra líquida da empresa).
  const capacidadeNum = parseFloat(capacidadeFabi) || 0;
  const custoFabiPorCamisaNum = parseFloat(custoFabiPorCamisa) || 0;
  const custoReforcoPorCamisaNum = parseFloat(custoReforcoPorCamisa) || 0;
  const demandaAtualMedia = medias.qtdCamisasMediaMes;
  const novaDemandaMedia = demandaAtualMedia + metaNum;

  // Mão de obra INCREMENTAL causada só pela meta do Deivid — a diferença
  // entre "produzir tudo (existente + meta)" e "produzir só o existente".
  // Assim, se o reforço custar o mesmo que a Fabi, a conta dá zero (nada
  // extra), e só pesa de verdade quando o novo custo/camisa for maior.
  const maoDeObraSemDeivid = custoMaoDeObraPara(demandaAtualMedia, capacidadeNum, custoFabiPorCamisaNum, custoReforcoPorCamisaNum);
  const maoDeObraComDeivid = custoMaoDeObraPara(novaDemandaMedia, capacidadeNum, custoFabiPorCamisaNum, custoReforcoPorCamisaNum);
  const maoDeObraIncremental = maoDeObraComDeivid - maoDeObraSemDeivid;
  const passaCapacidade = capacidadeNum > 0 && novaDemandaMedia > capacidadeNum;

  const receita = metaNum * medias.ticketMedio;
  const custoMaterial = metaNum * medias.custoMaterialMedioPorCamisa;
  const margemProduto = receita - custoMaterial;
  const margemAposMaoDeObra = margemProduto - maoDeObraIncremental;
  const comissaoDeivid = receita * (percentualNum / 100);
  const ganhoDeivid = comissaoDeivid + adiantamentoNum;
  const resultadoLiquidoEmpresa = margemAposMaoDeObra - ganhoDeivid;

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

      <div className="pt-4" style={{ borderTop: `1px solid ${LINE}` }}>
        <div className="fx-serif mb-1" style={{ fontSize: 15, fontWeight: 600 }}>
          Simulador completo — comissão + reforço de costureira, tudo junto
        </div>
        <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 16 }}>
          Pega a meta de {metaNum || 0} camisas de cima e desce em cascata: receita → custo de material → mão de
          obra (só o que essa meta acrescenta, considerando a capacidade da Fabi) → comissão do Deivid + o fixo dele →
          o que sobra líquido pra empresa no final. Nada aqui conta em dobro com o bloco de cima.
        </div>

        <div className="flex items-center gap-4 flex-wrap mb-4">
          <div>
            <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 4 }}>% de comissão</div>
            <input type="number" step="0.5" style={{ ...inputStyle, width: 90 }} value={percentualComissao} onChange={(e) => setPercentualComissao(e.target.value)} />
          </div>
          <div className="flex items-end gap-1.5">
            {PERCENTUAIS_RAPIDOS.map((pct) => (
              <button
                key={pct}
                onClick={() => setPercentualComissao(String(pct))}
                style={{
                  background: percentualNum === pct ? BRASS : "#EDEAE0",
                  color: percentualNum === pct ? "#FFF" : INK,
                  padding: "6px 10px",
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                {pct}%
              </button>
            ))}
          </div>
          <div>
            <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 4 }}>Capacidade mensal da Fabi (camisas)</div>
            <input type="number" step="1" style={{ ...inputStyle, width: 100 }} value={capacidadeFabi} onChange={(e) => setCapacidadeFabi(e.target.value)} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 4 }}>R$/camisa Fabi</div>
            <input type="number" step="0.01" style={{ ...inputStyle, width: 90 }} value={custoFabiPorCamisa} onChange={(e) => setCustoFabiPorCamisa(e.target.value)} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 4 }}>R$/camisa reforço</div>
            <input type="number" step="0.01" style={{ ...inputStyle, width: 90 }} value={custoReforcoPorCamisa} onChange={(e) => setCustoReforcoPorCamisa(e.target.value)} />
          </div>
        </div>

        <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 12 }}>
          Demanda hoje (todo mundo, real dos últimos {MESES_MEDIA} meses): {demandaAtualMedia.toFixed(1)} camisas/mês.
          Com a meta do Deivid somada: <strong>{novaDemandaMedia.toFixed(1)} camisas/mês</strong>
          {passaCapacidade ? " — passa da capacidade da Fabi, por isso a mão de obra abaixo inclui reforço." : " — cabe na capacidade da Fabi, sem reforço."}
        </div>

        <div style={{ fontSize: 13 }}>
          {[
            { label: "Receita (meta × ticket médio)", valor: receita },
            { label: "(–) Custo de material (tecido + aviamento)", valor: -custoMaterial },
            { label: "= Margem de produto", valor: margemProduto, destaque: true },
            { label: "(–) Mão de obra incremental (Fabi + reforço, se passar da capacidade)", valor: -maoDeObraIncremental },
            { label: "= Margem após mão de obra", valor: margemAposMaoDeObra, destaque: true },
            { label: `(–) Comissão do Deivid (${percentualNum}% da receita)`, valor: -comissaoDeivid },
            { label: "(–) Adiantamento fixo do Deivid", valor: -adiantamentoNum },
          ].map(({ label, valor, destaque }) => (
            <div key={label} className="flex items-center justify-between py-1.5" style={{ borderBottom: `1px solid ${LINE}` }}>
              <span style={{ color: destaque ? INK : TEXT_MUTED, fontWeight: destaque ? 600 : 400 }}>{label}</span>
              <span className="fx-mono" style={{ fontWeight: destaque ? 700 : 500 }}>{brl(valor)}</span>
            </div>
          ))}
        </div>

        <div className="grid gap-4 mt-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <div className="py-3 px-3" style={{ background: "#F3EEDF", borderRadius: 8 }}>
            <div style={{ fontSize: 11, color: TEXT_MUTED }}>Ganho total do Deivid (comissão + fixo)</div>
            <div className="fx-mono" style={{ fontSize: 18, fontWeight: 700, color: BRASS }}>{brl(ganhoDeivid)}</div>
          </div>
          <div className="py-3 px-3" style={{ background: resultadoLiquidoEmpresa >= 0 ? "#EAF3EA" : "#F7EAE3", borderRadius: 8 }}>
            <div style={{ fontSize: 11, color: TEXT_MUTED }}>Sobra líquida pra empresa</div>
            <div className="fx-mono" style={{ fontSize: 18, fontWeight: 700, color: resultadoLiquidoEmpresa >= 0 ? VERDE : VERMELHO }}>
              {brl(resultadoLiquidoEmpresa)}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
