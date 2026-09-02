import React, { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Card, Empty, PageTitle } from "../components/ui";
import { BRASS, LINE, TEXT_MUTED, inputStyle } from "../lib/constants";

// Rótulo mostrado nas sugestões do pedido — código + nomenclatura
// quando o tecido tem código, só a nomenclatura quando não tem.
export function rotuloModeloAlfaiataria(m) {
  return m.codigo ? `${m.codigo} — ${m.nome}` : m.nome;
}

// Catálogo de tecidos de alfaiataria — separado do catálogo de tecidos
// de camisa (nomenclaturas diferentes: lãs, linhos etc.). Só cadastro
// (código + nomenclatura + valor de referência opcional) — sem tabela
// de preço de venda, que não faz sentido aqui (cada peça é sob medida,
// a margem já é calculada direto na peça).
export default function TecidosAlfaiataria({ modelos, loading, onAdicionar, onCampo, onRemover }) {
  const [codigoNovo, setCodigoNovo] = useState("");
  const [nomeNovo, setNomeNovo] = useState("");
  const [valorRefNovo, setValorRefNovo] = useState("");

  function adicionar() {
    if (!nomeNovo.trim()) return;
    onAdicionar(nomeNovo, codigoNovo, valorRefNovo);
    setCodigoNovo("");
    setNomeNovo("");
    setValorRefNovo("");
  }

  return (
    <div>
      <PageTitle eyebrow="Alfaiataria — cadastro de tecidos" title="Tecidos Alfaiataria" />

      <Card style={{ padding: 16 }} className="mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <input
            style={{ ...inputStyle, width: 140 }}
            placeholder="Código (opcional)"
            value={codigoNovo}
            onChange={(e) => setCodigoNovo(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && adicionar()}
          />
          <input
            style={{ ...inputStyle, flex: 1, minWidth: 180 }}
            placeholder="Nomenclatura (ex: Lã Fresco 150 Cinza)"
            value={nomeNovo}
            onChange={(e) => setNomeNovo(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && adicionar()}
          />
          <input
            type="number"
            min="0"
            step="0.01"
            style={{ ...inputStyle, width: 150 }}
            placeholder="Valor ref./m (R$)"
            value={valorRefNovo}
            onChange={(e) => setValorRefNovo(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && adicionar()}
          />
          <button
            onClick={adicionar}
            className="flex items-center gap-1.5"
            style={{ background: BRASS, color: "#FFF", padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}
          >
            <Plus size={15} /> Adicionar
          </button>
        </div>
        <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 8 }}>
          Código e valor de referência são opcionais — deixe o valor em branco pra tecidos que variam muito de rolo
          pra rolo. Uso interno seu, nunca aparece pro Icaro.
        </div>
      </Card>

      {loading && <div style={{ fontSize: 13, color: TEXT_MUTED }}>Carregando…</div>}

      {!loading && modelos.length === 0 && (
        <Card style={{ padding: 20 }}>
          <Empty texto="Nenhum tecido cadastrado ainda." />
        </Card>
      )}

      {!loading && modelos.length > 0 && (
        <Card style={{ padding: 0, overflow: "hidden" }}>
          {modelos.map((m, i) => (
            <div
              key={m.id}
              className="flex items-center gap-2 px-4 py-3 flex-wrap"
              style={{ borderBottom: i < modelos.length - 1 ? `1px solid ${LINE}` : "none", opacity: m.ativo ? 1 : 0.5 }}
            >
              <input
                style={{ ...inputStyle, padding: "6px 10px", fontSize: 12, width: 130 }}
                placeholder="Código"
                value={m.codigo}
                onChange={(e) => onCampo(m.id, "codigo", e.target.value)}
              />
              <input
                style={{ ...inputStyle, padding: "6px 10px", fontSize: 13, fontWeight: 600, flex: 1, minWidth: 160 }}
                value={m.nome}
                onChange={(e) => onCampo(m.id, "nome", e.target.value)}
              />
              <input
                type="number"
                min="0"
                step="0.01"
                style={{ ...inputStyle, padding: "6px 10px", fontSize: 12, width: 120 }}
                placeholder="Varia"
                title="Valor de referência por metro — deixe em branco se varia muito"
                value={m.valorReferenciaMetro}
                onChange={(e) => onCampo(m.id, "valorReferenciaMetro", e.target.value)}
              />
              <label className="flex items-center gap-1.5" style={{ cursor: "pointer", fontSize: 12, color: TEXT_MUTED }}>
                <input
                  type="checkbox"
                  checked={m.ativo}
                  onChange={(e) => onCampo(m.id, "ativo", e.target.checked)}
                  style={{ width: 14, height: 14, accentColor: BRASS }}
                />
                Ativo
              </label>
              <button onClick={() => onRemover(m.id)} style={{ color: TEXT_MUTED, flexShrink: 0 }}>
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
