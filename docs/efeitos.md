# Efeitos

Cada efeito da página: o componente ou a técnica, a seção e o que ele faz.

| Efeito | Técnica | Seção | O que faz |
|---|---|---|---|
| Elevação do pôster | CSS `transform: translateY(-2px)` | Em cartaz, Mais bem avaliados, Por gênero | O cartão sobe 2px quando o mouse passa sobre ele. |
| Zoom do pôster | CSS `transform: scale(1.03)` dentro do quadro | Em cartaz, Mais bem avaliados, Por gênero | A imagem aproxima um pouco sem sair do quadro. |
| Pressão do botão | CSS `transform: scale(0.95)` em `:active` | Todos os botões | O botão afunda quando a pessoa clica. |
| Sublinhado do link | CSS `text-decoration-color` | Resenhas, rodapé | O sublinhado aparece quando o mouse passa sobre o link. |
| Rolagem suave | Lenis, ligado ao `gsap.ticker` em `src/lib/scroll.ts` | Página inteira | A rolagem desacelera com suavidade em vez de parar de uma vez. |
| Câmera na rolagem | GSAP ScrollTrigger com `scrub` (uma linha do tempo só) | Abertura, Em cartaz, Mais bem avaliados | A rolagem leva a câmera de um pôster ao próximo, e ela desacelera em cada um (`sine.inOut`). |
| Tela do cinema | Plano 3D com o fundo do filme, opacidade presa à rolagem | Abertura | O fundo do filme em destaque apaga quando a câmera avança para o corredor. |
| Corredor em profundidade | Pôsteres 3D em fila no eixo Z (React Three Fiber) | Em cartaz | Os pôsteres flutuam em profundidade, e a câmera atravessa o corredor. |
| Tira de filme | Pôsteres 3D em coluna (em linha no celular) | Mais bem avaliados | A câmera desce pela tira, do 1º ao último lugar. |
| Inclinação com o mouse | Rotação do pôster em foco, no máximo 8 graus | Abertura, Em cartaz, Mais bem avaliados | O pôster em foco inclina um pouco na direção do mouse. |
| Cor de destaque do pôster | Média dos pixels saturados da textura, normalizada em OKLCH por `src/lib/color.ts` e escrita em `--accent` | Em cartaz, Mais bem avaliados | O brilho atrás do pôster em foco, o link e a barra de progresso usam a cor do pôster. O limite de luminosidade e croma garante 7,8:1 de contraste no pior caso. |
| Véu de legibilidade | Degradê de preto a transparente (`.hero-scrim`) | Abertura | Escurece o fundo do filme só onde o texto passa. É contraste, não decoração. |
| Flutuação | Seno lento na posição Y (4 cm no mundo 3D) | Todos os pôsteres 3D | O pôster sobe e desce muito devagar, para a cena não ficar parada. |
| Entrada do filme em foco | CSS `opacity` + `translateY(12px)`, 360 ms | Em cartaz, Mais bem avaliados | O título e a nota do filme em foco entram subindo quando a câmera chega nele. |
| Barra de progresso | CSS `transform: scaleX` | Em cartaz, Mais bem avaliados | A barra mostra em que filme da seção a pessoa está. |
| Pôster vem para a frente | GSAP anima `stage.pull`, e a cena move o pôster no eixo da câmera | Painel do filme | Ao abrir, o pôster do filme sai do lugar e vem até a câmera. Ao fechar, ele volta. |
| Os outros pôsteres saem | Opacidade presa ao mesmo `stage.pull` | Painel do filme | Enquanto o painel está aberto, só o pôster do filme aberto fica na tela. |
| Painel cresce | CSS `opacity` + `transform: scale(0.92) translateY(24px)`, 420 ms | Painel do filme | O painel cresce a partir do centro, onde o pôster parou. Ao fechar, ele encolhe em 300 ms. |
| Escurecer o fundo | CSS `opacity` no `::backdrop` | Painel do filme | O fundo escurece junto com o painel, sem tela branca. |
| Título que sobe | `SplitText` do React Bits (variante TS + Tailwind), com GSAP | Em cartaz, Mais bem avaliados, O que o público diz, Por gênero | As palavras do título sobem em sequência quando a seção entra na tela. |
| Resenha em sequência | Palco de O que o público diz: um `stage-item` por resenha | O que o público diz | Cada trecho entra subindo quando a câmera chega no pôster daquele filme. |
| Corredor por gênero | 4 paradas da câmera, uma por gênero | Por gênero | A câmera para em cada gênero, com poucos filmes à vista. O gênero seguinte some. |
| Feixe do projetor | Cone de geometria + shader de ruído (`beam.frag.glsl`), luz aditiva, sem raymarching | Todas as cenas | Luz volumétrica falsa que sai da lente e chega ao pôster em foco. Acende com 3 piscadas e varre a sala até o filme. Abaixo da margem de medida. |
| Poeira | 900 pontos, movimento todo na GPU (`dust.vert.glsl`) | Dentro do feixe | Grãos que derivam na luz, com brilhos raros. A CPU não toca em nenhum por quadro. Abaixo da margem de medida. |
| Caixa de cartaz | Moldura extrudada, pôster, vidro e cabos (`poster.ts`, 4 shaders) | Todos os pôsteres | O pôster vira uma caixa de luz pendurada por cabos de aço. O vidro reflete a lente do projetor quando o mouse inclina a caixa (máx. 8 graus). |
| Grão e vinheta | Passe de pós-processamento (`film.frag.glsl`), grão a 24 quadros por segundo | Todas as cenas | O grão troca 24 vezes por segundo em qualquer tela e congela na pausa. Custa cerca de 0,2 ms. |
| Profundidade de campo | `DepthOfField` do postprocessing, resolução fixa em 540 px de altura | Todas as cenas | O pôster em foco fica nítido e o resto desfoca; o foco acompanha a rolagem. Custa cerca de 3,4 ms, o maior custo da cena. Desligada no nível baixo e no celular. |
| Plateia 3D | 3 `InstancedMesh`: cadeiras, baldes de pipoca, luzes de corredor (`Sala.tsx`) | Todas as cenas | Cadeiras de veludo dos 2 lados do corredor, viradas para os pôsteres, com pipoca sobre alguns assentos. As listras do balde usam a cor do pôster em foco. 3 draw calls para a sala inteira. |
| Teto de luminância | `roomfx.glsl` | Zona do texto | A plateia escurece onde o texto em HTML passa (à esquerda no desktop, embaixo no celular), para o contraste do texto não depender de onde a pipoca ficou. Todo texto sobre a cena passa de 6:1. |
| Tela de carregamento | Película de 35 mm em HTML/CSS (`Preroll.tsx`) + `PrerollController`, marcos em `src/lib/preroll.ts` | Abertura | Uma película passa pela janela de um projetor com 5 quadros: 4 filmes em alta e, por último, o filme em destaque. Cada marco real de carregamento (fontes, cena 3D, pôster, fundo) avança 1 quadro, e o quadro que chega à janela é revelado, do escuro e sem cor para a cor. Um timecode corre a 24 quadros por segundo e a linha do topo mostra o progresso real. No fim a câmera entra no quadro e o feixe acende. 1 vez por sessão, teto de 4,5 s, nunca com movimento reduzido e nunca sem JavaScript. |
| Carga adiantada | Mesma URL da textura 3D (`proxiedImage`) | Abertura | Os pôsteres da película usam exatamente a URL que a cena 3D vai pedir, então a tela de carregamento já deixa essas texturas no cache. |
| Cadeiras de SVG | `SeatRow` | Carregamento e rodapé | Fileira de cadeiras com pipoca, só em SVG, sem JavaScript. Existe também na versão 2D. |
| Letras que entram | `Letters` (CSS puro, servidor) e `SplitText` por caractere (GSAP) | Títulos | As letras do título do filme, da marca e do título do filme na película entram uma a uma (26 ms entre elas, travado em 24 letras). Os títulos de cena entram assim quando a seção aparece. Esperam a tela de carregamento sair. Sem JavaScript, sem a contagem ou com movimento reduzido o texto aparece inteiro. O nome acessível é o título, não as letras. |
| Cabeçalho | Pílula flutuante (`SiteHeader.tsx`) | Página inteira | A cena atual fica marcada no menu com o sublinhado na cor do pôster; a linha de baixo mostra o progresso da rolagem; no celular os links viram um menu. Sem vidro fosco e sem sombra. |
| Créditos | `Credits.tsx`: palco fixo de 100 svh dentro de 300 svh, GSAP `scrub` | Final | "Fim" entra, os créditos sobem como no fim de um filme (só fatos sobre o site) e, no fim da rolagem, aparecem a plateia, o logo e o aviso do TMDB e o botão "Rever a sessão". O botão só recebe foco quando está visível (`autoAlpha`). Sem JavaScript ou com movimento reduzido é um bloco estático com todo o texto. A altura da página muda depois da montagem, então um `ResizeObserver` refaz as medidas do ScrollTrigger. |
| Letra com descendente | `SplitText` com `paddingBlock: 0.2em` e `marginBlock: -0.2em` | Títulos | O recorte por linha não corta mais o "g" nem os acentos. A caixa do título não muda de tamanho. |
| Qualidade adaptável | `judge` em `quality.ts` (8 testes) | Cena 3D | Desce depois de 2 s abaixo de 45 fps, sobe depois de 4 s acima de 58, ignora engasgo de carga e assenta depois de 3 trocas. |

