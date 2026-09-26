import { supabase } from "../supabaseClient";

// Chama a Edge Function "agente-ia" — ela decide se quem está logado
// pode usar (só dono) e faz a chamada de verdade pra IA. Erro de rede
// ou de autorização chega como texto pronto pra mostrar na tela.
export async function chamarAgenteIA(agente, dados) {
  const { data, error } = await supabase.functions.invoke("agente-ia", { body: { agente, dados } });
  if (error) {
    const mensagem = data?.error || error.message || "Erro ao falar com a IA.";
    throw new Error(mensagem);
  }
  if (data?.error) throw new Error(data.error);
  return data.resposta;
}
