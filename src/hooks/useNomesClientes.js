import { useCallback, useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

// Nomes de TODOS os clientes cadastrados (tabela clientes), independente
// de já terem pedido ou não — usado para autocomplete e detecção de
// recompra, tanto em Pedido Camisas quanto em Pedido Alfaiataria.
export function useNomesClientes() {
  const [nomesClientes, setNomesClientes] = useState([]);

  const recarregarNomesClientes = useCallback(async () => {
    const { data } = await supabase.from("clientes").select("nome").order("nome");
    setNomesClientes((data || []).map((r) => r.nome));
  }, []);

  useEffect(() => {
    recarregarNomesClientes();
  }, [recarregarNomesClientes]);

  return { nomesClientes, recarregarNomesClientes };
}
