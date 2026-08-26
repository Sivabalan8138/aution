const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
let schemaContent = fs.readFileSync(schemaPath, 'utf8');

const dbUrl = process.env.DATABASE_URL || '';

let provider = 'sqlite';
if (dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://') || process.env.VERCEL) {
  provider = 'postgresql';
}

console.log(`[prepare-prisma] Setting schema provider to: ${provider}`);

// Regex to replace provider in schema.prisma
const regex = /datasource\s+db\s*{[\s\S]*?provider\s*=\s*"[^"]*"[\s\S]*?}/;
const newDatasource = `datasource db {
  provider = "${provider}"
}`;

if (regex.test(schemaContent)) {
  schemaContent = schemaContent.replace(regex, newDatasource);
  fs.writeFileSync(schemaPath, schemaContent, 'utf8');
  console.log(`[prepare-prisma] schema.prisma updated successfully.`);
} else {
  console.error('[prepare-prisma] Error: Could not find datasource block in schema.prisma');
  process.exit(1);
}
