# Notas para quem (ou qual IA) mexer neste projeto depois

## Checklist obrigatório ao criar um novo login (Fabiana, Milena, Gabriel, Zonzo etc.)

O dono já pediu, explicitamente, que isso nunca seja pulado — criar um login novo sem
seguir esses passos deixa a pessoa com acesso total ao sistema por padrão (ver motivo
técnico abaixo).

Sempre que um novo login for criado no Supabase (Authentication → Users), fazer IMEDIATAMENTE:

1. Inserir a linha correspondente na tabela `perfis` (`id` = o mesmo uuid do `auth.users`,
   `papel` = `'vendedor'` ou `'producao'`, `nome` = nome da pessoa). Sem essa linha, o
   login cai no fallback de `is_dono()` (`coalesce(..., true)`) e enxerga o sistema
   inteiro, inclusive financeiro e dados de outras pessoas.
2. Decidir e aplicar a separação de permissões antes da pessoa começar a usar — não
   depois. Ver o padrão já aplicado pro Ícaro (schema_v86, `mostrarComparativos` em
   `HistoricoProducao.jsx`) e pro Deivid (schema_v9/v61/v87) como referência de como
   isso foi feito.
3. Confirmar que a pessoa NÃO tem acesso a: métricas comparativas entre profissionais
   (ex: "média de dias por responsável", retrabalho por pessoa), números consolidados
   do negócio (faturamento, vendas totais, sazonalidade) e dado de remuneração de
   colegas — motivo: segurança jurídica trabalhista (evitar caracterização de vínculo
   empregatício com prestador PJ via evidência de supervisão/comparação de desempenho).
4. Preferir correção real de RLS (Postgres) a esconder só na tela — o dono já pediu
   isso de forma explícita ("não apenas via CSS, removendo do retorno da API").

## Pendências conhecidas (não bloqueiam, mas ficaram registradas)

- `is_dono()` tem fallback fail-open (login sem `perfis` = acesso total). Ainda não
  foi endurecido porque quebraria o próprio login do dono se mexido sem cuidado —avaliar
  antes de criar o próximo login, não depois.
- `clientes_historico` (anotações de CRM) é legível por qualquer vendedor, de qualquer
  cliente — decisão consciente do dono, mantida assim por enquanto.
- Fabiana e Milena (camisaria) ainda não têm login — quando tiverem, precisam do mesmo
  tratamento acima (hoje não existe um papel "costureira" em `perfis`, só
  `dono` / `vendedor` / `producao`).
