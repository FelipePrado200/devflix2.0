/**
 * Conversão sRGB ↔ Oklab/OKLCH e o limite da cor de destaque.
 *
 * O DESIGN.md manda que a cor tirada do pôster entre na tela só depois de normalizada:
 * luminosidade entre 0,72 e 0,86 e croma em no máximo 0,16. Com esses limites o pior caso
 * possível dá 7,8:1 de contraste sobre o preto, então o link e a barra nunca ficam ilegíveis,
 * qualquer que seja o filme.
 *
 * As matrizes são as da especificação Oklab de Björn Ottosson.
 */

export const ACCENT_L = { min: 0.72, max: 0.86 } as const;
export const ACCENT_C_MAX = 0.16;

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toSrgb = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export type Oklch = { l: number; c: number; h: number };

/** Componentes sRGB de 0 a 1. */
export function rgbToOklch(r: number, g: number, b: number): Oklch {
  const lr = toLinear(clamp01(r));
  const lg = toLinear(clamp01(g));
  const lb = toLinear(clamp01(b));

  const l_ = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m_ = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s_ = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);

  const l = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const bb = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;

  const h = (Math.atan2(bb, a) * 180) / Math.PI;
  return { l, c: Math.hypot(a, bb), h: h < 0 ? h + 360 : h };
}

/** Componentes sRGB de 0 a 1. Cores fora do gamut são cortadas no limite. */
export function oklchToRgb({ l, c, h }: Oklch): [number, number, number] {
  const rad = (h * Math.PI) / 180;
  const a = c * Math.cos(rad);
  const b = c * Math.sin(rad);

  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;

  return [
    clamp01(toSrgb(4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_)),
    clamp01(toSrgb(-1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_)),
    clamp01(toSrgb(-0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_)),
  ];
}

export function oklchToHex(color: Oklch): string {
  return `#${oklchToRgb(color)
    .map((v) => Math.round(v * 255).toString(16).padStart(2, "0"))
    .join("")}`;
}

/**
 * Prende a cor na faixa segura, mantendo o matiz, que é o que identifica o filme.
 * Um pôster quase sem cor sobe de croma até 0,06, senão o destaque vira um cinza.
 */
export function clampAccent(color: Oklch): Oklch {
  return {
    l: Math.min(ACCENT_L.max, Math.max(ACCENT_L.min, color.l)),
    c: Math.min(ACCENT_C_MAX, Math.max(0.06, color.c)),
    h: color.h,
  };
}

/** Caminho curto: componentes sRGB de 0 a 1 em um hex já normalizado. */
export function accentHexFromRgb(r: number, g: number, b: number): string {
  return oklchToHex(clampAccent(rgbToOklch(r, g, b)));
}
