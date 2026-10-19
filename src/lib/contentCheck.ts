import { normalize } from './normalize';

interface Rec {
  answer: string;
  clue: string;
  hint: string;
  tier: number;
  source?: string;
  verifiedAt?: string;
}
interface Phrase {
  text: string;
  source?: string;
  verifiedAt?: string;
}

/** Valida content/*.json. Retorna a lista de problemas (vazia = conteúdo aceito). */
export function checkContent(bank: Record<string, Rec[]>, phrases: Phrase[], themeIds: string[]): string[] {
  const errors: string[] = [];
  const seen = new Map<string, string>();
  for (const [tema, list] of Object.entries(bank)) {
    if (!themeIds.includes(tema)) errors.push(`tema desconhecido: ${tema}`);
    for (const w of list) {
      const id = `${tema}/${w.answer}`;
      if (!/^[A-Z]{2,15}$/.test(w.answer)) errors.push(`${id}: resposta deve ter 2–15 letras A–Z, sem acentos`);
      if (seen.has(w.answer)) errors.push(`${id}: resposta duplicada (já em ${seen.get(w.answer)})`);
      seen.set(w.answer, tema);
      if ((w.clue ?? '').trim().length < 6) errors.push(`${id}: pista muito curta`);
      if ((w.hint ?? '').trim().length < 6) errors.push(`${id}: dica muito curta`);
      if (![1, 2, 3].includes(w.tier)) errors.push(`${id}: tier deve ser 1, 2 ou 3`);
      if (!w.source) errors.push(`${id}: falta source`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(w.verifiedAt ?? '')) errors.push(`${id}: verifiedAt deve ser AAAA-MM-DD`);
      for (const [campo, texto] of [['pista', w.clue], ['dica', w.hint]] as const)
        if (w.answer.length >= 4 && normalize(texto).includes(w.answer)) errors.push(`${id}: a ${campo} revela a resposta`);
    }
  }
  const ps = new Set<string>();
  for (const p of phrases) {
    if (!/^[A-Z]+( [A-Z]+)*$/.test(p.text)) errors.push(`frase inválida: ${p.text}`);
    if (ps.has(p.text)) errors.push(`frase duplicada: ${p.text}`);
    ps.add(p.text);
    if (!p.source) errors.push(`frase sem source: ${p.text}`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(p.verifiedAt ?? '')) errors.push(`frase sem verifiedAt: ${p.text}`);
  }
  return errors;
}
