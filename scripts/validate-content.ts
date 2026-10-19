import { BANK } from '../src/data/words';
import { PHRASE_RECORDS } from '../src/data/phrases';
import { THEMES } from '../src/data/catalog';
import { checkContent } from '../src/lib/contentCheck';

const errors = checkContent(BANK, PHRASE_RECORDS, THEMES.map((t) => t.id));
if (errors.length) {
  console.error(`Conteúdo inválido (${errors.length}):\n- ` + errors.join('\n- '));
  process.exit(1);
}
console.log(`Conteúdo OK: ${Object.values(BANK).flat().length} palavras, ${PHRASE_RECORDS.length} frases.`);
