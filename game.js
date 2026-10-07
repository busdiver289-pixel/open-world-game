const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const minimapCanvas = document.getElementById('minimap');
const minimapCtx = minimapCanvas.getContext('2d');
const messagesEl = document.getElementById('messages');
const moneyEl = document.getElementById('money');
const healthBarEl = document.getElementById('healthBar');
const wantedEl = document.getElementById('wanted');
const weaponEl = document.getElementById('weapon');
const objectiveEl = document.getElementById('objective');

const WORLD = {
  width: 4800,
  height: 3200,
};

const WEAPONS = {
  fists: { name: 'Fists', damage: 10, range: 30, cooldown: 0.4 },
  pistol: { name: 'Pistol', damage: 35, range: 300, cooldown: 0.3 },
  shotgun: { name: 'Shotgun', damage: 60, range: 150, cooldown: 0.6 },
};

let gameState = {
  camera: { x: 0, y: 0 },
  keys: {},
  lastTime: 0,
  messages: [],
};

const player = {
  x: 2400,
  y: 1600,
  radius: 16,
  speed: 280,
  color: '#4a9eff',
  health: 100,
  maxHealth: 100,
  money: 0,
  wantedLevel: 0,
  weapon: 'fists',
  direction: { x: 1, y: 0 },
  isAiming: false,
  aimAngle: 0,
  lastShot: 0,
  inVehicle: null,
};

const enemies = [];
const vehicles = [];
const projectiles = [];
const pickups = [];
const buildings = [
  { x: 600, y: 500, w: 280, h: 240, type: 'shop', color: '#2d7f3e', name: 'Gun Store' },
  { x: 1400, y: 700, w: 240, h: 200, type: 'bank', color: '#4a6fa5', name: 'First Bank' },
  { x: 900, y: 1600, w: 300, h: 250, type: 'warehouse', color: '#5a4a3a', name: 'Warehouse' },
  { x: 2200, y: 800, w: 260, h: 220, type: 'police', color: '#0066cc', name: 'Police Station' },
  { x: 3200, y: 1200, w: 280, h: 240, type: 'garage', color: '#8b7355', name: 'Auto Garage' },
  { x: 2800, y: 2400, w: 320, h: 280, type: 'bar', color: '#664400', name: 'Club Nexus' },
  { x: 3900, y: 2000, w: 240, h: 200, type: 'hospital', color: '#ff6b6b', name: 'Hospital' },
  { x: 1800, y: 2600, w: 300, h: 250, type: 'shop', color: '#2d7f3e', name: 'Market' },
];

const roads = [
  { x: 0, y: 1500, w: WORLD.width, h: 200, type: 'horizontal' },
  { x: 2300, y: 0, w: 200, h: WORLD.height, type: 'vertical' },
  { x: 1200, y: 800, w: 400, h: 120, type: 'diagonal' },
  { x: 3400, y: 1200, w: 300, h: 150, type: 'diagonal' },
];

function addMessage(text, color = '#ddeeff') {
  const msg = document.createElement('div');
  msg.textContent = text;
  msg.style.color = color;
  messagesEl.appendChild(msg);
  gameState.messages.push({ text, time: Date.now() });

  setTimeout(() => {
    if (msg.parentElement) msg.remove();
  }, 5000);
}

function spawnEnemy(x, y, type = 'thug') {
  const enemy = {
    x,
    y,
    radius: 14,
    type,
    health: 50,
    maxHealth: 50,
    speed: 120,
    color: type === 'cop' ? '#0066cc' : type === 'gang' ? '#cc0000' : '#666',
    direction: { x: 0, y: 1 },
    targetAngle: Math.random() * Math.PI * 2,
    timer: 0,
    lastShot: 0,
    weapon: type === 'cop' ? 'pistol' : 'fists',
  };
  enemies.push(enemy);
}

function spawnVehicle(x, y) {
  const vehicle = {
    x,
    y,
    w: 60,
    h: 40,
    speed: 350,
    color: '#d4a574',
    angle: 0,
    velocity: { x: 0, y: 0 },
    health: 100,
    maxHealth: 100,
    occupant: null,
  };
  vehicles.push(vehicle);
}

function spawnPickup(x, y, type = 'money') {
  pickups.push({
    x,
    y,
    type,
    size: 8,
    value: type === 'money' ? 50 + Math.random() * 100 : 1,
  });
}

