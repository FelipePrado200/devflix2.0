"use client";

import Image from "next/image";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { img, runtime, year } from "@/lib/format";
import { getLenis, gsap } from "@/lib/scroll";
import type { Movie, MovieDetails } from "@/lib/tmdb";
import { EASE, secs } from "@/motion/tokens";
import { ReviewCard } from "./ReviewCard";
import { stage } from "./stage/store";
import { Score } from "./Score";

/** `seed`: o que a página já sabe do filme. O painel mostra isso na hora, sem esperar a rede. */
type OpenOptions = { from?: HTMLElement | null; trailer?: boolean; seed?: Movie };
type Ctx = { open: (id: number, opts?: OpenOptions) => void };

const PanelContext = createContext<Ctx | null>(null);

export function useMoviePanel() {
  const ctx = useContext(PanelContext);
  if (!ctx) throw new Error("useMoviePanel precisa do MoviePanelProvider");
  return ctx;
}

type State =
  | { status: "idle" }
  | { status: "loading"; id: number }
  | { status: "error"; id: number; message: string }
  | { status: "ready"; movie: MovieDetails };

const cache = new Map<number, MovieDetails>();

export function MoviePanelProvider({ children }: { children: React.ReactNode }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const returnTo = useRef<{ el: HTMLElement | null; y: number }>({ el: null, y: 0 });
  const [state, setState] = useState<State>({ status: "idle" });
  const [seed, setSeed] = useState<Movie | null>(null);
  const [playTrailer, setPlayTrailer] = useState(false);

  const load = useCallback(async (id: number, signal?: AbortSignal) => {
    const hit = cache.get(id);
    if (hit) return setState({ status: "ready", movie: hit });
    setState({ status: "loading", id });
    try {
      const res = await fetch(`/api/movie/${id}`, { signal });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Erro ao carregar");
      cache.set(id, body);
      setState({ status: "ready", movie: body });
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setState({ status: "error", id, message: (e as Error).message });
    }
  }, []);

  const open = useCallback(
    (id: number, opts: OpenOptions = {}) => {
      const dialog = dialogRef.current;
      if (!dialog || dialog.open) return;
      returnTo.current = { el: opts.from ?? (document.activeElement as HTMLElement), y: window.scrollY };
      setSeed(opts.seed ?? null);
      setPlayTrailer(Boolean(opts.trailer));
      getLenis()?.stop(); // a página não rola atrás do painel

      // O pôster do filme vem para a frente enquanto o painel cresce a partir dele.
      stage.openId = id;
      // Mesma duração do painel no CSS (--dur-long): o pôster chega quando o painel abre.
      gsap.to(stage, { pull: 1, duration: secs("long"), ease: EASE.enter.gsap, overwrite: true });

      dialog.dataset.state = "opening";
      dialog.showModal();
      requestAnimationFrame(() => {
        dialog.dataset.state = "open";
      });
      load(id);
    },
    [load],
  );

  /** Fechar devolve a pessoa ao mesmo ponto da página e ao mesmo pôster, sem recarregar nada. */
  const finishClose = useCallback(() => {
    const { el, y } = returnTo.current;
    setPlayTrailer(false);
    getLenis()?.start();
    window.scrollTo({ top: y, behavior: "instant" });
    el?.focus({ preventScroll: true });
    gsap.to(stage, {
      pull: 0,
      duration: secs("medium"),
      ease: EASE.exit.gsap,
      overwrite: true,
      onComplete: () => {
        stage.openId = null;
      },
    });
  }, []);

  const close = useCallback(() => {
    const dialog = dialogRef.current;
    if (!dialog?.open || dialog.dataset.state === "closing") return;
    dialog.dataset.state = "closing";
    const done = () => {
      dialog.close();
      dialog.removeAttribute("data-state");
    };
    // Espera a animação de saída; sem ela (movimento reduzido), fecha agora.
    const anim = dialog.getAnimations?.().find((a) => a.playState === "running");
    if (anim) anim.finished.then(done, done);
    else done();
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    // Esc fecha pelo mesmo caminho do botão, para a animação de saída rodar.
    const onCancel = (e: Event) => {
      e.preventDefault();
      close();
    };
    dialog.addEventListener("cancel", onCancel);
    dialog.addEventListener("close", finishClose);
    return () => {
      dialog.removeEventListener("cancel", onCancel);
      dialog.removeEventListener("close", finishClose);
    };
  }, [close, finishClose]);

  return (
    <PanelContext.Provider value={{ open }}>
      {children}
      <dialog
        ref={dialogRef}
        data-lenis-prevent
        className="movie-panel m-0 h-dvh max-h-none w-full max-w-none overflow-y-auto overscroll-contain bg-room-3 p-0 text-light sm:m-auto sm:h-[calc(100dvh-48px)] sm:w-[min(100%-48px,1080px)] sm:rounded-md"
        aria-labelledby="movie-panel-title"
        onClick={(e) => e.target === e.currentTarget && close()}
      >
        <div className="sticky top-0 z-10 flex justify-end p-4">
          <button
            type="button"
            onClick={close}
            className="btn btn--quiet grid size-11 place-items-center rounded-pill p-0"
            aria-label="Fechar o painel do filme"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="-mt-16 px-6 pb-12 sm:px-12">
          {state.status === "error" ? (
            <div className="pt-16" role="alert">
              <p id="movie-panel-title" className="font-semibold">Não foi possível abrir este filme.</p>
              <p className="text-light-dim">{state.message}</p>
              <button type="button" className="btn btn--ghost mt-4" onClick={() => load(state.id)}>
                Tentar de novo
              </button>
            </div>
          ) : (
            <PanelBody
              movie={state.status === "ready" ? state.movie : null}
              seed={seed}
              playTrailer={playTrailer}
              onPlay={() => setPlayTrailer(true)}
            />
          )}
        </div>
      </dialog>
    </PanelContext.Provider>
  );
}

