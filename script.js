import { messages } from "./modules/messages.js";
import {
  birthdaySound,
  coffeeSound,
  kindSound,
  sparkleSound,
  subwayInst,
  wowSound,
} from "./modules/sounds.js";

(() => {
  const EMBEDDED_SPRITE = "./assets/img/chibi_sprite.png";

  const state = new Proxy(
    {
      stats: { coffee: 20, love: 15, party: 10 },
      unlocked: false,
      ready: false,
      running: true,
      lastTs: 0,
      time: 0,
      frameElapsed: 0,
      frameIndex: 0,
      blinkTimer: 2600,
      blinkHold: 0,
      blinkClosed: false,
      blinkRequested: false,
      particles: [],
      confetti: [],
      frames: [],
      introFrames: [],
      catPetTimer: 0,
      catPurrTimer: 0,
      petals: [],
    },
    {
      set(target, prop, value) {
        if (prop === "unlocked") {
          setTimeout(() => {
            toggleStatusButton(value);
          }, 1000);
        }

        target[prop] = value;
        return true;
      },
    },
  );

  const winCondition = {
    coffee: 80,
    love: 70,
    party: 90,
  };

  const speechEl = document.getElementById("speechBubble");
  const logEl = document.getElementById("logText");
  const introScreen = document.getElementById("introScreen");
  const gameScreen = document.getElementById("gameScreen");
  const finalOverlay = document.getElementById("finalOverlay");
  const coffeeFill = document.getElementById("coffeeFill");
  const loveFill = document.getElementById("loveFill");
  const partyFill = document.getElementById("partyFill");
  const coffeeValue = document.getElementById("coffeeValue");
  const loveValue = document.getElementById("loveValue");
  const partyValue = document.getElementById("partyValue");
  const stage = document.getElementById("stage");
  const ctx = stage.getContext("2d");
  const introCanvas = document.getElementById("introCanvas");
  const introCtx = introCanvas.getContext("2d");
  const confettiCanvas = document.getElementById("confettiCanvas");
  const confettiCtx = confettiCanvas.getContext("2d");
  const petalCanvas = document.getElementById("petalCanvas");
  const petalCtx = petalCanvas.getContext("2d");

  const img = new Image();
  img.onload = () => {
    state.frames = detectFrames(img);
    state.introFrames = state.frames.slice();
    state.ready = state.frames.length > 0;
    updateBars();
    requestAnimationFrame(loop);
  };
  img.src = EMBEDDED_SPRITE;
  initPetals();

  document.getElementById("startBtn").addEventListener("click", () => {
    introScreen.classList.remove("active");
    gameScreen.classList.add("active");
    subwayInst.play();
    say(randomFrom(messages.default));
  });

  function disableAllButtonsTemporarily(delay = 1000) {
    toggleStatusButton(true);

    setTimeout(() => {
      const buttons = [
        {
          id: "coffeeBtn",
          condition: state.stats.coffee >= winCondition.coffee,
        },
        { id: "loveBtn", condition: state.stats.love >= winCondition.love },
        { id: "partyBtn", condition: state.stats.party >= winCondition.party },
      ];

      buttons.forEach((button) => {
        const element = document.getElementById(button.id);
        if (element) {
          element.disabled = button.condition;
        }
      });

      toggleStatusButton(false, buttons);
    }, delay);
  }

  function toggleStatusButton(isEnabled, buttons = []) {
    const allButtons = ["coffeeBtn", "loveBtn", "partyBtn", "blinkBtn"];

    allButtons.forEach((buttonId) => {
      const element = document.getElementById(buttonId);
      if (element) {
        const shouldDisable = buttons.some(
          (button) => button.id === buttonId && button.condition,
        );
        element.disabled = isEnabled || shouldDisable;
      }
    });
  }

  document.getElementById("coffeeBtn").addEventListener("click", function () {
    disableAllButtonsTemporarily();
    coffeeSound.play();
    changeStat("coffee", 24);
    emitParticles(8, ["☕", "✨", "⭐"]);
    say(randomFrom(messages.coffee));
    log("Café fornecido com sucesso.");
    coffeeSound.currentTime = 0;
  });

  document.getElementById("loveBtn").addEventListener("click", function () {
    disableAllButtonsTemporarily();
    kindSound.play();
    changeStat("love", 26);
    emitParticles(8, ["💖", "✨", "🎀"]);
    triggerCatPet();
    say(randomFrom(messages.love));
    log("Carinho entregue para a chibi.");
    kindSound.currentTime = 0;
  });

  document.getElementById("partyBtn").addEventListener("click", function () {
    disableAllButtonsTemporarily();
    sparkleSound.play();
    changeStat("party", 28);
    emitParticles(10, ["🎉", "⭐", "💫"]);
    say(randomFrom(messages.party));
    log("Comemoração ativada.");
    sparkleSound.currentTime = 0;
  });

  document.getElementById("blinkBtn").addEventListener("click", function () {
    disableAllButtonsTemporarily();
    wowSound.play();
    state.blinkRequested = true;
    emitParticles(5, ["✨", "💖"]);
    say(randomFrom(messages.blink));
    log("Piscadinha especial executada.");
    wowSound.currentTime = 0;
  });

  document
    .getElementById("replayBtn")
    .addEventListener("click", resetExperience);
  document
    .getElementById("sparkBtn")
    .addEventListener("click", spawnConfettiBurst);

  window.addEventListener("keydown", (ev) => {
    if (!gameScreen.classList.contains("active")) return;
    if (ev.code === "Space") {
      ev.preventDefault();
      state.blinkRequested = true;
      emitParticles(5, ["✨", "⭐"]);
      say(randomFrom(messages.blink));
    }
  });

  function detectFrames(image) {
    const totalFrames = 4;
    const frameWidth = Math.floor(image.width / totalFrames);
    const frameHeight = image.height;

    const frames = [];

    for (let i = 0; i < totalFrames; i++) {
      frames.push({
        x: i * frameWidth,
        y: 0,
        w: frameWidth,
        h: frameHeight,
      });
    }

    return frames;
  }

  function loop(ts) {
    if (!state.lastTs) state.lastTs = ts;
    const dt = Math.min(40, ts - state.lastTs);
    state.lastTs = ts;

    if (state.ready) {
      updateAnimation(dt);
      updatePetals(dt);
      renderIntro();
      renderPetals();
      renderScene();
      renderConfetti();
    }

    requestAnimationFrame(loop);
  }

  function updateAnimation(dt) {
    state.time += dt;
    state.frameElapsed += dt;

    const idleSequence = [0, 1, 2, 1, 0, 0];

    if (state.frameElapsed >= 260) {
      state.frameElapsed = 0;
      state.frameIndex = (state.frameIndex + 1) % idleSequence.length;
    }
    if (!state.blinkClosed) {
      state.blinkTimer -= dt;
      if (state.blinkRequested || state.blinkTimer <= 0) {
        state.blinkRequested = false;
        state.blinkClosed = true;
        state.blinkHold = 120;
      }
    } else {
      state.blinkHold -= dt;
      if (state.blinkHold <= 0) {
        state.blinkClosed = false;
        state.blinkTimer = rand(2600, 4300);
      }
    }

    state.catPetTimer = Math.max(0, state.catPetTimer - dt);
    state.catPurrTimer = Math.max(0, state.catPurrTimer - dt);

    state.particles = state.particles.filter((p) => {
      p.life -= dt;
      p.x += (p.vx * dt) / 16.666;
      p.y += (p.vy * dt) / 16.666;
      p.vy += 0.02 * dt;
      p.rot += (p.spin * dt) / 16.666;
      return p.life > 0;
    });

    state.confetti = state.confetti.filter((c) => {
      c.life -= dt;
      c.x += (c.vx * dt) / 16.666;
      c.y += (c.vy * dt) / 16.666;
      c.vy += 0.028 * dt;
      c.rot += (c.spin * dt) / 16.666;
      return c.life > 0;
    });
  }

  function renderIntro() {
    introCtx.clearRect(0, 0, introCanvas.width, introCanvas.height);
    if (!state.introFrames.length) return;

    const idleSequence = [0, 1, 2, 1, 0, 0];
    const blinkFrameIndex = 3;

    const frame = state.blinkClosed
      ? state.introFrames[blinkFrameIndex]
      : state.introFrames[idleSequence[state.frameIndex]];

    const fineAdjustY = 75;
    const fineAdjustX = 20;

    const baseY = 360 + Math.sin(state.time / 460) * 4;
    const drawW = frame.w * 1;
    const drawH = frame.h * 1;
    const x = introCanvas.width / 2 - drawW / 2 - fineAdjustX;
    const y = baseY - drawH + fineAdjustY;

    drawShadowOn(introCtx, introCanvas.width / 2, 384, 100, 16, 0.22);

    introCtx.save();
    introCtx.imageSmoothingEnabled = false;
    introCtx.drawImage(
      img,
      frame.x,
      frame.y,
      frame.w,
      frame.h,
      x,
      y,
      drawW,
      drawH,
    );
    introCtx.restore();

    introCtx.font = "24px Kawaii";
    introCtx.fillStyle = "rgba(125,71,97,.9)";
    introCtx.textAlign = "center";
    introCtx.fillText("pronta para a missão ✨", introCanvas.width / 2, 470);
  }

  function renderScene() {
    ctx.clearRect(0, 0, stage.width, stage.height);
    if (!state.frames.length) return;

    drawGardenDecor();

    const idleSequence = [0, 1, 2, 1, 0, 0];
    const blinkFrameIndex = 3;

    const frame = state.blinkClosed
      ? state.frames[blinkFrameIndex]
      : state.frames[idleSequence[state.frameIndex]];

    const bob = Math.sin(state.time / 420) * 5;
    const drawW = frame.w * 1.1;
    const drawH = frame.h * 1.1;
    const x = stage.width / 2 - drawW / 2;
    const y = 610 - drawH + bob + 60;

    drawShadowOn(ctx, stage.width / 2, 655, 120, 18, 0.24);

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, frame.x, frame.y, frame.w, frame.h, x, y, drawW, drawH);
    ctx.restore();

    drawParticles();
  }

  function renderConfetti() {
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    for (const c of state.confetti) {
      confettiCtx.save();
      confettiCtx.globalAlpha = Math.max(0, c.life / 1800);
      confettiCtx.translate(c.x, c.y);
      confettiCtx.rotate(c.rot);
      confettiCtx.fillStyle = c.color;
      confettiCtx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
      confettiCtx.restore();
    }
  }

  function drawShadowOn(targetCtx, cx, cy, w, h, a) {
    targetCtx.save();
    const grad = targetCtx.createRadialGradient(cx, cy, 1, cx, cy, w);
    grad.addColorStop(0, `rgba(112,60,90,${a})`);
    grad.addColorStop(1, "rgba(112,60,90,0)");
    targetCtx.fillStyle = grad;
    targetCtx.beginPath();
    targetCtx.ellipse(cx, cy, w, h, 0, 0, Math.PI * 2);
    targetCtx.fill();
    targetCtx.restore();
  }

  function drawParticles() {
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const p of state.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life / 1100);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.font = `${p.size}px system-ui, emoji`;
      ctx.fillText(p.char, 0, 0);
      ctx.restore();
    }
    ctx.restore();
  }

  function drawGardenDecor() {
    const sway = Math.sin(state.time / 620) * 1.5;
    drawSunflower(118 + sway, 565, 2, 0.1);
    drawSunflower(168 - sway, 590, 0.95, 0.8);
    drawSunflower(620 - sway, 570, 1, 1.4);
    drawSunflower(675 + sway, 595, 2.1, 2.1);

    const catBob = Math.sin(state.time / 700) * 1.2;
    drawSleepingCat(146, 618 + catBob, 2.2);
  }

  function px(x, y, size, color) {
    ctx.fillStyle = color;
    ctx.fillRect(
      Math.round(x),
      Math.round(y),
      Math.ceil(size),
      Math.ceil(size),
    );
  }

  function drawSunflower(cx, baseY, scale, phase) {
    const p = 6 * scale;
    const lean = Math.sin(state.time / 700 + phase) * 1.4;

    for (let i = 0; i < 8; i++) {
      const offset = Math.sin(i / 8 + state.time / 700 + phase) * lean;
      px(cx + offset, baseY - i * p, p, "#4b9c5a");
    }

    px(cx - p + lean * 0.3, baseY - 3 * p, p, "#67b86f");
    px(cx - 2 * p + lean * 0.2, baseY - 3 * p, p, "#67b86f");
    px(cx + p + lean * 0.5, baseY - 5 * p, p, "#67b86f");
    px(cx + 2 * p + lean * 0.4, baseY - 5 * p, p, "#67b86f");

    const headX = cx - 1.5 * p + lean;
    const headY = baseY - 10 * p;

    const petal = "#f7c948";
    const petal2 = "#ffd96a";
    const center = "#714d2d";

    const petalCoords = [
      [-1, 0],
      [0, 0],
      [1, 0],
      [2, 0],
      [-2, 1],
      [-1, 1],
      [2, 1],
      [3, 1],
      [-2, 2],
      [3, 2],
      [-2, 3],
      [-1, 3],
      [2, 3],
      [3, 3],
      [-1, 4],
      [0, 4],
      [1, 4],
      [2, 4],
    ];

    for (const [dx, dy] of petalCoords) {
      px(
        headX + dx * p,
        headY + dy * p,
        p,
        (dx + dy) % 2 === 0 ? petal : petal2,
      );
    }

    for (let dy = 1; dy <= 3; dy++) {
      for (let dx = 0; dx <= 2; dx++) {
        px(headX + dx * p, headY + dy * p, p, center);
      }
    }
    px(headX + p, headY + 2 * p, p, "#8a6036");
  }

  function drawSleepingCat(cx, baseY, scale) {
    const p = 5 * scale;
    const body = "#f2e6d8";
    const shadow = "#e3d4c3";
    const dark = "#5a4a4a";
    const isHappy = state.catPetTimer > 0;
    const purr = state.catPurrTimer > 0 ? Math.sin(state.time / 90) * 0.8 : 0;

    const bodyPixels = [
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 0],
      [4, 0],
      [-1, 1],
      [0, 1],
      [1, 1],
      [2, 1],
      [3, 1],
      [4, 1],
      [5, 1],
      [-1, 2],
      [0, 2],
      [1, 2],
      [2, 2],
      [3, 2],
      [4, 2],
      [5, 2],
      [0, 3],
      [1, 3],
      [2, 3],
      [3, 3],
      [4, 3],
      [1, 4],
      [2, 4],
      [3, 4],
    ];
    for (const [dx, dy] of bodyPixels) {
      px(cx + dx * p, baseY + dy * p + purr, p, dy < 2 ? body : shadow);
    }

    const headPixels = [
      [4, -1],
      [5, -1],
      [6, -1],
      [3, 0],
      [4, 0],
      [5, 0],
      [6, 0],
      [7, 0],
      [3, 1],
      [4, 1],
      [5, 1],
      [6, 1],
      [7, 1],
      [4, 2],
      [5, 2],
      [6, 2],
    ];
    for (const [dx, dy] of headPixels) {
      px(cx + dx * p, baseY + dy * p + purr, p, body);
    }

    px(cx + 4 * p, baseY - 2 * p + purr, p, dark);
    px(cx + 6 * p, baseY - 2 * p + purr, p, dark);

    px(cx + 4 * p, baseY + 0 * p + purr, p, dark);
    px(cx + 5 * p, baseY + 0 * p + purr, p, dark);
    px(cx + 6 * p, baseY + 0 * p + purr, p, dark);
    px(cx + 5 * p, baseY + 1 * p + purr, p, dark);

    const tailLift = isHappy ? -p * 0.5 : 0;
    px(cx - 2 * p, baseY + 1 * p + purr, p, dark);
    px(cx - 3 * p, baseY + 0 * p + purr + tailLift, p, dark);
    px(cx - 4 * p, baseY - 1 * p + purr + tailLift, p, dark);

    ctx.fillStyle = "#2b1e27";
    if (isHappy) {
      ctx.fillRect(
        cx + 4.2 * p,
        baseY + 0.9 * p + purr,
        p * 0.5,
        Math.max(1, p * 0.16),
      );
      ctx.fillRect(
        cx + 5.9 * p,
        baseY + 0.9 * p + purr,
        p * 0.5,
        Math.max(1, p * 0.16),
      );
    } else {
      ctx.fillRect(
        cx + 4.35 * p,
        baseY + 0.85 * p + purr,
        p * 0.6,
        Math.max(1, p * 0.16),
      );
      ctx.fillRect(
        cx + 5.8 * p,
        baseY + 0.85 * p + purr,
        p * 0.6,
        Math.max(1, p * 0.16),
      );
    }

    if (state.catPetTimer > 0) {
      ctx.save();
      ctx.font = `${Math.round(14 * scale)}px Kawaii`;
      ctx.fillStyle = "rgba(217,106,164,.95)";
      ctx.fillText("❤", cx + 46 * scale, baseY - 4 * scale);
      ctx.restore();
    }

    if (state.catPurrTimer > 0) {
      ctx.save();
      ctx.fillStyle = "rgba(123,71,97,.78)";
      ctx.font = `${Math.round(11 * scale)}px Kawaii`;
      ctx.fillText("prr", cx + 42 * scale, baseY - 8 * scale);
      ctx.restore();
    } else {
      ctx.save();
      ctx.fillStyle = "rgba(123,71,97,.75)";
      ctx.font = `${Math.round(12 * scale)}px Kawaii`;
      ctx.fillText("z", cx + 40 * scale, baseY - 10 * scale);
      ctx.fillText("z", cx + 50 * scale, baseY - 22 * scale);
      ctx.restore();
    }
  }

  function triggerCatPet() {
    state.catPetTimer = 1800;
    state.catPurrTimer = 1800;
    for (let i = 0; i < 7; i++) {
      state.particles.push({
        x: 185 + rand(-18, 18),
        y: 580 + rand(-18, 8),
        vx: rand(-0.8, 0.8),
        vy: rand(-2.6, -0.8),
        life: rand(700, 1100),
        size: rand(14, 22),
        char: ["💖", "✨", "❤"][(Math.random() * 3) | 0],
        rot: rand(-0.4, 0.4),
        spin: rand(-0.08, 0.08),
      });
    }
  }

  function emitParticles(count, chars) {
    const cx = stage.width / 2;
    const cy = 320;
    for (let i = 0; i < count; i++) {
      state.particles.push({
        x: cx + rand(-80, 80),
        y: cy + rand(-30, 80),
        vx: rand(-1.6, 1.6),
        vy: rand(-3.2, -0.8),
        life: rand(700, 1100),
        size: rand(18, 28),
        char: chars[(Math.random() * chars.length) | 0],
        rot: rand(-0.5, 0.5),
        spin: rand(-0.08, 0.08),
      });
    }
  }

  function changeStat(key, amount) {
    if (state.unlocked) return;
    state.stats[key] = Math.min(100, state.stats[key] + amount);
    updateBars();
    checkUnlock();
  }

  function updateBars() {
    coffeeFill.style.width = state.stats.coffee + "%";
    loveFill.style.width = state.stats.love + "%";
    partyFill.style.width = state.stats.party + "%";

    coffeeValue.textContent = state.stats.coffee + "%";
    loveValue.textContent = state.stats.love + "%";
    partyValue.textContent = state.stats.party + "%";
  }

  function say(text) {
    speechEl.textContent = text;
  }
  function log(text) {
    logEl.textContent = text;
  }

  function checkUnlock() {
    const ready =
      state.stats.coffee >= winCondition.coffee &&
      state.stats.love >= winCondition.love &&
      state.stats.party >= winCondition.party;
    if (ready && !state.unlocked) {
      state.unlocked = true;
      say(randomFrom(messages.ready));
      log("Todos os status atingiram o nível necessário.");
      subwayInst.pause();
      setTimeout(() => {
        say("modo aniversário ativado com sucesso 🎉");
        finalOverlay.classList.add("show");
        birthdaySound.play();
        spawnConfettiBurst();
        spawnConfettiBurst();
      }, 700);
    }
  }

  function spawnConfettiBurst() {
    const colors = [
      "#ff84b7",
      "#ffd166",
      "#7dd3fc",
      "#c4b5fd",
      "#86efac",
      "#f9a8d4",
    ];
    for (let i = 0; i < 120; i++) {
      state.confetti.push({
        x: rand(50, confettiCanvas.width - 50),
        y: rand(-40, 120),
        vx: rand(-2.4, 2.4),
        vy: rand(0.6, 3.8),
        life: rand(1000, 1800),
        w: rand(6, 12),
        h: rand(10, 18),
        rot: rand(0, Math.PI * 2),
        spin: rand(-0.18, 0.18),
        color: colors[(Math.random() * colors.length) | 0],
      });
    }
  }

  function resetExperience() {
    state.stats = { coffee: 20, love: 15, party: 10 };
    state.unlocked = false;
    state.particles.length = 0;
    state.confetti.length = 0;
    state.catPetTimer = 0;
    state.catPurrTimer = 0;
    updateBars();
    say(randomFrom(messages.default));
    log("Missão reiniciada.");
    finalOverlay.classList.remove("show");
    birthdaySound.pause();
    birthdaySound.currentTime = 0;
    subwayInst.currentTime = 3;
    subwayInst.play();
  }

  function randomFrom(arr) {
    return arr[(Math.random() * arr.length) | 0];
  }

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  function initPetals() {
    state.petals = [];
    for (let i = 0; i < 24; i++) {
      state.petals.push(createPetal(true));
    }
  }

  function createPetal(initial = false) {
    return {
      x: rand(0, petalCanvas.width),
      y: initial ? rand(0, petalCanvas.height) : rand(-80, -20),
      vx: rand(-0.35, 0.35),
      vy: rand(0.6, 1.4),
      size: rand(8, 16),
      rot: rand(0, Math.PI * 2),
      spin: rand(-0.03, 0.03),
      sway: rand(0.6, 1.6),
      phase: rand(0, Math.PI * 2),
    };
  }

  function updatePetals(dt) {
    const t = state.time / 1000;
    for (const p of state.petals) {
      p.y += (p.vy * dt) / 16.666;
      p.x += ((p.vx + Math.sin(t * p.sway + p.phase) * 0.25) * dt) / 16.666;
      p.rot += (p.spin * dt) / 16.666;

      if (
        p.y > petalCanvas.height + 20 ||
        p.x < -40 ||
        p.x > petalCanvas.width + 40
      ) {
        Object.assign(p, createPetal(false));
      }
    }
  }

  function renderPetals() {
    petalCtx.clearRect(0, 0, petalCanvas.width, petalCanvas.height);

    for (const p of state.petals) {
      petalCtx.save();
      petalCtx.translate(p.x, p.y);
      petalCtx.rotate(p.rot);

      petalCtx.fillStyle = "rgba(255,182,203,.82)";
      petalCtx.beginPath();
      petalCtx.moveTo(0, -p.size * 0.7);
      petalCtx.quadraticCurveTo(p.size * 0.85, -p.size * 0.2, 0, p.size);
      petalCtx.quadraticCurveTo(
        -p.size * 0.85,
        -p.size * 0.2,
        0,
        -p.size * 0.7,
      );
      petalCtx.fill();

      petalCtx.fillStyle = "rgba(255,220,232,.45)";
      petalCtx.beginPath();
      petalCtx.ellipse(
        -p.size * 0.1,
        -p.size * 0.1,
        p.size * 0.18,
        p.size * 0.34,
        0.3,
        0,
        Math.PI * 2,
      );
      petalCtx.fill();

      petalCtx.restore();
    }
  }
})();
