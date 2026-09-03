import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

// Lista de logins com papel "vendedor" (ex: o Deivid) — só o dono
// consegue ler isso (RLS: schema_v58). Usado pra separar, com certeza,
// os pedidos que o vendedor lançou pelo próprio login (criado_por) dos
// pedidos que o dono lançou e só preencheu o campo de texto "Vendedor"
// pra dar crédito de comissão — os dois são coisas diferentes.
export function useVendedores() {
  const [vendedores, setVendedores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("perfis").select("id, nome").eq("papel", "vendedor");
      setVendedores((data || []).map((row) => ({ id: row.id, nome: row.nome || "Vendedor" })));
      setLoading(false);
    })();
  }, []);

  return { vendedores, loading };
}
