import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Printer } from "lucide-react";
import { DESC_LABELS, INK, MEDIDA_LABELS, inputStyle, rotuloMedida } from "../lib/constants";
import { finalDaMedida, fmtData, hojeISO } from "../lib/helpers";
import { imprimirComNome } from "../lib/imprimirFicha";
import { supabase } from "../supabaseClient";

const CHAVE_TELEFONE_FABI = "telefone_fabi";
const CHAVE_TELEFONE_MILENA = "telefone_milena";

const TABELA_ESTILO = { width: "100%", borderCollapse: "collapse", border: `2px solid ${INK}`, fontSize: 14 };
const CELULA_ESTILO = { border: `1px solid ${INK}`, padding: "5px 11px", textAlign: "left" };
const CABECALHO_ESTILO = { ...CELULA_ESTILO, background: INK, color: "#F5F1E8", fontSize: 11.5, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" };

// Bloco de "destaque" no topo da ficha (status, prazo, quantidade...) —
// tamanho de célula de planilha, bem maior que o texto corrido, pra dar
// pra ler de relance sem precisar aproximar o olho da folha.
function CelulaDestaque({ label, valor, destaque, ultima, valorFontSize = 19 }) {
  return (
    <div style={{ padding: "6px 10px 6px", borderRight: ultima ? "none" : `1px solid ${INK}`, background: destaque ? "#F3E9D8" : "#FFF" }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: destaque ? "#7A5A2E" : "#6B7280", marginBottom: 4 }}>
        {label}
      </div>
      <div className="fx-serif" style={{ fontSize: valorFontSize, fontWeight: 600, color: destaque ? "#A9793E" : INK, lineHeight: 1.15 }}>
        {valor}
      </div>
    </div>
  );
}

function TituloSecao({ children, primeira }) {
  return (
    <div className="fx-serif" style={{ fontSize: 17, fontWeight: 600, margin: primeira ? "0 0 4px" : "8px 0 4px", paddingBottom: 4, borderBottom: `2px solid ${INK}` }}>
      {children}
    </div>
  );
}

