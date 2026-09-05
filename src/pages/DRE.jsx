import React, { useMemo } from "react";
import { ChevronLeft, ChevronRight, Info, Layers, Scissors, Shirt, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { Card, PageTitle, StatCard } from "../components/ui";
import { BRASS, INK, LINE, TEXT_MUTED } from "../lib/constants";
import { brl, custoAviamentoComposicao, custoTecidoDe, hojeISO } from "../lib/helpers";
import { custoEquipeMensal } from "../lib/custoEquipe";
import { custoCompartilhadoRateado, custoMaoDeObraFabianaEfetivo } from "../lib/custoFixoMensal";
import { useConfigCustosFixos } from "../hooks/useConfigCustosFixos";

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
function LinhaDRE({ titulo, Icone, receita, maoDeObra, tecido, aviamentos, estrutura, rateio, destaque }) {
  const custoTotal = maoDeObra + tecido + aviamentos + estrutura + rateio;
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
export default function DRE({ pedidos, pecas, equipe = [], custoAviamentosPorPecaBase = {} }) {
  const mesRealAtual = hojeISO().slice(0, 7);
  const [mesSelecionado, setMesSelecionado] = React.useState(mesRealAtual);
  const ehMesAtual = mesSelecionado === mesRealAtual;
  const custosFixos = useConfigCustosFixos();

  const {
    aluguelAtelie,
    luzAtelie,
    aluguelLoja,
    luzLoja,
    prolabore,
    custosFixosPJ,
    planoSaudePJ,
    loading: carregandoConfig,
  } = custosFixos;

  const dados = useMemo(() => {
    if (carregandoConfig) return null;
    const mesAnterior = mesAnteriorDe(mesSelecionado);

    // Custo de tecido/mão de obra usa TODO pedido/peça do mês (Doação
    // inclusa — consome material de verdade); receita e quantidade
    // vendida (pro cálculo do aviamento por unidade) excluem Doação.
    const pedidosMes = (pedidos || []).filter((p) => (p.dataPedido || "").slice(0, 7) === mesSelecionado);
    const pecasMes = (pecas || []).filter((p) => (p.dataPedido || "").slice(0, 7) === mesSelecionado);

    const receitaCamisaria = pedidosMes.filter((p) => p.status !== "Doação").reduce((s, p) => s + (parseFloat(p.aReceber?.valor) || 0), 0);
    const receitaAlfaiataria = pecasMes.filter((p) => p.status !== "Doação").reduce((s, p) => s + (parseFloat(p.valorVenda) || 0), 0);

    const maoDeObraCamisaria = custoMaoDeObraFabianaEfetivo(pedidos, mesSelecionado, mesAnterior);
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

    return {
      camisaria: {
        receita: receitaCamisaria,
        maoDeObra: maoDeObraCamisaria,
        tecido: tecidoCamisaria,
        aviamentos: aviamentosCamisaria,
        estrutura: estruturaCamisaria,
        rateio: rateioCamisaria,
      },
      alfaiataria: {
        receita: receitaAlfaiataria,
        maoDeObra: maoDeObraAlfaiataria,
        tecido: tecidoAlfaiataria,
        aviamentos: aviamentosAlfaiataria,
        estrutura: estruturaAlfaiataria,
        rateio: rateioAlfaiataria,
      },
    };
    // eslint-disable-next-line
  }, [carregandoConfig, pedidos, pecas, equipe, custoAviamentosPorPecaBase, mesSelecionado, aluguelLoja, luzLoja, aluguelAtelie, luzAtelie, prolabore, custosFixosPJ, planoSaudePJ]);

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
    };
  }, [dados]);

  const custoTotalGeral = geral ? geral.maoDeObra + geral.tecido + geral.aviamentos + geral.estrutura + geral.rateio : 0;
  const resultadoGeral = geral ? geral.receita - custoTotalGeral : 0;
  const margemGeral = geral && geral.receita > 0 ? (resultadoGeral / geral.receita) * 100 : 0;
  const sePagandoGeral = resultadoGeral >= 0;

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

      <div className="flex items-start gap-2 mb-6 p-3" style={{ background: "#F3EEDF", borderRadius: 8, fontSize: 12, color: TEXT_MUTED }}>
        <Info size={16} style={{ flexShrink: 0, marginTop: 1 }} />
        <div>
          Custo de produção controlado (tecido pelo valor/metro cadastrado, aviamento pelo catálogo, mão de obra e
          estrutura) — despesas soltas do Contas a Pagar (fornecedor avulso, manutenção etc) não entram aqui, esse é
          o simulador de caixa à parte. {ehMesAtual ? (
            <>Mês corrente: número ao vivo, ainda incompleto até fechar.</>
          ) : (
            <>Mês fechado: pedidos/peças reais daquele mês, mas equipe/aluguel/luz/pró-labore usam o valor configurado hoje — não existe histórico desses valores mês a mês ainda.</>
          )}
        </div>
      </div>

      {dados && (
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
          <LinhaDRE titulo="Camisaria" Icone={Shirt} {...dados.camisaria} />
          <LinhaDRE titulo="Alfaiataria" Icone={Scissors} {...dados.alfaiataria} />
          <LinhaDRE titulo="Geral" Icone={Layers} {...geral} destaque />
        </div>
      )}
    </div>
  );
}
