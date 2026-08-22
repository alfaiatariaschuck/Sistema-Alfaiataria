import React from "react";
import { ShieldCheck } from "lucide-react";
import { Field } from "./ui";
import { BRASS, INK, INK_SOFT, LINE, TEXT_MUTED, inputStyle } from "../lib/constants";

export function dadosPessoaisVazio() {
  return {
    tipoPessoa: "PF",
    telefone: "",
    email: "",
    dataNascimento: "",
    endereco: "",
    cpf: "",
    cnpj: "",
    razaoSocial: "",
    observacoes: "",
    consentimento: false,
  };
}

// Seção opcional de dados pessoais (CRM) direto na ficha de pedido —
// só o dono usa essa ficha (Pedido Camisas / Pedido Alfaiataria), então
// não fere a regra de que só ele acessa esse tipo de dado. É salva junto
// com o pedido, numa tabela separada de "clientes". Cliente pode comprar
// como Pessoa Física ou como Pessoa Jurídica (nota fiscal em nome da empresa).
export default function CampoDadosPessoais({ value, onChange }) {
  function set(campo, valor) {
    onChange({ ...value, [campo]: valor });
  }

  const pj = value.tipoPessoa === "PJ";

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <ShieldCheck size={15} color={BRASS} />
        <div className="fx-serif" style={{ fontSize: 16, fontWeight: 600 }}>
          Dados pessoais do cliente (opcional)
        </div>
      </div>
      <div style={{ fontSize: 11, color: TEXT_MUTED, marginBottom: 12 }}>
        Só você acessa esses dados — fica de fora do que o vendedor vê. Preenche já aqui pra não precisar cadastrar de
        novo depois em Clientes.
      </div>

      <div className="flex gap-2 mb-3" style={{ maxWidth: 320 }}>
        <button
          type="button"
          onClick={() => set("tipoPessoa", "PF")}
          className="flex-1"
          style={{
            padding: "7px 10px",
            borderRadius: 6,
            fontSize: 12,
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
          onClick={() => set("tipoPessoa", "PJ")}
          className="flex-1"
          style={{
            padding: "7px 10px",
            borderRadius: 6,
            fontSize: 12,
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
          <input style={inputStyle} value={value.telefone} onChange={(e) => set("telefone", e.target.value)} placeholder="Ex: 51999998888" />
        </Field>
        <Field label="E-mail">
          <input style={inputStyle} value={value.email} onChange={(e) => set("email", e.target.value)} placeholder="cliente@email.com" />
        </Field>
        {pj ? (
          <>
            <Field label="Razão social">
              <input style={inputStyle} value={value.razaoSocial} onChange={(e) => set("razaoSocial", e.target.value)} placeholder="Nome da empresa" />
            </Field>
            <Field label="CNPJ">
              <input style={inputStyle} value={value.cnpj} onChange={(e) => set("cnpj", e.target.value)} placeholder="00.000.000/0000-00" />
            </Field>
          </>
        ) : (
          <>
            <Field label="CPF">
              <input style={inputStyle} value={value.cpf} onChange={(e) => set("cpf", e.target.value)} placeholder="000.000.000-00" />
            </Field>
            <Field label="Data de nascimento">
              <input type="date" style={inputStyle} value={value.dataNascimento} onChange={(e) => set("dataNascimento", e.target.value)} />
            </Field>
          </>
        )}
        <Field label="Endereço">
          <input style={inputStyle} value={value.endereco} onChange={(e) => set("endereco", e.target.value)} placeholder="Rua, número, bairro, cidade" />
        </Field>
      </div>
      <Field label="Observações">
        <textarea style={{ ...inputStyle, minHeight: 50 }} value={value.observacoes} onChange={(e) => set("observacoes", e.target.value)} />
      </Field>
      <label className="flex items-start gap-2 mt-3" style={{ cursor: "pointer" }}>
        <input
          type="checkbox"
          checked={!!value.consentimento}
          onChange={(e) => set("consentimento", e.target.checked)}
          style={{ marginTop: 2, width: 15, height: 15, accentColor: BRASS, flexShrink: 0 }}
        />
        <span style={{ fontSize: 11, color: TEXT_MUTED }}>Cliente autorizou guardar esses dados (LGPD).</span>
      </label>
    </div>
  );
}
