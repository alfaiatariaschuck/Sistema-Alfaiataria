import React, { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Layers, Scissors, Shirt, Target, TrendingUp } from "lucide-react";
import { Card, Empty, PageTitle, StatCard } from "../components/ui";
import MetaPorMes from "../components/MetaPorMes";
import QuantidadePorMes from "../components/QuantidadePorMes";
import { BRASS, INK, LINE, TEXT_MUTED, inputStyle } from "../lib/constants";
import { brl, hojeISO } from "../lib/helpers";
import { useConfigCustosFixos } from "../hooks/useConfigCustosFixos";
import {
  custoAtelieDoMes,
  custoCamisariaDoMes,
  custoCompartilhadoRateado,
  custoMaoDeObraFabianaEfetivo,
  metaComMargem,
} from "../lib/custoFixoMensal";
import { supabase } from "../supabaseClient";

const CHAVE_META_CAMISARIA = "meta_vendas_camisaria";
const CHAVE_META_ALFAIATARIA = "meta_vendas_alfaiataria";
const CHAVE_MARGEM_DESEJADA = "margem_desejada_meta";
const MARGEM_DESEJADA_PADRAO = 30;
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

// Doação fica de fora — é peça dada, não venda, então não conta pra meta
// nem pra projeção de faturamento.
function vendidoNoMes(pedidos, pecas, mes) {
  const camisaria = pedidos
    .filter((p) => p.status !== "Doação" && (p.dataPedido || "").slice(0, 7) === mes)
    .reduce((s, p) => s + (parseFloat(p.aReceber.valor) || 0), 0);
  const alfaiataria = (pecas || [])
    .filter((p) => p.status !== "Doação" && (p.dataPedido || "").slice(0, 7) === mes)
    .reduce((s, p) => s + (parseFloat(p.valorVenda) || 0), 0);
  return { camisaria, alfaiataria, total: camisaria + alfaiataria };
}

// Agrupa o vendido do mês por tipo de peça — camisa é sempre "Camisa"
// (1 pedido pode ter várias unidades), alfaiataria usa o tipoPeca de cada peça.
function gradePorTipo(pedidos, pecas, mes) {
  const mapa = new Map();
  pedidos
    .filter((p) => p.status !== "Doação" && (p.dataPedido || "").slice(0, 7) === mes)
    .forEach((p) => {
      const atual = mapa.get("Camisa") || { quantidade: 0, valor: 0 };
      atual.quantidade += parseFloat(p.quantidade) || 0;
      atual.valor += parseFloat(p.aReceber.valor) || 0;
      mapa.set("Camisa", atual);
    });
  (pecas || [])
    .filter((p) => p.status !== "Doação" && (p.dataPedido || "").slice(0, 7) === mes)
    .forEach((p) => {
      const chave = p.tipoPeca || "Outro";
      const atual = mapa.get(chave) || { quantidade: 0, valor: 0 };
      atual.quantidade += 1;
      atual.valor += parseFloat(p.valorVenda) || 0;
      mapa.set(chave, atual);
    });
  return [...mapa.entries()].sort((a, b) => b[1].valor - a[1].valor);
}

