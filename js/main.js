import {
  BARIUM_INITIAL_RATE,
  bariumRate,
  countRate,
  pickUnknownRadiationType,
  radiationTypeOf,
  samplePoisson,
  sheetTransmission,
} from "./physics.js";
import { createApparatusScene } from "./scene.js";
import { initializeLanguage, onLanguageChange, toggleLanguage, translate } from "./i18n.js";

const VISIBLE_PARTICLES_PER_SECOND = 14;
const MAX_FRAME_SECONDS = 0.1;
const MAX_CLICKS_PER_FRAME = 3;

const elements = {
  source: document.getElementById("source"),
  barrierType: document.getElementById("barrier-type"),
  barrierCount: document.getElementById("barrier-count"),
  duration: document.getElementById("duration"),
  startCount: document.getElementById("start-count"),
  newBarium: document.getElementById("new-barium"),
  newExperiment: document.getElementById("new-experiment"),
  toggleTimer: document.getElementById("toggle-timer"),
  timer: document.getElementById("timer"),
  timerDisplay: document.getElementById("timer-display"),
  progressBar: document.getElementById("progress-bar"),
  status: document.getElementById("status"),
  sound: document.getElementById("sound"),
  bariumAge: document.getElementById("barium-age"),
  bariumAgeDisplay: document.getElementById("barium-age-display"),
  toggleLanguage: document.getElementById("toggle-language"),
};

const scene = createApparatusScene(document.getElementById("apparatus"));

const state = {
  unknownRadiationType: pickUnknownRadiationType(),
  bariumPreparedAt: performance.now(),
  activeCount: null,
  counts: 0,
  statusMessage: null,
  timer: { phase: "hidden", startedAt: 0, stoppedSeconds: 0 },
  lastFrameAt: performance.now(),
};

let audioContext = null;

function currentExperiment(now) {
  return {
    source: elements.source.value,
    unknownRadiationType: state.unknownRadiationType,
    barrierType: elements.barrierType.value,
    barrierCount: Number(elements.barrierCount.value),
    secondsSinceBariumPrepared: (now - state.bariumPreparedAt) / 1000,
  };
}

function particleTypeFor(source) {
  if (source === "none") return null;
  if (source === "unknown") return "unknown";
  return radiationTypeOf(source);
}

function visibleParticleRate(experiment) {
  if (experiment.source === "none") return 0;
  if (experiment.source === "barium") {
    return VISIBLE_PARTICLES_PER_SECOND * bariumRate(experiment.secondsSinceBariumPrepared) / BARIUM_INITIAL_RATE;
  }
  return VISIBLE_PARTICLES_PER_SECOND;
}

function emissionFor(experiment) {
  const radiationType = radiationTypeOf(experiment.source, experiment.unknownRadiationType);
  return {
    particleType: particleTypeFor(experiment.source),
    particlesPerSecond: visibleParticleRate(experiment),
    sheetTransmission: sheetTransmission(radiationType, experiment.barrierType),
  };
}

function refreshApparatus(now) {
  const experiment = currentExperiment(now);
  scene.setSource(experiment.source);
  scene.setBarriers(experiment.barrierType, experiment.barrierCount);
  scene.setEmission(emissionFor(experiment));
  elements.bariumAge.hidden = experiment.source !== "barium";
}

function refreshControlAvailability() {
  const counting = state.activeCount !== null;
  elements.source.disabled = counting;
  elements.barrierType.disabled = counting;
  elements.barrierCount.disabled = counting || elements.barrierType.value === "none";
  elements.duration.disabled = counting;
  elements.startCount.disabled = counting;
  elements.newBarium.disabled = counting;
  elements.newExperiment.disabled = counting;
}

function formatMinutesSeconds(totalSeconds, showTenths) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds - minutes * 60;
  const secondsText = showTenths ? seconds.toFixed(1).padStart(4, "0") : String(Math.floor(seconds)).padStart(2, "0");
  return `${String(minutes).padStart(2, "0")}:${secondsText}`;
}

function playClick() {
  audioContext ??= new AudioContext();
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const startTime = audioContext.currentTime;
  oscillator.type = "square";
  oscillator.frequency.value = 1800;
  gain.gain.setValueAtTime(0.2, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.015);
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start(startTime);
  oscillator.stop(startTime + 0.02);
}

const TIMER_BUTTON_LABELS = {
  hidden: "timer.show",
  running: "timer.stop",
  stopped: "timer.restart",
};

function renderTimerButton() {
  elements.toggleTimer.textContent = translate(TIMER_BUTTON_LABELS[state.timer.phase]);
}

