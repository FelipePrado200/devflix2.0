import type { Zone } from "./store";

export const POSTER_W = 1.667;
export const POSTER_H = 2.5;
/** Quanto de rolagem (em svh) leva a câmera de uma parada à próxima. */
export const STEP_SVH = 45;
/** Distância vertical entre 2 caixas da coluna dos mais bem avaliados, no desktop. */
export const STRIP_STEP = 3.1;
/** Quanto a câmera recua nos gêneros, no desktop, para o título não cair sobre um pôster. */
const GENRE_BACKOFF = 1.3;
const FOV = 45;
const TAN = Math.tan((FOV / 2) * (Math.PI / 180));

export type Xyz = { x: number; y: number; z: number };

export type Slot = {
  zone: Zone;
  /** Em que parada da seção este pôster aparece. */
  index: number;
  pos: Xyz;
  rotY: number;
  /** Faixa de distância em que o pôster vai de visível a apagado. */
  near: number;
  far: number;
  seed: number;
  /** Só um pôster por parada dá a cor de destaque e ganha o brilho atrás. */
  lead: boolean;
};

/** Uma seção do palco: onde a câmera para e quais pôsteres ficam à vista. */
export type Group = { zone: Zone; stops: Xyz[]; posters: Slot[] };

export type Layout = {
  fov: number;
  compact: boolean;
  hero: Slot;
  heroStop: Xyz;
  groups: Group[];
};

export type Counts = { cartaz: number; top: number; publico: number; generos: number[] };

/**
 * Posições no mundo. Largura: o pôster fica à direita e o texto HTML à esquerda.
 * Compacto (celular e tablet em pé): o pôster fica em cima e o texto embaixo.
 */
export function buildLayout(counts: Counts, compact: boolean, aspect: number): Layout {
  const dist = compact ? 7.5 : 4.4;
  const heroDist = compact ? 10 : 4.4;
  const halfW = dist * TAN * aspect;
  const side = compact ? 0 : Math.min(1.45, halfW * 0.5);
  const lift = compact ? 0.75 : 0;
  const heroLift = compact ? 1.8 : 0;
  const near = dist + 2;
  const far = dist + 15;
  const poster = (o: Omit<Slot, "near" | "far" | "lead">): Slot => ({ ...o, near, far, lead: true });

  const heroPos = { x: side, y: heroLift, z: 6 - heroDist };
  const hero: Slot = {
    zone: "hero", index: 0, pos: heroPos, rotY: compact ? 0 : -0.16,
    near: heroDist + 2, far: heroDist + 12, seed: 0, lead: true,
  };

  const groups: Group[] = [];
  let z = heroPos.z - 7;

  // Em cartaz: um corredor em profundidade. A câmera avança de pôster em pôster.
  {
    const stops: Xyz[] = [];
    const posters: Slot[] = [];
    for (let i = 0; i < counts.cartaz; i++) {
      const jx = (i % 2 ? 1 : -1) * (compact ? 0.5 : 0.3);
      const jy = (i % 3 === 0 ? 1 : i % 3 === 1 ? -1 : 0) * 0.18;
      const pos = { x: side + jx, y: lift + jy, z: z - i * 5 };
      posters.push(poster({ zone: "cartaz", index: i, pos, rotY: compact ? 0 : -0.16 - jx * 0.2, seed: i * 1.7 + 1 }));
      stops.push({ x: jx * 0.5, y: jy * 0.5, z: pos.z + dist });
    }
    groups.push({ zone: "cartaz", stops, posters });
    z = z - (counts.cartaz - 1) * 5 - 9;
  }

  // Mais bem avaliados: uma tira de filme. A câmera desce (ou anda de lado no celular).
  {
    const stops: Xyz[] = [];
    const posters: Slot[] = [];
    for (let j = 0; j < counts.top; j++) {
      const pos = compact ? { x: j * 2.1, y: lift, z } : { x: side, y: -j * STRIP_STEP, z };
      posters.push(poster({ zone: "top", index: j, pos, rotY: compact ? 0 : -0.16, seed: j * 2.3 + 4 }));
      stops.push({ x: pos.x - side, y: pos.y - lift, z: z + dist });
    }
    groups.push({ zone: "top", stops, posters });
    z -= 9;
  }

  // O que o público diz: o pôster do filme avaliado, um por resenha, enquanto o texto fica no HTML.
  {
    const stops: Xyz[] = [];
    const posters: Slot[] = [];
    // No celular o pôster sobe e fica menor: a resenha é longa e precisa do espaço de baixo.
    const rise = compact ? 1.4 : 0;
    const pDist = compact ? dist + 3.5 : dist;
    const gap = 6;
    for (let k = 0; k < counts.publico; k++) {
      const jy = (k % 2 ? -1 : 1) * 0.22;
      const pos = { x: side, y: lift + rise + jy, z: z - k * gap };
      posters.push({
        zone: "publico", index: k, pos, rotY: compact ? 0 : -0.2, seed: k * 1.3 + 9, lead: true,
        // Faixa curta: só a resenha em foco mostra o pôster dela.
        near: pDist + 1.5, far: pDist + gap - 1,
      });
      stops.push({ x: 0, y: jy * 0.4, z: pos.z + pDist });
    }
    groups.push({ zone: "publico", stops, posters });
    z = z - (counts.publico - 1) * gap - 10;
  }

  // Por gênero: um corredor curto por gênero. A câmera para uma vez em cada um.
  {
    const stops: Xyz[] = [];
    const posters: Slot[] = [];
    // Largura que os pôsteres do gênero ocupam, e a distância que os enquadra.
    const cols = compact ? 2 : 4;
    const gapX = POSTER_W + (compact ? 0.3 : 0.45);
    const gapY = POSTER_H + 0.4;
    const spanX = (cols - 1) * gapX;
    // No desktop a câmera recua além do enquadramento justo: os pôsteres ficam menores e o
    // título da cena, no canto de cima à esquerda, deixa de ficar sobre o primeiro pôster.
    const gDist = Math.max(dist, (spanX / 2 + POSTER_W * 0.7) / (TAN * aspect)) * (compact ? 1 : GENRE_BACKOFF);
    counts.generos.forEach((n, gi) => {
      const gz = z - gi * 11;
      for (let i = 0; i < n; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        // Sobem: o texto do gênero fica embaixo, livre dos pôsteres.
        const rise = compact ? -0.7 : 0.5;
        const pos = {
          x: (col - (cols - 1) / 2) * gapX,
          y: lift + rise + (compact ? (0.5 - row) * gapY : 0) + (col % 2 ? -0.12 : 0.12),
          z: gz - row * 0.4,
        };
        posters.push({
          zone: "genero", index: gi, pos, rotY: compact ? 0 : pos.x * -0.06,
          near: gDist + 3, far: gDist + 8, seed: gi * 3.1 + i * 1.1 + 14, lead: i === 0,
        });
      }
      stops.push({ x: 0, y: compact ? lift : 0, z: gz + gDist });
    });
    groups.push({ zone: "genero", stops, posters });
  }

  return { fov: FOV, compact, hero, heroStop: { x: 0, y: 0, z: 6 }, groups };
}