type BodyProps = { movie: MovieDetails | null; seed: Movie | null; playTrailer: boolean; onPlay: () => void };

/**
 * O painel desenha com o que a página já sabe (`seed`) e completa quando os detalhes chegam.
 * Assim ele nunca abre vazio nem pisca.
 */
function PanelBody({ movie, seed, playTrailer, onPlay }: BodyProps) {
  const base = movie ?? seed;
  if (!base) {
    return (
      <p id="movie-panel-title" className="pt-16 text-light-dim" role="status">
        Carregando o filme…
      </p>
    );
  }
  const poster = img(base.posterPath, "w500");
  const facts = [year(base.releaseDate), movie ? runtime(movie.runtime) : "", movie?.genres.slice(0, 3).join(", ") ?? ""].filter(Boolean);

  return (
    <div className="flex flex-col gap-12 pt-16">
      <div className="grid gap-8 sm:grid-cols-[minmax(0,240px)_1fr]">
        {poster && (
          <Image
            src={poster}
            alt={`Pôster de ${base.title}`}
            width={500}
            height={750}
            sizes="(min-width: 640px) 240px, 60vw"
            className="w-40 rounded-poster ring-1 ring-hairline sm:w-full"
          />
        )}
        <div className="flex min-w-0 flex-col gap-4">
          <h2 id="movie-panel-title" className="font-display text-display-md font-semibold break-words">
            {base.title}
          </h2>
          <p className="text-caption text-light-dim">{facts.join(" · ")}</p>
          <Score average={base.voteAverage} count={base.voteCount} size="lg" />
          {base.overview && <p className="max-w-[62ch] text-light-dim">{base.overview}</p>}
          {movie && movie.cast.length > 0 && (
            <p className="text-caption">
              <span className="text-light-dim">Elenco: </span>
              {movie.cast.join(", ")}
            </p>
          )}
        </div>
      </div>

      <section aria-labelledby="panel-trailer" className="flex flex-col gap-4">
        <h3 id="panel-trailer" className="text-tagline font-semibold">Trailer</h3>
        {!movie ? (
          <p className="text-light-dim" role="status">Carregando o trailer…</p>
        ) : movie.trailerKey ? (
          <div className="relative aspect-video overflow-hidden rounded-sm bg-screen">
            {playTrailer ? (
              <iframe
                className="absolute inset-0 h-full w-full"
                src={`https://www.youtube-nocookie.com/embed/${movie.trailerKey}?autoplay=1&rel=0`}
                title={`Trailer de ${base.title}`}
                /* `allow` já concede fullscreen. O atributo antigo junto disso gera aviso no console. */
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              />
            ) : (
              <button type="button" onClick={onPlay} className="absolute inset-0 grid place-items-center">
                {movie.backdropPath && (
                  <Image src={img(movie.backdropPath, "w780")!} alt="" fill sizes="(min-width: 640px) 984px, 100vw" className="object-cover opacity-60" />
                )}
                <span className="btn btn--primary relative">Ver o trailer</span>
              </button>
            )}
          </div>
        ) : (
          <p className="text-light-dim">O TMDB não tem trailer para este filme.</p>
        )}
      </section>

      <section aria-labelledby="panel-reviews" className="flex flex-col gap-4">
        <h3 id="panel-reviews" className="text-tagline font-semibold">Avaliações do público</h3>
        {!movie ? (
          <p className="text-light-dim" role="status">Carregando as avaliações…</p>
        ) : movie.reviews.length > 0 ? (
          <ul className="grid gap-4 md:grid-cols-2">
            {movie.reviews.map((r) => (
              <li key={r.id}>
                <ReviewCard review={r} showMovie={false} max={360} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-light-dim">Este filme ainda não tem resenhas no TMDB. A nota acima vem dos votos.</p>
        )}
      </section>
    </div>
  );
}
