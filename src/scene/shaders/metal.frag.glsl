// Metal acetinado: a moldura de bronze escuro da caixa de cartaz e os cabos de aço.
//
// Na sala escura o metal é quase preto. Ele aparece por 3 coisas, todas vindas de luz real:
//   1. o feixe do projetor, num brilho acetinado que corre pelos chanfros das bordas;
//   2. um fio de Fresnel nas faces que fogem da câmera;
//   3. nas paredes de dentro da caixa, a luz do próprio pôster iluminado por trás.

uniform vec3 uBase;
uniform float uShininess;
uniform float uSpecular;
uniform float uOpacity;

uniform vec3 uLightPos;
uniform vec3 uLightColor;
uniform float uLight;

uniform vec3 uGlowColor;
uniform float uInnerGlow;

varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying vec3 vLocalPos;
varying vec3 vLocalNormal;

void main() {
  vec3 n = normalize(vWorldNormal);
  vec3 v = normalize(cameraPosition - vWorldPos);
  vec3 l = normalize(uLightPos - vWorldPos);

  float nl = max(dot(n, l), 0.0);
  float nh = max(dot(n, normalize(l + v)), 0.0);
  float spec = pow(nh, uShininess) * uSpecular;
  float fresnel = pow(1.0 - max(dot(n, v), 0.0), 4.0) * 0.06;

  vec3 color = uBase * (0.35 + 0.65 * nl * uLight);
  color += uLightColor * (spec * uLight + fresnel);

  // Parede de dentro: a normal aponta para o centro da caixa e é perpendicular ao vidro.
  float side = 1.0 - abs(vLocalNormal.z);
  float inward = step(0.0, -dot(vLocalNormal.xy, vLocalPos.xy)) * side;
  color += uGlowColor * uInnerGlow * inward;

  gl_FragColor = vec4(color, uOpacity);
  #include <colorspace_fragment>
}
