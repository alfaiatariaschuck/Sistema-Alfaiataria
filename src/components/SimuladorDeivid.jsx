import React, { useMemo, useState } from "react";
import { Calculator } from "lucide-react";
import { Card } from "./ui";
import { BRASS, INK, LINE, TEXT_MUTED, inputStyle } from "../lib/constants";
import { brl, custoTecidoDe } from "../lib/helpers";

const VERMELHO = "#9C4A1E";
const VERDE = "#2C6E31";
const MESES_MEDIA = 2;
const PERCENTUAIS_RAPIDOS = [5, 8, 10, 12, 15];

// Ticket médio e custo de MATERIAL médio (tecido + aviamento — sem mão de
// obra, que aqui é sempre o campo manual) de uma lista de pedidos de
// camisa, ponderado por camisa (soma tudo, divide pela quantidade total).
function mediasDeCamisas(lista, custoAviamentosPorPecaBase) {
  let somaValor = 0;
  let somaMaterial = 0;
  let somaQtd = 0;
  (lista || [])
    .filter((p) => p.status !== "Doação")
    .forEach((p) => {
      const qtd = parseFloat(p.quantidade) || 0;
      somaValor += parseFloat(p.aReceber?.valor) || 0;
      somaMaterial += custoTecidoDe(p.tecidos) + (custoAviamentosPorPecaBase["Camisa"] || 0) * qtd;
      somaQtd += qtd;
    });
  return {
    qtdCamisasTotal: somaQtd,
    ticketMedio: somaQtd > 0 ? somaValor / somaQtd : 0,
    custoMaterialMedioPorCamisa: somaQtd > 0 ? somaMaterial / somaQtd : 0,
  };
}

function pedidosDosUltimosMeses(pedidos, nMeses) {
  const hoje = new Date();
  const chaves = [];
  for (let i = 1; i <= nMeses; i++) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    chaves.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return (pedidos || []).filter((p) => chaves.includes((p.dataPedido || "").slice(0, 7)));
}

