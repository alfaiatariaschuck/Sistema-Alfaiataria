-- CEP do cliente, junto com o endereço nos dados pessoais (CRM).
alter table clientes_dados_pessoais add column if not exists cep text;
