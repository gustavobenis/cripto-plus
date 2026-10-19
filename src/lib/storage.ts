// localStorage pode lançar exceção (modo privado, dados bloqueados): tudo é protegido.
export function load<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function save(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* sem persistência: o jogo continua funcionando em memória */
  }
}

export function remove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export interface Prefs {
  timer: boolean;
}
export const getPrefs = (): Prefs => ({ timer: true, ...(load<Partial<Prefs>>('cripto:prefs') ?? {}) });
export const setPrefs = (p: Prefs) => save('cripto:prefs', p);

export interface Result {
  id: string;
  tipo: 'cruzadas' | 'cripto' | 'caca' | 'anagrama';
  tema: string;
  nivel: number;
  time: number;
  hints: number;
  date: string;
}
export const getResults = (): Result[] => load<Result[]>('cripto:results') ?? [];
export function addResult(r: Result) {
  const all = getResults().filter((x) => x.id !== r.id);
  all.unshift(r);
  save('cripto:results', all.slice(0, 200));
}
