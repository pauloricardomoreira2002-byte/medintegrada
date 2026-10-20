const crypto = require('crypto');
const https = require('https');
const fs = require('fs');
const path = require('path');

const ACCOUNT_ID = process.env.R2_ACCOUNT_ID || 'e356a91f3126bdb8862469e8392896f6';
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || 'e69d644a4ed30d9404ec6d98211f928e';
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || 'c10278d42cf095f4bc174883bd6ad6a9df69af3ea4a5e60e3d9a789ae8ff7857';
const BUCKET = process.env.R2_BUCKET || 'medintegrada-arquivos';
const REGION = process.env.R2_REGION || 'auto';
const SERVICE = 's3';
const HOST = `${ACCOUNT_ID}.r2.cloudflarestorage.com`;
const PUBLIC_BASE_URL = process.env.R2_PUBLIC_URL || 'https://pub-412bbc51ae9d46f8843247eb29177cf2.r2.dev';

function hmac(key, string) {
  return crypto.createHmac('sha256', key).update(string).digest();
}

function hash(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function getSignatureKey(key, dateStamp, regionName, serviceName) {
  const kDate = hmac('AWS4' + key, dateStamp);
  const kRegion = hmac(kDate, regionName);
  const kService = hmac(kRegion, serviceName);
  return hmac(kService, 'aws4_request');
}

function uploadFile(key, filePath, contentType) {
  const fileBuffer = fs.readFileSync(filePath);
  const payloadHash = hash(fileBuffer);

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.substring(0, 8);

  const method = 'PUT';
  const canonicalUri = `/${BUCKET}/${encodeURIComponent(key).replace(/%2F/g, '/')}`;
  const canonicalQueryString = '';
  const canonicalHeaders = 
    `content-length:${fileBuffer.length}\n` +
    `content-type:${contentType}\n` +
    `host:${HOST}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amzDate}\n`;
  const signedHeaders = 'content-length;content-type;host;x-amz-content-sha256;x-amz-date';

  const canonicalRequest = 
    `${method}\n${canonicalUri}\n${canonicalQueryString}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;

  const algorithm = 'AWS4-HMAC-SHA256';
  const credentialScope = `${dateStamp}/${REGION}/${SERVICE}/aws4_request`;
  const stringToSign = `${algorithm}\n${amzDate}\n${credentialScope}\n${hash(canonicalRequest)}`;

  const signingKey = getSignatureKey(SECRET_ACCESS_KEY, dateStamp, REGION, SERVICE);
  const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');

  const authorizationHeader = 
    `${algorithm} Credential=${ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return new Promise((resolve, reject) => {
    const options = {
      hostname: HOST,
      port: 443,
      path: canonicalUri,
      method: 'PUT',
      headers: {
        'Host': HOST,
        'Content-Type': contentType,
        'Content-Length': fileBuffer.length,
        'x-amz-content-sha256': payloadHash,
        'x-amz-date': amzDate,
        'Authorization': authorizationHeader
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ success: true, statusCode: res.statusCode, url: `${PUBLIC_BASE_URL}/${key}` });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(fileBuffer);
    req.end();
  });
}

async function run() {
  const jsonPath = path.join(__dirname, 'r2_uploaded_files.json');
  let results = {};
  if (fs.existsSync(jsonPath)) {
    try {
      results = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    } catch (e) {
      console.warn('Aviso: r2_uploaded_files.json não pôde ser lido, criando novo.');
    }
  }

  const docxDir = path.join(__dirname, '..', 'assets', 'docx');
  const targetArg = process.argv[2];
  let filesToUpload = [];

  if (targetArg && fs.existsSync(targetArg)) {
    filesToUpload = [path.resolve(targetArg)];
  } else if (fs.existsSync(docxDir)) {
    filesToUpload = fs.readdirSync(docxDir)
      .filter(f => f.endsWith('.docx'))
      .map(f => path.join(docxDir, f));
  }

  console.log(`=======================================================`);
  console.log(`  SINCRONIZADOR AUTOMÁTICO CLOUDFLARE R2`);
  console.log(`  Bucket: ${BUCKET}`);
  console.log(`  Arquivos para envio: ${filesToUpload.length}`);
  console.log(`=======================================================\n`);

  for (let i = 0; i < filesToUpload.length; i++) {
    const fullPath = filesToUpload[i];
    const file = path.basename(fullPath);
    const sizeMB = (fs.statSync(fullPath).size / (1024 * 1024)).toFixed(2);
    const r2Key = `docx/${file}`;

    console.log(`[${i + 1}/${filesToUpload.length}] Enviando: ${file} (${sizeMB} MB)...`);
    try {
      const res = await uploadFile(r2Key, fullPath, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      console.log(`   ✓ Sucesso! URL: ${res.url}`);
      results[file] = res.url;
    } catch (err) {
      console.error(`   ✗ Falha ao enviar ${file}:`, err.message);
    }
  }

  console.log(`\n=======================================================`);
  console.log(`  Sincronização concluída! Total mapeado: ${Object.keys(results).length}`);
  console.log(`=======================================================`);

  // Salva mapeamento em JSON atualizado
  fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));
}

run().catch(console.error);
