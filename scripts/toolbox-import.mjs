// Parses Sparky's markdown tables (docs/toolbox-data/*.md) into raw string cells.
// No values are typed by hand: every cell is copied verbatim from the .md files.
import fs from 'node:fs'; import path from 'node:path';
const dir = 'docs/toolbox-data';
export function parse(text) {
  const tables = []; let cur = null;
  for (const line of text.split('\n')) {
    if (line.trim().startsWith('|')) {
      const cells = line.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      if (!cur) { cur = { headers: cells, rows: [] }; tables.push(cur); }
      else if (cells.every((c) => /^:?-+:?$/.test(c))) continue;
      else cur.rows.push(cells);
    } else cur = null;
  }
  return tables;
}
export function load() {
  const out = {};
  for (const f of fs.readdirSync(dir).filter((f) => /^\d\d-.*\.md$/.test(f)).sort()) { const t = fs.readFileSync(path.join(dir, f), 'utf8'); out[f.slice(0, 2)] = { file: f, tables: parse(t), text: t }; }
  return out;
}
if (process.argv[1].endsWith('toolbox-import.mjs')) {
  fs.writeFileSync('src/lib/toolbox/data/sparky-raw.json', JSON.stringify(load(), null, 1) + '\n');
  console.log('wrote src/lib/toolbox/data/sparky-raw.json');
}
