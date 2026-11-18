"use client";

import { Canvas, type ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { accentHexFromRgb } from "@/lib/color";
import { proxiedImage } from "@/lib/format";
import type { Movie } from "@/lib/tmdb";
import { DAMP, FLOAT, MAX_TILT_RAD, POINTER_PARALLAX } from "@/motion/tokens";
import { ready } from "@/lib/preroll";
import { Beam } from "@/scene/Beam";
import { ambientClock } from "@/scene/clock";
import { Effects } from "@/scene/Effects";
import { beamLight, beamLook, roomTint } from "@/scene/light";
import { LightRig } from "@/scene/LightRig";
import { PerfProbe } from "@/scene/PerfProbe";
import {
  CABLE_LONG,
  CASE,
  CASE_HEIGHT,
  createCaseMaterials,
  disposeCaseMaterials,
  getCaseGeometries,
} from "@/scene/poster";
import { forCompact, initialTier, markNoise, type Tier, TIERS } from "@/scene/quality";
import { QualityGovernor } from "@/scene/QualityGovernor";
import { Sala } from "@/scene/Sala";
import { type Layout, POSTER_H, POSTER_W, type Slot, STRIP_STEP, type Xyz } from "./layout";
import { isDebug, stage, type Zone } from "./store";

const { damp, smoothstep } = THREE.MathUtils;

const GLOW_GEO = new THREE.PlaneGeometry(POSTER_W * 2.4, POSTER_H * 1.9);
const loader = new THREE.TextureLoader();
const proxied = proxiedImage;

/**
 * Ordem de cada quadro. Números menores rodam antes, e o compositor desenha com prioridade 1.
 * A câmera anda primeiro, a luz se orienta pela câmera nova, e só então os pôsteres e o
 * feixe leem a luz.
 */
const PRIORITY = { camera: -4 } as const;

/** Brilho atrás do pôster em foco: 20 % no centro, como manda o DESIGN.md. */
const GLOW_STRENGTH = 0.2;

/** Quanto a luz do pôster tinge as paredes de dentro da caixa. Pouco: é um reflexo, não uma lâmpada. */
const INNER_GLOW = 0.06;

/** Quanto do feixe os cabos de aço pegam. Eles sobem pelo escuro, fora do facho. */
const CABLE_LIGHT = 0.5;

/** Distância a partir da qual a textura grande volta a ser a pequena e sai da memória. */
const RELEASE_AHEAD = 12;
const RELEASE_BEHIND = 6;

let glowTex: THREE.Texture | null = null;
function getGlowTexture() {
  if (glowTex) return glowTex;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  // Queda longa e suave até zero: com uma rampa curta a borda do brilho aparece como um disco.
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.35, "rgba(255,255,255,0.45)");
  grad.addColorStop(0.7, "rgba(255,255,255,0.08)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  glowTex = new THREE.CanvasTexture(c);
  // Um canvas 2D desenha em sRGB. Lida como dado linear, a rampa escura fica clara demais
  // depois do compositor e corta de uma vez na borda.
  glowTex.colorSpace = THREE.SRGBColorSpace;
  return glowTex;
}

/** Cor de destaque tirada do pôster: média dos pixels, com peso para os mais saturados. */
function extractAccent(image: CanvasImageSource, out: THREE.Color) {
  try {
    const c = document.createElement("canvas");
    c.width = 16;
    c.height = 24;
    const g = c.getContext("2d", { willReadFrequently: true })!;
    g.drawImage(image, 0, 0, 16, 24);
    const d = g.getImageData(0, 0, 16, 24).data;
    let r = 0, gg = 0, b = 0, wsum = 0;
    for (let i = 0; i < d.length; i += 4) {
      const max = Math.max(d[i], d[i + 1], d[i + 2]);
      const min = Math.min(d[i], d[i + 1], d[i + 2]);
      const sat = max ? (max - min) / max : 0;
      const w = sat * sat * (max / 255) + 0.01;
      r += d[i] * w; gg += d[i + 1] * w; b += d[i + 2] * w; wsum += w;
    }
    // Normaliza em OKLCH, como manda o DESIGN.md: o matiz do filme fica, o resto entra na
    // faixa segura de contraste. Em RGB ou HSL o mesmo corte apaga ou satura a cor.
    out.set(accentHexFromRgb(r / wsum / 255, gg / wsum / 255, b / wsum / 255));
  } catch {
    /* mantém a cor padrão */
  }
}

export type Item = Slot & { movie: Movie };
type OpenFn = (id: number, zone: Zone) => void;

function Poster({ item, onOpen, canHover, compact }: { item: Item; onOpen: OpenFn; canHover: boolean; compact: boolean }) {
  const group = useRef<THREE.Group>(null!);
  const glow = useRef<THREE.MeshBasicMaterial>(null!);
  const materials = useMemo(createCaseMaterials, []);
  const geometry = getCaseGeometries();
  // Na coluna dos mais bem avaliados (desktop) as caixas ficam empilhadas: o cabo de cada uma
  // termina na caixa de cima, em vez de atravessá-la. E as caixas da coluna flutuam juntas,
  // na mesma fase, senão o cabo abre e fecha uma fresta com a caixa de cima.
  const stacked = item.zone === "top" && !compact;
  const cableLength = stacked && item.index > 0 ? STRIP_STEP - CASE_HEIGHT : CABLE_LONG;
  const floatPhase = stacked ? 0 : item.seed;
  const s = useRef({
    /** Pedidos feitos: a textura pequena e a grande. */
    small: false,
    large: false,
    smallTex: null as THREE.Texture | null,
    largeTex: null as THREE.Texture | null,
    opacity: 0,
    bright: 0.45,
    backlight: 0,
    // A cor padrão é o âmbar do projetor (token accent do DESIGN.md), até a textura chegar.
    accent: new THREE.Color("#f2af48"),
    hasAccent: false,
    alive: true,
  });
  const gl = useThree((st) => st.gl);
  const key = `${item.zone}-${item.index}`;
  const isFocused = () => stage.zone === item.zone && stage.index === item.index;

  // Filme sem pôster na abertura: não há textura para a tela de carregamento esperar.
  useEffect(() => {
    if (item.zone === "hero" && !item.movie.posterPath) ready("hero");
  }, [item.zone, item.movie.posterPath]);

  useEffect(() => {
    const st = s.current;
    st.alive = true;
    return () => {
      st.alive = false;
      st.smallTex?.dispose();
      st.largeTex?.dispose();
      disposeCaseMaterials(materials);
    };
  }, [materials]);

  const show = (tex: THREE.Texture) => {
    if (item.zone === "hero") ready("hero");
    materials.poster.uniforms.uMap.value = tex;
    materials.poster.uniforms.uHasMap.value = 1;
  };

  const prepare = (tex: THREE.Texture) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = Math.min(4, gl.capabilities.getMaxAnisotropy());
    return tex;
  };

  useFrame((state, dt) => {
    const st = s.current;
    const g = group.current;
    const cam = state.camera.position;
    const d = cam.distanceTo(g.position);
    const ahead = g.position.z < cam.z;
    const path = item.movie.posterPath;

    // Texturas sob demanda: a pequena quando o pôster entra no alcance, a grande perto da câmera.
    if (path && ahead && !st.small && d < item.far + 6) {
      st.small = true;
      loader.load(proxied(path, "w185", 256), (tex) => {
        if (!st.alive) return tex.dispose();
        markNoise(); // subir textura para a GPU engasga: esta amostra não conta
        st.smallTex = prepare(tex);
        if (!st.hasAccent) {
          extractAccent(tex.image as CanvasImageSource, st.accent);
          st.hasAccent = true;
        }
        if (!st.largeTex) show(tex);
      });
    }
    if (path && ahead && st.small && !st.large && d < item.near + 3) {
      st.large = true;
      loader.load(proxied(path, "w500", 640), (tex) => {
        // Se o pôster se afastou enquanto a imagem vinha, ela nem entra na memória da GPU.
        if (!st.alive || !st.large) return tex.dispose();
        markNoise();
        st.largeTex = prepare(tex);
        show(tex);
      });
    }
    // Ficou longe: a textura grande sai da memória da GPU e a pequena volta. Se a câmera
    // voltar, a grande é pedida de novo (o navegador já a tem em cache).
    if (st.large && (d > item.far + RELEASE_AHEAD || (!ahead && d > RELEASE_BEHIND))) {
      st.large = false;
      if (st.largeTex) {
        if (st.smallTex) show(st.smallTex);
        st.largeTex.dispose();
        st.largeTex = null;
      }
    }

    const focused = isFocused();
    const opened = stage.openId === item.movie.id && focused;
    const m = materials;
    // Some com a distância, e também quando a câmera passa perto. A caixa que fica para trás
    // some antes de chegar a 60 % da distância de parada: mais perto que isso ela cobre meia
    // tela durante a viagem, e a borda dela aparece como uma linha vertical dura.
    const stopDist = item.near - 2;
    let vis = ahead ? (1 - smoothstep(d, item.near, item.far)) * smoothstep(d, stopDist * 0.6, stopDist * 0.95) : 0;
    // Cena 1 é só a projeção: o corredor aparece quando a tela do cinema apaga. Sem isto,
    // uma caixa do corredor fica atrás do título da abertura e atrapalha a leitura.
    if (item.zone !== "hero") vis *= 1 - stage.screen;
    // Com um filme aberto, as outras caixas saem de cena.
    if (stage.openId !== null && !opened) vis *= 1 - stage.pull;
    st.opacity = damp(st.opacity, vis, DAMP.poster, dt);
    g.visible = st.opacity > 0.01;
    if (!g.visible) return;
    m.poster.uniforms.uOpacity.value = st.opacity;
    m.frame.uniforms.uOpacity.value = st.opacity;
    m.glass.uniforms.uOpacity.value = st.opacity;
    m.cables.uniforms.uOpacity.value = st.opacity;

    // A caixa em foco acende por inteiro; as outras ficam com a luz de trás baixa.
    st.bright = damp(st.bright, focused ? 1 : 0.45, DAMP.focus, dt);
    st.backlight = damp(st.backlight, focused ? 1 : 0.35, DAMP.focus, dt);
    m.poster.uniforms.uBright.value = st.bright;
    m.poster.uniforms.uBacklight.value = st.backlight;
    // A luz do pôster tinge as paredes de dentro da caixa, na cor do próprio filme.
    m.frame.uniforms.uGlowColor.value.copy(st.accent);
    m.frame.uniforms.uInnerGlow.value = st.backlight * INNER_GLOW;

    // Quanto do feixe cai nesta caixa: pleno no ponto onde ele bate, nada a 2,6 unidades.
    // Enquanto o feixe varre a sala, o chanfro e o vidro de cada caixa pelo caminho pegam a luz.
    const beamDistance = g.position.distanceTo(beamLight.target);
    const light = beamLight.lamp * (1 - smoothstep(beamDistance, 0.6, 2.6));
    m.poster.uniforms.uLight.value = light;
    m.frame.uniforms.uLight.value = light;
    m.glass.uniforms.uLight.value = light;
    m.cables.uniforms.uLight.value = beamLight.lamp * CABLE_LIGHT;

    glow.current.opacity = damp(glow.current.opacity, focused && item.lead && st.hasAccent ? GLOW_STRENGTH * vis : 0, DAMP.light, dt);
    glow.current.color.copy(st.accent);

    const tilt = focused && canHover && stage.openId === null ? 1 : 0;
    g.rotation.x = damp(g.rotation.x, -state.pointer.y * MAX_TILT_RAD * tilt, DAMP.tilt, dt);
    g.rotation.y = damp(g.rotation.y, item.rotY * (1 - tilt * 0.5) + state.pointer.x * MAX_TILT_RAD * tilt, DAMP.tilt, dt);
    g.position.y = item.pos.y + Math.sin(ambientClock.time * FLOAT.speed + floatPhase) * FLOAT.amplitude;

    // O pôster do filme aberto vem para a frente, no eixo da câmera.
    const pull = opened ? stage.pull : 0;
    g.position.x = item.pos.x + (cam.x - item.pos.x) * pull;
    g.position.y += (cam.y - g.position.y) * pull;
    g.position.z = item.pos.z + (cam.z - 2.2 - item.pos.z) * pull;
    if (pull > 0.001) {
      g.rotation.x *= 1 - pull;
      g.rotation.y *= 1 - pull;
      glow.current.opacity *= 1 - pull;
    }

    // A cor de destaque da página segue o pôster em foco.
    if (focused && item.lead && st.hasAccent && stage.accentKey !== key) {
      stage.accentKey = key;
      roomTint.target.copy(st.accent);
      document.documentElement.style.setProperty("--accent", `#${st.accent.getHexString()}`);
    }
  });

  const fromHtml = (e: ThreeEvent<MouseEvent | PointerEvent>) =>
    Boolean((e.nativeEvent.target as Element | null)?.closest?.("a,button,dialog,header"));

  // Os eventos ficam no grupo: tanto o pôster quanto a moldura respondem ao clique. O vidro,
  // os cabos e o brilho não entram no raio, então não roubam o clique de ninguém.
  return (
    <group
      ref={group}
      position={[item.pos.x, item.pos.y, item.pos.z]}
      rotation={[0, item.rotY, 0]}
      onClick={(e) => {
        if (fromHtml(e) || !isFocused()) return;
        e.stopPropagation();
        onOpen(item.movie.id, item.zone);
      }}
      onPointerOver={(e) => {
        if (!fromHtml(e) && isFocused()) document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "";
      }}
    >
      <mesh geometry={GLOW_GEO} position={[0, 0, -CASE.depth / 2 - 0.03]} raycast={() => null}>
        <meshBasicMaterial ref={glow} map={getGlowTexture()} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
      <mesh
        geometry={geometry.cables}
        material={materials.cables}
        position={[0, CASE_HEIGHT / 2, 0]}
        scale={[1, cableLength, 1]}
        raycast={() => null}
      />
      <mesh geometry={geometry.poster} material={materials.poster} />
      <mesh geometry={geometry.frame} material={materials.frame} renderOrder={1} />
      <mesh geometry={geometry.glass} material={materials.glass} renderOrder={2} raycast={() => null} />
    </group>
  );
}

