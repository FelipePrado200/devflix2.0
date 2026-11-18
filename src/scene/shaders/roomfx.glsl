// Visibilidade da plateia. Compartilhado pelas cadeiras, pela pipoca e pelas luzes de corredor.
//
// 2 regras que existem por causa do texto em HTML, que passa por cima da cena:
//   1. A zona do texto tem um TETO de luminância. No desktop o texto fica à esquerda; no
//      celular, embaixo. Escurecer na proporção não basta: a pipoca creme passa de 1,0 antes
//      do corte, e 40 % de um creme estourado ainda é um cinza claro, de contraste 2:1 com o
//      texto branco. O teto é 0,025 de luminância linear: o texto mais fraco da página (o
//      `light-faint`, de luminância 0,29) ainda dá 4,5:1 contra ele, então todo texto passa no
//      AA. O contraste do texto não pode depender de onde a pipoca calhou.
//   2. O que está colado na câmera se apaga na sombra. Cadeira e balde a 3 unidades do olho
//      são manchas enormes e claras, que só atrapalham.
//
// uDim.x = quanto a zona do texto vale à esquerda (desktop); uDim.y = embaixo (celular).

uniform vec2 uDim;

/** 0 fora da zona do texto, 1 no meio dela. */
float roomZone(vec4 clip) {
  vec2 ndc = clip.xy / clip.w;
  // Desktop: o texto vai até a metade da tela (ndc 0) e o pôster começa em ndc 0,24.
  float left = uDim.x * smoothstep(0.22, 0.02, ndc.x);
  // Celular: o texto ocupa a metade de baixo da tela.
  float bottom = uDim.y * smoothstep(0.15, -0.05, ndc.y);
  return max(left, bottom);
}

/** Aplica o teto de luminância à cor, na proporção da zona. */
vec3 roomCap(vec3 color, float zone) {
  return mix(color, min(color * 0.5, vec3(0.025)), zone);
}

/** 0 colado na câmera, 1 a partir de 9 unidades. */
float roomEye(vec3 worldPos) {
  return smoothstep(3.5, 9.0, length(worldPos - cameraPosition));
}
