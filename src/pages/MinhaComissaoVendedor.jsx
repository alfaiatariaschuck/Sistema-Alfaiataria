import React, { useMemo, useState } from "react";
import { Calculator } from "lucide-react";
import { Card, PageTitle } from "../components/ui";
import { BRASS, INK, LINE, TEXT_MUTED, inputStyle } from "../lib/constants";
import { brl } from "../lib/helpers";

// Mesmas regras de comissão do Simulador interno (SimuladorComissao.jsx),
// só que fixas (o vendedor não edita gatilho/faixas/bônus, só simula
// quantidade e ticket) e sem NENHUM dado de margem/custo da empresa — só
// o que é dele: comissão, ajuda de custo fixa, bônus e total. Regras
// combinadas com o Tales, aprovadas antes de subir aqui.
const FAIXAS_COMISSAO = [
  { min: 0, max: 4, pct: 0, rotulo: "0–4" },
  { min: 5, max: 9, pct: 5, rotulo: "5–9" },
  { min: 10, max: 14, pct: 8, rotulo: "10–14" },
  { min: 15, max: 19, pct: 10, rotulo: "15–19" },
  { min: 20, max: 29, pct: 12, rotulo: "20–29" },
  { min: 30, max: Infinity, pct: 15, rotulo: "30+" },
];
const GATILHO_FIXO = 4;
const VALOR_FIXO = 1500;
const BONUS_A_PARTIR_DE = 60;
const BONUS_A_CADA = 10;
const BONUS_VALOR = 500;
const TICKET_PADRAO = 280;

function faixaDe(qtd) {
  return FAIXAS_COMISSAO.find((f) => qtd >= f.min && qtd <= f.max) || FAIXAS_COMISSAO[0];
}
function bonusDe(qtd) {
  if (qtd < BONUS_A_PARTIR_DE) return 0;
  return (Math.floor((qtd - BONUS_A_PARTIR_DE) / BONUS_A_CADA) + 1) * BONUS_VALOR;
}

