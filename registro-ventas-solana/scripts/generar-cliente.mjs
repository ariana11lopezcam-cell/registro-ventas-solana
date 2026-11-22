import fs from 'node:fs';
import { createFromRoot } from 'codama';
import { rootNodeFromAnchor } from '@codama/nodes-from-anchor';
import { renderVisitor } from '@codama/renderers-js';

const anchorIdl = JSON.parse(fs.readFileSync('idl/idl.json', 'utf8'));
const codama = createFromRoot(rootNodeFromAnchor(anchorIdl));

codama.accept(renderVisitor('clients'));
console.log('Cliente TypeScript generado en ./clients');