// Bloco de meta de uma linha — vendido/meta, falta, quanto precisa
// vender por dia no que resta do mês, e a barra de progresso. Usado duas
// vezes (Camisaria, Alfaiataria), sempre nessa ordem.
function BlocoMetaLinha({ titulo, Icone, vendido, meta, calculada, diasRestantes }) {
  if (!(meta > 0)) {
    return (
      <div className="mb-4" style={{ fontSize: 12, color: TEXT_MUTED }}>
        <span className="flex items-center gap-1.5" style={{ fontWeight: 600, color: INK }}>
          <Icone size={14} color={BRASS} /> {titulo}
        </span>
        Sem custo suficiente ainda pra calcular uma meta esse mês.
      </div>
    );
  }
  const percentual = Math.min(100, (vendido / meta) * 100);
  const falta = Math.max(0, meta - vendido);
  const porDia = falta > 0 ? falta / diasRestantes : 0;
  return (
    <div className="mb-5">
      <div className="flex justify-between items-center mb-1 flex-wrap gap-1" style={{ fontSize: 13 }}>
        <span className="flex items-center gap-1.5" style={{ fontWeight: 600 }}>
          <Icone size={14} color={BRASS} /> {titulo}
          <span style={{ fontSize: 10, fontWeight: 600, color: TEXT_MUTED }}>{calculada ? "(calculada)" : "(definida em Configurações)"}</span>
        </span>
        <span className="fx-mono" style={{ fontWeight: 700, color: BRASS }}>
          {brl(vendido)} / {brl(meta)} ({Math.round(percentual)}%)
        </span>
      </div>
      <div style={{ background: LINE, borderRadius: 4, height: 8, marginBottom: 4 }}>
        <div style={{ width: `${percentual}%`, background: percentual >= 100 ? "#2C6E31" : BRASS, height: 8, borderRadius: 4 }} />
      </div>
      <div style={{ fontSize: 11, color: TEXT_MUTED }}>
        {falta > 0 ? (
          <>
            faltam <strong style={{ color: "#9C4A1E" }}>{brl(falta)}</strong> — {brl(porDia)}/dia nos {diasRestantes} dia(s) que restam
          </>
        ) : (
          "meta batida esse mês! 🎉"
        )}
      </div>
    </div>
  );
}

