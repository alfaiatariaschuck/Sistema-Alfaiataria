import React, { useState } from "react";
import { ChevronLeft, ChevronRight, ClipboardList, Repeat, ShoppingBag, TrendingUp, UserPlus } from "lucide-react";
import { Card, Empty, PageTitle, Pill, StatCard } from "../components/ui";
import { BRASS, INK, LINE, STATUS_STYLE, TEXT_MUTED } from "../lib/constants";
import { brl, fmtData } from "../lib/helpers";
import { custoCamisa } from "../lib/vendasMensais";
import { useConfigPrecoCamisa } from "../hooks/useConfigPrecoCamisa";
import { useVendedores } from "../hooks/useVendedores";

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const NOME_DONO = "Tales";
const VERMELHO = "#9C4A1E";
const VERDE = "#2C6E31";

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

// Métricas de um conjunto de pedidos (já filtrado por pessoa e mês) —
// inclui custo/margem de cada pedido (mesma conta de Pedidos Vendidos).
function estatisticasDe(lista, custoAviamentosPorPecaBase, maoDeObraPadrao) {
  const vendidos = lista.filter((p) => p.status !== "Doação");
  const camisas = vendidos.reduce((s, p) => s + (parseFloat(p.quantidade) || 0), 0);
  const valor = vendidos.reduce((s, p) => s + (parseFloat(p.aReceber?.valor) || 0), 0);
  const custo = vendidos.reduce((s, p) => s + custoCamisa(p, custoAviamentosPorPecaBase, maoDeObraPadrao).custo, 0);
  const margem = valor - custo;
  return {
    fechados: vendidos.length,
    camisas,
    valor,
    ticketMedio: vendidos.length > 0 ? valor / vendidos.length : 0,
    novos: vendidos.filter((p) => !p.recompra).length,
    recompra: vendidos.filter((p) => p.recompra).length,
    custo,
    margem,
    margemPercentual: valor > 0 ? (margem / valor) * 100 : null,
  };
}

