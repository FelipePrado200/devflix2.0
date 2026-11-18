"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { readyAll } from "@/lib/preroll";
import { EASE } from "@/motion/tokens";
import { gsap, ScrollTrigger, scrollToY, startSmoothScroll } from "@/lib/scroll";
import type { Movie, Review } from "@/lib/tmdb";
import { useMoviePanel } from "../MoviePanel";
import { buildLayout, type Counts, STEP_SVH } from "./layout";
import type { Item } from "./Scene";
import { GenreStage, PublicStage, StageSection } from "./sections";
import { stage, type Zone } from "./store";

const Scene = dynamic(() => import("./Scene"), { ssr: false });

export type Genre = { slug: string; name: string; movies: Movie[] };

type Props = {
  featured: Movie;
  nowPlaying: Movie[];
  topRated: Movie[];
  reviews: Review[];
  /** O filme de cada resenha, para o pôster da cena e para abrir o painel. */
  reviewMovies: Movie[];
  genres: Genre[];
  /** Abertura em HTML (igual nos dois modos). */
  hero: React.ReactNode;
  /** Seções em 2D: a versão acessível, usada sem WebGL ou com movimento reduzido. */
  sections2d: React.ReactNode;
};

type Focus = { zone: Zone; index: number };

/** O que o leitor de tela anuncia quando a câmera entra numa cena nova. */
const SCENE_NAME: Record<Zone, string> = {
  hero: "Projeção",
  cartaz: "Em cartaz",
  top: "Os mais bem avaliados",
  publico: "O que o público diz",
  genero: "Por gênero",
};
type Viewport = { w: number; h: number };
/** Onde cada seção começa na rolagem e quanto dela a câmera percorre. */
type Leg = { zone: Zone; at: number; span: number; stops: number };

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export function Stage({ featured, nowPlaying, topRated, reviews, reviewMovies, genres, hero, sections2d }: Props) {
  const { open } = useMoviePanel();
  const [mode, setMode] = useState<"2d" | "3d">("2d");
  const [vp, setVp] = useState<Viewport | null>(null);
  const [focus, setFocus] = useState<Focus>({ zone: "hero", index: 0 });
  const [running, setRunning] = useState(true);
  const focusRef = useRef(focus);
  const legs = useRef<Leg[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const secRefs = useRef(new Map<Zone, HTMLElement>());
  const setSec = useCallback(
    (zone: Zone) => (el: HTMLElement | null) => {
      if (el) secRefs.current.set(zone, el);
      else secRefs.current.delete(zone);
    },
    [],
  );

  // Decide o modo: 3D só com WebGL e sem pedido de movimento reduzido.
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    let stopScroll = () => {};
    const decide = () => {
      stopScroll();
      stopScroll = reduce.matches ? () => {} : startSmoothScroll();
      const use3d = !reduce.matches && hasWebGL();
      setMode(use3d ? "3d" : "2d");
      // Sem cena 3D não há o que esperar: a tela de carregamento não segura ninguém.
      if (!use3d) readyAll();
    };
    decide();
    reduce.addEventListener("change", decide);

    let t = 0;
    const measure = () =>
      setVp((p) => {
        const w = window.innerWidth, h = window.innerHeight;
        // A barra de endereço do celular muda a altura: só reage a mudanças grandes.
        return p && p.w === w && Math.abs(p.h - h) < 120 ? p : { w, h };
      });
    const onResize = () => {
      clearTimeout(t);
      t = window.setTimeout(measure, 200);
    };
    measure();
    window.addEventListener("resize", onResize);
    return () => {
      stopScroll();
      reduce.removeEventListener("change", decide);
      window.removeEventListener("resize", onResize);
      clearTimeout(t);
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.stage = mode;
    return () => {
      delete document.documentElement.dataset.stage;
    };
  }, [mode]);

  const compact = vp ? vp.w < 1024 || vp.w < vp.h : false;
  const few = vp ? vp.w < 768 : false; // celular: menos pôsteres

  const cartaz = useMemo(() => nowPlaying.slice(0, few ? 5 : 8), [nowPlaying, few]);
  const top = useMemo(() => topRated.slice(0, few ? 5 : 8), [topRated, few]);
  const pub = useMemo(() => reviews.slice(0, few ? 4 : 6), [reviews, few]);
  const pubMovies = useMemo(() => pub.map((r) => reviewMovies.find((m) => m.id === r.movieId)!).filter(Boolean), [pub, reviewMovies]);
  const gens = useMemo(
    () => genres.map((g) => ({ ...g, movies: g.movies.slice(0, few ? 2 : 4) })),
    [genres, few],
  );

  const counts = useMemo<Counts>(
    () => ({ cartaz: cartaz.length, top: top.length, publico: pubMovies.length, generos: gens.map((g) => g.movies.length) }),
    [cartaz.length, top.length, pubMovies.length, gens],
  );
  const layout = useMemo(() => (vp ? buildLayout(counts, compact, vp.w / vp.h) : null), [vp, counts, compact]);

  // Cada pôster da cena, com o filme dele.
  const items = useMemo<Item[]>(() => {
    if (!layout) return [];
    const byZone: Record<string, Movie[]> = { cartaz, top, publico: pubMovies };
    const genFlat = gens.flatMap((g) => g.movies);
    const out: Item[] = [{ ...layout.hero, movie: featured }];
    for (const group of layout.groups) {
      if (group.zone === "genero") {
        group.posters.forEach((sl, i) => genFlat[i] && out.push({ ...sl, movie: genFlat[i] }));
      } else {
        const list = byZone[group.zone] ?? [];
        group.posters.forEach((sl, i) => list[i] && out.push({ ...sl, movie: list[i] }));
      }
    }
    return out;
  }, [layout, featured, cartaz, top, pubMovies, gens]);

  // A linha do tempo da câmera, presa à rolagem por um único ScrollTrigger.
  useEffect(() => {
    if (mode !== "3d" || !layout) return;
    const wrap = wrapRef.current, heroEl = heroRef.current;
    const els = layout.groups.map((g) => secRefs.current.get(g.zone));
    if (!wrap || !heroEl || els.some((e) => !e)) return;

    const vh = window.innerHeight;
    // A perna da abertura, e depois uma por seção: a viagem até ela e o passeio dentro dela.
    const list: Leg[] = [];
    let at = heroEl.offsetHeight;
    list.push({ zone: "hero", at: 0, span: at, stops: 1 });
    layout.groups.forEach((g, i) => {
      const span = els[i]!.offsetHeight - vh;
      list.push({ zone: g.zone, at, span, stops: g.stops.length });
      at += span + vh; // o passeio dentro da seção, mais a viagem até a próxima
    });
    legs.current = list;

    const ctx = gsap.context(() => {
      Object.assign(stage.cam, layout.heroStop);
      stage.screen = 1;

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: wrap,
          start: "top top",
          end: "bottom bottom",
          scrub: true,
          onRefresh: (self) => {
            legs.current.forEach((l) => (l.at += 0)); // mantém as medidas
            start.current = self.start;
          },
          onUpdate: (self) => {
            const s = self.scroll() - start.current;
            let next: Focus = { zone: "hero", index: 0 };
            for (let i = 1; i < legs.current.length; i++) {
              const leg = legs.current[i];
              // A seção vale desde a metade da viagem até ela.
              if (s >= leg.at - vh * 0.5) {
                const p = gsap.utils.clamp(0, 1, (s - leg.at) / Math.max(1, leg.span));
                next = { zone: leg.zone, index: Math.round(p * (leg.stops - 1)) };
              }
            }
            stage.zone = next.zone;
            stage.index = next.index;
            const cur = focusRef.current;
            if (cur.zone !== next.zone || cur.index !== next.index) {
              focusRef.current = next;
              setFocus(next);
            }
          },
        },
      });

      // A tela do cinema apaga enquanto a câmera deixa a abertura.
      tl.to(stage, { screen: 0, duration: list[0].span * 0.85, ease: EASE.camera.gsap }, 0);
      layout.groups.forEach((g, i) => {
        const leg = list[i + 1];
        // Viagem da seção anterior até a primeira parada desta.
        tl.to(stage.cam, { ...g.stops[0], duration: i === 0 ? leg.at : vh, ease: EASE.camera.gsap }, i === 0 ? 0 : undefined);
        // Passeio dentro da seção: a câmera desacelera em cada parada.
        for (let k = 1; k < g.stops.length; k++) {
          tl.to(stage.cam, { ...g.stops[k], duration: leg.span / (g.stops.length - 1), ease: EASE.cameraStep.gsap });
        }
      });

      // A cena só desenha enquanto o palco está na tela.
      ScrollTrigger.create({
        trigger: wrap,
        start: "top bottom",
        end: "bottom top",
        onToggle: (self) => setRunning(self.isActive),
      });
    });

    return () => ctx.revert();
  }, [mode, layout]);

  const start = useRef(0);

  // Tab em um item fora de foco leva a câmera até ele.
  const goTo = useCallback((zone: Zone, index: number, count: number) => {
    const cur = focusRef.current;
    if (cur.zone === zone && cur.index === index) return;
    const leg = legs.current.find((l) => l.zone === zone);
    if (!leg) return;
    scrollToY(start.current + leg.at + (count > 1 ? (index / (count - 1)) * leg.span : 0));
  }, []);

  const openMovie = useCallback(
    (movie: Movie, from?: HTMLElement | null) => open(movie.id, { from, seed: movie }),
    [open],
  );

  const openFromScene = useCallback(
    (id: number, zone: Zone) => {
      const from = document.querySelector<HTMLElement>(zone === "hero" ? "[data-hero] button" : `[data-film="${zone}-${id}"]`);
      const seed = items.find((it) => it.movie.id === id)?.movie;
      open(id, { from, seed });
    },
    [open, items],
  );

  const is3d = mode === "3d" && layout !== null;
  const idx = (zone: Zone, fallback: number) => (focus.zone === zone ? focus.index : fallback);

  return (
    <div ref={wrapRef} className="relative">
      {is3d && (
        <div className="pointer-events-none fixed inset-0 -z-10" aria-hidden="true">
          <Scene
            layout={layout}
            items={items}
            backdropPath={featured.backdropPath}
            running={running}
            onOpen={openFromScene}
            onFail={() => {
              setMode("2d");
              readyAll();
            }}
          />
        </div>
      )}
      <div ref={heroRef}>{hero}</div>
      {is3d && (
        /* A câmera trocou de cena: o leitor de tela avisa, sem interromper a leitura. */
        <p className="sr-only" aria-live="polite">
          Cena: {SCENE_NAME[focus.zone]}
        </p>
      )}
      {is3d ? (
        <>
          <StageSection
            ref={setSec("cartaz")}
            id="em-cartaz"
            zone="cartaz"
            title="Em cartaz"
            lead="Filmes nas salas do Brasil nesta semana."
            movies={cartaz}
            active={idx("cartaz", focus.zone === "hero" ? 0 : cartaz.length - 1)}
            onGoTo={goTo}
            onOpen={openMovie}
          />
          <StageSection
            ref={setSec("top")}
            id="mais-bem-avaliados"
            zone="top"
            ranked
            title="Mais bem avaliados"
            lead="As maiores notas do TMDB, sempre com o número de votos ao lado."
            movies={top}
            active={idx("top", 0)}
            onGoTo={goTo}
            onOpen={openMovie}
          />
          <PublicStage
            ref={setSec("publico")}
            reviews={pub}
            movies={pubMovies}
            compact={compact}
            active={idx("publico", 0)}
            onGoTo={goTo}
            onOpen={openMovie}
          />
          <GenreStage
            ref={setSec("genero")}
            genres={gens}
            active={idx("genero", 0)}
            onGoTo={goTo}
            onOpen={openMovie}
          />
        </>
      ) : (
        sections2d
      )}
    </div>
  );
}

export { STEP_SVH };
