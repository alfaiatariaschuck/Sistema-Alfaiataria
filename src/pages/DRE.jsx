import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ChevronLeft, ChevronRight, Info, Layers, Scale, Scissors, Shirt, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { Card, PageTitle, StatCard } from "../components/ui";
import { BRASS, INK, LINE, TIPOS_SAIDA_SEM_VENDA, TEXT_MUTED, inputStyle } from "../lib/constants";
import { brl, custoAviamentoComposicao, custoTecidoDe, hojeISO, metragemParaNumero } from "../lib/helpers";
import { custoEquipeMensal } from "../lib/custoEquipe";
import { custoCompartilhadoRateado } from "../lib/custoFixoMensal";
import { useConfigCustosFixos } from "../hooks/useConfigCustosFixos";
import { supabase } from "../supabaseClient";

const CATEGORIA_TECIDO = "Material/Tecido avulso";

// Quanto foi realmente lançado no Contas a Pagar como compra de tecido
// nesse mês (categoria "Material/Tecido avulso", pelo vencimento) — pra
// comparar com o tecido ESTIMADO do DRE (metro cadastrado × valor/metro) e
// ver se a estimativa está próxima da realidade ou se o preço cadastrado
// já está desatualizado.
function tecidoRealDoMes(despesas, chaveMes) {
  return (despesas || [])
    .filter((d) => d.categoria === CATEGORIA_TECIDO && d.vencimento && d.vencimento.slice(0, 7) === chaveMes)
    .reduce((s, d) => s + (parseFloat(d.valor) || 0) + (parseFloat(d.frete) || 0), 0);
}

// Por fornecedor, o que de fato SAIU DA CONTA nesse mês (data do
// pagamento, não vencimento, e valor efetivamente pago, não o lançado) —
// diferente do "Real pago" acima (que usa vencimento, pra comparar com a
// estimativa do DRE), esse aqui é a conta certa pra bater linha a linha
// com o extrato bancário do PJ.
function tecidoPorFornecedorPagoNoMes(despesas, chaveMes) {
  const mapa = new Map();
  (despesas || [])
    .filter(
      (d) =>
        d.categoria === CATEGORIA_TECIDO &&
        d.dataPagamento &&
        d.dataPagamento.slice(0, 7) === chaveMes &&
        (parseFloat(d.valorPago) || 0) > 0
    )
    .forEach((d) => {
      const nome = d.fornecedor || "Sem fornecedor";
      mapa.set(nome, (mapa.get(nome) || 0) + (parseFloat(d.valorPago) || 0));
    });
  return [...mapa.entries()].sort((a, b) => b[1] - a[1]);
}

// Imposto (Simples Nacional) é a alíquota configurada (%) sobre o próprio
// faturamento de cada linha — não precisa ratear feito os outros custos
// compartilhados porque já nasce proporcional à receita de quem gerou ele.
function impostoDaLinha(aliquotaImposto, receitaLinha) {
  return (receitaLinha || 0) * ((parseFloat(aliquotaImposto) || 0) / 100);
}

