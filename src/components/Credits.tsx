"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger, scrollToY } from "@/lib/scroll";
import { EASE } from "@/motion/tokens";
import { SeatRow } from "./SeatRow";
import SplitText from "./SplitText";

/**
 * Os créditos. Todos são fatos sobre este site: o que cada peça faz e com o quê. Nenhum nome de
 * pessoa, nenhum prêmio, nada que não seja verdade.
 */
const ROLES: ReadonlyArray<readonly [string, string]> = [
  ["Dados, pôsteres e resenhas", "The Movie Database (TMDB)"],
  ["Cena", "three.js e React Three Fiber"],
  ["Luz", "Shaders próprios em GLSL: feixe, poeira, verniz e grão"],
  ["Movimento", "GSAP e Lenis"],
  ["Tipografia", "Bodoni Moda e Jost"],
  ["Interface", "Next.js 15, React 19 e Tailwind CSS 4"],
];

/**
 * O final da sessão, e a cena 6 do storyboard: "Fim", os créditos subindo como no fim de um
 * filme e a plateia vazia, com pipoca, para quem fica até o fim.
 *
 * A rolagem comanda a subida (`scrub`). Só vira cena assim quando há JavaScript e o movimento
 * não está reduzido; em qualquer outro caso é um bloco estático, com todo o texto no lugar. O
 * aviso do TMDB e o logo ficam no bloco final, que é o que sobra na tela depois dos créditos.
 */
export function Credits({ year }: { year: number }) {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const fim = el.querySelector<HTMLElement>(".credits__fim");
    const roll = el.querySelector<HTMLElement>(".credits__roll");
    const end = el.querySelector<HTMLElement>(".credits__end");
    if (!fim || !roll || !end) return;

    // O CSS troca para o layout de cena (cartaz fixo, 300 svh de rolagem) com esta classe.
    el.classList.add("is-scrub");

    const ctx = gsap.context(() => {
      // autoAlpha liga e desliga o `visibility` junto com a opacidade: o botão do bloco final
      // não recebe foco enquanto está escondido.
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: { trigger: el, start: "top top", end: "bottom bottom", scrub: true, invalidateOnRefresh: true },
      });
      tl.fromTo(roll, { y: () => window.innerHeight }, { y: () => -roll.offsetHeight, duration: 0.66 }, 0.18)
        .to(fim, { autoAlpha: 0, duration: 0.08 }, 0.22)
        .fromTo(end, { autoAlpha: 0, y: 64 }, { autoAlpha: 1, y: 0, duration: 0.12, ease: EASE.enter.gsap }, 0.86)
        .set({}, {}, 1);
    }, el);

    ScrollTrigger.refresh();

    // O palco 3D e as fontes mudam a altura da página depois da montagem. Sem isto o `start` fica
    // medido num layout antigo e a cena termina antes de a pessoa chegar nela.
    let timer = 0;
    let lastHeight = document.documentElement.scrollHeight;
    const watch = new ResizeObserver(() => {
      const h = document.documentElement.scrollHeight;
      if (h === lastHeight) return;
      lastHeight = h;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => ScrollTrigger.refresh(), 150);
    });
    watch.observe(document.body);

    return () => {
      watch.disconnect();
      window.clearTimeout(timer);
      ctx.revert();
      el.classList.remove("is-scrub");
    };
  }, []);

  return (
    <footer ref={root} id="creditos" className="credits">
      <div className="credits__inner">
        <h2 id="creditos-t" className="credits__fim">
          <SplitText tag="span" text="Fim" splitType="chars" effect="rise" trigger="view" delay={60} duration={0.9} />
        </h2>

        <div className="credits__window">
          <dl className="credits__roll">
            {ROLES.map(([role, name]) => (
              <div key={role} className="credit">
                <dt className="credit__role">{role}</dt>
                <dd className="credit__name">{name}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="credits__end">
          <SeatRow className="credits__seats" seats={9} buckets={[1, 4, 7]} />
          <p className="credits__over">Sessão encerrada</p>
          <a
            href="https://www.themoviedb.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="credits__tmdb"
          >
            <Image src="/brand/tmdb.svg" alt="The Movie Database (TMDB)" width={200} height={26} className="h-5 w-auto" />
          </a>
          <p className="credits__legal">This product uses the TMDB API but is not endorsed or certified by TMDB.</p>
          <p className="credits__legal">
            Pôsteres, imagens, notas, votos e resenhas vêm do TMDB. As resenhas aparecem no idioma original, com o link para o
            texto completo.
          </p>
          <button type="button" className="btn btn--ghost" onClick={() => scrollToY(0)}>
            Rever a sessão
          </button>
          <p className="credits__year">Devflix · {year}</p>
        </div>
      </div>
    </footer>
  );
}