// Painel do dono pra comparar quem lançou cada pedido de camisa — Tales
// x Deivid, mês a mês, com faturamento e MARGEM (a Fabi conta e o resto
// de dado sensível continuam só aqui, nunca aparecem pro vendedor).
// Separa por "criado_por" (quem de fato criou a linha pelo próprio
// login), não pelo campo de texto "Vendedor" da ficha (esse é livre,
// pode ser preenchido em qualquer pedido pra dar crédito de comissão, não
// serve pra saber quem lançou de verdade). Os pedidos são os MESMOS da
// aba Pedidos — nada é duplicado, essa aba é só um filtro/comparativo
// sobre a mesma tabela.
export default function VendedorGestao({ pedidos, irParaPedido, custoAviamentosPorPecaBase = {} }) {
  const hojeStr = new Date().toISOString().slice(0, 10);
  const mesRealAtual = hojeStr.slice(0, 7);
  const [mesSelecionado, setMesSelecionado] = useState(mesRealAtual);
  const [pessoaFiltro, setPessoaFiltro] = useState("ambos");
  const { vendedores, loading: carregandoVendedores } = useVendedores();
  const { maoDeObraPadrao } = useConfigPrecoCamisa();
  const idsVendedores = new Set(vendedores.map((v) => v.id));

  const pessoas = [{ id: "dono", nome: NOME_DONO }, ...vendedores.map((v) => ({ id: v.id, nome: v.nome }))];

  function pedidosDaPessoa(pessoaId, lista) {
    if (pessoaId === "dono") return lista.filter((p) => !p.criadoPor || !idsVendedores.has(p.criadoPor));
    return lista.filter((p) => p.criadoPor === pessoaId);
  }

  function nomeDoCriador(p) {
    if (p.criadoPor && idsVendedores.has(p.criadoPor)) return vendedores.find((v) => v.id === p.criadoPor)?.nome || p.vendedor || "—";
    return NOME_DONO;
  }

  const doMesTodos = (pedidos || []).filter((p) => (p.dataPedido || "").slice(0, 7) === mesSelecionado);

  const listaOrdenada =
    pessoaFiltro === "ambos"
      ? [...doMesTodos].sort((a, b) => (b.dataPedido || "").localeCompare(a.dataPedido || ""))
      : [...pedidosDaPessoa(pessoaFiltro, doMesTodos)].sort((a, b) => (b.dataPedido || "").localeCompare(a.dataPedido || ""));

  return (
    <div>
      <PageTitle eyebrow="Comparativo por pessoa" title="Vendedor" />

      {!carregandoVendedores && vendedores.length === 0 && (
        <div className="mb-6 p-3" style={{ background: "#F6E3D9", color: "#9C4A1E", borderRadius: 8, fontSize: 12 }}>
          Não achei nenhum login com papel "vendedor" — confere se rodou o SQL schema_v58 (precisa pra essa aba
          conseguir ler quem é vendedor) e se o Deivid já tem perfil cadastrado.
        </div>
      )}

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
          disabled={mesSelecionado === mesRealAtual}
          className="flex items-center gap-1"
          style={{
            background: "#EDEAE0",
            color: mesSelecionado === mesRealAtual ? TEXT_MUTED : INK,
            padding: "7px 12px",
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 600,
            opacity: mesSelecionado === mesRealAtual ? 0.6 : 1,
          }}
        >
          mês seguinte <ChevronRight size={14} />
        </button>
        {mesSelecionado !== mesRealAtual && (
          <button onClick={() => setMesSelecionado(mesRealAtual)} style={{ color: BRASS, fontSize: 12, fontWeight: 600 }}>
            voltar pro mês atual
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <span style={{ fontSize: 12, color: TEXT_MUTED }}>Filtrar:</span>
        <button
          onClick={() => setPessoaFiltro("ambos")}
          style={{
            padding: "6px 14px",
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 600,
            background: pessoaFiltro === "ambos" ? INK : "#EDEAE0",
            color: pessoaFiltro === "ambos" ? "#FFF" : INK,
          }}
        >
          Ambos (comparar)
        </button>
        {pessoas.map((pessoa) => (
          <button
            key={pessoa.id}
            onClick={() => setPessoaFiltro(pessoa.id)}
            style={{
              padding: "6px 14px",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              background: pessoaFiltro === pessoa.id ? INK : "#EDEAE0",
              color: pessoaFiltro === pessoa.id ? "#FFF" : INK,
            }}
          >
            {pessoa.nome}
          </button>
        ))}
      </div>

      {pessoaFiltro === "ambos" ? (
        <Card style={{ padding: 0, overflow: "hidden" }} className="mb-6">
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 480 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${LINE}` }}>
                  <th style={{ textAlign: "left", padding: "10px 14px", fontWeight: 600, fontSize: 11, color: TEXT_MUTED, textTransform: "uppercase" }}>
                    {nomeDoMes(mesSelecionado)}
                  </th>
                  {pessoas.map((pessoa) => (
                    <th key={pessoa.id} style={{ textAlign: "right", padding: "10px 14px", fontWeight: 700, fontSize: 13, color: INK }}>
                      {pessoa.nome}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "Pedidos fechados", campo: "fechados", fmt: (v) => String(v) },
                  { label: "Camisas vendidas", campo: "camisas", fmt: (v) => String(v) },
                  { label: "Valor vendido", campo: "valor", fmt: brl },
                  { label: "Ticket médio", campo: "ticketMedio", fmt: brl },
                  { label: "Clientes novos", campo: "novos", fmt: (v) => String(v) },
                  { label: "Recompra", campo: "recompra", fmt: (v) => String(v) },
                  { label: "Custo estimado", campo: "custo", fmt: brl },
                  { label: "Margem (R$)", campo: "margem", fmt: brl, destaque: true },
                  { label: "Margem (%)", campo: "margemPercentual", fmt: (v) => (v == null ? "—" : `${v.toFixed(0)}%`), destaque: true },
                ].map((linha, i, arr) => (
                  <tr key={linha.campo} style={{ borderBottom: i < arr.length - 1 ? `1px solid ${LINE}` : "none" }}>
                    <td style={{ padding: "8px 14px", color: TEXT_MUTED }}>{linha.label}</td>
                    {pessoas.map((pessoa) => {
                      const stats = estatisticasDe(pedidosDaPessoa(pessoa.id, doMesTodos), custoAviamentosPorPecaBase, maoDeObraPadrao);
                      const valorCampo = stats[linha.campo];
                      return (
                        <td
                          key={pessoa.id}
                          className="fx-mono"
                          style={{
                            padding: "8px 14px",
                            textAlign: "right",
                            fontWeight: 600,
                            color: linha.destaque ? (valorCampo >= 0 ? VERDE : VERMELHO) : undefined,
                          }}
                        >
                          {linha.fmt(valorCampo)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ fontSize: 10, color: TEXT_MUTED, padding: "8px 14px" }}>
            Custo/margem estimados igual em Pedidos Vendidos (tecido real do pedido + aviamento + mão de obra da Fabi,
            real quando já preenchida, senão a padrão).
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
          {(() => {
            const stats = estatisticasDe(listaOrdenada, custoAviamentosPorPecaBase, maoDeObraPadrao);
            return (
              <>
                <StatCard label="Pedidos fechados" value={String(stats.fechados)} icon={ClipboardList} />
                <StatCard label="Camisas vendidas" value={String(stats.camisas)} icon={ShoppingBag} />
                <StatCard label="Valor vendido" value={brl(stats.valor)} icon={TrendingUp} />
                <StatCard label="Ticket médio" value={brl(stats.ticketMedio)} icon={TrendingUp} />
                <StatCard label="Clientes novos" value={String(stats.novos)} icon={UserPlus} />
                <StatCard label="Recompra" value={String(stats.recompra)} icon={Repeat} />
                <StatCard
                  label="Margem"
                  value={`${brl(stats.margem)}${stats.margemPercentual != null ? ` (${stats.margemPercentual.toFixed(0)}%)` : ""}`}
                  icon={TrendingUp}
                  accent={stats.margem >= 0 ? VERDE : VERMELHO}
                />
              </>
            );
          })()}
        </div>
      )}

      <Card style={{ padding: 0, overflow: "hidden" }}>
        {listaOrdenada.length === 0 && (
          <div className="p-6">
            <Empty texto="Nenhum pedido nesse filtro/mês." />
          </div>
        )}
        {listaOrdenada.map((p, i) => {
          const { custo } = custoCamisa(p, custoAviamentosPorPecaBase, maoDeObraPadrao);
          const valor = parseFloat(p.aReceber?.valor) || 0;
          const margem = valor - custo;
          return (
            <button
              key={p.id}
              onClick={() => irParaPedido(p.id)}
              className="w-full flex items-center justify-between px-5 py-3 text-left"
              style={{ borderBottom: i < listaOrdenada.length - 1 ? `1px solid ${LINE}` : "none" }}
            >
              <div>
                <div className="flex items-center gap-1.5" style={{ fontWeight: 600, fontSize: 14 }}>
                  {p.cliente || "Sem nome"}
                  {p.recompra && <Pill text="↻ Recompra" style={{ bg: "#EFE6D6", fg: BRASS }} />}
                </div>
                <div style={{ fontSize: 12, color: TEXT_MUTED }}>
                  {nomeDoCriador(p)} · {fmtData(p.dataPedido)} · {p.quantidade} un
                  {p.status !== "Doação" && <> · margem {brl(margem)}</>}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="fx-mono" style={{ fontSize: 13, fontWeight: 600 }}>
                  {brl(valor)}
                </span>
                <Pill text={p.status} style={STATUS_STYLE[p.status]} />
                <ChevronRight size={16} color={TEXT_MUTED} />
              </div>
            </button>
          );
        })}
      </Card>
    </div>
  );
}
