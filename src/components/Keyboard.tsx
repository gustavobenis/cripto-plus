import Icon from './Icon';

const ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

interface Props {
  onKey: (ch: string) => void;
  onBackspace: () => void;
}

export default function Keyboard({ onKey, onBackspace }: Props) {
  return (
    <div className="vkeys" role="group" aria-label="Teclado virtual">
      {ROWS.map((row, i) => (
        <div className="vkeys-row" key={row}>
          {[...row].map((ch) => (
            <button key={ch} type="button" className="vkey" onClick={() => onKey(ch)}>
              {ch}
            </button>
          ))}
          {i === 2 && (
            <button type="button" className="vkey vkey-wide" onClick={onBackspace} aria-label="Apagar">
              <Icon name="backspace" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
