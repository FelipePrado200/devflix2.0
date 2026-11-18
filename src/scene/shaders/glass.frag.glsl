// Vidro da caixa de cartaz. Ele só soma luz (blending aditivo): nunca escurece o pôster.
//
// O que o vidro mostra é a sala refletida, e a única coisa clara na sala é o projetor:
//   - a lente do projetor, um ponto quente que só aparece quando o reflexo aponta para ela;
//   - a luz do feixe espalhada no vidro, um retângulo de luz suave em volta desse ponto;
//   - um risco diagonal, como todo vidro tem, que desliza quando a caixa inclina;
//   - Fresnel: de frente o vidro quase some, de lado ele vira espelho.
// Com o mouse parado e o pôster de frente, quase nada disso aparece. Ao inclinar a caixa,
// o reflexo corre pelo vidro: é aqui que mora o "verniz que reflete o feixe" da especificação.

uniform vec3 uLightPos;
uniform vec3 uLightColor;
uniform float uLight;
uniform float uOpacity;

varying vec2 vUv;
varying vec3 vWorldPos;
varying vec3 vWorldNormal;

void main() {
  vec3 n = normalize(vWorldNormal);
  vec3 v = normalize(cameraPosition - vWorldPos);
  vec3 l = normalize(uLightPos - vWorldPos);
  vec3 r = reflect(-v, n);

  float facing = max(dot(n, v), 0.0);
  float fresnel = 0.04 + 0.96 * pow(1.0 - facing, 5.0);

  float rl = max(dot(r, l), 0.0);
  float lensSpot = pow(rl, 220.0) * 1.6;
  float softbox = smoothstep(0.86, 0.985, rl) * 0.22;

  float slide = (r.x + r.y) * 0.6;
  float band = vUv.x * 0.55 + vUv.y * 0.85 + slide - 0.95;
  float streak = smoothstep(0.0, 0.06, band) * (1.0 - smoothstep(0.06, 0.2, band)) * 0.05;

  float amount = (fresnel * 0.25 + lensSpot + softbox) * uLight + streak + fresnel * 0.02;

  gl_FragColor = vec4(uLightColor, clamp(amount, 0.0, 1.0) * uOpacity);
  #include <colorspace_fragment>
}
