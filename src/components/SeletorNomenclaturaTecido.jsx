import React, { useState } from "react";
import { Plus } from "lucide-react";
import { rotuloModelo } from "../pages/ModelosCamisa";
import { BRASS, TEXT_MUTED, inputStyle } from "../lib/constants";

// Seletor de nomenclatura de tecido pro item de tecido de um pedido —
// puxa de um catálogo (Tecidos de Camisa ou Tecidos Alfaiataria,
// conforme o que for passado em `modelos`), separado do código do
// rolo/compra que já existe na linha (uso interno, estoque). Se a
// nomenclatura escolhida tiver valor de referência/metro cadastrado,
// sugere preencher o valor/metro daquele item automaticamente (só
// quando ainda está vazio — nunca sobrescreve um valor já digitado).
// Tem um "+" pra cadastrar uma nomenclatura nova sem sair do pedido.
export default function SeletorNomenclaturaTecido({ value, onChange, modelos = [], onCriarModelo, onValorReferencia }) {
  const [criandoNovo, setCriandoNovo] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novoCodigo, setNovoCodigo] = useState("");
  const [novoValorRef, setNovoValorRef] = useState("");

  const ativos = modelos.filter((m) => m.ativo);

  function selecionar(nome) {
    onChange(nome);
    const encontrado = modelos.find((m) => m.nome === nome);
    if (encontrado && encontrado.valorReferenciaMetro !== "" && encontrado.valorReferenciaMetro != null && onValorReferencia) {
      onValorReferencia(encontrado.valorReferenciaMetro);
    }
  }

  async function salvarNovo() {
    if (!novoNome.trim()) return;
    const nome = novoNome.trim();
    await onCriarModelo(nome, novoCodigo, novoValorRef);
    selecionar(nome);
    setCriandoNovo(false);
    setNovoNome("");
    setNovoCodigo("");
    setNovoValorRef("");
  }

  if (criandoNovo) {
    return (
      <div className="flex items-center gap-1 flex-wrap">
        <input
          style={{ ...inputStyle, flex: 2, minWidth: 130, padding: "5px 8px", fontSize: 12 }}
          placeholder="Nomenclatura nova"
          value={novoNome}
          onChange={(e) => setNovoNome(e.target.value)}
          autoFocus
        />
        <input
          style={{ ...inputStyle, width: 80, padding: "5px 8px", fontSize: 12 }}
          placeholder="Código"
          value={novoCodigo}
          onChange={(e) => setNovoCodigo(e.target.value)}
        />
        <input
          type="number"
          step="0.01"
          style={{ ...inputStyle, width: 80, padding: "5px 8px", fontSize: 12 }}
          placeholder="R$/m ref."
          value={novoValorRef}
          onChange={(e) => setNovoValorRef(e.target.value)}
        />
        <button type="button" onClick={salvarNovo} style={{ background: BRASS, color: "#FFF", padding: "6px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
          Salvar
        </button>
        <button type="button" onClick={() => setCriandoNovo(false)} style={{ color: TEXT_MUTED, fontSize: 12 }}>
          cancelar
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <select style={{ ...inputStyle, padding: "5px 8px", fontSize: 12 }} value={value || ""} onChange={(e) => selecionar(e.target.value)}>
        <option value="">Nomenclatura do tecido</option>
        {value && !ativos.some((m) => m.nome === value) && <option value={value}>{value} (não cadastrado)</option>}
        {ativos.map((m) => (
          <option key={m.id} value={m.nome}>
            {rotuloModelo(m)}
          </option>
        ))}
      </select>
      <button type="button" onClick={() => setCriandoNovo(true)} title="Cadastrar tecido novo" style={{ color: BRASS, flexShrink: 0 }}>
        <Plus size={15} />
      </button>
    </div>
  );
}
