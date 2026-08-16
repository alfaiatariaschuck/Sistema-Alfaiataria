import React, { useEffect, useRef, useState } from "react";
import { X, Printer } from "lucide-react";
import { CARACTERISTICAS_TRAJE, MEDIDAS_ALFAIATARIA, PECA_SECOES, inputStyle } from "../lib/constants";
import { fmtData, hojeISO } from "../lib/helpers";
import { supabase } from "../supabaseClient";

const CHAVE_TELEFONE_ICARO = "telefone_icaro";

export default function FichaImprimivelAlfaiataria({ peca: p, onFechar }) {
  const [telefone, setTelefone] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("config").select("valor").eq("chave", CHAVE_TELEFONE_ICARO).maybeSingle();
      if (data?.valor) setTelefone(data.valor);
    })();
  }, []);

  const secoes = PECA_SECOES[p.tipoPeca] || [];
  const temCorpo = secoes.includes("corpo");

  function imprimir() {
    window.print();
  }

  function textoFicha() {
    const linhas = [];
    linhas.push(`*FICHA DE PRODUÇÃO — ${p.tipoPeca.toUpperCase()}*`);
    linhas.push(`Cliente: ${p.cliente || "—"}`);
    linhas.push(`Status: ${p.status}`);
    if (p.previsaoEntrega) linhas.push(`Previsão de entrega: ${fmtData(p.previsaoEntrega)}`);
    secoes.forEach((secKey) => {
      const valores = Object.entries(p.medidas?.[secKey] || {}).filter(([, v]) => v);
      if (valores.length) {
        linhas.push(``);
        linhas.push(`*${MEDIDAS_ALFAIATARIA[secKey].titulo}*`);
        valores.forEach(([k, v]) => linhas.push(`${k}: ${v} cm`));
      }
    });
    if (temCorpo) {
      const caract = Object.entries(p.caracteristicas || {}).filter(([, v]) => v);
      if (caract.length) {
        linhas.push(``);
        linhas.push(`*Características*`);
        caract.forEach(([k, v]) => linhas.push(`${k}: ${v}`));
      }
    }
    const tecidosComCodigo = (p.tecidos || []).filter((t) => t.codigo);
    if (tecidosComCodigo.length) {
      linhas.push(``);
      linhas.push(`*Tecido*`);
      tecidosComCodigo.forEach((t) => linhas.push(`Código ${t.codigo} · Qtd ${t.qtd}${t.numero ? " · Obs: " + t.numero : ""}`));
    }
    if (p.observacoes) {
      linhas.push(``);
      linhas.push(`*Observações*`);
      linhas.push(p.observacoes);
    }
    return linhas.join("\n");
  }

  const [mostrarTexto, setMostrarTexto] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (mostrarTexto && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [mostrarTexto]);

  function abrirWhatsapp() {
    const digitos = telefone.replace(/\D/g, "");
    const mensagem = encodeURIComponent(
      `Oi Icaro! Segue a ficha de produção do pedido de ${p.cliente || "cliente"}. ` +
        `Salvei o PDF aqui — vou anexar em seguida nesta conversa. ✂️`
    );
    const url = digitos ? `https://wa.me/${digitos}?text=${mensagem}` : `https://wa.me/?text=${mensagem}`;
    window.open(url, "_blank");
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(22,33,46,0.6)", zIndex: 50, overflow: "auto" }}>
      <div className="no-print" style={{ maxWidth: 720, margin: "0 auto", padding: "16px 16px 0" }}>
        <div style={{ background: "#FFF", borderRadius: 10, padding: 16, marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, color: "#16212E" }}>Opção mais simples (funciona em qualquer lugar)</div>
          <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 8 }}>
            Toque no botão, o texto da ficha já aparece selecionado — é só tocar em "Copiar" no menu que surge, e colar no WhatsApp do Icaro.
          </div>
          <button
            onClick={() => setMostrarTexto((v) => !v)}
            className="flex items-center gap-2 mb-2"
            style={{ background: "#25D366", color: "#FFF", padding: "10px 18px", borderRadius: 8, fontWeight: 600, fontSize: 13 }}
          >
            📋 {mostrarTexto ? "Ocultar texto da ficha" : "Ver e copiar texto da ficha"}
          </button>
          {mostrarTexto && (
            <textarea
              ref={textareaRef}
              readOnly
              value={textoFicha()}
              onClick={(e) => e.target.select()}
              style={{ ...inputStyle, minHeight: 220, fontSize: 12, marginBottom: 16 }}
              className="fx-mono"
            />
          )}

          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: "#16212E" }}>
            Opção em PDF (funciona melhor no computador ou no navegador do celular)
          </div>
          {telefone ? (
            <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 10 }}>
              WhatsApp configurado: <strong style={{ color: "#16212E" }}>{telefone}</strong>
            </div>
          ) : (
            <div style={{ fontSize: 12, color: "#9C4A1E", marginBottom: 10 }}>
              Número do Icaro ainda não configurado — configure uma vez em <strong>Configurações</strong> no menu, e não precisa digitar de novo.
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={imprimir}
              className="flex items-center gap-2"
              style={{ background: "#16212E", color: "#FFF", padding: "9px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13 }}
            >
              <Printer size={15} /> 1. Salvar como PDF
            </button>
            <button
              onClick={abrirWhatsapp}
              className="flex items-center gap-2"
              style={{ background: "#25D366", color: "#FFF", padding: "9px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13 }}
            >
              2. Abrir WhatsApp
            </button>
            <button
              onClick={onFechar}
              style={{ background: "transparent", border: `1px solid #E4DECF`, color: "#16212E", padding: "9px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13 }}
            >
              <X size={14} className="inline mr-1" /> Fechar
            </button>
          </div>
        </div>
      </div>

      <div id="ficha-print" style={{ background: "#FFF", maxWidth: 720, margin: "0 auto 40px", padding: 40, color: "#111", fontFamily: "'Inter', sans-serif" }}>
        <div style={{ borderBottom: "2px solid #111", paddingBottom: 12, marginBottom: 20 }}>
          <div className="fx-serif" style={{ fontSize: 22, fontWeight: 700 }}>
            Ficha de Produção — {p.tipoPeca}
          </div>
          <div style={{ fontSize: 12, color: "#555" }}>Gerado em {fmtData(hojeISO())}</div>
        </div>

        <div className="grid gap-2 mb-3" style={{ gridTemplateColumns: "1fr 1fr", fontSize: 13 }}>
          <div>
            <strong>Cliente:</strong> {p.cliente || "—"}
          </div>
          <div>
            <strong>Status:</strong> {p.status}
          </div>
          <div>
            <strong>Data do pedido:</strong> {fmtData(p.dataPedido)}
          </div>
          <div>
            <strong>Previsão de entrega:</strong> {fmtData(p.previsaoEntrega)}
          </div>
        </div>

        {secoes.map((secKey) => {
          const sec = MEDIDAS_ALFAIATARIA[secKey];
          const campos = sec.campos.filter((c) => p.medidas?.[secKey]?.[c.label]);
          return (
            <div key={secKey}>
              <div className="fx-serif mb-2" style={{ fontSize: 15, fontWeight: 700, borderBottom: "1px solid #ccc", paddingBottom: 4 }}>
                {sec.titulo}
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginBottom: 20 }}>
                <tbody>
                  {sec.campos.map((campo, i) => (
                    <tr key={campo.label} style={{ background: i % 2 === 0 ? "#F7F5EF" : "#FFF" }}>
                      <td style={{ padding: "5px 8px", fontWeight: 600 }}>{campo.label}</td>
                      <td style={{ padding: "5px 8px" }}>{p.medidas?.[secKey]?.[campo.label] ? `${p.medidas[secKey][campo.label]} cm` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}

        {temCorpo && (
          <>
            <div className="fx-serif mb-2" style={{ fontSize: 15, fontWeight: 700, borderBottom: "1px solid #ccc", paddingBottom: 4 }}>
              Características
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginBottom: 20 }}>
              <tbody>
                {CARACTERISTICAS_TRAJE.map((campo, i) => (
                  <tr key={campo.label} style={{ background: i % 2 === 0 ? "#F7F5EF" : "#FFF" }}>
                    <td style={{ padding: "5px 8px", fontWeight: 600, width: "40%" }}>{campo.label}</td>
                    <td style={{ padding: "5px 8px" }}>{p.caracteristicas?.[campo.label] || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        <div className="fx-serif mb-2" style={{ fontSize: 15, fontWeight: 700, borderBottom: "1px solid #ccc", paddingBottom: 4 }}>
          Tecido
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginBottom: 20 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "5px 8px", borderBottom: "1px solid #111" }}>Código</th>
              <th style={{ textAlign: "left", padding: "5px 8px", borderBottom: "1px solid #111" }}>Qtd</th>
              <th style={{ textAlign: "left", padding: "5px 8px", borderBottom: "1px solid #111" }}>Observação</th>
            </tr>
          </thead>
          <tbody>
            {(p.tecidos || []).filter((t) => t.codigo).map((t, i) => (
              <tr key={i}>
                <td style={{ padding: "5px 8px" }}>{t.codigo}</td>
                <td style={{ padding: "5px 8px" }}>{t.qtd}</td>
                <td style={{ padding: "5px 8px" }}>{t.numero || "—"}</td>
              </tr>
            ))}
            {(p.tecidos || []).filter((t) => t.codigo).length === 0 && (
              <tr>
                <td colSpan={3} style={{ padding: "5px 8px", color: "#888" }}>
                  Nenhum tecido informado.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {p.observacoes && (
          <>
            <div className="fx-serif mb-2" style={{ fontSize: 15, fontWeight: 700, borderBottom: "1px solid #ccc", paddingBottom: 4 }}>
              Observações
            </div>
            <div style={{ fontSize: 12, whiteSpace: "pre-wrap" }}>{p.observacoes}</div>
          </>
        )}
      </div>
    </div>
  );
}
