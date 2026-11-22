import fs from 'node:fs';

const [, , idlPath, programId] = process.argv;

if (!idlPath || !programId) {
  console.error('Uso: npm run configurar-idl -- idl/idl.json <PROGRAM_ID>');
  process.exit(1);
}

const idl = JSON.parse(fs.readFileSync(idlPath, 'utf8'));
idl.metadata = {
  ...(idl.metadata || {}),
  address: programId,
};

fs.writeFileSync(idlPath, JSON.stringify(idl, null, 2));
console.log(`IDL configurado correctamente con Program ID: ${programId}`);