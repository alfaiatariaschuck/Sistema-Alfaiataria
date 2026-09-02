-- Código interno (ex: "M58 - 1001") ao lado da nomenclatura de cada
-- modelo de camisa — mesmo padrão que você já está usando na Planilha
-- Consolidada (aba Camisaria: Código | Nomenclatura). Fica só de uso
-- interno seu, nunca aparece pra Fabi nem no que vai pro contador.
alter table modelos_camisa add column if not exists codigo text;
