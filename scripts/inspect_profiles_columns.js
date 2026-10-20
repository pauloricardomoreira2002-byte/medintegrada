const https = require('https');

const SUPABASE_URL = 'https://lllfkqfeffsqpyxvdhst.supabase.co';
const SUPABASE_KEY = 'sb_publishable_XpdejS2UDzbUEhlDc01OnA_h3t3MGrb';

// Let's test reading with select of known columns
const columns = ['id', 'name', 'username', 'role', 'active', 'password', 'created_at'];

async function testColumn(col) {
  return new Promise((resolve) => {
    const url = `${SUPABASE_URL}/rest/v1/profiles?select=${col}&limit=1`;
    https.get(url, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ col, status: res.statusCode, data });
      });
    });
  });
}

(async () => {
  for (const c of columns) {
    const res = await testColumn(c);
    console.log(`Column ${c}: status ${res.status} (${res.data})`);
  }
})();
