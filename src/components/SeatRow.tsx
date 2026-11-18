/**
 * Uma fileira de cadeiras de cinema, vistas de frente, com baldes de pipoca sobre o assento.
 * Ilustração decorativa em SVG, sem JavaScript: serve à tela de carregamento e ao rodapé, e
 * por isso existe também na versão 2D (o plano B). Nada aqui é informação.
 *
 * Só usa os tokens do DESIGN.md: a cadeira em `room-1` e `room-2` com contorno `hairline`, o
 * aro de luz em `light`, e as listras do balde na cor de destaque, que muda com o filme em
 * foco. Sem degradê e sem sombra: a forma carrega o desenho.
 */

/** Largura e altura de 1 cadeira no sistema de coordenadas do SVG. */
const W = 100;
const H = 100;

const ACCENT = "var(--accent, var(--color-accent))";
const CREAM = "var(--color-light)";

/** Grãos de pipoca de 1 balde: posição relativa ao centro da cadeira, raio e se é dourado. */
const KERNELS: ReadonlyArray<readonly [number, number, number, boolean]> = [
  [-13, 46, 7, false],
  [0, 43, 8, true],
  [13, 46, 7, false],
  [-7, 36, 7, false],
  [7, 36, 7, true],
  [0, 29, 6, false],
  [-17, 40, 5, true],
  [17, 40, 5, false],
];

function Seat({ x, bucket }: { x: number; bucket: boolean }) {
  return (
    <g transform={`translate(${x} 0)`}>
      {/* Pé */}
      <rect x="42" y="88" width="16" height="12" rx="2" style={{ fill: "var(--color-room-3)" }} />
      {/* Braços */}
      <rect x="3" y="52" width="12" height="38" rx="5" className="seat-part" />
      <rect x="85" y="52" width="12" height="38" rx="5" className="seat-part" />
      {/* Encosto, com o fio de luz do projetor na borda de cima */}
      <rect x="16" y="4" width="68" height="60" rx="16" className="seat-part" />
      <path d="M30 5.5H70" style={{ stroke: CREAM, opacity: 0.22, strokeWidth: 1.5, fill: "none", strokeLinecap: "round" }} />
      {/* Assento */}
      <rect x="18" y="64" width="64" height="24" rx="9" className="seat-part seat-part--lift" />

      {bucket ? (
        <g>
          {/* Corpo do balde: 4 listras que se estreitam para baixo, alternando destaque e creme */}
          {[0, 1, 2, 3].map((j) => (
            <polygon
              key={j}
              points={`${34 + 8 * j},52 ${42 + 8 * j},52 ${39 + 5.5 * (j + 1)},84 ${39 + 5.5 * j},84`}
              style={{ fill: j % 2 === 0 ? ACCENT : CREAM, opacity: j % 2 === 0 ? 1 : 0.9 }}
            />
          ))}
          {/* Aro */}
          <rect x="31" y="49.5" width="38" height="5" rx="2.5" style={{ fill: CREAM, opacity: 0.95 }} />
          {/* Pipoca por cima do aro */}
          {KERNELS.map(([dx, y, r, gold], i) => (
            <circle
              key={i}
              cx={50 + dx}
              cy={y}
              r={r}
              style={{
                fill: gold ? ACCENT : CREAM,
                opacity: gold ? 0.8 : 1,
                stroke: "var(--color-room-1)",
                strokeWidth: 0.8,
                strokeOpacity: 0.5,
              }}
            />
          ))}
        </g>
      ) : null}
    </g>
  );
}

type Props = {
  /** Quantas cadeiras na fileira. */
  seats?: number;
  /** Em quais cadeiras (a partir do 0) há um balde de pipoca. */
  buckets?: number[];
  /** Como o desenho se ajusta à caixa. `slice` enche a caixa e corta as pontas; `meet` mostra tudo. */
  fit?: "meet" | "slice";
  className?: string;
};

export function SeatRow({ seats = 9, buckets = [2, 6], fit = "meet", className }: Props) {
  const withBucket = new Set(buckets);
  return (
    <svg
      viewBox={`0 0 ${seats * W} ${H}`}
      preserveAspectRatio={`xMidYMax ${fit}`}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {Array.from({ length: seats }, (_, i) => (
        <Seat key={i} x={i * W} bucket={withBucket.has(i)} />
      ))}
    </svg>
  );
}
