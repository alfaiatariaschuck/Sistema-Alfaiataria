import { supabase } from "../supabaseClient";

export async function encontrarOuCriarCliente(nome) {
  const nomeNormalizado = nome.trim().toLowerCase();
  const { data: existente } = await supabase
    .from("clientes")
    .select("id")
    .eq("nome_normalizado", nomeNormalizado)
    .maybeSingle();
  if (existente) return existente.id;
  const { data: criado, error } = await supabase.from("clientes").insert({ nome: nome.trim() }).select("id").single();
  if (error) throw error;
  return criado.id;
}
