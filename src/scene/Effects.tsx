"use client";

import { useFrame } from "@react-three/fiber";
import { DepthOfField, EffectComposer } from "@react-three/postprocessing";
import type { DepthOfFieldEffect } from "postprocessing";
import { useRef } from "react";
import { Vector3 } from "three";
import { FilmEffect } from "./FilmEffect";
import { lens } from "./light";
import type { TierSettings } from "./quality";

/**
 * Faixa nítida em volta do ponto de foco, em unidades do mundo. Cobre o pôster em foco e o
 * espaço logo à frente dele; os vizinhos de corredor, a 5 unidades, já ficam desfocados.
 */
const FOCUS_RANGE = 2.5;

/** Tamanho do desfoque. Discreto: o fundo precisa sair de foco, não virar bolhas de luz. */
const BOKEH_SCALE = 2.6;

/** Alvo inicial. Com um alvo, o efeito calcula a distância de foco sozinho a cada quadro. */
const INITIAL_TARGET = new Vector3();

type Props = { settings: TierSettings; dof: boolean; film: boolean };

/**
 * O compositor de pós-processamento. No nível baixo nada daqui existe: a cena desenha direto
 * na tela, sem passe extra, e essa é a maior economia do nível.
 */
export function Effects({ settings, dof, film }: Props) {
  const depth = useRef<DepthOfFieldEffect>(null);

  // Copia o foco do LightRig para dentro do efeito, depois que ele andou (prioridade -2).
  useFrame(() => {
    depth.current?.target?.copy(lens.focus);
  }, -1);

  if (!dof && !film) return null;

  return (
    <EffectComposer multisampling={settings.msaa} enableNormalPass={false}>
      {dof ? (
        <DepthOfField
          ref={depth}
          target={INITIAL_TARGET}
          focusRange={FOCUS_RANGE}
          bokehScale={BOKEH_SCALE}
          resolutionY={settings.dofHeight}
        />
      ) : (
        <></>
      )}
      {film ? <FilmEffect /> : <></>}
    </EffectComposer>
  );
}
