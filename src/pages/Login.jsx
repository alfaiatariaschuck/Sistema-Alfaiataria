import React, { useState } from "react";
import { Ruler, AlertCircle } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { BRASS, CANVAS, INK, LINE, TEXT_MUTED, inputStyle } from "../lib/constants";
import { supabaseConfigurado } from "../supabaseClient";

export default function Login() {
  const { entrar } = useAuth();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState(null);
  const [carregando, setCarregando] = useState(false);

  async function submeter(e) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);
    try {
      await entrar(email.trim(), senha);
    } catch (e) {
      setErro(e.message === "Invalid login credentials" ? "E-mail ou senha incorretos." : e.message);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div
      style={{ background: CANVAS, minHeight: "100vh", fontFamily: "'Inter', sans-serif", color: INK }}
      className="flex items-center justify-center px-5"
    >
      <div style={{ width: "100%", maxWidth: 360 }}>
        <div className="flex items-center gap-2 justify-center mb-1">
          <Ruler size={22} color={BRASS} />
          <span className="fx-serif" style={{ fontSize: 22, fontWeight: 600 }}>
            Schuck
          </span>
        </div>
        <div className="text-center uppercase mb-8" style={{ color: TEXT_MUTED, fontSize: 11, letterSpacing: 1 }}>
          Controle de Pedidos
        </div>

        {!supabaseConfigurado && (
          <div className="mb-4 px-4 py-3 rounded flex items-start gap-2" style={{ background: "#F6E3D9", color: "#9C4A1E", fontSize: 13 }}>
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>
              O Supabase ainda não foi configurado neste ambiente (faltam as variáveis VITE_SUPABASE_URL e
              VITE_SUPABASE_ANON_KEY).
            </span>
          </div>
        )}

        <form onSubmit={submeter} style={{ background: "#FFF", border: `1px solid ${LINE}`, borderRadius: 10, padding: 24 }}>
          <label className="block mb-3">
            <span className="block mb-1" style={{ fontSize: 12, fontWeight: 600 }}>
              E-mail
            </span>
            <input
              type="email"
              required
              autoFocus
              style={inputStyle}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@exemplo.com"
            />
          </label>
          <label className="block mb-4">
            <span className="block mb-1" style={{ fontSize: 12, fontWeight: 600 }}>
              Senha
            </span>
            <input
              type="password"
              required
              style={inputStyle}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••••"
            />
          </label>

          {erro && (
            <div className="mb-4 px-3 py-2 rounded" style={{ background: "#F6E3D9", color: "#9C4A1E", fontSize: 13 }}>
              {erro}
            </div>
          )}

          <button
            type="submit"
            disabled={carregando}
            style={{
              width: "100%",
              background: INK,
              color: "#FFF",
              padding: "10px 22px",
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 14,
              opacity: carregando ? 0.7 : 1,
            }}
          >
            {carregando ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <div className="text-center mt-4" style={{ fontSize: 12, color: TEXT_MUTED }}>
          Sem acesso ainda? Peça para quem administra o sistema criar sua conta no painel do Supabase.
        </div>
      </div>
    </div>
  );
}