function resizeCanvas() {
  const ratio = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * ratio;
  canvas.height = window.innerHeight * ratio;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function distance(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function rectCircleCollision(circle, rect) {
  const closestX = clamp(circle.x, rect.x, rect.x + rect.w);
  const closestY = clamp(circle.y, rect.y, rect.y + rect.h);
  const dx = circle.x - closestX;
  const dy = circle.y - closestY;
  return dx * dx + dy * dy < circle.radius * circle.radius;
}

function checkCollisions(pos, radius) {
  for (const building of buildings) {
    if (rectCircleCollision({ ...pos, radius }, building)) {
      return true;
    }
  }
  return false;
}

function updateCamera() {
  gameState.camera.x = clamp(player.x - window.innerWidth / 2, 0, WORLD.width - window.innerWidth);
  gameState.camera.y = clamp(player.y - window.innerHeight / 2, 0, WORLD.height - window.innerHeight);
}

function updatePlayer(delta) {
  let dx = 0;
  let dy = 0;

  if (gameState.keys['w'] || gameState.keys['arrowup']) dy -= 1;
  if (gameState.keys['s'] || gameState.keys['arrowdown']) dy += 1;
  if (gameState.keys['a'] || gameState.keys['arrowleft']) dx -= 1;
  if (gameState.keys['d'] || gameState.keys['arrowright']) dx += 1;

  if (dx !== 0 || dy !== 0) {
    const length = Math.hypot(dx, dy) || 1;
    dx /= length;
    dy /= length;
    player.direction.x = dx;
    player.direction.y = dy;

    const nextX = player.x + dx * player.speed * delta;
    const nextY = player.y + dy * player.speed * delta;

    if (!checkCollisions({ x: nextX, y: player.y }, player.radius)) {
      player.x = nextX;
    }
    if (!checkCollisions({ x: player.x, y: nextY }, player.radius)) {
      player.y = nextY;
    }
  }

  player.x = clamp(player.x, player.radius, WORLD.width - player.radius);
  player.y = clamp(player.y, player.radius, WORLD.height - player.radius);
}

function updateEnemies(delta) {
  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];
    enemy.timer += delta;

    const dist = distance(enemy.x, enemy.y, player.x, player.y);

    if (dist < 500) {
      const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
      enemy.direction.x = Math.cos(angle);
      enemy.direction.y = Math.sin(angle);

      if (dist > 60) {
        enemy.x += enemy.direction.x * enemy.speed * delta;
        enemy.y += enemy.direction.y * enemy.speed * delta;
      }

      if (dist < 200 && enemy.lastShot + (WEAPONS[enemy.weapon]?.cooldown || 0.5) < Date.now() / 1000) {
        fireProjectile(enemy.x, enemy.y, angle, enemy.weapon, true);
        enemy.lastShot = Date.now() / 1000;
      }
    } else if (enemy.timer > 3) {
      enemy.timer = 0;
      enemy.targetAngle = Math.random() * Math.PI * 2;
      enemy.direction.x = Math.cos(enemy.targetAngle);
      enemy.direction.y = Math.sin(enemy.targetAngle);
    }

    if (enemy.health <= 0) {
      enemies.splice(i, 1);
      player.money += 100;
      spawnPickup(enemy.x, enemy.y, 'money');
      continue;
    }
  }
}

function fireProjectile(fromX, fromY, angle, weaponType = 'pistol', isEnemy = false) {
  const weapon = WEAPONS[weaponType] || WEAPONS.pistol;
  const speed = 400;

  projectiles.push({
    x: fromX,
    y: fromY,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    range: weapon.range,
    damage: weapon.damage,
    isEnemy,
    traveled: 0,
  });
}

function updateProjectiles(delta) {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const proj = projectiles[i];
    proj.x += proj.vx * delta;
    proj.y += proj.vy * delta;
    proj.traveled += Math.hypot(proj.vx * delta, proj.vy * delta);

    if (proj.traveled > proj.range) {
      projectiles.splice(i, 1);
      continue;
    }

    if (proj.isEnemy) {
      const dist = distance(proj.x, proj.y, player.x, player.y);
      if (dist < 20) {
        player.health -= proj.damage;
        player.wantedLevel = Math.min(5, player.wantedLevel + 1);
        addMessage('You were shot!', '#ff6b6b');
        projectiles.splice(i, 1);
      }
    } else {
      for (let j = enemies.length - 1; j >= 0; j--) {
        if (distance(proj.x, proj.y, enemies[j].x, enemies[j].y) < 20) {
          enemies[j].health -= proj.damage;
          projectiles.splice(i, 1);
          break;
        }
      }
    }
  }
}

