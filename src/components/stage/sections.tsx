"use client";

import SplitText from "@/components/SplitText";
import { excerpt, year } from "@/lib/format";
import type { Movie, Review } from "@/lib/tmdb";
import { LETTER_STAGGER, secs } from "@/motion/tokens";
import { Score } from "../Score";
import { STEP_SVH } from "./layout";
import type { Zone } from "./store";

type OpenFn = (movie: Movie, from?: HTMLElement | null) => void;
type GoToFn = (zone: Zone, index: number, count: number) => void;

/** Altura: uma tela, mais um passo de rolagem por parada extra da câmera. */
const stageHeight = (stops: number) => ({ height: `calc(100svh + ${(stops - 1) * STEP_SVH}svh)` });

const H2 = "font-display text-display-lg font-semibold";
const H3 = "font-display text-display-md font-semibold break-words";

/** Título da seção: as letras sobem em sequência quando a seção entra na tela. */
function Heading({ text }: { text: string }) {
  return (
    <SplitText
      tag="h2"
      text={text}
      className={H2}
      splitType="chars"
      delay={LETTER_STAGGER}
      effect="rise"
      trigger="view"
      textAlign="left"
      duration={secs("long")}
      threshold={0.2}
    />
  );
}

function Frame({
  children,
  title,
  lead,
  counter,
}: {
  children: React.ReactNode;
  title: string;
  lead: string;
  counter: React.ReactNode;
}) {
  return (
    <div className="sticky top-0 h-svh">
      <div className="wrap flex h-full flex-col pt-20 pb-8 lg:pt-24 lg:pb-12">
        <div className="flex max-w-[62ch] flex-col gap-2">
          <Heading text={title} />
          <p className="hidden text-light-dim lg:block">{lead}</p>
        </div>
        {children}
        {counter}
      </div>
    </div>
  );
}

