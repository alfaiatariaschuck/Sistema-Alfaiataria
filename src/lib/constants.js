export const INK = "#16212E";
export const INK_SOFT = "#2A3B4D";
export const CANVAS = "#F5F1E8";
export const CARD = "#FFFFFF";
export const BRASS = "#A9793E";
export const BRASS_SOFT = "#EFE1CC";
export const LINE = "#E4DECF";
export const TEXT_MUTED = "#6B7280";

export const STATUS = ["Aguardando Produção", "Em Produção", "Pronto", "Entregue"];

export const STATUS_STYLE = {
  "Aguardando Produção": { bg: "#F6E3D9", fg: "#9C4A1E" },
  "Em Produção": { bg: "#FCEFC7", fg: "#8A6A0C" },
  Pronto: { bg: "#DCEBDD", fg: "#2C6E31" },
  Entregue: { bg: "#DCE4EE", fg: "#2E4A6B" },
};

export const PAG_STYLE = {
  Pendente: { bg: "#F6E3D9", fg: "#9C4A1E" },
  Recebido: { bg: "#DCEBDD", fg: "#2C6E31" },
  Pago: { bg: "#DCEBDD", fg: "#2C6E31" },
};

export const FORMAS_PAGAMENTO = ["Cartão de Crédito", "PIX", "Dinheiro", "Transferência", "Boleto"];

export const MEDIDA_REGRAS = {
  Colarinho: { ajuste: 0 },
  "Ombro I": { ajuste: 2, divisor: 2 },
  "Ombro P": { ajuste: 2 },
  Manga: { ajuste: -7 },
  Bíceps: { ajuste: 4, divisor: 2 },
  "Punho D": { ajuste: 5 },
  "Punho E": { ajuste: 5 },
  "Compr.": { ajuste: 2.5 },
  Frente: { ajuste: 2, divisor: 2, extra: 2 },
  Tórax: { ajuste: 12, divisor: 4, extra: 2 },
  "C. alta": { ajuste: 12, divisor: 4, extra: 2 },
  "C. baixa": { ajuste: 12, divisor: 4, extra: 2 },
  Quadril: { ajuste: 11, divisor: 4, extra: 2 },
};

export const MEDIDA_LABELS = Object.keys(MEDIDA_REGRAS);
export const DESC_LABELS = ["Pesponto", "Colarinho (estilo)", "Punho", "Monograma", "Pense", "Manga", "Frente", "Carcela"];

export const inputStyle = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 6,
  border: `1px solid ${LINE}`,
  background: "#FCFAF5",
  fontSize: 14,
  color: INK,
  outline: "none",
};
