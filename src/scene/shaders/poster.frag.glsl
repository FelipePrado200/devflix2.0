// O pôster dentro da caixa de cartaz, iluminado por trás.
//
// Uma caixa de luz deixa a imagem mais luminosa que um papel sob refletor: os claros acendem
// e os pretos continuam pretos, porque a luz atravessa só onde há tinta clara. Por isso a
// luz de trás multiplica a cor em vez de somar. O reflexo do feixe não mora aqui: ele fica
// no vidro da frente (glass.frag.glsl).

uniform sampler2D uMap;
uniform float uHasMap;
uniform vec3 uEmpty;
uniform float uBright;
uniform float uBacklight;
uniform float uOpacity;
uniform float uLight;

varying vec2 vUv;

void main() {
  vec3 surface = uHasMap > 0.5 ? texture2D(uMap, vUv).rgb : uEmpty;

  // Iluminação de caixa de luz: um pouco mais forte no centro, como um difusor real.
  vec2 centered = vUv - 0.5;
  float diffuser = 1.0 - dot(centered, centered) * 0.35;
  vec3 color = surface * uBright * (1.0 + 0.3 * uBacklight * diffuser);

  // O pôster sob o feixe ganha um pouco mais de luz, por cima da de trás.
  color *= 1.0 + 0.1 * uLight;

  gl_FragColor = vec4(color, uOpacity);
  #include <colorspace_fragment>
}
