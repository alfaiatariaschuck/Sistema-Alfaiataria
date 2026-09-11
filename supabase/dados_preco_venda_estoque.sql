-- Carga de dados (não é migração de schema) — roda DEPOIS de
-- schema_v74_preco_venda_tecido.sql, que cria a coluna usada aqui.
--
-- Preenche o "Preço de venda por camisa" já cadastrado no Estoque de
-- Tecido: R$790 nos 7 tecidos chineses (LYC do Brasil, NF 6605) e R$690
-- nos tecidos nacionais já cadastrados (Cataguases). Depois disso a
-- Projeção de margem mensal do Estoque de Tecido já usa esses valores
-- reais em vez da margem padrão configurada.

update estoque_tecidos
set preco_venda_camisa = 790
where codigo_normalizado in ('02lbu', '02wht', '97bbu', '01wht', '20sbu', '62lbu', '23wht');

update estoque_tecidos
set preco_venda_camisa = 690
where codigo ilike 'bis%1031%' or codigo ilike 'm58%1001%' or codigo ilike 'ravel%1086%' or codigo ilike 'ravel%1094%';

-- Conferência: qualquer linha com preco_venda_camisa em branco aqui não
-- foi encontrada pelos filtros acima (confira o código exato e ajuste
-- direto pelo lápis no Estoque de Tecido, é mais fácil que editar aqui).
select codigo, fornecedor, preco_venda_camisa from estoque_tecidos order by codigo;
