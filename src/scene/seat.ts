import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * Geometria da sala: a cadeira de cinema, o balde de pipoca que fica sobre o assento e as
 * luzes de corredor. Tudo procedural, nada de modelo baixado, e tudo mesclado em 1 malha:
 * cada uma vira 1 `InstancedMesh`, então toda a plateia custa 3 draw calls.
 *
 * Medidas em unidades do mundo (1 unidade = cerca de 41 cm). A cadeira olha para -Z, o chão
 * fica em y = 0 e o assento em y ≈ 0,9. O `Sala` posiciona e gira cada instância.
 *
 * Cada vértice leva 2 atributos além da posição e da normal:
 *   - `color`: a cor do material (veludo, plástico, pipoca);
 *   - `aAccent`: 1 onde a cor deve ser trocada pela cor de destaque do filme em foco
 *     (as listras do balde), 0 no resto.
 */

/** Veludo vinho, dessaturado para pertencer à sala: não é o vermelho de cartaz. */
const VELVET = new THREE.Color("#4a1a1e");
const VELVET_DARK = new THREE.Color("#33121a").lerp(VELVET, 0.25);
const PLASTIC = new THREE.Color("#0c0c0f");
const CREAM = new THREE.Color("#f1e4c2");
const BUTTER = new THREE.Color("#e9bd5b");
const TOASTED = new THREE.Color("#c98f3c");

/** Topo do assento: é onde o balde pousa. */
export const SEAT_TOP = 0.93;
/** Posição do balde no assento, em Z (para a frente da cadeira). */
const BUCKET_Z = -0.12;
export const BUCKET_HEIGHT = 0.56;

function paint(geometry: THREE.BufferGeometry, color: THREE.Color, accent = 0) {
  // Todas as partes viram não indexadas e sem uv: `mergeGeometries` exige o mesmo conjunto de atributos.
  const g = geometry.index ? geometry.toNonIndexed() : geometry;
  g.deleteAttribute("uv");
  const n = g.attributes.position.count;
  const colors = new Float32Array(n * 3);
  const accents = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
    accents[i] = accent;
  }
  g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  g.setAttribute("aAccent", new THREE.BufferAttribute(accents, 1));
  return g;
}

/** Caixa de cantos redondos no plano XY, extrudada em Z e centrada na origem. */
function roundedBox(width: number, height: number, depth: number, radius: number) {
  const x = -width / 2;
  const y = -height / 2;
  const s = new THREE.Shape();
  s.moveTo(x + radius, y);
  s.lineTo(x + width - radius, y);
  s.quadraticCurveTo(x + width, y, x + width, y + radius);
  s.lineTo(x + width, y + height - radius);
  s.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  s.lineTo(x + radius, y + height);
  s.quadraticCurveTo(x, y + height, x, y + height - radius);
  s.lineTo(x, y + radius);
  s.quadraticCurveTo(x, y, x + radius, y);
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 4 });
  g.translate(0, 0, -depth / 2);
  return g;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let seatGeo: THREE.BufferGeometry | null = null;
let bucketGeo: THREE.BufferGeometry | null = null;
let lightGeo: THREE.BufferGeometry | null = null;

/** A cadeira: pedestal, assento, encosto inclinado e 2 braços. */
export function getSeatGeometry() {
  if (seatGeo) return seatGeo;

  const pedestal = new THREE.CylinderGeometry(0.1, 0.15, 0.64, 8);
  pedestal.translate(0, 0.32, 0.12);

  const cushion = roundedBox(1.25, 0.3, 1.1, 0.1);
  cushion.translate(0, SEAT_TOP - 0.15, -0.1);

  // O encosto se inclina para trás: o topo vai para +Z, para longe de quem senta.
  const back = roundedBox(1.25, 1.55, 0.26, 0.2);
  back.rotateX(0.2);
  back.translate(0, 1.64, 0.5);

  const armL = new THREE.BoxGeometry(0.16, 0.14, 1.05);
  armL.translate(-0.74, 1.14, -0.05);
  const armR = armL.clone().translate(1.48, 0, 0);

  seatGeo = mergeGeometries([
    paint(pedestal, PLASTIC),
    paint(cushion, VELVET),
    paint(back, VELVET),
    paint(armL, VELVET_DARK),
    paint(armR, VELVET_DARK),
  ])!;
  seatGeo.computeBoundingSphere();
  return seatGeo;
}

