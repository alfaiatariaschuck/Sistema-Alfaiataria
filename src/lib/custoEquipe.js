import { HORAS_REFERENCIA_TIPO_PECA, TIPOS_SAIDA_SEM_VENDA } from "./constants";

// Semanas por mês na média (365,25/7/12) — usado pra estimar o custo
// mensal de quem recebe por diária (ex: freelancer 3x/semana).
const SEMANAS_POR_MES = 4.345;

// Custo mensal de um membro da equipe — mensalista (valor fixo) ou
// diarista/freelancer (valor por dia × dias por semana × semanas do
// mês). Quem não tem forma de pagamento cadastrada ainda não entra
// (custo 0) — evita mostrar um custo inventado sem base nenhuma.
export function custoMensalDe(m) {
  if (m.tipoRemuneracao === "mensal") return parseFloat(m.valorRemuneracao) || 0;
  if (m.tipoRemuneracao === "diaria") return (parseFloat(m.valorRemuneracao) || 0) * (m.diasPorSemana || 0) * SEMANAS_POR_MES;
  return 0;
}

// Custo mensal de toda a equipe ativa (mensalistas + diaristas somados).
export function custoEquipeMensal(equipe) {
  return (equipe || []).filter((m) => m.ativo).reduce((s, m) => s + custoMensalDe(m), 0);
}

// Custo de mão de obra por HORA de produção de alfaiataria — o número
// canônico que qualquer tela deveria usar em vez do campo solto "valor
// devido ao Ícaro" lançado peça por peça (inconsistente, e a equipe é
// paga fixo por mês, não por peça — pedido explícito do Tales).
// Pega o custo fixo real da equipe (Equipe) e divide pela média de
// horas de referência produzidas por mês, nos últimos `mesesReferencia`
// meses — não pelo mês exato de cada peça (isso já é feito à parte, de
// forma mais precisa, em Histórico de Produção). Esse é o número
// "estável" pra usar em qualquer estimativa rápida (Dashboard,
// Consolidado, Agente de Precificação, estimativa de peça nova).
export function custoPorHoraAlfaiataria(pecas, equipe, mesesReferencia = 6) {
  const custoMensal = custoEquipeMensal(equipe);
  if (custoMensal <= 0) return 0;

  // Nunca conta o mês atual (incompleto) — um mês mal começado, com
  // 1 peça lançada, pesaria igual a um mês fechado inteiro e derrubaria
  // a média artificialmente (mesmo bug já achado e corrigido em
  // "Dados para Remuneração"). Também nunca volta antes da menor
  // dataPedido que existir nas peças — sem isso, pedir 6 meses de
  // referência quando só existem 5 fechados inventaria um mês fantasma
  // (zero peças) e derrubaria a média do mesmo jeito.
  const primeiraData = (pecas || []).reduce((min, p) => (p.dataPedido && (!min || p.dataPedido < min) ? p.dataPedido : min), null);
  const primeiroMes = primeiraData ? primeiraData.slice(0, 7) : null;

  const hoje = new Date();
  const mesesValidos = new Set();
  for (let i = 1; i <= mesesReferencia; i++) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!primeiroMes || chave >= primeiroMes) mesesValidos.add(chave);
  }
  if (mesesValidos.size === 0) return 0;

  let horasTotais = 0;
  (pecas || []).forEach((p) => {
    if (TIPOS_SAIDA_SEM_VENDA.includes(p.tipoSaida)) return;
    const mes = (p.dataPedido || "").slice(0, 7);
    if (!mesesValidos.has(mes)) return;
    horasTotais += HORAS_REFERENCIA_TIPO_PECA[p.tipoPeca] || 0;
  });

  const horasPorMes = horasTotais / mesesValidos.size;
  return horasPorMes > 0 ? custoMensal / horasPorMes : 0;
}

// Custo de mão de obra de UMA peça específica, pelo tipo dela — mesma
// ideia, já pronta pra somar com material (tecido+aviamento) nas telas
// que hoje usam `valorTotal` (o campo solto) como mão de obra.
export function custoMaoDeObraPeca(tipoPeca, custoHora) {
  return (HORAS_REFERENCIA_TIPO_PECA[tipoPeca] || 0) * (custoHora || 0);
}
