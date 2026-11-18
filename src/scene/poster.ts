import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { POSTER_H, POSTER_W } from "@/components/stage/layout";
import { sharedPosterUniforms } from "./light";
import glassFrag from "./shaders/glass.frag.glsl";
import metalFrag from "./shaders/metal.frag.glsl";
import metalVert from "./shaders/metal.vert.glsl";
import posterFrag from "./shaders/poster.frag.glsl";
import posterVert from "./shaders/poster.vert.glsl";

/**
 * A caixa de cartaz iluminada, o objeto que toda sala de cinema pendura no saguão. As medidas
 * seguem uma caixa real para um pôster de 68,6 x 101,6 cm: moldura de 2,9 cm de face, 4 cm
 * de fundo e o pôster recuado 1,6 cm atrás do vidro. Em unidades do mundo o pôster tem
 * 1,667 de largura, então 1 unidade vale cerca de 41 cm.
 *
 * Tudo aqui é criado 1 vez e dividido por todos os pôsteres.
 */
export const CASE = {
  /** Largura da face da moldura em volta do pôster. */
  face: 0.07,
  /** Profundidade da caixa. */
  depth: 0.1,
  /** Raio dos cantos de fora. */
  radius: 0.03,
  /** Chanfro das bordas: é nele que corre o fio de luz do feixe. */
  bevel: 0.006,
  /** Distância do pôster até o vidro. */
  recess: 0.04,
  /** Raio dos cabos de aço: fino o bastante para ler como cabo, grosso o bastante para não sumir. */
  cable: 0.0045,
};

/** Altura total da caixa, de borda a borda. */
export const CASE_HEIGHT = POSTER_H + 2 * CASE.face;
/** Comprimento padrão do cabo: sobe até sair do quadro, no escuro. */
export const CABLE_LONG = 8;

/** Face da frente da caixa, em z. O vidro e o pôster ficam atrás dela. */
const FRONT = CASE.depth / 2;

function roundedRect(width: number, height: number, radius: number, path: THREE.Path) {
  const x = -width / 2;
  const y = -height / 2;
  path.moveTo(x + radius, y);
  path.lineTo(x + width - radius, y);
  path.quadraticCurveTo(x + width, y, x + width, y + radius);
  path.lineTo(x + width, y + height - radius);
  path.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  path.lineTo(x + radius, y + height);
  path.quadraticCurveTo(x, y + height, x, y + height - radius);
  path.lineTo(x, y + radius);
  path.quadraticCurveTo(x, y, x + radius, y);
  return path;
}

type Geometries = {
  frame: THREE.BufferGeometry;
  poster: THREE.BufferGeometry;
  glass: THREE.BufferGeometry;
  cables: THREE.BufferGeometry;
};

let geometries: Geometries | null = null;

/**
 * As geometrias da caixa. Vivem enquanto a página vive, porque o canvas nunca desmonta.
 * A frente da caixa olha para +Z, para a câmera.
 */
export function getCaseGeometries(): Geometries {
  if (geometries) return geometries;

  // Moldura: um retângulo de cantos redondos com a abertura do pôster, extrudado com chanfro.
  const outer = roundedRect(POSTER_W + 2 * CASE.face, CASE_HEIGHT, CASE.radius, new THREE.Shape()) as THREE.Shape;
  outer.holes.push(roundedRect(POSTER_W, POSTER_H, 0.004, new THREE.Path()));
  const inner = CASE.depth - 2 * CASE.bevel;
  const frame = new THREE.ExtrudeGeometry(outer, {
    depth: inner,
    bevelEnabled: true,
    bevelThickness: CASE.bevel,
    bevelSize: CASE.bevel,
    bevelSegments: 2,
    curveSegments: 6,
  });
  frame.translate(0, 0, -inner / 2);
  frame.computeBoundingSphere();

  const poster = new THREE.PlaneGeometry(POSTER_W, POSTER_H);
  poster.translate(0, 0, FRONT - CASE.recess);

  const glass = new THREE.PlaneGeometry(POSTER_W, POSTER_H);
  glass.translate(0, 0, FRONT - CASE.bevel * 1.5);

  // 2 cabos de aço, da borda de cima da caixa para cima. Comprimento 1: a malha estica em Y.
  const cable = new THREE.CylinderGeometry(CASE.cable, CASE.cable, 1, 6, 1, true);
  cable.translate(0, 0.5, -CASE.depth / 4);
  const inset = POSTER_W / 2 - 0.22;
  const cables = mergeGeometries([cable.clone().translate(-inset, 0, 0), cable.clone().translate(inset, 0, 0)])!;
  cable.dispose();

  geometries = { frame, poster, glass, cables };
  return geometries;
}

