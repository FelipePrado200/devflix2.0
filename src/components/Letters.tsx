import { Fragment, type CSSProperties, type ElementType } from "react";

type Props = {
  text: string;
  /** O elemento: um título, normalmente. */
  as?: ElementType;
  id?: string;
  className?: string;
  /** As letras entram já, sem esperar a tela de carregamento sair. É o caso da própria tela de carregamento. */
  immediate?: boolean;
};

/**
 * Um texto cujas letras entram uma a uma. Só HTML e CSS, e vem pronto do servidor:
 *   - sem JavaScript as letras aparecem do mesmo jeito (a animação só esconde ao começar);
 *   - o leitor de tela lê o texto inteiro (`aria-label`), não as letras soltas;
 *   - cada palavra é um bloco que não quebra no meio, então a linha só quebra entre palavras.
 *
 * Quem decide quando a entrada acontece é o CSS: `.letters .ch` no globals.css. Ela espera a
 * tela de carregamento sair (`html[data-letters="wait"]`) e nunca roda com movimento reduzido.
 *
 * Detalhe do ofício: separar a letra em elementos próprios desfaz o kerning entre elas. Nos
 * títulos de cartaz a diferença é pequena; por isso isto fica só nos títulos, e o texto corrido
 * continua inteiro.
 */
export function Letters({ text, as: Tag = "span", id, className, immediate }: Props) {
  const words = text.split(" ").filter(Boolean);
  let index = 0;
  return (
    <Tag id={id} className={`letters${immediate ? " letters--now" : ""} ${className ?? ""}`} aria-label={text}>
      <span aria-hidden="true">
        {words.map((word, w) => (
          // O espaço fica FORA do bloco da palavra: no fim de um bloco inline ele seria descartado.
          <Fragment key={w}>
            <span className="wd">
              {[...word].map((ch, i) => (
                <span key={i} className="ch" style={{ "--c": index++ } as CSSProperties}>
                  {ch}
                </span>
              ))}
            </span>
            {w < words.length - 1 ? " " : null}
          </Fragment>
        ))}
      </span>
    </Tag>
  );
}
