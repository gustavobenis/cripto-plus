import { useState } from 'react';
import Icon from '../components/Icon';
import MiniGrid from '../components/MiniGrid';
import { GAME_TYPES, LEVELS, THEMES, TIPO_NAME, levelName, themeName, type Tipo } from '../data/catalog';
import { fmt } from '../components/shared';
import { getPrefs, getResults, load, setPrefs } from '../lib/storage';

export const go = (to: string) => {
  window.location.hash = to;
};
export const newSeed = () => Math.floor(Math.random() * 1_000_000_000);
export const gameUrl = (tipo: Tipo, tema: string, nivel: number, seed: number) =>
  `/jogo/${tipo}?tema=${tema}&nivel=${nivel}&seed=${seed}`;

/** Desafio diário: a data local define sementes e tema; todos veem o mesmo jogo no dia. */
export function dailyInfo(d = new Date()) {
  const key = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  const dayNumber = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
  const themes = THEMES.filter((t) => t.id !== 'variado');
  return { key, tema: themes[dayNumber % themes.length], label: d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }) };
}

export function Home() {
  const daily = dailyInfo();
  const last = load<{ tipo: Tipo; tema: string; nivel: number; seed: number }>('cripto:last');
  return (
    <>
      <section className="hero">
        <div className="container hero-inner">
          <div className="hero-copy">
            <p className="eyebrow">Bem-vindo ao Cripto+</p>
            <h1>
              Mais que palavras, <br />
              um universo de desafios.
            </h1>
            <p className="lead">
              Palavras cruzadas, criptogramas e muito mais. Novos jogos todos os dias, para todas as idades — sem cadastro.
            </p>
            <div className="hero-cta">
              <button className="btn btn-accent btn-lg" onClick={() => go('/jogar')}>
                Começar a jogar <Icon name="arrow" />
              </button>
              {last && (
                <button className="btn btn-outline-light btn-lg" onClick={() => go(gameUrl(last.tipo, last.tema, last.nivel, last.seed))}>
                  Continuar jogo
                </button>
              )}
            </div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <MiniGrid />
            <span className="hero-chip c1">PALAVRA</span>
            <span className="hero-chip c2">CRIPTO</span>
          </div>
        </div>
      </section>

      <section className="container section">
        <div className="section-head">
          <h2>Escolha um tipo de jogo</h2>
        </div>
        <div className="card-grid">
          {GAME_TYPES.map((g) => (
            <button
              key={g.id}
              className="type-card"
              disabled={!g.tipo}
              onClick={() => g.tipo && go(`/novo/${g.tipo}`)}
            >
              <span className="type-icon">
                <Icon name={g.icon} size={28} />
              </span>
              <strong>{g.name}</strong>
              <span className="muted">{g.desc}</span>
            </button>
          ))}
          <button className="type-card" onClick={() => go(`/jogo/cruzadas?tema=variado&nivel=3&seed=${newSeed()}`)}>
            <span className="type-icon">
              <Icon name="star" size={28} />
            </span>
            <strong>Desafio surpresa</strong>
            <span className="muted">Tema aleatório, nível médio</span>
          </button>
        </div>
      </section>

      <section className="container section split">
        <div className="daily-card">
          <p className="badge badge-accent">Desafio do dia</p>
          <h2>{daily.tema.icon} {daily.tema.name}</h2>
          <p className="muted">{daily.label}</p>
          <div className="daily-actions">
            <button className="btn btn-primary" onClick={() => go(gameUrl('cruzadas', daily.tema.id, 3, daily.key))}>
              Palavras Cruzadas <Icon name="arrow" />
            </button>
            <button className="btn btn-ghost" onClick={() => go(gameUrl('cripto', 'ditados', 3, daily.key))}>
              Criptograma
            </button>
          </div>
        </div>
        <div className="promo">
          <p className="badge badge-new">Novo</p>
          <h2>Torne-se um Mestre das Palavras</h2>
          <p>Complete desafios, acompanhe seu progresso e dispute a sequência diária.</p>
          <button className="btn btn-accent" onClick={() => go('/progresso')}>
            Ver meu progresso <Icon name="arrow" />
          </button>
          <span className="promo-trophy" aria-hidden="true">🏆</span>
        </div>
      </section>

      <section className="container section">
        <ul className="features">
          {[
            ['clock', 'Intuitivo'],
            ['star', 'Moderno'],
            ['grid', '100% responsivo'],
            ['calendar', 'Atualizado diariamente'],
            ['search', 'Temas variados'],
          ].map(([icon, label]) => (
            <li key={label}>
              <Icon name={icon} /> {label}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

export function ModeSelect() {
  return (
    <section className="container section">
      <h1>Escolha um tipo de jogo</h1>
      <div className="card-grid">
        {GAME_TYPES.map((g) => (
          <button key={g.id} className="type-card" disabled={!g.tipo} onClick={() => g.tipo && go(`/novo/${g.tipo}`)}>
            <span className="type-icon">
              <Icon name={g.icon} size={28} />
            </span>
            <strong>{g.name}</strong>
            <span className="muted">{g.desc}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

export function Setup({ tipo }: { tipo: Tipo }) {
  const [tema, setTema] = useState('variado');
  const [nivel, setNivel] = useState(3);
  const [timer, setTimer] = useState(getPrefs().timer);
  const isCripto = tipo === 'cripto';
  const start = () => {
    setPrefs({ ...getPrefs(), timer });
    go(gameUrl(tipo, isCripto ? 'ditados' : tema, nivel, newSeed()));
  };
  return (
    <section className="container section setup">
      <h1>{TIPO_NAME[tipo]}</h1>
      <p className="muted">Personalize o seu desafio.</p>

      {!isCripto && (
        <fieldset>
          <legend>Tema</legend>
          <div className="theme-grid">
            {THEMES.map((t) => (
              <label key={t.id} className={tema === t.id ? 'choice on' : 'choice'}>
                <input type="radio" name="tema" checked={tema === t.id} onChange={() => setTema(t.id)} />
                <span aria-hidden="true" className="choice-icon">{t.icon}</span>
                {t.name}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <fieldset>
        <legend>Dificuldade</legend>
        <div className="level-list">
          {LEVELS.map((l) => (
            <label key={l.id} className={nivel === l.id ? 'choice level on' : 'choice level'}>
              <input type="radio" name="nivel" checked={nivel === l.id} onChange={() => setNivel(l.id)} />
              <strong>{l.name}</strong>
              <span className="muted">{l.desc}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="switch">
        <input type="checkbox" checked={timer} onChange={(e) => setTimer(e.target.checked)} />
        Mostrar cronômetro
      </label>

      <button className="btn btn-primary btn-lg btn-block" onClick={start}>
        Iniciar jogo <Icon name="arrow" />
      </button>
    </section>
  );
}

export function Progress() {
  const results = getResults();
  const total = results.length;
  const best = results.length ? Math.min(...results.map((r) => r.time)) : 0;
  const noHelp = results.filter((r) => r.hints === 0).length;
  return (
    <section className="container section">
      <h1>Meu progresso</h1>
      <div className="stats">
        <div className="stat"><strong>{total}</strong><span>Jogos concluídos</span></div>
        <div className="stat"><strong>{noHelp}</strong><span>Sem usar dicas</span></div>
        <div className="stat"><strong>{total ? fmt(best) : '—'}</strong><span>Melhor tempo</span></div>
      </div>
      {total === 0 ? (
        <p className="muted">Você ainda não concluiu nenhum jogo. Que tal começar agora?</p>
      ) : (
        <ul className="history">
          {results.slice(0, 30).map((r) => (
            <li key={r.id}>
              <span>
                <strong>{TIPO_NAME[r.tipo]}</strong>
                <span className="muted"> · {r.tipo === 'cripto' ? 'Ditados' : themeName(r.tema)} · {levelName(r.nivel)}</span>
              </span>
              <span>{fmt(r.time)} · {r.hints} dica(s)</span>
            </li>
          ))}
        </ul>
      )}
      <p className="muted small">Os dados ficam salvos apenas neste dispositivo.</p>
    </section>
  );
}
