import { DIAS_REFERENCIA_TIPO_PECA, ETAPAS_ACOMPANHAMENTO_ALFAIATARIA, ETAPAS_ACOMPANHAMENTO_CAMISARIA, MEDIDA_REGRAS } from "./constants";

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

// Tempo de produção "de verdade" de uma peça: do início real (não da
// venda) até a entrega, descontando os dias em que ficou pausada (ex:
// cliente viajou e não deu pra fazer prova) — senão essas pausas
// distorcem a média de quanto tempo o Ícaro realmente leva pra produzir.
// Enquanto não tem data de entrega, calcula "até hoje" (em andamento).
export function diasProducaoReal(peca) {
  if (!peca.dataInicioProducao) return null;
  const fim = peca.dataEntrega || hojeISO();
  const bruto = diasEntre(peca.dataInicioProducao, fim);
  if (bruto === null) return null;
  const pausadoAgora = peca.situacao === "Pausado" && peca.dataPausaInicio ? diasEntre(peca.dataPausaInicio, hojeISO()) || 0 : 0;
  return Math.max(0, bruto - (peca.diasPausados || 0) - pausadoAgora);
}

// Média real de dias de produção (início -> entrega, já sem pausas) das
// peças já entregues — base pra sugerir uma previsão de entrega pra quem
// ainda não tem uma data calculada, sem precisar de um simulador de fila.
export function mediaDiasProducaoReal(pecas) {
  const validos = pecas
    .filter((p) => p.status === "Entregue" && p.dataInicioProducao && p.dataEntrega)
    .map((p) => diasProducaoReal(p))
    .filter((d) => d !== null && d >= 0);
  if (!validos.length) return null;
  return Math.round(validos.reduce((a, b) => a + b, 0) / validos.length);
}

// Sugestão de previsão de entrega pra peças já iniciadas mas sem previsão
// manual. Usa o RITMO real da própria peça sempre que possível: se já
// avançou X% das etapas em N dias, projeta o total (N / X%) e some ao
// início — assim uma peça que está andando mais rápido (ou mais devagar)
// que a média geral tem uma previsão que reflete isso, em vez de sempre
// cravar "início + média" mesmo já em etapa avançada. Só cai pra média
// histórica quando ainda não tem ritmo suficiente pra confiar nele
// (acabou de começar, sem dias suficientes decorridos).
export function previsaoEstimada(peca, mediaDias) {
  if (!peca.dataInicioProducao || peca.status === "Entregue") return null;

  const { percentual } = statusParaEtapa("alfaiataria", peca.status);
  const diasDecorridos = diasProducaoReal(peca);
  if (diasDecorridos && diasDecorridos >= 3 && percentual > 0 && percentual < 100) {
    const tempoTotalPeloRitmo = Math.round(diasDecorridos / (percentual / 100));
    return somarDias(peca.dataInicioProducao, Math.max(tempoTotalPeloRitmo, diasDecorridos));
  }

  if (!mediaDias) return null;
  return somarDias(peca.dataInicioProducao, mediaDias);
}

// Média "com fallback": usa a produção real (início -> entrega) assim
// que já tem histórico suficiente; enquanto isso não acumula (início é
// recente), cai pro cálculo antigo (data do pedido -> entrega) pra não
// deixar a sugestão sem nenhuma base.
export function mediaDiasProducaoComFallback(pecas) {
  return mediaDiasProducaoReal(pecas) ?? tempoMedioProducaoGenerico(pecas);
}

// Média de dias de produção POR TIPO DE PEÇA. Enquanto um tipo ainda não
// acumulou entregas reais suficientes (< 3), usa a estimativa inicial
// confirmada (DIAS_REFERENCIA_TIPO_PECA — ex: calça ~2 dias) quando
// existe uma pro tipo, senão cai pra média geral de produção. Assim que
// o tipo acumular pelo menos 3 entregas com início e entrega
// registrados, troca sozinho pra média REAL daquele tipo específico —
// nenhuma migração manual necessária, só ir usando o sistema.
export function mediaDiasProducaoPorTipo(pecas, tipoPeca) {
  const doTipo = pecas.filter((p) => p.tipoPeca === tipoPeca);
  const entreguesDoTipo = doTipo.filter((p) => p.status === "Entregue" && p.dataInicioProducao && p.dataEntrega);
  if (entreguesDoTipo.length >= 3) {
    const real = mediaDiasProducaoReal(doTipo);
    if (real !== null) return real;
  }

  if (DIAS_REFERENCIA_TIPO_PECA[tipoPeca] != null) return DIAS_REFERENCIA_TIPO_PECA[tipoPeca];
  return mediaDiasProducaoComFallback(pecas);
}

