import React, { useMemo, useState } from "react";
import { CheckCircle2, GitCompare, HelpCircle, Wallet, XCircle } from "lucide-react";
import { Card, Empty, PageTitle, Pill, StatCard } from "../components/ui";
import { BRASS, LINE, TEXT_MUTED, TIPOS_SAIDA_SEM_VENDA, inputStyle } from "../lib/constants";
import { brl, fmtData, hojeISO, valorRecebidoEfetivo } from "../lib/helpers";
import { similaridadeNomes } from "../lib/clientes";

const VERDE = "#2C6E31";
const VERMELHO = "#9C4A1E";
const TOLERANCIA_VALOR = 0.05;
const JANELA_DIAS = 10;

function totalDespesa(d) {
  return (parseFloat(d.valor) || 0) + (parseFloat(d.frete) || 0);
}

// Aceita "R$ 1.234,56", "1234.56", "-45,00", "(45,00)" — formato
// brasileiro é o caso comum (ponto = milhar, vírgula = decimal).
function parseValorBR(str) {
  let s = (str || "").trim().replace(/^R\$\s*/i, "");
  const negativo = s.startsWith("-") || s.endsWith("-") || (s.startsWith("(") && s.endsWith(")"));
  s = s.replace(/[()]/g, "").replace(/-/g, "");
  if (s.includes(",") && s.includes(".")) s = s.replace(/\./g, "").replace(",", ".");
  else if (s.includes(",")) s = s.replace(",", ".");
  const n = parseFloat(s);
  if (isNaN(n)) return null;
  return negativo ? -Math.abs(n) : Math.abs(n);
}

function parseDataBR(str) {
  const s = (str || "").trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) {
    let [, d, mo, y] = m;
    if (y.length === 2) y = "20" + y;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return null;
}

