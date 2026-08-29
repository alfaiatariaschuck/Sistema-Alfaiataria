import React, { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Layers, Scissors, Shirt, Target, TrendingUp } from "lucide-react";
import { Card, Empty, PageTitle, StatCard } from "../components/ui";
import MetaPorMes from "../components/MetaPorMes";
import QuantidadePorMes from "../components/QuantidadePorMes";
import { BRASS, INK, LINE, TEXT_MUTED } from "../lib/constants";
import { brl, hojeISO } from "../lib/helpers";
import { supabase } from "../supabaseClient";

const CHAVE_META_CAMISARIA = "meta_vendas_camisaria";
const CHAVE_META_ALFAIATARIA = "meta_vendas_alfaiataria";
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

export default function Metas({ pedidos, pecas }) {
  const [metaCamisaria, setMetaCamisaria] = useState(null);
  const [metaAlfaiataria, setMetaAlfaiataria] = useState(null);
  const mesRealAtual = hojeISO().slice(0, 7);
  const [mesSelecionado, setMesSelecionado] = useState(mesRealAtual);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("config").select("chave, valor").in("chave", [CHAVE_META_CAMISARIA, CHAVE_META_ALFAIATARIA]);
      (data || []).forEach((row) => {
        if (row.chave === CHAVE_META_CAMISARIA && row.valor) setMetaCamisaria(parseFloat(row.valor) || null);
        if (row.chave === CHAVE_META_ALFAIATARIA && row.valor) setMetaAlfaiataria(parseFloat(row.valor) || null);
      });
    })();
  }, []);

  const ehMesAtual = mesSelecionado === mesRealAtual;
  const mesAnterior = mesAnteriorDe(mesSelecionado);
  const vendidoAtual = vendidoNoMes(pedidos, pecas, mesSelecionado);
  const vendidoAnterior = vendidoNoMes(pedidos, pecas, mesAnterior);
  const grade = gradePorTipo(pedidos, pecas, mesSelecionado);
  const metaTotal = (metaCamisaria || 0) + (metaAlfaiataria || 0) || null;

  // Projeção simples: pega o ritmo diário até agora e estica pro mês inteiro
  // — só faz sentido pro mês corrente (mês passado já fechou).
  const hoje = new Date();
  const diaAtual = hoje.getDate();
  const diasNoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
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

      {ehMesAtual && (metaCamisaria > 0 || metaAlfaiataria > 0) && (
        <Card style={{ padding: 20 }} className="mb-6">
          <div className="fx-serif mb-3" style={{ fontSize: 16, fontWeight: 600 }}>
            Meta do mês
          </div>
          {metaCamisaria > 0 && (
            <div className="mb-4">
              <div className="flex justify-between mb-1" style={{ fontSize: 13 }}>
                <span className="flex items-center gap-1.5" style={{ fontWeight: 600 }}>
                  <Shirt size={14} color={BRASS} /> Camisaria
                </span>
                <span className="fx-mono" style={{ fontWeight: 700, color: BRASS }}>
                  {brl(vendidoAtual.camisaria)} / {brl(metaCamisaria)} ({Math.round((vendidoAtual.camisaria / metaCamisaria) * 100)}%)
                </span>
              </div>
              <div style={{ background: LINE, borderRadius: 4, height: 8 }}>
                <div
                  style={{ width: `${Math.min(100, (vendidoAtual.camisaria / metaCamisaria) * 100)}%`, background: BRASS, height: 8, borderRadius: 4 }}
                />
              </div>
            </div>
          )}
          {metaAlfaiataria > 0 && (
            <div>
              <div className="flex justify-between mb-1" style={{ fontSize: 13 }}>
                <span className="flex items-center gap-1.5" style={{ fontWeight: 600 }}>
                  <Scissors size={14} color={BRASS} /> Alfaiataria
                </span>
                <span className="fx-mono" style={{ fontWeight: 700, color: BRASS }}>
                  {brl(vendidoAtual.alfaiataria)} / {brl(metaAlfaiataria)} ({Math.round((vendidoAtual.alfaiataria / metaAlfaiataria) * 100)}%)
                </span>
              </div>
              <div style={{ background: LINE, borderRadius: 4, height: 8 }}>
                <div
                  style={{ width: `${Math.min(100, (vendidoAtual.alfaiataria / metaAlfaiataria) * 100)}%`, background: BRASS, height: 8, borderRadius: 4 }}
                />
              </div>
            </div>
          )}
          {metaTotal > 0 && (
            <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${LINE}`, fontSize: 11, color: TEXT_MUTED }}>
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