// Simulador de fila por "lanes": cada peça já em produção ocupa uma lane
// até o fim estimado dela (início + média do tipo dela); peças ainda
// aguardando entram, em ordem de prioridade e depois de data do pedido,
// na lane que libera mais cedo. Assim dá pra projetar a entrega de quem
// ainda nem começou, considerando o que já está represado na fila — sem
// precisar simular horas por freelancer. "mediaDiasFn" recebe a peça e
// devolve a média de dias daquele tipo específico (ver
// mediaDiasProducaoPorTipo), não um número fixo pra todo mundo.
//
// Número de lanes: pelo menos uma por peça já em produção (cada uma
// ocupada até o fim estimado dela), mas nunca menos que "capacidadeMinima"
// (quantas pessoas estão trabalhando hoje, ver useEquipeProducao) — senão,
// quando ninguém ainda marcou início em nada, o modelo empilharia todo
// mundo numa fila única de uma pessoa só, o que superestima muito o
// prazo já que várias peças podem começar em paralelo por pessoas
// diferentes.
export function projetarPrevisoesFila(pecasAbertas, mediaDiasFn, capacidadeMinima = 1) {
  const previsoes = new Map();

  const emProducao = pecasAbertas.filter((p) => p.dataInicioProducao);
  const aguardando = pecasAbertas
    .filter((p) => !p.dataInicioProducao)
    .slice()
    .sort((a, b) => {
      if (a.prioridade === "Alta" && b.prioridade !== "Alta") return -1;
      if (b.prioridade === "Alta" && a.prioridade !== "Alta") return 1;
      return (a.dataPedido || "").localeCompare(b.dataPedido || "");
    });

  const numLanes = Math.max(capacidadeMinima || 1, emProducao.length, 1);
  const lanes = Array.from({ length: numLanes }, (_, i) => {
    if (i >= emProducao.length) return 0;
    const media = mediaDiasFn(emProducao[i]);
    return media ? Math.max(0, diasAte(somarDias(emProducao[i].dataInicioProducao, media)) || 0) : 0;
  });

  aguardando.forEach((p) => {
    const media = mediaDiasFn(p);
    if (!media) return;
    let idx = 0;
    for (let i = 1; i < lanes.length; i++) if (lanes[i] < lanes[idx]) idx = i;
    const entregaOffset = lanes[idx] + media;
    previsoes.set(p.id, somarDias(hojeISO(), entregaOffset));
    lanes[idx] = entregaOffset;
  });

  return previsoes;
}

// Junta os tipos de peça presentes num pedido em "grupos" — tipos que
// compartilham pelo menos uma pessoa da equipe caem no mesmo grupo (ex:
// se Ícaro e Zonzo fazem Traje e Costume, os dois viram um grupo só; se
// só o Felipe faz Calça, Calça vira um grupo à parte). Cada grupo roda
// sua própria fila (projetarPrevisoesFila) com a capacidade de quem
// realmente pode produzir aquele grupo — assim uma calça não compete
// por vaga com um traje, nem o contrário.
function agruparTiposPorEquipe(tiposPresentes, membrosAtivos) {
  const pai = new Map(tiposPresentes.map((t) => [t, t]));
  function acha(t) {
    while (pai.get(t) !== t) t = pai.get(t);
    return t;
  }
  function uniao(a, b) {
    const ra = acha(a);
    const rb = acha(b);
    if (ra !== rb) pai.set(ra, rb);
  }
  function tiposDoMembro(m) {
    return m.tiposPeca && m.tiposPeca.length ? tiposPresentes.filter((t) => m.tiposPeca.includes(t)) : tiposPresentes;
  }

  membrosAtivos.forEach((m) => {
    const seus = tiposDoMembro(m);
    for (let i = 1; i < seus.length; i++) uniao(seus[0], seus[i]);
  });

  const grupos = new Map();
  tiposPresentes.forEach((t) => {
    const raiz = acha(t);
    if (!grupos.has(raiz)) grupos.set(raiz, new Set());
    grupos.get(raiz).add(t);
  });

  return [...grupos.values()].map((tiposDoGrupo) => ({
    tipos: tiposDoGrupo,
    membros: membrosAtivos.filter((m) => tiposDoMembro(m).some((t) => tiposDoGrupo.has(t))),
  }));
}

