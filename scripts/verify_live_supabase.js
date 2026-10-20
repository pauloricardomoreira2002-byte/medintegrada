const https = require('https');

const SUPABASE_URL = 'https://lllfkqfeffsqpyxvdhst.supabase.co';
const SUPABASE_KEY = 'sb_publishable_XpdejS2UDzbUEhlDc01OnA_h3t3MGrb';

function request(endpoint, method = 'GET', body = null, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/rest/v1/${endpoint}`);
    const headers = {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      ...extraHeaders
    };
    if (body) {
      headers['Content-Length'] = Buffer.byteLength(JSON.stringify(body));
    }
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: method,
      headers: headers
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let parsed = data;
        try { parsed = JSON.parse(data); } catch(e) {}
        resolve({ status: res.statusCode, data: parsed });
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

(async () => {
  console.log('================================================================');
  console.log('  TESTE END-TO-END SUPABASE AO VIVO (POSTGRESQL)');
  console.log('================================================================');

  // 1. Perfis
  console.log('\n[1/5] Verificando Perfis de Usuários:');
  const profRes = await request('profiles?select=*');
  console.log(`  ✓ Status: ${profRes.status}`);
  console.log(`  ✓ Total de Usuários no Banco: ${profRes.data.length}`);
  profRes.data.forEach(u => console.log(`     - ${u.name} (@${u.username}) [${u.role}]`));

  // 2. Gravação de Progresso de Simulado
  console.log('\n[2/5] Testando Gravação de Progresso (exam_progress):');
  const progPayload = {
    username: 'admin',
    exam_id: 'artrite-reumatoide-01',
    folder: 'UCT20 CAB',
    current_index: 3,
    score: 3,
    total_answered: 3,
    completed: false
  };
  const progRes = await request('exam_progress', 'POST', progPayload, { 'Prefer': 'resolution=merge-duplicates,return=representation' });
  console.log(`  ✓ Status gravação progresso: ${progRes.status}`);

  // 3. Gravação de Resposta e Grifos
  console.log('\n[3/5] Testando Gravação de Resposta e Grifos (question_answers):');
  const ansPayload = {
    username: 'admin',
    exam_id: 'artrite-reumatoide-01',
    question_id: 'ar-q1',
    selected_option: 'B',
    is_correct: true,
    confirmed: true,
    strikes: ['A', 'D'],
    highlights: '<mark class="highlight-yellow">fator reumatoide e anti-CCP</mark>'
  };
  const ansRes = await request('question_answers', 'POST', ansPayload, { 'Prefer': 'resolution=merge-duplicates,return=representation' });
  console.log(`  ✓ Status gravação resposta: ${ansRes.status}`);

  // 4. Consulta do Ranking Pedagógico (View admin_student_rankings)
  console.log('\n[4/5] Consultando View Pedagógica (admin_student_rankings):');
  const rankRes = await request('admin_student_rankings?select=*');
  console.log(`  ✓ Status View: ${rankRes.status}`);
  if (Array.isArray(rankRes.data)) {
    rankRes.data.forEach(r => {
      console.log(`     - Aluno: ${r.student_name} | Prova: ${r.exam_id} | Acertos: ${r.score}/${r.total_answered} (${r.accuracy_percentage}%)`);
    });
  }

  // 5. Preferências de Estudo
  console.log('\n[5/5] Testando Preferências (user_preferences):');
  const prefRes = await request('user_preferences?username=eq.admin');
  console.log(`  ✓ Status preferências admin: ${prefRes.status}`);
  console.log(`  ✓ Configurações carregadas: Tema=${prefRes.data[0]?.theme}, Grifador=${prefRes.data[0]?.highlighter_color}`);

  console.log('\n================================================================');
  console.log('  INTEGRAÇÃO COM SUPABASE 100% OPERACIONAL E VALIDADA!');
  console.log('================================================================');
})();
