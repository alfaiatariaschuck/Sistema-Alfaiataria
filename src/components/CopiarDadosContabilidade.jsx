import React, { useState } from "react";
import { ClipboardCopy } from "lucide-react";
import { BRASS, TEXT_MUTED } from "../lib/constants";
import { brl, fmtData } from "../lib/helpers";
import { supabase } from "../supabaseClient";

// Monta um textinho pronto (nome, CPF/CNPJ, endereço, produto, valor da
// venda) e copia pra área de transferência — pra colar direto no WhatsApp
// da contabilidade, sem precisar digitar tudo de novo. Busca o CPF/endereço
// só na hora do clique (dado sensível, dono-only via RLS).
export default function CopiarDadosContabilidade({ clienteId, nomeCliente, produto, valorVenda, dataVenda }) {
  const [copiado, setCopiado] = useState(false);
  const [erro, setErro] = useState(null);
  const [carregando, setCarregando] = useState(false);

  async function copiar() {
    setErro(null);
    setCarregando(true);
    try {
      const { data } = clienteId
        ? await supabase.from("clientes_dados_pessoais").select("*").eq("cliente_id", clienteId).maybeSingle()
        : { data: null };
      const pj = data?.tipo_pessoa === "PJ";
      const documento = pj ? data?.cnpj : data?.cpf;
      const linhas = [
        `Cliente: ${pj && data?.razao_social ? data.razao_social : nomeCliente}`,
        `${pj ? "CNPJ" : "CPF"}: ${documento || "não informado"}`,
        `Endereço: ${data?.endereco || "não informado"}`,
        `Produto: ${produto}`,
        `Data da venda: ${fmtData(dataVenda)}`,
        `Valor da venda: ${brl(parseFloat(valorVenda) || 0)}`,
      ];
      await navigator.clipboard.writeText(linhas.join("\n"));
      setCopiado(true);
      setTimeout(() => setCopiado(false), 4000);
    } catch (e) {
      setErro("Não consegui copiar (" + e.message + ").");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={copiar}
        disabled={carregando}
        className="flex items-center gap-2"
        style={{
          background: copiado ? "#2C6E31" : BRASS,
          color: "#FFF",
          padding: "9px 16px",
          borderRadius: 8,
          fontWeight: 600,
          fontSize: 13,
          opacity: carregando ? 0.7 : 1,
        }}
      >
        <ClipboardCopy size={14} /> {copiado ? "Copiado! Cole no WhatsApp da contabilidade" : carregando ? "Copiando…" : "Copiar dados p/ contabilidade"}
      </button>
      {erro && (
        <div style={{ fontSize: 11, color: "#9C4A1E", marginTop: 4 }}>
          {erro}
        </div>
      )}
      {!erro && (
        <div style={{ fontSize: 10, color: TEXT_MUTED, marginTop: 4 }}>
          Usa o CPF/CNPJ e endereço cadastrados em Clientes — se não tiver, avisa no texto copiado.
        </div>
      )}
    </div>
  );
}
