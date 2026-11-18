// Poeira dentro do feixe. Cada partícula nasce no espaço do cone unitário (lente em y = 0,
// raio 1 em y = 1), então ela fica dentro da luz qualquer que seja o tamanho do feixe.
// Todo o movimento é calculado aqui, pela GPU: a CPU não toca em nenhuma partícula por quadro.

attribute vec4 aSeed;

uniform float uTime;
uniform float uSize;
uniform float uPixelRatio;
uniform float uLensRadius;

varying float vAlpha;

void main() {
  // Avanço lento rumo à tela, que recomeça na lente. A troca acontece onde o brilho é zero.
  float axial = fract(aSeed.x + uTime * (0.004 + aSeed.w * 0.006));
  float t = mix(0.08, 0.96, axial);
  float radius = mix(uLensRadius, 1.0, t);

  float angle = aSeed.y * 6.2831853 + uTime * 0.05 * (aSeed.z - 0.5);
  float r = sqrt(aSeed.z) * radius * 0.92;
  vec3 p = vec3(cos(angle) * r, t, sin(angle) * r);

  // Deriva browniana: pequena, lenta e diferente em cada grão.
  p.xz += vec2(
    sin(uTime * 0.31 + aSeed.y * 40.0),
    cos(uTime * 0.27 + aSeed.x * 40.0)
  ) * 0.035 * radius;

  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  // Poeira de verdade tem grãos de tamanhos diferentes: poucos grandes, muitos pequenos.
  float size = uSize * mix(0.6, 1.6, aSeed.w * aSeed.w);
  gl_PointSize = size * uPixelRatio / max(-mvPosition.z, 0.1);

  // Mais luz perto do eixo, nada nas 2 pontas, e um brilho raro quando o grão gira para a luz.
  float core = 1.0 - smoothstep(0.55, 1.0, r / radius);
  float ends = smoothstep(0.08, 0.2, t) * (1.0 - smoothstep(0.85, 0.96, t));
  float glint = pow(0.5 + 0.5 * sin(uTime * (0.6 + aSeed.x * 1.4) + aSeed.z * 30.0), 8.0);
  vAlpha = core * ends * (0.25 + 0.75 * glint);
}
