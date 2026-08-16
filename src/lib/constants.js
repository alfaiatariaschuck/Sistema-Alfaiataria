export const INK = "#16212E";
export const INK_SOFT = "#2A3B4D";
export const CANVAS = "#F5F1E8";
export const CARD = "#FFFFFF";
export const BRASS = "#A9793E";
export const BRASS_SOFT = "#EFE1CC";
export const LINE = "#E4DECF";
export const TEXT_MUTED = "#6B7280";

export const STATUS = ["Aguardando Produção", "Em Produção", "Prova", "Pronto", "Entregue Parcial", "Entregue", "Doação"];

export const STATUS_STYLE = {
  "Aguardando Produção": { bg: "#F6E3D9", fg: "#9C4A1E" },
  "Em Produção": { bg: "#FCEFC7", fg: "#8A6A0C" },
  Prova: { bg: "#E9E1F5", fg: "#5B3E96" },
  Pronto: { bg: "#DCEBDD", fg: "#2C6E31" },
  "Entregue Parcial": { bg: "#D9EEF5", fg: "#1E6E8C" },
  Entregue: { bg: "#DCE4EE", fg: "#2E4A6B" },
  Doação: { bg: "#F5DCE8", fg: "#9C2E63" },
};

export const PAG_STYLE = {
  Pendente: { bg: "#F6E3D9", fg: "#9C4A1E" },
  Recebido: { bg: "#DCEBDD", fg: "#2C6E31" },
  Pago: { bg: "#DCEBDD", fg: "#2C6E31" },
};

export const FORMAS_PAGAMENTO = ["Cartão de Crédito", "PIX", "Dinheiro", "Transferência", "Boleto"];

export const TIPOS_PECA = ["Traje", "Costume", "Casaco", "Bomber", "Calça", "Colete", "Blazer", "Outro"];

// Medidas de alfaiataria, agrupadas por seção (evita colisão de campos
// com o mesmo nome, ex: "Comprimento" existe em corpo e em calça).
export const MEDIDAS_ALFAIATARIA = {
  corpo: {
    titulo: "Medidas (corpo)",
    campos: [
      { label: "Tórax" },
      { label: "Cintura" },
      { label: "Altura Cintura", obs: "Medida da cervical até a fita da cintura" },
      { label: "Altura das Costas", obs: "Medida da cervical até a fita do tórax" },
      { label: "Altura Frente", obs: "Medida da cervical até a fita do tórax pelo peito" },
      { label: "Quadril" },
      { label: "Pala" },
      { label: "Ombro" },
      { label: "Cava", obs: "Medida da cava" },
      { label: "Manga" },
      { label: "Costas", obs: "Medida da axila à axila costas" },
      { label: "Comprimento" },
      { label: "Bíceps" },
    ],
  },
  calca: {
    titulo: "Medidas (calça)",
    campos: [
      { label: "Cós" },
      { label: "Comprimento" },
      { label: "Gancho" },
      { label: "Entreperna" },
      { label: "Coxa" },
      { label: "Gancho Total" },
      { label: "Joelho" },
    ],
  },
  colete: {
    titulo: "Medidas (colete)",
    campos: [
      { label: "Comprimento Frente" },
      { label: "Comprimento Costas" },
    ],
  },
};

// Quais seções de medida aparecem, dependendo do tipo de peça escolhido
export const PECA_SECOES = {
  Traje: ["corpo", "calca", "colete"],
  Costume: ["corpo", "calca", "colete"],
  Blazer: ["corpo"],
  Casaco: ["corpo"],
  Bomber: ["corpo"],
  Calça: ["calca"],
  Colete: ["colete"],
  Outro: ["corpo"],
};

// Características — aparecem para peças que incluem a seção "corpo" (paletó/blazer/traje)
export const CARACTERISTICAS_TRAJE = [
  { label: "Botões", opcoes: ["1 botão", "2 botões", "3 botões"], obs: "pode ser traje de um ou dois botões" },
  { label: "Lapela", opcoes: ["Bico", "Reta", "Xale"], obs: "todas as opções de lapela ficam disponíveis pra escolha" },
  { label: "Pesponto", opcoes: ["Com", "Sem"] },
  { label: "Construção", opcoes: ["Fullcanvas", "Half Canvas", "Fusionado"], obs: "todas as opções possíveis" },
  { label: "Detalhes da Calça", opcoes: ["Barra italiana", "Uma prega", "Duas pregas", "Sem prega", "Cós alto"], obs: "pode incluir mais de uma opção" },
  { label: "Colete", opcoes: ["Com", "Sem"] },
];

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

// Cada campo pode ter "opcoes" (vira seleção com opção de digitar "Outro") ou não (texto livre)
export const DESC_CAMPOS = [
  { label: "Pesponto", opcoes: ["Fino", "Largo", "Sem"] },
  { label: "Colarinho (estilo)", opcoes: ["Inglês", "Francês", "Italiano", "Super Italiano", "Militar"] },
  { label: "Colarinho - Observação" }, // texto livre, ao lado do estilo
  { label: "Punho", opcoes: ["Redondo", "Duplo", "Chanfrado", "Simples", "Francês (abotoadura)"] },
  { label: "Monograma" },
  { label: "Manga", opcoes: ["Longa", "Curta"] },
  {
    label: "Frente",
    opcoes: [
      "Estruturada com barbatana",
      "Somente Entretela",
      "Lisa",
      "Fechado Lisa",
      "Fechado com Estrutura mais Barbatana",
      "Fechado com Entretela",
    ],
  },
];
export const DESC_LABELS = DESC_CAMPOS.map((c) => c.label);

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
