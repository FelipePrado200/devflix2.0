"use client";

import { useEffect, useState } from "react";
import { AMBIENT_KEY, stage } from "./stage/store";

/**
 * Pausa a animação ambiente da cena: poeira, fumaça do feixe, grão e flutuação dos pôsteres.
 *
 * Critério 2.2.2 da WCAG (nível A): movimento que começa sozinho, dura mais de 5 segundos e
 * divide a tela com o conteúdo precisa de um jeito de parar. O movimento reduzido do sistema
 * não basta, porque a pessoa pode não saber dele ou não querer mudar o sistema inteiro.
 *
 * O texto muda com o estado, então o botão não usa aria-pressed: as 2 coisas juntas fariam o
 * leitor de tela anunciar "Retomar animação, pressionado", que não quer dizer nada.
 * Só aparece com a cena 3D (ver `.motion-toggle` no globals.css): na versão 2D não há o que pausar.
 */
export function MotionToggle() {
  const [paused, setPaused] = useState(false);

  // Lê a escolha guardada depois da hidratação, para o HTML do servidor e o do cliente
  // começarem iguais.
  useEffect(() => {
    let saved = false;
    try {
      saved = localStorage.getItem(AMBIENT_KEY) === "paused";
    } catch {
      /* armazenamento bloqueado: a animação começa ligada */
    }
    stage.ambient = !saved;
    setPaused(saved);
  }, []);

  const toggle = () => {
    const next = !paused;
    stage.ambient = !next;
    setPaused(next);
    try {
      if (next) localStorage.setItem(AMBIENT_KEY, "paused");
      else localStorage.removeItem(AMBIENT_KEY);
    } catch {
      /* sem armazenamento a escolha vale só nesta visita */
    }
  };

  return (
    <button type="button" onClick={toggle} className="motion-toggle btn btn--quiet min-h-11 gap-2 px-4 text-caption max-md:size-11 max-md:px-0">
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
        {paused ? (
          <path d="M3 1.5v9l7.5-4.5z" fill="currentColor" />
        ) : (
          <path d="M2.5 1.5H5v9H2.5zM7 1.5h2.5v9H7z" fill="currentColor" />
        )}
      </svg>
      {/* No celular o texto sai da vista e o botão vira só o ícone; o nome acessível continua. */}
      <span className="max-md:sr-only">{paused ? "Retomar animação" : "Pausar animação"}</span>
    </button>
  );
}