// Metade da tabela de medidas — em duas colunas lado a lado, não numa
// lista corrida só, pra caber tudo numa folha A4 mesmo com letra maior.
function TabelaMedidas({ labels, medidas, nomeCosteira }) {
  return (
    <table style={TABELA_ESTILO}>
      <thead>
        <tr>
          <th style={CABECALHO_ESTILO}>Medida</th>
          <th style={CABECALHO_ESTILO}>Tirei</th>
          <th style={CABECALHO_ESTILO}>Final p/ {nomeCosteira}</th>
        </tr>
      </thead>
      <tbody>
        {labels.map((label, i) => {
          const bruto = medidas[label];
          const fin = finalDaMedida(label, bruto);
          return (
            <tr key={label} style={{ background: i % 2 === 0 ? "#F7F5EF" : "#FFF" }}>
              <td style={{ ...CELULA_ESTILO, fontWeight: 700 }}>{rotuloMedida(label)}</td>
              <td style={{ ...CELULA_ESTILO, fontFamily: "'IBM Plex Mono', monospace" }}>{bruto !== "" && bruto != null ? `${bruto} cm` : "—"}</td>
              <td style={{ ...CELULA_ESTILO, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace", background: "#F3E9D8", color: "#6B4A1E" }}>
                {fin !== null ? `${fin} cm` : "—"}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default function FichaImprimivel({ pedido: p, onFechar, onMarcarEnviado }) {
  const [telefone, setTelefone] = useState("");
  const nomeCosteira = p.costureira === "Milena" ? "Milena" : "Fabi";

  useEffect(() => {
    (async () => {
      const chave = p.costureira === "Milena" ? CHAVE_TELEFONE_MILENA : CHAVE_TELEFONE_FABI;
      const { data } = await supabase.from("config").select("valor").eq("chave", chave).maybeSingle();
      if (data?.valor) setTelefone(data.valor);
      else setTelefone("");
    })();
  }, [p.costureira]);

  function imprimir() {
    imprimirComNome(`Ficha - ${p.cliente || "cliente"}`);
    onMarcarEnviado && onMarcarEnviado();
  }

  function textoFicha() {
    const linhas = [];
    linhas.push(`*FICHA DE PRODUÇÃO — CAMISA*`);
    linhas.push(`Cliente: ${p.cliente || "—"}`);
    linhas.push(`Status: ${p.status}`);
    linhas.push(`Previsão de entrega: ${fmtData(p.previsaoEntrega)}`);
    linhas.push(`Quantidade: ${p.quantidade}`);
    if (p.recompra) linhas.push(`Cliente: RECOMPRA (já tem pedido anterior)`);
    if (p.medidasNovas) linhas.push(`⚠️ MEDIDAS NOVAS — NÃO usar medida de pedido anterior`);
    linhas.push(``);
    linhas.push(`*Medidas (cm) — tirei → final*`);
    MEDIDA_LABELS.forEach((label) => {
      const bruto = p.medidas[label];
      const fin = finalDaMedida(label, bruto);
      if (fin !== null) linhas.push(`${rotuloMedida(label)}: ${bruto} cm → ${fin} cm`);
    });
    linhas.push(``);
    linhas.push(`*Características*`);
    DESC_LABELS.forEach((label) => {
      if (p.descricao[label]) linhas.push(`${label}: ${p.descricao[label]}`);
    });
    const tecidosComCodigo = p.tecidos.filter((t) => t.codigo);
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
      `Oi ${nomeCosteira}! Segue a ficha de produção do pedido de ${p.cliente || "cliente"}. ` +
        `Salvei o PDF aqui — vou anexar em seguida nesta conversa. 🧵`
    );
    const url = digitos ? `https://wa.me/${digitos}?text=${mensagem}` : `https://wa.me/?text=${mensagem}`;
    window.open(url, "_blank");
    onMarcarEnviado && onMarcarEnviado();
  }

  // Portal direto pra <body>, fora da árvore do app — assim, na hora de
  // imprimir, dá pra sumir com o app inteiro (#root) sem que a altura
  // dele (mesmo invisível) sobre como um monte de página em branco antes
  // ou depois da ficha (ver @media print em index.css).
  return createPortal(
    <div className="ficha-overlay" style={{ position: "fixed", inset: 0, background: "rgba(22,33,46,0.6)", zIndex: 50, overflow: "auto" }}>
      <div className="no-print" style={{ maxWidth: 720, margin: "0 auto", padding: "16px 16px 0" }}>
        <div style={{ background: "#FFF", borderRadius: 10, padding: 16, marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, color: "#16212E" }}>Opção mais simples (funciona em qualquer lugar)</div>
          <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 8 }}>
            Toque no botão, o texto da ficha já aparece selecionado — é só tocar em "Copiar" no menu que surge, e colar no WhatsApp da {nomeCosteira}.
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
              Número da {nomeCosteira} ainda não configurado — configure uma vez em <strong>Configurações</strong> no menu, e não precisa digitar de novo.
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

      <div id="ficha-print" style={{ background: "#FFF", maxWidth: 720, margin: "0 auto 40px", padding: 40, color: INK, fontFamily: "'Inter', sans-serif" }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#A9793E" }}>
          Schuck Alfaiataria · Ficha de Produção — Camisaria
        </div>
        <div
          className="flex items-baseline justify-between flex-wrap gap-3"
          style={{ borderBottom: `3px solid ${INK}`, paddingBottom: 10, margin: "8px 0 3px" }}
        >
          <div className="fx-serif" style={{ fontSize: 38, fontWeight: 600, lineHeight: 1.05 }}>
            {p.cliente || "Sem nome"}
          </div>
          {p.recompra && (
            <span style={{ background: "#F3E9DA", color: "#7A5A2E", border: "1px solid #A9793E", borderRadius: 999, padding: "5px 14px", fontSize: 13, fontWeight: 700, whiteSpace: "nowrap" }}>
              ↻ Recompra
            </span>
          )}
        </div>
        <div className="flex justify-between flex-wrap gap-2" style={{ fontSize: 12, color: "#6B7280", marginBottom: 12 }}>
          <span>Gerado em {fmtData(hojeISO())}</span>
          <span>
            Ficha para: <strong style={{ color: INK }}>{nomeCosteira}</strong>
          </span>
        </div>

        {p.medidasNovas && (
          <div style={{ background: "#FBE1D6", border: "2px solid #9C4A1E", borderRadius: 8, padding: "6px 14px", marginBottom: 8, fontSize: 14, fontWeight: 700, color: "#9C4A1E" }}>
            ⚠ MEDIDAS NOVAS — cliente atualizou as medidas, NÃO usar a medida do pedido anterior
          </div>
        )}

        <div
          className="grid"
          style={{ gridTemplateColumns: "repeat(5, 1fr)", border: `2px solid ${INK}`, borderRadius: 6, overflow: "hidden", marginBottom: 14 }}
        >
          <CelulaDestaque label="Status" valor={p.status} />
          <CelulaDestaque label="Data do pedido" valor={fmtData(p.dataPedido)} />
          <CelulaDestaque label="Previsão entrega" valor={fmtData(p.previsaoEntrega)} destaque />
          <CelulaDestaque label="Quantidade" valor={`${p.quantidade} un`} destaque />
          <CelulaDestaque label="Vendedor" valor={p.vendedor || "—"} valorFontSize={16} ultima />
        </div>

        <TituloSecao primeira>Medidas (cm)</TituloSecao>
        <div className="grid gap-2" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <TabelaMedidas labels={MEDIDA_LABELS.slice(0, Math.ceil(MEDIDA_LABELS.length / 2))} medidas={p.medidas} nomeCosteira={nomeCosteira} />
          <TabelaMedidas labels={MEDIDA_LABELS.slice(Math.ceil(MEDIDA_LABELS.length / 2))} medidas={p.medidas} nomeCosteira={nomeCosteira} />
        </div>

        <TituloSecao>Características</TituloSecao>
        <table style={TABELA_ESTILO}>
          <tbody>
            {DESC_LABELS.map((label, i) => (
              <tr key={label} style={{ background: i % 2 === 0 ? "#F7F5EF" : "#FFF" }}>
                <td style={{ ...CELULA_ESTILO, fontWeight: 700, width: "38%" }}>{label}</td>
                <td style={CELULA_ESTILO}>{p.descricao[label] || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <TituloSecao>Tecido</TituloSecao>
        <table style={TABELA_ESTILO}>
          <thead>
            <tr>
              <th style={CABECALHO_ESTILO}>Código</th>
              <th style={CABECALHO_ESTILO}>Qtd</th>
              <th style={CABECALHO_ESTILO}>Observação</th>
            </tr>
          </thead>
          <tbody>
            {p.tecidos.filter((t) => t.codigo).map((t, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? "#F7F5EF" : "#FFF" }}>
                <td style={CELULA_ESTILO}>{t.codigo}</td>
                <td style={CELULA_ESTILO}>{t.qtd}</td>
                <td style={CELULA_ESTILO}>{t.numero || "—"}</td>
              </tr>
            ))}
            {p.tecidos.filter((t) => t.codigo).length === 0 && (
              <tr>
                <td colSpan={3} style={{ ...CELULA_ESTILO, color: "#888" }}>
                  Nenhum tecido informado.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {p.observacoes && (
          <>
            <TituloSecao>Observações</TituloSecao>
            <div style={{ fontSize: 13.5, lineHeight: 1.4, whiteSpace: "pre-wrap", border: `2px solid ${INK}`, padding: "6px 10px", background: "#F7F5EF" }}>
              {p.observacoes}
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
