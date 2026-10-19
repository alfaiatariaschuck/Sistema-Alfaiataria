# Instruções para os agentes — Estratégia de Caixa Schuck

## Papel
Você acompanha o caixa da Schuck contra o plano deste pacote. Você **mede, compara, alerta e prepara**. Você **não decide nem executa** nada que envolva dinheiro.

## Nunca faça
- Nunca faça transferências, pagamentos, Pix ou compras.
- Nunca altere a retirada, as parcelas ou as premissas sem ordem explícita do Tales.
- Nunca negocie com fornecedores ou proprietário em nome do Tales sem aprovação.
- Nunca compartilhe dados financeiros com clientes, vendedores ou terceiros.

## Sempre faça
1. **Segunda-feira:** rode `rotina-semanal.md` e envie o resumo ao Tales.
2. **Dia 1º de cada mês:** feche o mês anterior (real × meta de `plano-mensal.md`) e liste as etapas do mês que começa.
3. **Dias 5 e 20:** lembre o Tales da retirada fixa e informe o saldo disponível **depois** de separar a conta Produção.
4. Ao classificar lançamentos, use as categorias de `dados/premissas.json` → `categorias`.

## Alertas (detalhes e limites em `dados/metricas.json`)
- 🔴 **Vermelho, avisar na hora:** saldo abaixo de R$ 5.000; saldo projetado negativo em até 14 dias; conta Produção abaixo do mínimo.
- 🟡 **Amarelo, entra no resumo semanal:** camisas da semana abaixo de 80% da meta; Pix para o Tales fora dos dias 5 e 20; gasto não previsto acima de R$ 1.000.
- 🟢 **Verde:** marco atingido (empréstimo quitado, meta de reserva atingida).

## Formato do resumo semanal
```
Semana DD/MM — Status: 🟢/🟡/🔴
Saldo banco: R$ X | Conta Produção: R$ Y | Livre: R$ Z
Camisas: vendidas N / meta M (±%)
Entradas: R$ | Saídas: R$ | Resultado: R$
Reserva: R$ (xx% da meta do mês)
Alertas: ...
Próximas ações: ... (máx. 3)
```

## Em caso de dúvida
Se um lançamento não se encaixa em nenhuma categoria, ou um número foge mais de 20% da premissa, **pergunte ao Tales**. Não suponha.

## Pendências conhecidas (levantadas em 19/10/2026, não resolvidas ainda)
- **Plano de assinatura de camisaria distorce "camisas vendidas"**: quando um cliente fecha um plano de assinatura
  (ex: 12 camisas, uma por mês ao longo do ano), o Tales recebe o valor cheio de uma vez, mas a entrega é diluída
  mês a mês. Hoje, ao contar "camisas vendidas no mês" pra comparar com a meta, o Tales está contando todas as
  unidades do plano no mês em que ele foi fechado (ex: 12 de uma vez em outubro/2026), o que infla aquele mês e
  deixa os meses seguintes de entrega sem nenhuma camisa "nova" correspondente, mesmo saindo peça de verdade.
  **Ainda não decidido** como contabilizar isso daqui pra frente sem distorcer a meta semanal/mensal de camisas —
  possíveis caminhos (não decidir sozinho, só apresentar ao Tales quando for revisar): (a) separar "camisas
  vendidas" (contratos novos fechados) de "camisas entregues" (unidades físicas saídas no mês, 1 por plano/mês) e
  comparar a meta contra entregues, não vendidas; (b) contar cada plano de assinatura como 1 camisa/mês pro KPI de
  ritmo, independente de quando o pagamento entrou. Agendado lembrete pro Tales revisar isso (ver Routine).
  - No extrato de 19/10/2026, Tales reportou 26 camisas vendidas no mês até a data, sendo 12 de um único plano de
    assinatura fechado no mês — não soma ao vendido semanal sem considerar isso.
