"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MotionToggle } from "./MotionToggle";

type Item = { href: string; label: string };

/**
 * A marca: o mostrador da tela de carregamento em miniatura. O traço âmbar fica parado numa
 * posição de repouso e, no hover, dá 1 volta. Só decoração (o nome está no texto ao lado).
 */
function Mark() {
  return (
    <svg className="site-mark" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <circle cx="16" cy="16" r="14.25" />
      <circle cx="16" cy="16" r="9.5" />
      <path d="M16 0.5v4M16 27.5v4M0.5 16h4M27.5 16h4" />
      <g className="site-mark__arm">
        <path d="M16 16v12.5" />
        <circle cx="16" cy="28.5" r="2" />
      </g>
    </svg>
  );
}

/**
 * Cabeçalho: uma pílula flutuante sobre a cena 3D, sólida e com contorno de 1 px (o DESIGN.md
 * não admite vidro fosco nem sombra). 3 coisas dele vêm da rolagem, e nenhuma é decoração:
 *   - a cena atual fica marcada no menu, com sublinhado na cor do pôster em foco;
 *   - a linha de baixo mostra o quanto da página já passou: a rolagem é a linha do tempo;
 *   - no celular os links viram um menu.
 *
 * Nada aqui usa estado do React para a rolagem: a linha é uma variável de CSS, escrita direto
 * no elemento. Só a cena atual é estado, e ela muda poucas vezes por visita.
 */
export function SiteHeader({ items }: { items: Item[] }) {
  const bar = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const [active, setActive] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  // Rolagem: lê a posição e escreve a linha de progresso e a cena atual, no máximo 1 vez por quadro.
  useEffect(() => {
    let raf = 0;
    const ids = items.map((i) => i.href.slice(1));

    const measure = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      bar.current?.style.setProperty("--p", p.toFixed(4));

      // A cena atual é a última cujo topo já passou de 40 % da altura da tela.
      let current: string | null = null;
      const line = window.innerHeight * 0.4;
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= line) current = id;
      }
      setActive((prev) => (prev === current ? prev : current));
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [items]);

  const close = useCallback((returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) button.current?.focus();
  }, []);

  // Menu aberto: Esc fecha e devolve o foco ao botão, e um toque fora fecha.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(true);
    };
    const onPointer = (e: PointerEvent) => {
      if (!(e.target as Element).closest?.(".site-header")) close(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open, close]);

  const links = items.map((item) => {
    const current = active === item.href.slice(1);
    return { ...item, current };
  });

  return (
    <header className="site-header">
      <div className="site-bar" ref={bar}>
        <div className="site-nav">
          <a href="#conteudo" translate="no" className="site-logo" aria-label="Devflix, início da página">
            <Mark />
            <span className="site-logo__word">Devflix</span>
          </a>

          <nav aria-label="Cenas" className="site-links">
            <ul>
              {links.map((l) => (
                <li key={l.href}>
                  <a href={l.href} className="site-link" aria-current={l.current ? "location" : undefined}>
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="site-tools">
            <MotionToggle />
            <button
              ref={button}
              type="button"
              className="site-menu-btn"
              aria-expanded={open}
              aria-controls="site-menu"
              onClick={() => setOpen((v) => !v)}
            >
              <span>Cenas</span>
              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" focusable="false" data-open={open}>
                <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          {/* A linha do tempo: o quanto da página já passou. */}
          <span className="site-progress-clip" aria-hidden="true">
            <span className="site-progress" />
          </span>
        </div>

        {/* No celular os links ficam aqui. Fechado, sai da ordem de tabulação (inert). */}
        <nav id="site-menu" aria-label="Cenas" className="site-menu" data-open={open} inert={!open}>
          <ul>
            {links.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  className="site-menu__link"
                  aria-current={l.current ? "location" : undefined}
                  onClick={() => close(false)}
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
