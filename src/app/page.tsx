import Image from "next/image";
import { OpenMovieButton } from "@/components/OpenMovieButton";
import { Credits } from "@/components/Credits";
import { Letters } from "@/components/Letters";
import { PosterCard } from "@/components/PosterCard";
import { Preroll } from "@/components/Preroll";
import { ReviewCard } from "@/components/ReviewCard";
import { SiteHeader } from "@/components/SiteHeader";
import { Score } from "@/components/Score";
import { Stage } from "@/components/stage/Stage";
import { img, year } from "@/lib/format";
import {
  GENRES,
  getAudienceReviews,
  getByGenre,
  getNowPlaying,
  getTopRated,
  getTrending,
  hasToken,
  type Movie,
} from "@/lib/tmdb";

export const revalidate = 3600;

const NAV = [
  { href: "#em-cartaz", label: "Em cartaz" },
  { href: "#mais-bem-avaliados", label: "Mais bem avaliados" },
  { href: "#publico", label: "O que o público diz" },
  { href: "#generos", label: "Por gênero" },
];

export default async function Home() {
  if (!hasToken()) return <MissingToken />;

  const [trending, nowPlaying, topRated, genres] = await Promise.all([
    getTrending(12),
    getNowPlaying(10),
    getTopRated(8),
    Promise.all(GENRES.map(async (g) => ({ ...g, movies: await getByGenre(g.id, 12) }))),
  ]);

  // Um filme aparece em um gênero só: cada corredor pega os 4 primeiros ainda não usados.
  const used = new Set<number>();
  for (const g of genres) {
    g.movies = g.movies.filter((m) => !used.has(m.id)).slice(0, 4);
    g.movies.forEach((m) => used.add(m.id));
  }

  const featured = trending.find((m) => m.backdropPath) ?? trending[0];
  if (!featured) return <MissingToken />;
  const reviewPool = dedupe([...trending, ...nowPlaying, ...topRated]).slice(0, 16);
  const reviews = await getAudienceReviews(reviewPool, 6);

  // Os quadros da película de carregamento: 4 filmes em alta e, por último, o filme em destaque,
  // que é onde a página abre. Só entra quem tem pôster.
  const frames = [...trending.filter((m) => m.id !== featured.id && m.posterPath).slice(0, 4), featured]
    .filter((m) => m.posterPath)
    .map((m) => ({ id: m.id, title: m.title, posterPath: m.posterPath }));

  return (
    <>
      <Preroll frames={frames} />
      <SiteHeader items={NAV} />
      <main id="conteudo" className="relative z-10">
        <Stage
          featured={featured}
          nowPlaying={nowPlaying}
          topRated={topRated}
          reviews={reviews}
          reviewMovies={reviewPool}
          genres={genres}
          hero={<Hero movie={featured} />}
          sections2d={
            <>
              <section id="em-cartaz" aria-labelledby="em-cartaz-t" className="bg-room-1 py-20 sm:py-24">
                <div className="wrap flex flex-col gap-12">
                  <SectionHead id="em-cartaz-t" title="Em cartaz" lead="Filmes nas salas do Brasil nesta semana." />
                  <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-5 lg:gap-x-6">
                    {nowPlaying.map((m) => (
                      <li key={m.id}>
                        <PosterCard movie={m} sizes="(min-width: 1024px) 240px, (min-width: 640px) 30vw, 45vw" />
                      </li>
                    ))}
                  </ul>
                </div>
              </section>

              <section id="mais-bem-avaliados" aria-labelledby="mba-t" className="bg-screen py-20 sm:py-24">
                <div className="wrap flex flex-col gap-12">
                  <SectionHead
                    id="mba-t"
                    title="Mais bem avaliados"
                    lead="As maiores notas do TMDB, sempre com o número de votos ao lado."
                  />
                  <ol className="grid gap-x-6 gap-y-4 lg:grid-cols-2">
                    {topRated.map((m, i) => (
                      <li key={m.id}>
                        <RankedRow movie={m} rank={i + 1} />
                      </li>
                    ))}
                  </ol>
                </div>
              </section>

              <section id="publico" aria-labelledby="publico-t" className="bg-room-1 py-20 sm:py-24">
                <div className="wrap flex flex-col gap-12">
                  <SectionHead
                    id="publico-t"
                    title="O que o público diz"
                    lead="Trechos de resenhas de espectadores no TMDB, no idioma em que foram escritas."
                  />
                  {reviews.length > 0 ? (
                    <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {reviews.map((r) => (
                        <li key={r.id}>
                          <ReviewCard review={r} />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-light-dim">Nenhum destes filmes tem resenhas no TMDB agora.</p>
                  )}
                </div>
              </section>

              <section id="generos" aria-labelledby="generos-t" className="bg-screen py-20 sm:py-24">
                <div className="wrap flex flex-col gap-16">
                  <SectionHead id="generos-t" title="Por gênero" lead="Quatro filmes populares de cada gênero." />
                  {genres.map((g) => (
                    <section key={g.id} aria-labelledby={`g-${g.slug}`} className="flex flex-col gap-6">
                      <h3 id={`g-${g.slug}`} className="font-display text-tagline font-semibold">
                        {g.name}
                      </h3>
                      <ul className="grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4 lg:gap-x-6">
                        {g.movies.map((m) => (
                          <li key={m.id}>
                            <PosterCard movie={m} level={4} sizes="(min-width: 1024px) 300px, 45vw" />
                          </li>
                        ))}
                      </ul>
                    </section>
                  ))}
                </div>
              </section>
            </>
          }
        />
      </main>
      <Credits year={new Date().getFullYear()} />
    </>
  );
}

function dedupe(list: Movie[]) {
  const seen = new Set<number>();
  return list.filter((m) => (seen.has(m.id) ? false : (seen.add(m.id), true)));
}

function SectionHead({ id, title, lead }: { id: string; title: string; lead: string }) {
  return (
    <div className="flex max-w-[62ch] flex-col gap-2">
      <h2 id={id} className="font-display text-display-lg font-semibold">
        {title}
      </h2>
      <p className="text-light-dim">{lead}</p>
    </div>
  );
}

function Hero({ movie }: { movie: Movie }) {
  const backdrop = img(movie.backdropPath, "w1280");
  const poster = img(movie.posterPath, "w500");
  return (
    <section data-hero aria-labelledby="hero-t" className="relative isolate flex min-h-svh items-end overflow-hidden bg-screen pt-24 pb-16 sm:items-center sm:pb-24">
      {backdrop && (
        <Image data-hero-2d src={backdrop} alt="" fill priority sizes="100vw" className="-z-20 object-cover opacity-35" aria-hidden="true" />
      )}
      {/* Escurece o fundo do filme só onde o texto passa. Vale nos dois modos: a cena 3D fica atrás. */}
      <div className="hero-scrim" aria-hidden="true" />
      <div className="wrap grid items-center gap-8 lg:grid-cols-12 lg:gap-6">
        <div className="flex flex-col gap-6 lg:col-span-7">
          <p className="text-caption text-light">Em alta nesta semana</p>
          <Letters
            as="h1"
            id="hero-t"
            className="font-display text-hero font-semibold break-words text-balance"
            text={movie.title}
          />
          <Score average={movie.voteAverage} count={movie.voteCount} size="lg" />
          {movie.overview && <p className="line-clamp-4 max-w-[56ch] text-light-dim">{movie.overview}</p>}
          <div className="flex flex-col gap-3 sm:flex-row">
            <OpenMovieButton movie={movie} trailer className="btn btn--primary">
              Ver o trailer
            </OpenMovieButton>
            <OpenMovieButton movie={movie} className="btn btn--ghost">
              Ver as avaliações
            </OpenMovieButton>
          </div>
        </div>
        {poster && (
          <div data-hero-2d className="hidden lg:col-span-4 lg:col-start-9 lg:block">
            <Image
              src={poster}
              alt={`Pôster de ${movie.title}`}
              width={500}
              height={750}
              priority
              sizes="410px"
              className="w-full rounded-poster ring-1 ring-hairline"
            />
          </div>
        )}
      </div>
    </section>
  );
}

function RankedRow({ movie, rank }: { movie: Movie; rank: number }) {
  const poster = img(movie.posterPath, "w185");
  return (
    <article className="poster-card grid grid-cols-[32px_64px_1fr] items-center gap-4 rounded-md bg-room-1 p-4 sm:grid-cols-[40px_80px_1fr_auto]">
      <p className="text-center font-display text-tagline font-semibold text-light-dim tabular-nums">
        {rank}
        <span className="sr-only">º lugar</span>
      </p>
      <OpenMovieButton movie={movie} className="poster-frame block aspect-[2/3] overflow-hidden rounded-sm bg-room-2">
        {poster && <Image src={poster} alt="" width={185} height={278} sizes="80px" className="h-full w-full object-cover" />}
        <span className="sr-only">Abrir {movie.title}</span>
      </OpenMovieButton>
      <div className="min-w-0">
        <h3 className="font-semibold break-words">{movie.title}</h3>
        <p className="text-caption text-light-dim">{year(movie.releaseDate)}</p>
        <div className="sm:hidden">
          <Score average={movie.voteAverage} count={movie.voteCount} />
        </div>
      </div>
      <div className="hidden text-right sm:block">
        <Score average={movie.voteAverage} count={movie.voteCount} size="lg" />
      </div>
    </article>
  );
}

function MissingToken() {
  return (
    <main id="conteudo" className="grid min-h-svh place-items-center bg-screen">
      <div className="wrap flex max-w-[62ch] flex-col gap-4">
        <h1 className="font-display text-display-md font-semibold">Falta o token do TMDB</h1>
        <p className="text-light-dim">
          Crie o arquivo <code>.env.local</code> na raiz do projeto com a linha <code>TMDB_TOKEN=</code> e o seu
          “API Read Access Token” de themoviedb.org/settings/api. Depois reinicie o servidor.
        </p>
        <p className="text-light-dim">A página não mostra filmes de exemplo: todo dado vem do TMDB.</p>
      </div>
    </main>
  );
}
