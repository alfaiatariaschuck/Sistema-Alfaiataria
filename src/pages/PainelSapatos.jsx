import React, { useMemo, useState } from "react";
import { CheckCircle2, Footprints, Plus, Trash2 } from "lucide-react";
import { Card, Empty, Pill, StatCard, PageTitle } from "../components/ui";
import { BRASS, LINE, STATUS_SAPATOS, TEXT_MUTED, inputStyle } from "../lib/constants";
import { hojeISO } from "../lib/helpers";

const VERDE = "#2C6E31";
const VENDEDORES = ["Tales", "Deivid"];

function ComparativoVendedores({ pedidos }) {
  const linhas = VENDEDORES.map((nome) => {
    const doVendedor = (pedidos || []).filter((p) => p.vendedor === nome);
    return { nome, qtdPedidos: doVendedor.length, entregues: doVendedor.filter((p) => p.status === "Entregue").length };
  });
  return (
    <Card style={{ padding: 20 }}>
      <div className="card-title fx-serif mb-3" style={{ fontSize: 15, fontWeight: 600 }}>
        Tales × Deivid
      </div>
      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
        {linhas.map((l) => (
          <div key={l.nome} className="p-3" style={{ border: `1px solid ${LINE}`, borderRadius: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{l.nome}</div>
            <div style={{ fontSize: 12, color: TEXT_MUTED }}>{l.qtdPedidos} pedido(s)</div>
            <div style={{ fontSize: 12, color: TEXT_MUTED }}>{l.entregues} entregue(s)</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 10 }}>
        Sem valores em R$ ainda — só contagem, até a comissão do Deivid ficar definida.
      </div>
    </Card>
  );
}

function CatalogoModelos({ modelos, onAdicionar, onAtualizar, onRemover }) {
  const [novo, setNovo] = useState({ modelo: "", material: "", cor: "", numeracao: "", local: "" });

  async function adicionar() {
    if (!novo.modelo.trim() || !novo.material.trim() || !novo.cor.trim() || !novo.numeracao.trim()) return;
    await onAdicionar(novo);
    setNovo({ modelo: "", material: "", cor: "", numeracao: "", local: "" });
  }

  return (
    <Card style={{ padding: 20 }}>
      <div className="fx-serif mb-3" style={{ fontSize: 15, fontWeight: 600 }}>
        Catálogo — modelos disponíveis
      </div>
      <div className="table-wrap" style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
          <thead>
            <tr>
              {["Modelo", "Material", "Cor", "Nº", "Local", ""].map((h) => (
                <th key={h} style={{ textAlign: "left", color: TEXT_MUTED, fontWeight: 600, fontSize: 11, padding: "0 8px 8px", borderBottom: `1px solid ${LINE}` }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {modelos.map((m) => (
              <tr key={m.id}>
                {["modelo", "material", "cor", "numeracao", "local"].map((campo) => (
                  <td key={campo} style={{ padding: "6px 8px", borderBottom: `1px solid ${LINE}` }}>
                    <input
                      style={{ ...inputStyle, padding: "4px 7px", fontSize: 12, minWidth: campo === "local" ? 130 : 70 }}
                      defaultValue={m[campo]}
                      onBlur={(e) => e.target.value !== m[campo] && onAtualizar(m.id, campo, e.target.value)}
                    />
                  </td>
                ))}
                <td style={{ padding: "6px 8px", borderBottom: `1px solid ${LINE}` }}>
                  <button onClick={() => onRemover(m.id)} title="Remover">
                    <Trash2 size={13} color={TEXT_MUTED} />
                  </button>
                </td>
              </tr>
            ))}
            <tr>
              {["modelo", "material", "cor", "numeracao", "local"].map((campo) => (
                <td key={campo} style={{ padding: "6px 8px" }}>
                  <input
                    style={{ ...inputStyle, padding: "4px 7px", fontSize: 12, minWidth: campo === "local" ? 130 : 70 }}
                    placeholder={campo === "numeracao" ? "42" : campo === "local" ? "Showroom Schuck" : "novo"}
                    value={novo[campo]}
                    onChange={(e) => setNovo({ ...novo, [campo]: e.target.value })}
                  />
                </td>
              ))}
              <td style={{ padding: "6px 8px" }}>
                <button onClick={adicionar} title="Adicionar">
                  <Plus size={15} color={BRASS} />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export default function PainelSapatos({ pedidos, modelos, onAtualizarCampo, onRemoverPedido, onAdicionarModelo, onAtualizarModelo, onRemoverModelo }) {
  const mesAtual = hojeISO().slice(0, 7);
  const emAberto = useMemo(() => (pedidos || []).filter((p) => p.status !== "Entregue"), [pedidos]);
  const entreguesNoMes = useMemo(
    () => (pedidos || []).filter((p) => p.status === "Entregue" && (p.dataEntrega || "").slice(0, 7) === mesAtual),
    [pedidos, mesAtual]
  );
  const personalizados = (pedidos || []).filter((p) => p.personalizacao.trim());

  return (
    <div>
      <PageTitle eyebrow="Parceria com fornecedor" title="Painel Sapatos" />

      <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
        <StatCard label="Pedidos em aberto" value={emAberto.length} icon={Footprints} />
        <StatCard label="Entregues no mês" value={entreguesNoMes.length} icon={CheckCircle2} accent={VERDE} />
        <StatCard label="Personalizados" value={`${personalizados.length}/${(pedidos || []).length}`} icon={Footprints} />
      </div>

      <Card style={{ padding: 20 }} className="mb-6">
        <div className="fx-serif mb-3" style={{ fontSize: 16, fontWeight: 600 }}>
          Pedidos
        </div>
        {(pedidos || []).length === 0 ? (
          <Empty texto="Nenhum pedido de sapato ainda." />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
              <thead>
                <tr>
                  {["Cliente", "Modelo", "Nº", "Personalização", "Vendedor", "Status", "Previsão", "Valor da venda", ""].map((h) => (
                    <th key={h} style={{ textAlign: "left", color: TEXT_MUTED, fontWeight: 600, fontSize: 11, padding: "0 8px 8px", borderBottom: `1px solid ${LINE}` }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pedidos.map((p) => (
                  <tr key={p.id}>
                    <td style={{ padding: "8px", borderBottom: `1px solid ${LINE}` }}>{p.cliente}</td>
                    <td style={{ padding: "8px", borderBottom: `1px solid ${LINE}` }}>
                      {p.modelo}
                      <div style={{ fontSize: 11, color: TEXT_MUTED }}>
                        {p.material} · {p.cor}
                      </div>
                    </td>
                    <td className="fx-mono" style={{ padding: "8px", borderBottom: `1px solid ${LINE}` }}>
                      {p.numeracao}
                    </td>
                    <td style={{ padding: "8px", borderBottom: `1px solid ${LINE}` }}>{p.personalizacao || "—"}</td>
                    <td style={{ padding: "8px", borderBottom: `1px solid ${LINE}` }}>
                      <Pill text={p.vendedor} style={p.vendedor === "Deivid" ? { bg: "#DFE6EC", fg: "#3D5A73" } : undefined} />
                    </td>
                    <td style={{ padding: "8px", borderBottom: `1px solid ${LINE}` }}>
                      <select
                        style={{ ...inputStyle, padding: "4px 7px", fontSize: 12 }}
                        value={p.status}
                        onChange={(e) => onAtualizarCampo(p.id, "status", e.target.value)}
                      >
                        {STATUS_SAPATOS.map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: "8px", borderBottom: `1px solid ${LINE}` }}>
                      <input
                        type="date"
                        style={{ ...inputStyle, padding: "4px 7px", fontSize: 12 }}
                        value={p.previsaoEntrega}
                        onChange={(e) => onAtualizarCampo(p.id, "previsaoEntrega", e.target.value)}
                      />
                    </td>
                    <td style={{ padding: "8px", borderBottom: `1px solid ${LINE}` }}>
                      <input
                        type="number"
                        step="0.01"
                        style={{ ...inputStyle, padding: "4px 7px", fontSize: 12, width: 100 }}
                        placeholder="a definir"
                        value={p.valorVenda}
                        onChange={(e) => onAtualizarCampo(p.id, "valorVenda", e.target.value)}
                      />
                    </td>
                    <td style={{ padding: "8px", borderBottom: `1px solid ${LINE}` }}>
                      <button onClick={() => onRemoverPedido(p.id)} title="Remover">
                        <Trash2 size={14} color={TEXT_MUTED} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="grid gap-6 mb-6" style={{ gridTemplateColumns: "1fr 1.3fr" }}>
        <ComparativoVendedores pedidos={pedidos} />
        <CatalogoModelos modelos={modelos} onAdicionar={onAdicionarModelo} onAtualizar={onAtualizarModelo} onRemover={onRemoverModelo} />
      </div>
    </div>
  );
}
