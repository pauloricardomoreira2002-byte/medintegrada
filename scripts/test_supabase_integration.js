/**
 * Teste Automatizado de Integração do Supabase
 * Valida os métodos do MedSupabase e a resiliência de cache/fallback
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('================================================================');
console.log('  TESTE DE INTEGRAÇÃO SUPABASE & FALLBACK RESILIENTE');
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

class LocalStorageMock {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return this.store.hasOwnProperty(key) ? this.store[key] : null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
  key(index) {
    return Object.keys(this.store)[index] || null;
  }
  get length() {
    return Object.keys(this.store).length;
  }
}

const mockWindow = {
  localStorage: new LocalStorageMock(),
  sessionStorage: new LocalStorageMock(),
  fetch: async (url, opts) => {
    // Mock network fetch for sandbox
    return {
      ok: true,
      status: 200,
      json: async () => ([])
    };
  },
  document: {
    getElementById: (id) => ({
      style: {},
      classList: { add: () => {}, remove: () => {}, toggle: () => {} },
      innerHTML: '',
      textContent: '',
      addEventListener: () => {},
      querySelectorAll: () => []
    }),
    querySelectorAll: () => [],
    addEventListener: () => {}
  },
  console: console
};
mockWindow.window = mockWindow;

const supabaseCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'supabase-client.js'), 'utf-8');
const authCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'auth.js'), 'utf-8');
const simuladoCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'simulado-engine.js'), 'utf-8');

vm.createContext(mockWindow);
vm.runInContext(supabaseCode, mockWindow);
vm.runInContext(authCode, mockWindow);
vm.runInContext(simuladoCode, mockWindow);

const MedSupabase = mockWindow.MedSupabase;
const Auth = mockWindow.AuthManager;
const Simulado = mockWindow.SimuladoEngine;

console.log('\n[1/4] Inicialização do Cliente Supabase:');
assert(!!MedSupabase, 'Objeto MedSupabase instanciado globalmente');
assert(MedSupabase.url.includes('supabase.co'), 'URL do Supabase configurada corretamente');
assert(MedSupabase.key.startsWith('sb_publishable_'), 'Chave Publishable do Supabase configurada corretamente');
assert(typeof MedSupabase.fetchUsers === 'function', 'Método fetchUsers disponível');
assert(typeof MedSupabase.createUser === 'function', 'Método createUser disponível');
assert(typeof MedSupabase.loadExamState === 'function', 'Método loadExamState disponível');
assert(typeof MedSupabase.saveExamState === 'function', 'Método saveExamState disponível');
assert(typeof MedSupabase.saveSharedExam === 'function', 'Método saveSharedExam disponível');

console.log('\n[2/4] Verificação dos Headers de Requisição:');
const headers = MedSupabase.getHeaders();
assert(headers.apikey === MedSupabase.key, 'Header apikey confere com a chave do projeto');
assert(headers.Authorization.includes(MedSupabase.key), 'Header Authorization com Bearer token');
assert(headers['Content-Type'] === 'application/json', 'Content-Type é application/json');

console.log('\n[3/4] Autenticação com Fallback e Contas Padrão:');
Auth.init();
const adminLogin = Auth.login('admin', 'admin123', true);
assert(adminLogin.success === true, 'Login do Admin bem-sucedido no fallback local');
assert(adminLogin.user.username === 'admin', 'Usuário logado é admin');
assert(adminLogin.user.role === 'admin', 'Role do Admin é admin');

const studentLogin = Auth.login('aluno', 'aluno123', true);
assert(studentLogin.success === true, 'Login do Aluno bem-sucedido no fallback local');
assert(studentLogin.user.role === 'student', 'Role do Aluno é student');

console.log('\n[4/4] Sincronização de Simulado com Supabase e Cache Local:');
Simulado.init([]);
Simulado.activeExam = { id: 'artrite-gota-01', folder: 'UCT20 CAB' };
Simulado.examState = {
  currentIndex: 2,
  answers: { 'q1': { selected: 'B', confirmed: true, isCorrect: true } },
  strikes: { 'q1': ['A', 'C'] },
  highlights: { 'q1': '<mark>urato monossódico</mark>' },
  score: 1,
  totalAnswered: 1
};

Simulado.saveExamState();
const storageKey = Simulado.getExamStorageKey('artrite-gota-01');
const savedLocal = JSON.parse(mockWindow.localStorage.getItem(storageKey));
assert(!!savedLocal, 'Estado salvo instantaneamente no localStorage');
assert(savedLocal.score === 1, 'Pontuação gravada no cache');
assert(savedLocal.answers['q1'].selected === 'B', 'Alternativa gravada no cache');
assert(savedLocal.strikes['q1'].length === 2, 'Riscos gravados no cache');
assert(savedLocal.highlights['q1'].includes('urato monossódico'), 'Grifos gravados no cache');

console.log('\n================================================================');
console.log(`  RESULTADO: ${passedTests} testes passaram | ${failedTests} falharam`);
console.log('================================================================');

if (failedTests > 0) process.exit(1);
