import "server-only";

/**
 * Camada do TMDB. Só roda no servidor: o token nunca vai para o navegador.
 * Toda resposta fica em cache com `revalidate` para respeitar o limite da API.
 */

const API = "https://api.themoviedb.org/3";
const LANG = "pt-BR";
const REVALIDATE = 60 * 60; // 1 hora

export type Movie = {
  id: number;
  title: string;
  overview: string;
  posterPath: string | null;
  backdropPath: string | null;
  voteAverage: number;
  voteCount: number;
  releaseDate: string;
};

export type Review = {
  id: string;
  movieId: number;
  movieTitle: string;
  author: string;
  /** Nota que o autor deu (0 a 10). `null` quando ele não deu nota. */
  rating: number | null;
  content: string;
  url: string;
  createdAt: string;
};

export type MovieDetails = Movie & {
  runtime: number | null;
  genres: string[];
  cast: string[];
  trailerKey: string | null;
  reviews: Review[];
};

export class TmdbMissingToken extends Error {
  constructor() {
    super("TMDB_TOKEN não está definido em .env.local");
  }
}

export function hasToken() {
  return Boolean(process.env.TMDB_TOKEN);
}

async function tmdb<T>(path: string, params: Record<string, string | number> = {}): Promise<T> {
  const token = process.env.TMDB_TOKEN;
  if (!token) throw new TmdbMissingToken();

  const url = new URL(API + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    next: { revalidate: REVALIDATE },
  });
  if (!res.ok) throw new Error(`TMDB ${res.status} em ${path}`);
  return res.json() as Promise<T>;
}

type RawMovie = {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  vote_count: number;
  release_date: string;
};

type RawReview = {
  id: string;
  author: string;
  author_details?: { rating: number | null; username?: string };
  content: string;
  url: string;
  created_at: string;
};

function toMovie(m: RawMovie): Movie {
  return {
    id: m.id,
    title: m.title,
    overview: m.overview,
    posterPath: m.poster_path,
    backdropPath: m.backdrop_path,
    voteAverage: m.vote_average,
    voteCount: m.vote_count,
    releaseDate: m.release_date,
  };
}

function toReview(r: RawReview, movie: { id: number; title: string }): Review {
  return {
    id: r.id,
    movieId: movie.id,
    movieTitle: movie.title,
    author: r.author || r.author_details?.username || "",
    rating: typeof r.author_details?.rating === "number" ? r.author_details.rating : null,
    content: r.content,
    url: r.url,
    createdAt: r.created_at,
  };
}

const withPoster = (list: RawMovie[]) => list.filter((m) => m.poster_path);

export async function getNowPlaying(limit = 10) {
  const data = await tmdb<{ results: RawMovie[] }>("/movie/now_playing", { language: LANG, region: "BR", page: 1 });
  return withPoster(data.results).slice(0, limit).map(toMovie);
}

export async function getTrending(limit = 10) {
  const data = await tmdb<{ results: RawMovie[] }>("/trending/movie/week", { language: LANG });
  return withPoster(data.results).slice(0, limit).map(toMovie);
}

export async function getTopRated(limit = 8) {
  const data = await tmdb<{ results: RawMovie[] }>("/movie/top_rated", { language: LANG, page: 1 });
  return withPoster(data.results).slice(0, limit).map(toMovie);
}

export const GENRES = [
  { id: 28, slug: "acao", name: "Ação" },
  { id: 18, slug: "drama", name: "Drama" },
  { id: 878, slug: "ficcao-cientifica", name: "Ficção científica" },
  { id: 27, slug: "terror", name: "Terror" },
] as const;

export async function getByGenre(genreId: number, limit = 4) {
  const data = await tmdb<{ results: RawMovie[] }>("/discover/movie", {
    language: LANG,
    with_genres: genreId,
    sort_by: "popularity.desc",
    "vote_count.gte": 500,
    include_adult: "false",
  });
  return withPoster(data.results).slice(0, limit).map(toMovie);
}

/** Resenhas de usuários. Sem `language`: o texto fica no idioma original do autor. */
export async function getReviews(movie: { id: number; title: string }, limit = 5) {
  const data = await tmdb<{ results: RawReview[] }>(`/movie/${movie.id}/reviews`, { page: 1 });
  return data.results
    .filter((r) => r.content?.trim() && r.url)
    .slice(0, limit)
    .map((r) => toReview(r, movie));
}

/** Junta resenhas reais de vários filmes, uma por filme, até `limit`. */
export async function getAudienceReviews(movies: Movie[], limit = 6) {
  const lists = await Promise.all(movies.map((m) => getReviews(m, 3).catch(() => [] as Review[])));
  const picked: Review[] = [];
  for (const list of lists) {
    const best = list.find((r) => r.rating !== null) ?? list[0];
    if (best) picked.push(best);
    if (picked.length === limit) break;
  }
  return picked;
}

type RawDetails = RawMovie & {
  runtime: number | null;
  genres: { id: number; name: string }[];
  credits?: { cast: { name: string; order: number }[] };
  videos?: { results: { key: string; site: string; type: string; official: boolean; iso_639_1: string }[] };
};

async function getVideos(id: number) {
  // Trailers em português primeiro; se não houver, em inglês.
  const data = await tmdb<{ results: NonNullable<RawDetails["videos"]>["results"] }>(`/movie/${id}/videos`, {
    include_video_language: "pt,en,null",
  });
  return data.results;
}

export async function getMovieDetails(id: number): Promise<MovieDetails> {
  const d = await tmdb<RawDetails>(`/movie/${id}`, { language: LANG, append_to_response: "credits" });
  const [videos, reviews] = await Promise.all([
    getVideos(id).catch(() => []),
    getReviews({ id: d.id, title: d.title }, 6).catch(() => [] as Review[]),
  ]);

  const yt = videos.filter((v) => v.site === "YouTube" && v.type === "Trailer");
  const trailer =
    yt.find((v) => v.iso_639_1 === "pt" && v.official) ??
    yt.find((v) => v.iso_639_1 === "pt") ??
    yt.find((v) => v.official) ??
    yt[0];

  return {
    ...toMovie(d),
    runtime: d.runtime,
    genres: d.genres.map((g) => g.name),
    cast: (d.credits?.cast ?? [])
      .sort((a, b) => a.order - b.order)
      .slice(0, 6)
      .map((c) => c.name),
    trailerKey: trailer?.key ?? null,
    reviews,
  };
}
