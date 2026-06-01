#!/usr/bin/env node
const fs = require('fs');
const crypto = require('crypto');

function usage() {
  console.log('Usage: node generate-license.js --deviceId=ID --key=./priv.pem [--expires=TIMESTAMP_MS] [--atelierName="Nom de l atelier"] [--issuedBy=NAME] [--outfile=license.json]');
  process.exit(1);
}

const args = process.argv.slice(2).reduce((acc, cur) => {
  const [k, v] = cur.split('=');
  acc[k.replace(/^--/, '')] = v === undefined ? true : v;
  return acc;
}, {});

if (!args.deviceId || !args.key) usage();
const deviceId = args.deviceId;
const keyPath = args.key;
const expires = args.expires ? Number(args.expires) : null;
const atelierName = args.atelierName || null;
const issuedBy = args.issuedBy || null;
const outfile = args.outfile || null;

if (!fs.existsSync(keyPath)) {
  console.error('Private key not found at', keyPath);
  process.exit(2);
}

const payload = { deviceId };
if (expires) payload.expires = expires;
if (atelierName) payload.atelierName = atelierName;
if (issuedBy && !atelierName) payload.issuedBy = issuedBy;

const payloadStr = JSON.stringify(payload);
const privateKey = fs.readFileSync(keyPath, 'utf8');
const sign = crypto.createSign('RSA-SHA256');
sign.update(payloadStr);
const signature = sign.sign(privateKey, 'base64');

const license = { payload, signature };
const out = JSON.stringify(license, null, 2);
const activationUrl = 'ateliko://activate?license=' + encodeURIComponent(JSON.stringify(license));

if (outfile) {
  fs.writeFileSync(outfile, out);
  console.log('Wrote license to', outfile);
  console.log('Activation URL:', activationUrl);
} else {
  console.log(out);
  console.log('\nActivation URL:', activationUrl);
}
