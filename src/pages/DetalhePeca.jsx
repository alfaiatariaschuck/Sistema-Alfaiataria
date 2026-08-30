import React, { useState } from "react";
import { CheckCircle2, Clock, Printer, Save, Trash2 } from "lucide-react";
import { Card, Field, Pill } from "../components/ui";
import { CampoComOpcoes } from "../components/CampoComOpcoes";
import { CampoPagamento } from "../components/CampoPagamento";
import AvisarClienteWhatsapp from "../components/AvisarClienteWhatsapp";
import CopiarDadosContabilidade from "../components/CopiarDadosContabilidade";
import LinkAcompanhamento from "../components/LinkAcompanhamento";
import { ControleVozMedidas } from "../components/ControleVozMedidas";
import {
  BRASS,
  BRASS_SOFT,
  CARACTERISTICAS_TRAJE,
  FORMAS_PAGAMENTO,
  FORNECEDORES_TECIDO,
  LINE,
  MEDIDAS_ALFAIATARIA,
  PECA_SECOES,
  STATUS_ALFAIATARIA,
  STATUS_STYLE,
  TEXT_MUTED,
  inputStyle,
} from "../lib/constants";
import { brl, diasEsperaCliente, diasProducaoReal, fmtData, hojeISO, previsaoEfetivaDe, previsaoEstimada, statusDividido, statusEvento, statusParaEtapa, totalDividido } from "../lib/helpers";
import { aliasesDeCampos } from "../lib/vozMedidas";
import FichaImprimivelAlfaiataria from "./FichaImprimivelAlfaiataria";

function statusPagamentoDe(p) {
  const total = parseFloat(p.valorTotal) || 0;
  const pago = parseFloat(p.pago) || 0;
  if (total > 0 && pago >= total) return "Pago";
  if (pago > 0) return "Parcial";
  return "Pendente";
}
const STATUS_PAGAMENTO_STYLE = {
  Pago: { bg: "#DCEBDD", fg: "#2C6E31" },
  Parcial: { bg: "#FCEFC7", fg: "#8A6A0C" },
  Pendente: { bg: "#F6E3D9", fg: "#9C4A1E" },
};
const NOME_SECAO = { corpo: "Paletó", calca: "Calça", colete: "Colete" };

