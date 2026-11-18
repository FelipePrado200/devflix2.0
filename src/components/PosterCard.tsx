"use client";

import Image from "next/image";
import { img, year } from "@/lib/format";
import type { Movie } from "@/lib/tmdb";
import { useMoviePanel } from "./MoviePanel";
import { Score } from "./Score";

type Props = { movie: Movie; sizes: string; priority?: boolean; showScore?: boolean; level?: 3 | 4 };

/** Pôster que abre o painel do filme. Tab chega nele, Enter abre. */
export function PosterCard({ movie, sizes, priority, showScore = true, level = 3 }: Props) {
  const { open } = useMoviePanel();
  const src = img(movie.posterPath, "w500");
  const Title = level === 4 ? "h4" : "h3";

  return (
    <article className="poster-card flex flex-col gap-3">
      <button
        type="button"
        onClick={(e) => open(movie.id, { from: e.currentTarget, seed: movie })}
        className="poster-frame block aspect-[2/3] w-full overflow-hidden rounded-sm bg-room-2"
        aria-label={`Abrir ${movie.title}`}
      >
        {src && (
          <Image
            src={src}
            alt=""
            width={500}
            height={750}
            sizes={sizes}
            priority={priority}
            className="h-full w-full object-cover"
          />
        )}
      </button>
      <div className="min-w-0">
        <Title className="font-semibold leading-tight break-words">
          {movie.title}
          {movie.releaseDate && <span className="text-light-dim font-normal"> ({year(movie.releaseDate)})</span>}
        </Title>
        {showScore && <Score average={movie.voteAverage} count={movie.voteCount} />}
      </div>
    </article>
  );
}
