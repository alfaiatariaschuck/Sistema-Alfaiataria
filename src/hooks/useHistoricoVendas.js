import { useCallback, useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { buscarTodasLinhas } from "../lib/supabasePagination";

// Vendas da planilha antiga do dono (antes do app, ou nunca lançadas aqui)
// — só nome + quantidade + ano, sem medidas/pagamento. Usado em Clientes.jsx
// pra completar o total comprado e o ano da última compra na campanha de
// reativação, além das compras já lançadas no app.
export function useHistoricoVendas() {
  const [historicoVendas, setHistoricoVendas] = useState([]);

  const recarregarHistoricoVendas = useCallback(async () => {
    // 1821 linhas — passa dos 1000 que o Supabase devolve por padrão sem
    // paginar (foi exatamente isso que fez 2025 sumir do gráfico de
    // recompra: o select cortava no meio, silenciosamente, sem erro).
    const data = await buscarTodasLinhas(() => supabase.from("historico_vendas").select("cliente_id, quantidade, ano, recompra").order("id"));
    setHistoricoVendas(data);
  }, []);

  useEffect(() => {
    recarregarHistoricoVendas();
  }, [recarregarHistoricoVendas]);

  return { historicoVendas, recarregarHistoricoVendas };
}
