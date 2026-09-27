import React, { useEffect, useMemo, useState } from "react";
import { forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation } from "d3-force";
import { Card, Empty, PageTitle } from "../components/ui";
import { TEXT_MUTED } from "../lib/constants";
import { brl } from "../lib/helpers";
import { construirGrafoFinanceiro } from "../lib/mapaRelacoes";

const LARGURA = 900;
const ALTURA = 560;

const COR_POR_TIPO = {
  root: "#E8B96A",
  categoria: "#6FA8DC",
  fornecedor: "#A78BDA",
};

const LABEL_POR_TIPO = {
  root: "Ateliê",
  categoria: "Categoria de despesa",
  fornecedor: "Fornecedor",
};

function raioDoNode(node, maxValor) {
  if (node.tipo === "root") return 32;
  const [min, max] = node.tipo === "categoria" ? [16, 40] : [7, 28];
  const proporcao = maxValor > 0 ? Math.sqrt(node.valor / maxValor) : 0;
  return min + (max - min) * proporcao;
}

// Roda a simulação de física (d3-force) até estabilizar e devolve só
// as posições finais — sem loop de animação contínuo, é um layout
// estático (mais leve, e o gráfico não fica "tremendo" a cada render).
function calcularLayout(nodesBase, linksBase) {
  const nodes = nodesBase.map((n) => ({ ...n }));
  const links = linksBase.map((l) => ({ ...l }));
  const maxValor = Math.max(...nodes.filter((n) => n.tipo !== "root").map((n) => n.valor), 1);

  const sim = forceSimulation(nodes)
    .force(
      "link",
      forceLink(links)
        .id((n) => n.id)
        .distance((l) => (l.source.tipo === "root" || l.target.tipo === "root" ? 150 : 95))
        .strength(0.6)
    )
    .force("charge", forceManyBody().strength(-240))
    .force("center", forceCenter(LARGURA / 2, ALTURA / 2))
    .force(
      "collide",
      forceCollide((n) => raioDoNode(n, maxValor) + 16)
    )
    .stop();

  for (let i = 0; i < 320; i++) sim.tick();

  // A física por si só não respeita as bordas do desenho — sem isso, um
  // nó periférico pode acabar posicionado meio cortado fora do SVG.
  const MARGEM_LABEL = 26;
  nodes.forEach((n) => {
    const r = raioDoNode(n, maxValor);
    n.x = Math.min(LARGURA - r - 8, Math.max(r + 8, n.x));
    n.y = Math.min(ALTURA - r - MARGEM_LABEL, Math.max(r + 8, n.y));
  });

  return { nodes, links, maxValor };
}

function conectados(nodeId, links) {
  const set = new Set();
  links.forEach((l) => {
    if (l.source.id === nodeId) set.add(l.target.id);
    if (l.target.id === nodeId) set.add(l.source.id);
  });
  return set;
}

