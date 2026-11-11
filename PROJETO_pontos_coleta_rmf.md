# Mapa de Pontos de Coleta — Região Metropolitana de Fortaleza (RMF)

Documento de handoff para dar continuidade ao projeto no Claude Code.
Inclui o histórico de decisões, a arquitetura atual, problemas já resolvidos
e pendências conhecidas.

## O que é

Site de mapa interativo (Leaflet + OpenStreetMap) mostrando pontos de coleta
de resíduos eletrônicos/recicláveis na Região Metropolitana de Fortaleza.
Nasceu como material de apoio a um seminário e hoje é também a base do
projeto de incubação do usuário no IFCE ("PEV de resíduo eletrônico").

Arquivos deste pacote:

* `index.html` — o site inteiro (HTML + CSS + JS em um arquivo só).
* `Code.gs` — script do Google Apps Script que roda **dentro da planilha**
(lê e grava dados) e serve o `index.html` como página web.

## Arquitetura atual (importante entender antes de mexer)

* **Hospedagem**: Google Apps Script, implantado como "App da Web"
(`doGet` serve o `index.html`; `getPoints`/`addPoint` leem/gravam na
planilha via `google.script.run`, chamado do próprio `index.html`).
* **Por que não usa `fetch()` pro CSV publicado**: já foi tentado (ver
"Histórico de problemas" abaixo) e tem lag de cache do Google de vários
minutos/horas. A leitura via `google.script.run` é direta na planilha,
sem esse atraso.
* **Planilha fonte**: o link de edição fica nas *Propriedades do script*
do Apps Script (chave `SHEET_URL`), fora do código. Se o script estiver
vinculado à planilha, a propriedade é opcional.
* **Colunas atuais da planilha** (nessa ordem): Município, Bairro, Nome do
Local / Ponto, Endereço / Referência, Coordenadas Geográficas (Lat,Long).
Uma 6ª coluna de foto (qualquer nome que contenha "foto"/"imagem"/"photo")
é opcional e lida de forma flexível.
Colunas que **existiram e foram removidas** pelo usuário: Tipo de Resíduo,
Horário de Funcionamento. O código já foi ajustado pra não quebrar com a
ausência delas (ver "Decisões de produto" abaixo).
* **Deploy**: o usuário usa `clasp` (CLI do Google) pra enviar os arquivos
— `clasp push` depois `clasp deploy` (ou editar a implantação existente
em Implantar → Gerenciar implantações → Nova versão). Edição manual pelo
editor do Apps Script no navegador se mostrou pouco confiável para o
`index.html` (ver histórico).

## Decisões de produto já tomadas

* **Limites municipais**: GeoJSON do IBGE (via repositório `tbrugz/geodata-br`,
CC0), simplificado com Shapely. Só desenha o contorno de municípios que
**têm pelo menos 1 ponto com coordenada válida** no momento — não é uma
lista fixa, é recalculado a cada atualização dos dados.
* **Sem agrupamento de pinos (cluster)**: foi testado (Leaflet.markercluster)
e o usuário pediu pra desfazer — pinos sempre aparecem individualmente.
* **Ícone do pino**: círculo verde com o caractere ♲ (U+2672, símbolo
universal de reciclagem) — não é mais colorido por tipo de resíduo
(esse recurso existiu e foi removido junto com a coluna de tipo).
* **Rotas no pop-up**: botões para Google Maps e Waze, priorizando a
coordenada exata (`lat,lon`) sobre o endereço em texto — importante
porque o endereço em texto às vezes geocodifica errado (ex.: caiu em
cima de posto de gasolina).
* **Filtros**: Município e Bairro, interdependentes (selecionar um município
restringe os bairros mostrados, e vice-versa) + busca por texto livre.
O filtro de "Tipo de resíduo" existiu e foi removido do painel.
* **Cadastro pelo site**: botão "+" no rodapé do painel, abre um formulário
protegido por senha. A senha fica nas *Propriedades do script*
(chave `ADD_PASSWORD`) e é conferida no servidor (`checkPassword` e de novo
dentro de `addPoint`) — não aparece no código-fonte da página. Campos: Município, Bairro,
Nome, Endereço, Latitude/Longitude (opcionais — cai pra uma estimativa por
bairro se não preenchido) e link de foto do Google Drive (opcional).
* **Fotos**: campo de link do Google Drive (não upload de arquivo). O código
extrai o ID do arquivo por regex e monta uma URL de thumbnail
(`drive.google.com/thumbnail?id=...`). **Exige que o arquivo esteja
compartilhado como "Qualquer pessoa com o link"**, senão a imagem
simplesmente não aparece (sem quebrar o layout).
* **Atualização automática**: busca a planilha de novo a cada 60s, mais um
botão de atualizar manual (↻), mais atualização ao voltar pra aba.
* **Layout**: um painel só, flutuante, à direita (ou vira folha inferior em
telas estreitas). Tema escuro verde-floresta/âmbar. Tem um botão 🖥️/📱 que
força manualmente o layout mobile ou desktop, independente da largura real
da tela (útil pra testar no navegador do computador).

