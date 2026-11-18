/**
 * Tokens de movimento. Fonte única: nenhuma duração, curva ou amortecimento fica solto
 * no código.
 *
 * Quem lê este arquivo:
 *   - o CSS, pelas variáveis que `motionCss()` escreve no `:root` (ver src/app/layout.tsx);
 *   - o GSAP, que precisa do nome da curva dele, em `EASE.<nome>.gsap`;
 *   - a cena 3D, que precisa das taxas de `DAMP` e dos valores de `FLOAT`.
 *
 * Peso das lentes de movimento neste projeto: polimento de produção em primeiro lugar,
 * experimentação em segundo, restrição nas ações que a pessoa repete (botão, link, foco).
 * O movimento grande é a câmera, e ela responde à rolagem, nunca a um clique.
 */

/** Durações em milissegundos. */
export const DURATION = {
  /** Instantânea. Ação repetida ou vinda do teclado: não anime. */
  instant: 0,
  /** Curta. Resposta ao dedo e ao mouse: pressão do botão, sublinhado, foco. */
  short: 160,
  /** Média. Entrada e saída de um elemento pequeno: nota, legenda, chip. */
  medium: 260,
  /** Longa. Painel do filme, pôster que ganha foco, troca de legenda. */
  long: 420,
  /** Cinematográfica. Só a câmera e a luz: viagem entre cenas, feixe que acende. */
  cinematic: 900,
} as const;

export type DurationName = keyof typeof DURATION;

/** Atraso entre um item e o próximo numa sequência: palavras de um título, resenhas. */
export const STAGGER = 80;

/**
 * Atraso entre uma letra e a próxima na entrada de um título. Curto: 12 letras levam 0,3 s para
 * começar, e o título inteiro está pronto antes de a pessoa terminar de lê-lo. Os títulos longos
 * travam em 24 letras de atraso (ver `.ch` no globals.css), senão a última levaria 1 s.
 */
export const LETTER_STAGGER = 26;

/**
 * Curvas nomeadas pela intenção. Cada uma traz o valor de CSS e o nome equivalente no
 * GSAP, porque os dois precisam da mesma curva e o GSAP não lê cubic-bezier por padrão.
 */
export const EASE = {
  /** Entrar: começa rápido e assenta devagar. O elemento chega e para. */
  enter: { css: "cubic-bezier(0.16, 1, 0.3, 1)", gsap: "expo.out" },
  /** Sair: acelera e vai embora. Ninguém espera uma saída. */
  exit: { css: "cubic-bezier(0.4, 0, 1, 1)", gsap: "power2.in" },
  /** Ênfase: sai e chega com a mesma força. Para o que muda de estado sem sair do lugar. */
  emphasis: { css: "cubic-bezier(0.65, 0, 0.35, 1)", gsap: "power2.inOut" },
  /** Câmera, viagem: de uma cena até a primeira parada da próxima. */
  camera: { css: "cubic-bezier(0.45, 0, 0.3, 1)", gsap: "power2.inOut" },
  /** Câmera, passo: de uma parada à seguinte dentro da mesma cena. Mais suave. */
  cameraStep: { css: "cubic-bezier(0.37, 0, 0.63, 1)", gsap: "sine.inOut" },
} as const;

export type EaseName = keyof typeof EASE;

/**
 * Amortecimento crítico na cena 3D, em 1/segundo. É a taxa que `THREE.MathUtils.damp`
 * recebe: o valor anda a fração `1 - exp(-taxa × dt)` do que falta a cada quadro. Ele
 * chega sem passar do ponto, então não existe oscilação para corrigir depois.
 * Taxa maior chega mais rápido. 8 equivale a uma constante de tempo de 125 ms.
 */
export const DAMP = {
  /** Câmera: a rolagem manda a posição, e isto tira o degrau entre dois quadros. */
  camera: 8,
  /** Inclinação do pôster pelo mouse. */
  tilt: 5,
  /** Opacidade do pôster conforme a distância. */
  poster: 6,
  /** Brilho do pôster que ganha ou perde o foco. */
  focus: 5,
  /** Luz: a tela do cinema e o brilho atrás do pôster. */
  light: 4,
  /**
   * Feixe do projetor: o ponto onde ele bate. Mais lento que a câmera de propósito, para
   * a varredura de um filme ao próximo ser vista, e não um salto.
   */
  beam: 2.5,
  /**
   * Foco da lente (profundidade de campo). Lento como um foco puxado à mão: o desfoque é
   * um sinal de relevância, e sinal brusco vira ruído.
   */
  lens: 3,
} as const;

/**
 * Quadros por segundo do grão de filme. É a cadência do cinema, e ela não depende da taxa
 * de atualização da tela: num monitor de 144 Hz o grão continua trocando 24 vezes por segundo.
 */
export const FILM_FPS = 24;

/** Inclinação máxima do pôster pelo mouse, em graus. Acima disto a placa parece de papel. */
export const MAX_TILT_DEG = 8;

/** Quanto a câmera acompanha o mouse, em unidades do mundo 3D. Só com mouse. */
export const POINTER_PARALLAX = 0.1;

/** Flutuação do pôster: amplitude em unidades do mundo e velocidade em radianos por segundo. */
export const FLOAT = { amplitude: 0.04, speed: 0.6 } as const;

/**
 * Tela de carregamento (a contagem de cinema). Ela aparece 1 vez por sessão, então pode ser
 * expressiva; em toda outra visita da mesma sessão ela nem existe.
 */
export const PREROLL = {
  /** Tempo mínimo de cada quadro na janela do projetor. A película avança em 260 ms (`medium`) e descansa o resto. */
  step: 380,
  /**
   * Pausa no último quadro, o filme em destaque, antes de a câmera entrar nele. É o tempo de o
   * título terminar de entrar letra a letra: sem ele a película corre e o título nunca se lê.
   */
  hold: 700,
  /** Atraso entre as letras do título na tela de carregamento. Menor que o do site: o quadro dura menos. */
  letter: 9,
  /** Teto: passado isto a tela sai mesmo que algo ainda esteja carregando. Ela nunca prende a página. */
  max: 4500,
  /**
   * Rede de segurança em CSS, para o caso de o JavaScript falhar. Fica acima do teto: só vale
   * se o controlador nem chegou a rodar.
   */
  failsafe: 6000,
} as const;

/** Duração em segundos, que é a unidade do GSAP. */
export function secs(name: DurationName): number {
  return DURATION[name] / 1000;
}

/** Inclinação máxima em radianos, que é a unidade do three.js. */
export const MAX_TILT_RAD = (MAX_TILT_DEG * Math.PI) / 180;

/**
 * As mesmas durações e curvas como variáveis de CSS. O `layout.tsx` escreve isto no
 * documento, então o CSS e o GSAP nunca saem de sincronia.
 */
export function motionCss(): string {
  const parts = [
    ...Object.entries(DURATION).map(([k, v]) => `--dur-${k}:${v}ms`),
    ...Object.entries(EASE).map(([k, v]) => `--ease-${k}:${v.css}`),
    `--stagger:${STAGGER}ms`,
    `--letter-stagger:${LETTER_STAGGER}ms`,
    `--preroll-step:${PREROLL.step}ms`,
    `--preroll-letter:${PREROLL.letter}ms`,
    `--preroll-failsafe:${PREROLL.failsafe}ms`,
  ];
  return `:root{${parts.join(";")}}`;
}