Do React Bits usei só o `SplitText`. Deixei de fora o `CountUp` e o `BlurText`, porque eles trazem a
biblioteca `motion`, e o GSAP já resolve. Não usei nenhum fundo em WebGL do React Bits: a página já
tem a cena 3D.

Com `prefers-reduced-motion` ou sem WebGL, a página usa as seções 2D da Fase 1: sem Lenis, sem câmera e sem canvas.

## Custo medido

Notebook com RTX 3050 de 6 GB (via ANGLE/Direct3D 11), tela de 1440 x 900 a devicePixelRatio 1,5, na
parada do quarto filme de Em cartaz. O tempo é a mediana de quadro com a GPU sincronizada (lê 1 pixel
depois de desenhar), então inclui o trabalho dos shaders. A margem de medida é de cerca de 1 ms: o que
ficou abaixo disso está dito assim, e não como número.

| Configuração | Tempo de quadro | Draw calls |
|---|---|---|
| Alto, tudo ligado | 5,0 ms | 33 |
| Alto, sem profundidade de campo | 1,6 ms | 22 |
| Alto, sem compositor (sem desfoque, grão e vinheta) | 1,1 ms | 21 |
| Médio | 3,4 ms | 33 |
| Baixo | 0,9 ms | 21 |

Limite do projeto: 120 draw calls por quadro. A cena usa 33.
