import React from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { CANVAS, INK } from "./lib/constants";
import Login from "./pages/Login";
import Shell from "./Shell";
import ShellVendedor from "./ShellVendedor";

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

  return <Shell />;
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}
