const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const minimapCanvas = document.getElementById('minimap');
const minimapCtx = minimapCanvas.getContext('2d');
const messagesEl = document.getElementById('messages');
const loopTimeEl = document.getElementById('loopTime');
const identityEl = document.getElementById('identity');
const suspicionBarEl = document.getElementById('suspicionBar');
const heatEl = document.getElementById('heat');
const lootEl = document.getElementById('loot');
const safehouseModal = document.getElementById('safehouse');
const startRunBtn = document.getElementById('startRun');

const WORLD = {
  width: 5600,
  height: 3800,
};

const LOOP_DURATION = 900; // 15 minutes in seconds
const IDENTITIES = {
  enforcer: { name: 'Enforcer', color: '#ff3333', accessLevel: 1 },
  officer: { name: 'Officer', color: '#0066ff', accessLevel: 2 },
  fixer: { name: 'Fixer', color: '#ffaa00', accessLevel: 0 },
};

const HEAT_LEVELS = ['None', 'Low', 'Medium', 'High', 'CRITICAL'];

let gameState = {
  camera: { x: 0, y: 0 },
  keys: {},
  lastTime: 0,
  messages: [],
  loopNumber: 1,
  loopStartTime: 0,
  loopActive: false,
  ghostReplays: [],
  persistentLoot: 0,
};

const player = {
  x: 2800,
  y: 1900,
  radius: 14,
  speed: 250,
  color: '#ffaa00',
  health: 100,
  maxHealth: 100,
  loot: 0,
  suspicion: 0,
  heat: 0,
  identity: 'fixer',
  direction: { x: 1, y: 0 },
  actionHistory: [],
  empCooldown: 0,
  isInCover: false,
};

const districts = [
  { name: 'The Docks', x: 400, y: 500, w: 1000, h: 800, faction: 'Harvesters', color: '#1a3a4a' },
  { name: 'Neon Plaza', x: 1600, y: 200, w: 1200, h: 900, faction: 'Neon Serpents', color: '#2a1a4a' },
  { name: 'Industrial Zone', x: 3400, y: 600, w: 1200, h: 1000, faction: 'Iron Syndicate', color: '#3a2a1a' },
  { name: 'Uptown', x: 2000, y: 1800, w: 1400, h: 1000, faction: 'Corporate Security', color: '#1a3a2a' },
  { name: 'The Sprawl', x: 3600, y: 2200, w: 1400, h: 1200, faction: 'Street Runners', color: '#3a3a1a' },
];

const buildings = [
  { name: 'Safehouse', x: 2700, y: 1850, w: 80, h: 80, type: 'safehouse', faction: 'neutral', accessible: true },
  { name: 'Neon Tower', x: 1800, y: 400, w: 120, h: 150, type: 'corp', faction: 'Corporate', accessible: false },
  { name: 'Harvesters Den', x: 600, y: 800, w: 100, h: 100, type: 'gang', faction: 'Harvesters', accessible: false },
  { name: 'Police Precinct', x: 2300, y: 900, w: 130, h: 140, type: 'police', faction: 'Police', accessible: false },
  { name: 'Weapon Cache', x: 4000, y: 1000, w: 100, h: 80, type: 'cache', faction: 'neutral', accessible: false },
  { name: 'Neon Club', x: 1700, y: 1200, w: 110, h: 110, type: 'gang', faction: 'Neon Serpents', accessible: false },
  { name: 'Iron Warehouse', x: 3800, y: 1400, w: 150, h: 120, type: 'storage', faction: 'Iron Syndicate', accessible: false },
];

const security = [
  { x: 2300, y: 900, type: 'camera', range: 250, isActive: true },
  { x: 1800, y: 400, type: 'drone', range: 300, isActive: true },
  { x: 4000, y: 1000, type: 'camera', range: 250, isActive: true },
];

const enemies = [];
const projectiles = [];

function addMessage(text, color = '#00ffff') {
  const msg = document.createElement('div');
  msg.textContent = text;
  msg.style.color = color;
  messagesEl.appendChild(msg);
  gameState.messages.push({ text, time: Date.now() });

  setTimeout(() => {
    if (msg.parentElement) msg.remove();
  }, 6000);
}

function recordPlayerAction(action) {
  player.actionHistory.push({
    time: gameState.loopStartTime ? Date.now() - gameState.loopStartTime : 0,
    x: player.x,
    y: player.y,
    action: action,
  });
}