export default function DetalhePeca({
  peca: p,
  onVoltar,
  onCampo,
  onPausar,
  onRetomar,
  onDesfazerInicio,
  mediaDiasPorTipo,
  previsoesFila,
  onMedida,
  onCaracteristica,
  onResponsavelSecao,
  onRemover,
  onAddTecido,
  onTecido,
}) {
  const [mostrarFicha, setMostrarFicha] = useState(false);
  const [confirmado, setConfirmado] = useState(false);
  const [notaPausa, setNotaPausa] = useState("");
  const sugestaoPrevisao = p.dataInicioProducao ? previsaoEstimada(p, mediaDiasPorTipo?.(p.tipoPeca)) : previsoesFila?.get(p.id) || null;
  const previsaoEfetivaAtual = previsaoEfetivaDe(p, sugestaoPrevisao);
  const statusEventoAtual = statusEvento({ ...p, previsaoEfetiva: previsaoEfetivaAtual });

  function set(campo, valor) {
    onCampo(p.id, campo, valor);
  }

  function salvar() {
    setConfirmado(true);
    setTimeout(() => setConfirmado(false), 2500);
  }
  function setPagamento(patch) {
    Object.entries(patch).forEach(([k, v]) => set(k, v));
    const next = { ...p, ...patch };
    if (next.pagamentoDividido) {
      set("valorVenda", totalDividido(next.valorEntrada, next.valorRestante));
      set("statusPagamentoVenda", statusDividido(next.statusEntrada, next.statusRestante, "Recebido"));
    }
  }

  const total = parseFloat(p.valorTotal) || 0;
  const pago = parseFloat(p.pago) || 0;
  const saldo = total - pago;

  return (
    <div>
      <button onClick={onVoltar} className="mb-4 flex items-center gap-1" style={{ color: BRASS, fontSize: 13, fontWeight: 600 }}>
        ← voltar para pedidos de alfaiataria
      </button>
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="uppercase" style={{ color: BRASS, fontSize: 11, letterSpacing: 1.5, fontWeight: 600 }}>
            {p.tipoPeca}
          </div>
          <div className="flex items-center gap-2">
            <h1 className="fx-serif" style={{ fontSize: 26, fontWeight: 600 }}>
              {p.cliente}
            </h1>
            <Pill text={p.status} style={STATUS_STYLE[p.status]} />
            {p.medidasNovas && <Pill text="⚠ Medidas Novas" style={{ bg: "#F6E3D9", fg: "#9C4A1E" }} />}
            {!p.enviadoIcaro && <Pill text="📨 Não enviado pro Icaro" style={{ bg: "#DCE4EE", fg: "#2E4A6B" }} />}
          </div>
        </div>
        <button
          onClick={() => {
            if (confirm("Excluir este lançamento?")) onRemover(p.id);
          }}
          className="flex items-center gap-1"
          style={{ color: "#9C4A1E", fontSize: 13 }}
        >
          <Trash2 size={14} /> Excluir
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-6">
        <button
          onClick={() => setMostrarFicha(true)}
          className="flex items-center gap-2"
          style={{ background: "#25D366", color: "#FFF", padding: "9px 18px", borderRadius: 8, fontWeight: 600, fontSize: 13 }}
        >
          <Printer size={15} /> Gerar ficha em PDF (para o Icaro)
        </button>
        <button
          type="button"
          onClick={() => set("enviadoIcaro", !p.enviadoIcaro)}
          style={{
            background: p.enviadoIcaro ? "transparent" : "#DCE4EE",
            border: `1px solid ${p.enviadoIcaro ? LINE : "#2E4A6B"}`,
            color: "#2E4A6B",
            padding: "9px 14px",
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          {p.enviadoIcaro ? "↺ Marcar como não enviado" : "✓ Marcar como enviado pro Icaro"}
        </button>
        <CopiarDadosContabilidade
          clienteId={p.clienteId}
          nomeCliente={p.cliente}
          produto={p.tipoPeca}
          valorVenda={p.valorVenda}
          dataVenda={p.dataPedido}
        />
        <LinkAcompanhamento tipo="alfaiataria" pedidoId={p.id} />
      </div>

      {mostrarFicha && (
        <FichaImprimivelAlfaiataria peca={p} onFechar={() => setMostrarFicha(false)} onMarcarEnviado={() => set("enviadoIcaro", true)} />
      )}

      <div className="grid gap-6" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <Card style={{ padding: 20 }}>
          <div className="fx-serif mb-3" style={{ fontSize: 15, fontWeight: 600 }}>
            Status da peça
          </div>
          <Field label="Status">
            <select style={inputStyle} value={p.status} onChange={(e) => set("status", e.target.value)}>
              {STATUS_ALFAIATARIA.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
          {(PECA_SECOES[p.tipoPeca] || []).length > 1 ? (
            <Field label="Responsável por parte">
              <div className="flex flex-col gap-2">
                {PECA_SECOES[p.tipoPeca].map((secKey) => (
                  <div key={secKey} className="flex items-center gap-2">
                    <span style={{ fontSize: 12, color: TEXT_MUTED, minWidth: 70 }}>{NOME_SECAO[secKey] || secKey}</span>
                    <input
                      style={inputStyle}
                      value={p.responsaveisSecoes?.[secKey] || ""}
                      onChange={(e) => onResponsavelSecao(p.id, secKey, e.target.value)}
                      placeholder="—"
                    />
                  </div>
                ))}
              </div>
            </Field>
          ) : (
            <Field label="Responsável">
              <input style={inputStyle} value={p.responsavel} onChange={(e) => set("responsavel", e.target.value)} placeholder="—" />
            </Field>
          )}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1" style={{ fontSize: 11, color: TEXT_MUTED }}>
              <span>{statusParaEtapa("alfaiataria", p.status).label}</span>
              <span className="fx-mono" style={{ fontWeight: 700, color: BRASS }}>
                {statusParaEtapa("alfaiataria", p.status).percentual}%
              </span>
            </div>
            <div style={{ background: LINE, borderRadius: 4, height: 8 }}>
              <div style={{ width: `${statusParaEtapa("alfaiataria", p.status).percentual}%`, background: BRASS, height: 8, borderRadius: 4 }} />
            </div>
          </div>
          <div className="mb-4 flex items-center gap-2 flex-wrap">
            {!p.dataInicioProducao ? (
              <>
                <button
                  onClick={() => set("dataInicioProducao", hojeISO())}
                  style={{ background: "#EDEAE0", color: BRASS, padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600 }}
                >
                  Marcar início da produção (hoje)
                </button>
                <span style={{ fontSize: 12, color: TEXT_MUTED }}>ou já em andamento:</span>
                <input
                  type="date"
                  onChange={(e) => e.target.value && set("dataInicioProducao", e.target.value)}
                  style={{ ...inputStyle, fontSize: 12, padding: "5px 8px", width: 140 }}
                  title="Peça já estava em produção? Coloque a data real de início"
                />
              </>
            ) : (
              <>
                <span style={{ fontSize: 12, color: TEXT_MUTED }}>Início:</span>
                <input
                  type="date"
                  value={p.dataInicioProducao}
                  onChange={(e) => e.target.value && set("dataInicioProducao", e.target.value)}
                  style={{ ...inputStyle, fontSize: 12, padding: "5px 8px", width: 140 }}
                  title="Corrigir data de início"
                />
                <span style={{ fontSize: 12, color: TEXT_MUTED }}>
                  · {p.status === "Entregue" ? "Tempo de produção:" : "Em produção há:"}{" "}
                  <strong style={{ color: "#16212E" }}>{diasProducaoReal(p)}d</strong>
                  {p.diasPausados > 0 && ` (${p.diasPausados}d pausados não contam`}
                  {p.diasPausados > 0 && diasEsperaCliente(p) > 0 && `, sendo ${diasEsperaCliente(p)}d esperando cliente pra prova`}
                  {p.diasPausados > 0 && ")"}
                </span>
                {p.status !== "Entregue" &&
                  (p.situacao === "Pausado" ? (
                    <button
                      onClick={() => onRetomar(p.id)}
                      style={{ background: "#DCEBDD", color: "#2C6E31", padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600 }}
                    >
                      Retomar produção
                    </button>
                  ) : (
                    <div className="flex flex-col gap-2" style={{ width: "100%" }}>
                      <input
                        style={{ ...inputStyle, fontSize: 12, padding: "6px 8px" }}
                        placeholder="Motivo da pausa (opcional) — ex: cliente viajou até dia 20"
                        value={notaPausa}
                        onChange={(e) => setNotaPausa(e.target.value)}
                      />
                      <button
                        onClick={() => {
                          onPausar(p.id, "outro", notaPausa);
                          setNotaPausa("");
                        }}
                        style={{ background: "#F6E3D9", color: "#9C4A1E", padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, alignSelf: "flex-start" }}
                      >
                        Pausar
                      </button>
                    </div>
                  ))}
                <button
                  onClick={() => onDesfazerInicio(p.id)}
                  title="Clicou em início por engano? Desfaz aqui."
                  style={{ color: TEXT_MUTED, fontSize: 11, textDecoration: "underline" }}
                >
                  desfazer início
                </button>
              </>
            )}
          </div>
          {p.pausas && p.pausas.length > 0 && (
            <div className="mb-4">
              <div style={{ fontSize: 11, fontWeight: 600, color: TEXT_MUTED, marginBottom: 6, textTransform: "uppercase" }}>
                Histórico de pausas
              </div>
              <div className="flex flex-col gap-2">
                {[...p.pausas]
                  .sort((a, b) => (b.dataInicio || "").localeCompare(a.dataInicio || ""))
                  .map((pa, i) => (
                    <div key={pa.id || i} style={{ background: "#F3EEDF", borderRadius: 6, padding: "8px 10px", fontSize: 12 }}>
                      <div className="flex items-center justify-between">
                        <span style={{ fontWeight: 600 }}>{pa.observacao || "Pausa sem motivo registrado"}</span>
                        <span style={{ color: TEXT_MUTED, whiteSpace: "nowrap" }}>
                          {fmtData(pa.dataInicio)} — {pa.dataFim ? fmtData(pa.dataFim) : "em andamento"}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
          {p.status === "Finalização" && (
            <div className="mb-4">
              <AvisarClienteWhatsapp
                clienteId={p.clienteId}
                nomeCliente={p.cliente}
                mensagem={`Oi ${p.cliente}! Sua ${p.tipoPeca?.toLowerCase() || "peça"} já está pronta — pode vir buscar quando quiser. 😊`}
              />
            </div>
          )}
          <Field label="Data do pedido">
            <input type="date" style={inputStyle} value={p.dataPedido} onChange={(e) => set("dataPedido", e.target.value)} />
          </Field>
          <Field label="Previsão de entrega">
            <input
              type="date"
              style={inputStyle}
              value={previsaoEfetivaAtual || ""}
              onChange={(e) => set("previsaoEntrega", e.target.value)}
            />
            {!p.previsaoManual && (
              <span style={{ fontSize: 10, color: TEXT_MUTED }}>
                estimativa automática — acompanha a fila/equipe sozinha, sem precisar editar
              </span>
            )}
          </Field>
          {p.previsaoManual && sugestaoPrevisao && sugestaoPrevisao !== p.previsaoEntrega && (
            <div
              className="flex items-center gap-2 mb-3 flex-wrap"
              style={{ background: "#FCEFC7", border: "1px solid #E6C97A", borderRadius: 8, padding: "10px 12px" }}
            >
              <span style={{ fontSize: 12, color: "#5A4200" }}>
                ⚠ Essa data foi travada manualmente e já não bate com a estimativa atual (<strong>{fmtData(sugestaoPrevisao)}</strong>).
              </span>
              <button
                onClick={() => set("previsaoEntrega", sugestaoPrevisao)}
                style={{ background: BRASS, color: "#FFF", padding: "5px 12px", borderRadius: 6, fontSize: 11, fontWeight: 700 }}
              >
                Atualizar pra essa data
              </button>
              <button
                onClick={() => set("previsaoEntrega", "")}
                style={{ background: "transparent", border: `1px solid ${BRASS}`, color: BRASS, padding: "5px 12px", borderRadius: 6, fontSize: 11, fontWeight: 700 }}
              >
                Voltar pro automático
              </button>
            </div>
          )}
          <Field label="Data limite (evento do cliente)">
            <input type="date" style={inputStyle} value={p.dataLimiteEvento || ""} onChange={(e) => set("dataLimiteEvento", e.target.value)} />
            <span style={{ fontSize: 10, color: TEXT_MUTED }}>Casamento, formatura etc — data que não pode passar. Deixe em branco se não houver.</span>
          </Field>
          {p.dataLimiteEvento && (statusEventoAtual === "atrasado" || statusEventoAtual === "risco") && (
            <div
              className="flex items-center gap-2 mb-3"
              style={{
                background: statusEventoAtual === "atrasado" ? "#FBE1D6" : "#FCEFC7",
                border: `1px solid ${statusEventoAtual === "atrasado" ? "#D98C5F" : "#E6C97A"}`,
                borderRadius: 8,
                padding: "10px 12px",
              }}
            >
              <span style={{ fontSize: 12, color: statusEventoAtual === "atrasado" ? "#9C4A1E" : "#5A4200" }}>
                {statusEventoAtual === "atrasado"
                  ? `🎉 Evento em ${fmtData(p.dataLimiteEvento)} — a previsão atual não bate, ou o prazo já passou. Prioriza essa peça.`
                  : `🎉 Evento chegando (${fmtData(p.dataLimiteEvento)}) — fica de olho mesmo estando no prazo.`}
              </span>
            </div>
          )}
        </Card>

        <Card style={{ padding: 20 }}>
          <div className="fx-serif mb-3" style={{ fontSize: 15, fontWeight: 600 }}>
            Financeiro (Icaro)
          </div>
          <div className="grid gap-3" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <Field label="Valor devido ao Icaro (R$)">
              <input type="number" step="0.01" style={inputStyle} value={p.valorTotal} onChange={(e) => set("valorTotal", e.target.value)} />
            </Field>
            <Field label="Valor pago (R$)">
              <input type="number" step="0.01" style={inputStyle} value={p.pago} onChange={(e) => set("pago", e.target.value)} />
            </Field>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="fx-mono" style={{ fontSize: 13, color: TEXT_MUTED }}>
              saldo {brl(saldo)}
            </span>
            <Pill text={statusPagamentoDe(p)} style={STATUS_PAGAMENTO_STYLE[statusPagamentoDe(p)]} />
          </div>
        </Card>
      </div>

      <Card style={{ padding: 20 }} className="mt-6">
        <div className="fx-serif mb-3" style={{ fontSize: 15, fontWeight: 600 }}>
          Financeiro (cliente)
        </div>
        <Field label="Forma de pagamento">
          <select style={inputStyle} value={p.formaPagamento || ""} onChange={(e) => set("formaPagamento", e.target.value)}>
            <option value="">Selecione</option>
            {FORMAS_PAGAMENTO.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </Field>
        <CampoPagamento
          labelValor="Valor de venda (R$)"
          labelPago="Recebido"
          valor={p.valorVenda}
          statusPagamento={p.statusPagamentoVenda}
          onValor={(v) => set("valorVenda", v)}
          onStatus={(v) => set("statusPagamentoVenda", v)}
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
      </Card>

      {(PECA_SECOES[p.tipoPeca] || []).length > 0 && (
        <div className="flex justify-end mt-6">
          <label className="flex items-center gap-1.5" style={{ fontSize: 12, color: p.medidasNovas ? "#9C4A1E" : TEXT_MUTED, cursor: "pointer" }}>
            <input type="checkbox" checked={!!p.medidasNovas} onChange={(e) => set("medidasNovas", e.target.checked)} style={{ width: 14, height: 14, accentColor: "#9C4A1E" }} />
            Medidas Novas (destaca na ficha do Icaro)
          </label>
        </div>
      )}

      {(PECA_SECOES[p.tipoPeca] || []).map((secKey) => {
        const sec = MEDIDAS_ALFAIATARIA[secKey];
        return (
          <Card key={secKey} style={{ padding: 20 }} className="mt-6">
            <div className="fx-serif mb-3" style={{ fontSize: 15, fontWeight: 600 }}>
              {sec.titulo}
            </div>
            <ControleVozMedidas aliases={aliasesDeCampos(sec.campos)} onMedida={(label, valor) => onMedida(p.id, secKey, label, valor)} />
            <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
              {sec.campos.map((campo) => (
                <Field key={campo.label} label={campo.label}>
                  <input
                    type="number"
                    step="0.5"
                    style={inputStyle}
                    value={p.medidas[secKey]?.[campo.label] || ""}
                    onChange={(e) => onMedida(p.id, secKey, campo.label, e.target.value)}
                  />
                  {campo.obs && <span style={{ fontSize: 10, color: TEXT_MUTED }}>{campo.obs}</span>}
                </Field>
              ))}
            </div>
          </Card>
        );
      })}

      {(PECA_SECOES[p.tipoPeca] || []).includes("corpo") && (
        <Card style={{ padding: 20 }} className="mt-6">
          <div className="fx-serif mb-3" style={{ fontSize: 15, fontWeight: 600 }}>
            Características
          </div>
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
            {CARACTERISTICAS_TRAJE.map((campo) => (
              <CampoComOpcoes
                key={campo.label}
                label={campo.label}
                opcoes={campo.opcoes}
                obs={campo.obs}
                valor={p.caracteristicas[campo.label] || ""}
                onChange={(v) => onCaracteristica(p.id, campo.label, v)}
              />
            ))}
          </div>
        </Card>
      )}

      <Card style={{ padding: 20 }} className="mt-6">
        <div className="flex items-center justify-between mb-1">
          <div className="fx-serif" style={{ fontSize: 15, fontWeight: 600 }}>
            Tecido
          </div>
          <button type="button" onClick={() => onAddTecido(p.id)} style={{ color: BRASS, fontSize: 13, fontWeight: 600 }}>
            + adicionar item
          </button>
        </div>
        <div style={{ fontSize: 11, color: TEXT_MUTED }} className="mb-3">
          "Fornecedor" é uso interno seu — nunca aparece na mensagem enviada pro Icaro. Marque "comprado" quando fechar a compra.
        </div>
        <datalist id="lista-fornecedores">
          {FORNECEDORES_TECIDO.map((f) => (
            <option key={f} value={f} />
          ))}
        </datalist>
        {p.tecidos.length === 0 && <div style={{ fontSize: 12, color: TEXT_MUTED }}>Nenhum tecido lançado ainda.</div>}
        {p.tecidos.map((t) => (
          <div key={t.id} className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-2 pb-2 items-center" style={{ borderBottom: `1px solid ${LINE}` }}>
            <input style={inputStyle} placeholder="Código" value={t.codigo} onChange={(e) => onTecido(p.id, t.id, "codigo", e.target.value)} />
            <input
              style={{ ...inputStyle, background: BRASS_SOFT }}
              list="lista-fornecedores"
              placeholder="Fornecedor (interno)"
              value={t.fornecedor || ""}
              onChange={(e) => onTecido(p.id, t.id, "fornecedor", e.target.value)}
            />
            <input type="number" style={inputStyle} placeholder="Qtd" value={t.qtd} onChange={(e) => onTecido(p.id, t.id, "qtd", e.target.value)} />
            <input style={inputStyle} placeholder="Observação" value={t.numero} onChange={(e) => onTecido(p.id, t.id, "numero", e.target.value)} />
            <button
              type="button"
              onClick={() => onTecido(p.id, t.id, "comprado", !t.comprado)}
              className="flex items-center justify-center gap-1"
              style={{
                background: t.comprado ? "#DCEBDD" : "#F6E3D9",
                color: t.comprado ? "#2C6E31" : "#9C4A1E",
                padding: "8px 10px",
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {t.comprado ? (
                <>
                  <CheckCircle2 size={13} /> Comprado
                </>
              ) : (
                <>
                  <Clock size={13} /> Comprar
                </>
              )}
            </button>
          </div>
        ))}
      </Card>

      <Card style={{ padding: 20 }} className="mt-6">
        <Field label="Observações (suas, pro Icaro)">
          <textarea
            style={{ ...inputStyle, minHeight: 90 }}
            placeholder="Detalhes da peça pro Icaro (ex: acabamento, ajustes específicos, preferências do cliente...)"
            value={p.observacoes || ""}
            onChange={(e) => set("observacoes", e.target.value)}
          />
        </Field>
        {p.observacoesProducao && (
          <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${LINE}` }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: TEXT_MUTED, marginBottom: 4 }}>Observações do Icaro:</div>
            <div style={{ fontSize: 13, whiteSpace: "pre-wrap" }}>{p.observacoesProducao}</div>
          </div>
        )}
      </Card>

      <div className="flex items-center gap-3 mt-6">
        <button
          onClick={salvar}
          className="flex items-center gap-2"
          style={{ background: confirmado ? "#2C6E31" : "#16212E", color: "#FFF", padding: "10px 22px", borderRadius: 8, fontWeight: 600, fontSize: 14 }}
        >
          <Save size={15} /> {confirmado ? "Salvo ✓" : "Salvar"}
        </button>
        {!confirmado && (
          <span style={{ fontSize: 12, color: TEXT_MUTED }}>Cada campo já é salvo sozinho assim que você edita — este botão é só pra confirmar.</span>
        )}
      </div>
    </div>
  );
}
