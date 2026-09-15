const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

const LAYOUT = {
  benchY: 372,
  beamX: 120,
  beamHalfWidth: 20,
  sourceEmissionY: 352,
  lowestSheetBottomY: 338,
  sheetHeight: 7,
  sheetSpacing: 11,
  sheetWidth: 104,
  tubeTopY: 64,
  tubeWindowY: 262,
  tubeWidth: 40,
  counterX: 226,
  counterY: 290,
  counterWidth: 122,
  counterHeight: 82,
};

const PARTICLE_SPEED = 130;
const ABSORBED_FADE_SECONDS = 0.4;
const DETECTOR_FLASH_MILLISECONDS = 70;

const PARTICLE_RADIUS = {
  alpha: 3.4,
  beta: 2.4,
  gamma: 2,
  unknown: 2.6,
};

function createSvgElement(tag, attributes, parent) {
  const element = document.createElementNS(SVG_NAMESPACE, tag);
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
  parent.appendChild(element);
  return element;
}

function sheetBottomY(sheetIndex) {
  return LAYOUT.lowestSheetBottomY - sheetIndex * LAYOUT.sheetSpacing;
}

function drawBench(svg) {
  createSvgElement("line", { class: "bench", x1: 8, y1: LAYOUT.benchY, x2: 352, y2: LAYOUT.benchY }, svg);
}

function drawStand(svg) {
  const stand = createSvgElement("g", { class: "stand" }, svg);
  createSvgElement("rect", { x: 22, y: LAYOUT.benchY - 6, width: 36, height: 6, rx: 2 }, stand);
  createSvgElement("rect", { x: 37, y: 40, width: 6, height: LAYOUT.benchY - 46 }, stand);
  createSvgElement("rect", { x: 37, y: 120, width: LAYOUT.beamX - 37, height: 6 }, stand);
  createSvgElement("rect", { x: LAYOUT.beamX - LAYOUT.tubeWidth / 2 - 4, y: 114, width: LAYOUT.tubeWidth + 8, height: 18, rx: 3 }, stand);
}

function drawSource(svg) {
  const source = createSvgElement("g", { class: "source source--none" }, svg);
  createSvgElement("rect", { class: "source-body", x: LAYOUT.beamX - 28, y: LAYOUT.benchY - 16, width: 56, height: 16, rx: 3 }, source);
  createSvgElement("ellipse", { class: "source-top", cx: LAYOUT.beamX, cy: LAYOUT.benchY - 16, rx: 28, ry: 6 }, source);
  return source;
}

function drawTube(svg) {
  const tube = createSvgElement("g", { class: "tube" }, svg);
  const left = LAYOUT.beamX - LAYOUT.tubeWidth / 2;
  createSvgElement("rect", { class: "tube-cap", x: LAYOUT.beamX - 9, y: LAYOUT.tubeTopY - 10, width: 18, height: 12, rx: 2 }, tube);
  createSvgElement("rect", { class: "tube-body", x: left, y: LAYOUT.tubeTopY, width: LAYOUT.tubeWidth, height: LAYOUT.tubeWindowY - LAYOUT.tubeTopY, rx: 6 }, tube);
  return createSvgElement("rect", { class: "tube-window", x: left + 3, y: LAYOUT.tubeWindowY - 4, width: LAYOUT.tubeWidth - 6, height: 4, rx: 1 }, tube);
}

function drawCable(svg) {
  const counterInputX = LAYOUT.counterX + LAYOUT.counterWidth / 2;
  const path = `M ${LAYOUT.beamX} ${LAYOUT.tubeTopY - 10} C ${LAYOUT.beamX} -10, ${counterInputX} 0, ${counterInputX} ${LAYOUT.counterY}`;
  createSvgElement("path", { class: "cable", d: path }, svg);
}

function drawCounter(svg) {
  const counter = createSvgElement("g", { class: "counter" }, svg);
  createSvgElement("rect", { class: "counter-body", x: LAYOUT.counterX, y: LAYOUT.counterY, width: LAYOUT.counterWidth, height: LAYOUT.counterHeight, rx: 6 }, counter);
  createSvgElement("rect", { class: "counter-display", x: LAYOUT.counterX + 10, y: LAYOUT.counterY + 12, width: LAYOUT.counterWidth - 20, height: 36, rx: 3 }, counter);
  const countsText = createSvgElement("text", { class: "counter-digits", x: LAYOUT.counterX + LAYOUT.counterWidth - 18, y: LAYOUT.counterY + 39, "text-anchor": "end" }, counter);
  countsText.textContent = "0";
  const label = createSvgElement("text", { class: "counter-label", x: LAYOUT.counterX + LAYOUT.counterWidth / 2, y: LAYOUT.counterY + 68, "text-anchor": "middle" }, counter);
  label.textContent = "COUNTS";
  return { countsText, label };
}

