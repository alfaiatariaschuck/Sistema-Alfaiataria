import React, { useMemo, useState } from "react";
import { Brain, Trash2 } from "lucide-react";
import { Card, Empty, Pill, PageTitle } from "../components/ui";
import { BRASS, CATEGORIAS_CEREBRO_SUGERIDAS, INK, LINE, TEXT_MUTED, inputStyle } from "../lib/constants";

function fmtDataHora(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}

function parseTags(texto) {
  return texto
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

// Grafo simples: um nó por categoria (tamanho pelo nº de notas), ligado
// ao centro, mais linhas finas entre categorias que compartilham pelo
// menos uma tag em comum — sem IA, só contagem e comparação de tags.
function GrafoCerebro({ notas }) {
  const categorias = useMemo(() => {
    const map = new Map();
    notas.forEach((n) => {
      if (!map.has(n.categoria)) map.set(n.categoria, []);
      map.get(n.categoria).push(n);
    });
    return [...map.entries()].map(([nome, lista]) => ({ nome, notas: lista, count: lista.length }));
  }, [notas]);

  if (categorias.length === 0) {
    return <Empty texto="Nenhuma nota ainda — anote algo abaixo e o grafo aparece aqui." />;
  }

  const CX = 420;
  const CY = 300;
  const RAIO = 175;
  const posicoes = categorias.map((c, i) => {
    const ang = (2 * Math.PI * i) / categorias.length - Math.PI / 2;
    return { ...c, x: CX + RAIO * Math.cos(ang), y: CY + RAIO * Math.sin(ang), r: 16 + Math.min(c.count, 10) * 1.6 };
  });

  const links = [];
  for (let i = 0; i < posicoes.length; i++) {
    for (let j = i + 1; j < posicoes.length; j++) {
      const tagsA = new Set(posicoes[i].notas.flatMap((n) => n.tags || []));
      const tagsB = new Set(posicoes[j].notas.flatMap((n) => n.tags || []));
      if ([...tagsA].some((t) => tagsB.has(t))) links.push([posicoes[i], posicoes[j]]);
    }
  }

  return (
    <svg viewBox="0 0 840 600" style={{ width: "100%", height: "auto", display: "block" }}>
      <g stroke={BRASS} strokeOpacity="0.28" strokeWidth="1.2">
        {posicoes.map((p) => (
          <line key={p.nome} x1={CX} y1={CY} x2={p.x} y2={p.y} />
        ))}
      </g>
      <g stroke={BRASS} strokeOpacity="0.18" strokeWidth="1" strokeDasharray="3 4">
        {links.map(([a, b], i) => (
          <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
        ))}
      </g>
      <circle cx={CX} cy={CY} r="34" fill="#F3EEDF" stroke={BRASS} strokeWidth="1.5" />
      <text x={CX} y={CY - 2} textAnchor="middle" fontFamily="Fraunces, serif" fontWeight="700" fontSize="12" fill={INK}>
        Cérebro
      </text>
      <text x={CX} y={CY + 13} textAnchor="middle" fontFamily="Fraunces, serif" fontWeight="700" fontSize="12" fill={INK}>
        Schuck
      </text>
      {posicoes.map((p) => (
        <g key={p.nome}>
          <circle cx={p.x} cy={p.y} r={p.r} fill="#FFF" stroke={BRASS} strokeWidth="1.2" />
          <text x={p.x} y={p.y - p.r - 8} textAnchor="middle" fontFamily="Inter, sans-serif" fontWeight="600" fontSize="12" fill={INK}>
            {p.nome}
          </text>
          <text x={p.x} y={p.y - p.r + 5} textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="10" fill={TEXT_MUTED}>
            {p.count} nota{p.count > 1 ? "s" : ""}
          </text>
        </g>
      ))}
    </svg>
  );
}

export default function Cerebro({ notas, onCriar, onAtualizarCampo, onRemover }) {
  const [texto, setTexto] = useState("");
  const [categoria, setCategoria] = useState("");
  const [tags, setTags] = useState("");
  const [busca, setBusca] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [salvando, setSalvando] = useState(false);

  const categoriasConhecidas = useMemo(
    () => [...new Set([...CATEGORIAS_CEREBRO_SUGERIDAS, ...notas.map((n) => n.categoria)])],
    [notas]
  );

  async function salvar() {
    if (!texto.trim() || !categoria.trim()) return;
    setSalvando(true);
    try {
      await onCriar({ texto, categoria, tags: parseTags(tags) });
      setTexto("");
      setCategoria("");
      setTags("");
    } finally {
      setSalvando(false);
    }
  }

  const notasFiltradas = useMemo(() => {
    const buscaLower = busca.trim().toLowerCase();
    return notas.filter((n) => {
      if (filtroCategoria && n.categoria !== filtroCategoria) return false;
      if (!buscaLower) return true;
      return (
        n.texto.toLowerCase().includes(buscaLower) ||
        n.categoria.toLowerCase().includes(buscaLower) ||
        (n.tags || []).some((t) => t.toLowerCase().includes(buscaLower))
      );
    });
  }, [notas, busca, filtroCategoria]);

  return (
    <div>
      <PageTitle eyebrow="Conhecimento do negócio" title="Cérebro Schuck" />

      <Card style={{ padding: 20 }} className="mb-6">
        <div className="fx-serif mb-3" style={{ fontSize: 15, fontWeight: 600 }}>
          Nova nota
        </div>
        <textarea
          style={{ ...inputStyle, minHeight: 70 }}
          placeholder="O que você quer guardar? Ex: fornecedor de tecido atrasa mais no inverno"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
        <div className="grid gap-3 mt-3" style={{ gridTemplateColumns: "1fr 1fr auto" }}>
          <div>
            <datalist id="lista-categorias-cerebro">
              {categoriasConhecidas.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            <input
              style={inputStyle}
              list="lista-categorias-cerebro"
              placeholder="Categoria (ex: Marketing)"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
            />
          </div>
          <input style={inputStyle} placeholder="Tags separadas por vírgula (opcional)" value={tags} onChange={(e) => setTags(e.target.value)} />
          <button
            onClick={salvar}
            disabled={salvando || !texto.trim() || !categoria.trim()}
            style={{ background: INK, color: "#FFF", padding: "8px 18px", borderRadius: 8, fontWeight: 600, fontSize: 13, opacity: salvando ? 0.7 : 1 }}
          >
            Guardar
          </button>
        </div>
      </Card>

      <Card style={{ padding: 20 }} className="mb-6">
        <div className="fx-serif mb-3 flex items-center gap-2" style={{ fontSize: 15, fontWeight: 600 }}>
          <Brain size={16} color={BRASS} /> Grafo
        </div>
        <GrafoCerebro notas={notas} />
        <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 8 }}>
          As linhas tracejadas ligam categorias que compartilham alguma tag — sem IA, só comparação direta.
        </div>
      </Card>

      <Card style={{ padding: 20 }}>
        <div className="fx-serif mb-3" style={{ fontSize: 15, fontWeight: 600 }}>
          Notas ({notas.length})
        </div>
        <div className="flex gap-2 mb-3 flex-wrap">
          <input style={{ ...inputStyle, maxWidth: 280 }} placeholder="Buscar por texto, categoria ou tag…" value={busca} onChange={(e) => setBusca(e.target.value)} />
          <select style={{ ...inputStyle, maxWidth: 200 }} value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)}>
            <option value="">Todas as categorias</option>
            {categoriasConhecidas.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>

        {notasFiltradas.length === 0 ? (
          <Empty texto="Nenhuma nota encontrada." />
        ) : (
          <div className="flex flex-col gap-2">
            {notasFiltradas.map((n) => (
              <div key={n.id} className="p-3" style={{ border: `1px solid ${LINE}`, borderRadius: 8 }}>
                <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <input
                      style={{ ...inputStyle, padding: "3px 8px", fontSize: 12, width: 140 }}
                      defaultValue={n.categoria}
                      onBlur={(e) => e.target.value.trim() && e.target.value !== n.categoria && onAtualizarCampo(n.id, "categoria", e.target.value.trim())}
                    />
                    {(n.tags || []).map((t) => (
                      <Pill key={t} text={t} />
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: 11, color: TEXT_MUTED }}>{fmtDataHora(n.criadoEm)}</span>
                    <button onClick={() => onRemover(n.id)} title="Remover">
                      <Trash2 size={13} color={TEXT_MUTED} />
                    </button>
                  </div>
                </div>
                <textarea
                  style={{ ...inputStyle, minHeight: 44, fontSize: 13 }}
                  defaultValue={n.texto}
                  onBlur={(e) => e.target.value.trim() && e.target.value !== n.texto && onAtualizarCampo(n.id, "texto", e.target.value)}
                />
                <input
                  style={{ ...inputStyle, padding: "3px 8px", fontSize: 11, marginTop: 6 }}
                  placeholder="tags separadas por vírgula"
                  defaultValue={(n.tags || []).join(", ")}
                  onBlur={(e) => onAtualizarCampo(n.id, "tags", parseTags(e.target.value))}
                />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
