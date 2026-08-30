export const INK = "#16212E";
export const INK_SOFT = "#2A3B4D";
export const CANVAS = "#F5F1E8";
export const CARD = "#FFFFFF";
export const BRASS = "#A9793E";
export const BRASS_SOFT = "#EFE1CC";
export const LINE = "#E4DECF";
export const TEXT_MUTED = "#6B7280";

export const STATUS = ["Aguardando Produção", "Em Produção", "Prova", "Pronto", "Entregue Parcial", "Entregue", "Doação"];

// Alfaiataria tem etapas próprias, mais granulares (corte, provas,
// ajustes, acabamento) — usadas no formulário/detalhe da peça e no
// acompanhamento público do cliente.
export const STATUS_ALFAIATARIA = [
  "Aguardando Produção",
  "Molde",
  "Corte",
  "Prova na Tela",
  "Ajuste 1",
  "Prova na Caixa",
  "Ajuste 2",
  "Prova Final",
  "Finalização",
  "Entregue Parcial",
  "Entregue",
  "Doação",
];

export const STATUS_STYLE = {
  "Aguardando Produção": { bg: "#F6E3D9", fg: "#9C4A1E" },
  "Em Produção": { bg: "#FCEFC7", fg: "#8A6A0C" },
  Prova: { bg: "#E9E1F5", fg: "#5B3E96" },
  Corte: { bg: "#FCEFC7", fg: "#8A6A0C" },
  "1ª Prova": { bg: "#E9E1F5", fg: "#5B3E96" },
  Ajustes: { bg: "#FCEFC7", fg: "#8A6A0C" },
  "2ª Prova": { bg: "#E9E1F5", fg: "#5B3E96" },
  Acabamento: { bg: "#D9EEF5", fg: "#1E6E8C" },
  Pronto: { bg: "#DCEBDD", fg: "#2C6E31" },
  Molde: { bg: "#EFE1CC", fg: "#8A6A0C" },
  "Prova na Tela": { bg: "#E9E1F5", fg: "#5B3E96" },
  "Ajuste 1": { bg: "#FCEFC7", fg: "#8A6A0C" },
  "Prova na Caixa": { bg: "#E9E1F5", fg: "#5B3E96" },
  "Ajuste 2": { bg: "#FCEFC7", fg: "#8A6A0C" },
  "Prova Final": { bg: "#D8CBEA", fg: "#4A2E80" },
  Finalização: { bg: "#DCEBDD", fg: "#2C6E31" },
  "Entregue Parcial": { bg: "#D9EEF5", fg: "#1E6E8C" },
  Entregue: { bg: "#DCE4EE", fg: "#2E4A6B" },
  Doação: { bg: "#F5DCE8", fg: "#9C2E63" },
};

// Etapas mostradas no link de acompanhamento público (o "rastreio" que o
// cliente recebe) — cada uma com o % de conclusão que aparece na barra
// de progresso. "Entregue Parcial"/"Entregue"/"Doação" não entram aqui
// porque são tratadas à parte (pedido já finalizado).
export const ETAPAS_ACOMPANHAMENTO_CAMISARIA = [
  { status: "Aguardando Produção", label: "Aguardando produção", percentual: 15 },
  { status: "Em Produção", label: "Em produção", percentual: 55 },
  { status: "Prova", label: "Prova", percentual: 80 },
  { status: "Pronto", label: "Pronto para retirada", percentual: 100 },
];

export const ETAPAS_ACOMPANHAMENTO_ALFAIATARIA = [
  { status: "Aguardando Produção", label: "Aguardando produção", percentual: 5 },
  { status: "Molde", label: "Molde", percentual: 15 },
  { status: "Corte", label: "Corte do tecido", percentual: 28 },
  { status: "Prova na Tela", label: "Prova na tela", percentual: 40 },
  { status: "Ajuste 1", label: "Ajuste", percentual: 52 },
  { status: "Prova na Caixa", label: "Prova na caixa", percentual: 65 },
  { status: "Ajuste 2", label: "Ajuste final", percentual: 78 },
  { status: "Prova Final", label: "Prova final", percentual: 90 },
  { status: "Finalização", label: "Finalização", percentual: 100 },
];

export const PAG_STYLE = {
  Pendente: { bg: "#F6E3D9", fg: "#9C4A1E" },
  Parcial: { bg: "#D9EEF5", fg: "#1E6E8C" },
  Recebido: { bg: "#DCEBDD", fg: "#2C6E31" },
  Pago: { bg: "#DCEBDD", fg: "#2C6E31" },
};

export const FORMAS_PAGAMENTO = ["Cartão de Crédito", "PIX", "Dinheiro", "Transferência", "Boleto"];

export const FORNECEDORES_TECIDO = ["Imperiale", "Wtext", "LS Tecidos", "Markbel", "Erlu", "Dab Dab", "Cataguases"];

export const CATEGORIAS_DESPESA = ["Aluguel", "Água/Luz/Internet", "Impostos", "Material/Tecido avulso", "Manutenção", "Salários", "Outros"];

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

// Nome exibido na tela/ficha/PDF — a chave interna (usada pra guardar a
// medida e calcular a fórmula) continua "Ombro I"/"Ombro P" pra não
// perder as medidas já salvas nos pedidos existentes.
export const MEDIDA_ROTULO_EXIBICAO = {
  "Ombro I": "Ombro a Ombro",
  "Ombro P": "Ombro Parcial",
  "Punho D": "Punho Direito",
  "Punho E": "Punho Esquerdo",
  "Compr.": "Comprimento",
  "C. alta": "Cintura Alta",
  "C. baixa": "Cintura Baixa",
};
export function rotuloMedida(label) {
  return MEDIDA_ROTULO_EXIBICAO[label] || label;
}

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
