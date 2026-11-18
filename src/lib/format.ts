const one = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const int = new Intl.NumberFormat("pt-BR");

/** 7.834 → "7,8" */
export const score = (n: number) => one.format(n);

/** 12345 → "12.345 votos" */
export const votes = (n: number) => `${int.format(n)} ${n === 1 ? "voto" : "votos"}`;

export const year = (date: string) => (date ? date.slice(0, 4) : "");

export const runtime = (min: number | null) => {
  if (!min) return "";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h} h ${m.toString().padStart(2, "0")} min` : `${m} min`;
};

/** Corta no fim de uma palavra, sem quebrar no meio. */
export function excerpt(text: string, max = 280) {
  const clean = text.replace(/\s+/g, " ").replace(/[*_#>]/g, "").trim();
  if (clean.length <= max) return { text: clean, cut: false };
  const slice = clean.slice(0, max);
  return { text: slice.slice(0, slice.lastIndexOf(" ")).replace(/[,.;:]$/, "") + "…", cut: true };
}

export const img = (path: string | null, size: "w185" | "w342" | "w500" | "w780" | "w1280" | "original") =>
  path ? `https://image.tmdb.org/t/p/${size}${path}` : null;

/**
 * A imagem do TMDB pelo otimizador do Next: o navegador só fala com este servidor, nunca com o
 * TMDB. A cena 3D e a tela de carregamento usam esta função, então a URL é idêntica: o que a
 * tela de carregamento baixa já está no cache quando a cena pede a textura.
 */
export const proxiedImage = (path: string, size: string, w: number) =>
  `/_next/image?url=${encodeURIComponent(`https://image.tmdb.org/t/p/${size}${path}`)}&w=${w}&q=75`;
