/**
 * Sugere palavras novas com IA e as grava em content/words.json marcadas como "ia-sugerido".
 * Quem revisa é uma pessoa, via Pull Request (veja .github/workflows/suggest-words.yml).
 *
 * Uso: npm run suggest:words -- --tema historia [--n 10] [--report relatorio.md] [--fixture resposta.txt]
 * Env: ANTHROPIC_API_KEY (obrigatória sem --fixture), ANTHROPIC_MODEL (opcional)
 * Saída: código 0 = ok (arquivos alterados se houve sugestões aceitas); 2 = sem chave de API.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { THEMES } from '../src/data/catalog';
import { buildPrompt, buildReport, filterSuggestions, parseSuggestions } from '../src/lib/aiWords';

const arg = (name: string, fallback = '') => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};

const tema = arg('tema');
const n = Math.min(30, Math.max(1, Number(arg('n', '10'))));
const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';
const fixture = arg('fixture');
const reportPath = arg('report');

const theme = THEMES.find((t) => t.id === tema && t.id !== 'variado');
if (!theme) {
  console.error(`Tema inválido: "${tema}". Use um de: ${THEMES.filter((t) => t.id !== 'variado').map((t) => t.id).join(', ')}`);
  process.exit(1);
}

const bank = JSON.parse(readFileSync('content/words.json', 'utf8')) as Record<string, { answer: string }[]>;
const existing = Object.values(bank).flat().map((w) => w.answer);

async function ask(): Promise<string> {
  if (fixture) return readFileSync(fixture, 'utf8');
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    console.error('ANTHROPIC_API_KEY não definida: nada a fazer.');
    process.exit(2);
  }
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model,
      max_tokens: 4000,
      // pede alguns a mais: parte será descartada pelo filtro automático
      messages: [{ role: 'user', content: buildPrompt(theme!.name, existing, n + 4) }],
    }),
  });
  if (!res.ok) {
    console.error(`API respondeu ${res.status}: ${(await res.text()).slice(0, 300)}`);
    process.exit(1);
  }
  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  return (data.content ?? []).filter((c) => c.type === 'text').map((c) => c.text ?? '').join('');
}

const text = await ask();
const today = new Date().toISOString().slice(0, 10);
const result = filterSuggestions(
  bank,
  tema,
  parseSuggestions(text),
  today,
  THEMES.map((t) => t.id),
  n,
);

console.log(`Aceitas: ${result.accepted.length} | descartadas: ${result.rejected.length}`);
for (const r of result.rejected) console.log(`  - ${r.answer}: ${r.reason}`);

if (result.accepted.length) {
  (bank[tema] as unknown[]).push(...result.accepted);
  writeFileSync('content/words.json', JSON.stringify(bank, null, 2) + '\n');
  if (reportPath) writeFileSync(reportPath, buildReport(tema, result, fixture ? `fixture` : model));
}