const VERMELHO = "#9C4A1E";
const VERDE = "#2C6E31";
const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function mesAnteriorDe(mesStr) {
  const [ano, mes] = mesStr.split("-").map(Number);
  const d = new Date(ano, mes - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function mesSeguinteDe(mesStr) {
  const [ano, mes] = mesStr.split("-").map(Number);
  const d = new Date(ano, mes, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function nomeDoMes(mesStr) {
  const [ano, mes] = mesStr.split("-").map(Number);
  return `${MESES[mes - 1]} de ${ano}`;
}

// Linha do DRE (Camisaria, Alfaiataria ou Geral) — mesma composição usada
// em Custos do Ateliê/Custos da Camisaria/Resultado do Mês, só que
// detalhada lado a lado com as outras linhas pra comparar de uma vez.
function LinhaDRE({ titulo, Icone, receita, maoDeObra, tecido, aviamentos, estrutura, rateio, imposto, destaque }) {
  const custoTotal = maoDeObra + tecido + aviamentos + estrutura + rateio + imposto;
  const resultado = receita - custoTotal;
  const sePagando = resultado >= 0;
  const margem = receita > 0 ? (resultado / receita) * 100 : 0;
  return (
    <Card style={{ padding: 20, border: destaque ? `1px solid ${BRASS}` : undefined }}>
      <div className="flex items-center gap-1.5 mb-3">
        {Icone && <Icone size={15} color={BRASS} />}
        <div className="fx-serif" style={{ fontSize: 15, fontWeight: 600 }}>
          {titulo}
        </div>
      </div>
      <div className="flex items-center justify-between mb-3" style={{ fontSize: 12 }}>
        <span style={{ color: TEXT_MUTED }}>Receita</span>
        <span className="fx-mono" style={{ fontWeight: 700 }}>{brl(receita)}</span>
      </div>
      <div style={{ fontSize: 11, color: TEXT_MUTED }}>
        {[
          ["Mão de obra", maoDeObra],
          ["Tecido", tecido],
          ["Aviamentos", aviamentos],
          ["Estrutura (aluguel/luz)", estrutura],
          ["Compartilhado (rateio)", rateio],
          ["Impostos", imposto],
        ].map(([label, valor]) => (
          <div key={label} className="flex items-center justify-between py-1" style={{ borderBottom: `1px solid ${LINE}` }}>
            <span>{label}</span>
            <span className="fx-mono">{brl(valor)}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between py-2 mt-1" style={{ fontSize: 12, fontWeight: 600 }}>
        <span>Custo total</span>
        <span className="fx-mono">{brl(custoTotal)}</span>
      </div>
      <div
        className="flex items-center justify-between py-2 px-2 mt-1"
        style={{ background: sePagando ? "#EAF3EA" : "#F7EAE3", borderRadius: 6, fontSize: 13, fontWeight: 700 }}
      >
        <span>{sePagando ? "Lucro" : "Prejuízo"}</span>
        <span className="fx-mono" style={{ color: sePagando ? VERDE : VERMELHO }}>
          {brl(resultado)} ({margem.toFixed(1)}%)
        </span>
      </div>
    </Card>
  );
}

// DRE (Demonstrativo de Resultado) — Camisaria + Alfaiataria + Geral lado a
// lado, com entradas controladas: tecido e aviamento por estimativa da
// peça (metro cadastrado + catálogo), não despesa solta do Contas a Pagar
// (esse é o simulador de caixa à parte, sem curadoria). Navegável mês a
// mês — pro mês corrente o custo é "ao vivo" (ainda incompleto até
// fechar); pra meses passados, usa os pedidos/peças reais daquele mês mas
// o custo fixo de hoje (equipe, aluguel etc — não existe histórico
// configurado desses valores mês a mês).
export default function DRE({ pedidos, pecas, despesas = [], equipe = [], custoAviamentosPorPecaBase = {} }) {
  const mesRealAtual = hojeISO().slice(0, 7);
  const [mesSelecionado, setMesSelecionado] = useState(mesRealAtual);
  const ehMesAtual = mesSelecionado === mesRealAtual;
  const custosFixos = useConfigCustosFixos();

  // Ajuste manual do tecido gasto no mês (opcional) — pra meses fechados
  // onde os pedidos não têm metro/valor cadastrado (o "Tecido estimado"
  // fica zerado), dá pra informar à mão o que foi gasto de verdade só pra
  // enxergar o lucro real daquele mês. É por mês (chave própria na config,
  // "tecido_manual_<mês>") — puramente informativo, não altera a
  // composição de custo mostrada nos cards de cima nem afeta outros meses.
  const chaveTecidoManual = `tecido_manual_${mesSelecionado}`;
  const [tecidoManual, setTecidoManual] = useState("");
  const [tecidoManualSalvo, setTecidoManualSalvo] = useState(null);

  useEffect(() => {
    let cancelado = false;
    setTecidoManualSalvo(null);
    (async () => {
      const { data } = await supabase.from("config").select("valor").eq("chave", chaveTecidoManual).maybeSingle();
      if (!cancelado) setTecidoManual(data?.valor || "");
    })();
    return () => {
      cancelado = true;
    };
  }, [chaveTecidoManual]);

  async function salvarTecidoManual() {
    setTecidoManualSalvo(null);
    const { error } = await supabase.from("config").upsert({ chave: chaveTecidoManual, valor: tecidoManual });
    setTecidoManualSalvo(!error);
    setTimeout(() => setTecidoManualSalvo(null), 2500);
  }

  const {
    aluguelAtelie,
    luzAtelie,
    aluguelLoja,
    luzLoja,
    prolabore,
    custosFixosPJ,
    planoSaudePJ,
    aliquotaImposto,
    loading: carregandoConfig,
  } = custosFixos;

  const dados = useMemo(() => {
    if (carregandoConfig) return null;

    // Custo de tecido/mão de obra usa TODO pedido/peça do mês (Doação,
    // Permuta e Uso próprio inclusos na Alfaiataria — consomem material de
    // verdade); receita e quantidade vendida (pro cálculo do aviamento por
    // unidade) excluem esses status, que não são venda pra cliente pagante.
    const pedidosMes = (pedidos || []).filter((p) => (p.dataPedido || "").slice(0, 7) === mesSelecionado);
    const pecasMes = (pecas || []).filter((p) => (p.dataPedido || "").slice(0, 7) === mesSelecionado);

    const receitaCamisaria = pedidosMes.filter((p) => p.status !== "Doação").reduce((s, p) => s + (parseFloat(p.aReceber?.valor) || 0), 0);
    const receitaAlfaiataria = pecasMes.filter((p) => !TIPOS_SAIDA_SEM_VENDA.includes(p.tipoSaida)).reduce((s, p) => s + (parseFloat(p.valorVenda) || 0), 0);

    const maoDeObraCamisaria = pedidosMes.reduce((s, p) => s + (parseFloat(p.pagoFabiana?.valor) || 0), 0);
    const tecidoCamisaria = pedidosMes.reduce((s, p) => s + custoTecidoDe(p.tecidos), 0);
    const quantidadeVendidaCamisaria = pedidosMes.filter((p) => p.status !== "Doação").reduce((s, p) => s + (parseInt(p.quantidade, 10) || 0), 0);
    const aviamentosCamisaria = (custoAviamentosPorPecaBase["Camisa"] || 0) * quantidadeVendidaCamisaria;
    const estruturaCamisaria = (parseFloat(aluguelLoja) || 0) + (parseFloat(luzLoja) || 0);

    const maoDeObraAlfaiataria = custoEquipeMensal(equipe);
    const tecidoAlfaiataria = pecasMes.reduce((s, p) => s + custoTecidoDe(p.tecidos), 0);
    const aviamentosAlfaiataria = pecasMes.reduce((s, p) => s + custoAviamentoComposicao(p.tipoPeca, custoAviamentosPorPecaBase), 0);
    const estruturaAlfaiataria = (parseFloat(aluguelAtelie) || 0) + (parseFloat(luzAtelie) || 0);

    const rateioCamisaria = custoCompartilhadoRateado({ prolabore, custosFixosPJ, planoSaudePJ, receitaLinha: receitaCamisaria, receitaOutraLinha: receitaAlfaiataria });
    const rateioAlfaiataria = custoCompartilhadoRateado({ prolabore, custosFixosPJ, planoSaudePJ, receitaLinha: receitaAlfaiataria, receitaOutraLinha: receitaCamisaria });

    const impostoCamisaria = impostoDaLinha(aliquotaImposto, receitaCamisaria);
    const impostoAlfaiataria = impostoDaLinha(aliquotaImposto, receitaAlfaiataria);

    // Pedidos/peças com tecido lançado mas sem valor/metro cadastrado — o
    // custo deles entra como R$0 sem avisar, então lista quem é (mesmo
    // aviso que já existe em Custos do Ateliê/Custos da Camisaria).
    const pedidosSemValorTecido = pedidosMes.filter((p) =>
      (p.tecidos || []).some((t) => metragemParaNumero(t.metragem) !== null && !parseFloat(t.valorMetro))
    );
    const pecasSemValorTecido = pecasMes.filter((p) =>
      (p.tecidos || []).some((t) => metragemParaNumero(t.metragem) !== null && !parseFloat(t.valorMetro))
    );

    return {
      pedidosSemValorTecido,
      pecasSemValorTecido,
      camisaria: {
        receita: receitaCamisaria,
        maoDeObra: maoDeObraCamisaria,
        tecido: tecidoCamisaria,
        aviamentos: aviamentosCamisaria,
        estrutura: estruturaCamisaria,
        rateio: rateioCamisaria,
        imposto: impostoCamisaria,
      },
      alfaiataria: {
        receita: receitaAlfaiataria,
        maoDeObra: maoDeObraAlfaiataria,
        tecido: tecidoAlfaiataria,
        aviamentos: aviamentosAlfaiataria,
        estrutura: estruturaAlfaiataria,
        rateio: rateioAlfaiataria,
        imposto: impostoAlfaiataria,
      },
    };
    // eslint-disable-next-line
  }, [carregandoConfig, pedidos, pecas, equipe, custoAviamentosPorPecaBase, mesSelecionado, aluguelLoja, luzLoja, aluguelAtelie, luzAtelie, prolabore, custosFixosPJ, planoSaudePJ, aliquotaImposto]);

  const geral = useMemo(() => {
    if (!dados) return null;
    const somar = (campo) => dados.camisaria[campo] + dados.alfaiataria[campo];
    return {
      receita: somar("receita"),
      maoDeObra: somar("maoDeObra"),
      tecido: somar("tecido"),
      aviamentos: somar("aviamentos"),
      estrutura: somar("estrutura"),
      rateio: somar("rateio"),
      imposto: somar("imposto"),
    };
  }, [dados]);

  const custoTotalGeral = geral ? geral.maoDeObra + geral.tecido + geral.aviamentos + geral.estrutura + geral.rateio + geral.imposto : 0;
  const resultadoGeral = geral ? geral.receita - custoTotalGeral : 0;
  const margemGeral = geral && geral.receita > 0 ? (resultadoGeral / geral.receita) * 100 : 0;
  const sePagandoGeral = resultadoGeral >= 0;

  // Quando o tecido informado manualmente está preenchido, ele SUBSTITUI o
  // tecido estimado (que provavelmente está zerado/incompleto naquele mês)
  // nesse número ajustado — só pra visualização, não mexe nos cards por
  // linha (Camisaria/Alfaiataria) nem em outro mês.
  const tecidoManualValor = parseFloat(tecidoManual) || 0;
  const custoTotalGeralAjustado = tecidoManualValor > 0 ? custoTotalGeral - (geral ? geral.tecido : 0) + tecidoManualValor : custoTotalGeral;
  const resultadoGeralAjustado = geral ? geral.receita - custoTotalGeralAjustado : 0;
  const margemGeralAjustada = geral && geral.receita > 0 ? (resultadoGeralAjustado / geral.receita) * 100 : 0;
  const sePagandoGeralAjustado = resultadoGeralAjustado >= 0;

  const tecidoReal = useMemo(() => tecidoRealDoMes(despesas, mesSelecionado), [despesas, mesSelecionado]);
  const tecidoEstimado = geral ? geral.tecido : 0;
  const diferencaTecido = tecidoReal - tecidoEstimado;
  const diferencaTecidoRelevante = tecidoEstimado > 0 && Math.abs(diferencaTecido) / tecidoEstimado > 0.15;
  const tecidoPorFornecedor = useMemo(() => tecidoPorFornecedorPagoNoMes(despesas, mesSelecionado), [despesas, mesSelecionado]);

  return (
    <div>
      <PageTitle eyebrow="Camisaria + Alfaiataria + Geral" title="DRE" />

      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => setMesSelecionado(mesAnteriorDe(mesSelecionado))}
          className="flex items-center gap-1"
          style={{ background: "#EDEAE0", color: INK, padding: "7px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600 }}
        >
          <ChevronLeft size={14} /> mês anterior
        </button>
        <div style={{ fontSize: 14, fontWeight: 700, minWidth: 160, textAlign: "center" }}>{nomeDoMes(mesSelecionado)}</div>
        <button
          onClick={() => setMesSelecionado(mesSeguinteDe(mesSelecionado))}
          disabled={ehMesAtual}
          className="flex items-center gap-1"
          style={{
            background: "#EDEAE0",
            color: ehMesAtual ? TEXT_MUTED : INK,
            padding: "7px 12px",
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 600,
            opacity: ehMesAtual ? 0.6 : 1,
          }}
        >
          mês seguinte <ChevronRight size={14} />
        </button>
        {!ehMesAtual && (
          <button onClick={() => setMesSelecionado(mesRealAtual)} style={{ color: BRASS, fontSize: 12, fontWeight: 600 }}>
            voltar pro mês atual
          </button>
        )}
      </div>

      {geral && (
        <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
          <StatCard label="Faturamento do mês" value={brl(geral.receita)} icon={TrendingUp} />
          <StatCard label="Custo total do mês" value={brl(custoTotalGeral)} icon={TrendingDown} />
          <StatCard label="Resultado do mês" value={brl(resultadoGeral)} icon={Wallet} accent={sePagandoGeral ? VERDE : VERMELHO} />
          <StatCard label="Margem do mês" value={`${margemGeral.toFixed(1)}%`} icon={sePagandoGeral ? TrendingUp : TrendingDown} accent={sePagandoGeral ? VERDE : VERMELHO} />
        </div>
      )}

      {geral && (
        <Card style={{ padding: 20 }} className="mb-6">
          <div className="flex items-center gap-1.5 mb-1">
            <Scale size={15} color={BRASS} />
            <div className="fx-serif" style={{ fontSize: 15, fontWeight: 600 }}>
              Tecido gasto — informado manualmente (opcional)
            </div>
          </div>
          <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 12 }}>
            Só use isso em meses fechados onde o "Tecido" ficou zerado/incompleto (pedido antigo sem metro/valor
            cadastrado) e você já sabe, pelo extrato do PJ, quanto gastou de verdade com fornecedor de tecido nesse
            mês. É só pra enxergar o lucro real de {nomeDoMes(mesSelecionado)} — não muda os cards de Camisaria/Alfaiataria
            acima, nem afeta outros meses.
          </div>
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <input
              type="number"
              step="0.01"
              placeholder="R$ gasto com tecido nesse mês"
              style={{ ...inputStyle, width: 220 }}
              value={tecidoManual}
              onChange={(e) => setTecidoManual(e.target.value)}
            />
            <button
              onClick={salvarTecidoManual}
              style={{ background: tecidoManualSalvo ? VERDE : INK, color: "#FFF", padding: "9px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600 }}
            >
              {tecidoManualSalvo ? "Salvo ✓" : "Salvar"}
            </button>
          </div>
          {tecidoManualValor > 0 && (
            <div
              className="flex items-center justify-between py-2 px-3 mt-2"
              style={{ background: sePagandoGeralAjustado ? "#EAF3EA" : "#F7EAE3", borderRadius: 6, fontSize: 13, fontWeight: 700 }}
            >
              <span>Lucro ajustado com esse tecido (Geral)</span>
              <span className="fx-mono" style={{ color: sePagandoGeralAjustado ? VERDE : VERMELHO }}>
                {brl(resultadoGeralAjustado)} ({margemGeralAjustada.toFixed(1)}%)
              </span>
            </div>
          )}
        </Card>
      )}

      <div className="flex items-start gap-2 mb-6 p-3" style={{ background: "#F3EEDF", borderRadius: 8, fontSize: 12, color: TEXT_MUTED }}>
        <Info size={16} style={{ flexShrink: 0, marginTop: 1 }} />
        <div>
          Custo de produção controlado (tecido pelo valor/metro cadastrado, aviamento pelo catálogo, mão de obra e
          estrutura) + impostos ({(parseFloat(aliquotaImposto) || 0).toFixed(1)}% sobre o faturamento de cada linha,
          alíquota configurada em Configurações) — despesas soltas do Contas a Pagar (fornecedor avulso, manutenção
          etc) não entram aqui, esse é o simulador de caixa à parte. {ehMesAtual ? (
            <>Mês corrente: número ao vivo, ainda incompleto até fechar.</>
          ) : (
            <>Mês fechado: pedidos/peças reais daquele mês, mas equipe/aluguel/luz/pró-labore usam o valor configurado hoje — não existe histórico desses valores mês a mês ainda.</>
          )}
        </div>
      </div>

      {dados && (dados.pedidosSemValorTecido.length > 0 || dados.pecasSemValorTecido.length > 0) && (
        <div className="flex items-start gap-2 mb-6 p-3" style={{ background: "#F7EAE3", borderRadius: 8, fontSize: 12, color: VERMELHO }}>
          <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            Sem valor/metro cadastrado (custo de tecido desses ficou de fora, contando como R$0):{" "}
            {[...dados.pedidosSemValorTecido, ...dados.pecasSemValorTecido].map((p) => p.cliente).join(", ")} — preencha em Compras.
          </div>
        </div>
      )}

      {dados && (
        <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
          <LinhaDRE titulo="Camisaria" Icone={Shirt} {...dados.camisaria} />
          <LinhaDRE titulo="Alfaiataria" Icone={Scissors} {...dados.alfaiataria} />
          <LinhaDRE titulo="Geral" Icone={Layers} {...geral} destaque />
        </div>
      )}

      {geral && (
        <Card style={{ padding: 20 }}>
          <div className="flex items-center gap-1.5 mb-1">
            <Scale size={15} color={BRASS} />
            <div className="fx-serif" style={{ fontSize: 15, fontWeight: 600 }}>
              Tecido: estimado x real pago
            </div>
          </div>
          <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 16 }}>
            O "Tecido" do DRE acima é estimativa (metro cadastrado × valor/metro). Aqui comparamos com o que foi
            realmente lançado no Contas a Pagar como "{CATEGORIA_TECIDO}" nesse mês — se a diferença for grande e
            recorrente, vale atualizar o R$/metro cadastrado em Compras.
          </div>
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
            <div>
              <div style={{ fontSize: 11, color: TEXT_MUTED }}>Estimado (DRE)</div>
              <div className="fx-mono" style={{ fontSize: 16, fontWeight: 700 }}>{brl(tecidoEstimado)}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: TEXT_MUTED }}>Real pago (Contas a Pagar)</div>
              <div className="fx-mono" style={{ fontSize: 16, fontWeight: 700 }}>{brl(tecidoReal)}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: TEXT_MUTED }}>Diferença</div>
              <div className="fx-mono" style={{ fontSize: 16, fontWeight: 700, color: diferencaTecidoRelevante ? VERMELHO : INK }}>
                {diferencaTecido >= 0 ? "+" : ""}
                {brl(diferencaTecido)}
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4" style={{ borderTop: `1px solid ${LINE}` }}>
            <div className="fx-serif mb-1" style={{ fontSize: 13, fontWeight: 600 }}>
              Por fornecedor — valor pago em {nomeDoMes(mesSelecionado)}
            </div>
            <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 12 }}>
              Pela data em que você registrou o pagamento (não o vencimento) — essa é a conta certa pra bater linha a
              linha com o extrato bancário do PJ.
            </div>
            {tecidoPorFornecedor.length === 0 ? (
              <div style={{ fontSize: 12, color: TEXT_MUTED }}>
                Nada pago em {CATEGORIA_TECIDO.toLowerCase()} com pagamento registrado nesse mês ainda — lance em
                Contas a Pagar (categoria "{CATEGORIA_TECIDO}", com o fornecedor e a data de pagamento certos).
              </div>
            ) : (
              tecidoPorFornecedor.map(([fornecedor, valor], i) => (
                <div
                  key={fornecedor}
                  className="flex items-center justify-between py-1.5"
                  style={{ borderBottom: i < tecidoPorFornecedor.length - 1 ? `1px solid ${LINE}` : "none", fontSize: 12 }}
                >
                  <span>{fornecedor}</span>
                  <span className="fx-mono" style={{ fontWeight: 600 }}>{brl(valor)}</span>
                </div>
              ))
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
