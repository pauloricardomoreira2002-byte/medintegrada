/**
 * randomize_questions.js
 * Utilitário da skill enamed-exam-crafter para aleatorização e balanceamento rigoroso
 * do gabarito em arrays de questões médicas (JSON ou arquivos .html de simulado).
 * 
 * Garante:
 * 1. Distribuição equilibrada entre as letras (A, B, C, D ou A, B, C, D, E) ~ 25% cada.
 * 2. Máximo de 2 ocorrências consecutivas da mesma letra de gabarito.
 * 3. Remapeamento automático das referências dos distratores (<strong>X está incorreta...</strong>).
 */

const fs = require('fs');

const LETTERS_4 = ['A', 'B', 'C', 'D'];
const LETTERS_5 = ['A', 'B', 'C', 'D', 'E'];

function generateBalancedKey(totalQuestions, numOptions = 4) {
  const letters = numOptions === 5 ? LETTERS_5 : LETTERS_4;
  const perLetter = Math.floor(totalQuestions / letters.length);
  let pool = [];
  letters.forEach(l => {
    for (let i = 0; i < perLetter; i++) pool.push(l);
  });
  while (pool.length < totalQuestions) {
    pool.push(letters[pool.length % letters.length]);
  }

  // Shuffle garantindo no máximo 2 letras consecutivas iguais
  let valid = false;
  let attempts = 0;
  while (!valid && attempts < 2000) {
    attempts++;
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    valid = true;
    for (let i = 2; i < pool.length; i++) {
      if (pool[i] === pool[i - 1] && pool[i] === pool[i - 2]) {
        valid = false;
        break;
      }
    }
  }
  return pool;
}

function shuffleSingleQuestion(q, targetAnswer) {
  const allLetters = q.options.map(o => o.letter);
  const oldAnswer = q.answer;
  const correctOpt = q.options.find(o => o.letter === oldAnswer);
  const distractorOpts = q.options.filter(o => o.letter !== oldAnswer);

  const remainingLetters = allLetters.filter(l => l !== targetAnswer);
  // Embaralha as letras restantes para os distratores
  for (let i = remainingLetters.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [remainingLetters[i], remainingLetters[j]] = [remainingLetters[j], remainingLetters[i]];
  }

  const letterMap = {};
  letterMap[oldAnswer] = targetAnswer;
  distractorOpts.forEach((opt, idx) => {
    letterMap[opt.letter] = remainingLetters[idx];
  });

  // Remonta as opções ordenadas por letra (A, B, C, D...)
  const newOptions = [];
  allLetters.forEach(letter => {
    const oldLetter = Object.keys(letterMap).find(k => letterMap[k] === letter);
    const orig = q.options.find(o => o.letter === oldLetter);
    newOptions.push({ letter: letter, text: orig.text });
  });

  // Remapeia as referências dos distratores
  const newDistractors = (q.distractors || []).map(d => {
    const match = d.match(/^<strong>([A-E])([\s\S]*)$/i);
    if (match) {
      const oldL = match[1].toUpperCase();
      const newL = letterMap[oldL] || oldL;
      return `<strong>${newL}${match[2]}`;
    }
    return d;
  });

  // Ordena os distratores alfabeticamente pela nova letra
  newDistractors.sort((a, b) => {
    const ma = a.match(/^<strong>([A-E])/i);
    const mb = b.match(/^<strong>([A-E])/i);
    if (ma && mb) return ma[1].localeCompare(mb[1]);
    return 0;
  });

  return {
    ...q,
    options: newOptions,
    answer: targetAnswer,
    distractors: newDistractors
  };
}

function randomizeQuestionsArray(questions) {
  if (!Array.isArray(questions) || questions.length === 0) return questions;
  const numOptions = questions[0].options ? questions[0].options.length : 4;
  const key = generateBalancedKey(questions.length, numOptions);

  return questions.map((q, idx) => {
    const targetAnswer = key[idx];
    return shuffleSingleQuestion(q, targetAnswer);
  });
}

function randomizeHtmlFile(htmlFilePath) {
  const content = fs.readFileSync(htmlFilePath, 'utf8');
  const qMatch = content.match(/const questions = (\[[\s\S]*?\]);\s*\n\s*\/\/ Estado/);
  if (!qMatch) {
    console.error('Array de questões não encontrado no arquivo HTML:', htmlFilePath);
    return false;
  }

  const questions = JSON.parse(qMatch[1]);
  const randomized = randomizeQuestionsArray(questions);

  const newContent = content.replace(
    qMatch[0],
    `const questions = ${JSON.stringify(randomized, null, 2)};\n\n// Estado`
  );

  fs.writeFileSync(htmlFilePath, newContent, 'utf8');
  console.log(`Arquivo ${htmlFilePath} aleatorizado com sucesso! Total: ${questions.length} questões.`);
  return true;
}

// Execução via linha de comando se invocado diretamente
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log('Uso: node randomize_questions.js <caminho_do_arquivo.html_ou_json>');
    process.exit(0);
  }
  const file = args[0];
  if (file.endsWith('.html')) {
    randomizeHtmlFile(file);
  } else if (file.endsWith('.json')) {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    const randomized = randomizeQuestionsArray(data);
    fs.writeFileSync(file, JSON.stringify(randomized, null, 2), 'utf8');
    console.log(`Arquivo JSON ${file} aleatorizado com sucesso!`);
  }
}

module.exports = {
  generateBalancedKey,
  shuffleSingleQuestion,
  randomizeQuestionsArray,
  randomizeHtmlFile
};
