# Roteiro de estudo e personalização

Projeto inicial construído com apoio de IA. Execute, confira as fórmulas e faça mudanças antes de apresentá-lo como experiência no currículo.

## Atividades práticas

1. Execute `npm start`, abra o painel e aplique o filtro E-commerce.
2. Selecione um mês e observe todos os indicadores mudarem juntos.
3. Escolha um período sem vendas e confira o estado vazio.
4. Exporte o resumo e compare os valores com a tela.
5. Pare o servidor. Crie um CSV fictício com três vendas fáceis de somar, importe e reinicie.
6. Confira o faturamento e a média manualmente.
7. Execute `npm test` e veja como esses cálculos são verificados.

## Estude nesta ordem

Leia a função `validateRows`, o esquema SQL, o método `dashboard`, a rota HTTP e, por último, o código da interface. Entenda por que cada filtro aparece duas vezes nos parâmetros da consulta e por que usamos centavos.

## Primeira personalização sugerida

Adicione um indicador de **quantidade média de unidades por venda**. Calcule com o total de unidades dividido pelo número de vendas, trate a divisão por zero, mostre na interface e escreva um teste com três registros conhecidos. Depois, adicione comparação com o período anterior e documente como escolheu os limites das datas.

## Perguntas de entrevista

- Por que receita não é lucro?
- Qual o efeito de uma venda de dois produtos no ticket médio desta modelagem?
- Por que usar centavos em vez de números decimais?
- Como GROUP BY e SUM constroem as barras do painel?
- Como garantir que uma importação inválida não apague a base anterior?
- O que precisaria mudar se um pedido tivesse vários itens?

## Descrição para o currículo, após estudo e personalização

**Projeto de estudo: Vendas SQL** — Painel de vendas com JavaScript, Node.js e SQLite, incluindo importação de CSV, agregações SQL, filtros e indicadores de faturamento. Estudo e personalização de projeto com apoio de IA, utilizando dados sintéticos e testes de cálculo e validação.

Use apenas funcionalidades que você consiga demonstrar e explicar. Não apresente os indicadores fictícios como resultados de negócio reais.
