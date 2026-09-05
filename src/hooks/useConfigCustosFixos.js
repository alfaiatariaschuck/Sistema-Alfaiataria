import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

const CHAVE_ALUGUEL_ATELIE = "custo_aluguel_mensal";
const CHAVE_LUZ_ATELIE = "custo_luz_mensal";
const CHAVE_ALUGUEL_LOJA = "custo_aluguel_loja_mensal";
const CHAVE_LUZ_LOJA = "custo_luz_loja_mensal";
const CHAVE_PROLABORE = "custo_prolabore_mensal";
// "Outros custos fixos PJ" desmembrado em itens próprios — antes era um
// valor único ("custos_fixos_pj_mensal"), agora cada um tem seu campo,
// pra saber todo mês o que está indo pra onde (contador, sistemas etc).
const CHAVE_CONTADOR = "custo_contador_mensal";
const CHAVE_SISTEMAS = "custo_sistemas_mensal";
const CHAVE_MARKETING = "custo_marketing_mensal";
const CHAVE_COMBUSTIVEL = "custo_combustivel_mensal";
const CHAVE_INTERNET_PJ = "custo_internet_pj_mensal";
const CHAVE_OUTROS_PJ = "custo_outros_pj_mensal";
const CHAVE_PLANO_SAUDE_PJ = "custo_plano_saude_pj_mensal";
const CHAVE_IMPOSTOS = "custo_impostos_mensal";

const TODAS_CHAVES = [
  CHAVE_ALUGUEL_ATELIE,
  CHAVE_LUZ_ATELIE,
  CHAVE_ALUGUEL_LOJA,
  CHAVE_LUZ_LOJA,
  CHAVE_PROLABORE,
  CHAVE_CONTADOR,
  CHAVE_SISTEMAS,
  CHAVE_MARKETING,
  CHAVE_COMBUSTIVEL,
  CHAVE_INTERNET_PJ,
  CHAVE_OUTROS_PJ,
  CHAVE_PLANO_SAUDE_PJ,
  CHAVE_IMPOSTOS,
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
    impostos: 0,
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
        custosFixosPJ:
          (mapa[CHAVE_CONTADOR] || 0) +
          (mapa[CHAVE_SISTEMAS] || 0) +
          (mapa[CHAVE_MARKETING] || 0) +
          (mapa[CHAVE_COMBUSTIVEL] || 0) +
          (mapa[CHAVE_INTERNET_PJ] || 0) +
          (mapa[CHAVE_OUTROS_PJ] || 0),
        planoSaudePJ: mapa[CHAVE_PLANO_SAUDE_PJ] || 0,
        impostos: mapa[CHAVE_IMPOSTOS] || 0,
      });
      setLoading(false);
    })();
  }, []);

  return { ...valores, loading };
}
