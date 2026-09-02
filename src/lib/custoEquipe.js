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
