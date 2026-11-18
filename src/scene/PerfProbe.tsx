"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { stage } from "@/components/stage/store";
import type { Tier } from "./quality";

/** De quanto em quanto tempo as medidas são publicadas, em segundos. */
const WINDOW = 0.5;

/**
 * Mede a cena e publica em `stage.perf`, para os testes de navegador lerem: quadros por
 * segundo, draw calls e triângulos por quadro, o nível de qualidade e a placa de vídeo.
 *
 * O compositor desenha vários passes por quadro, e o three zera o contador a cada passe.
 * Por isso o contador fica manual: zera 1 vez por quadro, aqui, antes de tudo ser desenhado,
 * e a leitura seguinte soma todos os passes do quadro anterior.
 */
export function PerfProbe({ tier }: { tier: Tier }) {
  const gl = useThree((s) => s.gl);
  const acc = useRef({ frames: 0, time: 0 });

  useEffect(() => {
    gl.info.autoReset = false;
    const ctx = gl.getContext();
    const ext = ctx.getExtension("WEBGL_debug_renderer_info");
    stage.perf.renderer = ext ? String(ctx.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : "desconhecida";
    return () => {
      gl.info.autoReset = true;
    };
  }, [gl]);

  useEffect(() => {
    stage.perf.tier = tier;
  }, [tier]);

  useFrame((_, dt) => {
    const a = acc.current;
    a.frames++;
    a.time += dt;
    if (a.time >= WINDOW) {
      stage.perf.fps = Math.round(a.frames / a.time);
      stage.perf.calls = gl.info.render.calls;
      stage.perf.triangles = gl.info.render.triangles;
      a.frames = 0;
      a.time = 0;
    }
    gl.info.reset();
  }, -3);

  return null;
}
