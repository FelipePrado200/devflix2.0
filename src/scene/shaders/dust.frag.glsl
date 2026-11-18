// Cada grão é um disco de borda macia. Sem textura: o disco sai do gl_PointCoord.

uniform vec3 uColor;
uniform float uIntensity;

varying float vAlpha;

void main() {
  float d = length(gl_PointCoord - 0.5);
  float disc = smoothstep(0.5, 0.0, d);
  disc *= disc;

  gl_FragColor = vec4(uColor, disc * vAlpha * uIntensity);
  #include <colorspace_fragment>
}
