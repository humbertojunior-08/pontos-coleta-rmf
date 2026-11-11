/**
 * Pontos de Coleta — Região Metropolitana de Fortaleza
 *
 * Configuração (sem segredos no código):
 *   No editor do Apps Script: Configurações do projeto (engrenagem) →
 *   Propriedades do script → adicione:
 *     SHEET_URL     = link de edição da planilha dos pontos
 *                     (opcional se o script estiver vinculado à planilha)
 *     ADD_PASSWORD  = senha exigida para cadastrar novos pontos pelo site
 *
 * Publicação:
 *   clasp push  →  clasp deploy
 *   (ou Implantar > Nova implantação > "App da Web",
 *    Executar como: Eu · Quem pode acessar: Qualquer pessoa)
 */

const PROPS = PropertiesService.getScriptProperties();

// Usa SHEET_URL das Propriedades do script; se não houver, usa a planilha
// à qual o script está vinculado.
// Se a planilha tiver mais de uma aba, troque getSheets()[0] por
// getSheetByName('Nome da aba').
function getSpreadsheet_() {
  const url = PROPS.getProperty('SHEET_URL');
  return url ? SpreadsheetApp.openByUrl(url) : SpreadsheetApp.getActiveSpreadsheet();
}
function getSheet_() {
  return getSpreadsheet_().getSheets()[0];
}

// Serve a página quando alguém abre a URL do Web App.
function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('Pontos de Coleta — RMF')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// Chamado pela página (google.script.run) para ler todos os pontos da planilha.
// A coluna H (8ª coluna, índice 7) é lida à parte como status/observação —
// não precisa de nome no cabeçalho. Se tiver "DESATIVADO" (em qualquer
// caixa), o ponto some do site; qualquer outro valor não afeta nada.
function getPoints() {
  const sheet = getSheet_();
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data.shift();
  return data
    .filter(function (row) { return row.some(function (cell) { return cell !== ''; }); })
    .map(function (row) {
      const obj = {};
      headers.forEach(function (h, i) { obj[h] = row[i]; });
      obj['__status'] = row[7] || '';
      return obj;
    });
}

// Confere a senha no servidor — ela nunca vai para o navegador.
function checkPassword(password) {
  const expected = PROPS.getProperty('ADD_PASSWORD');
  return !!expected && String(password) === expected;
}

// Chamado pela página (google.script.run) para gravar um novo ponto.
// payload = { password, municipio, bairro, nome, endereco, coordenadas, foto }
// A ordem abaixo precisa bater com as colunas da planilha:
// Município, Bairro, Nome do Local / Ponto, Endereço / Referência,
// Coordenadas Geográficas (Lat,Long), Link da Foto (Google Drive)
function addPoint(payload) {
  if (!payload || !checkPassword(payload.password)) {
    throw new Error('Senha inválida.');
  }
  // Corta tamanho e impede que um texto começando com "=" vire fórmula.
  const clean = function (v) {
    const s = String(v || '').trim().slice(0, 300);
    return s.charAt(0) === '=' ? "'" + s : s;
  };
  if (!clean(payload.municipio) || !clean(payload.bairro) || !clean(payload.nome) || !clean(payload.endereco)) {
    throw new Error('Campos obrigatórios faltando.');
  }
  getSheet_().appendRow([
    clean(payload.municipio),
    clean(payload.bairro),
    clean(payload.nome),
    clean(payload.endereco),
    clean(payload.coordenadas),
    clean(payload.foto)
  ]);
  return { status: 'ok' };
}
