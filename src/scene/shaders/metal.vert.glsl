// Metal da caixa de cartaz e dos cabos. A posição e a normal locais vão junto, para o
// fragmento reconhecer as paredes de dentro da caixa (normal apontando para o centro).

varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying vec3 vLocalPos;
varying vec3 vLocalNormal;

void main() {
  vLocalPos = position;
  vLocalNormal = normal;

  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorldPos = world.xyz;
  // A moldura não tem escala; o cabo só tem escala no comprimento (Y), e a normal dele é
  // radial, em X e Z. Nos 2 casos mat3(modelMatrix) mantém a direção da normal.
  vWorldNormal = normalize(mat3(modelMatrix) * normal);

  gl_Position = projectionMatrix * viewMatrix * world;
}
