import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = ainda carregando
  const [perfil, setPerfil] = useState(undefined); // undefined = carregando, null = sem sessão

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session === undefined) return;
    if (!session) {
      setPerfil(null);
      return;
    }
    let cancelado = false;
    (async () => {
      // Se a tabela "perfis" ainda não existir (schema_v9 não rodado), trata
      // como dono — não quebra o app enquanto o acesso de vendedor não for ativado.
      const { data, error } = await supabase.from("perfis").select("papel, nome").eq("id", session.user.id).maybeSingle();
      if (cancelado) return;
      setPerfil(error ? { papel: "dono", nome: "" } : data || { papel: "dono", nome: "" });
    })();
    return () => {
      cancelado = true;
    };
  }, [session]);

  async function entrar(email, senha) {
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) throw error;
  }

  async function sair() {
    await supabase.auth.signOut();
  }

  const loading = session === undefined || (!!session && perfil === undefined);

  return (
    <AuthContext.Provider value={{ session, perfil, loading, entrar, sair }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