## Histórico de problemas já resolvidos (não repetir essas tentativas)

1. **Apps Script servindo o `index.html` dava erro intermitente**
(`Uncaught SyntaxError: Unexpected token 'class'`, depois
`Unexpected identifier 'https'`, depois página em branco). Causas
identificadas por eliminação:

   * Colar um arquivo JS minificado com uma linha gigantesca (\~147 mil
caracteres) no editor do Apps Script corrompe o conteúdo. Resolvido
reformatando com quebras de linha normais (ou evitando embutir
bibliotecas grandes inteiras no arquivo).
   * O mecanismo de incluir arquivos (`<?!= include('arquivo'); ?>` +
`HtmlService.createTemplateFromFile`) se mostrou frágil — foi abandonado
em favor de `HtmlService.createHtmlOutputFromFile('index')` simples.
   * O Apps Script parece reescrever/processar qualquer trecho de texto que
comece com `https://`, **mesmo dentro de tags `<script>`** — isso
quebrava URLs usadas dentro do JavaScript (tiles do OpenStreetMap,
links de rota). Resolvido montando essas strings em tempo de execução
a partir de pedaços (`const HTTPS = "https:" + "//";`) em vez de
escrever o literal `"https://..."` em qualquer lugar dentro do
`<script>`.
   * **Causa raiz mais provável no fim**: colar arquivos grandes/complexos
pelo editor web do Apps Script é, no geral, pouco confiável. A solução
definitiva foi o usuário passar a usar `clasp` (push direto do
computador, sem colar no navegador).
2. **Leaflet carregado via CDN externo (`<script src>`) funciona bem** —
só o conteúdo *embutido* (colado inline) é que se mostrou arriscado.
3. **Busca da planilha via `fetch()` do CSV publicado** funciona (confirmado
num app feito no Gemini, usado como comparação), mas tem cache do Google
que demora a atualizar. Por isso a versão em produção usa
`google.script.run` em vez disso.
4. **Coordenadas aproximadas por bairro** (estimativas que o Claude
inventou no início do projeto, antes de existir uma coluna de
coordenadas reais) causaram pinos em cima de endereços errados
(inclusive um posto de gasolina). Foram sendo substituídas por
coordenadas reais — primeiro manualmente (usuário pegando lat/long no
Google Maps), depois em lote a partir de um arquivo `.kmz` exportado do
Google Earth (110 marcadores, 24 duplicados removidos, 86 pontos
finais, todos em Fortaleza).
5. **Detecção de coluna por nome exato de cabeçalho é frágil** — o usuário
mudou o nome da coluna de coordenadas e o código parou de achar a
maioria dos pontos (caiu de 86 pontos no mapa pra 18, porque só os que
coincidiam com bairros do fallback antigo continuavam aparecendo).
Resolvido com busca flexível por substring normalizada
(`normalize(k).includes('coorden')`) em vez de comparação exata de
string. O mesmo padrão foi usado pra achar a coluna de foto.

## Pendências conhecidas / possíveis próximos passos

* **Cobertura de dados**: hoje só tem pontos de Fortaleza (os 86 do KMZ) —
os pontos antigos de Maracanaú, Caucaia, Maranguape, Aquiraz e Eusébio
podem ou não ainda estar na planilha (não confirmado na última
atualização). Foi entregue também uma pesquisa de pontos oficiais em
outras cidades do Ceará (Sobral, Juazeiro do Norte) em
`pontos\_coleta\_ceara.xlsx`, ainda não incorporada à planilha principal.
* **Coordenadas**: ainda pode haver pinos levemente errados — não há
verificação automática, só correção manual ponto a ponto quando
reportado.
* **Segurança do cadastro** (feito): senha validada no servidor, textos da
planilha escapados antes de ir pro HTML (evita injeção de script), campos
limitados a 300 caracteres e protegidos contra virar fórmula.
Ainda não há rate-limit.
* **Pitch de incubação IFCE**: o projeto está sendo usado como base da
inscrição do usuário na incubadora do IFCE (modalidade "Incubação",
já que o mapa já está funcionando, não é só uma ideia). Roteiro de
vídeo-pitch já foi rascunhado em conversa anterior, não incluído aqui.

