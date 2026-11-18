// Luzes de corredor: pequenas, âmbar e sempre acesas, como as de toda sala de cinema.
// Usam o mesmo vértice da plateia, e a mesma regra de visibilidade: apagam na zona do texto.

uniform vec3 uGlow;

varying vec3 vWorldPos;
varying vec4 vClip;

void main() {
  vec3 color = roomCap(uGlow, roomZone(vClip));
  // O que está longe se apaga no preto, como o resto da sala; o que está colado na câmera também.
  float far = 1.0 - smoothstep(38.0, 66.0, length(vWorldPos - cameraPosition));

  gl_FragColor = vec4(color * far * roomEye(vWorldPos), 1.0);
  #include <colorspace_fragment>
}