function Counter({ active, total }: { active: number; total: number }) {
  return (
    <div className="mt-6 flex items-center gap-4" aria-hidden="true">
      <p className="text-caption text-light-dim tabular-nums">
        {String(active + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
      </p>
      <div className="h-0.5 w-32 overflow-hidden bg-room-2">
        <div className="stage-bar h-full origin-left" style={{ transform: `scaleX(${(active + 1) / total})` }} />
      </div>
    </div>
  );
}

type SectionProps = {
  ref: React.Ref<HTMLElement>;
  id: string;
  zone: Zone;
  title: string;
  lead: string;
  movies: Movie[];
  active: number;
  ranked?: boolean;
  onGoTo: GoToFn;
  onOpen: OpenFn;
};

/** Seção fixa na tela enquanto a câmera anda. O filme em foco aparece em HTML, com a nota e os votos. */
export function StageSection({ ref, id, zone, title, lead, movies, active, ranked, onGoTo, onOpen }: SectionProps) {
  const n = movies.length;
  return (
    <section ref={ref} id={id} aria-label={title} style={stageHeight(n)}>
      <Frame title={title} lead={lead} counter={<Counter active={active} total={n} />}>
        <ol className="mt-auto grid lg:my-auto lg:w-5/12">
          {movies.map((m, i) => (
            <li key={m.id} className={`stage-item col-start-1 row-start-1 flex flex-col items-start gap-3 lg:gap-4 ${i === active ? "is-on" : ""}`}>
              {ranked && <p className="font-display text-tagline font-semibold text-light-dim tabular-nums">{i + 1}º lugar</p>}
              <h3 className={H3}>
                {m.title}
                {m.releaseDate && <span className="font-normal text-light-dim"> ({year(m.releaseDate)})</span>}
              </h3>
              <Score average={m.voteAverage} count={m.voteCount} size="lg" />
              <button
                type="button"
                data-film={`${zone}-${m.id}`}
                className="btn btn--primary"
                onFocus={() => onGoTo(zone, i, n)}
                onClick={(e) => onOpen(m, e.currentTarget)}
              >
                Ver sinopse e avaliações
                <span className="sr-only"> de {m.title}</span>
              </button>
            </li>
          ))}
        </ol>
      </Frame>
    </section>
  );
}

type PublicProps = {
  ref: React.Ref<HTMLElement>;
  reviews: Review[];
  movies: Movie[];
  active: number;
  compact: boolean;
  onGoTo: GoToFn;
  onOpen: OpenFn;
};

/**
 * O que o público diz: o pôster do filme fica na cena, e a resenha entra em sequência curta.
 * O texto é o do TMDB, no idioma original, com o link para a resenha completa.
 */
export function PublicStage({ ref, reviews, movies, active, onGoTo, onOpen, compact }: PublicProps) {
  const n = reviews.length;
  const max = compact ? 190 : 300;
  return (
    <section ref={ref} id="publico" aria-label="O que o público diz" style={stageHeight(n)}>
      <Frame
        title="O que o público diz"
        lead="Trechos de resenhas de espectadores no TMDB, no idioma em que foram escritas."
        counter={<Counter active={active} total={n} />}
      >
        <ol className="mt-auto grid lg:my-auto lg:w-6/12">
          {reviews.map((r, i) => {
            const on = i === active;
            const movie = movies[i];
            const { text } = excerpt(r.content, max);
            return (
              <li key={r.id} className={`stage-item col-start-1 row-start-1 flex flex-col items-start gap-4 ${on ? "is-on" : ""}`}>
                <blockquote cite={r.url} className="flex flex-col gap-4">
                  {/* Cada frase entra logo depois da anterior, sem atrasar a leitura. */}
                  <p className="text-lead text-light">{text}</p>
                  <footer className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="font-semibold">{r.author}</span>
                    {r.rating !== null && (
                      <span className="tabular-nums text-light-dim">
                        <span className="sr-only">Nota do autor: </span>
                        {r.rating}/10
                      </span>
                    )}
                    <span className="text-caption text-light-faint">via TMDB</span>
                  </footer>
                </blockquote>
                <p className="text-caption text-light-dim">
                  sobre <span className="text-light">{r.movieTitle}</span>
                </p>
                <div className="flex flex-wrap gap-3">
                  <a className="btn btn--ghost" href={r.url} target="_blank" rel="noopener noreferrer" onFocus={() => onGoTo("publico", i, n)}>
                    Ler a resenha completa
                    <span className="sr-only"> de {r.author} no TMDB (abre em nova aba)</span>
                  </a>
                  {movie && (
                    <button
                      type="button"
                      data-film={`publico-${movie.id}`}
                      className="btn btn--primary"
                      onFocus={() => onGoTo("publico", i, n)}
                      onClick={(e) => onOpen(movie, e.currentTarget)}
                    >
                      Ver o filme
                      <span className="sr-only">: {r.movieTitle}</span>
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </Frame>
    </section>
  );
}

type GenreProps = {
  ref: React.Ref<HTMLElement>;
  genres: { slug: string; name: string; movies: Movie[] }[];
  active: number;
  onGoTo: GoToFn;
  onOpen: OpenFn;
};

/** Por gênero: a câmera para uma vez em cada gênero, com poucos filmes à vista. */
export function GenreStage({ ref, genres, active, onGoTo, onOpen }: GenreProps) {
  const n = genres.length;
  return (
    <section ref={ref} id="generos" aria-label="Por gênero" style={stageHeight(n)}>
      <Frame
        title="Por gênero"
        lead="Um corredor curto para cada gênero."
        counter={<Counter active={active} total={n} />}
      >
        <div className="mt-auto grid lg:w-6/12">
          {genres.map((g, i) => (
            <section
              key={g.slug}
              aria-labelledby={`g-${g.slug}`}
              className={`stage-item col-start-1 row-start-1 flex flex-col items-start gap-4 ${i === active ? "is-on" : ""}`}
            >
              <h3 id={`g-${g.slug}`} className={H3}>
                {g.name}
              </h3>
              <ul className="flex flex-col gap-2">
                {g.movies.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      data-film={`genero-${m.id}`}
                      className="link flex min-h-11 items-center gap-3 text-left"
                      onFocus={() => onGoTo("genero", i, n)}
                      onClick={(e) => onOpen(m, e.currentTarget)}
                    >
                      <span className="font-semibold text-light">{m.title}</span>
                      <span className="shrink-0 tabular-nums text-caption text-light-dim">
                        <span className="sr-only">Nota média: </span>
                        {m.voteAverage.toFixed(1).replace(".", ",")}/10
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </Frame>
    </section>
  );
}
