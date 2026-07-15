const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const directory = path.join(process.cwd(), 'src', 'data', 'sqlite', 'migrations');
const manifests = fs.readdirSync(directory).filter((name) => name.endsWith('.json')).sort();
let failed = false;

for (const name of manifests) {
  const file = path.join(directory, name);
  const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
  const canonical = JSON.stringify({
    version: manifest.version,
    name: manifest.name,
    statements: manifest.statements.map((statement) => statement.replace(/\r\n/g, '\n')),
  });
  const checksum = crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');
  if (manifest.checksum !== checksum) {
    console.error(`${name}: expected checksum ${checksum}`);
    failed = true;
  }
}

if (failed) process.exitCode = 1;
