import { excerpt } from "@/lib/format";
import type { Review } from "@/lib/tmdb";

type Props = { review: Review; showMovie?: boolean; max?: number };

/** Trecho real de uma resenha do TMDB, no idioma original, com o link para a resenha completa. */
export function ReviewCard({ review, showMovie = true, max = 280 }: Props) {
  const { text } = excerpt(review.content, max);
  return (
    <article className="flex h-full flex-col gap-4 rounded-md bg-room-1 p-6">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-semibold break-words">{review.author}</p>
          {showMovie && <p className="text-caption text-light-dim break-words">sobre {review.movieTitle}</p>}
        </div>
        {review.rating !== null && (
          <p className="shrink-0 font-semibold tabular-nums">
            <span className="sr-only">Nota do autor: </span>
            {review.rating}
            <span className="text-caption font-normal text-light-dim">/10</span>
          </p>
        )}
      </header>
      <blockquote className="flex-1 text-light-dim" cite={review.url}>
        <p>{text}</p>
      </blockquote>
      <footer className="flex flex-wrap items-center justify-between gap-2 text-caption">
        <span className="text-light-faint">via TMDB</span>
        <a className="link inline-flex min-h-11 items-center" href={review.url} target="_blank" rel="noopener noreferrer">
          Ler a resenha completa
          <span className="sr-only"> de {review.author} no TMDB (abre em nova aba)</span>
        </a>
      </footer>
    </article>
  );
}
