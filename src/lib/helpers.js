import { MEDIDA_REGRAS } from "./constants";

export function finalDaMedida(label, mp) {
  const r = MEDIDA_REGRAS[label];
  const n = parseFloat(mp);
  if (!r || isNaN(n)) return null;
  let v = n + (r.ajuste || 0);
  if (r.divisor) v = v / r.divisor;
  v = v + (r.extra || 0);
  return Math.round(v * 100) / 100;
}

export function novoId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

export function fmtData(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function diasAte(iso) {
  if (!iso) return null;
  const alvo = new Date(iso + "T00:00:00");
  const hoje = new Date(hojeISO() + "T00:00:00");
  return Math.round((alvo - hoje) / 86400000);
}

export function diasEntre(isoInicio, isoFim) {
  if (!isoInicio || !isoFim) return null;
  const a = new Date(isoInicio + "T00:00:00");
  const b = new Date(isoFim + "T00:00:00");
  return Math.round((b - a) / 86400000);
}

export function mesesDesde(iso) {
  if (!iso) return null;
  const alvo = new Date(iso + "T00:00:00");
  const hoje = new Date(hojeISO() + "T00:00:00");
  return (hoje.getFullYear() - alvo.getFullYear()) * 12 + (hoje.getMonth() - alvo.getMonth());
}

export function brl(v) {
  return (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function totalDividido(valorEntrada, valorRestante) {
  return (parseFloat(valorEntrada) || 0) + (parseFloat(valorRestante) || 0);
}

export function statusDividido(statusEntrada, statusRestante, labelPago) {
  return statusEntrada === labelPago && statusRestante === labelPago ? labelPago : "Pendente";
}

export function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}
