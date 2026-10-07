const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const objectiveEl = document.getElementById('objective');
const statusEl = document.getElementById('status');

const world = {
  width: 3200,
  height: 2200,
};

let camera = { x: 0, y: 0 };
let lastTime = 0;
const keys = {};

const player = {
  x: 1600,
  y: 1100,
  radius: 18,
  speed: 220,
  color: '#f5d76e',
  direction: { x: 1, y: 0 },
};

const obstacles = [
  { x: 900, y: 640, w: 130, h: 150, type: 'tree' },
  { x: 1220, y: 900, w: 170, h: 220, type: 'tree' },
  { x: 1750, y: 470, w: 180, h: 180, type: 'tree' },
  { x: 2050, y: 1000, w: 180, h: 180, type: 'tree' },
  { x: 1460, y: 1450, w: 200, h: 220, type: 'tree' },
  { x: 540, y: 1280, w: 180, h: 150, type: 'tree' },
  { x: 2340, y: 760, w: 120, h: 120, type: 'rock' },
  { x: 2600, y: 1250, w: 150, h: 160, type: 'rock' },
  { x: 1030, y: 1780, w: 220, h: 180, type: 'house' },
  { x: 2100, y: 1560, w: 220, h: 180, type: 'house' },
];

const crystals = [
  { x: 790, y: 520, collected: false },
  { x: 1680, y: 720, collected: false },
  { x: 2460, y: 1520, collected: false },
  { x: 1140, y: 1950, collected: false },
  { x: 2340, y: 1180, collected: false },
];

const npc = {
  x: 2100,
  y: 1720,
  radius: 18,
  color: '#8be9fd',
  name: 'Elder Mira',
  wanderAngle: 0,
  wanderTimer: 0,
};

const state = {
  crystalCount: 0,
  questComplete: false,
  message: 'Explore the valley...',
};

