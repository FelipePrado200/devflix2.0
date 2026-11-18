---
version: 1.0
name: Sala-de-projecao
description: >-
  Uma sala de projeção apagada. O preto absoluto é o fundo, e tudo que aparece parece
  iluminado por um feixe de projetor: a luz é o texto, o pôster é o assunto, e a única cor
  de destaque vem do filme em foco. A tipografia junta uma didone de alto contraste nos
  títulos, como num cartaz de cinema, com uma sem serifa geométrica na interface. Nada de
  degradê decorativo, nada de vidro fosco, nada de sombra embaixo de cartão: a profundidade
  vem da luz e da escala, nunca de um efeito aplicado por cima.

colors:
  screen: "oklch(0 0 0)"
  room-1: "oklch(0.205 0.008 275)"
  room-2: "oklch(0.245 0.008 275)"
  room-3: "oklch(0.17 0.008 275)"
  light: "oklch(0.97 0.006 85)"
  light-dim: "oklch(0.79 0.008 85)"
  light-faint: "oklch(0.66 0.008 85)"
  accent: "oklch(0.8 0.14 75)"
  accent-ink: "oklch(0.14 0.02 75)"
  hairline: "oklch(1 0 0 / 0.14)"
  ink: "oklch(0.17 0 0)"

typography:
  hero:
    fontFamily: "Bodoni Moda, Georgia, serif"
    fontSize: "clamp(48px, 9.5vw, 132px)"
    fontWeight: 600
    lineHeight: 0.9
    letterSpacing: "-0.02em"
  display-lg:
    fontFamily: "Bodoni Moda, Georgia, serif"
    fontSize: "clamp(36px, 5vw, 64px)"
    fontWeight: 600
    lineHeight: 0.98
    letterSpacing: "-0.015em"
  display-md:
    fontFamily: "Bodoni Moda, Georgia, serif"
    fontSize: "clamp(28px, 3.4vw, 40px)"
    fontWeight: 600
    lineHeight: 1.06
    letterSpacing: "-0.01em"
  display-sm:
    fontFamily: "Bodoni Moda, Georgia, serif"
    fontSize: "clamp(22px, 2.4vw, 28px)"
    fontWeight: 600
    lineHeight: 1.14
    letterSpacing: "-0.01em"
  tagline:
    fontFamily: "Bodoni Moda, Georgia, serif"
    fontSize: 21px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: 0
  lead:
    fontFamily: "Jost, system-ui, sans-serif"
    fontSize: "clamp(19px, 1.6vw, 24px)"
    fontWeight: 300
    lineHeight: 1.45
    letterSpacing: 0
  body:
    fontFamily: "Jost, system-ui, sans-serif"
    fontSize: 17px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0
  label:
    fontFamily: "Jost, system-ui, sans-serif"
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "0.16em"
    textTransform: uppercase
  caption:
    fontFamily: "Jost, system-ui, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: 0
  fine:
    fontFamily: "Jost, system-ui, sans-serif"
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.35
    letterSpacing: "0.01em"

radii:
  xs: 2px
  sm: 4px
  poster: 6px
  md: 8px
  pill: 9999px
---

# Sala de projeção

O sistema visual do Devflix. Ele manda em toda tela e todo componente. Onde a especificação
do projeto e este arquivo discordarem, este arquivo vale, menos em um ponto: as imagens são
sempre os pôsteres e os fundos do TMDB, nunca fotografia de banco de imagem.

## A ideia em uma frase

A pessoa está sentada numa sala apagada. O preto não é um fundo escuro: é a ausência de luz.
Tudo que ela lê parece atravessado pelo feixe do projetor, e a única cor saturada da tela sai
do pôster que está em foco naquele instante.

## Cores

### As superfícies

| Token | Valor | Onde usar |
|---|---|---|
| `screen` | `oklch(0 0 0)` | O fundo da página e do canvas. Preto absoluto, sem exceção. |
| `room-1` | `oklch(0.205 0.008 275)` | Painel do filme, rodapé, cartão de resenha. |
| `room-2` | `oklch(0.245 0.008 275)` | Superfície que sobe acima do painel: chip, campo, botão secundário. |
| `room-3` | `oklch(0.17 0.008 275)` | Superfície que afunda: trilha de barra, quadro vazio de pôster. |

As 3 superfícies têm o mesmo matiz, 275, levemente frio. O pôster é a coisa quente da tela, e
a sala precisa ficar atrás dele.

### A luz

