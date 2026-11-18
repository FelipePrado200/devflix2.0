"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { stage } from "@/components/stage/store";
import { ambientClock } from "./clock";
import { beamLight, beamLook, LENS_RADIUS, PROJECTOR_COLOR } from "./light";
import beamFrag from "./shaders/beam.frag.glsl";
import beamVert from "./shaders/beam.vert.glsl";
import dustFrag from "./shaders/dust.frag.glsl";
import dustVert from "./shaders/dust.vert.glsl";
import noise from "./shaders/noise.glsl";

/** Intensidade da poeira. */
const DUST_STRENGTH = 0.55;
/** Tamanho do grão de poeira, em pixels, a 1 unidade de distância da câmera. */
const DUST_SIZE = 14;

const UP = new THREE.Vector3(0, 1, 0);

/** Cone unitário aberto: a lente em y = 0, com raio LENS_RADIUS, e a tela em y = 1, com raio 1. */
function createConeGeometry() {
  const geometry = new THREE.CylinderGeometry(1, LENS_RADIUS, 1, 40, 1, true);
  geometry.translate(0, 0.5, 0);
  return geometry;
}

/** Sementes fixas: a mesma poeira em toda visita, o que deixa os prints comparáveis. */
function seededRandom(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createDustGeometry(count: number) {
  const geometry = new THREE.BufferGeometry();
  // O shader calcula a posição; o atributo só diz ao three quantos pontos existem.
  geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  const seeds = new Float32Array(count * 4);
  const random = seededRandom(1337);
  for (let i = 0; i < seeds.length; i++) seeds[i] = random();
  geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 4));
  return geometry;
}

type Props = { compact: boolean; dust: number };

export function Beam({ compact, dust }: Props) {
  const group = useRef<THREE.Group>(null!);
  const points = useRef<THREE.Points>(null!);
  const gl = useThree((s) => s.gl);
  const direction = useMemo(() => new THREE.Vector3(), []);

  const coneGeometry = useMemo(createConeGeometry, []);
  const coneMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: beamVert,
        fragmentShader: `${noise}\n${beamFrag}`,
        uniforms: {
          uTime: { value: 0 },
          uIntensity: { value: 0 },
          uColor: { value: PROJECTOR_COLOR },
          uFade: { value: beamLook.fade },
          uFacingPower: { value: beamLook.facingPower },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    [],
  );

  const dustGeometry = useMemo(() => createDustGeometry(dust), [dust]);
  const dustMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: dustVert,
        fragmentShader: dustFrag,
        uniforms: {
          uTime: { value: 0 },
          uSize: { value: DUST_SIZE },
          uPixelRatio: { value: 1 },
          uLensRadius: { value: LENS_RADIUS },
          uColor: { value: PROJECTOR_COLOR },
          uIntensity: { value: 0 },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );

  useEffect(() => () => dustGeometry.dispose(), [dustGeometry]);
  useEffect(
    () => () => {
      coneGeometry.dispose();
      coneMaterial.dispose();
      dustMaterial.dispose();
    },
    [coneGeometry, coneMaterial, dustMaterial],
  );

  useFrame(() => {
    const g = group.current;
    const lamp = beamLight.lamp;
    g.visible = lamp > 0.002;
    if (!g.visible) return;

    // Orienta o cone unitário da lente até o ponto onde a luz bate, sem alocar nada.
    direction.subVectors(beamLight.target, beamLight.origin);
    const length = direction.length();
    direction.divideScalar(length);
    g.position.copy(beamLight.origin);
    g.quaternion.setFromUnitVectors(UP, direction);
    g.scale.set(beamLight.radius, length, beamLight.radius);

    const strength = compact ? beamLook.strength.compact : beamLook.strength.wide;
    coneMaterial.uniforms.uFacingPower.value = beamLook.facingPower;
    coneMaterial.uniforms.uTime.value = ambientClock.time;
    coneMaterial.uniforms.uIntensity.value = lamp * strength;

    points.current.visible = stage.fx.dust;
    dustMaterial.uniforms.uTime.value = ambientClock.time;
    dustMaterial.uniforms.uIntensity.value = lamp * DUST_STRENGTH;
    dustMaterial.uniforms.uPixelRatio.value = gl.getPixelRatio();
  });

  return (
    <group ref={group} visible={false}>
      <mesh geometry={coneGeometry} material={coneMaterial} renderOrder={2} raycast={() => null} />
      <points
        ref={points}
        geometry={dustGeometry}
        material={dustMaterial}
        renderOrder={3}
        // As posições reais saem do shader; a caixa de colisão do atributo não vale nada.
        frustumCulled={false}
        raycast={() => null}
      />
    </group>
  );
}