function resizeCanvas() {
  const ratio = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * ratio;
  canvas.height = window.innerHeight * ratio;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function distance(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

function updateCamera() {
  camera.x = clamp(player.x - window.innerWidth / 2, 0, world.width - window.innerWidth);
  camera.y = clamp(player.y - window.innerHeight / 2, 0, world.height - window.innerHeight);
}

function rectCircleCollision(circle, rect) {
  const closestX = clamp(circle.x, rect.x, rect.x + rect.w);
  const closestY = clamp(circle.y, rect.y, rect.y + rect.h);
  const dx = circle.x - closestX;
  const dy = circle.y - closestY;
  return dx * dx + dy * dy < circle.radius * circle.radius;
}

function resolveCollisions(nextX, nextY) {
  const testPlayer = { x: nextX, y: player.y, radius: player.radius };
  const testPlayer2 = { x: player.x, y: nextY, radius: player.radius };

  for (const obstacle of obstacles) {
    if (rectCircleCollision(testPlayer, obstacle) || rectCircleCollision(testPlayer2, obstacle)) {
      return true;
    }
  }

  const oldX = player.x;
  const oldY = player.y;
  player.x = nextX;
  player.y = nextY;

  for (const obstacle of obstacles) {
    if (rectCircleCollision(player, obstacle)) {
      player.x = oldX;
      player.y = oldY;
      return true;
    }
  }

  return false;
}

function updatePlayer(delta) {
  let dx = 0;
  let dy = 0;

  if (keys['w'] || keys['arrowup']) dy -= 1;
  if (keys['s'] || keys['arrowdown']) dy += 1;
  if (keys['a'] || keys['arrowleft']) dx -= 1;
  if (keys['d'] || keys['arrowright']) dx += 1;

  if (dx !== 0 || dy !== 0) {
    const length = Math.hypot(dx, dy) || 1;
    dx /= length;
    dy /= length;
    player.direction.x = dx;
    player.direction.y = dy;

    const nextX = player.x + dx * player.speed * delta;
    const nextY = player.y + dy * player.speed * delta;

    if (!resolveCollisions(nextX, player.y)) {
      player.x = nextX;
    }

    if (!resolveCollisions(player.x, nextY)) {
      player.y = nextY;
    }

    player.x = clamp(player.x, player.radius, world.width - player.radius);
    player.y = clamp(player.y, player.radius, world.height - player.radius);
  }
}

function updateNPC(delta) {
  npc.wanderTimer -= delta;

  if (npc.wanderTimer <= 0) {
    npc.wanderAngle = Math.random() * Math.PI * 2;
    npc.wanderTimer = 2 + Math.random() * 3;
  }

  const moveX = Math.cos(npc.wanderAngle) * 60 * delta;
  const moveY = Math.sin(npc.wanderAngle) * 60 * delta;
  const nextX = npc.x + moveX;
  const nextY = npc.y + moveY;

  let canMove = true;
  for (const obstacle of obstacles) {
    const npcMarker = { x: nextX, y: nextY, radius: npc.radius };
    if (rectCircleCollision(npcMarker, obstacle)) {
      canMove = false;
      break;
    }
  }

  if (canMove) {
    npc.x = clamp(nextX, npc.radius, world.width - npc.radius);
    npc.y = clamp(nextY, npc.radius, world.height - npc.radius);
  }
}

function updateCrystals() {
  for (const crystal of crystals) {
    if (!crystal.collected && distance(player.x, player.y, crystal.x, crystal.y) < 32) {
      crystal.collected = true;
      state.crystalCount += 1;
      state.message = `Moon crystal secured (${state.crystalCount}/3)!`;

      if (state.crystalCount >= 3) {
        state.message = 'All moon crystals found! Talk to Elder Mira.';
      }
    }
  }

  if (!state.questComplete && state.crystalCount >= 3) {
    objectiveEl.textContent = 'Objective: Return to Elder Mira';
  } else {
    objectiveEl.textContent = `Objective: Gather ${Math.max(0, 3 - state.crystalCount)} moon crystals`;
  }
}

function interact() {
  const distToNpc = distance(player.x, player.y, npc.x, npc.y);

  if (distToNpc < 100 && state.crystalCount >= 3) {
    state.questComplete = true;
    state.message = 'The valley is safe again. You are a true Wanderer!';
    statusEl.textContent = state.message;
    return;
  }

  if (distToNpc < 100 && state.crystalCount < 3) {
    state.message = 'Elder Mira: Gather the moon crystals before returning.';
    statusEl.textContent = state.message;
    return;
  }

  for (const crystal of crystals) {
    if (!crystal.collected && distance(player.x, player.y, crystal.x, crystal.y) < 40) {
      crystal.collected = true;
      state.crystalCount += 1;
      state.message = `Moon crystal secured (${state.crystalCount}/3)!`;
      break;
    }
  }
}

function updateStatus() {
  if (!state.questComplete && state.crystalCount < 3) {
    statusEl.textContent = state.message;
  } else if (!state.questComplete && state.crystalCount >= 3) {
    statusEl.textContent = 'The crystals hum with power. Return to Elder Mira.';
  } else {
    statusEl.textContent = state.message;
  }
}

function drawBackground() {
  const dawn = 0.45 + Math.sin((performance.now() / 1000) * 0.2) * 0.15;
  const sky = `rgba(${Math.floor(40 + dawn * 70)}, ${Math.floor(80 + dawn * 50)}, ${Math.floor(120 + dawn * 60)}, 1)`;

  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

  const grassDark = '#3a8d5c';
  const grassLight = '#59a96a';

  for (let y = -camera.y % 128; y < window.innerHeight + 128; y += 128) {
    for (let x = -camera.x % 128; x < window.innerWidth + 128; x += 128) {
      ctx.fillStyle = ((Math.floor((x + camera.x) / 128) + Math.floor((y + camera.y) / 128)) % 2 === 0) ? grassDark : grassLight;
      ctx.fillRect(x, y, 128, 128);
    }
  }
}

function drawWorld() {
  ctx.save();
  ctx.translate(-camera.x, -camera.y);

  for (let i = 0; i < 26; i++) {
    const x = 120 + i * 120;
    const y = 180 + (i % 2) * 80;
    ctx.fillStyle = '#7b5d3d';
    ctx.fillRect(x, y, 40, 180);
    ctx.fillStyle = '#5b8748';
    ctx.beginPath();
    ctx.arc(x + 20, y - 10, 55, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const obstacle of obstacles) {
    if (obstacle.type === 'tree') {
      ctx.fillStyle = '#7d5a35';
      ctx.fillRect(obstacle.x, obstacle.y + 50, 30, obstacle.h - 50);
      ctx.fillStyle = '#2e7d4d';
      ctx.beginPath();
      ctx.arc(obstacle.x + 25, obstacle.y + 30, 50, 0, Math.PI * 2);
      ctx.fill();
    } else if (obstacle.type === 'rock') {
      ctx.fillStyle = '#6a6f7b';
      ctx.beginPath();
      ctx.moveTo(obstacle.x, obstacle.y + 35);
      ctx.lineTo(obstacle.x + 28, obstacle.y);
      ctx.lineTo(obstacle.x + 90, obstacle.y + 18);
      ctx.lineTo(obstacle.x + 110, obstacle.y + 75);
      ctx.lineTo(obstacle.x + 25, obstacle.y + 110);
      ctx.closePath();
      ctx.fill();
    } else if (obstacle.type === 'house') {
      ctx.fillStyle = '#c89666';
      ctx.fillRect(obstacle.x, obstacle.y + 30, obstacle.w, obstacle.h - 30);
      ctx.fillStyle = '#8d5b35';
      ctx.fillRect(obstacle.x + 20, obstacle.y + 58, obstacle.w - 40, obstacle.h - 90);
      ctx.fillStyle = '#d9c1a8';
      ctx.fillRect(obstacle.x + 52, obstacle.y + 75, 26, 42);
      ctx.fillStyle = '#7c4a2d';
      ctx.fillRect(obstacle.x + obstacle.w - 30, obstacle.y + 10, 30, 30);
    }
  }

  for (const crystal of crystals) {
    if (crystal.collected) continue;

    ctx.fillStyle = '#92f5ff';
    ctx.beginPath();
    ctx.moveTo(crystal.x, crystal.y - 18);
    ctx.lineTo(crystal.x + 10, crystal.y);
    ctx.lineTo(crystal.x, crystal.y + 18);
    ctx.lineTo(crystal.x - 10, crystal.y);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(146, 245, 255, 0.35)';
    ctx.beginPath();
    ctx.arc(crystal.x, crystal.y, 20, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = npc.color;
  ctx.beginPath();
  ctx.arc(npc.x, npc.y, npc.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#2e2d30';
  ctx.fillRect(npc.x - 22, npc.y - 46, 44, 12);
  ctx.fillStyle = '#f3f2ef';
  ctx.fillRect(npc.x - 18, npc.y - 44, 36, 8);

  ctx.fillStyle = player.color;
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(player.x + player.direction.x * 10, player.y + player.direction.y * 10, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawQuestBeacon() {
  if (state.questComplete) return;

  let target;
  if (state.crystalCount < 3) {
    const nextCrystal = crystals.find(c => !c.collected);
    if (nextCrystal) target = nextCrystal;
  } else {
    target = npc;
  }

  if (!target) return;

  const screenX = target.x - camera.x;
  const screenY = target.y - camera.y;

  ctx.save();
  ctx.translate(screenX, screenY - 40);
  ctx.strokeStyle = '#fff8d1';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -30);
  ctx.stroke();

  ctx.fillStyle = '#fff8d1';
  ctx.beginPath();
  ctx.arc(0, -30, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawMinimap() {
  const miniW = 180;
  const miniH = 140;
  const miniX = window.innerWidth - miniW - 24;
  const miniY = window.innerHeight - miniH - 24;

  ctx.fillStyle = 'rgba(10, 16, 24, 0.55)';
  ctx.fillRect(miniX, miniY, miniW, miniH);

  const sx = miniW / world.width;
  const sy = miniH / world.height;

  for (const obstacle of obstacles) {
    ctx.fillStyle = '#5a6b7c';
    ctx.fillRect(miniX + obstacle.x * sx, miniY + obstacle.y * sy, obstacle.w * sx, obstacle.h * sy);
  }

  for (const crystal of crystals) {
    if (!crystal.collected) {
      ctx.fillStyle = '#92f5ff';
      ctx.fillRect(miniX + crystal.x * sx - 2, miniY + crystal.y * sy - 2, 4, 4);
    }
  }

  ctx.fillStyle = npc.color;
  ctx.fillRect(miniX + npc.x * sx - 3, miniY + npc.y * sy - 3, 6, 6);

  ctx.fillStyle = player.color;
  ctx.fillRect(miniX + player.x * sx - 4, miniY + player.y * sy - 4, 8, 8);
}

function draw() {
  drawBackground();
  drawWorld();
  drawQuestBeacon();
  drawMinimap();
}

function loop(timestamp) {
  const delta = Math.min((timestamp - lastTime) / 1000 || 0.016, 0.033);
  lastTime = timestamp;

  updatePlayer(delta);
  updateNPC(delta);
  updateCrystals();
  updateStatus();
  updateCamera();
  draw();

  requestAnimationFrame(loop);
}

window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  keys[key] = true;

  if (key === 'e') {
    interact();
  }
});

window.addEventListener('keyup', (event) => {
  keys[event.key.toLowerCase()] = false;
});

window.addEventListener('resize', resizeCanvas);

resizeCanvas();
requestAnimationFrame(loop);
