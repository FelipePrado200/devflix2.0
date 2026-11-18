import { score, votes } from "@/lib/format";

type Props = { average: number; count: number; size?: "sm" | "lg" };

/** Nota na escala de 10, sempre com o número de votos ao lado. */
export function Score({ average, count, size = "sm" }: Props) {
  if (!count) return <p className="text-caption text-light-dim">Ainda sem votos no TMDB</p>;
  return (
    <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <span className={`tabular-nums ${size === "lg" ? "font-display text-display-lg font-semibold" : "font-semibold"}`}>
        <span className="sr-only">Nota média: </span>
        {score(average)}
        <span className="text-light-dim font-normal text-caption">/10</span>
      </span>
      <span className="text-caption text-light-dim tabular-nums">{votes(count)} no TMDB</span>
    </p>
  );
}
