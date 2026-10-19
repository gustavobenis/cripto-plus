import type { WordEntry } from '../lib/crossword';
import raw from '../../content/words.json';

// O conteúdo vive em content/words.json (editável por Pull Request, validado no CI).
export interface WordRecord extends WordEntry {
  source: string;
  verifiedAt: string;
}

export const BANK: Record<string, WordRecord[]> = raw as Record<string, WordRecord[]>;
export const ALL_WORDS: WordRecord[] = Object.values(BANK).flat();