export default function MapaRelacoes({ despesas }) {
  const { nodes: nodesBase, links: linksBase } = useMemo(() => construirGrafoFinanceiro(despesas), [despesas]);
  const layout = useMemo(() => (nodesBase.length > 1 ? calcularLayout(nodesBase, linksBase) : null), [nodesBase, linksBase]);

  const [hoverId, setHoverId] = useState(null);
  const [selecionadoId, setSelecionadoId] = useState(null);
  const focoId = selecionadoId || hoverId;

  const nodeEmFoco = layout?.nodes.find((n) => n.id === focoId) || null;
  const idsConectados = useMemo(() => (focoId && layout ? conectados(focoId, layout.links) : null), [focoId, layout]);

  const topFornecedores = useMemo(() => {
    return (nodesBase || [])
      .filter((n) => n.tipo === "fornecedor")
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 8);
  }, [nodesBase]);

  return (
    <div>
      <PageTitle eyebrow="Estratégico — só você vê" title="Mapa de Relações" />
      <div style={{ fontSize: 12, color: TEXT_MUTED, marginBottom: 20 }}>
        Cada despesa paga conecta um fornecedor à categoria em que foi lançada — o tamanho do nó é o quanto já foi pago ali.
        Passe o mouse ou clique num nó pra destacar as conexões.
      </div>

      {!layout ? (
        <Card style={{ padding: 20 }}>
          <Empty texto="Ainda não tem despesas pagas com fornecedor/descrição suficientes pra montar o mapa." />
        </Card>
      ) : (
        <>
          <Card style={{ padding: 0, background: "#12141c", border: "1px solid #262a38", overflow: "hidden" }} className="mb-4">
            <svg width="100%" viewBox={`0 0 ${LARGURA} ${ALTURA}`} style={{ display: "block" }}>
              {layout.links.map((l, i) => {
                const destacado = focoId && (l.source.id === focoId || l.target.id === focoId);
                return (
                  <line
                    key={i}
                    x1={l.source.x}
                    y1={l.source.y}
                    x2={l.target.x}
                    y2={l.target.y}
                    stroke={destacado ? "#E8B96A" : "rgba(255,255,255,0.14)"}
                    strokeWidth={destacado ? 2 : 1}
                  />
                );
              })}
              {layout.nodes.map((n) => {
                const r = raioDoNode(n, layout.maxValor);
                const apagado = focoId && n.id !== focoId && !idsConectados?.has(n.id);
                return (
                  <g
                    key={n.id}
                    transform={`translate(${n.x},${n.y})`}
                    onMouseEnter={() => setHoverId(n.id)}
                    onMouseLeave={() => setHoverId(null)}
                    onClick={() => setSelecionadoId((v) => (v === n.id ? null : n.id))}
                    style={{ cursor: "pointer", opacity: apagado ? 0.22 : 1, transition: "opacity 0.15s" }}
                  >
                    <circle r={r} fill={COR_POR_TIPO[n.tipo]} opacity={0.88} />
                    {focoId === n.id && <circle r={r + 4} fill="none" stroke={COR_POR_TIPO[n.tipo]} strokeWidth={1.5} opacity={0.6} />}
                    <text y={r + 13} textAnchor="middle" fontSize={11} fill="#EDEAE0" style={{ pointerEvents: "none" }}>
                      {n.label.length > 18 ? `${n.label.slice(0, 17)}…` : n.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </Card>

          <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
            <div className="flex items-center gap-4 flex-wrap" style={{ fontSize: 11, color: TEXT_MUTED }}>
              {Object.entries(COR_POR_TIPO).map(([tipo, cor]) => (
                <div key={tipo} className="flex items-center gap-1.5">
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: cor, display: "inline-block" }} />
                  {LABEL_POR_TIPO[tipo]}
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12, minHeight: 20 }}>
              {nodeEmFoco ? (
                <>
                  <strong>{nodeEmFoco.label}</strong> — {LABEL_POR_TIPO[nodeEmFoco.tipo]} · {brl(nodeEmFoco.valor)}
                </>
              ) : (
                <span style={{ color: TEXT_MUTED }}>Passe o mouse num nó pra ver o valor.</span>
              )}
            </div>
          </div>

          <Card style={{ padding: 20 }}>
            <div className="fx-serif mb-3" style={{ fontSize: 15, fontWeight: 600 }}>
              Fornecedores com maior valor pago
            </div>
            {topFornecedores.length === 0 ? (
              <Empty texto="Nenhum fornecedor identificado nas despesas pagas." />
            ) : (
              topFornecedores.map((f) => (
                <div key={f.id} className="flex items-center justify-between py-1" style={{ fontSize: 13 }}>
                  <span>{f.label}</span>
                  <span className="fx-mono" style={{ fontWeight: 600 }}>
                    {brl(f.valor)}
                  </span>
                </div>
              ))
            )}
          </Card>
        </>
      )}
    </div>
  );
}
