/**
 * Os 3 níveis de qualidade da cena e as regras para trocar de um para o outro.
 *
 * Lógica pura: nada de React, nada de three. A cena lê `TIERS[nivel]` e chama as funções
 * de transição quando o medidor de quadros pede. Assim a regra de histerese é testável e
 * fica num lugar só.
 */

export type Tier = "high" | "medium" | "low";

export type TierSettings = {
  /** Teto do devicePixelRatio do canvas. */
  dpr: number;
  /** Profundidade de campo ligada. */
  dof: boolean;
  /**
   * Altura, em pixels, em que a profundidade de campo calcula o desfoque. Fixa, e não uma
   * fração da tela: a parte desfocada não tem detalhe para perder, e uma fração de 75 %
   * numa tela de 2160 x 1350 custava 6,7 ms, 79 % do quadro inteiro numa RTX 3050.
   */
  dofHeight: number;
  /** Grão de filme e vinheta (o passe de pós-processamento inteiro). */
  film: boolean;
  /** Partículas de poeira dentro do feixe. */
  dust: number;
  /** Amostras de antisserrilhado do compositor. Zero desliga. */
  msaa: number;
};

export const TIERS: Record<Tier, TierSettings> = {
  high: { dpr: 1.5, dof: true, dofHeight: 540, film: true, dust: 900, msaa: 4 },
  medium: { dpr: 1.25, dof: true, dofHeight: 360, film: true, dust: 450, msaa: 2 },
  // Sem compositor nenhum: a economia grande do nível baixo é não ter passe extra.
  low: { dpr: 1, dof: false, dofHeight: 0, film: false, dust: 160, msaa: 0 },
};

const ORDER: Tier[] = ["low", "medium", "high"];

/**
 * Faixa de histerese, em quadros por segundo. Abaixo de `decline` o nível desce; acima de
 * `incline` ele sobe. Entre as duas, nada muda. Sem essa folga, um aparelho que roda a 52
 * quadros ficaria trocando de nível a cada medida.
 */
export const FPS_BAND = { decline: 45, incline: 58 } as const;

/** Quantas trocas o medidor tolera antes de desistir e assentar o nível. */
export const MAX_FLIPS = 3;

/**
 * Os primeiros segundos não contam. Shader compilando e textura subindo para a GPU são
 * engasgos de carga, não falta de fôlego.
 */
export const WARMUP_MS = 2500;

/** Duração de 1 amostra de quadros, em segundos. */
export const SAMPLE_SECONDS = 0.5;

/**
 * Quantas amostras seguidas fora da faixa trocam o nível. Descer é rápido (2 s): quem está
 * travando sente na hora. Subir é lento (4 s): subir cedo demais derruba de novo, e cada
 * troca recompila shader e realoca buffers, o que é um engasgo por si só.
 */
export const STREAK = { decline: 4, incline: 8 } as const;

/**
 * Por quanto tempo depois de uma carga as amostras não contam, em milissegundos. Textura
 * subindo, salto de rolagem e a própria troca de nível engasgam por algumas centenas de
 * milissegundos. Medidos como falta de fôlego, eles derrubavam uma RTX 3050 rodando a 100
 * quadros por segundo para o nível médio.
 */
export const NOISE_MS = 1200;

export type Monitor = {
  tier: Tier;
  below: number;
  above: number;
  flips: number;
  /** Assentado: depois de MAX_FLIPS trocas o nível não muda mais nesta visita. */
  settled: boolean;
};

export function createMonitor(tier: Tier): Monitor {
  return { tier, below: 0, above: 0, flips: 0, settled: false };
}

/**
 * Julga 1 amostra e devolve o estado seguinte. Função pura: o mesmo estado e a mesma
 * amostra dão sempre a mesma resposta.
 *
 * - Amostra contaminada por carga: ignorada, sem zerar as sequências.
 * - Dentro da faixa de histerese: as 2 sequências zeram.
 * - Sequência completa: o nível troca e as sequências zeram.
 * - Na terceira troca o aparelho assenta (ver `settle`) e para de trocar.
 */
export function judge(m: Monitor, fps: number, contaminated: boolean): Monitor {
  if (m.settled || contaminated) return m;

  if (fps < FPS_BAND.decline) {
    const below = m.below + 1;
    if (below < STREAK.decline) return { ...m, below, above: 0 };
    return shift(m, stepDown(m.tier));
  }
  if (fps > FPS_BAND.incline) {
    const above = m.above + 1;
    if (above < STREAK.incline) return { ...m, above, below: 0 };
    return shift(m, stepUp(m.tier));
  }
  return { ...m, below: 0, above: 0 };
}

function shift(m: Monitor, next: Tier): Monitor {
  if (next === m.tier) return { ...m, below: 0, above: 0 };
  const flips = m.flips + 1;
  if (flips >= MAX_FLIPS) return { tier: settle(next), below: 0, above: 0, flips, settled: true };
  return { tier: next, below: 0, above: 0, flips, settled: false };
}

/**
 * Marca de carga: até quando as amostras não contam. Quem carrega algo chama `markNoise`.
 * Objeto de módulo, sem React: é escrito por callbacks de textura e lido 2 vezes por segundo.
 */
export const noise = { until: 0 };

export function markNoise(ms = NOISE_MS) {
  noise.until = Math.max(noise.until, performance.now() + ms);
}

export function stepDown(tier: Tier): Tier {
  return ORDER[Math.max(0, ORDER.indexOf(tier) - 1)];
}

export function stepUp(tier: Tier): Tier {
  return ORDER[Math.min(ORDER.length - 1, ORDER.indexOf(tier) + 1)];
}

/**
 * O aparelho oscilou entre 2 níveis e não segurou o de cima. Assenta no médio, ou fica
 * onde está se já estiver mais baixo. Descer direto ao baixo seria pessimista demais para
 * quem só não segura o alto.
 */
export function settle(tier: Tier): Tier {
  return tier === "high" ? "medium" : tier;
}

/**
 * Nível inicial. O celular e o tablet em pé começam no médio, porque a tela é pequena e a
 * bateria importa. O resto começa no alto e desce se precisar.
 */
export function initialTier(compact: boolean): Tier {
  return compact ? "medium" : "high";
}

/**
 * O que o nível vira numa tela compacta. A especificação manda o celular rodar sem
 * profundidade de campo e com metade da poeira, qualquer que seja o nível.
 */
export function forCompact(settings: TierSettings, compact: boolean): TierSettings {
  if (!compact) return settings;
  return { ...settings, dof: false, dust: Math.round(settings.dust / 2) };
}
