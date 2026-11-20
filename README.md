# F1 em perspectiva — Dashboard 2010–2025

Dashboard interativo em português, empacotado em `dashboard.html`. O HTML não depende de CDN, bibliotecas externas nem servidor: abra-o diretamente no navegador.

## Fonte dos dados

- **Base:** [F1DB — Open Source Formula 1 Database](https://github.com/f1db/f1db)
- **Release baixado:** [v2026.20.0](https://github.com/f1db/f1db/releases/tag/v2026.20.0)
- **Arquivo:** [f1db-csv.zip](https://github.com/f1db/f1db/releases/download/v2026.20.0/f1db-csv.zip)
- **Data do download:** 18/11/2026
- **Licença:** [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/); atribuição aos colaboradores do F1DB.
- **Recorte analítico:** temporadas 2010–2025 (exclui 2026).
- **Integridade do ZIP:** SHA-256 `0760d50ecb9fad9f267e14ceece73891c2095c812a71d024d0cfbda1f02b3863`.

## Gráficos

1. Vitórias por temporada das quatro equipes mais vitoriosas (linhas).
2. Dez pilotos com mais vitórias (barras horizontais).
3. Dez equipes com mais vitórias (barras horizontais).
4. Posição de grid versus posição final (dispersão; somente posições numéricas válidas).
5. Mapa de calor de vitórias por temporada das oito equipes mais vitoriosas.
6. Distribuição da posição no grid dos vencedores (barras; posições acima de 20 agrupadas).

Todos os gráficos incluem unidades, pergunta orientadora e dicas com os valores. Vitórias contam apenas corridas principais de Grandes Prêmios, não corridas sprint. Comparações são por contagem de vitórias, não por pontos, devido a alterações de pontuação entre temporadas.

## Reproduzir o HTML

O arquivo HTML pronto pode ser aberto sem Node.js. Para regenerar depois de atualizar os CSVs, mantenha o ZIP e os CSVs extraídos nos caminhos atuais em `data/raw/` e execute com Node.js instalado:

```powershell
node .\build-dashboard.mjs
```

O script confere o SHA-256 do ZIP antes de gerar o painel. O HTML pronto incorpora os dados analisados e funciona offline.

## Publicar no GitHub Pages

O repositório inclui um workflow em `.github/workflows/pages.yml`. Ele publica somente `index.html` e `dashboard.html`; o primeiro abre o dashboard na página inicial. Em **Settings → Pages**, a origem deve ser **GitHub Actions**.

O site e o repositório serão públicos. O ZIP e os CSVs de origem em `data/raw/` não devem ser enviados: o painel já incorpora apenas os dados agregados e as observações usadas nos gráficos. O `.gitignore` exclui `data/raw/` do Git.
