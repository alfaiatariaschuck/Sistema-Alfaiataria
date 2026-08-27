import React, { useEffect, useState } from "react";
import { BRASS, CANVAS, ETAPAS_ACOMPANHAMENTO_ALFAIATARIA, ETAPAS_ACOMPANHAMENTO_CAMISARIA, INK, INK_SOFT, LINE, TEXT_MUTED } from "../lib/constants";
import { fmtData, statusParaEtapa } from "../lib/helpers";
import { supabase } from "../supabaseClient";

const VERDE = "#2C6E31";

// Página pública (sem login) de acompanhamento do pedido — o link que o
// dono manda pro cliente pelo WhatsApp. Busca os dados via uma função
// (RPC) que devolve só o essencial (nome, status, previsão de entrega),
// nunca valores ou dados pessoais.
export default function AcompanharPedido({ tipo, id }) {
  const [dados, setDados] = useState(undefined); // undefined = carregando, null = não encontrado

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("acompanhar_pedido", { p_tipo: tipo, p_id: id });
      setDados(data && data[0] ? data[0] : null);
    })();
  }, [tipo, id]);

  const etapas = tipo === "alfaiataria" ? ETAPAS_ACOMPANHAMENTO_ALFAIATARIA : ETAPAS_ACOMPANHAMENTO_CAMISARIA;

  return (
    <div style={{ background: CANVAS, minHeight: "100vh", fontFamily: "'Inter', sans-serif", color: INK }} className="flex items-start justify-center px-4 py-10">
      <div style={{ maxWidth: 440, width: "100%" }}>
        <div className="text-center mb-8">
          <div className="fx-serif" style={{ fontSize: 22, fontWeight: 700, color: INK }}>
            Schuck
          </div>
          <div style={{ fontSize: 11, color: TEXT_MUTED, letterSpacing: 2 }}>ALFAIATARIA</div>
        </div>

        {dados === undefined && <div className="text-center" style={{ color: TEXT_MUTED, fontSize: 14 }}>Carregando…</div>}

        {dados === null && (
          <div style={{ background: "#FFF", border: `1px solid ${LINE}`, borderRadius: 14, padding: 24, textAlign: "center" }}>
            <div style={{ fontSize: 14, color: TEXT_MUTED }}>Não encontramos esse pedido. Verifique o link ou fale direto com a gente.</div>
          </div>
        )}

        {dados && <ConteudoAcompanhamento dados={dados} tipo={tipo} etapas={etapas} />}
      </div>
    </div>
  );
}

function ConteudoAcompanhamento({ dados, tipo, etapas }) {
  const primeiroNome = (dados.cliente || "").trim().split(" ")[0] || "cliente";
  const { label, percentual, finalizado } = statusParaEtapa(tipo, dados.status);
  const produto = tipo === "alfaiataria" ? dados.tipo_peca || "peça" : "camisa";

  return (
    <div style={{ background: "#FFF", border: `1px solid ${LINE}`, borderRadius: 14, padding: 26 }}>
      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Olá, {primeiroNome}! 👋</div>
      <div style={{ fontSize: 13, color: TEXT_MUTED, marginBottom: 22 }}>Aqui está o andamento do(a) seu(sua) {produto.toLowerCase()}.</div>

      <div className="flex justify-between mb-1" style={{ fontSize: 13, fontWeight: 700, color: finalizado ? VERDE : BRASS }}>
        <span>
          {finalizado ? "Entregue! 🎉" : percentual >= 100 ? `${label} 🎉` : label}
        </span>
        <span>{percentual}%</span>
      </div>
      <div style={{ background: LINE, borderRadius: 999, height: 10, marginBottom: 26 }}>
        <div style={{ width: `${percentual}%`, background: finalizado ? VERDE : BRASS, height: 10, borderRadius: 999, transition: "width .3s" }} />
      </div>

      <div className="mb-6">
        {etapas.map((e, i) => {
          const concluida = finalizado || percentual > e.percentual;
          const atual = !finalizado && percentual === e.percentual;
          return (
            <div key={e.status} className="flex items-center gap-3 mb-3">
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 999,
                  background: concluida ? VERDE : atual ? BRASS : "#EDEAE0",
                  color: concluida || atual ? "#FFF" : TEXT_MUTED,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {concluida ? "✓" : i + 1}
              </div>
              <span style={{ fontSize: 13, fontWeight: atual ? 700 : 500, color: atual ? INK : concluida ? INK_SOFT : TEXT_MUTED }}>{e.label}</span>
            </div>
          );
        })}
      </div>

      <div style={{ background: "#F3EEDF", borderRadius: 10, padding: 14, fontSize: 13 }}>
        {finalizado ? (
          "Já entregamos o seu pedido — obrigado pela confiança! 🙏"
        ) : dados.previsao_entrega ? (
          <>
            Previsão de entrega: <strong>{fmtData(dados.previsao_entrega)}</strong>
          </>
        ) : (
          "Ainda não temos uma data exata, mas já avisamos assim que tivermos! 😊"
        )}
      </div>
    </div>
  );
}
