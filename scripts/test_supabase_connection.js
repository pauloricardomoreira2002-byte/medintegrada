const https = require('https');

const SUPABASE_URL = 'https://lllfkqfeffsqpyxvdhst.supabase.co';
const SUPABASE_KEY = 'sb_publishable_XpdejS2UDzbUEhlDc01OnA_h3t3MGrb';

const tables = ['profiles', 'exam_progress', 'question_answers', 'user_preferences', 'shared_exams'];

async function checkTable(table) {
  return new Promise((resolve) => {
    const url = `${SUPABASE_URL}/rest/v1/${table}?select=*&limit=1`;
    const options = {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    };
    https.get(url, options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        resolve({ table, status: res.statusCode, data });
      });
    }).on('error', (err) => {
      resolve({ table, error: err.message });
    });
  });
}

(async () => {
  for (const t of tables) {
    const r = await checkTable(t);
    console.log(`Table ${t}: status ${r.status} -> ${r.data}`);
  }
})();
