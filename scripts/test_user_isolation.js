/**
 * Teste Automatizado de Isolamento de Progresso de Usuários
 * Valida que o progresso de questões, acertos, grifos e respostas
 * é 100% individual e nunca compartilhado entre Admin e Alunos.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('================================================================');
console.log('  TESTE DE ISOLAMENTO DE USUÁRIOS (SIMULADOS & QUESTÕES)');
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

// Criar ambiente simulado de navegador (Mock DOM & localStorage)
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
    const keys = Object.keys(this.store);
    return keys[index] || null;
  }
  get length() {
    return Object.keys(this.store).length;
  }
}

const mockWindow = {
  localStorage: new LocalStorageMock(),
  sessionStorage: new LocalStorageMock(),
  document: {
    getElementById: (id) => ({
      style: {},
      classList: {
        add: () => {},
        remove: () => {},
        toggle: () => {}
      },
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

// Carregar auth.js e simulado-engine.js no sandbox
const authCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'auth.js'), 'utf-8');
const simuladoCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'simulado-engine.js'), 'utf-8');

vm.createContext(mockWindow);
vm.runInContext(authCode, mockWindow);
vm.runInContext(simuladoCode, mockWindow);

const Auth = mockWindow.AuthManager;
const Simulado = mockWindow.SimuladoEngine;
const storage = mockWindow.localStorage;

console.log('\n[1/5] Inicialização dos Módulos');
Auth.init();
assert(typeof Auth.login === 'function', 'AuthManager carregado corretamente');
assert(typeof Simulado.getExamStorageKey === 'function', 'SimuladoEngine carregado corretamente');

console.log('\n[2/5] Teste de Chave de Armazenamento Escopada por Usuário');
// Sem usuário logado
assert(Simulado.getCurrentUsername() === 'guest', 'getCurrentUsername retorna guest quando deslogado');
assert(Simulado.getExamStorageKey('gota-01') === 'med_simulado_state_guest_gota-01', 'Chave de guest gerada corretamente');

// Login Admin
const loginAdminRes = Auth.login('admin', 'admin123', true);
assert(loginAdminRes.success, 'Login do Admin efetuado com sucesso');
assert(Simulado.getCurrentUsername() === 'admin', 'getCurrentUsername identifica "admin"');
assert(Simulado.getExamStorageKey('gota-01') === 'med_simulado_state_admin_gota-01', 'Chave do Admin escopada com prefixo admin_');

// Logout Admin e Login Aluno
Auth.logout();
assert(Simulado.getCurrentUsername() === 'guest', 'Logout reseta para guest');

const loginAlunoRes = Auth.login('aluno', 'aluno123', true);
assert(loginAlunoRes.success, 'Login do Aluno efetuado com sucesso');
assert(Simulado.getCurrentUsername() === 'aluno', 'getCurrentUsername identifica "aluno"');
assert(Simulado.getExamStorageKey('gota-01') === 'med_simulado_state_aluno_gota-01', 'Chave do Aluno escopada com prefixo aluno_');

console.log('\n[3/5] Teste de Isolamento de Progresso e Respostas');
// 1. Logar como Admin e responder a questão 1
Auth.logout();
Auth.login('admin', 'admin123', true);

const mockExam = {
  id: 'gota-2026-01',
  title: 'Hiperuricemia e Artrite Gotosa',
  questions: [
    { id: 'q1', stem: 'Enunciado Q1...', options: [{ letter: 'A' }, { letter: 'B' }], correctLetter: 'B' },
    { id: 'q2', stem: 'Enunciado Q2...', options: [{ letter: 'A' }, { letter: 'C' }], correctLetter: 'C' }
  ]
};

Simulado.allExams = [mockExam];
Simulado.activeExam = mockExam;
Simulado.examState = {
  currentIndex: 1,
  answers: {
    'q1': { selected: 'B', confirmed: true, isCorrect: true }
  },
  strikes: { 'q1': ['A'] },
  highlights: { 'q1': '<mark>Ácido Úrico</mark>' },
  score: 1,
  totalAnswered: 1
};
Simulado.saveExamState();

assert(storage.getItem('med_simulado_state_admin_gota-2026-01') !== null, 'Progresso do Admin salvo na chave do admin');
assert(storage.getItem('med_simulado_state_aluno_gota-2026-01') === null, 'Chave do Aluno NÃO foi criada/afetada pelo Admin');

// 2. Deslogar Admin e Logar como Aluno
Auth.logout();
Auth.login('aluno', 'aluno123', true);

const alunoState = Simulado.loadExamState('gota-2026-01');
assert(alunoState.totalAnswered === 0, 'Aluno inicia com 0 questões respondidas (NÃO herdou do Admin)');
assert(Object.keys(alunoState.answers).length === 0, 'Aluno tem respostas vazias');
assert(Object.keys(alunoState.strikes).length === 0, 'Aluno tem alternativas riscadas vazias');
assert(Object.keys(alunoState.highlights).length === 0, 'Aluno não tem grifos herdados do Admin');

// 3. Aluno responde com alternativa diferente (incorreta)
Simulado.examState = {
  currentIndex: 0,
  answers: {
    'q1': { selected: 'A', confirmed: true, isCorrect: false }
  },
  strikes: {},
  highlights: {},
  score: 0,
  totalAnswered: 1
};
Simulado.saveExamState();

assert(storage.getItem('med_simulado_state_aluno_gota-2026-01') !== null, 'Progresso do Aluno salvo na chave do aluno');

// 4. Deslogar Aluno e Logar novamente como Admin
Auth.logout();
Auth.login('admin', 'admin123', true);

const adminReloaded = Simulado.loadExamState('gota-2026-01');
assert(adminReloaded.totalAnswered === 1, 'Admin manteve 1 questão respondida');
assert(adminReloaded.answers['q1'].selected === 'B', 'Admin manteve sua resposta original B intacta!');
assert(adminReloaded.answers['q1'].isCorrect === true, 'Admin manteve pontuação correta');
assert(adminReloaded.highlights['q1'].includes('Ácido Úrico'), 'Admin manteve seus grifos intactos');

console.log('\n[4/5] Teste de Migração de Dados Legados Compartilhados');
// Simular um navegador existente onde havia chave antiga 'med_simulado_state_mieloma-01' sem prefixo de usuário
storage.setItem('med_simulado_state_mieloma-01', JSON.stringify({
  currentIndex: 0,
  answers: { 'qm1': { selected: 'C', confirmed: true, isCorrect: true } },
  strikes: {},
  highlights: {},
  score: 1,
  totalAnswered: 1
}));

assert(storage.getItem('med_simulado_state_mieloma-01') !== null, 'Chave legada presente no localStorage');
Simulado.migrateLegacyExamDataIfNeeded();

assert(storage.getItem('med_simulado_state_admin_mieloma-01') !== null, 'Chave legada migrada com segurança para o Admin');
assert(storage.getItem('med_simulado_state_mieloma-01') === null, 'Chave legada compartilhada removida');

// Verificar se o aluno vê essa prova legada como zerada
Auth.logout();
Auth.login('aluno', 'aluno123', true);
const alunoMieloma = Simulado.loadExamState('mieloma-01');
assert(alunoMieloma.totalAnswered === 0, 'Aluno não vê progresso da chave legada (permanece 100% zerado)');

console.log('\n[5/5] Teste de Criação e Exclusão de Novo Estudante');
Auth.logout();
Auth.login('admin', 'admin123', true);

const addRes = Auth.addUser('Dr. Roberto Rocha', 'roberto', 'rob123');
assert(addRes.success, 'Novo estudante cadastrado pelo admin');

Auth.logout();
Auth.login('roberto', 'rob123', true);
assert(Simulado.getCurrentUsername() === 'roberto', 'Novo aluno identificado com seu username');

Simulado.examState = {
  currentIndex: 0,
  answers: { 'q1': { selected: 'B', confirmed: true, isCorrect: true } },
  strikes: {},
  highlights: {},
  score: 1,
  totalAnswered: 1
};
Simulado.saveExamState();
assert(storage.getItem('med_simulado_state_roberto_gota-2026-01') !== null, 'Progresso do novo aluno salvo na sua própria chave');

// Excluir aluno no painel admin
Auth.logout();
Auth.login('admin', 'admin123', true);
Auth.deleteUser('roberto');

assert(storage.getItem('med_simulado_state_roberto_gota-2026-01') === null, 'Dados de simulado do aluno excluído foram limpos com sucesso');

console.log('\n================================================================');
console.log(`  RESULTADO FINAL: ${passedTests} testes passaram | ${failedTests} falharam`);
console.log('================================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
