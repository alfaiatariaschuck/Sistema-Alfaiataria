export const INK = "#16212E";
export const INK_SOFT = "#2A3B4D";
export const CANVAS = "#F5F1E8";
export const CARD = "#FFFFFF";
export const BRASS = "#A9793E";
export const BRASS_SOFT = "#EFE1CC";
export const LINE = "#E4DECF";
export const TEXT_MUTED = "#6B7280";

// Cores de comparação (2 séries categóricas) — validadas com o
// verificador de paleta do skill de dataviz (blue/orange, slots 1-2 da
// paleta de referência): passam piso de croma, contraste e separação
// por daltonismo. As cores da marca (BRASS/INK_SOFT) não passam o piso
// de croma pra uso categórico, por isso essa dupla à parte.
export const COR_REFERENCIA = "#eb6834";
export const COR_REAL = "#2a78d6";

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
  { status: "Aguardando Produção", label: "Aguardando produção", percentual: 0 },
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

export const LINHA_STYLE = {
  Camisaria: { bg: "#EFE1CC", fg: "#A9793E" },
  Alfaiataria: { bg: "#E9E1F5", fg: "#5B3E96" },
};

export const FORNECEDORES_TECIDO = ["Imperiale", "Wtext", "LS Tecidos", "Markbel", "Erlu", "Dab Dab", "Cataguases"];

export const CATEGORIAS_DESPESA = [
  "Aluguel",
  "Água/Luz/Internet",
  "Impostos",
  "Material/Tecido avulso",
  "Manutenção",
  "Salários",
  "Pró-labore",
  "Plano de Saúde",
  "Outros",
];

export const TIPOS_PECA = ["Traje", "Costume", "Casaco", "Bomber", "Calça", "Colete", "Blazer", "Outro"];

// Peças-base (aba Aviamentos) que compõem cada tipo de peça vendido —
// confirmado batendo com os valores de aviamentos que o Tales já tinha
// fechado (ex: Costume = Paletó+Calça = R$267,86 exato). "Outro" fica
// sem composição — não dá pra saber o que é sem perguntar.
export const COMPOSICAO_AVIAMENTOS = {
  Blazer: ["Paletó"],
  Costume: ["Paletó", "Calça"],
  Traje: ["Paletó", "Calça", "Colete"],
  Casaco: ["Casaco"],
  Bomber: ["Bomber"],
  Calça: ["Calça"],
  Colete: ["Colete"],
};

// Estimativa inicial de dias corridos de produção por tipo de peça,
// baseada no histórico REAL da planilha do Ícaro (aba "Histórico de
// Pedidos Entregues" — início real até entrega real, já incluindo
// prova, agenda do cliente etc). Usada só enquanto aquele tipo ainda
// não acumulou 3+ entregas reais no PRÓPRIO sistema (ver
// mediaDiasProducaoPorTipo em helpers.js), que aí passa a calcular a
// média automaticamente e esses números somem de vista. Tem
// prioridade sobre a conta por horas abaixo, que é só o tempo de
// trabalho manual — sempre otimista, porque não inclui espera nenhuma.
// Traje/Blazer/Casaco/Bomber vieram de só 1-2 entregas reais (pouca
// amostra, mas ainda assim mais realista que a conta por horas —
// Calça, por exemplo, tem 6 entregas reais com média de 21 dias
// corridos, bem longe das ~2h de trabalho de máquina puro).
export const DIAS_REFERENCIA_TIPO_PECA = {
  Traje: 33,
  Blazer: 19,
  Casaco: 13,
  Bomber: 28,
};

// Horas de desenvolvimento por tipo de peça (planilha de parâmetros do
// Ícaro) — tempo de trabalho manual, sem contar espera de prova/agenda
// do cliente. Convertido em dias corridos dividindo pela capacidade de
// produção (HORAS_PRODUTIVAS_POR_DIA_PADRAO) — é isso que entra na
// conta da previsão pros tipos que não têm um número direto de dias em
// DIAS_REFERENCIA_TIPO_PECA acima.
export const HORAS_REFERENCIA_TIPO_PECA = {
  Traje: 23,
  Costume: 23,
  Blazer: 23,
  Casaco: 23,
  Bomber: 23,
  Colete: 10,
  Calça: 12,
};

// Capacidade de produção padrão (horas produtivas por dia) usada pra
// converter horas de desenvolvimento em dias corridos — 8h, conforme
// confirmado pelo Tales (não 6h).
export const HORAS_PRODUTIVAS_POR_DIA_PADRAO = 8;

// Quantos dias antes de uma data limite de evento (casamento, formatura
// etc.) já vale acender o alerta de risco — mesmo que a produção ainda
// esteja "no prazo" pela previsão normal, um evento rígido chegando
// perto merece atenção redobrada.
export const DIAS_ALERTA_EVENTO = 20;

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
