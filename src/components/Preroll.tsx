import { proxiedImage } from "@/lib/format";
import { Letters } from "./Letters";
import { SeatRow } from "./SeatRow";

export type PrerollFrame = { id: number; title: string; posterPath: string | null };

/**
 * Tela de carregamento: uma película de 35 mm passando pelo projetor.
 *
 * Cada quadro é um filme do catálogo, e o último é o filme em destaque, o mesmo em que a página
 * abre. A película avança 1 quadro a cada marco real que termina de carregar (fontes, cena 3D,
 * pôster, fundo) e o quadro que chega à janela do projetor é REVELADO: sai do escuro e da
 * dessaturação para a cor, como um negativo na revelação. Quando o último quadro chega, a câmera
 * entra nele e a sala acende.
 *
 * Os pôsteres usam a mesma URL que a cena 3D vai pedir, então esta tela já deixa essas texturas
 * no cache: ela não é só enfeite, é a carga adiantada.
 *
 * O servidor sempre manda este HTML, mas o CSS só o mostra quando o script do `<head>` liga
 * `data-preroll="on"` (1 vez por sessão, nunca com movimento reduzido). Sem JavaScript ela nunca
 * aparece, então não existe tela de carregamento que nunca sai. Quem a conduz é o
 * `PrerollController`, montado no layout.
 */
export function Preroll({ frames }: { frames: PrerollFrame[] }) {
  return (
    <div id="preroll" className="preroll" role="status" aria-live="polite" data-step="0" data-beat="a">
      <p className="sr-only">Preparando a sessão…</p>

      <div className="preroll__stage" aria-hidden="true">
        {/* O progresso real: a linha do topo enche conforme os marcos chegam. */}
        <span className="preroll__progress" />

        <div className="preroll__top">
          <Letters as="span" text="Devflix" className="preroll__brand" immediate />
          <span className="preroll__label">Preparando a sessão…</span>
          <span className="preroll__tc">00:00:00:00</span>
        </div>

        <div className="preroll__reel">
          <div className="preroll__film">
            {frames.map((f, i) => (
              <figure key={f.id} className={`preroll__frame${i === 0 ? " is-on" : ""}`}>
                {f.posterPath ? (
                  // eslint-disable-next-line @next/next/no-img-element -- a URL é a mesma da textura 3D de propósito (cache compartilhado); o next/image montaria outra.
                  <img
                    src={proxiedImage(f.posterPath, "w185", 256)}
                    alt=""
                    width={256}
                    height={384}
                    decoding="async"
                    fetchPriority={i === frames.length - 1 ? "high" : "auto"}
                  />
                ) : null}
              </figure>
            ))}
          </div>

          {/* A janela do projetor: 4 cantos que travam no quadro a cada avanço, como um visor. */}
          <div className="preroll__gate">
            <i />
            <i />
            <i />
            <i />
          </div>
        </div>

        <div className="preroll__titles">
          {frames.map((f, i) => (
            <Letters
              key={f.id}
              as="p"
              text={f.title}
              immediate
              className={`preroll__title${i === 0 ? " is-current" : ""}`}
            />
          ))}
        </div>

        {/* A plateia, de costas para quem olha: assiste à película passar. */}
        <SeatRow className="preroll__seats" seats={9} buckets={[1, 4, 7]} fit="slice" />
      </div>
    </div>
  );
}