// Cada linha colada: data, descrição, valor — separados por TAB (colando
// direto do Excel) ou por 2+ espaços (colando texto corrido do extrato).
function parseLinhas(texto) {
  return (texto || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((linha) => {
      const partes = linha.includes("\t") ? linha.split("\t").map((p) => p.trim()) : linha.split(/\s{2,}/).map((p) => p.trim());
      if (partes.length < 2) return null;
      const data = parseDataBR(partes[0]);
      const valor = parseValorBR(partes[partes.length - 1]);
      const descricao = partes.slice(1, partes.length - 1).join(" ").trim() || "—";
      if (!data || valor === null) return null;
      return { data, descricao, valor: Math.abs(valor) };
    })
    .filter(Boolean);
}

function diffDias(a, b) {
  return Math.abs((new Date(a + "T00:00:00") - new Date(b + "T00:00:00")) / 86400000);
}

function normalizarBusca(s) {
  return (s || "").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

// Sugestão de categoria por palavra-chave — sem IA, sem lançar nada
// sozinho, só pra você ver de cara "isso é gasto de Transporte" sem
// precisar abrir cada lançamento. Se você quiser mesmo essa despesa no
// sistema, lança em Contas a Pagar já com a categoria certa.
const REGRAS_CATEGORIA = [
  { categoria: "Transporte", palavras: ["uber", "posto", "combustive", "gasolina", "pedagio", "99pop", "taxi", "park", "estacionamento"] },
  { categoria: "Água/Luz/Internet", palavras: ["energia", "ceee", "rge", "telefonica", "internet", "saneamento", "vivo", "claro", " tim ", "agua"] },
  { categoria: "Aluguel", palavras: ["aluguel", "locacao", "imobiliari", "condominio"] },
  { categoria: "Impostos", palavras: ["das simples", "simples nacional", "imposto", "tributo", "issqn"] },
  { categoria: "Contador", palavras: ["contador", "contabeis", "contabilidade"] },
  { categoria: "Plano de Saúde", palavras: ["unimed", "sulamerica", "amil", "plano de saude"] },
  { categoria: "Material/Tecido avulso", palavras: ["tecido", "textil", "seda", "malha", "fios"] },
  { categoria: "Aviamento Camisaria", palavras: ["aviamento", "botao", "ziper", "entretela", "forro"] },
  { categoria: "Manutenção", palavras: ["manutencao", "reparo", "conserto", "maquina de costura"] },
];

// Início de palavra, não qualquer substring — "imposto" não pode cair em
// Transporte só porque contém "posto" (de gasolina) no meio. Só ancora o
// começo (não o fim) pra "tecido" ainda pegar "tecidos" no plural.
function contemPalavra(texto, chave) {
  const escapada = chave.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escapada}`, "i").test(texto);
}

function sugerirCategoria(descricao) {
  const d = normalizarBusca(descricao);
  for (const regra of REGRAS_CATEGORIA) {
    if (regra.palavras.some((p) => contemPalavra(d, p))) return regra.categoria;
  }
  return null;
}

function normalizarNome(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]/g, "");
}

// Pontua o quanto a descrição do banco parece com o nome/fornecedor do
// sistema — primeiro tenta "um contém o outro" já sem acento/espaço/
// pontuação (pega "Ícaro" em "Icaro De Oliveira Fadrique", ou "Dab Dab"
// em "Tecidos Raphael Dabdab Ltda"), senão cai pro comparador de
// bigramas já usado em Clientes.jsx pra achar duplicata.
function pontuarNome(descricaoBanco, nomeSistema) {
  const a = normalizarNome(descricaoBanco);
  const b = normalizarNome(nomeSistema);
  if (!a || !b) return 0;
  if (a.includes(b) || b.includes(a)) return 1;
  return similaridadeNomes(descricaoBanco, nomeSistema);
}

// Entre os candidatos dentro da tolerância de valor e da janela de dias,
// o nome é quem decide — valor+data sozinhos não bastam (dois
// fornecedores/clientes podem ter o mesmo valor no mesmo período, e aí
// "a data mais próxima" pode escolher o errado). Data só desempata entre
// nomes igualmente parecidos.
function acharMelhorMatch(linha, candidatos) {
  const naFaixa = candidatos
    .filter((c) => c.dataRef && Math.abs(c.valor - linha.valor) <= TOLERANCIA_VALOR)
    .map((c) => ({ ...c, dias: diffDias(linha.data, c.dataRef), pontoNome: pontuarNome(linha.descricao, c.nome) }))
    .filter((c) => c.dias <= JANELA_DIAS);
  if (naFaixa.length === 0) return null;
  naFaixa.sort((a, b) => b.pontoNome - a.pontoNome || a.dias - b.dias);
  const melhor = naFaixa[0];
  return { ...melhor, confiancaBaixa: melhor.pontoNome < 0.35 };
}

function BotaoAcao({ onClick, feito, texto, textoFeito }) {
  if (feito) return <span style={{ fontSize: 11, color: VERDE, fontWeight: 600, whiteSpace: "nowrap" }}>✓ {textoFeito}</span>;
  return (
    <button
      onClick={onClick}
      style={{ background: "#EDEAE0", color: "#16212E", padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}
    >
      {texto}
    </button>
  );
}

function LinhaResultado({ linha, match, cor, acao }) {
  return (
    <div className="flex items-center justify-between gap-3 p-2" style={{ borderBottom: `1px solid ${LINE}` }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>
          {fmtData(linha.data)} · {linha.descricao}
        </div>
        {match && (
          <div style={{ fontSize: 11, color: match.confiancaBaixa ? VERMELHO : TEXT_MUTED }}>
            {match.tipo ? `${match.tipo} · ` : ""}
            {match.nome} — no sistema consta como <strong>{match.status}</strong>
            {match.dias > 0 ? ` · ${Math.round(match.dias)}d de diferença na data` : ""}
            {match.confiancaBaixa ? " · ⚠ nome não bate bem, confira antes de considerar certo" : ""}
          </div>
        )}
        {!match && <div style={{ fontSize: 11, color: TEXT_MUTED }}>Não achei nada parecido no sistema — pode ser um lançamento faltando, ou algo pessoal (PF).</div>}
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        {acao}
        <div className="fx-mono" style={{ fontSize: 13, fontWeight: 700, color: cor, whiteSpace: "nowrap" }}>
          {brl(linha.valor)}
        </div>
      </div>
    </div>
  );
}

export default function AgenteConciliador({
  despesas,
  pedidos,
  pecas,
  pedidosSapatos,
  onMarcarDespesaPaga,
  onAtualizarSubcampoPedido,
  onAtualizarCampoPeca,
}) {
  const [textoSaidas, setTextoSaidas] = useState("");
  const [textoEntradas, setTextoEntradas] = useState("");
  const [resultado, setResultado] = useState(null);
  // Feedback visual de "já cliquei nisso" — o resultado é uma foto do
  // momento da conciliação, então a ação muda o banco mas não o texto
  // "no sistema consta como X" da linha (só reconciliando de novo pra
  // atualizar isso). O check aqui é só pra não deixar clicar 2x.
  const [processados, setProcessados] = useState(new Set());

  function marcarProcessado(chave) {
    setProcessados((prev) => new Set(prev).add(chave));
  }

  async function marcarDespesaPaga(match, linha) {
    await onMarcarDespesaPaga(match.id, match.valor, linha.data);
    marcarProcessado(`despesa-${match.id}`);
  }

  async function marcarRecebido(match) {
    if (match.tipo === "Camisaria") await onAtualizarSubcampoPedido(match.id, "aReceber", "statusPagamento", "Recebido");
    else if (match.tipo === "Alfaiataria") await onAtualizarCampoPeca(match.id, "statusPagamentoVenda", "Recebido");
    marcarProcessado(`entrada-${match.tipo}-${match.id}`);
  }

  const candidatosSaida = useMemo(
    () =>
      (despesas || [])
        .filter((d) => totalDespesa(d) > 0)
        .map((d) => ({
          id: d.id,
          nome: d.fornecedor || d.descricao,
          categoria: d.categoria || "Sem categoria",
          valor: d.status === "Pago" && parseFloat(d.valorPago) > 0 ? parseFloat(d.valorPago) : totalDespesa(d),
          dataRef: d.dataPagamento || d.vencimento,
          status: d.status,
        })),
    [despesas]
  );

  const candidatosEntrada = useMemo(() => {
    const doCamisa = (pedidos || [])
      .filter((p) => parseFloat(p.aReceber?.valor) > 0)
      .map((p) => ({
        id: p.id,
        tipo: "Camisaria",
        nome: p.cliente,
        valor: parseFloat(p.aReceber.valor) || 0,
        dataRef: p.dataCobranca || p.previsaoEntrega || p.dataPedido,
        status: p.aReceber.statusPagamento,
      }));
    const daPeca = (pecas || [])
      .filter((p) => parseFloat(p.valorVenda) > 0)
      .map((p) => ({
        id: p.id,
        tipo: "Alfaiataria",
        nome: p.cliente,
        valor: parseFloat(p.valorVenda) || 0,
        dataRef: p.dataCobranca || p.previsaoEntrega || p.dataPedido,
        status: p.statusPagamentoVenda,
      }));
    const doSapato = (pedidosSapatos || [])
      .filter((p) => parseFloat(p.valorVenda) > 0)
      .map((p) => ({
        id: p.id,
        tipo: "Sapatos",
        nome: p.cliente,
        valor: parseFloat(p.valorVenda) || 0,
        dataRef: p.previsaoEntrega || p.dataPedido,
        status: p.status,
      }));
    return [...doCamisa, ...daPeca, ...doSapato];
  }, [pedidos, pecas, pedidosSapatos]);

  // Mesma fórmula do "Faturamento do mês" do DRE — sem sapatos, do jeito
  // que já é lá (não deixar esse número aqui divergir do que aparece nas
  // outras telas). "Recebido de verdade" é o mesmo total, mas só a parte
  // já confirmada como recebida — é isso que dá pra comparar com o
  // extrato, não o faturamento bruto.
  function recebidoEfetivo(p, valorTotal, statusTotal) {
    return valorRecebidoEfetivo({
      pagamentoDividido: p.pagamentoDividido,
      valorEntrada: p.valorEntrada,
      statusEntrada: p.statusEntrada,
      valorRestante: p.valorRestante,
      statusRestante: p.statusRestante,
      valorTotal,
      statusTotal,
    });
  }

  const resumoMes = useMemo(() => {
    const mesAtual = hojeISO().slice(0, 7);
    const pedidosMes = (pedidos || []).filter((p) => p.status !== "Doação" && (p.dataPedido || "").slice(0, 7) === mesAtual);
    const pecasMes = (pecas || []).filter((p) => !TIPOS_SAIDA_SEM_VENDA.includes(p.tipoSaida) && (p.dataPedido || "").slice(0, 7) === mesAtual);
    const faturamento =
      pedidosMes.reduce((s, p) => s + (parseFloat(p.aReceber?.valor) || 0), 0) + pecasMes.reduce((s, p) => s + (parseFloat(p.valorVenda) || 0), 0);
    const recebido =
      pedidosMes.reduce((s, p) => s + recebidoEfetivo(p, parseFloat(p.aReceber?.valor) || 0, p.aReceber?.statusPagamento), 0) +
      pecasMes.reduce((s, p) => s + recebidoEfetivo(p, parseFloat(p.valorVenda) || 0, p.statusPagamentoVenda), 0);
    return { faturamento, recebido, pendente: Math.max(0, faturamento - recebido) };
  }, [pedidos, pecas]);

  function conciliar() {
    const saidas = parseLinhas(textoSaidas);
    const entradas = parseLinhas(textoEntradas);
    const saidasBatendo = [];
    const saidasSemMatch = [];
    saidas.forEach((linha) => {
      const match = acharMelhorMatch(linha, candidatosSaida);
      if (match) saidasBatendo.push({ linha, match });
      else saidasSemMatch.push(linha);
    });
    const entradasBatendo = [];
    const entradasSemMatch = [];
    entradas.forEach((linha) => {
      const match = acharMelhorMatch(linha, candidatosEntrada);
      if (match) entradasBatendo.push({ linha, match });
      else entradasSemMatch.push(linha);
    });

    // Resumo por categoria — soma tanto o que já tem categoria lançada
    // (saída batendo) quanto o que só tem sugestão por palavra-chave
    // (saída sem correspondência), pra você ver de cara onde o dinheiro
    // está indo mesmo sem lançar nada novo no sistema.
    const porCategoria = new Map();
    const somar = (nome, valor) => porCategoria.set(nome, (porCategoria.get(nome) || 0) + valor);
    saidasBatendo.forEach((r) => somar(r.match.categoria, r.linha.valor));
    saidasSemMatch.forEach((linha) => somar(sugerirCategoria(linha.descricao) || "Sem categoria (sem sugestão)", linha.valor));
    const resumoCategorias = [...porCategoria.entries()].sort((a, b) => b[1] - a[1]);

    const totalDespesasPeriodo = saidas.reduce((s, l) => s + l.valor, 0);
    const totalReceitasPeriodo = entradas.reduce((s, l) => s + l.valor, 0);

    setResultado({ saidasBatendo, saidasSemMatch, entradasBatendo, entradasSemMatch, resumoCategorias, totalDespesasPeriodo, totalReceitasPeriodo });
  }

  return (
    <div>
      <PageTitle eyebrow="Agente" title="Agente Conciliador" />

      <Card style={{ padding: 16 }} className="mb-6">
        <p style={{ fontSize: 13, color: "#2A3B4D", lineHeight: 1.6 }}>
          Cole abaixo as linhas do seu extrato (uma por linha: <strong>data, descrição e valor</strong> — separados por
          tab, se colar direto do Excel, ou por dois espaços). Não precisa de IA nem de chave de API pra isso — é
          comparação direta com o que já está no sistema, tudo roda aqui no navegador, nada sai daqui. Depois de
          conciliar, cada linha que precisar de uma ação (marcar como pago/recebido, registrar despesa que faltava)
          já vem com um botão — clica ali e o sistema atualiza sozinho, sem precisar ir procurar em outra tela.
        </p>
      </Card>

      <Card style={{ padding: 20 }} className="mb-6">
        <div className="fx-serif mb-1" style={{ fontSize: 15, fontWeight: 600 }}>
          Faturamento x Recebido do mês (sistema)
        </div>
        <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 14 }}>
          "Faturamento" é tudo que foi vendido no mês (mesmo número que aparece no DRE), independente de já ter sido
          pago. "Recebido" é só a parte confirmada como paga/recebida no sistema — é esse que dá pra comparar com o
          que cai no banco. A diferença entre os dois é pendência de pagamento, não erro.
        </div>
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
          <StatCard label="Faturamento do mês" value={brl(resumoMes.faturamento)} icon={Wallet} />
          <StatCard label="Recebido no mês" value={brl(resumoMes.recebido)} icon={Wallet} accent={VERDE} />
          <StatCard label="Ainda pendente de pagamento" value={brl(resumoMes.pendente)} icon={Wallet} accent={VERMELHO} />
        </div>
      </Card>

      <Card style={{ padding: 20 }} className="mb-6">
        <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Saídas do extrato (pagamentos)</div>
            <textarea
              style={{ ...inputStyle, minHeight: 160, fontSize: 12 }}
              className="fx-mono"
              placeholder={"24/09/2026\tTED Fornecedor Tecido XYZ\t1200,00\n20/09/2026\tBoleto aluguel\t2500,00"}
              value={textoSaidas}
              onChange={(e) => setTextoSaidas(e.target.value)}
            />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Entradas do extrato (recebimentos)</div>
            <textarea
              style={{ ...inputStyle, minHeight: 160, fontSize: 12 }}
              className="fx-mono"
              placeholder={"24/09/2026\tPix recebido - Marcelo\t350,00\n22/09/2026\tPix recebido - Juliana\t980,00"}
              value={textoEntradas}
              onChange={(e) => setTextoEntradas(e.target.value)}
            />
          </div>
        </div>
        <button
          onClick={conciliar}
          disabled={!textoSaidas.trim() && !textoEntradas.trim()}
          className="flex items-center gap-2 mt-4"
          style={{ background: "#16212E", color: "#FFF", padding: "9px 18px", borderRadius: 8, fontWeight: 600, fontSize: 13 }}
        >
          <GitCompare size={15} /> Conciliar
        </button>
      </Card>

      {resultado && (
        <>
          <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
            <StatCard label="Total Entradas no extrato colado" value={brl(resultado.totalReceitasPeriodo)} icon={Wallet} accent={VERDE} />
            <StatCard label="Total Saídas no extrato colado" value={brl(resultado.totalDespesasPeriodo)} icon={Wallet} accent={VERMELHO} />
          </div>

          <Card style={{ padding: 20 }} className="mb-6">
            <div className="fx-serif mb-3" style={{ fontSize: 15, fontWeight: 600 }}>
              Despesas por categoria
            </div>
            <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 12 }}>
              Soma das saídas coladas, agrupadas pela categoria já lançada no sistema (ou pela sugestão por
              palavra-chave, quando ainda não tem lançamento correspondente).
            </div>
            {resultado.resumoCategorias.length === 0 ? (
              <Empty texto="Nenhuma saída colada." />
            ) : (
              resultado.resumoCategorias.map(([categoria, valor], i) => (
                <div
                  key={categoria}
                  className="flex items-center justify-between py-1.5"
                  style={{ borderBottom: i < resultado.resumoCategorias.length - 1 ? `1px solid ${LINE}` : "none", fontSize: 13 }}
                >
                  <span style={{ fontWeight: i === 0 ? 700 : 500 }}>{categoria}</span>
                  <span className="fx-mono" style={{ fontWeight: 700, color: BRASS }}>
                    {brl(valor)}
                  </span>
                </div>
              ))
            )}
          </Card>
        </>
      )}

      {resultado && (
        <div className="grid gap-6" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <Card style={{ padding: 20 }}>
            <div className="fx-serif mb-3 flex items-center gap-2" style={{ fontSize: 15, fontWeight: 600 }}>
              <CheckCircle2 size={16} color={VERDE} /> Saídas batendo ({resultado.saidasBatendo.length})
            </div>
            {resultado.saidasBatendo.length === 0 ? (
              <Empty texto="Nenhuma." />
            ) : (
              resultado.saidasBatendo.map((r, i) => (
                <LinhaResultado
                  key={i}
                  linha={r.linha}
                  match={r.match}
                  cor={VERMELHO}
                  acao={
                    r.match.status !== "Pago" && (
                      <BotaoAcao
                        onClick={() => marcarDespesaPaga(r.match, r.linha)}
                        feito={processados.has(`despesa-${r.match.id}`)}
                        texto="Marcar como pago"
                        textoFeito="marcado"
                      />
                    )
                  }
                />
              ))
            )}
          </Card>

          <Card style={{ padding: 20 }}>
            <div className="fx-serif mb-3 flex items-center gap-2" style={{ fontSize: 15, fontWeight: 600 }}>
              <XCircle size={16} color={VERMELHO} /> Saídas sem correspondência ({resultado.saidasSemMatch.length})
            </div>
            {resultado.saidasSemMatch.length === 0 ? (
              <Empty texto="Nenhuma — tudo que saiu bate com o sistema." />
            ) : (
              resultado.saidasSemMatch.map((linha, i) => {
                const sugestao = sugerirCategoria(linha.descricao);
                return (
                  <LinhaResultado
                    key={i}
                    linha={linha}
                    match={null}
                    cor={VERMELHO}
                    acao={sugestao ? <Pill text={sugestao} /> : <span style={{ fontSize: 10, color: TEXT_MUTED }}>sem sugestão</span>}
                  />
                );
              })
            )}
          </Card>

          <Card style={{ padding: 20 }}>
            <div className="fx-serif mb-3 flex items-center gap-2" style={{ fontSize: 15, fontWeight: 600 }}>
              <CheckCircle2 size={16} color={VERDE} /> Entradas batendo ({resultado.entradasBatendo.length})
            </div>
            {resultado.entradasBatendo.length === 0 ? (
              <Empty texto="Nenhuma." />
            ) : (
              resultado.entradasBatendo.map((r, i) => (
                <LinhaResultado
                  key={i}
                  linha={r.linha}
                  match={r.match}
                  cor={VERDE}
                  acao={
                    r.match.status !== "Recebido" &&
                    r.match.tipo !== "Sapatos" && (
                      <BotaoAcao
                        onClick={() => marcarRecebido(r.match)}
                        feito={processados.has(`entrada-${r.match.tipo}-${r.match.id}`)}
                        texto="Marcar como recebido"
                        textoFeito="marcado"
                      />
                    )
                  }
                />
              ))
            )}
          </Card>

          <Card style={{ padding: 20 }}>
            <div className="fx-serif mb-3 flex items-center gap-2" style={{ fontSize: 15, fontWeight: 600 }}>
              <HelpCircle size={16} color={VERMELHO} /> Entradas sem correspondência ({resultado.entradasSemMatch.length})
            </div>
            {resultado.entradasSemMatch.length === 0 ? (
              <Empty texto="Nenhuma — tudo que entrou bate com o sistema." />
            ) : (
              resultado.entradasSemMatch.map((linha, i) => <LinhaResultado key={i} linha={linha} match={null} cor={VERDE} />)
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
