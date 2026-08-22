// Interpreta um comando falado tipo "tórax cento e dois" ou "manga 58"
// e devolve { label, valor } pra preencher a medida certa. Best-effort:
// o navegador às vezes já manda o número em dígito (mais comum), às
// vezes por extenso — cobrimos os dois casos.

const ALIASES = [
  { label: "Colarinho", ditos: ["colarinho"] },
  { label: "Ombro I", ditos: ["ombro i", "ombro grande"] },
  { label: "Ombro P", ditos: ["ombro p", "ombro pequeno"] },
  { label: "Manga", ditos: ["manga"] },
  { label: "Bíceps", ditos: ["biceps", "bíceps"] },
  { label: "Punho D", ditos: ["punho direito", "punho d"] },
  { label: "Punho E", ditos: ["punho esquerdo", "punho e"] },
  { label: "Compr.", ditos: ["comprimento", "compr"] },
  { label: "Frente", ditos: ["frente"] },
  { label: "Tórax", ditos: ["torax", "tórax", "busto", "peito"] },
  { label: "C. alta", ditos: ["cintura alta", "c alta"] },
  { label: "C. baixa", ditos: ["cintura baixa", "c baixa"] },
  { label: "Quadril", ditos: ["quadril"] },
]
  .flatMap((a) => a.ditos.map((d) => ({ label: a.label, dito: d })))
  .sort((a, b) => b.dito.length - a.dito.length);

function normalizar(txt) {
  return txt
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9., ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const UNIDADES = {
  zero: 0, um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5,
  seis: 6, sete: 7, oito: 8, nove: 9,
};
const DEZ_A_DEZENOVE = {
  dez: 10, onze: 11, doze: 12, treze: 13, catorze: 14, quatorze: 14,
  quinze: 15, dezesseis: 16, dezessete: 17, dezoito: 18, dezenove: 19,
};
const DEZENAS = {
  vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50, sessenta: 60,
  setenta: 70, oitenta: 80, noventa: 90,
};
const CENTENAS = {
  cem: 100, cento: 100, duzentos: 200, trezentos: 300, quatrocentos: 400,
  quinhentos: 500, seiscentos: 600, setecentos: 700, oitocentos: 800, novecentos: 900,
};

function palavrasParaNumero(texto) {
  const partes = texto.split(/\s+e\s+|\s+/).filter(Boolean);
  let total = null;
  let usouAlgo = false;
  for (const parte of partes) {
    if (CENTENAS[parte] !== undefined) {
      total = (total || 0) + CENTENAS[parte];
      usouAlgo = true;
    } else if (DEZENAS[parte] !== undefined) {
      total = (total || 0) + DEZENAS[parte];
      usouAlgo = true;
    } else if (DEZ_A_DEZENOVE[parte] !== undefined) {
      total = (total || 0) + DEZ_A_DEZENOVE[parte];
      usouAlgo = true;
    } else if (UNIDADES[parte] !== undefined) {
      total = (total || 0) + UNIDADES[parte];
      usouAlgo = true;
    }
  }
  return usouAlgo ? total : null;
}

function extrairNumero(texto) {
  // 1) "e meio" / "vírgula X" pro decimal — checa isso ANTES do dígito,
  // pra "32 e meio" não virar só 32.
  let decimal = 0;
  let base = texto.trim();
  const meio = base.match(/(.+?)\s+e\s+meio\b/);
  if (meio) {
    decimal = 0.5;
    base = meio[1].trim();
  } else {
    const virgula = base.match(/(.+?)\s+virgula\s+(\w+)/);
    if (virgula) {
      const digito = virgula[2].match(/^\d+$/);
      const casas = digito ? parseInt(virgula[2], 10) : palavrasParaNumero(virgula[2]) ?? UNIDADES[virgula[2]];
      if (casas !== null && casas !== undefined) {
        decimal = casas / Math.pow(10, String(casas).length);
        base = virgula[1].trim();
      }
    }
  }

  // 2) já veio em dígito (mais comum no reconhecimento do Chrome)
  const digitos = base.match(/(\d+(?:[.,]\d+)?)/);
  if (digitos) return parseFloat(digitos[1].replace(",", ".")) + decimal;

  // 3) por extenso
  const inteiro = palavrasParaNumero(base);
  if (inteiro === null) return null;
  return inteiro + decimal;
}

export function parseComandoMedida(textoFalado) {
  const norm = normalizar(textoFalado);
  const encontrado = ALIASES.find((a) => norm.includes(a.dito));
  if (!encontrado) return null;

  const resto = norm.replace(encontrado.dito, "").trim();
  const valor = extrairNumero(resto);
  if (valor === null || isNaN(valor) || valor <= 0 || valor > 300) return null;

  return { label: encontrado.label, valor };
}
