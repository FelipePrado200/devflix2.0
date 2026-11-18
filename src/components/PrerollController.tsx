"use client";

import { useEffect } from "react";
import { stage } from "@/components/stage/store";
import { doneCount, isReady, MILESTONES, prerollOn, READY_EVENT, ready, SEEN_KEY } from "@/lib/preroll";
import { DURATION, FILM_FPS, PREROLL } from "@/motion/tokens";

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Conduz a tela de carregamento (a película). Mexe direto nos atributos da página, sem estado
 * do React: ela vive poucos segundos e não pode custar nenhuma renderização.
 *
 * A regra:
 *   - a película avança no máximo 1 quadro a cada `PREROLL.step`, para o quadro ser visto;
 *   - só avança quando há marcos reais a mais (fontes, cena, pôster, fundo);
 *   - quando tudo chegou e o último quadro (o filme em destaque) está na janela, faz uma pausa
 *     (`PREROLL.hold`) para o título se ler, e só então a câmera entra nele;
 *   - sai de qualquer jeito em `PREROLL.max`. Ela nunca prende a página.
 *
 * Fica montado no layout e não dentro da tela: assim, se a página não trouxer a tela (o aviso de
 * token que falta, por exemplo), ele ainda destrava a rolagem e as letras.
 */
export function PrerollController() {
  useEffect(() => {
    const html = document.documentElement;
    const el = document.getElementById("preroll");

    // Sem tela nesta visita (já vista na sessão, movimento reduzido, ou a página não a trouxe).
    if (!el || !prerollOn()) {
      el?.remove();
      stage.holdLamp = false;
      delete html.dataset.letters;
      if (prerollOn()) html.dataset.preroll = "off";
      return;
    }

    const frames = [...el.querySelectorAll<HTMLElement>(".preroll__frame")];
    const titles = [...el.querySelectorAll<HTMLElement>(".preroll__title")];
    const tc = el.querySelector<HTMLElement>(".preroll__tc");
    const last = Math.max(0, frames.length - 1);

    let step = 0;
    let finished = false;
    let hold = 0;
    let raf = 0;
    const t0 = performance.now();

    const paint = () => {
      el.dataset.step = String(step);
      el.dataset.beat = step % 2 ? "b" : "a";
      el.style.setProperty("--i", String(step));
      el.style.setProperty("--p", String(doneCount() / MILESTONES.length));
      // Revelados: os quadros que já passaram pela janela. O título é o do quadro da janela.
      frames.forEach((f, i) => f.classList.toggle("is-on", i <= step));
      titles.forEach((t, i) => t.classList.toggle("is-current", i === step));
    };

    // O timecode corre a 24 quadros por segundo, a cadência do cinema, em qualquer tela.
    let lastFrame = -1;
    const clock = () => {
      const n = Math.floor((performance.now() - t0) / (1000 / FILM_FPS));
      if (n !== lastFrame && tc) {
        lastFrame = n;
        tc.textContent = `00:00:${pad(Math.floor(n / FILM_FPS))}:${pad(n % FILM_FPS)}`;
      }
      raf = requestAnimationFrame(clock);
    };

    const finish = () => {
      if (finished) return;
      finished = true;
      window.clearInterval(tick);
      window.clearTimeout(cap);
      window.clearTimeout(hold);
      cancelAnimationFrame(raf);

      // A câmera entra no quadro, o feixe acende e as letras do site começam a entrar.
      stage.holdLamp = false;
      delete html.dataset.letters;
      el.dataset.state = "leaving";
      try {
        sessionStorage.setItem(SEEN_KEY, "1");
      } catch {
        /* sem armazenamento a película volta na próxima visita: é só um detalhe */
      }
      window.setTimeout(() => {
        el.remove();
        // Só agora a rolagem volta: antes, a página atrás da tela rolaria sem ninguém ver.
        html.dataset.preroll = "off";
      }, DURATION.long + 60);
    };

    // Quantos quadros a película já pode avançar: 1 por marco que chegou.
    const allowed = () => Math.min(last, doneCount());

    // O último quadro está na janela e tudo carregou: pausa para o título se ler, e então sai.
    const startHold = () => {
      if (!hold && isReady() && step >= last) hold = window.setTimeout(finish, PREROLL.hold);
    };

    const onTick = () => {
      if (finished) return;
      if (step < allowed()) {
        step += 1;
        paint();
      }
      startHold();
    };

    const tick = window.setInterval(onTick, PREROLL.step);
    const cap = window.setTimeout(finish, PREROLL.max);
    window.addEventListener(READY_EVENT, paint);
    paint();
    raf = requestAnimationFrame(clock);

    // As fontes são o primeiro marco: sem elas o título em Bodoni piscaria em outra letra.
    document.fonts?.ready.then(() => ready("fonts"), () => ready("fonts"));
    if (!document.fonts) ready("fonts");

    return () => {
      window.clearInterval(tick);
      window.clearTimeout(cap);
      window.clearTimeout(hold);
      window.removeEventListener(READY_EVENT, paint);
      cancelAnimationFrame(raf);
    };
  }, []);

  return null;
}