function handleInteraction() {
  for (const building of buildings) {
    const dist = distance(player.x, player.y, building.x + building.w / 2, building.y + building.h / 2);
    if (dist < 150) {
      switch (building.type) {
        case 'gun_store':
        case 'shop':
          if (building.name === 'Gun Store') {
            if (player.money >= 200) {
              player.money -= 200;
              player.weapon = 'pistol';
              addMessage('Purchased Pistol!', '#ffd700');
            } else {
              addMessage('Not enough money!', '#ff6b6b');
            }
          }
          break;
        case 'hospital':
          if (player.health < player.maxHealth) {
            const healCost = (player.maxHealth - player.health) * 5;
            if (player.money >= healCost) {
              player.money -= healCost;
              player.health = player.maxHealth;
              addMessage('Healed!', '#4aff4a');
            } else {
              addMessage('Cannot afford healing', '#ff6b6b');
            }
          }
          break;
        case 'police':
          addMessage('Wanted level reset!', '#4aff4a');
          player.wantedLevel = 0;
          break;
        case 'bar':
          player.money += 50;
          addMessage('Found money at the bar!', '#ffd700');
          break;
      }
      return;
    }
  }
}

function updatePickups(delta) {
  for (let i = pickups.length - 1; i >= 0; i--) {
    const pickup = pickups[i];
    if (distance(player.x, player.y, pickup.x, pickup.y) < 30) {
      if (pickup.type === 'money') {
        player.money += pickup.value;
        addMessage(`+$${Math.floor(pickup.value)}`, '#ffd700');
      }
      pickups.splice(i, 1);
    }
  }
}

function updateWantedLevel(delta) {
  if (player.wantedLevel > 0) {
    player.wantedLevel -= delta * 0.1;
    if (player.wantedLevel < 0) player.wantedLevel = 0;
  }
}

