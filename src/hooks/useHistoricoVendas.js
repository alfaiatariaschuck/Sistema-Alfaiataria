import { useCallback, useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

// Vendas da planilha antiga do dono (antes do app, ou nunca lançadas aqui)
// — só nome + quantidade + ano, sem medidas/pagamento. Usado em Clientes.jsx
// pra completar o total comprado e o ano da última compra na campanha de
// reativação, além das compras já lançadas no app.
export function useHistoricoVendas() {
  const [historicoVendas, setHistoricoVendas] = useState([]);

  const recarregarHistoricoVendas = useCallback(async () => {
    const { data } = await supabase.from("historico_vendas").select("cliente_id, quantidade, ano, recompra");
    setHistoricoVendas(data || []);
  }, []);

  useEffect(() => {
    recarregarHistoricoVendas();
  }, [recarregarHistoricoVendas]);

  return { historicoVendas, recarregarHistoricoVendas };
}
