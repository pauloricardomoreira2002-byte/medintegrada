/**
 * Teste Automatizado de Validação do Sistema de Pastas:
 * UCT20 CAB (arquivos atuais) e UCT20 Tutoria (pasta vazia pronta para ser populada)
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('================================================================');
console.log('  TESTE DO SISTEMA DE PASTAS: UCT20 CAB & UCT20 TUTORIA');
console.log('================================================================');

let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failedTests++;
  }
}

const baseDir = path.join(__dirname, '..');

// 1. Validar Estrutura Física em Disco
console.log('\n[1/4] Verificando Diretórios Físicos no Disco:');

const pathsToCheck = [
  { p: path.join(baseDir, 'data', 'resumos', 'UCT20 CAB'), minFiles: 5, type: 'Resumos CAB' },
  { p: path.join(baseDir, 'data', 'resumos', 'UCT20 Tutoria'), minFiles: 0, maxFiles: 0, type: 'Resumos Tutoria (Vazia)' },
  { p: path.join(baseDir, 'data', 'simulados', 'UCT20 CAB'), minFiles: 5, type: 'Simulados CAB' },
  { p: path.join(baseDir, 'data', 'simulados', 'UCT20 Tutoria'), minFiles: 0, maxFiles: 0, type: 'Simulados Tutoria (Vazia)' },
  { p: path.join(baseDir, 'assets', 'mapas_html', 'UCT20 CAB'), minFiles: 2, type: 'Mapas CAB' },
  { p: path.join(baseDir, 'assets', 'mapas_html', 'UCT20 Tutoria'), minFiles: 0, maxFiles: 0, type: 'Mapas Tutoria (Vazia)' },
];

pathsToCheck.forEach(item => {
  const exists = fs.existsSync(item.p) && fs.statSync(item.p).isDirectory();
  assert(exists, `Diretório físico existe: ${item.type}`);
  if (exists) {
    const files = fs.readdirSync(item.p);
    if (item.minFiles > 0) {
      assert(files.length >= item.minFiles, `${item.type} contém ${files.length} arquivos (mínimo ${item.minFiles})`);
    }
    if (item.maxFiles === 0) {
      assert(files.length === 0, `${item.type} está completamente vazia (0 arquivos) conforme solicitado`);
    }
  }
});

// 2. Validar js/data.js
console.log('\n[2/4] Verificando Metadados de Pastas no js/data.js:');
const dataJsPath = path.join(baseDir, 'js', 'data.js');
const dataJsCode = fs.readFileSync(dataJsPath, 'utf-8');

const mockWindow = { window: {} };
vm.createContext(mockWindow);
vm.runInContext(dataJsCode, mockWindow);

const resumos = mockWindow.window.MED_RESUMOS || [];
const mapas = mockWindow.window.MED_MAPAS || [];
const simulados = mockWindow.window.MED_SIMULADOS || [];

assert(resumos.length === 5, `Total de 5 resumos cadastrados`);
assert(resumos.every(r => r.folder === 'UCT20 CAB'), `Todos os resumos atuais pertencem à pasta "UCT20 CAB"`);

assert(mapas.length === 2, `Total de 2 mapas comparativos panorâmicos cadastrados`);
assert(mapas.every(m => m.folder === 'UCT20 CAB'), `Todos os mapas atuais pertencem à pasta "UCT20 CAB"`);

assert(simulados.length === 5, `Total de 5 simulados cadastrados`);
assert(simulados.every(s => s.folder === 'UCT20 CAB'), `Todos os simulados atuais pertencem à pasta "UCT20 CAB"`);

// 3. Validar index.html para os seletores de pasta
console.log('\n[3/4] Verificando Elementos de Navegação de Pastas no index.html:');
const html = fs.readFileSync(path.join(baseDir, 'index.html'), 'utf-8');

assert(html.includes('id="resumos-folder-tabs"'), 'Seletor de pastas presente na aba Resumos');
assert(html.includes('id="badge-count-resumos-cab"'), 'Badge de contagem CAB presente na aba Resumos');
assert(html.includes('id="badge-count-resumos-tutoria"'), 'Badge de contagem Tutoria presente na aba Resumos');

assert(html.includes('id="mapas-folder-tabs"'), 'Seletor de pastas presente na aba Mapas');
assert(html.includes('id="badge-count-mapas-cab"'), 'Badge de contagem CAB presente na aba Mapas');
assert(html.includes('id="badge-count-mapas-tutoria"'), 'Badge de contagem Tutoria presente na aba Mapas');

assert(html.includes('id="simulados-folder-tabs"'), 'Seletor de pastas presente na aba Simulados');
assert(html.includes('id="badge-count-simulados-cab"'), 'Badge de contagem CAB presente na aba Simulados');
assert(html.includes('id="badge-count-simulados-tutoria"'), 'Badge de contagem Tutoria presente na aba Simulados');

assert(html.includes('id="importer-folder-select"'), 'Dropdown de seleção de pasta de destino presente no Importador de Simulados');

// 4. Testar Lógica de Troca de Pastas e Estado Vazio
console.log('\n[4/4] Testando Lógica Interativa dos Módulos (Visualizadores & Motor):');

// Criar Mock DOM para testar renderização
class MockElement {
  constructor(id = '') {
    this.id = id;
    this.innerHTML = '';
    this.textContent = '';
    this.classList = {
      classes: new Set(),
      add: (c) => this.classList.classes.add(c),
      remove: (c) => this.classList.classes.delete(c),
      toggle: (c, v) => v ? this.classList.classes.add(c) : this.classList.classes.delete(c),
      contains: (c) => this.classList.classes.has(c)
    };
    this.attributes = {};
  }
  setAttribute(k, v) { this.attributes[k] = v; }
  getAttribute(k) { return this.attributes[k] || null; }
  querySelectorAll() { return []; }
  addEventListener() {}
}

const domElements = {
  'resumos-grid-container': new MockElement('resumos-grid-container'),
  'badge-count-resumos-cab': new MockElement('badge-count-resumos-cab'),
  'badge-count-resumos-tutoria': new MockElement('badge-count-resumos-tutoria'),
  'mapas-panoramicos-container': new MockElement('mapas-panoramicos-container'),
  'badge-count-mapas-cab': new MockElement('badge-count-mapas-cab'),
  'badge-count-mapas-tutoria': new MockElement('badge-count-mapas-tutoria'),
  'simulados-catalog-grid': new MockElement('simulados-catalog-grid'),
  'badge-count-simulados-cab': new MockElement('badge-count-simulados-cab'),
  'badge-count-simulados-tutoria': new MockElement('badge-count-simulados-tutoria'),
};

const fullMockWindow = {
  ...mockWindow,
  localStorage: {
    store: {},
    getItem(k) { return this.store[k] || null; },
    setItem(k, v) { this.store[k] = String(v); },
    removeItem(k) { delete this.store[k]; },
    key(i) { return Object.keys(this.store)[i] || null; },
    get length() { return Object.keys(this.store).length; }
  },
  sessionStorage: { getItem() { return null; }, setItem() {} },
  document: {
    getElementById: (id) => domElements[id] || new MockElement(id),
    querySelectorAll: () => [],
    addEventListener: () => {}
  },
  console: console,
  addEventListener: () => {}
};
fullMockWindow.window = fullMockWindow;

const resumosViewerCode = fs.readFileSync(path.join(baseDir, 'js', 'resumos-viewer.js'), 'utf-8');
const mapasViewerCode = fs.readFileSync(path.join(baseDir, 'js', 'mapas-viewer.js'), 'utf-8');
const simuladoEngineCode = fs.readFileSync(path.join(baseDir, 'js', 'simulado-engine.js'), 'utf-8');
const authCode = fs.readFileSync(path.join(baseDir, 'js', 'auth.js'), 'utf-8');

vm.createContext(fullMockWindow);
vm.runInContext(authCode, fullMockWindow);
vm.runInContext(resumosViewerCode, fullMockWindow);
vm.runInContext(mapasViewerCode, fullMockWindow);
vm.runInContext(simuladoEngineCode, fullMockWindow);

fullMockWindow.MED_SIMULADOS = simulados;

// Teste ResumosViewer
const RV = fullMockWindow.ResumosViewer;
RV.renderCatalog(resumos, 'resumos-grid-container');
assert(RV.activeFolder === 'UCT20 CAB', 'ResumosViewer padrão é UCT20 CAB');
assert(domElements['resumos-grid-container'].innerHTML.includes('Artrite Reumatoide'), 'Resumos CAB renderiza os cards de resumos');
assert(String(domElements['badge-count-resumos-cab'].textContent) === '5', 'Contagem badge CAB é 5');
assert(String(domElements['badge-count-resumos-tutoria'].textContent) === '0', 'Contagem badge Tutoria é 0');

RV.setFolder('UCT20 Tutoria');
assert(RV.activeFolder === 'UCT20 Tutoria', 'Pasta alterada para UCT20 Tutoria');
assert(domElements['resumos-grid-container'].innerHTML.includes('Pasta UCT20 Tutoria Vazia'), 'Pasta Tutoria exibe estado vazio limpo e didático');

RV.setFolder('UCT20 CAB');
assert(domElements['resumos-grid-container'].innerHTML.includes('Artrite Reumatoide'), 'Retorno para UCT20 CAB reexibe os 5 resumos');

// Teste MapasViewer
const MV = fullMockWindow.MapasViewer;
MV.init(mapas);
assert(MV.activeFolder === 'UCT20 CAB', 'MapasViewer padrão é UCT20 CAB');
assert(domElements['mapas-panoramicos-container'].innerHTML.includes('Mapa Comparativo Panorâmico'), 'Mapas CAB renderiza os painéis');
assert(String(domElements['badge-count-mapas-cab'].textContent) === '2', 'Contagem badge mapas CAB é 2');
assert(String(domElements['badge-count-mapas-tutoria'].textContent) === '0', 'Contagem badge mapas Tutoria é 0');

MV.setFolder('UCT20 Tutoria');
assert(domElements['mapas-panoramicos-container'].innerHTML.includes('Pasta UCT20 Tutoria Vazia'), 'Mapas Tutoria exibe estado vazio');

// Teste SimuladoEngine
const SE = fullMockWindow.SimuladoEngine;
SE.init(simulados);
assert(SE.activeFolder === 'UCT20 CAB', 'SimuladoEngine padrão é UCT20 CAB');
assert(domElements['simulados-catalog-grid'].innerHTML.includes('simulado-card'), 'Simulados CAB renderiza as provas');
assert(String(domElements['badge-count-simulados-cab'].textContent) === '5', 'Contagem badge simulados CAB é 5');
assert(String(domElements['badge-count-simulados-tutoria'].textContent) === '0', 'Contagem badge simulados Tutoria é 0');

SE.setFolder('UCT20 Tutoria');
assert(domElements['simulados-catalog-grid'].innerHTML.includes('Pasta UCT20 Tutoria Vazia'), 'Simulados Tutoria exibe estado vazio com botão de importação');

// Teste de importação de simulado para a pasta Tutoria
const newExamTutoria = JSON.stringify({
  id: 'caso-tutoria-01',
  title: 'Caso Clínico PBL 01: Oligoartrite na Tutoria',
  questions: [{ id: 'qt1', stem: 'Questão...', options: [], correctLetter: 'A' }]
});

SE.importExamJson(newExamTutoria, 'UCT20 Tutoria');
assert(SE.activeFolder === 'UCT20 Tutoria', 'Após importar para Tutoria, o simulador abre a pasta UCT20 Tutoria');
assert(domElements['simulados-catalog-grid'].innerHTML.includes('Caso Clínico PBL 01'), 'O novo simulado importado aparece na pasta Tutoria');
assert(String(domElements['badge-count-simulados-tutoria'].textContent) === '1', 'Badge Tutoria atualizado para 1');
assert(String(domElements['badge-count-simulados-cab'].textContent) === '5', 'Badge CAB permanece 5');

console.log('\n================================================================');
console.log(`  RESULTADO: ${passedTests} testes passaram | ${failedTests} falharam`);
console.log('================================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
