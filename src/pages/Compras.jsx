import React, { useState } from "react";
import { CheckCircle2, Clock, Copy, Search } from "lucide-react";
import { Card, Empty, PageTitle, Pill } from "../components/ui";
import { BRASS_SOFT, FORNECEDORES_TECIDO, INK, LINE, TEXT_MUTED, inputStyle } from "../lib/constants";

// Junta variações de digitação (maiúscula/minúscula, espaço a mais) do
// mesmo fornecedor conhecido num nome só, pra tudo ficar concentrado num
// grupo único — "imperiale", "IMPERIALE " e "Imperiale" viram "Imperiale".
function normalizarFornecedor(nome) {
  const limpo = (nome || "").trim();
  if (!limpo) return "Sem fornecedor definido";
  const canonico = FORNECEDORES_TECIDO.find((f) => f.toLowerCase() === limpo.toLowerCase());
  return canonico || limpo;
}

function textoParaFornecedor(fornecedor, lista) {
  const linhas = [`*Pedido de tecido — ${fornecedor}*`, ""];
  lista.forEach((item) => {
    const partes = [`Código ${item.codigo || "—"}`, `Qtd ${item.qtd}`];
    if (item.metragem) partes.push(`Medida ${item.metragem}`);
    if (item.numero) partes.push(`Obs: ${item.numero}`);
    linhas.push(`• ${item.cliente} — ${partes.join(" · ")}`);
  });
  return linhas.join("\n");
}

