/**
 * Marcos de carregamento da tela de abertura (a contagem de cinema).
 *
 * A contagem não é um temporizador: cada numeral só avança quando algo real terminou de
 * carregar. Quem carrega algo chama `ready(marco)`; o controlador lê `progress()` e decide
 * quando mostrar o próximo numeral e quando sair.
 *
 * Módulo de estado simples, sem React: os marcos vêm de lugares sem relação entre si
 * (fontes, canvas, textura do pôster, fundo da tela) e podem chegar antes de o controlador
 * existir.
 */

/** O que precisa estar pronto para a página poder se mostrar. */
export const MILESTONES = ["fonts", "scene", "hero", "screen"] as const;
export type Milestone = (typeof MILESTONES)[number];

/** Evento disparado a cada marco novo. */
export const READY_EVENT = "devflix:ready";

const done = new Set<Milestone>();

/** Registra 1 marco. Pode ser chamado mais de 1 vez, e em qualquer ordem. */
export function ready(milestone: Milestone) {
  if (done.has(milestone)) return;
  done.add(milestone);
  if (typeof window !== "undefined") window.dispatchEvent(new Event(READY_EVENT));
}

/** Tudo pronto de uma vez: o modo 2D, o movimento reduzido e a falha de WebGL não esperam nada. */
export function readyAll() {
  for (const m of MILESTONES) done.add(m);
  if (typeof window !== "undefined") window.dispatchEvent(new Event(READY_EVENT));
}

/** Quantos marcos já chegaram, de 0 até `MILESTONES.length`. */
export function doneCount() {
  return done.size;
}

export function isReady() {
  return done.size >= MILESTONES.length;
}

/** A tela de abertura está ligada nesta visita? (O script do `<head>` decide, antes da hidratação.) */
export function prerollOn() {
  return typeof document !== "undefined" && document.documentElement.dataset.preroll === "on";
}

/** Guardada só neste navegador e só nesta sessão: a mesma pessoa não vê a contagem de novo ao recarregar. */
export const SEEN_KEY = "devflix:preroll";
