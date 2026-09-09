// Regras oficiais de comissão do vendedor — combinadas e aprovadas com o
// Tales (fixas, ninguém edita por aqui). Fonte única usada tanto na tela
// "Minha Comissão" (MinhaComissaoVendedor.jsx) quanto no lançamento real
// da comissão em Contas a Pagar (VendedorGestao.jsx) — o Simulador
// (SimuladorComissao.jsx) é à parte, de propósito: é pra brincar com
// gatilho/faixas hipotéticos, não reflete a regra fixa daqui.
export const FAIXAS_COMISSAO = [
  { min: 0, max: 4, pct: 0, rotulo: "0–4" },
  { min: 5, max: 9, pct: 5, rotulo: "5–9" },
  { min: 10, max: 14, pct: 8, rotulo: "10–14" },
  { min: 15, max: 19, pct: 10, rotulo: "15–19" },
  { min: 20, max: 29, pct: 12, rotulo: "20–29" },
  { min: 30, max: Infinity, pct: 15, rotulo: "30+" },
];
export const GATILHO_FIXO = 4;
export const VALOR_FIXO = 1500;
export const BONUS_A_PARTIR_DE = 60;
export const BONUS_A_CADA = 10;
export const BONUS_VALOR = 500;

export function faixaDe(qtd) {
  return FAIXAS_COMISSAO.find((f) => qtd >= f.min && qtd <= f.max) || FAIXAS_COMISSAO[0];
}

export function bonusDe(qtd) {
  if (qtd < BONUS_A_PARTIR_DE) return 0;
  return (Math.floor((qtd - BONUS_A_PARTIR_DE) / BONUS_A_CADA) + 1) * BONUS_VALOR;
}

// Comissão + ajuda de custo fixa + bônus, a partir da quantidade vendida
// e do valor total vendido no período (mês).
export function calcularComissao(qtd, receita) {
  const faixa = faixaDe(qtd);
  const comissao = receita * (faixa.pct / 100);
  const fixo = qtd >= GATILHO_FIXO ? VALOR_FIXO : 0;
  const bonus = bonusDe(qtd);
  return { faixa, comissao, fixo, bonus, total: comissao + fixo + bonus };
}