export default function Compras({ pedidos, pecas, onTecidoPedido, onTecidoPeca, irParaPedido, irParaPeca }) {
  const [busca, setBusca] = useState("");
  const [filtroFornecedor, setFiltroFornecedor] = useState("Todos");
  const [filtroStatus, setFiltroStatus] = useState("Pendente");
  const [copiado, setCopiado] = useState(null);

  const itens = [];
  pedidos.forEach((p) => {
    (p.tecidos || []).forEach((t) => {
      if (!t.codigo && !t.fornecedor) return;
      itens.push({
        origem: "camisa",
        pedidoId: p.id,
        tecidoId: t.id,
        cliente: p.cliente,
        codigo: t.codigo,
        qtd: t.qtd,
        numero: t.numero,
        metragem: t.metragem || "",
        fornecedor: normalizarFornecedor(t.fornecedor),
        comprado: !!t.comprado,
        dataPedido: p.dataPedido,
      });
    });
  });
  (pecas || []).forEach((p) => {
    (p.tecidos || []).forEach((t) => {
      if (!t.codigo && !t.fornecedor) return;
      itens.push({
        origem: "alfaiataria",
        pedidoId: p.id,
        tecidoId: t.id,
        cliente: p.cliente,
        codigo: t.codigo,
        qtd: t.qtd,
        numero: t.numero,
        metragem: t.metragem || "",
        fornecedor: normalizarFornecedor(t.fornecedor),
        comprado: !!t.comprado,
        dataPedido: p.dataPedido,
        tipoPeca: p.tipoPeca,
      });
    });
  });

  const fornecedores = ["Todos", ...new Set(itens.map((i) => i.fornecedor))];

  const filtrados = itens.filter((i) => {
    if (filtroFornecedor !== "Todos" && i.fornecedor !== filtroFornecedor) return false;
    if (filtroStatus === "Pendente" && i.comprado) return false;
    if (filtroStatus === "Comprado" && !i.comprado) return false;
    if (busca && !i.cliente.toLowerCase().includes(busca.toLowerCase()) && !i.codigo.toLowerCase().includes(busca.toLowerCase())) return false;
    return true;
  });

  const porFornecedor = new Map();
  filtrados.forEach((i) => {
    if (!porFornecedor.has(i.fornecedor)) porFornecedor.set(i.fornecedor, []);
    porFornecedor.get(i.fornecedor).push(i);
  });

  const pendentes = itens.filter((i) => !i.comprado).length;

  function alternarComprado(item) {
    if (item.origem === "camisa") onTecidoPedido(item.pedidoId, item.tecidoId, "comprado", !item.comprado);
    else onTecidoPeca(item.pedidoId, item.tecidoId, "comprado", !item.comprado);
  }

  function atualizarMetragem(item, valor) {
    if (item.origem === "camisa") onTecidoPedido(item.pedidoId, item.tecidoId, "metragem", valor);
    else onTecidoPeca(item.pedidoId, item.tecidoId, "metragem", valor);
  }

  function abrirItem(item) {
    if (item.origem === "camisa") irParaPedido(item.pedidoId);
    else irParaPeca(item.pedidoId);
  }

  async function copiarTexto(fornecedor, lista) {
    const texto = textoParaFornecedor(fornecedor, lista);
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(fornecedor);
      setTimeout(() => setCopiado(null), 2000);
    } catch {
      // clipboard indisponível — o botão de WhatsApp já leva o mesmo texto
    }
  }

  function abrirWhatsapp(fornecedor, lista) {
    const texto = textoParaFornecedor(fornecedor, lista);
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank");
  }

  return (
    <div>
      <PageTitle eyebrow={`${pendentes} item(ns) pendente(s)`} title="Compras" />

      <div className="flex flex-col md:flex-row gap-3 mb-5">
        <div className="flex items-center gap-2 flex-1" style={{ ...inputStyle, padding: "6px 10px" }}>
          <Search size={14} color={TEXT_MUTED} />
          <input
            placeholder="Buscar cliente ou código…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            style={{ border: "none", outline: "none", background: "transparent", width: "100%", fontSize: 14 }}
          />
        </div>
        <select value={filtroFornecedor} onChange={(e) => setFiltroFornecedor(e.target.value)} style={{ ...inputStyle, maxWidth: 220 }}>
          {fornecedores.map((f) => (
            <option key={f}>{f}</option>
          ))}
        </select>
        <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} style={{ ...inputStyle, maxWidth: 160 }}>
          <option>Pendente</option>
          <option>Comprado</option>
          <option>Todos</option>
        </select>
      </div>

      {filtrados.length === 0 && (
        <Card style={{ padding: 20 }}>
          <Empty texto="Nenhum item de tecido encontrado com esse filtro." />
        </Card>
      )}

      {[...porFornecedor.entries()].map(([fornecedor, lista]) => (
        <Card key={fornecedor} style={{ padding: 0, marginBottom: 16, overflow: "hidden" }}>
          <div className="flex items-center justify-between" style={{ background: INK, padding: "10px 16px" }}>
            <div>
              <span className="fx-serif" style={{ color: "#FFF", fontSize: 14, fontWeight: 600 }}>
                {fornecedor}
              </span>
              <span style={{ color: "#8593A3", fontSize: 12 }}> · {lista.length} item(ns)</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => copiarTexto(fornecedor, lista)}
                className="flex items-center gap-1"
                style={{ background: "rgba(255,255,255,0.12)", color: "#FFF", padding: "6px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600 }}
              >
                <Copy size={12} /> {copiado === fornecedor ? "Copiado!" : "Copiar"}
              </button>
              <button
                type="button"
                onClick={() => abrirWhatsapp(fornecedor, lista)}
                className="flex items-center gap-1"
                style={{ background: "#25D366", color: "#FFF", padding: "6px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600 }}
              >
                WhatsApp
              </button>
            </div>
          </div>
          {lista.map((item, i) => (
            <div
              key={item.origem + "-" + item.pedidoId + "-" + item.tecidoId}
              className="flex items-center justify-between gap-3 px-4 py-3"
              style={{ borderBottom: i < lista.length - 1 ? `1px solid ${LINE}` : "none" }}
            >
              <button onClick={() => abrirItem(item)} className="text-left flex-1">
                <div className="flex items-center gap-1.5">
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{item.cliente}</span>
                  {item.origem === "alfaiataria" && <Pill text={item.tipoPeca} style={{ bg: BRASS_SOFT, fg: "#A9793E" }} />}
                </div>
                <div className="fx-mono" style={{ fontSize: 11, color: TEXT_MUTED }}>
                  Código {item.codigo || "—"} · Qtd {item.qtd} {item.numero ? `· Obs: ${item.numero}` : ""}
                </div>
              </button>
              <div className="flex flex-col items-start flex-shrink-0" style={{ width: 100 }}>
                <label style={{ fontSize: 10, color: TEXT_MUTED, fontWeight: 600 }}>Medida</label>
                <input
                  style={{ ...inputStyle, padding: "5px 8px", fontSize: 12 }}
                  placeholder="ex: 3,5m"
                  value={item.metragem}
                  onChange={(e) => atualizarMetragem(item, e.target.value)}
                />
              </div>
              <button
                onClick={() => alternarComprado(item)}
                className="flex items-center gap-1 flex-shrink-0"
                style={{
                  background: item.comprado ? "#DCEBDD" : "#F6E3D9",
                  color: item.comprado ? "#2C6E31" : "#9C4A1E",
                  padding: "7px 12px",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {item.comprado ? (
                  <>
                    <CheckCircle2 size={13} /> Comprado
                  </>
                ) : (
                  <>
                    <Clock size={13} /> Comprar
                  </>
                )}
              </button>
            </div>
          ))}
        </Card>
      ))}
    </div>
  );
}