| Token | Valor | Em `screen` | Em `room-1` | Em `room-2` | Onde usar |
|---|---|---|---|---|---|
| `light` | `oklch(0.97 0.006 85)` | 19,3:1 | 16,5:1 | 15,0:1 | Título, nota, texto que manda. |
| `light-dim` | `oklch(0.79 0.008 85)` | 10,9:1 | 9,3:1 | 8,4:1 | Texto corrido, sinopse, trecho de resenha. |
| `light-faint` | `oklch(0.66 0.008 85)` | 6,8:1 | 5,8:1 | 5,2:1 | Metadado: ano, duração, número de votos, "via TMDB". |

A luz é levemente quente, matiz 85. Branco puro na tela inteira parece monitor, não projetor.

Os números acima são medidos, não estimados. Qualquer um dos 3 tons passa no AA sobre
qualquer uma das 3 superfícies, e o menor valor da tabela, 5,2:1, ainda tem folga sobre o
mínimo de 4,5:1. Mesmo assim, `light-faint` existe para metadado: não use nele o texto que a
pessoa precisa ler para entender a tela.

### O destaque

| Token | Valor | Onde usar |
|---|---|---|
| `accent` | `oklch(0.8 0.14 75)` | Link, foco, barra de progresso, brilho atrás do pôster em foco. |
| `accent-ink` | `oklch(0.14 0.02 75)` | Texto e ícone sobre o `accent`. |

O valor acima é o âmbar do projetor, e ele é só o padrão. O valor real vem do pôster em foco,
extraído no servidor e escrito na variável `--accent`. A transição entre uma cor e a próxima
acontece em espaço OKLCH, nunca em RGB, porque em RGB duas cores saturadas passam por um
cinza sujo no meio do caminho.

A cor que vem do pôster é normalizada antes de entrar na tela, senão um pôster escuro deixa o
link ilegível:

- luminosidade (`L`) presa entre 0,72 e 0,86;
- croma (`C`) preso em no máximo 0,16;
- matiz (`H`) livre, porque é ele que identifica o filme.

Com esses limites, o pior caso possível é 7,8:1 sobre o `screen`, num rosa de matiz 345 e
croma no teto. O âmbar padrão dá 11,0:1. Qualquer filme, então, fica bem acima do AA.

### Linha e véu

| Token | Valor | Onde usar |
|---|---|---|
| `hairline` | `oklch(1 0 0 / 0.14)` | Divisória de 1px e contorno de superfície. |
| `ink` | `oklch(0.17 0 0)` | Texto sobre uma superfície clara. Só o selo do TMDB usa. |

## Tipografia

Duas famílias, e só duas.

**Bodoni Moda**, uma didone de alto contraste, nos títulos. É a letra do cartaz de cinema: a
haste grossa ao lado da haste fina. Ela só funciona grande. Abaixo de 21px a haste fina
desaparece na tela, então nunca use a família de display abaixo do passo `tagline`.

**Jost**, sem serifa geométrica da linhagem da Futura, em toda a interface: texto corrido,
botão, rótulo, metadado. O círculo quase perfeito do "o" e do "e" dá o ar de projeto gráfico
dos anos 1960, que é a época do cartaz de cinema que esta página imita.

As duas são auto-hospedadas e com subset pelo `next/font`. Nenhuma requisição sai para um
servidor de fontes de terceiros.

### O eixo de tamanho óptico

A Bodoni Moda tem um eixo `opsz` (de 6 a 96) que troca o desenho da letra: valor alto dá fios
finíssimos, de cartaz; valor baixo dá fios firmes, de texto. O `next/font` só o carrega se o
pedirmos (`axes: ["opsz"]`), e sem ele o título de 132 px usava o desenho de 11 px, grosso demais.

O valor automático (o tamanho em px) é fino demais num fundo escuro: num título de 30 px o hífen,
que na didone é um fio, some. Por isso cada passo da escala leva o seu valor, na variável `--opsz`:

| Passo | `opsz` |
|---|---|
| `hero` | 96 |
| `display-lg` | 60 |
| `display-md` | 24 |
| `display-sm` | 14 |
| `tagline` e a marca do cabeçalho | 11 |

Custo: +20 KB de fonte (51 para 71 KB), sem mudança de CLS (0,0011).

### A escala

Ela é modular, com razão próxima de 1,25, e os passos de display são fluidos entre o celular
e a tela grande. Um passo fluido não precisa de variante por breakpoint: `text-hero` já é
48px no celular e 132px no desktop.

