# Sistema de Gestão de Pedidos — Ateliê

App de controle de pedidos de alfaiataria (clientes, medidas, produção, tecidos/compras, financeiro). React + Vite no front-end, Supabase (Postgres + Auth) como banco de dados, deploy na Vercel.

## Configuração do Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. No **SQL Editor**, rode o conteúdo de `supabase/schema.sql` inteiro. Isso cria as tabelas (`clientes`, `pedidos`, `tecidos`, `config`) e as políticas de segurança (RLS) que exigem login para ler/gravar qualquer dado.
3. Em **Authentication → Providers**, deixe apenas **Email** habilitado.
4. Em **Authentication → Users**, clique em **Add user → Create new user** para cada pessoa que vai usar o sistema (defina e-mail e senha). O cadastro público está desativado de propósito — só quem tem acesso ao painel do Supabase cria novas contas.
5. Em **Project Settings → Data API**, copie a **Project URL** e a **anon public key**.

## Rodando localmente

```bash
npm install
cp .env.example .env.local   # preencha com a URL e a anon key do Supabase
npm run dev
```

## Deploy na Vercel

1. Importe este repositório no [vercel.com](https://vercel.com/new) (New Project → conectar ao GitHub).
2. O framework é detectado automaticamente (Vite). Build command: `npm run build`, output: `dist`.
3. Em **Environment Variables**, adicione:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy. O link gerado (`https://SEU-PROJETO.vercel.app`) funciona tanto no celular quanto no computador — é só abrir no navegador e fazer login.

## Estrutura de dados

- **clientes** — nome (a recompra é detectada automaticamente comparando nomes).
- **pedidos** — dados do pedido, status de produção, financeiro (valor a receber / pago à Fabiana), medidas e características em JSON.
- **tecidos** — itens de tecido de cada pedido (fornecedor, código, comprado ou não) — usados na aba **Compras**.
- **config** — configurações simples (ex: telefone de WhatsApp usado na ficha de produção).

## Segurança

O acesso exige login (Supabase Auth). Todas as tabelas têm Row Level Security habilitada: sem sessão autenticada, nenhuma leitura ou escrita é permitida. Todos os usuários autenticados compartilham os mesmos dados (não é um sistema multi-empresa).
