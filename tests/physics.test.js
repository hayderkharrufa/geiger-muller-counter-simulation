import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BACKGROUND_RATE,
  BARIUM_HALF_LIFE_SECONDS,
  BARIUM_INITIAL_RATE,
  HIDDEN_RADIATION_TYPES,
  bariumRate,
  countRate,
  pickUnknownRadiationType,
  radiationTypeOf,
  samplePoisson,
  transmissionFraction,
} from "../js/physics.js";

function experiment(overrides) {
  return {
    source: "none",
    unknownRadiationType: "alpha",
    barrierType: "none",
    barrierCount: 1,
    secondsSinceBariumPrepared: 0,
    ...overrides,
  };
}

test("no source gives only background", () => {
  assert.equal(countRate(experiment({ source: "none" })), BACKGROUND_RATE);
});

test("alpha is stopped by a single cardboard sheet", () => {
  assert.equal(countRate(experiment({ source: "alpha", barrierType: "cardboard", barrierCount: 1 })), BACKGROUND_RATE);
});

test("beta passes cardboard but is stopped by lead", () => {
  assert.ok(countRate(experiment({ source: "beta", barrierType: "cardboard" })) > BACKGROUND_RATE);
  assert.equal(countRate(experiment({ source: "beta", barrierType: "lead" })), BACKGROUND_RATE);
});

test("gamma still gets through five lead sheets", () => {
  assert.ok(countRate(experiment({ source: "gamma", barrierType: "lead", barrierCount: 5 })) > BACKGROUND_RATE);
});

test("count rate falls as barriers are added", () => {
  for (const source of ["beta", "gamma", "barium"]) {
    for (const barrierType of ["cardboard", "plastic", "lead"]) {
      const rates = [1, 2, 3, 4, 5].map((barrierCount) => countRate(experiment({ source, barrierType, barrierCount })));
      for (let index = 1; index < rates.length; index += 1) {
        assert.ok(rates[index] <= rates[index - 1], `${source} through ${barrierType}`);
      }
    }
  }
});

test("barrier count is ignored when there is no barrier", () => {
  assert.equal(transmissionFraction("beta", "none", 5), 1);
});

test("unknown source behaves like its hidden radiation type", () => {
  for (const hiddenType of HIDDEN_RADIATION_TYPES) {
    const unknown = experiment({ source: "unknown", unknownRadiationType: hiddenType, barrierType: "plastic", barrierCount: 2 });
    const known = experiment({ source: hiddenType, barrierType: "plastic", barrierCount: 2 });
    assert.equal(countRate(unknown), countRate(known));
  }
});

test("Ba-137m emits gamma radiation", () => {
  assert.equal(radiationTypeOf("barium"), "gamma");
});

test("Ba-137m activity halves every half-life", () => {
  assert.equal(bariumRate(0), BARIUM_INITIAL_RATE);
  assert.ok(Math.abs(bariumRate(BARIUM_HALF_LIFE_SECONDS) - BARIUM_INITIAL_RATE / 2) < 1e-9);
  assert.ok(Math.abs(bariumRate(2 * BARIUM_HALF_LIFE_SECONDS) - BARIUM_INITIAL_RATE / 4) < 1e-9);
});

test("Poisson samples have the expected mean for small and large means", () => {
  for (const mean of [0.05, 4, 600]) {
    const trials = 20000;
    let total = 0;
    for (let trial = 0; trial < trials; trial += 1) total += samplePoisson(mean);
    const sampleMean = total / trials;
    const standardError = Math.sqrt(mean / trials);
    assert.ok(Math.abs(sampleMean - mean) < 5 * standardError, `mean ${mean} sampled as ${sampleMean}`);
  }
});

test("Poisson sampling of a zero mean returns zero", () => {
  assert.equal(samplePoisson(0), 0);
});

test("unknown radiation type is always alpha, beta or gamma", () => {
  assert.equal(pickUnknownRadiationType(() => 0), "alpha");
  assert.equal(pickUnknownRadiationType(() => 0.5), "beta");
  assert.equal(pickUnknownRadiationType(() => 0.999), "gamma");
});