// Esboço de simulador pro combinado com o Deivid. Mão de obra é SEMPRE um
// valor manual por camisa (é o que se paga por produção, não muda se for
// a Fabi ou outra pessoa) — sem distinção de capacidade/reforço, porque o
// preço por peça é o mesmo. O ticket e o custo de material vêm dos
// PEDIDOS REAIS DO DEIVID assim que ele tiver algum (é em cima das vendas
// dele que o comissionamento vai ser calculado); enquanto ele não tem
// histórico, usa a média da loja toda nos últimos meses fechados.
export default function SimuladorDeivid({ pedidos, pedidosDeivid = [], custoAviamentosPorPecaBase = {} }) {
  const [metaMensal, setMetaMensal] = useState("6");
  const [gatilho, setGatilho] = useState("3");
  const [adiantamento, setAdiantamento] = useState("1500");
  const [percentualComissao, setPercentualComissao] = useState("10");
  const [maoDeObra, setMaoDeObra] = useState("120");

  const mediasDeivid = useMemo(() => mediasDeCamisas(pedidosDeivid, custoAviamentosPorPecaBase), [pedidosDeivid, custoAviamentosPorPecaBase]);
  const mediasLoja = useMemo(
    () => mediasDeCamisas(pedidosDosUltimosMeses(pedidos, MESES_MEDIA), custoAviamentosPorPecaBase),
    [pedidos, custoAviamentosPorPecaBase]
  );
  const usaDeivid = mediasDeivid.qtdCamisasTotal > 0;
  const base = usaDeivid ? mediasDeivid : mediasLoja;

  const metaNum = parseInt(metaMensal, 10) || 0;
  const gatilhoNum = parseInt(gatilho, 10) || 0;
  const adiantamentoNum = parseFloat(adiantamento) || 0;
  const percentualNum = parseFloat(percentualComissao) || 0;
  const maoDeObraNum = parseFloat(maoDeObra) || 0;

  const margemPorCamisa = base.ticketMedio - base.custoMaterialMedioPorCamisa - maoDeObraNum;

  const pontoEquilibrioCamisas = margemPorCamisa > 0 ? Math.ceil(adiantamentoNum / margemPorCamisa) : null;
  const cenarios = [gatilhoNum, metaNum, metaNum + 3, metaNum + 6].filter((v, i, arr) => v > 0 && arr.indexOf(v) === i);

  const receita = metaNum * base.ticketMedio;
  const custoMaterial = metaNum * base.custoMaterialMedioPorCamisa;
  const maoDeObraTotal = metaNum * maoDeObraNum;
  const margemAposProducao = receita - custoMaterial - maoDeObraTotal;
  const comissaoDeivid = receita * (percentualNum / 100);
  const ganhoDeivid = comissaoDeivid + adiantamentoNum;
  const resultadoLiquidoEmpresa = margemAposProducao - ganhoDeivid;

  return (
    <Card style={{ padding: 20 }} className="mt-6">
      <div className="flex items-center gap-1.5 mb-1">
        <Calculator size={16} color={BRASS} />
        <div className="fx-serif" style={{ fontSize: 16, fontWeight: 600 }}>
          Simulador de Vendas — Deivid (esboço)
        </div>
      </div>
      <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 16 }}>
        {usaDeivid ? (
          <>
            Baseado nos <strong>pedidos reais do Deivid</strong> ({base.qtdCamisasTotal} camisa(s) até agora) — ticket
            médio {brl(base.ticketMedio)}, material médio {brl(base.custoMaterialMedioPorCamisa)}/camisa.
          </>
        ) : (
          <>
            O Deivid ainda não tem pedido próprio, então a base é a <strong>média da camisaria toda</strong> nos
            últimos {MESES_MEDIA} meses fechados — ticket médio {brl(base.ticketMedio)}, material médio{" "}
            {brl(base.custoMaterialMedioPorCamisa)}/camisa. Assim que ele tiver pedidos com o nome dele, passa a usar
            os dados reais dele automaticamente.
          </>
        )}{" "}
        Mão de obra é sempre o campo manual abaixo (o que se paga por produção, seja pra Fabi ou outra pessoa).
      </div>

      <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
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
        <div>
          <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 4 }}>Mão de obra por camisa (R$)</div>
          <input type="number" step="0.01" style={inputStyle} value={maoDeObra} onChange={(e) => setMaoDeObra(e.target.value)} />
        </div>
      </div>

      <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <div>
          <div style={{ fontSize: 11, color: TEXT_MUTED }}>Margem média/camisa</div>
          <div className="fx-mono" style={{ fontSize: 18, fontWeight: 700 }}>
            {brl(margemPorCamisa)}{" "}
            <span style={{ fontSize: 12, color: TEXT_MUTED }}>
              ({base.ticketMedio > 0 ? ((margemPorCamisa / base.ticketMedio) * 100).toFixed(0) : 0}%)
            </span>
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
          Simulador completo — comissão + produção, tudo junto
        </div>
        <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 16 }}>
          Cascata da meta de {metaNum || 0} camisas: receita → material → mão de obra (por produção, valor acima) →
          comissão do Deivid (% escolhido) + o fixo → o que sobra líquido pra empresa. Imposto ainda{" "}
          <strong>não entra</strong> nessa conta — isso só é tratado no DRE.
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
        </div>

        <div style={{ fontSize: 13 }}>
          {[
            { label: "Receita (meta × ticket médio)", valor: receita },
            { label: "(–) Custo de material (tecido + aviamento)", valor: -custoMaterial },
            { label: "(–) Mão de obra (por produção)", valor: -maoDeObraTotal },
            { label: "= Margem após produção", valor: margemAposProducao, destaque: true },
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

        <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 12 }}>
          Como a mão de obra é paga por produção, ela já está descontada camisa a camisa acima — não existe um
          "número mínimo de camisas" pra começar a pagar quem produz, cada venda já cobre a própria produção. Na meta
          de {metaNum || 0} camisas, o total disponível pra pagar produção (Fabi ou uma nova costureira) é{" "}
          <strong>{brl(maoDeObraTotal)}/mês</strong>.
        </div>
      </div>
    </Card>
  );
}
