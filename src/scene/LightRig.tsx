"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import type { Xyz } from "@/components/stage/layout";
import { stage } from "@/components/stage/store";
import { DAMP, DURATION } from "@/motion/tokens";
import { ambientClock } from "./clock";
import { beamLight, beamLook, lens } from "./light";

/** A sala escurece na cena das resenhas: o feixe cai para esta fração. */
const REVIEW_DIM = 0.35;

/**
 * Na cena das resenhas a lente foca na legenda, perto da câmera, e o pôster fica desfocado
 * atrás dela. É o que a especificação pede para essa cena, e é desfoque como sinal: a
 * resenha é o assunto, o filme é o contexto.
 */
const CAPTION_FOCUS = 1.4;

/** Distância lateral de onde o feixe acende, antes de varrer até o filme em destaque. */
const SWEEP_FROM = { x: -4, y: 1.2 };

/**
 * Acendimento da lâmpada. Recebe o progresso de 0 a 1 e devolve a intensidade de 0 a 1:
 * 3 piscadas curtas, como uma lâmpada de arco pegando, e depois a subida até a luz plena.
 * Acontece uma vez por visita, então pode ser expressivo; não se repete nunca.
 */
export function strike(p: number): number {
  if (p <= 0) return 0;
  if (p >= 1) return 1;
  if (p < 0.4) {
    const on = (p > 0.05 && p < 0.09) || (p > 0.15 && p < 0.21) || (p > 0.28 && p < 0.37);
    return on ? 0.55 : 0.04;
  }
  const t = (p - 0.4) / 0.6;
  return 0.55 + 0.45 * t * t * (3 - 2 * t);
}

/** Amortecimento crítico de um vetor, sem alocar nada. Mesma fórmula do THREE.MathUtils.damp. */
function dampVec(v: THREE.Vector3, to: THREE.Vector3, rate: number, dt: number) {
  v.lerp(to, 1 - Math.exp(-rate * dt));
}

type Props = {
  /** Posição do pôster principal de cada parada, pela chave `zona-índice`. */
  focusOf: Map<string, Xyz>;
  compact: boolean;
};

export function LightRig({ focusOf, compact }: Props) {
  const camera = useThree((s) => s.camera);
  const scratch = useRef({
    startedAt: null as number | null,
    level: 0,
    aim: new THREE.Vector3(),
    focus: new THREE.Vector3(),
  });

  // Prioridade negativa: roda antes dos pôsteres, do feixe e do compositor no mesmo quadro.
  useFrame((state, dt) => {
    const s = scratch.current;
    if (stage.ambient) ambientClock.time += dt;

    const pos = focusOf.get(`${stage.zone}-${stage.index}`) ?? focusOf.get("hero-0");
    if (!pos) return;
    s.aim.set(pos.x, pos.y, pos.z);

    beamLight.origin.copy(camera.position).add(compact ? beamLook.lensOffset.compact : beamLook.lensOffset.wide);

    // A tela de carregamento ainda está na frente: o feixe espera apagado e acende (as 3
    // piscadas) quando a contagem sai. A lente já aponta para o filme, só falta a luz.
    if (stage.holdLamp && s.startedAt === null) {
      beamLight.lamp = 0;
      lens.focus.copy(s.aim);
      return;
    }

    if (s.startedAt === null) {
      s.startedAt = state.clock.elapsedTime;
      beamLight.target.set(pos.x + SWEEP_FROM.x, pos.y + SWEEP_FROM.y, pos.z);
      // A lente já nasce focada no filme: só a luz faz a varredura de entrada.
      lens.focus.copy(s.aim);
    }
    dampVec(beamLight.target, s.aim, DAMP.beam, dt);

    const room = stage.zone === "publico" ? REVIEW_DIM : 1;
    const panel = stage.openId !== null ? 1 - stage.pull : 1;
    const wanted = stage.fx.beam ? room * panel : 0;
    s.level = THREE.MathUtils.damp(s.level, wanted, DAMP.light, dt);
    const progress = (state.clock.elapsedTime - s.startedAt) / (DURATION.cinematic / 1000);
    beamLight.lamp = s.level * strike(progress);

    if (stage.zone === "publico") {
      camera.getWorldDirection(s.focus).multiplyScalar(CAPTION_FOCUS).add(camera.position);
    } else {
      s.focus.copy(s.aim);
    }
    dampVec(lens.focus, s.focus, DAMP.lens, dt);
  }, -2);

  return null;
}