/**
 * O balde de pipoca sobre o assento: corpo cônico de listras (cor de destaque e creme), aro e
 * uma pilha de grãos. A pilha é feita de icosaedros achatados, de cor e tamanho variados,
 * com semente fixa: a mesma pipoca em toda visita, o que deixa os prints comparáveis.
 */
export function getBucketGeometry() {
  if (bucketGeo) return bucketGeo;
  const parts: THREE.BufferGeometry[] = [];
  const baseY = SEAT_TOP;

  // Corpo: as listras vêm de pintar cada fatia radial de 1 cor. 12 fatias, 2 triângulos cada,
  // e os triângulos do tronco vêm antes das tampas na ordem do CylinderGeometry.
  const SEGMENTS = 12;
  const body = new THREE.CylinderGeometry(0.27, 0.2, BUCKET_HEIGHT, SEGMENTS, 1).toNonIndexed();
  body.deleteAttribute("uv");
  const bn = body.attributes.position.count;
  const bc = new Float32Array(bn * 3);
  const ba = new Float32Array(bn);
  for (let i = 0; i < bn; i++) {
    const tri = Math.floor(i / 3);
    const stripe = tri < SEGMENTS * 2 && Math.floor(tri / 2) % 2 === 0;
    const c = CREAM;
    bc[i * 3] = c.r;
    bc[i * 3 + 1] = c.g;
    bc[i * 3 + 2] = c.b;
    ba[i] = stripe ? 1 : 0;
  }
  body.setAttribute("color", new THREE.BufferAttribute(bc, 3));
  body.setAttribute("aAccent", new THREE.BufferAttribute(ba, 1));
  body.translate(0, baseY + BUCKET_HEIGHT / 2, BUCKET_Z);
  parts.push(body);

  const rim = new THREE.TorusGeometry(0.27, 0.028, 6, 14);
  rim.rotateX(Math.PI / 2);
  rim.translate(0, baseY + BUCKET_HEIGHT, BUCKET_Z);
  parts.push(paint(rim, CREAM));

  const random = mulberry32(2024);
  const rimTop = baseY + BUCKET_HEIGHT;
  for (let i = 0; i < 22; i++) {
    const h = Math.pow(random(), 0.8) * 0.27;
    const spread = (0.27 - h * 0.6) * Math.sqrt(random());
    const angle = random() * Math.PI * 2;
    const kernel = new THREE.IcosahedronGeometry(0.075 + random() * 0.05, 0);
    kernel.scale(0.9 + random() * 0.3, 0.85 + random() * 0.3, 0.9 + random() * 0.3);
    kernel.rotateY(random() * 6.28);
    kernel.rotateX(random() * 6.28);
    kernel.translate(Math.cos(angle) * spread, rimTop + 0.02 + h, Math.sin(angle) * spread + BUCKET_Z);
    const roll = random();
    parts.push(paint(kernel, roll < 0.62 ? CREAM : roll < 0.9 ? BUTTER : TOASTED));
  }

  bucketGeo = mergeGeometries(parts)!;
  bucketGeo.computeBoundingSphere();
  return bucketGeo;
}

/**
 * A luz de corredor: um tablete fino, deitado no chão ao longo do corredor. Pequeno de
 * propósito: a 10 unidades da câmera ele já vira 1 ponto, e é o desfoque que o faz brilhar.
 */
export function getAisleLightGeometry() {
  if (lightGeo) return lightGeo;
  lightGeo = paint(new THREE.BoxGeometry(0.06, 0.03, 0.3), BUTTER);
  return lightGeo;
}