// Painel de comissão do próprio vendedor — os pedidos que chegam aqui já
// vêm filtrados pelo RLS (só os dele mesmo). Os campos de quantidade e
// ticket começam preenchidos com o resultado real dele no mês corrente,
// mas são editáveis pra ele simular outros cenários ("e se eu vender
// mais 5 camisas?").
export default function MinhaComissaoVendedor({ pedidos }) {
  const mesAtualStr = new Date().toISOString().slice(0, 7);

  const { qtdReal, ticketReal } = useMemo(() => {
    const doMes = (pedidos || []).filter((p) => p.status !== "Doação" && (p.dataPedido || "").slice(0, 7) === mesAtualStr);
    const qtd = doMes.reduce((s, p) => s + (parseFloat(p.quantidade) || 0), 0);
    const valor = doMes.reduce((s, p) => s + (parseFloat(p.aReceber?.valor) || 0), 0);
    return { qtdReal: qtd, ticketReal: qtd > 0 ? valor / qtd : TICKET_PADRAO };
    // eslint-disable-next-line
  }, [pedidos]);

  const [qtd, setQtd] = useState(String(qtdReal));
  const [ticket, setTicket] = useState(ticketReal.toFixed(0));
  const [jaAjustouPadrao, setJaAjustouPadrao] = useState(false);

  // Assim que o resultado real do mês chegar (carregamento async dos
  // pedidos), preenche os campos uma única vez — depois disso o
  // vendedor tem controle total pra simular.
  if (!jaAjustouPadrao && qtdReal > 0 && qtd === "0") {
    setQtd(String(qtdReal));
    setTicket(ticketReal.toFixed(0));
    setJaAjustouPadrao(true);
  }

  const qtdNum = Math.max(0, parseInt(qtd, 10) || 0);
  const ticketNum = parseFloat(ticket) || 0;
  const faixa = faixaDe(qtdNum);
  const receita = qtdNum * ticketNum;
  const comissao = receita * (faixa.pct / 100);
  const fixo = qtdNum >= GATILHO_FIXO ? VALOR_FIXO : 0;
  const bonus = bonusDe(qtdNum);
  const total = comissao + fixo + bonus;

  return (
    <div>
      <PageTitle eyebrow="Comissão de vendas" title="Minha Comissão" />

      <Card style={{ padding: 20 }}>
        <div className="flex items-center gap-1.5 mb-1">
          <Calculator size={16} color={BRASS} />
          <div className="fx-serif" style={{ fontSize: 15, fontWeight: 600 }}>
            Quanto você ganha por mês
          </div>
        </div>
        <div style={{ fontSize: 12, color: TEXT_MUTED, marginBottom: 16 }}>
          Já preenchido com o seu resultado real de {mesAtualStr.slice(5, 7)}/{mesAtualStr.slice(0, 4)} até agora — edite os
          campos abaixo pra simular outros cenários.
        </div>

        <div className="grid gap-4 mb-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
          <div>
            <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 4 }}>Camisas vendidas no mês</div>
            <input type="number" min="0" step="1" style={inputStyle} value={qtd} onChange={(e) => setQtd(e.target.value)} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 4 }}>Valor médio da camisa (R$)</div>
            <input type="number" min="0" step="10" style={inputStyle} value={ticket} onChange={(e) => setTicket(e.target.value)} />
          </div>
        </div>

        <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 6 }}>Sua faixa de comissão nesse cenário</div>
        <div className="flex gap-1 mb-5">
          {FAIXAS_COMISSAO.map((f) => {
            const ativa = f === faixa;
            return (
              <div
                key={f.rotulo}
                className="flex-1 text-center"
                style={{
                  padding: "8px 4px",
                  borderRadius: 8,
                  background: ativa ? BRASS : "#F3EEDF",
                  border: `1px solid ${ativa ? BRASS : LINE}`,
                  transform: ativa ? "translateY(-2px)" : undefined,
                }}
              >
                <div style={{ fontSize: 9, color: ativa ? "rgba(255,255,255,0.85)" : TEXT_MUTED, whiteSpace: "nowrap" }}>{f.rotulo}</div>
                <div className="fx-mono" style={{ fontSize: 14, fontWeight: 700, color: ativa ? "#FFF" : INK }}>
                  {f.pct}%
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ fontSize: 13 }}>
          <div className="flex items-center justify-between py-2" style={{ borderBottom: `1px solid ${LINE}` }}>
            <span style={{ color: TEXT_MUTED }}>
              Comissão sobre vendas
              <span style={{ display: "block", fontSize: 11 }}>{faixa.pct}% sobre {brl(receita)} vendidos</span>
            </span>
            <span className="fx-mono" style={{ fontWeight: 600 }}>{brl(comissao)}</span>
          </div>
          <div className="flex items-center justify-between py-2" style={{ borderBottom: `1px solid ${LINE}` }}>
            <span style={{ color: TEXT_MUTED }}>
              Ajuda de custo fixa
              <span style={{ display: "block", fontSize: 11 }}>
                {qtdNum >= GATILHO_FIXO ? `bateu o gatilho de ${GATILHO_FIXO} camisas` : `faltam ${GATILHO_FIXO - qtdNum} camisa(s) pro gatilho`}
              </span>
            </span>
            <span className="fx-mono" style={{ fontWeight: 600 }}>{fixo > 0 ? brl(fixo) : "—"}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span style={{ color: TEXT_MUTED }}>
              Bônus de volume
              <span style={{ display: "block", fontSize: 11 }}>a cada {BONUS_A_CADA} camisas a partir de {BONUS_A_PARTIR_DE}</span>
            </span>
            <span className="fx-mono" style={{ fontWeight: 600 }}>{bonus > 0 ? brl(bonus) : "—"}</span>
          </div>
        </div>

        <div className="flex items-center justify-between py-3 px-3 mt-4" style={{ background: "#EAF3EA", borderRadius: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#2C6E31" }}>Total que você recebe esse mês</span>
          <span className="fx-mono" style={{ fontSize: 20, fontWeight: 700, color: "#2C6E31" }}>{brl(total)}</span>
        </div>

        <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 14 }}>
          Abaixo de <strong>{GATILHO_FIXO} camisas</strong> no mês não entra comissão nem ajuda de custo. A partir daí,
          quanto mais vender, maior a fatia — sua comissão sobe de faixa em faixa, sem teto.
        </div>
      </Card>
    </div>
  );
}