function renderStatus() {
  const message = state.statusMessage;
  elements.status.textContent = message ? translate(message.key, message.params) : "";
}

function showStatus(key, params) {
  state.statusMessage = key ? { key, params } : null;
  renderStatus();
}

function renderLanguage(language) {
  elements.toggleLanguage.lang = language === "en" ? "ar" : "en";
  scene.setCounterLabel(translate("apparatus.counts"));
  renderTimerButton();
  renderStatus();
}

function setCounts(counts) {
  state.counts = counts;
  scene.setCounts(counts);
}

function startCount() {
  const now = performance.now();
  state.activeCount = {
    startedAt: now,
    elapsedSeconds: 0,
    durationSeconds: Number(elements.duration.value),
  };
  setCounts(0);
  showStatus("status.counting");
  refreshControlAvailability();
  if (elements.sound.checked) audioContext ??= new AudioContext();
}

function finishCount() {
  state.activeCount = null;
  showStatus("status.finished", { counts: state.counts, duration: translate(`duration.${elements.duration.value}`) });
  refreshControlAvailability();
}

function advanceCount(now) {
  const activeCount = state.activeCount;
  const elapsedSeconds = Math.min((now - activeCount.startedAt) / 1000, activeCount.durationSeconds);
  const stepSeconds = elapsedSeconds - activeCount.elapsedSeconds;
  if (stepSeconds <= 0) return;
  const midpointTime = activeCount.startedAt + (activeCount.elapsedSeconds + stepSeconds / 2) * 1000;
  const newCounts = samplePoisson(countRate(currentExperiment(midpointTime)) * stepSeconds);
  activeCount.elapsedSeconds = elapsedSeconds;
  elements.progressBar.style.width = `${(elapsedSeconds / activeCount.durationSeconds) * 100}%`;
  if (newCounts > 0) {
    setCounts(state.counts + newCounts);
    scene.flashDetector();
    if (elements.sound.checked) {
      for (let click = 0; click < Math.min(newCounts, MAX_CLICKS_PER_FRAME); click += 1) playClick();
    }
  }
  if (elapsedSeconds >= activeCount.durationSeconds) finishCount();
}

function timerSeconds(now) {
  if (state.timer.phase === "running") return (now - state.timer.startedAt) / 1000;
  return state.timer.stoppedSeconds;
}

function toggleTimer() {
  const now = performance.now();
  const timer = state.timer;
  if (timer.phase === "running") {
    timer.stoppedSeconds = timerSeconds(now);
    timer.phase = "stopped";
  } else {
    timer.startedAt = now;
    timer.phase = "running";
    elements.timer.hidden = false;
  }
  renderTimerButton();
}

function resetTimer() {
  state.timer = { phase: "hidden", startedAt: 0, stoppedSeconds: 0 };
  elements.timer.hidden = true;
  renderTimerButton();
}

function prepareNewBariumSource() {
  state.bariumPreparedAt = performance.now();
  showStatus("status.newBarium");
}

function startNewExperiment() {
  state.unknownRadiationType = pickUnknownRadiationType();
  setCounts(0);
  elements.progressBar.style.width = "0";
  showStatus(null);
  resetTimer();
  refreshApparatus(performance.now());
}

function animationFrame(now) {
  const frameSeconds = Math.min((now - state.lastFrameAt) / 1000, MAX_FRAME_SECONDS);
  state.lastFrameAt = now;
  if (state.activeCount) advanceCount(now);
  if (elements.source.value === "barium") {
    const experiment = currentExperiment(now);
    scene.setEmission(emissionFor(experiment));
    elements.bariumAgeDisplay.textContent = formatMinutesSeconds(experiment.secondsSinceBariumPrepared, false);
  }
  if (state.timer.phase !== "hidden") elements.timerDisplay.textContent = formatMinutesSeconds(timerSeconds(now), true);
  scene.step(frameSeconds);
  requestAnimationFrame(animationFrame);
}

function handleSettingsChange() {
  refreshControlAvailability();
  refreshApparatus(performance.now());
}

for (const select of [elements.source, elements.barrierType, elements.barrierCount]) {
  select.addEventListener("change", handleSettingsChange);
}
elements.startCount.addEventListener("click", startCount);
elements.newBarium.addEventListener("click", prepareNewBariumSource);
elements.newExperiment.addEventListener("click", startNewExperiment);
elements.toggleTimer.addEventListener("click", toggleTimer);
elements.toggleLanguage.addEventListener("click", toggleLanguage);

onLanguageChange(renderLanguage);
initializeLanguage();
refreshControlAvailability();
refreshApparatus(performance.now());
requestAnimationFrame(animationFrame);
