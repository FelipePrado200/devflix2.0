"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { Vector3 } from "three";
import { createMonitor, judge, markNoise, noise, SAMPLE_SECONDS, type Tier, WARMUP_MS } from "./quality";

/**
 * Quanto a câmera pode andar num quadro antes de isso contar como salto de rolagem, em
 * unidades do mundo. Rolagem normal anda menos de 0,2 por quadro; um link do cabeçalho
 * leva a câmera dezenas de unidades de uma vez.
 */
const JUMP = 0.5;

type Props = {
  tier: Tier;
  /** Com o nível travado pelos testes, o governador mede mas não troca nada. */
  locked: boolean;
  onTier: (tier: Tier) => void;
};

/**
 * Mede os quadros e decide o nível de qualidade. Substitui o PerformanceMonitor do drei,
 * que não sabe distinguir um engasgo de carga de um aparelho fraco: a regra fica em
 * `judge`, função pura em quality.ts, e aqui só se junta a amostra.
 */
export function QualityGovernor({ tier, locked, onTier }: Props) {
  const camera = useThree((s) => s.camera);
  const acc = useRef({ frames: 0, time: 0, last: new Vector3(), monitor: createMonitor(tier) });

  // A carga inicial não conta.
  useEffect(() => {
    markNoise(WARMUP_MS);
  }, []);

  // Cada troca de nível recompila shaders e realoca buffers: as amostras logo depois não contam.
  useEffect(() => {
    const a = acc.current;
    if (a.monitor.tier !== tier) a.monitor = { ...a.monitor, tier };
    markNoise();
  }, [tier]);

  useFrame((_, dt) => {
    const a = acc.current;
    if (a.last.distanceToSquared(camera.position) > JUMP * JUMP) markNoise();
    a.last.copy(camera.position);

    a.frames++;
    a.time += dt;
    if (a.time < SAMPLE_SECONDS) return;
    const fps = a.frames / a.time;
    a.frames = 0;
    a.time = 0;
    if (locked) return;

    a.monitor = judge(a.monitor, fps, performance.now() < noise.until);
    if (a.monitor.tier !== tier) onTier(a.monitor.tier);
  }, -3);

  return null;
}
