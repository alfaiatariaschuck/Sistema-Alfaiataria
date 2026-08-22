import React, { useEffect, useState } from "react";
import { Card, Field, PageTitle } from "../components/ui";
import { CampoDescricao } from "../components/CampoComOpcoes";
import { CampoPagamento } from "../components/CampoPagamento";
import { ControleVozMedidas } from "../components/ControleVozMedidas";
import { BRASS, BRASS_SOFT, DESC_CAMPOS, FORMAS_PAGAMENTO, FORNECEDORES_TECIDO, INK, INK_SOFT, LINE, MEDIDA_LABELS, TEXT_MUTED, inputStyle, rotuloMedida } from "../lib/constants";
import { finalDaMedida, statusDividido, totalDividido } from "../lib/helpers";
import { pedidoVazio } from "../hooks/usePedidos";

export default function NovoPedido({ onSalvar, onSalvarPlano, nomesClientes }) {
  const [p, setP] = useState(pedidoVazio());
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(null);

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
      if (p.assinatura) {
        await onSalvarPlano(p);
      } else {
        await onSalvar(p);
      }
    } catch (e) {
      setErro("Não consegui salvar (" + e.message + "). Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div>
      <PageTitle eyebrow="Novo lançamento" title="Pedido Camisas" />
      <form onSubmit={submeter}>
        <Card style={{ padding: 20 }} className="mb-5">
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
            <Field label="Cliente">
              <input
                style={inputStyle}
                list="lista-clientes"
                value={p.cliente}
                onChange={(e) => set("cliente", e.target.value)}
                placeholder="Nome do cliente"
                required
              />
              <datalist id="lista-clientes">
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
              <span style={{ fontSize: 10, color: TEXT_MUTED }}>
                Detectado automaticamente pelo nome — toque pra corrigir se precisar. Vai marcado na ficha da Fabi.
              </span>
            </Field>
            <Field label="Vendedor">
              <input style={inputStyle} value={p.vendedor} onChange={(e) => set("vendedor", e.target.value)} />
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
            <Field label="Valor Fabiana (R$)">
              <input
                type="number"
                step="0.01"
                style={inputStyle}
                value={p.pagoFabiana.valor}
                onChange={(e) => set("pagoFabiana", { ...p.pagoFabiana, valor: e.target.value })}
              />
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

          <label className="flex items-center gap-2 mt-4" style={{ cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={!!p.assinatura}
              onChange={(e) => set("assinatura", e.target.checked)}
              style={{ width: 16, height: 16, accentColor: BRASS }}
            />
            <span style={{ fontSize: 13, fontWeight: 600 }}>📦 Este pedido é de um Plano de Assinatura (recorrente)</span>
          </label>
          {p.assinatura && (
            <div className="mt-2 p-3" style={{ background: BRASS_SOFT, borderRadius: 8, fontSize: 12, color: INK_SOFT }}>
              Ao salvar, isso não vira um pedido — cria um <strong>Plano de Assinatura</strong> novo (fica guardado
              na aba Planos de Assinatura, sem entrar no painel geral). Depois, todo mês, você entra lá e clica em
              "Emitir pedido do mês" pra gerar o pedido de verdade pra Fabi.
            </div>
          )}
        </Card>

        <Card style={{ padding: 20 }} className="mb-5">
          <div className="fx-serif mb-3" style={{ fontSize: 16, fontWeight: 600 }}>
            Medidas (cm)
          </div>
          <ControleVozMedidas onMedida={setMedida} />
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
            {MEDIDA_LABELS.map((label) => {
              const fin = finalDaMedida(label, p.medidas[label]);
              return (
                <Field key={label} label={rotuloMedida(label)}>
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
          <div style={{ fontSize: 11, color: TEXT_MUTED }} className="mb-3">
            O campo "Fornecedor" é só de uso interno — nunca aparece na ficha impressa pra Fabi.
          </div>
          <datalist id="lista-fornecedores">
            {FORNECEDORES_TECIDO.map((f) => (
              <option key={f} value={f} />
            ))}
          </datalist>
          {p.tecidos.map((t, i) => (
            <div key={i} className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2 pb-2" style={{ borderBottom: `1px solid ${LINE}` }}>
              <input style={inputStyle} placeholder="Código" value={t.codigo} onChange={(e) => setTecido(i, "codigo", e.target.value)} />
              <input
                style={{ ...inputStyle, background: BRASS_SOFT }}
                list="lista-fornecedores"
                placeholder="Fornecedor (interno)"
                value={t.fornecedor}
                onChange={(e) => setTecido(i, "fornecedor", e.target.value)}
              />
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
          {salvando ? "Salvando…" : p.assinatura ? "Salvar Plano de Assinatura" : "Salvar Pedido"}
        </button>
      </form>
    </div>
  );
}
