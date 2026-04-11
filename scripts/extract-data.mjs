/**
 * extract-data.mjs
 * Extracts JS data arrays from vantagem-portal.html and writes
 * them as JSON files to public/data/.
 * Run: node scripts/extract-data.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import vm from 'vm';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const htmlLines = readFileSync(path.join(root, 'public/vantagem-portal.html'), 'utf8').split('\n');

// Each entry: { varName, startLine (1-based), endLine (1-based, inclusive) }
// endLine = the line BEFORE the next major var declaration (or last line)
const targets = [
  { varName: 'SETTER_FASES',      startLine: 25251, endLine: 27257 },
  { varName: 'PARTNER_FASES',     startLine: 27258, endLine: 27719 },
  { varName: 'BUILDER_FASES',     startLine: 27720, endLine: 28187 },
  { varName: 'VANTAGEM_TUTORIALS',startLine: 28202, endLine: 28527 },
  { varName: 'WARROOM_LIBRARY',   startLine: 28528, endLine: 28600 },
];

const outDir = path.join(root, 'public/data');
mkdirSync(outDir, { recursive: true });

const outFiles = {
  SETTER_FASES:       'setter.json',
  PARTNER_FASES:      'partner.json',
  BUILDER_FASES:      'builder.json',
  VANTAGEM_TUTORIALS: 'vantagemsys.json',
  WARROOM_LIBRARY:    'warroom.json',
};

for (const { varName, startLine, endLine } of targets) {
  // Extract the lines for this variable (1-based → 0-based)
  const snippet = htmlLines.slice(startLine - 1, endLine).join('\n');

  // Find the first assignment `= [` or `= {` and extract from there
  const assignIdx = snippet.indexOf('=');
  if (assignIdx === -1) { console.error(`✗ No '=' in ${varName} snippet`); continue; }

  // Everything after the `=` up to the last `;` or end
  let rhs = snippet.slice(assignIdx + 1).trim();
  // Remove trailing semicolons / whitespace
  rhs = rhs.replace(/;\s*$/, '').trim();

  // Wrap in a module that exports the value
  const code = `(${rhs})`;

  let value;
  try {
    value = vm.runInNewContext(code, {}, { timeout: 10000 });
  } catch (e) {
    // Try trimming to just the first balanced bracket block
    const openChar = rhs[0]; // '[' or '{'
    const closeChar = openChar === '[' ? ']' : '}';
    let depth = 0, end = 0;
    for (let i = 0; i < rhs.length; i++) {
      if (rhs[i] === openChar) depth++;
      else if (rhs[i] === closeChar) { depth--; if (depth === 0) { end = i; break; } }
    }
    const trimmed = rhs.slice(0, end + 1);
    try {
      value = vm.runInNewContext(`(${trimmed})`, {}, { timeout: 10000 });
    } catch (e2) {
      console.error(`✗ ${varName} eval failed: ${e2.message.slice(0, 120)}`);
      continue;
    }
  }

  const outPath = path.join(outDir, outFiles[varName]);
  const json = JSON.stringify(value, null, 2);
  writeFileSync(outPath, json, 'utf8');
  const sizeKB = (json.length / 1024).toFixed(1);
  const count = Array.isArray(value) ? value.length : Object.keys(value).length;
  console.log(`✓ ${outFiles[varName]}  (${count} entries, ${sizeKB} KB)`);
}