/** Cor do quadro antes de a imagem chegar: a superfície `room-2` do DESIGN.md. */
const EMPTY = { value: new THREE.Color("#1f2024") };
const SIZE = { value: new THREE.Vector2(POSTER_W, POSTER_H) };

/**
 * Bronze escuro. A moldura fica quase preta na sala, e o feixe acende o chanfro num fio
 * quente. Bronze e não alumínio: o brilho dele repete o tom quente da luz do projetor.
 */
const BRONZE = { value: new THREE.Color("#241d16") };
/** Aço escurecido dos cabos. */
const STEEL = { value: new THREE.Color("#1c1d20") };

type U<T> = { value: T };

export type PosterMaterial = THREE.ShaderMaterial & {
  uniforms: {
    uMap: U<THREE.Texture | null>;
    uHasMap: U<number>;
    uBright: U<number>;
    uBacklight: U<number>;
    uOpacity: U<number>;
    uLight: U<number>;
  };
};

export type MetalMaterial = THREE.ShaderMaterial & {
  uniforms: { uOpacity: U<number>; uLight: U<number>; uInnerGlow: U<number>; uGlowColor: U<THREE.Color> };
};

export type GlassMaterial = THREE.ShaderMaterial & {
  uniforms: { uOpacity: U<number>; uLight: U<number> };
};

/** O conjunto de materiais de 1 caixa. Cada caixa tem os seus porque cada uma some e acende sozinha. */
export type CaseMaterials = {
  poster: PosterMaterial;
  frame: MetalMaterial;
  glass: GlassMaterial;
  cables: MetalMaterial;
};

function metal(base: U<THREE.Color>, shininess: number, specular: number): MetalMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: metalVert,
    fragmentShader: metalFrag,
    uniforms: {
      uBase: base,
      uShininess: { value: shininess },
      uSpecular: { value: specular },
      uOpacity: { value: 0 },
      uLight: { value: 0 },
      uGlowColor: { value: new THREE.Color() },
      uInnerGlow: { value: 0 },
      ...sharedPosterUniforms,
    },
    transparent: true,
  }) as MetalMaterial;
}

/**
 * Os 4 materiais de uma caixa. O código dos shaders é o mesmo em todas as caixas, então o
 * three compila cada programa 1 vez e só troca os uniforms. Os uniforms da luz são o mesmo
 * objeto em todas (ver `sharedPosterUniforms`).
 */
export function createCaseMaterials(): CaseMaterials {
  const poster = new THREE.ShaderMaterial({
    vertexShader: posterVert,
    fragmentShader: posterFrag,
    uniforms: {
      uMap: { value: null },
      uHasMap: { value: 0 },
      uEmpty: EMPTY,
      uBright: { value: 0.45 },
      uBacklight: { value: 0 },
      uOpacity: { value: 0 },
      uSize: SIZE,
      uLight: { value: 0 },
    },
    transparent: true,
  }) as PosterMaterial;

  const glass = new THREE.ShaderMaterial({
    vertexShader: posterVert,
    fragmentShader: glassFrag,
    uniforms: {
      uOpacity: { value: 0 },
      uLight: { value: 0 },
      uSize: SIZE,
      ...sharedPosterUniforms,
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }) as GlassMaterial;

  return {
    poster,
    frame: metal(BRONZE, 48, 0.9),
    glass,
    cables: metal(STEEL, 24, 0.5),
  };
}

export function disposeCaseMaterials(m: CaseMaterials) {
  m.poster.dispose();
  m.frame.dispose();
  m.glass.dispose();
  m.cables.dispose();
}
