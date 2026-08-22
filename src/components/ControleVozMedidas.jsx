import React, { useEffect, useRef, useState } from "react";
import { AlertCircle, Mic, MicOff } from "lucide-react";
import { BRASS, TEXT_MUTED } from "../lib/constants";
import { parseComandoMedida } from "../lib/vozMedidas";

// Botão "ativa e fala": liga o microfone, você diz "nome da medida" +
// número (ex: "tórax cento e dois"), e ele preenche o campo certo.
// Experimental — funciona bem no Chrome/Android, é instável ou não
// funciona no Safari/iPhone. Sempre dá pra corrigir na mão depois.
export function ControleVozMedidas({ onMedida }) {
  const [escutando, setEscutando] = useState(false);
  const [ultimo, setUltimo] = useState(null);
  const [erro, setErro] = useState(null);
  const recognitionRef = useRef(null);
  const escutandoRef = useRef(false);

  const SR = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);

  useEffect(() => {
    return () => {
      escutandoRef.current = false;
      recognitionRef.current?.stop();
    };
  }, []);

  function ligar() {
    if (!SR) {
      setErro("Reconhecimento de voz não é suportado neste navegador. Funciona melhor no Chrome (Android/computador).");
      return;
    }
    const rec = new SR();
    rec.lang = "pt-BR";
    rec.continuous = true;
    rec.interimResults = false;

    rec.onresult = (e) => {
      const texto = e.results[e.results.length - 1][0].transcript;
      const resultado = parseComandoMedida(texto);
      if (resultado) {
        onMedida(resultado.label, resultado.valor);
        setUltimo({ ok: true, texto, label: resultado.label, valor: resultado.valor });
        setErro(null);
      } else {
        setUltimo({ ok: false, texto });
        setErro(`Não entendi "${texto}" — fala assim: "nome da medida" + número (ex: "manga 58").`);
      }
    };
    rec.onerror = (e) => {
      if (e.error === "no-speech" || e.error === "aborted") return;
      setErro("Erro no microfone: " + e.error);
    };
    rec.onend = () => {
      if (escutandoRef.current) {
        try {
          rec.start();
        } catch {
          // já reiniciando, ignora
        }
      }
    };

    recognitionRef.current = rec;
    escutandoRef.current = true;
    setEscutando(true);
    setErro(null);
    rec.start();
  }

  function desligar() {
    escutandoRef.current = false;
    recognitionRef.current?.stop();
    setEscutando(false);
  }

  return (
    <div className="mb-3">
      <button
        type="button"
        onClick={escutando ? desligar : ligar}
        className="flex items-center gap-2"
        style={{
          background: escutando ? "#9C4A1E" : BRASS,
          color: "#FFF",
          padding: "8px 16px",
          borderRadius: 8,
          fontWeight: 600,
          fontSize: 13,
        }}
      >
        {escutando ? <MicOff size={15} /> : <Mic size={15} />}
        {escutando ? "Parar comando de voz" : "🎤 Ativar comando de voz"}
      </button>
      {escutando && (
        <div style={{ fontSize: 11, color: TEXT_MUTED }} className="mt-1">
          Ouvindo… fala "nome da medida" + número, ex: "tórax cento e dois", "manga 58".
        </div>
      )}
      {ultimo?.ok && (
        <div style={{ fontSize: 12, color: "#2C6E31" }} className="mt-1">
          ✓ Entendi: {ultimo.label} = {ultimo.valor} cm
        </div>
      )}
      {erro && (
        <div className="flex items-start gap-1.5 mt-1" style={{ fontSize: 12, color: "#9C4A1E" }}>
          <AlertCircle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{erro}</span>
        </div>
      )}
    </div>
  );
}
