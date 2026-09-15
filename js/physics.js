export const BACKGROUND_RATE = 0.4;

export const SOURCE_RATES = {
  alpha: 50,
  beta: 40,
  gamma: 30,
};

export const BARIUM_INITIAL_RATE = 60;
export const BARIUM_HALF_LIFE_SECONDS = 153;

export const TRANSMISSION_PER_SHEET = {
  alpha: { cardboard: 0, plastic: 0, lead: 0 },
  beta: { cardboard: 0.8, plastic: 0.35, lead: 0 },
  gamma: { cardboard: 0.99, plastic: 0.97, lead: 0.7 },
};

export const HIDDEN_RADIATION_TYPES = ["alpha", "beta", "gamma"];

export function radiationTypeOf(source, unknownRadiationType) {
  if (source === "barium") return "gamma";
  if (source === "unknown") return unknownRadiationType;
  if (source in SOURCE_RATES) return source;
  return null;
}

export function sheetTransmission(radiationType, barrierType) {
  if (!radiationType || barrierType === "none") return 1;
  return TRANSMISSION_PER_SHEET[radiationType][barrierType];
}

export function transmissionFraction(radiationType, barrierType, barrierCount) {
  if (barrierType === "none") return 1;
  return sheetTransmission(radiationType, barrierType) ** barrierCount;
}

export function bariumRate(secondsSinceSourcePrepared) {
  return BARIUM_INITIAL_RATE * 2 ** (-secondsSinceSourcePrepared / BARIUM_HALF_LIFE_SECONDS);
}

export function sourceRate({ source, unknownRadiationType, secondsSinceBariumPrepared = 0 }) {
  if (source === "barium") return bariumRate(secondsSinceBariumPrepared);
  const radiationType = radiationTypeOf(source, unknownRadiationType);
  return radiationType ? SOURCE_RATES[radiationType] : 0;
}

export function countRate(experiment) {
  const radiationType = radiationTypeOf(experiment.source, experiment.unknownRadiationType);
  const transmitted = transmissionFraction(radiationType, experiment.barrierType, experiment.barrierCount);
  return BACKGROUND_RATE + sourceRate(experiment) * transmitted;
}

const LARGE_MEAN_THRESHOLD = 30;

export function samplePoisson(mean, random = Math.random) {
  if (mean <= 0) return 0;
  if (mean >= LARGE_MEAN_THRESHOLD) return sampleNormalApproximation(mean, random);
  const limit = Math.exp(-mean);
  let count = 0;
  let product = random();
  while (product > limit) {
    count += 1;
    product *= random();
  }
  return count;
}

function sampleNormalApproximation(mean, random) {
  const standardNormal = Math.sqrt(-2 * Math.log(1 - random())) * Math.cos(2 * Math.PI * random());
  return Math.max(0, Math.round(mean + Math.sqrt(mean) * standardNormal));
}

export function pickUnknownRadiationType(random = Math.random) {
  return HIDDEN_RADIATION_TYPES[Math.floor(random() * HIDDEN_RADIATION_TYPES.length)];
}
