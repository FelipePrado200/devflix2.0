// Feixe do projetor: um cone aberto, com a lente em y = 0 e a tela em y = 1.
// O cone tem escala não uniforme (comprimento em Y, raio em X e Z), então a normal vai
// para o espaço da câmera pela normalMatrix, que já é a inversa transposta.

varying vec3 vLocal;
varying vec3 vWorldPos;
varying vec3 vViewPos;
varying vec3 vViewNormal;

void main() {
  vLocal = position;
  vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;

  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vViewPos = mvPosition.xyz;
  vViewNormal = normalize(normalMatrix * normal);

  gl_Position = projectionMatrix * mvPosition;
}