| Passo | Família | Tamanho | Entrelinha | Onde usar |
|---|---|---|---|---|
| `hero` | Bodoni | 48px → 132px | 0.9 | O título do filme em destaque na abertura. Um por página. |
| `display-lg` | Bodoni | 36px → 64px | 0.98 | Título de cena. |
| `display-md` | Bodoni | 28px → 40px | 1.06 | Título do filme no painel, subtítulo de cena. |
| `display-sm` | Bodoni | 22px → 28px | 1.14 | Título de filme dentro de uma cena, nome de gênero. |
| `tagline` | Bodoni | 21px | 1.2 | Título pequeno, marca no topo, número de posição. |
| `lead` | Jost 300 | 19px → 24px | 1.45 | Primeiro parágrafo de uma cena, legenda de resenha. |
| `body` | Jost 400 | 17px | 1.5 | Texto corrido, botão, sinopse. |
| `label` | Jost 500 | 13px | 1.2 | Rótulo de cena em caixa alta, com `letter-spacing` de 0.16em. |
| `caption` | Jost 400 | 14px | 1.45 | Elenco, duração, autor da resenha. |
| `fine` | Jost 400 | 12px | 1.35 | Atribuição do TMDB e aviso legal. |

Regras:

- Entrelinha de texto corrido nunca abaixo de 1,45. A sala é escura, e texto apertado em
  fundo preto cansa mais do que em fundo claro.
- O `letter-spacing` negativo é só para os passos de display. Texto de interface fica em 0.
- Peso 300 da Jost só nos passos `lead` e maiores. Abaixo disso ele some no preto.
- Número sempre com `tabular-nums`: a nota e a contagem de votos não podem dançar quando
  mudam de valor.

## Espaço, raio e profundidade

Espaçamento em múltiplos de 4px. A medida do texto fica entre 60 e 75 caracteres.

| Raio | Valor | Onde usar |
|---|---|---|
| `xs` | 2px | Chip e selo. |
| `sm` | 4px | Campo, botão retangular. |
| `poster` | 6px | O quadro do pôster, em 2D e em 3D. |
| `md` | 8px | Painel e cartão. |
| `pill` | 9999px | Só o botão de ação principal e o botão circular de ícone. |

Profundidade nesta página não vem de sombra. Vem de 3 coisas, nesta ordem:

1. **Escala.** O pôster em foco é maior que os outros.
2. **Luz.** Um brilho radial na cor do pôster, atrás dele, com 20% de opacidade no centro.
3. **Fuga.** O que está longe perde opacidade e nitidez, não ganha sombra.

## Componentes

| Componente | Especificação |
|---|---|
| `poster-frame` | Proporção 2:3, raio `poster`, contorno de 1px em `hairline`. A imagem aproxima 1.03 dentro do quadro no hover. Sem sombra. |
| `poster-card` | O `poster-frame` mais título em `display-sm` e nota. Sobe 2px no hover. O alvo clicável cobre o cartão inteiro. |
| `btn--primary` | Fundo `accent`, texto `accent-ink`, raio `pill`, altura mínima 44px, padding 12px 24px. Afunda para 0.95 em `:active`. |
| `btn--ghost` | Contorno de 1px em `accent`, texto `accent`, mesmo raio e altura. No hover ganha um fundo de `accent` a 16%. |
| `link` | Texto em `accent`, sublinhado de 1px a 4px de distância da letra. O sublinhado aparece no hover, em `--dur-short`. |
| `score` | Nota, barra de escala e contagem de votos, sempre juntas: "7,8/10 · 12.430 votos". Nunca uma estrela. |
| `review-card` | Superfície `room-1`, raio `md`, autor em `caption`, trecho em `lead`, link "via TMDB" em `fine`. |
| `panel` | `dialog` nativo em `room-1`, raio `md`, véu de `rgb(0 0 0 / 0.82)`. Abre em `--dur-long`, fecha em `--dur-medium`. |
| `label-scene` | O rótulo da cena em `label`, com um traço de 24px em `accent` antes do texto. |
| `grain` | Véu de ruído sobre a página inteira, opacidade 0.035, `pointer-events: none`. Na cena 3D ele é um passe de pós-processamento a 24 quadros por segundo. |
| `site-header` | Pílula flutuante de 52 px, na largura da coluna de conteúdo (1280), em `room-1` com contorno de 1 px em `hairline`. Sem vidro fosco e sem sombra. Marca (o mostrador do carregamento) à esquerda, links no centro, pausa da animação à direita. A cena atual leva um sublinhado de 1 px em `accent`, e a borda de baixo tem uma linha de 2 px em `accent` que mostra o progresso da rolagem. No celular os links viram um menu. |
| `preroll` | A película: uma faixa em `room-1` com perfurações pretas e 5 quadros de 2:3, passando por uma janela de 4 cantos em `accent`. O quadro ainda não revelado fica escuro e sem cor, e o que chegou à janela volta à cor. O título do filme da janela, em `display-md`, entra letra a letra; o topo leva a marca, o rótulo e o timecode em `label`; a linha de 2 px em `accent` no topo mostra o progresso; e a fileira de cadeiras fica na beira de baixo. Aparece 1 vez por sessão e nunca com movimento reduzido. |
| `seat-row` | Fileira de cadeiras de frente: encosto e braços em `room-1`, assento em `room-2`, contorno `hairline`, fio de luz em `light` na borda de cima. Os baldes de pipoca têm listras em `accent` e creme, e os grãos usam `light` e `accent`. |