function spawnGhostReplays() {
  // Replay past actions as semi-transparent ghosts
  const ghostColor = 'rgba(0, 255, 150, 0.2)';
  
  for (const replay of gameState.ghostReplays) {
    for (const action of replay.actions) {
      if (Math.abs(action.time - (Date.now() - gameState.loopStartTime)) < 500) {
        ctx.fillStyle = ghostColor;
        ctx.beginPath();
        ctx.arc(action.x - gameState.camera.x, action.y - gameState.camera.y, 10, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

function useEMP(delta) {
  if (player.empCooldown > 0) {
    player.empCooldown -= delta;
    return;
  }

  player.empCooldown = 8; // 8 second cooldown
  const empRadius = 500;

  // Disable security in radius
  for (const sec of security) {
    if (distance(player.x, player.y, sec.x, sec.y) < empRadius) {
      sec.isActive = false;
      setTimeout(() => {
        sec.isActive = true;
      }, 30000); // Re-enable after 30 seconds
    }
  }

  addMessage('EMP DEPLOYED', '#ffff00');
  recordPlayerAction('emp-deployed');
}

function changeIdentity(newIdentity) {
  player.identity = newIdentity;
  player.color = IDENTITIES[newIdentity].color;
  player.suspicion = 0;
  addMessage(`Identity switched to ${IDENTITIES[newIdentity].name}`, '#ffaa00');
  recordPlayerAction(`identity-${newIdentity}`);
}

function updateSuspicion(delta) {
  // Suspicion increases when in police zones or acting suspicious
  for (const building of buildings) {
    if (building.type === 'police') {
      const distToPolice = distance(player.x, player.y, building.x + building.w / 2, building.y + building.h / 2);
      if (distToPolice < 200) {
        if (player.identity === 'officer') {
          player.suspicion += delta * 5; // Slower increase as officer
        } else {
          player.suspicion += delta * 20; // Faster increase if not officer
        }
      }
    }
  }

  // Movement or running increases suspicion
  const isMoving = gameState.keys['w'] || gameState.keys['a'] || gameState.keys['s'] || gameState.keys['d'];
  if (isMoving && player.suspicion < 100) {
    player.suspicion += delta * 2;
  }

  // Decay suspicion over time
  if (!isMoving && player.suspicion > 0) {
    player.suspicion -= delta * 5;
  }

  player.suspicion = Math.max(0, Math.min(100, player.suspicion));
}

function updateHeat() {
  if (player.suspicion > 80) {
    player.heat = 4; // CRITICAL
  } else if (player.suspicion > 60) {
    player.heat = 3; // High
  } else if (player.suspicion > 40) {
    player.heat = 2; // Medium
  } else if (player.suspicion > 20) {
    player.heat = 1; // Low
  } else {
    player.heat = 0; // None
  }
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

    // Simple boundary check
    if (nextX > player.radius && nextX < WORLD.width - player.radius) {
      player.x = nextX;
    }
    if (nextY > player.radius && nextY < WORLD.height - player.radius) {
      player.y = nextY;
    }
  }

  recordPlayerAction(`pos-${Math.floor(player.x)}-${Math.floor(player.y)}`);
}

function updateCamera() {
  gameState.camera.x = Math.max(0, Math.min(player.x - window.innerWidth / 2, WORLD.width - window.innerWidth));
  gameState.camera.y = Math.max(0, Math.min(player.y - window.innerHeight / 2, WORLD.height - window.innerHeight));
}

function drawWorld() {
  ctx.save();
  ctx.translate(-gameState.camera.x, -gameState.camera.y);

  // Draw districts
  for (const district of districts) {
    ctx.fillStyle = district.color;
    ctx.fillRect(district.x, district.y, district.w, district.h);
    ctx.strokeStyle = '#00ff96';
    ctx.lineWidth = 2;
    ctx.strokeRect(district.x, district.y, district.w, district.h);

    ctx.fillStyle = '#00ff96';
    ctx.font = 'bold 14px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText(district.name, district.x + district.w / 2, district.y + 25);
  }

  // Draw buildings
  for (const building of buildings) {
    ctx.fillStyle = building.type === 'safehouse' ? '#00ff00' : building.faction === 'Police' ? '#0066ff' : '#666';
    ctx.fillRect(building.x, building.y, building.w, building.h);
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(building.x, building.y, building.w, building.h);

    ctx.fillStyle = '#fff';
    ctx.font = '10px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText(building.name, building.x + building.w / 2, building.y + building.h / 2);
  }

  // Draw security cameras and drones
  for (const sec of security) {
    ctx.strokeStyle = sec.isActive ? '#ff0000' : '#333333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sec.x, sec.y, sec.range, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = sec.isActive ? '#ff0000' : '#333333';
    ctx.beginPath();
    ctx.arc(sec.x, sec.y, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw ghost replays
  spawnGhostReplays();

  // Draw player
  ctx.fillStyle = player.color;
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.strokeRect(player.x - player.radius, player.y - player.radius, player.radius * 2, player.radius * 2);

  ctx.restore();
}

function drawHUD() {
  const timeInLoop = gameState.loopStartTime ? (Date.now() - gameState.loopStartTime) / 1000 : 0;
  const minutes = Math.floor(timeInLoop / 60);
  const seconds = Math.floor(timeInLoop % 60);
  loopTimeEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  identityEl.textContent = IDENTITIES[player.identity].name;
  suspicionBarEl.style.width = player.suspicion + '%';
  heatEl.textContent = HEAT_LEVELS[player.heat];
  lootEl.textContent = '$' + Math.floor(gameState.persistentLoot + player.loot);
}

function drawMinimap() {
  const minimapW = minimapCanvas.width;
  const minimapH = minimapCanvas.height;
  minimapCtx.fillStyle = 'rgba(10, 20, 40, 0.95)';
  minimapCtx.fillRect(0, 0, minimapW, minimapH);

  const sx = minimapW / WORLD.width;
  const sy = minimapH / WORLD.height;

  // Districts
  for (const district of districts) {
    minimapCtx.fillStyle = district.color;
    minimapCtx.fillRect(district.x * sx, district.y * sy, district.w * sx, district.h * sy);
  }

  // Buildings
  for (const building of buildings) {
    minimapCtx.fillStyle = building.type === 'safehouse' ? '#00ff00' : '#888';
    minimapCtx.fillRect(building.x * sx, building.y * sy, building.w * sx, building.h * sy);
  }

  // Player
  minimapCtx.fillStyle = player.color;
  minimapCtx.beginPath();
  minimapCtx.arc(player.x * sx, player.y * sy, 4, 0, Math.PI * 2);
  minimapCtx.fill();
}

function distance(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

function handleInteraction() {
  for (const building of buildings) {
    if (distance(player.x, player.y, building.x + building.w / 2, building.y + building.h / 2) < 100) {
      if (building.type === 'safehouse') {
        // Save ghost replay if loop active
        if (gameState.loopActive) {
          gameState.ghostReplays.push({
            loopNumber: gameState.loopNumber,
            actions: player.actionHistory,
          });
          gameState.persistentLoot += player.loot;
          addMessage(`LOOP ${gameState.loopNumber} SAVED - Loot recorded`, '#00ff00');
        }
        // Show safehouse modal
        showSafehouse();
      }
    }
  }
}

function showSafehouse() {
  gameState.loopActive = false;
  safehouseModal.classList.remove('hidden');
  
  // Populate ghost list
  const ghostList = document.getElementById('ghostList');
  ghostList.innerHTML = '';
  for (const replay of gameState.ghostReplays) {
    const div = document.createElement('div');
    div.textContent = `Loop ${replay.loopNumber}: ${replay.actions.length} actions recorded`;
    ghostList.appendChild(div);
  }

  // Show persistent loot
  document.getElementById('safehouseLoot').textContent = `$${Math.floor(gameState.persistentLoot)} from previous loops`;
}

function startNewLoop() {
  safehouseModal.classList.add('hidden');
  gameState.loopNumber += 1;
  gameState.loopStartTime = Date.now();
  gameState.loopActive = true;
  player.actionHistory = [];
  player.loot = 0;
  player.suspicion = 0;
  addMessage(`LOOP ${gameState.loopNumber} INITIATED`, '#00ff96');
}

function update(delta) {
  if (!gameState.loopActive) return;

  const timeInLoop = (Date.now() - gameState.loopStartTime) / 1000;
  if (timeInLoop > LOOP_DURATION) {
    // Loop time expired - force return to safehouse
    addMessage('LOCKDOWN PROTOCOL ACTIVATED', '#ff0000');
    player.loot *= 0.5; // Lose half loot if not back in time
    handleInteraction(); // Try to reach safehouse
  }

  updatePlayer(delta);
  updateSuspicion(delta);
  updateHeat();
  updateCamera();
}

function loop(timestamp) {
  const delta = Math.min((timestamp - gameState.lastTime) / 1000 || 0.016, 0.033);
  gameState.lastTime = timestamp;

  update(delta);
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  drawWorld();
  drawMinimap();
  drawHUD();

  requestAnimationFrame(loop);
}

// Input handling
window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  gameState.keys[key] = true;

  if (key === '1') changeIdentity('enforcer');
  if (key === '2') changeIdentity('officer');
  if (key === '3') changeIdentity('fixer');
  if (key === 'f') useEMP(0);
  if (key === 'e') handleInteraction();
});

window.addEventListener('keyup', (event) => {
  gameState.keys[event.key.toLowerCase()] = false;
});

window.addEventListener('resize', () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});

startRunBtn.addEventListener('click', startNewLoop);

// Initialize
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
addMessage('Welcome to CHRONO SYNDICATE: NIGHTFALL', '#00ff96');
addMessage('Reach the safehouse to save your run and start a new loop', '#00ffff');
addMessage('Press 1-3 to change identity, F for EMP, E to interact', '#ffaa00');
showSafehouse();

requestAnimationFrame(loop);
