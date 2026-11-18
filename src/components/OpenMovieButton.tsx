"use client";

import type { Movie } from "@/lib/tmdb";
import { useMoviePanel } from "./MoviePanel";

type Props = { movie: Movie; trailer?: boolean; className?: string; children: React.ReactNode };

export function OpenMovieButton({ movie, trailer, className, children }: Props) {
  const { open } = useMoviePanel();
  return (
    <button type="button" className={className} onClick={(e) => open(movie.id, { from: e.currentTarget, trailer, seed: movie })}>
      {children}
    </button>
  );
}
