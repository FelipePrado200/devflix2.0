# Storyboard

A rolagem é a linha do tempo do filme. Cada cena tem um nome, um intervalo de rolagem e uma
intenção de câmera. Este arquivo é o contrato entre a rolagem e a cena 3D. Quando
`src/components/stage/layout.ts` mudar, atualize a tabela aqui no mesmo commit.

## Como o intervalo é calculado

A altura de cada cena sai de uma conta só, em `src/components/stage/sections.tsx`:

```
altura da cena = 100svh + (paradas - 1) × STEP_SVH        // STEP_SVH = 45
```

A cena fica presa na tela (`position: sticky`) durante toda essa altura. A rolagem dela se
divide em duas partes:

1. **A viagem**, de 100svh, que leva a câmera da cena anterior até a primeira parada desta.
2. **O passeio**, de `(paradas - 1) × 45svh`, em que a câmera anda de parada em parada e
   desacelera em cada uma.

Um único `ScrollTrigger` com `scrub` governa a linha do tempo inteira, em
`src/components/stage/Stage.tsx`. A cena 3D só lê a posição que ele escreve em `stage.cam`.
Não existe um segundo controle de rolagem.

## O mapa da rolagem

Os números são o começo de cada cena, em svh, contados do topo da página. Eles dependem de
quantos filmes a cena mostra, e isso muda entre o desktop e o celular.

| # | Cena | Paradas (desktop) | Começa (desktop) | Paradas (celular) | Começa (celular) |
|---|---|---|---|---|---|
| 1 | Projeção | 1 | 0 | 1 | 0 |
| 2 | Em cartaz | 8 | 100 | 5 | 100 |
| 3 | Os mais bem avaliados | 8 | 515 | 5 | 380 |
| 4 | O que o público diz | 6 | 930 | 4 | 660 |
| 5 | Por gênero | 4 | 1255 | 4 | 895 |
| 6 | Créditos | 1 | 1490 | 1 | 1130 |

O celular mostra menos pôsteres de propósito: menos desenho por quadro, e menos rolagem para
chegar ao fim.

## As cenas

### 1. Projeção

**Intervalo:** 0 a 100svh. Uma parada.

**Câmera:** parada em `(0, 0, 6)`, olhando para a tela do cinema. Só uma respiração lenta,
sem viagem. O pôster do filme em destaque fica à direita, inclinado 9 graus para dentro.

**Luz:** a tela do cinema está acesa com o fundo do filme em destaque. O token `stage.screen`
vale 1 aqui e cai para 0 durante os primeiros 85% desta cena, com a curva `--ease-camera`.

**HTML:** título do filme no passo `hero`, nota com a escala e o número de votos, botão do
trailer. Todo esse texto existe no DOM, inclusive quando o canvas está na tela.

**Estado:** pronto. Falta o feixe do projetor e a poeira, que são da fase 3.

### 2. Em cartaz

**Intervalo:** 100 a 515svh no desktop. Oito paradas.

**Câmera:** avança para dentro da sala, no eixo Z, como num trilho de dolly. Ela anda 5
unidades de mundo entre um pôster e o próximo, e desacelera em cada parada com
`--ease-camera`. Os pôsteres alternam um leve desvio para os dois lados, então a câmera
nunca anda numa reta perfeita.

**HTML:** o filme em foco aparece com título, ano e nota. O contador mostra a posição na
cena, e a barra de progresso usa a cor do pôster em foco.

**Estado:** pronto.

### 3. Os mais bem avaliados

**Intervalo:** 515 a 930svh no desktop. Oito paradas.

**Câmera:** no desktop ela desce uma tira de filme vertical, do primeiro lugar ao último. No
celular a tira fica na horizontal e a câmera anda de lado, porque uma descida longa briga com
a rolagem do dedo.

**Intenção que falta:** a especificação pede uma escadaria, com o pôster crescendo conforme a
nota, e a nota subindo com contagem animada quando o filme entra em foco. Hoje a tira é reta
e a nota não conta.

**Estado:** parcial. A escadaria e a contagem são da fase 4.

### 4. O que o público diz

**Intervalo:** 930 a 1255svh no desktop. Seis paradas, uma por resenha.

**Câmera:** a sala escurece. A câmera anda 6 unidades entre uma resenha e a próxima, e cada
pôster só aparece na faixa curta de distância da resenha dele. Fora dessa faixa ele apaga.

**HTML:** o trecho da resenha entra como legenda de cinema, com o autor, a nota que ele deu e
o link "via TMDB". Uma resenha por vez, no passo `lead`.

**Intenção que falta:** o pôster atrás da legenda precisa ficar desfocado, com profundidade de
campo de verdade. Hoje ele só perde opacidade.

**Estado:** parcial. O desfoque é da fase 3.

### 5. Por gênero

**Intervalo:** 1255 a 1490svh no desktop. Quatro paradas, uma por gênero.

**Câmera:** para de frente para cada gênero, com 4 pôsteres à vista no desktop e 2 no
celular. O gênero seguinte está fora da faixa de distância e fica apagado.

**Intenção que falta:** a especificação pede um giro de 90 graus da câmera, revelando
corredores lado a lado, e uma cor de luz por gênero tirada dos pôsteres dele. Hoje a câmera
não gira e a luz é a mesma em todos.

**Estado:** parcial. O giro e a cor por corredor são da fase 4.

### 6. Créditos

**Intervalo:** a partir de 1490svh no desktop. Uma parada.

**Câmera:** recua e sobe até mostrar a sala inteira de cima, com todos os pôsteres pequenos
embaixo. É o único momento em que a pessoa vê a sala por fora.

**HTML:** os créditos sobem como no fim de um filme, com a atribuição do TMDB e o aviso
"This product uses the TMDB API but is not endorsed or certified by TMDB."

**Estado:** falta. O rodapé existe em HTML, mas a câmera não tem esta parada. É da fase 4.

## Abrir um filme, em qualquer cena

O pôster clicado sai da formação e vem até a câmera, no eixo dela, enquanto os outros apagam.
O painel de detalhes cresce a partir do ponto em que o pôster parou, com `--dur-long`.

`Esc` fecha o painel, devolve o pôster à posição exata de antes e o foco ao elemento de
origem. A câmera não se move durante isso: o ponto da rolagem continua o mesmo.

**Intenção que falta:** o giro de 180 graus, em que o verso do pôster vira o painel, e a
troca com a View Transitions API. Hoje o pôster vem para a frente e o painel cresce por cima.
É da fase 5.

## Movimento reduzido e sem WebGL

Não existe storyboard nos dois casos. Cada cena volta a ser uma seção 2D, com a altura normal
do conteúdo, e a câmera não existe. A versão 2D é a mesma em `prefers-reduced-motion`, sem
WebGL e quando o contexto WebGL é perdido.