// Versão do simulador de fila ciente de QUEM faz o quê: separa as peças
// em grupos por especialidade (ver agruparTiposPorEquipe) e roda uma
// fila independente em cada grupo, com capacidade baseada em quantos
// dias/semana e horas/dia cada pessoa daquele grupo trabalha (ancorado
// em 5 dias e 8h como "tempo integral" — ex: freelancer 3x/semana conta
// como 0,6 de uma vaga). Sem ninguém cadastrado, cai pro simulador
// simples com 1 vaga só.
export function projetarPrevisoesFilaPorEquipe(pecasAbertas, mediaDiasFn, equipe) {
  const membrosAtivos = (equipe || []).filter((m) => m.ativo && m.trabalhandoHoje);
  if (!membrosAtivos.length) return projetarPrevisoesFila(pecasAbertas, mediaDiasFn, 1);

  const tiposPresentes = [...new Set(pecasAbertas.map((p) => p.tipoPeca))];
  const grupos = agruparTiposPorEquipe(tiposPresentes, membrosAtivos);

  const previsoes = new Map();
  grupos.forEach(({ tipos, membros }) => {
    const capacidade = membros.length
      ? Math.max(1, Math.round(membros.reduce((s, m) => s + ((m.diasPorSemana ?? 5) / 5) * ((m.horasPorDia ?? 8) / 8), 0)))
      : 1;
    const pecasDoGrupo = pecasAbertas.filter((p) => tipos.has(p.tipoPeca));
    const resultado = projetarPrevisoesFila(pecasDoGrupo, mediaDiasFn, capacidade);
    resultado.forEach((data, id) => previsoes.set(id, data));
  });

  return previsoes;
}

// Previsão pra um pedido que ainda nem foi salvo — usada no formulário de
// novo pedido pra já mostrar um prazo assim que o cliente fecha, levando
// em conta a fila de quem já está esperando, o tipo da peça nova e quem
// na equipe realmente produz esse tipo.
export function previsaoParaNovaPeca(pecasAbertas, mediaDiasFn, prioridade, dataPedido, tipoPeca, equipe) {
  const stub = { id: "__novo__", dataInicioProducao: "", dataPedido: dataPedido || hojeISO(), prioridade: prioridade || "Normal", tipoPeca };
  return projetarPrevisoesFilaPorEquipe([...pecasAbertas, stub], mediaDiasFn, equipe).get("__novo__") || null;
}

// Traduz o status bruto do pedido/peça pra uma etapa do acompanhamento
// público — cobre status antigos da Alfaiataria (de antes de ter etapas
// próprias) mapeando pro equivalente mais próximo, pra nenhum pedido
// antigo ficar sem aparecer certo no link do cliente.
export function statusParaEtapa(tipo, status) {
  if (status === "Entregue" || status === "Entregue Parcial") {
    return { label: "Entregue", percentual: 100, finalizado: true };
  }
  const lista = tipo === "alfaiataria" ? ETAPAS_ACOMPANHAMENTO_ALFAIATARIA : ETAPAS_ACOMPANHAMENTO_CAMISARIA;
  const direta = lista.find((e) => e.status === status);
  if (direta) return { label: direta.label, percentual: direta.percentual, finalizado: false };

  const sinonimos = {
    "Em Produção": "Corte",
    Prova: "Prova na Tela",
    "1ª Prova": "Prova na Tela",
    Ajustes: "Ajuste 1",
    "2ª Prova": "Prova na Caixa",
    Acabamento: "Finalização",
    Pronto: "Finalização",
  };
  const equivalente = sinonimos[status] && lista.find((e) => e.status === sinonimos[status]);
  if (equivalente) return { label: equivalente.label, percentual: equivalente.percentual, finalizado: false };

  return { label: status || "Em andamento", percentual: 100, finalizado: false };
}

export function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}
