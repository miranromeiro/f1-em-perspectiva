# Roteiro para apresentar diretamente no site

## Rafael · Largada · 4 minutos
Abra o endereço inicial. “Usamos resultados reais da Fórmula 1 de 2010 a 2025 para estudar três coisas: a posição inicial, a fase da equipe e se essas informações ajudam a prever a chegada.” Explique que grid é a ordem de largada e top 10 são os dez primeiros na classificação oficial. O dataset tem uma linha por piloto por GP com posição de largada numérica.

Aponte para 587 de 982 e 380 de 974. “De cada dez largadas entre oitavo e décimo, cerca de seis terminaram no top 10. Entre décimo primeiro e décimo terceiro, foram cerca de quatro.” Troque o período, leia o novo denominador e volte para 2010–2025. Clique em **Ver o histórico da equipe**.

## Gustavo · Equipe · 4 minutos
“Agora olhamos a mesma região do grid, mas separamos os pilotos pela fase da equipe.” Explique a janela de até cinco provas anteriores da temporada. Exemplo: seis top 10 em dez largadas anteriores colocam a equipe no primeiro grupo. A classificação do grupo vem antes da prova; a chegada medida na barra vem depois. Sem histórico, a linha fica fora desta conta.

Aponte as taxas de 60,5% e 36,9%. “Ter uma equipe em boa fase apareceu junto com mais chegadas no top 10. Vamos ver se o histórico ajuda a acertar previsões em corridas futuras.” Clique em **Testar a previsão**.

## Miran · Previsão · 6 minutos
“Escolhemos regressão logística porque temos duas respostas: entra ou fica fora. O modelo aprende pesos a partir de corridas antigas e usa esses pesos para estimar a chance de top 10. A primeira versão usa o grid; a segunda acrescenta o histórico de piloto e equipe. A partir de 50%, marcamos entra.” Treino: 2010–2019. Ajuste da regularização: 2020–2022. Reajuste usando todo esse período; teste final: 2023–2025.

Leia as duas chances de Piastri e clique em **Revelar chegada**. No primeiro caso o histórico ajudou. Aponte a comparação das 417 largadas de P8–P13: 271 acertos só com grid, 269 com histórico. “As equipes em melhor fase tiveram mais top 10 na descrição histórica, mas incluir histórico não aumentou os acertos nesse teste.” Se perguntarem pelas métricas, abra **Ver detalhes do modelo no grid inteiro**: são 1.333 largadas, outra população. A diferença de dois acertos no recorte é pequena. O estudo descreve associações e não isola o efeito causal de carro ou piloto.

### Exploração extra de Miran
Se houver tempo, compare Interlagos e Suzuka no gráfico de linhas da tela Previsão. Aponte para P10 para ler os totais. Na matriz abaixo, observe se as largadas fora do top 10 terminaram com posição numérica ou sem classificação numérica. Troque Circuitos por Pilotos para fazer a mesma leitura entre dois competidores. Compare as contagens, especialmente quando houver poucas largadas. Essas frequências históricas descrevem os grupos; carro, época e calendário também variam.