function drawWorld() {
  ctx.save();
  ctx.translate(-gameState.camera.x, -gameState.camera.y);

  // Draw roads
  for (const road of roads) {
    ctx.fillStyle = '#444';
    ctx.fillRect(road.x, road.y, road.w, road.h);
    ctx.strokeStyle = '#ffff00';
    ctx.lineWidth = 4;
    if (road.type === 'horizontal') {
      for (let x = road.x; x < road.x + road.w; x += 80) {
        ctx.setLineDash([30, 20]);
        ctx.beginPath();
        ctx.moveTo(x, road.y + road.h / 2);
        ctx.lineTo(x + 40, road.y + road.h / 2);
        ctx.stroke();
      }
    } else if (road.type === 'vertical') {
      for (let y = road.y; y < road.y + road.h; y += 80) {
        ctx.setLineDash([30, 20]);
        ctx.beginPath();
        ctx.moveTo(road.x + road.w / 2, y);
        ctx.lineTo(road.x + road.w / 2, y + 40);
        ctx.stroke();
      }
    }
    ctx.setLineDash([]);
  }

  // Draw buildings
  for (const building of buildings) {
    ctx.fillStyle = building.color;
    ctx.fillRect(building.x, building.y, building.w, building.h);
    ctx.fillStyle = '#000';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(building.name, building.x + building.w / 2, building.y + building.h / 2);
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.strokeRect(building.x, building.y, building.w, building.h);
  }

  // Draw projectiles
  for (const proj of projectiles) {
    ctx.fillStyle = '#ffff00';
    ctx.beginPath();
    ctx.arc(proj.x, proj.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw pickups
  for (const pickup of pickups) {
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(pickup.x, pickup.y, pickup.size, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw enemies
  for (const enemy of enemies) {
    ctx.fillStyle = enemy.color;
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
    ctx.fill();

    // Health bar
    const healthPercent = enemy.health / enemy.maxHealth;
    ctx.fillStyle = '#ff4444';
    ctx.fillRect(enemy.x - 15, enemy.y - 25, 30 * healthPercent, 4);
    ctx.strokeStyle = '#fff';
    ctx.strokeRect(enemy.x - 15, enemy.y - 25, 30, 4);
  }

  // Draw vehicles
  for (const vehicle of vehicles) {
    ctx.save();
    ctx.translate(vehicle.x, vehicle.y);
    ctx.rotate(vehicle.angle);
    ctx.fillStyle = vehicle.color;
    ctx.fillRect(-vehicle.w / 2, -vehicle.h / 2, vehicle.w, vehicle.h);
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.strokeRect(-vehicle.w / 2, -vehicle.h / 2, vehicle.w, vehicle.h);
    ctx.restore();

    // Health bar
    const healthPercent = vehicle.health / vehicle.maxHealth;
    ctx.fillStyle = '#ff4444';
    ctx.fillRect(vehicle.x - 30, vehicle.y - 40, 60 * healthPercent, 4);
    ctx.strokeStyle = '#fff';
    ctx.strokeRect(vehicle.x - 30, vehicle.y - 40, 60, 4);
  }

  // Draw player
  ctx.fillStyle = player.color;
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
  ctx.fill();

  // Draw weapon sight
  ctx.strokeStyle = player.color;
  ctx.lineWidth = 2;
  const aimDist = 40;
  ctx.beginPath();
  ctx.moveTo(player.x + player.direction.x * aimDist, player.y + player.direction.y * aimDist);
  ctx.lineTo(player.x + player.direction.x * (aimDist + 20), player.y + player.direction.y * (aimDist + 20));
  ctx.stroke();

  ctx.restore();
}

function drawHUD() {
  healthBarEl.style.width = (player.health / player.maxHealth) * 100 + '%';
  moneyEl.textContent = '$' + Math.floor(player.money);
  weaponEl.textContent = WEAPONS[player.weapon]?.name || 'Fists';
  wantedEl.textContent = player.wantedLevel > 0 ? '●'.repeat(Math.ceil(player.wantedLevel)) : '●';
  wantedEl.className = 'value wanted-' + Math.floor(player.wantedLevel);

  if (player.health <= 0) {
    objectiveEl.textContent = 'You are dead. Press R to respawn.';
  } else {
    objectiveEl.textContent = 'Explore the city. Use E to interact. Left-click to shoot.';
  }
}

function drawMinimap() {
  const minimapW = minimapCanvas.width;
  const minimapH = minimapCanvas.height;
  minimapCtx.fillStyle = 'rgba(20, 30, 50, 0.9)';
  minimapCtx.fillRect(0, 0, minimapW, minimapH);

  const sx = minimapW / WORLD.width;
  const sy = minimapH / WORLD.height;

  // Buildings
  for (const building of buildings) {
    minimapCtx.fillStyle = building.color;
    minimapCtx.fillRect(building.x * sx, building.y * sy, building.w * sx, building.h * sy);
  }

  // Enemies
  minimapCtx.fillStyle = '#cc0000';
  for (const enemy of enemies) {
    minimapCtx.fillRect(enemy.x * sx - 2, enemy.y * sy - 2, 4, 4);
  }

  // Vehicles
  minimapCtx.fillStyle = '#8b7355';
  for (const vehicle of vehicles) {
    minimapCtx.fillRect(vehicle.x * sx - 3, vehicle.y * sy - 3, 6, 6);
  }

  // Player
  minimapCtx.fillStyle = '#4a9eff';
  minimapCtx.beginPath();
  minimapCtx.arc(player.x * sx, player.y * sy, 4, 0, Math.PI * 2);
  minimapCtx.fill();
}

function update(delta) {
  if (player.health <= 0) return;

  updatePlayer(delta);
  updateEnemies(delta);
  updateProjectiles(delta);
  updatePickups(delta);
  updateWantedLevel(delta);
  updateCamera();
  drawWorld();
  drawMinimap();
  drawHUD();
}

function loop(timestamp) {
  const delta = Math.min((timestamp - gameState.lastTime) / 1000 || 0.016, 0.033);
  gameState.lastTime = timestamp;

  update(delta);
  requestAnimationFrame(loop);
}

// Input handling
window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  gameState.keys[key] = true;

  if (key === 'e') {
    handleInteraction();
  }
  if (key === 'r' && player.health <= 0) {
    player.health = player.maxHealth;
    player.x = 2400;
    player.y = 1600;
    player.wantedLevel = 0;
  }
});

window.addEventListener('keyup', (event) => {
  gameState.keys[event.key.toLowerCase()] = false;
});

window.addEventListener('click', (event) => {
  if (player.health <= 0) return;

  const rect = canvas.getBoundingClientRect();
  const mouseX = (event.clientX - rect.left) + gameState.camera.x;
  const mouseY = (event.clientY - rect.top) + gameState.camera.y;
  const angle = Math.atan2(mouseY - player.y, mouseX - player.x);

  const weapon = WEAPONS[player.weapon];
  if (player.lastShot + (weapon?.cooldown || 0.4) < Date.now() / 1000) {
    fireProjectile(player.x, player.y, angle, player.weapon);
    player.lastShot = Date.now() / 1000;
    player.wantedLevel = Math.min(5, player.wantedLevel + 0.2);
  }
});

window.addEventListener('resize', resizeCanvas);

// Initialize
resizeCanvas();
spawnEnemy(800, 600, 'thug');
spawnEnemy(1500, 1200, 'gang');
spawnEnemy(3200, 1000, 'cop');
spawnVehicle(2500, 2000);
spawnVehicle(3600, 1500);
addMessage('Welcome to Urban Legends', '#4a9eff');
addMessage('Explore buildings, fight enemies, earn money', '#ffd700');

requestAnimationFrame(loop);
