export type Zone = "hero" | "cartaz" | "top" | "publico" | "genero";

/**
 * Estado que a página (DOM) e a cena (canvas) dividem.
 * O ScrollTrigger e o painel escrevem aqui; a cena lê a cada quadro, sem re-render do React.
 */
export const stage = {
  cam: { x: 0, y: 0, z: 6 },
  /** 1 = tela de cinema acesa (abertura), 0 = apagada. */
  screen: 1,
  zone: "hero" as Zone,
  index: 0,
  accentKey: "",
  /** Filme aberto no painel, e quanto o pôster dele já veio para a frente (0 a 1). */
  openId: null as number | null,
  pull: 0,
  /**
   * Animação ambiente: poeira, fumaça do feixe, grão e flutuação dos pôsteres. O botão de
   * pausa do cabeçalho desliga (critério 2.2.2 da WCAG). A câmera não entra aqui: ela
   * só anda quando a pessoa rola.
   */
  ambient: true,
  /**
   * A tela de abertura ainda está na frente. Enquanto for verdade, o feixe do projetor espera
   * apagado: ele acende (as 3 piscadas) só quando a contagem sai de cena.
   */
  holdLamp: typeof document !== "undefined" && document.documentElement.dataset.preroll === "on",
  /** Efeitos ligados. Só os testes de navegador mexem aqui, para medir o custo de cada um. */
  fx: { beam: true, dust: true, dof: true, film: true },
  /** Nível de qualidade fixo, para medir 1 nível de cada vez. `null` deixa o medidor decidir. */
  debugTier: null as "high" | "medium" | "low" | null,
  /** Medidas da cena, atualizadas 2 vezes por segundo. Leitura para testes. */
  perf: { tier: "", fps: 0, calls: 0, triangles: 0, renderer: "" },
};

/** Escolha da pessoa sobre a animação ambiente, guardada só neste navegador. */
export const AMBIENT_KEY = "devflix:motion";

/**
 * Ganchos de teste (`window.__stage`, `window.__three`) só existem com `?debug` na URL.
 * Em produção, a página não pendura nada no objeto global.
 */
export function isDebug() {
  return typeof window !== "undefined" && new URLSearchParams(window.location.search).has("debug");
}

if (isDebug()) (window as unknown as { __stage: typeof stage }).__stage = stage;
