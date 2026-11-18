// A plateia, na sala escura. Só há 3 fontes de luz, todas vindas do filme:
//   1. o feixe do projetor, que acende as cadeiras perto de onde ele bate (key);
//   2. a luz da própria tela, na cor do pôster em foco, que bate nas faces voltadas para ele (fill);
//   3. um fio de luz nas bordas que fogem da câmera (rim), o que desenha a silhueta no preto.
// Sem isso uma cadeira de veludo escuro some no fundo preto.

uniform vec3 uLightPos;
uniform vec3 uLightColor;
uniform vec3 uBeamTarget;
uniform vec3 uFocus;
uniform vec3 uAccent;
uniform float uLamp;

varying vec3 vColor;
varying float vAccent;
varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying vec4 vClip;

void main() {
  vec3 n = normalize(vWorldNormal);
  vec3 v = normalize(cameraPosition - vWorldPos);
  vec3 base = mix(vColor, uAccent, vAccent);

  // 1. Feixe: forte perto do ponto onde bate, nada a 9 unidades.
  vec3 l = normalize(uLightPos - vWorldPos);
  float near = 1.0 - smoothstep(1.5, 9.0, distance(vWorldPos, uBeamTarget));
  float key = max(dot(n, l), 0.0) * near * uLamp;

  // 2. A luz da tela: o filme em foco ilumina o que está de frente para ele.
  vec3 toScreen = normalize(uFocus - vWorldPos);
  float fillReach = 1.0 - smoothstep(2.0, 18.0, distance(vWorldPos, uFocus));
  float fill = max(dot(n, toScreen), 0.0) * fillReach;

  // 3. Borda.
  float rim = pow(1.0 - max(dot(n, v), 0.0), 3.0);

  vec3 color = base * (0.2 + 1.1 * key + 0.8 * fill * (0.4 + 0.6 * uLamp));
  color += uAccent * rim * 0.1 * (0.35 + 0.65 * near);
  color += uLightColor * key * 0.05;

  // Na zona do texto a luminância tem teto (ver roomfx.glsl): o texto em HTML passa por cima.
  color = roomCap(color, roomZone(vClip));

  // O fundo da sala é preto: o que está longe se apaga no preto, e não numa cor. O que está
  // colado na câmera também.
  color *= (1.0 - smoothstep(38.0, 66.0, length(vWorldPos - cameraPosition))) * roomEye(vWorldPos);

  gl_FragColor = vec4(color, 1.0);
  #include <colorspace_fragment>
}
