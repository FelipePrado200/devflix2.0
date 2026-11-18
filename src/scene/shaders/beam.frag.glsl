// Luz volumétrica falsa. Não há raymarching: o volume é sugerido por 3 termos baratos.
//   1. De frente: olhar pelo meio do cone atravessa mais ar iluminado que olhar pela borda.
//   2. Ao longo do eixo: entrada suave na lente, perda de energia até a tela.
//   3. Fumaça: ruído lento que sobe e anda junto com a luz.
// O resultado é somado à cena (blending aditivo), então ele só clareia, nunca escurece.

uniform float uTime;
uniform float uIntensity;
uniform vec3 uColor;
uniform vec2 uFade;
uniform float uFacingPower;

varying vec3 vLocal;
varying vec3 vWorldPos;
varying vec3 vViewPos;
varying vec3 vViewNormal;

void main() {
  float t = clamp(vLocal.y, 0.0, 1.0);

  vec3 viewDir = normalize(-vViewPos);
  // Expoente alto: a borda do cone some antes de virar uma linha visível.
  float facing = pow(abs(dot(normalize(vViewNormal), viewDir)), uFacingPower);

  // O ar iluminado some antes de chegar ao pôster. Sem isto, o cone fica entre a câmera e a
  // imagem e levanta os pretos dela: o pôster parece lavado.
  float axial = smoothstep(0.0, 0.12, t) * mix(1.0, 0.5, t) * (1.0 - smoothstep(uFade.x, uFade.y, t));

  float haze = fbm(vWorldPos * 0.85 + vec3(0.0, -uTime * 0.07, uTime * 0.04));
  float smoke = mix(0.55, 1.25, haze);

  float alpha = facing * axial * smoke * uIntensity;

  // Degradê fraco sobre preto vira faixa visível em 8 bits. Meio passo de ruído por pixel
  // quebra a faixa. No nível baixo não existe grão de filme para esconder isso.
  alpha += (hash13(vec3(gl_FragCoord.xy, 0.0)) - 0.5) / 255.0;

  gl_FragColor = vec4(uColor, clamp(alpha, 0.0, 1.0));
  #include <colorspace_fragment>
}