export function createApparatusScene(svg) {
  drawBench(svg);
  drawStand(svg);
  const sourceGroup = drawSource(svg);
  const barrierGroup = createSvgElement("g", { class: "barriers" }, svg);
  const particleGroup = createSvgElement("g", { class: "particles" }, svg);
  drawCable(svg);
  const tubeWindow = drawTube(svg);
  const counter = drawCounter(svg);

  let particles = [];
  let pendingEmissions = 0;
  let emission = { particleType: null, particlesPerSecond: 0, sheetTransmission: 1 };
  let barrierCount = 0;
  let flashTimeout = null;

  function setSource(sourceAppearance) {
    sourceGroup.setAttribute("class", `source source--${sourceAppearance}`);
  }

  function setBarriers(barrierType, count) {
    barrierGroup.replaceChildren();
    barrierCount = barrierType === "none" ? 0 : count;
    for (let sheetIndex = 0; sheetIndex < barrierCount; sheetIndex += 1) {
      createSvgElement("rect", {
        class: `barrier barrier--${barrierType}`,
        x: LAYOUT.beamX - LAYOUT.sheetWidth / 2,
        y: sheetBottomY(sheetIndex) - LAYOUT.sheetHeight,
        width: LAYOUT.sheetWidth,
        height: LAYOUT.sheetHeight,
        rx: 1,
      }, barrierGroup);
    }
  }

  function setEmission(nextEmission) {
    emission = nextEmission;
  }

  function setCounts(counts) {
    counter.countsText.textContent = String(counts);
  }

  function setCounterLabel(text) {
    counter.label.textContent = text;
  }

  function flashDetector() {
    tubeWindow.classList.add("tube-window--flash");
    clearTimeout(flashTimeout);
    flashTimeout = setTimeout(() => tubeWindow.classList.remove("tube-window--flash"), DETECTOR_FLASH_MILLISECONDS);
  }

  function sheetWhereAbsorbed() {
    for (let sheetIndex = 0; sheetIndex < barrierCount; sheetIndex += 1) {
      if (Math.random() >= emission.sheetTransmission) return sheetIndex;
    }
    return null;
  }

  function emitParticle() {
    const absorbingSheet = sheetWhereAbsorbed();
    const x = LAYOUT.beamX + (Math.random() * 2 - 1) * LAYOUT.beamHalfWidth;
    const element = createSvgElement("circle", {
      class: `particle particle--${emission.particleType}`,
      cx: x,
      cy: LAYOUT.sourceEmissionY,
      r: PARTICLE_RADIUS[emission.particleType],
    }, particleGroup);
    particles.push({
      element,
      y: LAYOUT.sourceEmissionY,
      stopY: absorbingSheet === null ? LAYOUT.tubeWindowY : sheetBottomY(absorbingSheet),
      absorbed: absorbingSheet !== null,
      fadeRemaining: ABSORBED_FADE_SECONDS,
    });
  }

  function advanceParticle(particle, elapsedSeconds) {
    if (particle.y > particle.stopY) {
      particle.y = Math.max(particle.stopY, particle.y - PARTICLE_SPEED * elapsedSeconds);
      particle.element.setAttribute("cy", particle.y);
      return true;
    }
    if (!particle.absorbed) return false;
    particle.fadeRemaining -= elapsedSeconds;
    particle.element.setAttribute("opacity", Math.max(0, particle.fadeRemaining / ABSORBED_FADE_SECONDS));
    return particle.fadeRemaining > 0;
  }

  function step(elapsedSeconds) {
    if (emission.particleType) {
      pendingEmissions += emission.particlesPerSecond * elapsedSeconds;
      while (pendingEmissions >= 1) {
        emitParticle();
        pendingEmissions -= 1;
      }
    }
    particles = particles.filter((particle) => {
      const stillVisible = advanceParticle(particle, elapsedSeconds);
      if (!stillVisible) particle.element.remove();
      return stillVisible;
    });
  }

  return { setSource, setBarriers, setEmission, setCounts, setCounterLabel, flashDetector, step };
}
