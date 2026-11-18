// Pôster com corpo: uma placa fina, de cantos arredondados, extrudada no eixo Z.
// A coordenada de textura sai da posição, não do atributo uv, porque a extrusão gera uv
// em unidades do mundo nas tampas. A frente é a face com normal +Z.

uniform vec2 uSize;

varying vec2 vUv;
varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying float vFront;

void main() {
  vUv = position.xy / uSize + 0.5;
  vFront = step(0.5, normal.z);

  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorldPos = world.xyz;
  // O pôster nunca recebe escala, então mat3(modelMatrix) basta para a normal.
  vWorldNormal = normalize(mat3(modelMatrix) * normal);

  gl_Position = projectionMatrix * viewMatrix * world;
}
