import { useCallback, useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { buscarTodasLinhas } from "../lib/supabasePagination";

// Só "tem telefone cadastrado ou não" por cliente — pra filtrar quem dá
// pra contatar de verdade na campanha de reativação. Não expõe o
// telefone em si aqui (isso continua só sob demanda, em
// DadosPessoaisCliente, quando o card do cliente é aberto).
export function useTelefonesClientes() {
  const [clientesComTelefone, setClientesComTelefone] = useState(new Set());

  const recarregarTelefones = useCallback(async () => {
    const data = await buscarTodasLinhas(() => supabase.from("clientes_dados_pessoais").select("cliente_id, telefone"));
    setClientesComTelefone(new Set(data.filter((r) => (r.telefone || "").trim()).map((r) => r.cliente_id)));
  }, []);

  useEffect(() => {
    recarregarTelefones();
  }, [recarregarTelefones]);

  return { clientesComTelefone, recarregarTelefones };
}
