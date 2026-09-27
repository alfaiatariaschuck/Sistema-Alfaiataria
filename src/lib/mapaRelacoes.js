// Monta o grafo de relações financeiras — categoria de despesa ↔
// fornecedor — a partir das despesas já pagas. Fica de fora qualquer
// coisa sem fornecedor/descrição identificável (não dá pra desenhar
// uma aresta sem saber pra quem ela vai).

function normalizarNome(s) {
  return (s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function totalDespesaLinha(d) {
  return (parseFloat(d.valor) || 0) + (parseFloat(d.frete) || 0);
}

export function construirGrafoFinanceiro(despesas) {
  const pagas = (despesas || []).filter((d) => d.status === "Pago");

  const categoriasMapa = new Map();
  const fornecedoresMapa = new Map();
  const arestasMapa = new Map();

  pagas.forEach((d) => {
    const fornecedorNome = (d.fornecedor || d.descricao || "").trim();
    if (!fornecedorNome) return;
    const categoria = d.categoria || "Sem categoria";
    const valor = totalDespesaLinha(d);
    const fornecedorChave = normalizarNome(fornecedorNome);

    categoriasMapa.set(categoria, (categoriasMapa.get(categoria) || 0) + valor);

    const atual = fornecedoresMapa.get(fornecedorChave);
    fornecedoresMapa.set(fornecedorChave, { nome: atual?.nome || fornecedorNome, total: (atual?.total || 0) + valor });

    const chaveAresta = `${categoria}|||${fornecedorChave}`;
    arestasMapa.set(chaveAresta, (arestasMapa.get(chaveAresta) || 0) + valor);
  });

  const nodes = [];
  const totalGeral = [...categoriasMapa.values()].reduce((s, v) => s + v, 0);
  nodes.push({ id: "root", tipo: "root", label: "Ateliê", valor: totalGeral });

  categoriasMapa.forEach((total, categoria) => {
    nodes.push({ id: `cat:${categoria}`, tipo: "categoria", label: categoria, valor: total });
  });
  fornecedoresMapa.forEach(({ nome, total }, chave) => {
    nodes.push({ id: `forn:${chave}`, tipo: "fornecedor", label: nome, valor: total });
  });

  const links = [];
  categoriasMapa.forEach((total, categoria) => {
    links.push({ source: "root", target: `cat:${categoria}`, valor: total });
  });
  arestasMapa.forEach((valor, chave) => {
    const [categoria, fornecedorChave] = chave.split("|||");
    links.push({ source: `cat:${categoria}`, target: `forn:${fornecedorChave}`, valor });
  });

  return { nodes, links };
}
