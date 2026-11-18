"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { DAMP } from "@/motion/tokens";
import { beamLight, lens, roomTint, sharedPosterUniforms } from "./light";
import { getAisleLightGeometry, getBucketGeometry, getSeatGeometry } from "./seat";
import glowFrag from "./shaders/glow.frag.glsl";
import roomFrag from "./shaders/room.frag.glsl";
import roomFx from "./shaders/roomfx.glsl";
import roomVert from "./shaders/room.vert.glsl";

/** Chão da sala. A câmera fica em y ≈ 0, a uns 1,25 m de altura: o chão está 3 unidades abaixo. */
const FLOOR = -3.1;

/** Distância entre 2 cadeiras da mesma fileira, de centro a centro (cadeira: 1,6 de largura). */
const PITCH = 1.95;

/** Meia largura do corredor, do centro até a borda de dentro das cadeiras. */
const AISLE = { wide: 2.8, compact: 1.2 };

/**
 * Quanto as cadeiras giram em direção à frente (-Z), em radianos. Elas olham para o corredor,
 * onde os pôsteres estão, mas um pouco viradas para onde a câmera vai: assim a câmera vê a
 * frente da cadeira e o balde sobre o assento, em vez do perfil.
 */
const FACE_FORWARD = 0.35;

/** Fração das cadeiras com um balde de pipoca. */
const BUCKET_SHARE = 0.4;

/** Cor das luzes de corredor. Acima de 1: o compositor soma, e o desfoque as espalha em bokeh. */
const AISLE_LIGHT = new THREE.Color("#ff9a2e").multiplyScalar(1.1);

/** Onde o texto em HTML passa por cima da cena: o desktop à esquerda, o celular embaixo. */
const DIM = { wide: new THREE.Vector2(1, 0), compact: new THREE.Vector2(0, 1) };

function hash(a: number, b: number) {
  const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

type Props = {
  /** Onde a plateia começa e termina, em Z. O começo é maior que o fim: a câmera anda para -Z. */
  zStart: number;
  zEnd: number;
  compact: boolean;
  /** No nível baixo de qualidade, 1 fileira em cada 2. */
  sparse: boolean;
};

/**
 * A plateia: cadeiras de cinema dos 2 lados do corredor, viradas para o centro, onde os
 * pôsteres ficam, com baldes de pipoca sobre alguns assentos e as luzes de corredor no chão.
 *
 * Custa 3 draw calls, qualquer que seja o tamanho da sala: 1 malha instanciada para as
 * cadeiras, 1 para os baldes e 1 para as luzes. As posições são calculadas 1 vez; por quadro
 * só mudam 3 uniforms.
 */
export function Sala({ zStart, zEnd, compact, sparse }: Props) {
  const seats = useRef<THREE.InstancedMesh>(null!);
  const buckets = useRef<THREE.InstancedMesh>(null!);
  const lights = useRef<THREE.InstancedMesh>(null!);

  const layout = useMemo(() => {
    const aisle = compact ? AISLE.compact : AISLE.wide;
    const step = sparse ? PITCH * 2 : PITCH;
    const seatMatrices: THREE.Matrix4[] = [];
    const bucketMatrices: THREE.Matrix4[] = [];
    const lightMatrices: THREE.Matrix4[] = [];

    const o = new THREE.Object3D();
    let row = 0;
    for (let z = zStart; z > zEnd; z -= step, row++) {
      for (const side of [-1, 1]) {
        // Esquerda (-1) olha para +X, direita (+1) olha para -X; as 2 viradas um pouco para -Z.
        const yaw = side * (Math.PI / 2 - FACE_FORWARD);
        o.position.set(side * (aisle + 0.9), FLOOR, z + (hash(row, side) - 0.5) * 0.18);
        o.rotation.set(0, yaw, 0);
        o.updateMatrix();
        seatMatrices.push(o.matrix.clone());

        if (hash(row + 17, side * 3) < BUCKET_SHARE) {
          // O balde gira um pouco sobre o assento: nenhuma listra repete na mesma posição.
          o.rotateY((hash(row, side + 9) - 0.5) * 1.6);
          o.updateMatrix();
          bucketMatrices.push(o.matrix.clone());
        }
      }
      for (const side of [-1, 1]) {
        o.position.set(side * (aisle - 0.05), FLOOR + 0.03, z);
        o.rotation.set(0, 0, 0);
        o.updateMatrix();
        lightMatrices.push(o.matrix.clone());
      }
    }
    return { seatMatrices, bucketMatrices, lightMatrices };
  }, [zStart, zEnd, compact, sparse]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: roomVert,
        fragmentShader: `${roomFx}
${roomFrag}`,
        vertexColors: true,
        uniforms: {
          uDim: { value: new THREE.Vector2() },
          uBeamTarget: { value: beamLight.target },
          uFocus: { value: lens.focus },
          uAccent: { value: new THREE.Color("#f2af48") },
          uLamp: { value: 0 },
          ...sharedPosterUniforms,
        },
      }),
    [],
  );
  const lightMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: roomVert,
        fragmentShader: `${roomFx}
${glowFrag}`,
        vertexColors: true,
        uniforms: { uDim: { value: new THREE.Vector2() }, uGlow: { value: AISLE_LIGHT } },
      }),
    [],
  );

  // A zona do texto depende do layout: o desktop escurece à esquerda, o celular embaixo.
  useEffect(() => {
    const dim = compact ? DIM.compact : DIM.wide;
    material.uniforms.uDim.value.copy(dim);
    lightMaterial.uniforms.uDim.value.copy(dim);
  }, [compact, material, lightMaterial]);

  // As posições não mudam: gravadas 1 vez, e a malha só é regravada se a sala mudar de tamanho.
  useEffect(() => {
    const write = (mesh: THREE.InstancedMesh, matrices: THREE.Matrix4[]) => {
      matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
      mesh.count = matrices.length;
      mesh.instanceMatrix.needsUpdate = true;
    };
    write(seats.current, layout.seatMatrices);
    write(buckets.current, layout.bucketMatrices);
    write(lights.current, layout.lightMatrices);
  }, [layout]);

  useEffect(
    () => () => {
      material.dispose();
      lightMaterial.dispose();
    },
    [material, lightMaterial],
  );

  useFrame((_, dt) => {
    const u = material.uniforms;
    u.uLamp.value = beamLight.lamp;
    // A sala vai para a cor do filme em foco com o mesmo amortecimento da luz.
    (u.uAccent.value as THREE.Color).lerp(roomTint.target, 1 - Math.exp(-DAMP.light * dt));
  });

  // Capacidade fixa no máximo: a quantidade real é `count`, ajustada acima.
  const seatCap = layout.seatMatrices.length;
  const bucketCap = Math.max(1, layout.bucketMatrices.length);
  const lightCap = layout.lightMatrices.length;

  return (
    <group>
      <instancedMesh
        key={`s${seatCap}`}
        ref={seats}
        args={[getSeatGeometry(), material, seatCap]}
        frustumCulled={false}
        raycast={() => null}
      />
      <instancedMesh
        key={`b${bucketCap}`}
        ref={buckets}
        args={[getBucketGeometry(), material, bucketCap]}
        frustumCulled={false}
        raycast={() => null}
      />
      <instancedMesh
        key={`l${lightCap}`}
        ref={lights}
        args={[getAisleLightGeometry(), lightMaterial, lightCap]}
        frustumCulled={false}
        raycast={() => null}
      />
    </group>
  );
}
