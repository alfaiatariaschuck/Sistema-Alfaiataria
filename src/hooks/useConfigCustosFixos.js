import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

const CHAVE_ALUGUEL_ATELIE = "custo_aluguel_mensal";
const CHAVE_LUZ_ATELIE = "custo_luz_mensal";
const CHAVE_ALUGUEL_LOJA = "custo_aluguel_loja_mensal";
const CHAVE_LUZ_LOJA = "custo_luz_loja_mensal";
const CHAVE_PROLABORE = "custo_prolabore_mensal";
const CHAVE_CUSTOS_FIXOS_PJ = "custos_fixos_pj_mensal";
const CHAVE_PLANO_SAUDE_PJ = "custo_plano_saude_pj_mensal";

const TODAS_CHAVES = [
  CHAVE_ALUGUEL_ATELIE,
  CHAVE_LUZ_ATELIE,
  CHAVE_ALUGUEL_LOJA,
  CHAVE_LUZ_LOJA,
  CHAVE_PROLABORE,
  CHAVE_CUSTOS_FIXOS_PJ,
  CHAVE_PLANO_SAUDE_PJ,
];

// Os mesmos custos fixos da empresa (aluguel/luz do ateliê e da loja,
// pró-labore, custos fixos PJ, plano de saúde) usados em Custos do
// Ateliê e Custos da Camisaria — centralizado aqui pra quem mais
// precisar desses números não duplicar o carregamento (ex: Metas).
export function useConfigCustosFixos() {
  const [valores, setValores] = useState({
    aluguelAtelie: 0,
    luzAtelie: 0,
    aluguelLoja: 0,
    luzLoja: 0,
    prolabore: 0,
    custosFixosPJ: 0,
    planoSaudePJ: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("config").select("chave, valor").in("chave", TODAS_CHAVES);
      const mapa = {};
      (data || []).forEach((row) => {
        mapa[row.chave] = parseFloat(row.valor) || 0;
      });
      setValores({
        aluguelAtelie: mapa[CHAVE_ALUGUEL_ATELIE] || 0,
        luzAtelie: mapa[CHAVE_LUZ_ATELIE] || 0,
        aluguelLoja: mapa[CHAVE_ALUGUEL_LOJA] || 0,
        luzLoja: mapa[CHAVE_LUZ_LOJA] || 0,
        prolabore: mapa[CHAVE_PROLABORE] || 0,
        custosFixosPJ: mapa[CHAVE_CUSTOS_FIXOS_PJ] || 0,
        planoSaudePJ: mapa[CHAVE_PLANO_SAUDE_PJ] || 0,
      });
      setLoading(false);
    })();
  }, []);

  return { ...valores, loading };
}
