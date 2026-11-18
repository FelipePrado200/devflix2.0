// Cadeiras, baldes de pipoca e luzes de corredor: malhas instanciadas. A matriz de cada
// instância (posição e giro no corredor) entra por instanceMatrix, que o three declara sozinho
// quando a malha é um InstancedMesh. `color` também vem pronto (vertexColors), e `aAccent`
// marca onde a cor do vértice dá lugar à cor de destaque do filme em foco: as listras do balde.

attribute float aAccent;

varying vec3 vColor;
varying float vAccent;
varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying vec4 vClip;

void main() {
  vColor = color;
  vAccent = aAccent;

  mat4 im = mat4(1.0);
  #ifdef USE_INSTANCING
    im = instanceMatrix;
  #endif

  vec4 world = modelMatrix * im * vec4(position, 1.0);
  vWorldPos = world.xyz;
  // As instâncias só têm translação e giro, sem escala: mat3 da matriz mantém a normal certa.
  vWorldNormal = normalize(mat3(modelMatrix) * mat3(im) * normal);

  vClip = projectionMatrix * viewMatrix * world;
  gl_Position = vClip;
}
