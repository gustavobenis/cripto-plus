// Miniatura decorativa de grade para os cards.
const PATTERN = [
  '1011010',
  '1101011',
  '0110110',
  '1011101',
  '1100111',
  '0111010',
];

export default function MiniGrid({ cols = 7 }: { cols?: number }) {
  return (
    <div className="mini-grid" aria-hidden="true" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {PATTERN.flatMap((row, r) =>
        [...row].slice(0, cols).map((v, c) => <span key={`${r}-${c}`} className={v === '1' ? 'on' : 'off'} />),
      )}
    </div>
  );
}