export default function Metas({ pedidos, pecas, equipe = [], custoAviamentosPorPecaBase = {} }) {
  const [metaCamisaria, setMetaCamisaria] = useState(null);
  const [metaAlfaiataria, setMetaAlfaiataria] = useState(null);
  const [margemDesejada, setMargemDesejada] = useState(MARGEM_DESEJADA_PADRAO);
  const [margemSalva, setMargemSalva] = useState(null);
  const mesRealAtual = hojeISO().slice(0, 7);
  const [mesSelecionado, setMesSelecionado] = useState(mesRealAtual);
  const custosFixos = useConfigCustosFixos();

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("config")
        .select("chave, valor")
        .in("chave", [CHAVE_META_CAMISARIA, CHAVE_META_ALFAIATARIA, CHAVE_MARGEM_DESEJADA]);
      (data || []).forEach((row) => {
        if (row.chave === CHAVE_META_CAMISARIA && row.valor) setMetaCamisaria(parseFloat(row.valor) || null);
        if (row.chave === CHAVE_META_ALFAIATARIA && row.valor) setMetaAlfaiataria(parseFloat(row.valor) || null);
        if (row.chave === CHAVE_MARGEM_DESEJADA && row.valor) setMargemDesejada(parseFloat(row.valor) || MARGEM_DESEJADA_PADRAO);
      });
    })();
  }, []);

  async function salvarMargemDesejada() {
    setMargemSalva(null);
    const { error } = await supabase.from("config").upsert({ chave: CHAVE_MARGEM_DESEJADA, valor: margemDesejada });
    setMargemSalva(!error);
    setTimeout(() => setMargemSalva(null), 2500);
  }

  const ehMesAtual = mesSelecionado === mesRealAtual;
  const mesAnterior = mesAnteriorDe(mesSelecionado);
  const vendidoAtual = vendidoNoMes(pedidos, pecas, mesSelecionado);
  const vendidoAnterior = vendidoNoMes(pedidos, pecas, mesAnterior);
  const grade = gradePorTipo(pedidos, pecas, mesSelecionado);

  // Meta calculada a partir do custo real do mês (equipe/Fabiana,
  // estrutura, tecido/aviamentos, fatia do compartilhado) ÷ margem
  // desejada — a mesma conta da Calculadora de preço mínimo, só que pro
  // faturamento do mês inteiro em vez de uma peça. Só faz sentido pro mês
  // corrente (mês passado já fechou). Uma meta manual (Configurações),
  // se estiver preenchida, continua tendo prioridade sobre a calculada.
  const metaCalculada = useMemo(() => {
    if (!ehMesAtual || custosFixos.loading) return { camisaria: 0, alfaiataria: 0 };
    const pedidosMes = (pedidos || []).filter((p) => (p.dataPedido || "").slice(0, 7) === mesRealAtual);
    const pecasMes = (pecas || []).filter((p) => (p.dataPedido || "").slice(0, 7) === mesRealAtual);
    const mesAnteriorReal = mesAnteriorDe(mesRealAtual);
    const maoDeObraFabiana = custoMaoDeObraFabianaEfetivo(pedidos, mesRealAtual, mesAnteriorReal);
    const custoCamisaria = custoCamisariaDoMes({
      pedidosDoMes: pedidosMes,
      custoMaoDeObraFabiana: maoDeObraFabiana,
      custoAviamentosPorPecaBase,
      aluguel: custosFixos.aluguelLoja,
      luz: custosFixos.luzLoja,
    });
    const custoAtelie = custoAtelieDoMes({
      equipe,
      pecasDoMes: pecasMes,
      custoAviamentosPorPecaBase,
      aluguel: custosFixos.aluguelAtelie,
      luz: custosFixos.luzAtelie,
    });
    const rateioCamisaria = custoCompartilhadoRateado({
      prolabore: custosFixos.prolabore,
      custosFixosPJ: custosFixos.custosFixosPJ,
      planoSaudePJ: custosFixos.planoSaudePJ,
      receitaLinha: vendidoAtual.camisaria,
      receitaOutraLinha: vendidoAtual.alfaiataria,
    });
    const rateioAlfaiataria = custoCompartilhadoRateado({
      prolabore: custosFixos.prolabore,
      custosFixosPJ: custosFixos.custosFixosPJ,
      planoSaudePJ: custosFixos.planoSaudePJ,
      receitaLinha: vendidoAtual.alfaiataria,
      receitaOutraLinha: vendidoAtual.camisaria,
    });
    return {
      camisaria: metaComMargem(custoCamisaria + rateioCamisaria, margemDesejada),
      alfaiataria: metaComMargem(custoAtelie + rateioAlfaiataria, margemDesejada),
    };
    // eslint-disable-next-line
  }, [ehMesAtual, custosFixos.loading, pedidos, pecas, equipe, custoAviamentosPorPecaBase, margemDesejada, vendidoAtual.camisaria, vendidoAtual.alfaiataria]);

  const metaCamisariaFinal = metaCamisaria > 0 ? metaCamisaria : metaCalculada.camisaria;
  const metaAlfaiatariaFinal = metaAlfaiataria > 0 ? metaAlfaiataria : metaCalculada.alfaiataria;
  const metaTotal = (metaCamisariaFinal || 0) + (metaAlfaiatariaFinal || 0) || null;

  // Projeção simples: pega o ritmo diário até agora e estica pro mês inteiro
  // — só faz sentido pro mês corrente (mês passado já fechou).
  const hoje = new Date();
  const diaAtual = hoje.getDate();
  const diasNoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
  const diasRestantes = Math.max(1, diasNoMes - diaAtual + 1);
  const ritmoDiario = diaAtual > 0 ? vendidoAtual.total / diaAtual : 0;
  const projecaoFimDoMes = ritmoDiario * diasNoMes;

  const variacao = vendidoAnterior.total > 0 ? ((vendidoAtual.total - vendidoAnterior.total) / vendidoAnterior.total) * 100 : null;

  return (
    <div>
      <PageTitle eyebrow="Camisaria + Alfaiataria" title="Metas" />

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

      <div className="grid gap-4 mb-8" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>
        <StatCard label={`Vendido em ${nomeDoMes(mesSelecionado)}`} value={brl(vendidoAtual.total)} icon={Target} />
        <StatCard label={`Vendido em ${nomeDoMes(mesAnterior)}`} value={brl(vendidoAnterior.total)} icon={Layers} />
        <StatCard
          label="Variação vs mês anterior"
          value={variacao !== null ? `${variacao >= 0 ? "+" : ""}${variacao.toFixed(0)}%` : "—"}
          icon={TrendingUp}
          accent={variacao !== null ? (variacao < 0 ? VERMELHO : VERDE) : undefined}
        />
        {ehMesAtual && <StatCard label="Projeção pro fim do mês" value={brl(projecaoFimDoMes)} icon={TrendingUp} />}
      </div>

      {ehMesAtual && (
        <Card style={{ padding: 20 }} className="mb-6">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
            <div className="fx-serif" style={{ fontSize: 16, fontWeight: 600 }}>
              Quanto falta vender esse mês
            </div>
            <div className="flex items-center gap-2">
              <span style={{ fontSize: 11, color: TEXT_MUTED }}>Margem desejada</span>
              <input
                type="number"
                min="0"
                max="95"
                step="1"
                style={{ ...inputStyle, width: 70, padding: "5px 8px", fontSize: 12 }}
                value={margemDesejada}
                onChange={(e) => setMargemDesejada(e.target.value)}
              />
              <span style={{ fontSize: 12, color: TEXT_MUTED }}>%</span>
              <button
                onClick={salvarMargemDesejada}
                style={{ background: margemSalva ? VERDE : INK, color: "#FFF", padding: "5px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600 }}
              >
                {margemSalva ? "Salvo ✓" : "Salvar"}
              </button>
            </div>
          </div>
          <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 16 }}>
            Meta = custo real do mês de cada linha (mão de obra, estrutura, tecido/aviamentos e a fatia rateada do
            compartilhado) ÷ margem desejada acima — a mesma conta da Calculadora de preço mínimo, aplicada ao
            faturamento do mês inteiro. Uma meta definida manualmente em Configurações continua tendo prioridade
            sobre essa calculada.
          </div>
          <BlocoMetaLinha
            titulo="Camisaria"
            Icone={Shirt}
            vendido={vendidoAtual.camisaria}
            meta={metaCamisariaFinal}
            calculada={!(metaCamisaria > 0)}
            diasRestantes={diasRestantes}
          />
          <BlocoMetaLinha
            titulo="Alfaiataria"
            Icone={Scissors}
            vendido={vendidoAtual.alfaiataria}
            meta={metaAlfaiatariaFinal}
            calculada={!(metaAlfaiataria > 0)}
            diasRestantes={diasRestantes}
          />
          {metaTotal > 0 && (
            <div className="mt-1 pt-3" style={{ borderTop: `1px solid ${LINE}`, fontSize: 11, color: TEXT_MUTED }}>
              Total: {brl(vendidoAtual.total)} de {brl(metaTotal)} ({Math.round((vendidoAtual.total / metaTotal) * 100)}%) —{" "}
              {vendidoAtual.total >= metaTotal ? "meta batida! 🎉" : `faltam ${brl(metaTotal - vendidoAtual.total)}`}
            </div>
          )}
        </Card>
      )}

      <MetaPorMes pedidos={pedidos} pecas={pecas} metaTotal={metaTotal} />
      <QuantidadePorMes pedidos={pedidos} pecas={pecas} />

      <Card style={{ padding: 20 }}>
        <div className="fx-serif mb-3" style={{ fontSize: 16, fontWeight: 600 }}>
          Vendido por tipo de peça — {nomeDoMes(mesSelecionado)}
        </div>
        {grade.length === 0 && <Empty texto="Nada vendido neste mês ainda." />}
        {grade.map(([tipo, dados]) => (
          <div key={tipo} className="flex items-center justify-between py-2" style={{ borderBottom: `1px solid ${LINE}` }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{tipo}</div>
            <div className="flex items-center gap-4">
              <span className="fx-mono" style={{ fontSize: 12, color: TEXT_MUTED }}>
                {dados.quantidade} un
              </span>
              <span className="fx-mono" style={{ fontSize: 13, fontWeight: 600 }}>
                {brl(dados.valor)}
              </span>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
