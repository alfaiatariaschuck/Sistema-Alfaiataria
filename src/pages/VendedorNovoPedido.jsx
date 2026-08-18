import React, { useEffect, useState } from "react";
import { Card, Field, PageTitle } from "../components/ui";
import { CampoDescricao } from "../components/CampoComOpcoes";
import { CampoPagamento } from "../components/CampoPagamento";
import { BRASS, BRASS_SOFT, DESC_CAMPOS, FORMAS_PAGAMENTO, INK, INK_SOFT, LINE, MEDIDA_LABELS, TEXT_MUTED, inputStyle } from "../lib/constants";
import { finalDaMedida, statusDividido, totalDividido } from "../lib/helpers";
import { pedidoVazio } from "../hooks/usePedidos";

// Ficha de pedido enxuta pro vendedor: mesma coisa que a ficha completa
// de Pedido Camisas, mas sem os campos que não são da alçada dele —
// valor pago à Fabiana (custo interno) e Plano de Assinatura (decisão
// do dono). O nome do vendedor vem travado do login, não é editável.
export default function VendedorNovoPedido({ onSalvar, nomesClientes, nomeVendedor }) {
  const [p, setP] = useState({ ...pedidoVazio(), vendedor: nomeVendedor || "" });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(null);
  const [confirmado, setConfirmado] = useState(false);

  function set(campo, valor) {
    setP((prev) => ({ ...prev, [campo]: valor }));
  }
  function setMedida(label, valor) {
    setP((prev) => ({ ...prev, medidas: { ...prev.medidas, [label]: valor } }));
  }
  function setDesc(label, valor) {
    setP((prev) => ({ ...prev, descricao: { ...prev.descricao, [label]: valor } }));
  }
  function setTecido(i, campo, valor) {
    setP((prev) => {
      const t = [...prev.tecidos];
      t[i] = { ...t[i], [campo]: valor };
      return { ...prev, tecidos: t };
    });
  }
  function addTecido() {
    setP((prev) => ({ ...prev, tecidos: [...prev.tecidos, { codigo: "", qtd: 1, numero: "", fornecedor: "", comprado: false }] }));
  }
  function setPagamento(patch) {
    setP((prev) => {
      const next = { ...prev, ...patch };
      if (next.pagamentoDividido) {
        next.aReceber = {
          valor: totalDividido(next.valorEntrada, next.valorRestante),
          statusPagamento: statusDividido(next.statusEntrada, next.statusRestante, "Recebido"),
        };
      }
      return next;
    });
  }

  useEffect(() => {
    const detectado = nomesClientes.some((n) => n.toLowerCase() === p.cliente.trim().toLowerCase());
    setP((prev) => ({ ...prev, recompra: detectado }));
    // eslint-disable-next-line
  }, [p.cliente]);

  async function submeter(e) {
    e.preventDefault();
    if (!p.cliente.trim()) return;
    setSalvando(true);
    setErro(null);
    try {
      await onSalvar(p);
      setP({ ...pedidoVazio(), vendedor: nomeVendedor || "" });
      setConfirmado(true);
      setTimeout(() => setConfirmado(false), 4000);
    } catch (e) {
      setErro("Não consegui salvar (" + e.message + "). Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div>
      <PageTitle eyebrow={`Vendedor: ${nomeVendedor || "—"}`} title="Novo Pedido de Camisa" />

      {confirmado && (
        <div className="mb-5 px-4 py-3 rounded" style={{ background: "#DCEBDD", color: "#2C6E31", fontSize: 13, fontWeight: 600 }}>
          ✓ Pedido lançado! Já apareceu pro dono do ateliê.
        </div>
      )}

      <form onSubmit={submeter}>
        <Card style={{ padding: 20 }} className="mb-5">
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
            <Field label="Cliente">
              <input
                style={inputStyle}
                list="lista-clientes-vendedor"
                value={p.cliente}
                onChange={(e) => set("cliente", e.target.value)}
                placeholder="Nome do cliente"
                required
              />
              <datalist id="lista-clientes-vendedor">
                {nomesClientes.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
            </Field>
            <Field label="Tipo de cliente">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => set("recompra", false)}
                  className="flex-1"
                  style={{
                    padding: "8px 10px",
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 600,
                    background: !p.recompra ? INK : "#EDEAE0",
                    color: !p.recompra ? "#FFF" : INK_SOFT,
                    border: `1px solid ${!p.recompra ? INK : LINE}`,
                  }}
                >
                  Novo
                </button>
                <button
                  type="button"
                  onClick={() => set("recompra", true)}
                  className="flex-1"
                  style={{
                    padding: "8px 10px",
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 600,
                    background: p.recompra ? BRASS : "#EDEAE0",
                    color: p.recompra ? "#FFF" : INK_SOFT,
                    border: `1px solid ${p.recompra ? BRASS : LINE}`,
                  }}
                >
                  ↻ Recompra
                </button>
              </div>
              <span style={{ fontSize: 10, color: TEXT_MUTED }}>Detectado automaticamente pelo nome — toque pra corrigir se precisar.</span>
            </Field>
            <Field label="Data do pedido">
              <input type="date" style={inputStyle} value={p.dataPedido} onChange={(e) => set("dataPedido", e.target.value)} />
            </Field>
            <Field label="Previsão de entrega">
              <input type="date" style={inputStyle} value={p.previsaoEntrega} onChange={(e) => set("previsaoEntrega", e.target.value)} />
            </Field>
            <Field label="Quantidade">
              <input type="number" min="1" style={inputStyle} value={p.quantidade} onChange={(e) => set("quantidade", e.target.value)} />
            </Field>
            <Field label="Forma de pagamento">
              <select style={inputStyle} value={p.formaPagamento} onChange={(e) => set("formaPagamento", e.target.value)}>
                <option value="">Selecione</option>
                {FORMAS_PAGAMENTO.map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${LINE}` }}>
            <div className="fx-serif mb-2" style={{ fontSize: 14, fontWeight: 600 }}>
              Valor a receber do cliente
            </div>
            <CampoPagamento
              labelValor="Valor a receber (R$)"
              labelPago="Recebido"
              valor={p.aReceber.valor}
              statusPagamento={p.aReceber.statusPagamento}
              onValor={(v) => set("aReceber", { ...p.aReceber, valor: v })}
              onStatus={(v) => set("aReceber", { ...p.aReceber, statusPagamento: v })}
              dividido={p.pagamentoDividido}
              onToggleDividido={(v) => setPagamento({ pagamentoDividido: v })}
              valorEntrada={p.valorEntrada}
              statusEntrada={p.statusEntrada}
              onValorEntrada={(v) => setPagamento({ valorEntrada: v })}
              onStatusEntrada={(v) => setPagamento({ statusEntrada: v })}
              valorRestante={p.valorRestante}
              statusRestante={p.statusRestante}
              onValorRestante={(v) => setPagamento({ valorRestante: v })}
              onStatusRestante={(v) => setPagamento({ statusRestante: v })}
            />
          </div>
        </Card>

        <Card style={{ padding: 20 }} className="mb-5">
          <div className="fx-serif mb-3" style={{ fontSize: 16, fontWeight: 600 }}>
            Medidas (cm)
          </div>
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
            {MEDIDA_LABELS.map((label) => {
              const fin = finalDaMedida(label, p.medidas[label]);
              return (
                <Field key={label} label={label}>
                  <input
                    type="number"
                    step="0.5"
                    style={inputStyle}
                    value={p.medidas[label]}
                    onChange={(e) => setMedida(label, e.target.value)}
                    placeholder="medido"
                  />
                  {fin !== null && (
                    <span className="fx-mono" style={{ fontSize: 11, color: BRASS }}>
                      final: {fin} cm
                    </span>
                  )}
                </Field>
              );
            })}
          </div>
        </Card>

        <Card style={{ padding: 20 }} className="mb-5">
          <div className="fx-serif mb-3" style={{ fontSize: 16, fontWeight: 600 }}>
            Características
          </div>
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
            {DESC_CAMPOS.map((campo) => (
              <CampoDescricao key={campo.label} campo={campo} valor={p.descricao[campo.label]} onChange={(v) => setDesc(campo.label, v)} />
            ))}
          </div>
        </Card>

        <Card style={{ padding: 20 }} className="mb-5">
          <div className="flex items-center justify-between mb-1">
            <div className="fx-serif" style={{ fontSize: 16, fontWeight: 600 }}>
              Tecido
            </div>
            <button type="button" onClick={addTecido} style={{ color: BRASS, fontSize: 13, fontWeight: 600 }}>
              + adicionar item
            </button>
          </div>
          {p.tecidos.map((t, i) => (
            <div key={i} className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-2 pb-2" style={{ borderBottom: `1px solid ${LINE}` }}>
              <input style={inputStyle} placeholder="Código" value={t.codigo} onChange={(e) => setTecido(i, "codigo", e.target.value)} />
              <input type="number" style={inputStyle} placeholder="Qtd" value={t.qtd} onChange={(e) => setTecido(i, "qtd", e.target.value)} />
              <input
                style={inputStyle}
                placeholder="Observação (ex: colarinho windsor)"
                value={t.numero}
                onChange={(e) => setTecido(i, "numero", e.target.value)}
              />
            </div>
          ))}
        </Card>

        <Card style={{ padding: 20 }} className="mb-5">
          <Field label="Observações">
            <textarea style={{ ...inputStyle, minHeight: 70 }} value={p.observacoes} onChange={(e) => set("observacoes", e.target.value)} />
          </Field>
        </Card>

        {erro && (
          <div className="mb-4 px-4 py-3 rounded" style={{ background: "#F6E3D9", color: "#9C4A1E", fontSize: 13 }}>
            {erro}
          </div>
        )}

        <button
          type="submit"
          disabled={salvando}
          style={{ background: INK, color: "#FFF", padding: "10px 22px", borderRadius: 8, fontWeight: 600, fontSize: 14, opacity: salvando ? 0.7 : 1 }}
        >
          {salvando ? "Salvando…" : "Lançar Pedido"}
        </button>
      </form>
    </div>
  );
}
