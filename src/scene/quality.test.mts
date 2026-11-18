// Testes da regra de qualidade. Rodam com o test runner nativo do Node (npm test), que lê
// TypeScript direto: nenhuma dependência nova. A extensão .mts deixa o arquivo fora do tsc
// do Next, que não aceita import com extensão .ts.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createMonitor, FPS_BAND, judge, MAX_FLIPS, type Monitor, settle, STREAK, stepDown, stepUp } from "./quality.ts";

const LOW = FPS_BAND.decline - 10;
const HIGH = FPS_BAND.incline + 30;
const MID = (FPS_BAND.decline + FPS_BAND.incline) / 2;

function feed(m: Monitor, fps: number, times: number, contaminated = false): Monitor {
  let state = m;
  for (let i = 0; i < times; i++) state = judge(state, fps, contaminated);
  return state;
}

describe("judge", () => {
  it("desce só depois da sequência inteira de amostras ruins", () => {
    const almost = feed(createMonitor("high"), LOW, STREAK.decline - 1);
    assert.equal(almost.tier, "high");
    assert.equal(judge(almost, LOW, false).tier, "medium");
  });

  it("ignora amostras contaminadas por carga, sem zerar a sequência", () => {
    let m = feed(createMonitor("high"), LOW, STREAK.decline - 1);
    m = feed(m, 5, 10, true); // 10 engasgos de carga a 5 fps
    assert.equal(m.tier, "high");
    assert.equal(m.below, STREAK.decline - 1);
  });

  it("um aparelho rodando a 100 fps nunca desce por causa de engasgos de carga", () => {
    let m = createMonitor("high");
    for (let i = 0; i < 200; i++) m = judge(m, i % 5 === 0 ? 8 : 100, i % 5 === 0);
    assert.equal(m.tier, "high");
    assert.equal(m.flips, 0);
  });

  it("zera as 2 sequências dentro da faixa de histerese", () => {
    let m = feed(createMonitor("high"), LOW, STREAK.decline - 1);
    m = judge(m, MID, false);
    assert.deepEqual([m.below, m.above], [0, 0]);
    assert.equal(feed(m, LOW, STREAK.decline - 1).tier, "high");
  });

  it("sobe devagar: precisa do dobro de amostras boas", () => {
    const m = feed(createMonitor("medium"), HIGH, STREAK.incline - 1);
    assert.equal(m.tier, "medium");
    assert.equal(judge(m, HIGH, false).tier, "high");
  });

  it("assenta no médio depois de oscilar e não troca mais", () => {
    let m = createMonitor("high");
    for (let flip = 0; flip < MAX_FLIPS; flip++) {
      m = flip % 2 === 0 ? feed(m, LOW, STREAK.decline) : feed(m, HIGH, STREAK.incline);
    }
    assert.equal(m.settled, true);
    assert.equal(m.tier, "medium");
    assert.equal(feed(m, HIGH, 100).tier, "medium");
  });
});

describe("degraus", () => {
  it("não passa dos limites", () => {
    assert.equal(stepDown("low"), "low");
    assert.equal(stepUp("high"), "high");
  });

  it("assentar nunca sobe o nível", () => {
    assert.equal(settle("high"), "medium");
    assert.equal(settle("medium"), "medium");
    assert.equal(settle("low"), "low");
  });
});