## Movimento

Todas as durações e curvas vêm de `src/motion/tokens.ts`. Nenhum número de tempo fica solto
no CSS nem no TSX. O arquivo escreve as variáveis `--dur-*` e `--ease-*` no documento, e o
GSAP importa os mesmos valores.

| Intenção | Token | Uso |
|---|---|---|
| Entrar | `--ease-enter` | O que chega na tela e para. |
| Sair | `--ease-exit` | O que vai embora. |
| Ênfase | `--ease-emphasis` | O que muda de estado sem sair do lugar. |
| Câmera | `--ease-camera` | Só a câmera e a luz. |

A câmera nunca anda em linha reta entre duas paradas, e ela chega com amortecimento crítico,
sem passar do ponto. A inclinação do pôster pelo mouse para em 8 graus.

## Proibido

- Degradê roxo, azul ou qualquer degradê como decoração de fundo. A única exceção é o véu de
  legibilidade (`hero-scrim`): preto a transparente, atrás de texto que cai sobre uma imagem.
  Ele existe para o contraste, não para o visual, e nunca leva cor.
- Vidro fosco (`backdrop-filter: blur`) em cartão, cabeçalho ou painel.
- Sombra borrada embaixo de cartão, de botão ou de pôster.
- Estrela amarela como ícone de nota. A nota é um número com a escala ao lado.
- Ícone de emoji no lugar de ícone de verdade.
- Texto de marketing sem conteúdo: "experiência única", "a magia do cinema", "descubra agora".
- Animar `width`, `height`, `top`, `left` ou `box-shadow`.
- Movimento linear visível. Toda curva vem dos tokens.
- Qualquer logo de estúdio ou de serviço de streaming. Só o selo do TMDB.

Se uma tela puder aparecer em qualquer template gerado por IA, ela está errada, mesmo que
cumpra todas as regras acima.

## Responsivo

| Nome | Largura | O que muda |
|---|---|---|
| Celular | ≤ 639px | Uma coluna. Margem de 24px. Menos pôsteres por cena. Sem profundidade de campo, sem inclinação pelo mouse, poeira reduzida. |
| Celular grande e tablet em pé | 640 a 1023px | Margem de 48px. O palco 3D entra no modo compacto: o pôster em cima, o texto embaixo. |
| Desktop | ≥ 1024px | O pôster fica à direita e o texto à esquerda. Largura máxima de conteúdo 1280px. |

O palco decide o modo compacto pela proporção, não só pela largura: um tablet em pé também é
compacto. A medida está em `src/components/stage/Stage.tsx`.

Alvos de toque com 44px ou mais, sempre, inclusive no botão de fechar o painel.

## Acessibilidade

- Contraste AA em todo texto, com a tabela da seção de cores como prova.
- Foco sempre visível: anel de 2px em `accent`, a 4px de distância do elemento.
- `prefers-reduced-motion`: a câmera não viaja, o feixe e a poeira ficam parados, e cada cena
  volta a ser uma seção 2D com uma transição curta de opacidade.
- Sem WebGL, ou com o contexto perdido: a mesma versão 2D aparece no lugar, nunca uma tela
  vazia.
- Todo pôster tem nome acessível com título, ano e nota.
- O 3D nunca é a única fonte de nada. Todo texto existe no DOM.

## Lacunas conhecidas

- Estado de erro de formulário não existe nesta página, porque ela não tem formulário.
- O selo do TMDB é a única superfície clara do sistema, e ele vem como imagem pronta, então
  não tem token de superfície própria.
- A cor de destaque de um pôster quase monocromático cai no `accent` padrão. O resultado é
  correto, mas a cena perde a identidade daquele filme.
