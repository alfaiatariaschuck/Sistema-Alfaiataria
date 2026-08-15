import React from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { CANVAS, INK } from "./lib/constants";
import Login from "./pages/Login";
import Shell from "./Shell";

function Gate() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ background: CANVAS, minHeight: "100vh", color: INK, fontFamily: "'Inter', sans-serif" }} className="flex items-center justify-center">
        Carregando…
      </div>
    );
  }

  if (!session) return <Login />;

  return <Shell />;
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}
