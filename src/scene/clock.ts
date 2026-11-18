/**
 * Relógio da animação ambiente: poeira, fumaça do feixe, grão e flutuação dos pôsteres.
 *
 * Ele anda só enquanto `stage.ambient` está ligado. Quando a pessoa pausa, tudo que lê este
 * relógio congela no lugar, sem pular nem voltar ao início ao retomar. A câmera e o feixe
 * não leem daqui: eles respondem à rolagem, que é um gesto da própria pessoa.
 */
export const ambientClock = { time: 0 };
