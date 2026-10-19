/**
 * Publica pacotes diários em public/daily/AAAA-MM-DD.json e atualiza public/daily/index.json.
 * Uso: npm run publish:daily -- [--days 14] [--from AAAA-MM-DD]
 * Regras: nunca sobrescreve um dia já publicado (versão imutável) e nunca grava pacote inválido.
 */
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { buildDaily, validateDaily } from '../src/lib/daily';

const arg = (name: string, fallback: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};

const days = Number(arg('days', '14'));
const from = arg('from', new Date().toISOString().slice(0, 10));
const dir = 'public/daily';
mkdirSync(dir, { recursive: true });

let created = 0;
let failed = 0;
const start = Date.parse(`${from}T00:00:00Z`);
for (let i = 0; i < days; i++) {
  const date = new Date(start + i * 86400000).toISOString().slice(0, 10);
  const file = `${dir}/${date}.json`;
  if (existsSync(file)) continue;
  try {
    const pack = buildDaily(date);
    const errors = validateDaily(pack);
    if (errors.length) throw new Error(errors.join('; '));
    writeFileSync(file, JSON.stringify(pack));
    created++;
    console.log(`publicado ${date} (${pack.tema}, nível ${pack.nivel})`);
  } catch (e) {
    failed++;
    console.error(`FALHOU ${date}: ${(e as Error).message}`);
  }
}

const dates = readdirSync(dir)
  .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
  .map((f) => f.slice(0, 10))
  .sort()
  .reverse();
writeFileSync(`${dir}/index.json`, JSON.stringify({ dates }));
console.log(`${created} novo(s), ${dates.length} no total.`);
if (failed) process.exit(1);
