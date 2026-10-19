import { normalize } from './normalize';
import { checkContent } from './contentCheck';

/** Marca de sugestão da IA: o validador estrito recusa até um humano trocar por uma fonte real. */
export const PENDING_SOURCE = 'ia-sugerido: conferir fato';

export interface Suggestion {
  answer: string;
  clue: string;
  hint: string;
  tier: number;
}

export interface WordRecord extends Suggestion {
  source: string;
  verifiedAt: string;
}

export function buildPrompt(themeName: string, existing: string[], n: number): string {
  return `Você é redator de passatempos em português do Brasil (palavras cruzadas, caça-palavras, anagramas).
Proponha ${n} palavras NOVAS do tema "${themeName}", com pista e dica em português do Brasil.

Regras obrigatórias:
- "answer": substantivo comum ou nome próprio muito conhecido, em MAIÚSCULAS, só letras A–Z, SEM acentos, espaços ou hífen, de 4 a 12 letras.
- "clue": pista original, escrita por você, de 6 a 14 palavras. NUNCA copie pistas de revistas de passatempos, dicionários ou sites. Não use a própria resposta (nem parte dela) na pista.
- "hint": uma dica extra, curta, que ajuda sem entregar a resposta e também não contém a resposta.
- "tier": 1 (palavra comum), 2 (conhecida) ou 3 (exige repertório).
- Fatos devem ser verdadeiros, estáveis e verificáveis em fontes de referência gerais. Evite datas, recordes, preços e qualquer dado que mude com o tempo. Se não tiver certeza de um fato, não inclua a palavra.
- Não repita nenhuma destas respostas já existentes: ${existing.join(', ')}.

Responda SOMENTE com um array JSON, sem texto antes ou depois, neste formato:
[{"answer":"EXEMPLO","clue":"...","hint":"...","tier":1}]`;
}

/** Extrai o primeiro array JSON da resposta do modelo (tolera cercas de código e texto ao redor). */
export function parseSuggestions(text: string): Suggestion[] {
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start < 0 || end <= start) throw new Error('resposta sem array JSON');
  const data: unknown = JSON.parse(text.slice(start, end + 1));
  if (!Array.isArray(data)) throw new Error('JSON não é um array');
  return data.map((x) => {
    const o = x as Record<string, unknown>;
    return {
      answer: typeof o.answer === 'string' ? normalize(o.answer) : '',
      clue: typeof o.clue === 'string' ? o.clue.trim() : '',
      hint: typeof o.hint === 'string' ? o.hint.trim() : '',
      tier: Number(o.tier),
    };
  });
}

export interface FilterResult {
  accepted: WordRecord[];
  rejected: { answer: string; reason: string }[];
}

/** Aplica as mesmas regras editoriais do CI a cada sugestão e descarta duplicatas. */
export function filterSuggestions(
  bank: Record<string, { answer: string }[]>,
  tema: string,
  suggestions: Suggestion[],
  today: string,
  themeIds: string[],
  max = Infinity,
): FilterResult {
  const taken = new Set(Object.values(bank).flat().map((w) => w.answer));
  const accepted: WordRecord[] = [];
  const rejected: FilterResult['rejected'] = [];
  for (const s of suggestions) {
    const reject = (reason: string) => rejected.push({ answer: s.answer || '(vazia)', reason });
    if (accepted.length >= max) {
      reject('acima da quantidade pedida');
      continue;
    }
    if (taken.has(s.answer)) {
      reject('já existe no banco ou repetida no lote');
      continue;
    }
    if (s.answer.length < 4 || s.answer.length > 12) {
      reject('a resposta deve ter de 4 a 12 letras');
      continue;
    }
    const rec: WordRecord ={ ...s, source: PENDING_SOURCE, verifiedAt: today };
    const errors = checkContent({ [tema]: [rec] }, [], themeIds, { allowPending: true });
    if (errors.length) {
      reject(errors.join('; '));
      continue;
    }
    taken.add(s.answer);
    accepted.push(rec);
  }
  return { accepted, rejected };
}

export function buildReport(tema: string, res: FilterResult, model: string): string {
  const rows = res.accepted
    .map((w) => `| ${w.answer} | ${w.clue} | ${w.hint} | ${w.tier} |`)
    .join('\n');
  const rej = res.rejected.length
    ? `\n<details><summary>${res.rejected.length} sugestão(ões) descartada(s) automaticamente</summary>\n\n${res.rejected
        .map((r) => `- **${r.answer}**: ${r.reason}`)
        .join('\n')}\n</details>\n`
    : '';
  return `## Palavras sugeridas por IA — tema \`${tema}\`

Geradas por \`${model}\` e filtradas pelas regras do \`validate:content\`. **Nada aqui foi verificado por pessoa.**

| Resposta | Pista | Dica | Nível |
|---|---|---|---|
${rows}
${rej}
### Antes de aprovar
- [ ] Conferi **cada fato** em uma fonte confiável
- [ ] Troquei \`source\` (de \`${PENDING_SOURCE}\`) pela fonte real e atualizei \`verifiedAt\`
- [ ] Removi ou reescrevi o que estiver ambíguo, duvidoso ou parecido com pistas de terceiros
- [ ] \`npm run validate:content\` passa (o validador estrito **recusa** itens ainda marcados como \`ia-sugerido\`)

> PRs abertos pelo GitHub Actions não disparam o CI sozinhos: faça um commit (ou feche e reabra o PR) para rodar as checagens.
`;
}
