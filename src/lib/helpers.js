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

// Quanto já entrou de verdade — statusDividido() só diz "Recebido" quando
// as DUAS parcelas estão pagas, então um pedido com entrada recebida e
// restante pendente aparece como 100% pendente se a gente olhar só pro
// status combinado. Aqui a gente soma parcela por parcela o que já foi
// efetivamente marcado como recebido/pago.
export function valorRecebidoEfetivo({ pagamentoDividido, valorEntrada, statusEntrada, valorRestante, statusRestante, valorTotal, statusTotal, labelPago = "Recebido" }) {
  if (pagamentoDividido) {
    const entrada = statusEntrada === labelPago ? parseFloat(valorEntrada) || 0 : 0;
    const restante = statusRestante === labelPago ? parseFloat(valorRestante) || 0 : 0;
    return entrada + restante;
  }
  return statusTotal === labelPago ? parseFloat(valorTotal) || 0 : 0;
}

export function somarDias(iso, dias) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

function mediaDiasEntrega(lista) {
  return lista.length ? Math.round(lista.reduce((s, p) => s + (diasEntre(p.dataPedido, p.dataEntrega) || 0), 0) / lista.length) : null;
}

// Tempo médio de produção separado por tipo de cliente (novo x recompra) —
// só considera pedidos já entregues com data_entrega registrada, fora
// Plano de Assinatura (ritmo diferente, distorceria a média).
export function temposMediosProducao(pedidos) {
  const entreguesComData = pedidos.filter((p) => p.status === "Entregue" && p.dataEntrega && !p.assinatura);
  return {
    novos: mediaDiasEntrega(entreguesComData.filter((p) => !p.recompra)),
    recompra: mediaDiasEntrega(entreguesComData.filter((p) => p.recompra)),
  };
}

// Igual acima, mas sem separar por novo/recompra — usado na Alfaiataria,
// que ainda não tem esse controle no cadastro do cliente.
export function tempoMedioProducaoGenerico(lista) {
  return mediaDiasEntrega(lista.filter((p) => p.status === "Entregue" && p.dataEntrega));
}

export function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}
