import React, { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Card, Empty, PageTitle } from "../components/ui";
import { BRASS, LINE, TEXT_MUTED, inputStyle } from "../lib/constants";

// Rótulo mostrado nas sugestões do pedido — código + nomenclatura
// quando o tecido tem código, só a nomenclatura quando não tem.
export function rotuloModeloAlfaiataria(m) {
  return m.codigo ? `${m.codigo} — ${m.nome}` : m.nome;
}

// "89,90" ou "1.234,56" (formato BR) vira número — "" quando não dá
// pra entender o valor.
function parseValorPtBr(txt) {
  if (!txt) return "";
  const limpo = String(txt)
    .replace(/[R$\s]/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(",", ".");
  const num = parseFloat(limpo);
  return isNaN(num) ? "" : String(num);
}

// Cada linha colada vira { codigo, nome, valorReferenciaMetro } — separa
// por TAB (padrão de quando você copia células do Excel e cola aqui) ou,
// sem tab, por 2+ espaços seguidos (comum ao colar de PDF). 3 colunas =
// Código/Nomenclatura/Valor; 2 colunas = Nomenclatura/Valor (sem código).
function parseLinhasColadas(texto) {
  return texto
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((linha) => {
      const partes = (linha.includes("\t") ? linha.split("\t") : linha.split(/\s{2,}/)).map((c) => c.trim());
      if (partes.length >= 3) return { codigo: partes[0], nome: partes[1], valorReferenciaMetro: parseValorPtBr(partes[2]) };
      if (partes.length === 2) return { codigo: "", nome: partes[0], valorReferenciaMetro: parseValorPtBr(partes[1]) };
      return { codigo: "", nome: partes[0] || "", valorReferenciaMetro: "" };
    })
    .filter((it) => it.nome);
}

// Catálogo de tecidos de alfaiataria — separado do catálogo de tecidos
// de camisa (nomenclaturas diferentes: lãs, linhos etc.). Cadastro
// manual (código + nomenclatura + valor de referência opcional) ou em
// massa, colando direto de uma planilha (ex: lista mensal de
// fornecedor) — sem tabela de preço de venda, que não faz sentido
// aqui (cada peça é sob medida, a margem já é calculada direto nela).
export default function TecidosAlfaiataria({ modelos, loading, onAdicionar, onCampo, onRemover, onImportar }) {
  const [codigoNovo, setCodigoNovo] = useState("");
  const [nomeNovo, setNomeNovo] = useState("");
  const [valorRefNovo, setValorRefNovo] = useState("");
  const [textoImportar, setTextoImportar] = useState("");
  const [importando, setImportando] = useState(false);
  const [resultadoImportar, setResultadoImportar] = useState(null);
  const [erroImportar, setErroImportar] = useState(null);

  function adicionar() {
    if (!nomeNovo.trim()) return;
    onAdicionar(nomeNovo, codigoNovo, valorRefNovo);
    setCodigoNovo("");
    setNomeNovo("");
    setValorRefNovo("");
  }

  async function importar() {
    const itens = parseLinhasColadas(textoImportar);
    if (itens.length === 0) return;
    setImportando(true);
    setErroImportar(null);
    setResultadoImportar(null);
    try {
      const { total } = await onImportar(itens);
      setResultadoImportar(`${total} tecido(s) importado(s)/atualizado(s).`);
      setTextoImportar("");
    } catch (e) {
      setErroImportar("Não consegui importar (" + e.message + ").");
    } finally {
      setImportando(false);
    }
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

      <Card style={{ padding: 16 }} className="mb-4">
        <div className="fx-serif mb-1" style={{ fontSize: 14, fontWeight: 600 }}>
          Importar de planilha
        </div>
        <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 8 }}>
          Selecione as células no Excel (Código, Nomenclatura, Valor por metro — ou só Nomenclatura e Valor, sem
          código), copie (Ctrl+C) e cole aqui embaixo (Ctrl+V), uma linha por tecido. Quem já existe (mesma
          nomenclatura) tem código e valor atualizados; quem não existe é cadastrado. Não apaga quem não estiver na
          lista colada — dá pra usar todo mês só com os que mudaram.
        </div>
        <textarea
          style={{ ...inputStyle, minHeight: 100, fontFamily: "monospace", fontSize: 12 }}
          placeholder={"M58 - 1001\tLã Fresco 150 Cinza\t189,90"}
          value={textoImportar}
          onChange={(e) => setTextoImportar(e.target.value)}
        />
        <div className="flex items-center gap-3 mt-2">
          <button
            type="button"
            onClick={importar}
            disabled={importando || !textoImportar.trim()}
            style={{
              background: BRASS,
              color: "#FFF",
              padding: "8px 16px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              opacity: importando || !textoImportar.trim() ? 0.6 : 1,
            }}
          >
            {importando ? "Importando…" : "Importar"}
          </button>
          {resultadoImportar && <span style={{ fontSize: 12, color: "#2C6E31", fontWeight: 600 }}>{resultadoImportar}</span>}
          {erroImportar && <span style={{ fontSize: 12, color: "#9C4A1E" }}>{erroImportar}</span>}
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