/** A tela do cinema: o fundo do filme em destaque, que apaga quando a câmera avança. */
function Screen({ path, compact }: { path: string | null; compact: boolean }) {
  const mat = useRef<THREE.MeshBasicMaterial>(null!);
  useEffect(() => {
    if (!path) {
      ready("screen");
      return;
    }
    let alive = true;
    const m = mat.current;
    loader.load(proxied(path, "w1280", compact ? 750 : 1200), (tex) => {
      if (!alive) return tex.dispose();
      markNoise();
      ready("screen");
      tex.colorSpace = THREE.SRGBColorSpace;
      m.map = tex;
      m.needsUpdate = true;
    });
    return () => {
      alive = false;
      m.map?.dispose();
    };
  }, [path, compact]);

  useFrame((_, dt) => {
    const target = mat.current.map ? 0.35 * stage.screen : 0;
    mat.current.opacity = damp(mat.current.opacity, target, DAMP.light, dt);
  });

  return (
    <mesh position={[0, 0, -10]} renderOrder={-1} raycast={() => null}>
      <planeGeometry args={[25, 25 * (9 / 16)]} />
      <meshBasicMaterial ref={mat} transparent opacity={0} depthTest={false} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

/** A câmera segue o alvo que o ScrollTrigger escreve, com uma suavização curta. */
function Rig({ canHover }: { canHover: boolean }) {
  const camera = useThree((st) => st.camera);
  useEffect(() => {
    camera.position.set(stage.cam.x, stage.cam.y, stage.cam.z);
  }, [camera]);
  useFrame((state, dt) => {
    const p = canHover ? POINTER_PARALLAX : 0;
    camera.position.x = damp(camera.position.x, stage.cam.x + state.pointer.x * p, DAMP.camera, dt);
    camera.position.y = damp(camera.position.y, stage.cam.y + state.pointer.y * p, DAMP.camera, dt);
    camera.position.z = damp(camera.position.z, stage.cam.z, DAMP.camera, dt);
  }, PRIORITY.camera);
  return null;
}

/**
 * Compila todos os shaders da cena, inclusive os do feixe e da poeira, que ainda estão
 * apagados. Sem isto, o primeiro quadro com o feixe aceso compilaria 2 programas no meio do
 * acendimento e a luz engasgaria. É o marco `scene` da tela de carregamento.
 */
function Precompile() {
  const gl = useThree((st) => st.gl);
  const scene = useThree((st) => st.scene);
  const camera = useThree((st) => st.camera);
  useEffect(() => {
    let alive = true;
    gl.compileAsync(scene, camera)
      .catch(() => {})
      .finally(() => {
        if (alive) ready("scene");
      });
    return () => {
      alive = false;
    };
  }, [gl, scene, camera]);
  return null;
}

/** Os testes de navegador mudam `stage.fx` ou `stage.debugTier` e disparam este evento. */
export const FX_EVENT = "devflix:fx";

type Props = {
  layout: Layout;
  /** Cada pôster da cena: a posição e o filme dele. */
  items: Item[];
  backdropPath: string | null;
  running: boolean;
  onOpen: OpenFn;
  onFail: () => void;
};

export default function Scene({ layout, items, backdropPath, running, onOpen, onFail }: Props) {
  const compact = layout.compact;
  const [tier, setTier] = useState<Tier>(() => initialTier(compact));
  const [, setFxVersion] = useState(0);
  const [tabVisible, setTabVisible] = useState(true);
  const canHover = useMemo(() => window.matchMedia("(hover: hover) and (pointer: fine)").matches, []);

  // A aba some: o render para. O rAF já desacelera numa aba oculta, mas não para de vez.
  useEffect(() => {
    const onVisibility = () => setTabVisible(document.visibilityState === "visible");
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    const onFx = () => setFxVersion((v) => v + 1);
    window.addEventListener(FX_EVENT, onFx);
    return () => window.removeEventListener(FX_EVENT, onFx);
  }, []);

  // O ponto de cada parada para onde a luz e a lente apontam: o pôster principal dela. Nos
  // gêneros é o centro da fileira, porque mirar a primeira caixa faria o feixe cruzar o
  // título da cena, que fica em cima e à esquerda.
  const focusOf = useMemo(() => {
    const map = new Map<string, Xyz>();
    const rows = new Map<string, Xyz[]>();
    for (const it of items) {
      const key = `${it.zone}-${it.index}`;
      if (it.zone === "genero") rows.set(key, [...(rows.get(key) ?? []), it.pos]);
      else if (it.lead) map.set(key, it.pos);
    }
    for (const [key, row] of rows) {
      const n = row.length;
      map.set(key, {
        x: row.reduce((t, p) => t + p.x, 0) / n,
        y: row.reduce((t, p) => t + p.y, 0) / n,
        z: row.reduce((t, p) => t + p.z, 0) / n,
      });
    }
    return map;
  }, [items]);

  // A plateia ocupa a sala inteira: da abertura até depois do último filme.
  const room = useMemo(
    () => ({
      zStart: layout.hero.pos.z + 4,
      zEnd: Math.min(...items.map((it) => it.pos.z)) - 12,
    }),
    [layout, items],
  );

  const locked = stage.debugTier !== null;
  const active: Tier = stage.debugTier ?? tier;
  const settings = forCompact(TIERS[active], compact);
  const dpr = Math.min(window.devicePixelRatio || 1, settings.dpr);

  return (
    <Canvas
      flat
      dpr={dpr}
      frameloop={running && tabVisible ? "always" : "never"}
      camera={{ fov: layout.fov, near: 0.1, far: 80, position: [0, 0, 6] }}
      // Sem antisserrilhado no canvas: com o compositor ligado ele seria memória jogada fora.
      // O compositor faz o próprio (msaa) nos níveis alto e médio.
      gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
      eventSource={document.body}
      eventPrefix="client"
      style={{ pointerEvents: "none" }}
      onCreated={({ gl, scene, camera }) => {
        gl.domElement.addEventListener("webglcontextlost", onFail, { once: true });
        if (isDebug()) (window as unknown as { __three: unknown }).__three = { scene, camera, THREE, beamLook };
      }}
    >
      {/*
        Mede os quadros e troca de nível: abaixo de 45 fps por 2 s desce, acima de 58 por 4 s
        sobe, e entre os 2 nada muda (histerese). Engasgo de carga não conta. Depois de 3
        trocas o aparelho assenta. A regra inteira está em `judge`, em quality.ts.
      */}
      <QualityGovernor tier={tier} locked={locked} onTier={setTier} />
      <Rig canHover={canHover} />
      <Precompile />
      <PerfProbe tier={active} />
      <LightRig focusOf={focusOf} compact={compact} />
      <Screen path={backdropPath} compact={compact} />
      {items.map((it) => (
        <Poster key={`${it.zone}-${it.index}-${it.movie.id}-${it.pos.x}`} item={it} onOpen={onOpen} canHover={canHover} compact={compact} />
      ))}
      <Sala zStart={room.zStart} zEnd={room.zEnd} compact={compact} sparse={active === "low"} />
      <Beam compact={compact} dust={settings.dust} />
      <Effects settings={settings} dof={settings.dof && stage.fx.dof} film={settings.film && stage.fx.film} />
    </Canvas>
  );
}
