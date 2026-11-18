import type { Metadata, Viewport } from "next";
import { Bodoni_Moda, Jost } from "next/font/google";
import { MoviePanelProvider } from "@/components/MoviePanel";
import { PrerollController } from "@/components/PrerollController";
import { SEEN_KEY } from "@/lib/preroll";
import { motionCss } from "@/motion/tokens";
import "lenis/dist/lenis.css";
import "./globals.css";

/**
 * As duas famílias do DESIGN.md, auto-hospedadas e com subset pelo next/font:
 * a didone de alto contraste nos títulos, a geométrica na interface.
 */
const bodoni = Bodoni_Moda({
  variable: "--font-bodoni",
  subsets: ["latin"],
  display: "swap",
  // O eixo de tamanho óptico (`opsz`): ele faz a didone ter fios finíssimos nos títulos grandes
  // (o "A Odisseia" de 132 px) e traços mais firmes nos pequenos (o título de 22 px). Sem ele o
  // navegador usa sempre o desenho de 11 px, que é grosso demais para um título de cartaz.
  axes: ["opsz"],
});
const jost = Jost({ variable: "--font-jost", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "Devflix: filmes em cartaz e o que o público acha deles",
  description: "Filmes em cartaz, os mais bem avaliados e resenhas reais de espectadores, com notas e votos do TMDB.",
};

export const viewport: Viewport = { themeColor: "#000000", colorScheme: "dark" };

/**
 * Decide, antes de a página pintar, se a tela de carregamento aparece. Roda no `<head>`, sem
 * esperar o React, senão a página piscaria sem ela e só depois a cobriria.
 *
 * Liga `data-preroll="on"` (e segura as letras do site com `data-letters="wait"`) só quando: não há movimento reduzido, a pessoa ainda não viu a
 * contagem nesta sessão e a URL não traz `nopreroll` (usado pelos testes de navegador).
 * Tudo dentro de try/catch: se o armazenamento estiver bloqueado, a página só segue sem ela.
 */
const PREROLL_GATE = `(function(){try{var d=document.documentElement;if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;if(/[?&]nopreroll\\b/.test(location.search))return;var s;try{s=sessionStorage.getItem("${SEEN_KEY}")}catch(e){}if(s==="1")return;d.dataset.preroll="on";d.dataset.letters="wait"}catch(e){}})()`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // suppressHydrationWarning: o script abaixo escreve `data-preroll` no <html> antes de o React hidratar.
    <html lang="pt-BR" className={`${bodoni.variable} ${jost.variable}`} suppressHydrationWarning>
      <head>
        {/* Durações e curvas: o CSS lê os mesmos valores que o GSAP importa de src/motion/tokens.ts. */}
        <style dangerouslySetInnerHTML={{ __html: motionCss() }} />
        <script dangerouslySetInnerHTML={{ __html: PREROLL_GATE }} />
      </head>
      <body>
        <PrerollController />
        <a
          href="#conteudo"
          className="btn btn--primary fixed top-2 left-2 z-50 -translate-y-24 focus-visible:translate-y-0"
        >
          Pular para o conteúdo
        </a>
        <MoviePanelProvider>{children}</MoviePanelProvider>
      </body>
    </html>
  );
}
