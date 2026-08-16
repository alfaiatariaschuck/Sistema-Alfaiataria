import React, { useState } from "react";
import { Card, Field, PageTitle } from "../components/ui";
import { CampoComOpcoes } from "../components/CampoComOpcoes";
import { CampoPagamento } from "../components/CampoPagamento";
import {
  BRASS,
  BRASS_SOFT,
  CARACTERISTICAS_TRAJE,
  FORMAS_PAGAMENTO,
  INK,
  LINE,
  MEDIDAS_ALFAIATARIA,
  PECA_SECOES,
  STATUS,
  TEXT_MUTED,
  TIPOS_PECA,
  inputStyle,
} from "../lib/constants";
import { statusDividido, totalDividido } from "../lib/helpers";
import { pecaVazia } from "../hooks/usePedidosAlfaiataria";

export default function PedidoAlfaiataria({ onCriar, nomesClientes }) {
  const [novaPeca, setNovaPeca] = useState(pecaVazia());
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(null);

  function setMedida(secKey, label, valor) {
    setNovaPeca((prev) => ({
      ...prev,
      medidas: { ...prev.medidas, [secKey]: { ...prev.medidas[secKey], [label]: valor } },
    }));
  }
  function setCaracteristica(label, valor) {
    setNovaPeca((prev) => ({ ...prev, caracteristicas: { ...prev.caracteristicas, [label]: valor } }));
  }
  function setPagamento(patch) {
    setNovaPeca((prev) => {
      const next = { ...prev, ...patch };
      if (next.pagamentoDividido) {
        next.valorVenda = totalDividido(next.valorEntrada, next.valorRestante);
        next.statusPagamentoVenda = statusDividido(next.statusEntrada, next.statusRestante, "Recebido");
      }
      return next;
    });
  }
  function setTecido(i, campo, valor) {
    setNovaPeca((prev) => {
      const t = [...prev.tecidos];
      t[i] = { ...t[i], [campo]: valor };
      return { ...prev, tecidos: t };
    });
  }
  function addTecido() {
    setNovaPeca((prev) => ({ ...prev, tecidos: [...prev.tecidos, { codigo: "", qtd: 1, numero: "", fornecedor: "", comprado: false }] }));
  }

  async function submeter(e) {
    e.preventDefault();
    if (!novaPeca.cliente.trim()) return;
    setSalvando(true);
    setErro(null);
    try {
      await onCriar(novaPeca);
      setNovaPeca(pecaVazia());
    } catch (e) {
      setErro("Não consegui salvar (" + e.message + "). Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div>
      <PageTitle eyebrow="Novo lançamento — produção: Icaro" title="Pedido Alfaiataria" />

      <Card style={{ padding: 16 }} className="mb-6">
        <p style={{ fontSize: 13, color: "#2A3B4D", lineHeight: 1.6 }}>
          Escolha o tipo de peça abaixo — o formulário mostra automaticamente as medidas e características
          certas pra cada uma (traje completo inclui corpo, calça e colete; peças avulsas mostram só o que for relevante).
          Depois de salvar, a peça aparece na aba <strong>Pedidos Alfaiataria</strong>.
        </p>
      </Card>

      <form onSubmit={submeter}>
        <Card style={{ padding: 20 }} className="mb-5">
          <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
            <Field label="Cliente">
              <input
                style={inputStyle}
                list="lista-clientes-alfaiataria"
                value={novaPeca.cliente}
                required
                onChange={(e) => setNovaPeca({ ...novaPeca, cliente: e.target.value })}
              />
              <datalist id="lista-clientes-alfaiataria">
                {(nomesClientes || []).map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
            </Field>
            <Field label="Tipo de peça">
              <select style={inputStyle} value={novaPeca.tipoPeca} onChange={(e) => setNovaPeca({ ...novaPeca, tipoPeca: e.target.value })}>
                {TIPOS_PECA.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </Field>
            <Field label="Data">
              <input type="date" style={inputStyle} value={novaPeca.dataPedido} onChange={(e) => setNovaPeca({ ...novaPeca, dataPedido: e.target.value })} />
            </Field>
            <Field label="Previsão de entrega">
              <input
                type="date"
                style={inputStyle}
                value={novaPeca.previsaoEntrega}
                onChange={(e) => setNovaPeca({ ...novaPeca, previsaoEntrega: e.target.value })}
              />
            </Field>
            <Field label="Status">
              <select style={inputStyle} value={novaPeca.status} onChange={(e) => setNovaPeca({ ...novaPeca, status: e.target.value })}>
                {STATUS.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="Valor devido ao Icaro (R$)">
              <input
                type="number"
                step="0.01"
                style={inputStyle}
                placeholder="preencher depois, se preferir"
                value={novaPeca.valorTotal}
                onChange={(e) => setNovaPeca({ ...novaPeca, valorTotal: e.target.value })}
              />
            </Field>
            <Field label="Valor pago (R$)">
              <input
                type="number"
                step="0.01"
                style={inputStyle}
                placeholder="preencher depois, se preferir"
                value={novaPeca.pago}
                onChange={(e) => setNovaPeca({ ...novaPeca, pago: e.target.value })}
              />
            </Field>
          </div>

          <div className="mt-4 pt-4 mb-4" style={{ borderTop: `1px solid ${LINE}` }}>
            <div className="fx-serif mb-2" style={{ fontSize: 14, fontWeight: 600 }}>
              Valor de venda (cliente)
            </div>
            <Field label="Forma de pagamento">
              <select style={inputStyle} value={novaPeca.formaPagamento} onChange={(e) => setNovaPeca({ ...novaPeca, formaPagamento: e.target.value })}>
                <option value="">Selecione</option>
                {FORMAS_PAGAMENTO.map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>
            </Field>
            <CampoPagamento
              labelValor="Valor de venda (R$)"
              labelPago="Recebido"
              valor={novaPeca.valorVenda}
              statusPagamento={novaPeca.statusPagamentoVenda}
              onValor={(v) => setNovaPeca({ ...novaPeca, valorVenda: v })}
              onStatus={(v) => setNovaPeca({ ...novaPeca, statusPagamentoVenda: v })}
              dividido={novaPeca.pagamentoDividido}
              onToggleDividido={(v) => setPagamento({ pagamentoDividido: v })}
              valorEntrada={novaPeca.valorEntrada}
              statusEntrada={novaPeca.statusEntrada}
              onValorEntrada={(v) => setPagamento({ valorEntrada: v })}
              onStatusEntrada={(v) => setPagamento({ statusEntrada: v })}
              valorRestante={novaPeca.valorRestante}
              statusRestante={novaPeca.statusRestante}
              onValorRestante={(v) => setPagamento({ valorRestante: v })}
              onStatusRestante={(v) => setPagamento({ statusRestante: v })}
            />
          </div>

          {(PECA_SECOES[novaPeca.tipoPeca] || []).map((secKey) => {
            const sec = MEDIDAS_ALFAIATARIA[secKey];
            return (
              <div key={secKey} className="mb-4">
                <div className="fx-serif mb-2" style={{ fontSize: 14, fontWeight: 600, color: BRASS }}>
                  {sec.titulo}
                </div>
                <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
                  {sec.campos.map((campo) => (
                    <Field key={campo.label} label={campo.label}>
                      <input
                        type="number"
                        step="0.5"
                        style={inputStyle}
                        value={novaPeca.medidas[secKey]?.[campo.label] || ""}
                        onChange={(e) => setMedida(secKey, campo.label, e.target.value)}
                      />
                      {campo.obs && <span style={{ fontSize: 10, color: TEXT_MUTED }}>{campo.obs}</span>}
                    </Field>
                  ))}
                </div>
              </div>
            );
          })}

          {(PECA_SECOES[novaPeca.tipoPeca] || []).includes("corpo") && (
            <div className="mb-4">
              <div className="fx-serif mb-2" style={{ fontSize: 14, fontWeight: 600, color: BRASS }}>
                Características
              </div>
              <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
                {CARACTERISTICAS_TRAJE.map((campo) => (
                  <CampoComOpcoes
                    key={campo.label}
                    label={campo.label}
                    opcoes={campo.opcoes}
                    obs={campo.obs}
                    valor={novaPeca.caracteristicas[campo.label] || ""}
                    onChange={(v) => setCaracteristica(campo.label, v)}
                  />
                ))}
              </div>
            </div>
          )}
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
            O campo "Fornecedor" é só de uso interno — nunca aparece na mensagem enviada pro Icaro.
          </div>
          {novaPeca.tecidos.map((t, i) => (
            <div key={i} className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2 pb-2" style={{ borderBottom: `1px solid ${LINE}` }}>
              <input style={inputStyle} placeholder="Código" value={t.codigo} onChange={(e) => setTecido(i, "codigo", e.target.value)} />
              <input
                style={{ ...inputStyle, background: BRASS_SOFT }}
                placeholder="Fornecedor (interno)"
                value={t.fornecedor}
                onChange={(e) => setTecido(i, "fornecedor", e.target.value)}
              />
              <input type="number" style={inputStyle} placeholder="Qtd" value={t.qtd} onChange={(e) => setTecido(i, "qtd", e.target.value)} />
              <input style={inputStyle} placeholder="Observação" value={t.numero} onChange={(e) => setTecido(i, "numero", e.target.value)} />
            </div>
          ))}
        </Card>

        <Card style={{ padding: 20 }} className="mb-5">
          <Field label="Observações">
            <textarea
              style={{ ...inputStyle, minHeight: 90 }}
              placeholder="Detalhes da peça pro Icaro (ex: acabamento, ajustes específicos, preferências do cliente...)"
              value={novaPeca.observacoes}
              onChange={(e) => setNovaPeca({ ...novaPeca, observacoes: e.target.value })}
            />
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
          {salvando ? "Salvando…" : "Salvar Peça"}
        </button>
      </form>
    </div>
  );
}
