# ♲ Pontos de Coleta — Região Metropolitana de Fortaleza

Mapa interativo dos **PEVs (Pontos de Entrega Voluntária)** de resíduos eletrônicos e recicláveis na Região Metropolitana de Fortaleza (CE). Quem quer descartar lixo eletrônico encontra o ponto mais próximo, vê foto e endereço e abre a rota no Google Maps ou no Waze com um toque.

Nasceu como material de apoio a um seminário e hoje é a base de um projeto de incubação no **IFCE** (PEV de resíduo eletrônico).

## Funcionalidades

- 🗺️ Mapa com **Leaflet + OpenStreetMap** e contorno dos municípios (dados do IBGE)
- 🔎 Filtros por **município e bairro** (interdependentes) e busca por texto
- 🧭 Rotas para **Google Maps** e **Waze** usando a coordenada exata do ponto
- 📷 Foto do local via link do Google Drive
- 🔄 Dados lidos **ao vivo de uma planilha Google** (atualiza sozinho a cada 60 s)
- ➕ Cadastro de novos pontos pelo próprio site, protegido por senha validada no servidor
- 📱 Layout responsivo (painel lateral no desktop, folha inferior no celular), tema claro/escuro
- 📴 Cópia local dos pontos como fallback se a planilha não responder

## Arquitetura

```
Navegador (index.html)  ──google.script.run──▶  Apps Script (Code.gs)  ──▶  Google Sheets
   Leaflet / OSM                                  doGet · getPoints              (base de dados)
   filtros, pop-ups, rotas                        checkPassword · addPoint
```

- **Front-end**: um único `index.html` (HTML + CSS + JS puro, sem build).
- **Back-end**: Google Apps Script publicado como App da Web. Lê e grava na planilha direto, sem o atraso de cache do CSV publicado.
- **Banco de dados**: Google Sheets — quem mantém os pontos edita uma planilha, sem precisar mexer em código.
- **Deploy**: [`clasp`](https://github.com/google/clasp) (CLI do Apps Script).

## Como rodar o seu

1. Crie uma planilha com as colunas: `Município`, `Bairro`, `Nome do Local / Ponto`, `Endereço / Referência`, `Coordenadas Geográficas (Lat,Long)` e, opcionalmente, `Link da Foto`.
2. Crie um projeto Apps Script e envie os arquivos:
   ```bash
   npm i -g @google/clasp
   clasp login
   clasp create --type webapp --title "Pontos de Coleta"
   clasp push
   ```
3. No editor do Apps Script: **Configurações do projeto → Propriedades do script** e adicione:

   | Chave | Valor |
   |---|---|
   | `SHEET_URL` | link de edição da planilha (opcional se o script estiver vinculado a ela) |
   | `ADD_PASSWORD` | senha para cadastrar pontos pelo site |

4. `clasp deploy` (ou **Implantar → Nova implantação → App da Web**). A URL `/exec` é o site.

> Nenhuma senha ou ID de planilha fica no código: tudo vem das Propriedades do script.

## Decisões técnicas

Algumas coisas que aprendi no caminho (detalhes em [`PROJETO_pontos_coleta_rmf.md`](PROJETO_pontos_coleta_rmf.md)):

- **Apps Script reescreve literais `https://` dentro de `<script>`** e quebrava as URLs dos tiles e rotas. A solução foi montar as URLs em tempo de execução (`"https:" + "//"`).
- **CSV publicado do Sheets tem cache de minutos a horas**; trocar `fetch()` por `google.script.run` deixou a leitura imediata.
- **Cabeçalhos da planilha mudam**: a coluna de coordenadas é achada por busca flexível (`includes('coorden')`), não por nome exato.
- **Coordenadas reais** foram importadas em lote de um `.kmz` do Google Earth (110 marcadores → 86 pontos após remover duplicados).
- **Segurança**: senha conferida no servidor, textos da planilha escapados antes de virar HTML e campos protegidos contra injeção de fórmula.

## Créditos

- Mapas © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors
- Limites municipais: IBGE, via [tbrugz/geodata-br](https://github.com/tbrugz/geodata-br) (CC0)
- [Leaflet](https://leafletjs.com/)
