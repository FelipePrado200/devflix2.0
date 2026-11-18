import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { secs } from "@/motion/tokens";

/**
 * O único lugar que liga Lenis e GSAP (padrão da documentação do Lenis):
 * cada rolagem do Lenis chama ScrollTrigger.update, e o gsap.ticker chama o raf do Lenis.
 * A câmera 3D lê só o progresso do ScrollTrigger. Não existe outro controle de rolagem.
 */
gsap.registerPlugin(ScrollTrigger);

let lenis: Lenis | null = null;

export function startSmoothScroll() {
  if (lenis) return () => {};
  const instance = new Lenis({ anchors: true });
  lenis = instance;
  instance.on("scroll", ScrollTrigger.update);
  const raf = (time: number) => instance.raf(time * 1000);
  gsap.ticker.add(raf);
  gsap.ticker.lagSmoothing(0);

  return () => {
    gsap.ticker.remove(raf);
    instance.destroy();
    if (lenis === instance) lenis = null;
  };
}

export const getLenis = () => lenis;

/** Rola até uma posição. Usa o Lenis quando ele existe, senão a rolagem nativa. */
export function scrollToY(y: number) {
  if (lenis) lenis.scrollTo(y, { duration: secs("cinematic") });
  else window.scrollTo({ top: y });
}

export { gsap, ScrollTrigger };
