import * as THREE from "three";

/**
 * A luz da sala. O feixe do projetor é a única fonte, e 3 coisas dependem dele: o cone que
 * a gente vê, a poeira dentro do cone e o verniz dos pôsteres. O `LightRig` escreve aqui uma
 * vez por quadro, antes de todo mundo; o resto só lê.
 *
 * Objetos mutáveis e reaproveitados: nada aqui é criado por quadro.
 */

/** Cor da luz do projetor: o branco quente do token `light`, um pouco mais quente. */
export const PROJECTOR_COLOR = new THREE.Color("#f6ead6");

/** Raio da lente em relação à boca do cone. Pequeno: a luz sai de um ponto. */
export const LENS_RADIUS = 0.04;

/**
 * Aparência do feixe. Os valores daqui são os finais; o objeto é mutável só para ajuste ao
 * vivo com `?debug` na URL.
 *
 * A escala é baixa porque o compositor soma a luz em espaço linear: 0,06 linear vira quase
 * 30 % de cinza depois da codificação sRGB da tela. Luz aditiva parece bem mais forte do que
 * o número sugere.
 */
export const beamLook = {
  /** Intensidade máxima do ar iluminado. No celular o feixe ocupa mais da tela, então cai. */
  strength: { wide: 0.14, compact: 0.1 },
  /**
   * Trecho do eixo (0 = lente, 1 = pôster) em que o ar iluminado some. A luz de projetor se
   * dissolve antes da tela; se chegasse inteira, levantaria os pretos do pôster.
   */
  fade: new THREE.Vector2(0.82, 1),
  /**
   * Quanto a borda do cone some. 1,5 deixa o facho legível na diagonal; acima de 2 ele vira
   * névoa sem direção, e abaixo de 1,2 a borda do cone aparece como linha.
   */
  facingPower: 1.5,
  /**
   * Onde fica a lente em relação à câmera: fora do quadro, acima e à direita. O feixe desce
   * na diagonal pelo canto de cima, longe do texto, que fica à esquerda no desktop e embaixo
   * no celular.
   */
  lensOffset: {
    wide: new THREE.Vector3(3.6, 3.6, -2.6),
    compact: new THREE.Vector3(1.2, 4.2, -2),
  },
};

export const beamLight = {
  /** Onde a luz sai: a lente, fora do quadro, acima e à direita da câmera. */
  origin: new THREE.Vector3(0, 3, 6),
  /** Onde a luz bate agora. Anda até o filme em foco com amortecimento: é a varredura. */
  target: new THREE.Vector3(0, 0, 0),
  /** Raio da mancha de luz no ponto de chegada, em unidades do mundo. */
  radius: 1.25,
  /** Intensidade do feixe, de 0 a 1: o acendimento, a sala escura das resenhas e o painel. */
  lamp: 0,
};

/**
 * Uniforms divididos por todos os pôsteres. O three aceita o mesmo objeto de uniform em
 * vários materiais: o feixe atualiza 1 vetor, e 40 pôsteres veem a mudança.
 */
export const sharedPosterUniforms = {
  uLightPos: { value: beamLight.origin },
  uLightColor: { value: PROJECTOR_COLOR },
};

/**
 * A cor que a tela do cinema joga na sala: a cor de destaque do pôster em foco. Quem escreve
 * é o pôster em foco; as cadeiras e os baldes de pipoca leem e vão para ela com amortecimento.
 */
export const roomTint = { target: new THREE.Color("#f2af48") };

/** Ponto de foco da lente (profundidade de campo), também escrito pelo `LightRig`. */
export const lens = {
  focus: new THREE.Vector3(0, 0, 0),
};
