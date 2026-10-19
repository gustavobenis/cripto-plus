import { useEffect, useState, type ReactNode } from 'react';
import Icon from '../components/Icon';
import { GAME_TYPES, TIPO_NAME, type Tipo } from '../data/catalog';
import { localDate, type DailyPack } from '../lib/daily';
import { dailyInfo, dailyUrl, go } from './Pages';

const BASE = import.meta.env.BASE_URL;

async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${BASE}${path}`, { cache: 'no-cache' });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

/** Carrega o pacote publicado do dia. Sem ele (ex.: offline sem cache), o jogo é gerado localmente pela mesma semente. */
export function DailyLoader({ date, children }: { date: string; children: (pack: DailyPack | null) => ReactNode }) {
  const [state, setState] = useState<{ date: string; pack: DailyPack | null } | null>(null);
  useEffect(() => {
    let live = true;
    fetchJson<DailyPack>(`daily/${date}.json`).then((pack) => live && setState({ date, pack }));
    return () => {
      live = false;
    };
  }, [date]);
  if (!state || state.date !== date) return <div className="container section muted">Carregando o desafio do dia…</div>;
  return <>{children(state.pack)}</>;
}

const label = (date: string) => {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
};

const DAILY_TYPES = GAME_TYPES.filter((g) => g.tipo);

export function Daily() {
  const d = dailyInfo();
  return (
    <section className="container section">
      <h1>Desafio do dia</h1>
      <p className="muted cap">
        {d.label} · tema {d.theme.name}
      </p>
      <div className="card-grid">
        {DAILY_TYPES.map((g) => (
          <button key={g.id} className="type-card" onClick={() => go(dailyUrl(g.tipo as Tipo))}>
            <span className="type-icon">
              <Icon name={g.icon} size={28} />
            </span>
            <strong>{g.name}</strong>
            <span className="muted">{g.tipo === 'cripto' ? 'Ditados populares' : `Tema: ${d.theme.name}`}</span>
          </button>
        ))}
      </div>
      <p>
        <a href="#/arquivo">Ver o arquivo de desafios anteriores →</a>
      </p>
    </section>
  );
}

export function Archive() {
  const [dates, setDates] = useState<string[] | null | undefined>(undefined);
  useEffect(() => {
    let live = true;
    fetchJson<{ dates: string[] }>('daily/index.json').then((r) => live && setDates(r ? r.dates : null));
    return () => {
      live = false;
    };
  }, []);
  const today = localDate();
  const past = (dates ?? []).filter((x) => x <= today).slice(0, 60);
  return (
    <section className="container section">
      <h1>Arquivo de desafios</h1>
      <p className="muted">Cada dia tem uma versão publicada e imutável: jogue os dias que perdeu.</p>
      {dates === undefined && <p className="muted">Carregando…</p>}
      {dates === null && <p className="muted">Não foi possível carregar o arquivo agora. Tente de novo quando estiver online.</p>}
      {dates && past.length === 0 && <p className="muted">Ainda não há desafios publicados.</p>}
      <ul className="history archive">
        {past.map((date) => {
          const info = dailyInfo(date);
          return (
            <li key={date}>
              <span>
                <strong className="cap">{label(date)}</strong>
                <span className="muted"> · {info.theme.name}</span>
              </span>
              <span className="archive-btns">
                {DAILY_TYPES.map((g) => (
                  <button key={g.id} className="btn btn-ghost" onClick={() => go(dailyUrl(g.tipo as Tipo, date))} aria-label={`${TIPO_NAME[g.tipo as Tipo]} de ${label(date)}`}>
                    <Icon name={g.icon} size={16} /> {g.name.split(' ')[0]}
                  </button>
                ))}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
