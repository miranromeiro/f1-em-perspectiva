# F1 além do grid

Miran Romeiro, Rafael Botezelli e Gustavo Carvalho
Abra docs/index.html mantendo todos os arquivos de docs juntos. Se o navegador restringir arquivos locais, execute **python -m http.server 8000 --directory docs** na raiz deste projeto e abra localhost na porta 8000. Os gráficos funcionam sem serviços externos.

## Conteúdo
docs/ contém o site, dados/largadas.csv a tabela final, analise/ o treinamento e as métricas, relatorio/ o artigo e apresentacao/ o índice e o roteiro detalhado do trio.

## Reproduzir
Com Python 3.12 e um ambiente virtual, execute **python -m pip install -r analise/requirements.txt**. Baixe o ZIP oficial e execute **python analise/preparar.py /caminho/f1db-csv.zip**. O script valida o SHA-256 e recria o CSV, os dados do painel e as métricas. A compilação do artigo requer pdflatex e a classe IEEEtran. Execute pdflatex artigo.tex duas vezes em relatorio/.
Fonte: F1DB Contributors, v2026.20.0, licença CC BY 4.0. Recorte e transformações produzidos pelo projeto. [ZIP oficial](https://github.com/f1db/f1db/releases/download/v2026.20.0/f1db-csv.zip).

## Publicação
Para publicar em endereço independente, use esta pasta como raiz de um novo repositório f1-alem-do-grid. No GitHub Pages selecione main e /docs. Também é possível hospedar diretamente o conteúdo de docs/ em um serviço estático. Antes da submissão, preencher contatos institucionais, identificar a primeira base e confirmar a formação original do trio e a técnica estudada.
