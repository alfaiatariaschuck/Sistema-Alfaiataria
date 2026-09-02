import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export const CHAVE_METRAGEM_PADRAO = "metragem_padrao_camisa";
export const CHAVE_MAO_DE_OBRA_PADRAO = "mao_de_obra_padrao_camisa";
export const CHAVE_MARGEM_PADRAO = "margem_padrao_camisa";

// Lê os mesmos parâmetros usados na Tabela de preço de venda (Tecidos de
// Camisa) — metragem padrão, mão de obra padrão e margem padrão — pra
// poder estimar custo/preço sugerido também na hora de lançar/editar um
// pedido, sem duplicar a lógica de cálculo.
export function useConfigPrecoCamisa() {
  const [metragemPadrao, setMetragemPadrao] = useState("1,5");
  const [maoDeObraPadrao, setMaoDeObraPadrao] = useState("");
  const [margemPadrao, setMargemPadrao] = useState("40");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("config")
        .select("chave, valor")
        .in("chave", [CHAVE_METRAGEM_PADRAO, CHAVE_MAO_DE_OBRA_PADRAO, CHAVE_MARGEM_PADRAO]);
      (data || []).forEach((row) => {
        if (row.chave === CHAVE_METRAGEM_PADRAO) setMetragemPadrao(row.valor || "1,5");
        if (row.chave === CHAVE_MAO_DE_OBRA_PADRAO) setMaoDeObraPadrao(row.valor || "");
        if (row.chave === CHAVE_MARGEM_PADRAO) setMargemPadrao(row.valor || "40");
      });
      setLoading(false);
    })();
  }, []);

  return { metragemPadrao, maoDeObraPadrao, margemPadrao, loading };
}
