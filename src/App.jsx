import React from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { CANVAS, INK } from "./lib/constants";
import Login from "./pages/Login";
import Shell from "./Shell";
import ShellVendedor from "./ShellVendedor";
import ShellProducao from "./ShellProducao";
import AcompanharPedido from "./pages/AcompanharPedido";

function Gate() {
  const { session, perfil, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ background: CANVAS, minHeight: "100vh", color: INK, fontFamily: "'Inter', sans-serif" }} className="flex items-center justify-center">
        Carregando…
      </div>
    );
  }

  if (!session) return <Login />;

  if (perfil?.papel === "vendedor") return <ShellVendedor />;
  if (perfil?.papel === "producao") return <ShellProducao />;

  return <Shell />;
}

export default function App() {
  const match = window.location.pathname.match(/^\/acompanhar\/(camisaria|alfaiataria)\/([0-9a-fA-F-]{36})\/?$/);
  if (match) {
    return <AcompanharPedido tipo={match[1]} id={match[2]} />;
  }

  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}
