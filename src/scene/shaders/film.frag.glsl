// Grão de filme e vinheta num passe só de pós-processamento.
//
// O grão troca de padrão a 24 quadros por segundo (uFrame), qualquer que seja a taxa da tela.
// Ele multiplica a cor em vez de somar: preto vezes qualquer coisa continua preto, então o
// fundo da sala nunca fica cinza. A vinheta também multiplica, e só pega o que tem luz.
//
// resolution e aspect são uniforms que o postprocessing já entrega a todo efeito.

uniform float uFrame;
uniform float uGrain;
uniform float uVignette;

float filmHash(vec3 p3) {
  p3 = fract(p3 * 0.1031);
  p3 += dot(p3, p3.zyx + 31.32);
  return fract((p3.x + p3.y) * p3.z);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 color = inputColor.rgb;

  vec2 centered = (uv - 0.5) * vec2(aspect, 1.0);
  float falloff = smoothstep(0.9, 0.3, length(centered));
  color *= mix(1.0 - uVignette, 1.0, falloff);

  // Célula de 1,5 pixel: grão fino, do tamanho de um grão de prata, não de um pixel.
  vec2 cell = floor(uv * resolution / 1.5);
  float n = filmHash(vec3(cell, uFrame)) - 0.5;
  float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
  color *= 1.0 + n * uGrain * (1.0 - 0.5 * luma);

  outputColor = vec4(color, inputColor.a);
}
