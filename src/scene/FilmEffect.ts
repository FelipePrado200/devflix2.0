import { wrapEffect } from "@react-three/postprocessing";
import { BlendFunction, Effect } from "postprocessing";
import { Uniform } from "three";
import { FILM_FPS } from "@/motion/tokens";
import { ambientClock } from "./clock";
import filmFrag from "./shaders/film.frag.glsl";

/**
 * O quadro do grão volta a zero de tempos em tempos. Sem isto, depois de horas aberto, o
 * número cresce até o ruído perder precisão de ponto flutuante e virar listras.
 */
const FRAME_WRAP = 4096;

type FilmOptions = {
  /** Força do grão. 0,06 é visível de perto e some a 1 metro da tela, que é o certo. */
  grain?: number;
  /** Quanto as bordas escurecem. Multiplica a cor, então só pega onde há luz. */
  vignette?: number;
};

/**
 * Grão de filme e vinheta num passe só. O grão lê o relógio ambiente, não o tempo do quadro:
 * troca 24 vezes por segundo em qualquer tela, e congela quando a pessoa pausa a animação.
 */
export class FilmEffectImpl extends Effect {
  constructor({ grain = 0.06, vignette = 0.35 }: FilmOptions = {}) {
    super("FilmEffect", filmFrag, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, Uniform>([
        ["uFrame", new Uniform(0)],
        ["uGrain", new Uniform(grain)],
        ["uVignette", new Uniform(vignette)],
      ]),
    });
  }

  update() {
    this.uniforms.get("uFrame")!.value = Math.floor(ambientClock.time * FILM_FPS) % FRAME_WRAP;
  }
}

export const FilmEffect = wrapEffect(FilmEffectImpl);
