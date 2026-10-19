import raw from '../../content/phrases.json';

export interface PhraseRecord {
  text: string;
  source: string;
  verifiedAt: string;
}

// Ditados populares (domínio público), sem acentos (A–Z). Editável em content/phrases.json.
export const PHRASE_RECORDS: PhraseRecord[] = raw;
export const PHRASES: string[] = PHRASE_RECORDS.map((p) => p.text);
