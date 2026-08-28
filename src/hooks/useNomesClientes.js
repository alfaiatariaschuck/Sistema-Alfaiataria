import { useCallback, useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { buscarTodasLinhas } from "../lib/supabasePagination";

// Nomes de TODOS os clientes cadastrados (tabela clientes), independente
// de já terem pedido ou não — usado para autocomplete e detecção de
// recompra, tanto em Pedido Camisas quanto em Pedido Alfaiataria.
export function useNomesClientes() {
  const [nomesClientes, setNomesClientes] = useState([]);
  const [clientesBase, setClientesBase] = useState([]);

  const recarregarNomesClientes = useCallback(async () => {
    // Passou de 1000 clientes depois da importação da planilha antiga —
    // sem paginar, o Supabase corta silenciosamente na linha 1000.
    const data = await buscarTodasLinhas(() => supabase.from("clientes").select("id, nome, campanha_contatado_em").order("nome"));
    setNomesClientes(data.map((r) => r.nome));
    setClientesBase(data);
  }, []);

  useEffect(() => {
    recarregarNomesClientes();
  }, [recarregarNomesClientes]);

  return { nomesClientes, clientesBase, recarregarNomesClientes };
}
