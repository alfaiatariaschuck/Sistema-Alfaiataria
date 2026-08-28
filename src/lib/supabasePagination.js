// O Supabase/PostgREST limita cada select a 1000 linhas por padrão — sem
// paginar, uma tabela com mais do que isso (ex: historico_vendas com 1821
// linhas, ou clientes depois da importação da planilha antiga) devolve só
// uma fatia arbitrária, sem avisar erro nenhum. Isso já causou dado sumido
// (ano inteiro faltando num gráfico). Use isso em qualquer select que possa
// crescer além de 1000 linhas.
export async function buscarTodasLinhas(criarQuery, tamanhoPagina = 1000) {
  let todas = [];
  let pagina = 0;
  while (true) {
    const { data, error } = await criarQuery().range(pagina * tamanhoPagina, pagina * tamanhoPagina + tamanhoPagina - 1);
    if (error) throw error;
    todas = todas.concat(data || []);
    if (!data || data.length < tamanhoPagina) break;
    pagina += 1;
  }
  return todas;
}
