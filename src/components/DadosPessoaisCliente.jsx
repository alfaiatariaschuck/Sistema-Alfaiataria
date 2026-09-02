import React, { useEffect, useState } from "react";
import { ShieldCheck, Trash2 } from "lucide-react";
import { Field } from "./ui";
import { BRASS, INK, INK_SOFT, LINE, TEXT_MUTED, inputStyle } from "../lib/constants";
import { fmtData, hojeISO } from "../lib/helpers";
import { supabase } from "../supabaseClient";

function vazio(clienteId) {
  return {
    cliente_id: clienteId,
    tipo_pessoa: "PF",
    endereco: "",
    cep: "",
    data_nascimento: "",
    telefone: "",
    email: "",
    cpf: "",
    cnpj: "",
    razao_social: "",
    observacoes: "",
    consentimento: false,
    consentimento_em: null,
  };
}

// Dados pessoais (CRM) do cliente — vive numa tabela separada de
// "clientes" com RLS só pro dono (o vendedor nunca acessa isso, nem
// pela API). Carrega só quando o card do cliente é aberto, pra não
// puxar dado sensível de todo mundo sem necessidade.
export default function DadosPessoaisCliente({ clienteId }) {
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [salvo, setSalvo] = useState(null);

  useEffect(() => {
    if (!clienteId) {
      setCarregando(false);
      return;
    }
    (async () => {
      const { data } = await supabase.from("clientes_dados_pessoais").select("*").eq("cliente_id", clienteId).maybeSingle();
      setDados(data || vazio(clienteId));
      setCarregando(false);
    })();
  }, [clienteId]);

  function set(campo, valor) {
    setDados((prev) => ({ ...prev, [campo]: valor }));
  }

  async function salvar() {
    setSalvo(null);
    const payload = {
      cliente_id: clienteId,
      tipo_pessoa: dados.tipo_pessoa || "PF",
      endereco: dados.endereco || null,
      cep: dados.cep || null,
      data_nascimento: dados.data_nascimento || null,
      telefone: dados.telefone || null,
      email: dados.email || null,
      cpf: dados.cpf || null,
      cnpj: dados.cnpj || null,
      razao_social: dados.razao_social || null,
      observacoes: dados.observacoes || null,
      consentimento: !!dados.consentimento,
      consentimento_em: dados.consentimento ? dados.consentimento_em || hojeISO() : null,
      atualizado_em: new Date().toISOString(),
    };
    const { error } = await supabase.from("clientes_dados_pessoais").upsert(payload);
    if (!error) setDados((prev) => ({ ...prev, ...payload }));
    setSalvo(!error);
    setTimeout(() => setSalvo(null), 3000);
  }

  async function apagar() {
    if (!confirm("Apagar os dados pessoais desse cliente (endereço, nascimento, contato, observações)? O histórico de pedidos não é afetado.")) return;
    const { error } = await supabase.from("clientes_dados_pessoais").delete().eq("cliente_id", clienteId);
    if (!error) setDados(vazio(clienteId));
  }

  if (!clienteId) {
    return <div style={{ fontSize: 11, color: TEXT_MUTED }}>Dados pessoais indisponíveis pra esse cliente (cadastro antigo sem vínculo).</div>;
  }
  if (carregando || !dados) {
    return <div style={{ fontSize: 12, color: TEXT_MUTED }}>Carregando dados pessoais…</div>;
  }

  const pj = dados.tipo_pessoa === "PJ";

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <ShieldCheck size={14} color={BRASS} />
        <div style={{ fontSize: 12, fontWeight: 600, color: TEXT_MUTED }}>Dados pessoais — só o dono vê (LGPD)</div>
      </div>

      <div className="flex gap-2 mb-3" style={{ maxWidth: 280 }}>
        <button
          type="button"
          onClick={() => set("tipo_pessoa", "PF")}
          className="flex-1"
          style={{
            padding: "6px 10px",
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 600,
            background: !pj ? INK : "#EDEAE0",
            color: !pj ? "#FFF" : INK_SOFT,
            border: `1px solid ${!pj ? INK : LINE}`,
          }}
        >
          Pessoa Física
        </button>
        <button
          type="button"
          onClick={() => set("tipo_pessoa", "PJ")}
          className="flex-1"
          style={{
            padding: "6px 10px",
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 600,
            background: pj ? BRASS : "#EDEAE0",
            color: pj ? "#FFF" : INK_SOFT,
            border: `1px solid ${pj ? BRASS : LINE}`,
          }}
        >
          Pessoa Jurídica
        </button>
      </div>

      <div className="grid gap-3 mb-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
        <Field label="Telefone">
          <input style={inputStyle} value={dados.telefone || ""} onChange={(e) => set("telefone", e.target.value)} placeholder="Ex: 51999998888" />
        </Field>
        <Field label="E-mail">
          <input style={inputStyle} value={dados.email || ""} onChange={(e) => set("email", e.target.value)} placeholder="cliente@email.com" />
        </Field>
        {pj ? (
          <>
            <Field label="Razão social">
              <input style={inputStyle} value={dados.razao_social || ""} onChange={(e) => set("razao_social", e.target.value)} placeholder="Nome da empresa" />
            </Field>
            <Field label="CNPJ">
              <input style={inputStyle} value={dados.cnpj || ""} onChange={(e) => set("cnpj", e.target.value)} placeholder="00.000.000/0000-00" />
            </Field>
          </>
        ) : (
          <>
            <Field label="CPF">
              <input style={inputStyle} value={dados.cpf || ""} onChange={(e) => set("cpf", e.target.value)} placeholder="000.000.000-00" />
            </Field>
            <Field label="Data de nascimento">
              <input type="date" style={inputStyle} value={dados.data_nascimento || ""} onChange={(e) => set("data_nascimento", e.target.value)} />
            </Field>
          </>
        )}
        <Field label="Endereço">
          <input style={inputStyle} value={dados.endereco || ""} onChange={(e) => set("endereco", e.target.value)} placeholder="Rua, número, bairro, cidade" />
        </Field>
        <Field label="CEP">
          <input style={inputStyle} value={dados.cep || ""} onChange={(e) => set("cep", e.target.value)} placeholder="00000-000" />
        </Field>
      </div>
      <Field label="Observações">
        <textarea style={{ ...inputStyle, minHeight: 50 }} value={dados.observacoes || ""} onChange={(e) => set("observacoes", e.target.value)} />
      </Field>

      <label className="flex items-start gap-2 mt-3" style={{ cursor: "pointer" }}>
        <input
          type="checkbox"
          checked={!!dados.consentimento}
          onChange={(e) => set("consentimento", e.target.checked)}
          style={{ marginTop: 2, width: 15, height: 15, accentColor: BRASS, flexShrink: 0 }}
        />
        <span style={{ fontSize: 11, color: TEXT_MUTED }}>
          Cliente autorizou guardar esses dados (LGPD)
          {dados.consentimento_em ? ` — registrado em ${fmtData(String(dados.consentimento_em).slice(0, 10))}` : ""}.
        </span>
      </label>

      <div className="flex items-center gap-3 mt-3">
        <button
          onClick={salvar}
          style={{ background: salvo === true ? "#2C6E31" : INK, color: "#FFF", padding: "7px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600 }}
        >
          {salvo === true ? "Salvo ✓" : "Salvar dados pessoais"}
        </button>
        <button onClick={apagar} className="flex items-center gap-1" style={{ color: "#9C4A1E", fontSize: 12, fontWeight: 600 }}>
          <Trash2 size={12} /> Apagar dados pessoais
        </button>
      </div>
      {salvo === false && (
        <div className="mt-2" style={{ fontSize: 11, color: "#9C4A1E" }}>
          Não consegui salvar — tenta de novo.
        </div>
      )}
    </div>
  );
}
