import React, { useState } from "react";
import { Search } from "lucide-react";
import { Card, Empty } from "../components/ui";
import { LINE, TEXT_MUTED, inputStyle } from "../lib/constants";
import { fmtData } from "../lib/helpers";
import { supabase } from "../supabaseClient";

// Só nome + "já contatado" — nada de dado pessoal (telefone, CPF,
// endereço), então não fere a regra de o vendedor nunca ler
// clientes_dados_pessoais. É a mesma marcação que o dono usa em
// Clientes.jsx, pra evitar os dois mandarem mensagem pro mesmo cliente
// na campanha de reativação.
export default function CampanhaVendedor({ clientesBase }) {
  const [busca, setBusca] = useState("");
  const [pendentes, setPendentes] = useState({});

  const filtrados = clientesBase
    .filter((c) => c.nome.toLowerCase().includes(busca.toLowerCase()))
    .slice()
    .sort((a, b) => a.nome.localeCompare(b.nome));

  async function alternar(c) {
    const contatadoAtual = pendentes[c.id] !== undefined ? !!pendentes[c.id] : !!c.campanha_contatado_em;
    const novoValor = contatadoAtual ? null : new Date().toISOString();
    setPendentes((prev) => ({ ...prev, [c.id]: novoValor }));
    await supabase.from("clientes").update({ campanha_contatado_em: novoValor }).eq("id", c.id);
  }

  return (
    <div>
      <div style={{ fontSize: 12, color: TEXT_MUTED, marginBottom: 12 }}>
        Marque quem você já contatou na campanha de reativação — a lista é compartilhada com o dono, pra nenhum dos
        dois mandar mensagem duas vezes pro mesmo cliente.
      </div>
      <div className="flex items-center gap-2 mb-3" style={{ ...inputStyle, maxWidth: 320, padding: "6px 10px" }}>
        <Search size={14} color={TEXT_MUTED} />
        <input
          placeholder="Buscar cliente…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          style={{ border: "none", outline: "none", background: "transparent", width: "100%", fontSize: 14 }}
        />
      </div>
      <Card style={{ padding: 0 }}>
        {filtrados.length === 0 && (
          <div className="p-6">
            <Empty texto="Nenhum cliente encontrado." />
          </div>
        )}
        {filtrados.map((c, i) => {
          const contatadoEm = pendentes[c.id] !== undefined ? pendentes[c.id] : c.campanha_contatado_em;
          const contatado = !!contatadoEm;
          return (
            <label
              key={c.id}
              className="flex items-center justify-between px-5 py-3"
              style={{ borderBottom: i < filtrados.length - 1 ? `1px solid ${LINE}` : "none", cursor: "pointer" }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{c.nome}</div>
                {contatado && <div style={{ fontSize: 11, color: "#2C6E31" }}>Contatado em {fmtData(contatadoEm.slice(0, 10))}</div>}
              </div>
              <input type="checkbox" checked={contatado} onChange={() => alternar(c)} style={{ width: 18, height: 18, accentColor: "#2C6E31" }} />
            </label>
          );
        })}
      </Card>
    </div>
  );
}
