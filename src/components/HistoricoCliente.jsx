import React, { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, MessageSquarePlus } from "lucide-react";
import { BRASS, INK, LINE, TEXT_MUTED, inputStyle } from "../lib/constants";
import { fmtData } from "../lib/helpers";
import { adicionarHistoricoCliente } from "../lib/clientes";
import { supabase } from "../supabaseClient";

const VERMELHO = "#9C4A1E";
const VERDE = "#2C6E31";

// Cadência de pós-venda do Manual de Vendas Schuck (seção 11) — cada
// marco é contado a partir da ÚLTIMA COMPRA do cliente, não da primeira.
const MARCOS_POS_VENDA = [
  { chave: "d1", dias: 1, label: "D+1", acao: "Confirmar recebimento e satisfação" },
  { chave: "d15", dias: 15, label: "D+15", acao: "Perguntar como está usando" },
  { chave: "d60_90", dias: 60, label: "D+60–90", acao: "Retomar e identificar nova necessidade" },
  { chave: "6_meses", dias: 182, label: "6 meses", acao: "Revisar guarda-roupa / nova oportunidade" },
  { chave: "12_meses", dias: 365, label: "12 meses", acao: "Reativação e planejamento de novas peças" },
];

function diasEntreHojeE(dataISO) {
  const hoje = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00");
  const d = new Date(dataISO + "T00:00:00");
  return Math.floor((hoje.getTime() - d.getTime()) / 86400000);
}

// Timeline de observações do cliente (histórico livre + marcos de
// pós-venda executados) e, quando há uma última compra pra referenciar,
// um checklist de pós-venda (D+1, D+15, D+60-90, 6 meses, 12 meses) —
// cada marco alerta quando chega a hora e "some" (vira feito) quando o
// vendedor confirma que executou. Usado tanto na ficha do dono quanto
// na do vendedor (RLS: qualquer login autenticado grava/lê).
export default function HistoricoCliente({ clienteId, ultimaCompraData }) {
  const [historico, setHistorico] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [texto, setTexto] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function recarregar() {
    if (!clienteId) {
      setCarregando(false);
      return;
    }
    const { data } = await supabase
      .from("clientes_historico")
      .select("*")
      .eq("cliente_id", clienteId)
      .order("criado_em", { ascending: false });
    setHistorico(data || []);
    setCarregando(false);
  }

  useEffect(() => {
    setCarregando(true);
    recarregar();
    // eslint-disable-next-line
  }, [clienteId]);

  async function adicionar(texto, marco = null) {
    setSalvando(true);
    try {
      await adicionarHistoricoCliente(clienteId, texto, marco);
      await recarregar();
    } finally {
      setSalvando(false);
    }
  }

  async function salvarObservacao() {
    if (!texto.trim()) return;
    await adicionar(texto.trim());
    setTexto("");
  }

  function marcoConcluido(chave) {
    if (!ultimaCompraData) return false;
    return historico.some((h) => h.marco === chave && h.criado_em >= ultimaCompraData);
  }

  const diasDesdeCompra = ultimaCompraData ? diasEntreHojeE(ultimaCompraData) : null;

  if (!clienteId) return null;

  return (
    <div>
      {ultimaCompraData && (
        <div className="mb-4">
          <div className="fx-serif mb-2" style={{ fontSize: 13, fontWeight: 600 }}>
            Pós-venda desde a última compra ({fmtData(ultimaCompraData)})
          </div>
          <div className="flex flex-col gap-1.5">
            {MARCOS_POS_VENDA.map((m) => {
              const feito = marcoConcluido(m.chave);
              const chegouAHora = diasDesdeCompra >= m.dias;
              const pendente = chegouAHora && !feito;
              return (
                <div
                  key={m.chave}
                  className="flex items-center justify-between gap-2 py-1.5 px-2"
                  style={{
                    borderRadius: 6,
                    background: pendente ? "#F7EAE3" : feito ? "#EAF3EA" : "transparent",
                    opacity: !chegouAHora && !feito ? 0.55 : 1,
                  }}
                >
                  <div className="flex items-center gap-2" style={{ fontSize: 12 }}>
                    {feito ? (
                      <CheckCircle2 size={14} color={VERDE} />
                    ) : pendente ? (
                      <AlertTriangle size={14} color={VERMELHO} />
                    ) : (
                      <Clock size={14} color={TEXT_MUTED} />
                    )}
                    <span style={{ fontWeight: 600 }}>{m.label}</span>
                    <span style={{ color: TEXT_MUTED }}>{m.acao}</span>
                  </div>
                  {!feito && chegouAHora && (
                    <button
                      onClick={() => adicionar(`${m.label} — ${m.acao} (feito)`, m.chave)}
                      disabled={salvando}
                      style={{ fontSize: 11, fontWeight: 600, color: BRASS, textDecoration: "underline", flexShrink: 0 }}
                    >
                      Marcar feito
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="fx-serif mb-2" style={{ fontSize: 13, fontWeight: 600 }}>
        Histórico / observações
      </div>
      <div className="flex items-center gap-2 mb-3">
        <input
          style={inputStyle}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Ex: prefere colarinho italiano, trabalha no centro, gostou do último atendimento..."
          onKeyDown={(e) => e.key === "Enter" && salvarObservacao()}
        />
        <button
          onClick={salvarObservacao}
          disabled={salvando || !texto.trim()}
          className="flex items-center gap-1"
          style={{ background: INK, color: "#FFF", padding: "9px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, flexShrink: 0 }}
        >
          <MessageSquarePlus size={13} /> Adicionar
        </button>
      </div>

      {carregando ? (
        <div style={{ fontSize: 12, color: TEXT_MUTED }}>Carregando…</div>
      ) : historico.length === 0 ? (
        <div style={{ fontSize: 12, color: TEXT_MUTED }}>Nenhuma observação registrada ainda.</div>
      ) : (
        <div>
          {historico.map((h, i) => (
            <div key={h.id} className="py-1.5" style={{ borderBottom: i < historico.length - 1 ? `1px solid ${LINE}` : "none", fontSize: 12 }}>
              <div style={{ color: TEXT_MUTED, fontSize: 10 }}>{fmtData(h.criado_em.slice(0, 10))}</div>
              <div>{h.texto}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
