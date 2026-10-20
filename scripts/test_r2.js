const crypto = require('crypto');
const https = require('https');
const fs = require('fs');
const path = require('path');

const ACCOUNT_ID = 'e356a91f3126bdb8862469e8392896f6';
const ACCESS_KEY_ID = 'e69d644a4ed30d9404ec6d98211f928e';
const SECRET_ACCESS_KEY = 'c10278d42cf095f4bc174883bd6ad6a9df69af3ea4a5e60e3d9a789ae8ff7857';
const BUCKET = 'medintegrada-arquivos';
const REGION = 'auto';
const SERVICE = 's3';
const HOST = `${ACCOUNT_ID}.r2.cloudflarestorage.com`;

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

async function uploadFile(key, filePath, contentType) {
  const fileBuffer = fs.readFileSync(filePath);
  const payloadHash = hash(fileBuffer);

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.substring(0, 8);

  // Canonical Request
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

  // String to Sign
  const algorithm = 'AWS4-HMAC-SHA256';
  const credentialScope = `${dateStamp}/${REGION}/${SERVICE}/aws4_request`;
  const stringToSign = `${algorithm}\n${amzDate}\n${credentialScope}\n${hash(canonicalRequest)}`;

  // Signature
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
          resolve({ success: true, statusCode: res.statusCode });
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

// Test run with a test file
async function test() {
  console.log('Testing upload to Cloudflare R2 bucket: ' + BUCKET);
  const testContent = Buffer.from('Hello MedIntegrada Cloudflare R2 test ' + new Date().toISOString());
  const testPath = path.join(__dirname, 'test_r2.txt');
  fs.writeFileSync(testPath, testContent);

  try {
    const result = await uploadFile('test_r2.txt', testPath, 'text/plain');
    console.log('✅ Upload test SUCCESS:', result);
    fs.unlinkSync(testPath);
  } catch (err) {
    console.error('❌ Upload test FAILED:', err.message);
    if (fs.existsSync(testPath)) fs.unlinkSync(testPath);
  }
}

test();
