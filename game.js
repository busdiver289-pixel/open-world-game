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
const vehicleEl = document.getElementById('vehicle');
const safehouseModal = document.getElementById('safehouse');
const contractTerminalModal = document.getElementById('contractTerminal');
const startRunBtn = document.getElementById('startRun');
const closeContractBtn = document.getElementById('closeContract');

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
  activeContracts: [],
  completedContracts: new Set(),
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
  isInVehicle: false,
  currentVehicle: null,
  takedownCooldown: 0,
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
  { name: 'Terminal - Docks', x: 500, y: 1100, w: 70, h: 60, type: 'terminal', faction: 'neutral', accessible: true, districtId: 0 },
  { name: 'Terminal - Neon', x: 2100, y: 900, w: 70, h: 60, type: 'terminal', faction: 'neutral', accessible: true, districtId: 1 },
  { name: 'Terminal - Industrial', x: 4000, y: 1600, w: 70, h: 60, type: 'terminal', faction: 'neutral', accessible: true, districtId: 2 },
];

const vehicles = [];
const guards = [];
const security = [
  { x: 2300, y: 900, type: 'camera', range: 250, isActive: true },
  { x: 1800, y: 400, type: 'drone', range: 300, isActive: true },
  { x: 4000, y: 1000, type: 'camera', range: 250, isActive: true },
];

const contracts = [
  { id: 1, title: 'Data Vault Heist', description: 'Infiltrate Neon Tower and steal corporate data', reward: 500, location: { x: 1800, y: 400 }, difficulty: 'Hard', type: 'infiltration' },
  { id: 2, title: 'Armored Car Hijack', description: 'Intercept cash transport at Docks', reward: 750, location: { x: 600, y: 800 }, difficulty: 'Extreme', type: 'hijack' },
  { id: 3, title: 'Power Grid Sabotage', description: 'Disable security systems in Industrial Zone', reward: 400, location: { x: 4000, y: 1600 }, difficulty: 'Medium', type: 'sabotage' },
  { id: 4, title: 'Evidence Plant', description: 'Frame rival gang at Police Precinct', reward: 300, location: { x: 2300, y: 900 }, difficulty: 'Hard', type: 'sabotage' },
  { id: 5, title: 'Black Market Deal', description: 'Retrieve stolen weapons cache at Sprawl', reward: 600, location: { x: 4200, y: 2800 }, difficulty: 'Medium', type: 'retrieval' },
];

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

function spawnVehicles() {
  vehicles.push({
    x: 1200,
    y: 1500,
    w: 60,
    h: 40,
    type: 'sedan',
    speed: 400,
    color: '#8b4513',
    angle: 0,
    velocity: { x: 0, y: 0 },
    health: 100,
    maxHealth: 100,
    occupant: null,
    isMoving: false,
  });
  vehicles.push({
    x: 3200,
    y: 2000,
    w: 70,
    h: 35,
    type: 'bike',
    speed: 500,
    color: '#ff6600',
    angle: 0,
    velocity: { x: 0, y: 0 },
    health: 60,
    maxHealth: 60,
    occupant: null,
    isMoving: false,
  });
}

function spawnGuards() {
  guards.push({
    x: 1800,
    y: 450,
    radius: 12,
    type: 'corporate',
    color: '#0066cc',
    health: 50,
    maxHealth: 50,
    patrol: true,
    aware: false,
    targetX: 1850,
    targetY: 450,
  });
  guards.push({
    x: 600,
    y: 850,
    radius: 12,
    type: 'gang',
    color: '#cc0000',
    health: 40,
    maxHealth: 40,
    patrol: true,
    aware: false,
    targetX: 650,
    targetY: 850,
  });
}

function hijackVehicle() {
  for (const vehicle of vehicles) {
    if (distance(player.x, player.y, vehicle.x, vehicle.y) < 50) {
      player.isInVehicle = true;
      player.currentVehicle = vehicle;
      vehicle.occupant = player;
      player.speed = vehicle.speed;
      addMessage(`HIJACKED ${vehicle.type.toUpperCase()}`, '#ffff00');
      recordPlayerAction(`hijacked-${vehicle.type}`);
      return;
    }
  }
}

function exitVehicle() {
  if (player.isInVehicle && player.currentVehicle) {
    player.isInVehicle = false;
    player.currentVehicle.occupant = null;
    player.currentVehicle = null;
    player.speed = 250;
    addMessage('Exited vehicle', '#00ffff');
  }
}

function performTakedown() {
  if (player.takedownCooldown > 0) return;

  for (const guard of guards) {
    const dist = distance(player.x, player.y, guard.x, guard.y);
    if (dist < 60 && !guard.aware) {
      // Silent takedown
      guard.health = 0;
      player.loot += 50; // Loot from guard
      player.takedownCooldown = 2;
      addMessage('Silent takedown successful', '#00ff00');
      recordPlayerAction('takedown');
      return;
    }
  }
}

function useEMP(delta) {
  if (player.empCooldown > 0) {
    player.empCooldown -= delta;
    return;
  }

  player.empCooldown = 8;
  const empRadius = 500;

  for (const sec of security) {
    if (distance(player.x, player.y, sec.x, sec.y) < empRadius) {
      sec.isActive = false;
      setTimeout(() => {
        sec.isActive = true;
      }, 30000);
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
  for (const building of buildings) {
    if (building.type === 'police') {
      const distToPolice = distance(player.x, player.y, building.x + building.w / 2, building.y + building.h / 2);
      if (distToPolice < 200) {
        if (player.identity === 'officer') {
          player.suspicion += delta * 5;
        } else {
          player.suspicion += delta * 20;
        }
      }
    }
  }

  const isMoving = gameState.keys['w'] || gameState.keys['a'] || gameState.keys['s'] || gameState.keys['d'];
  if (isMoving && player.suspicion < 100) {
    player.suspicion += delta * 2;
  }

  if (!isMoving && player.suspicion > 0) {
    player.suspicion -= delta * 5;
  }

  player.suspicion = Math.max(0, Math.min(100, player.suspicion));
}

function updateHeat() {
  if (player.suspicion > 80) {
    player.heat = 4;
  } else if (player.suspicion > 60) {
    player.heat = 3;
  } else if (player.suspicion > 40) {
    player.heat = 2;
  } else if (player.suspicion > 20) {
    player.heat = 1;
  } else {
    player.heat = 0;
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

    if (nextX > player.radius && nextX < WORLD.width - player.radius) {
      player.x = nextX;
    }
    if (nextY > player.radius && nextY < WORLD.height - player.radius) {
      player.y = nextY;
    }
  }

  if (player.isInVehicle && player.currentVehicle) {
    player.currentVehicle.x = player.x;
    player.currentVehicle.y = player.y;
  }

  recordPlayerAction(`pos-${Math.floor(player.x)}-${Math.floor(player.y)}`);
}

function updateGuards(delta) {
  for (const guard of guards) {
    if (guard.health <= 0) continue;

    const distToPlayer = distance(player.x, player.y, guard.x, guard.y);
    if (distToPlayer < 200) {
      guard.aware = true;
    }

    if (guard.aware) {
      const angle = Math.atan2(player.y - guard.y, player.x - guard.x);
      const speed = 150;
      guard.x += Math.cos(angle) * speed * delta;
      guard.y += Math.sin(angle) * speed * delta;
    } else {
      // Patrol behavior
      const dx = guard.targetX - guard.x;
      const dy = guard.targetY - guard.y;
      if (Math.hypot(dx, dy) < 10) {
        guard.targetX = 600 + Math.random() * 200;
        guard.targetY = 800 + Math.random() * 200;
      }
      const angle = Math.atan2(dy, dx);
      guard.x += Math.cos(angle) * 60 * delta;
      guard.y += Math.sin(angle) * 60 * delta;
    }
  }
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
    if (building.type === 'safehouse') {
      ctx.fillStyle = '#00ff00';
    } else if (building.type === 'terminal') {
      ctx.fillStyle = '#ffff00';
    } else if (building.faction === 'Police') {
      ctx.fillStyle = '#0066ff';
    } else {
      ctx.fillStyle = '#666';
    }

    ctx.fillRect(building.x, building.y, building.w, building.h);
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(building.x, building.y, building.w, building.h);

    ctx.fillStyle = '#000';
    ctx.font = '9px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText(building.name.split(' - ')[0], building.x + building.w / 2, building.y + building.h / 2);
  }

  // Draw vehicles
  for (const vehicle of vehicles) {
    ctx.save();
    ctx.translate(vehicle.x, vehicle.y);
    ctx.rotate(vehicle.angle);
    ctx.fillStyle = vehicle.color;
    ctx.fillRect(-vehicle.w / 2, -vehicle.h / 2, vehicle.w, vehicle.h);
    ctx.strokeStyle = '#ffff00';
    ctx.lineWidth = 1;
    ctx.strokeRect(-vehicle.w / 2, -vehicle.h / 2, vehicle.w, vehicle.h);
    ctx.restore();
  }

  // Draw guards
  for (const guard of guards) {
    if (guard.health <= 0) continue;
    ctx.fillStyle = guard.aware ? '#ff0000' : guard.color;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, guard.radius, 0, Math.PI * 2);
    ctx.fill();

    if (guard.aware) {
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(guard.x, guard.y, guard.radius + 10, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // Draw security
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
  vehicleEl.textContent = player.isInVehicle ? player.currentVehicle.type.toUpperCase() : 'On Foot';
}

function drawMinimap() {
  const minimapW = minimapCanvas.width;
  const minimapH = minimapCanvas.height;
  minimapCtx.fillStyle = 'rgba(10, 20, 40, 0.95)';
  minimapCtx.fillRect(0, 0, minimapW, minimapH);

  const sx = minimapW / WORLD.width;
  const sy = minimapH / WORLD.height;

  for (const district of districts) {
    minimapCtx.fillStyle = district.color;
    minimapCtx.fillRect(district.x * sx, district.y * sy, district.w * sx, district.h * sy);
  }

  for (const building of buildings) {
    minimapCtx.fillStyle = building.type === 'safehouse' ? '#00ff00' : '#888';
    minimapCtx.fillRect(building.x * sx, building.y * sy, building.w * sx, building.h * sy);
  }

  for (const vehicle of vehicles) {
    minimapCtx.fillStyle = vehicle.color;
    minimapCtx.fillRect(vehicle.x * sx - 3, vehicle.y * sy - 2, 6, 4);
  }

  minimapCtx.fillStyle = player.color;
  minimapCtx.beginPath();
  minimapCtx.arc(player.x * sx, player.y * sy, 4, 0, Math.PI * 2);
  minimapCtx.fill();
}

function distance(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

function showContractTerminal(terminalBuilding) {
  const contractList = document.getElementById('contractList');
  contractList.innerHTML = '';

  contracts.forEach(contract => {
    if (!gameState.completedContracts.has(contract.id)) {
      const div = document.createElement('div');
      div.className = 'contract-item';
      div.innerHTML = `
        <h4>${contract.title}</h4>
        <p>${contract.description}</p>
        <p>Difficulty: ${contract.difficulty}</p>
        <p class="contract-reward">Reward: $${contract.reward}</p>
      `;
      div.addEventListener('click', () => {
        gameState.activeContracts.push(contract);
        addMessage(`CONTRACT ACCEPTED: ${contract.title}`, '#00ff00');
        contractTerminalModal.classList.add('hidden');
        recordPlayerAction(`accepted-contract-${contract.id}`);
      });
      contractList.appendChild(div);
    }
  });

  contractTerminalModal.classList.remove('hidden');
}

function handleInteraction() {
  for (const building of buildings) {
    if (distance(player.x, player.y, building.x + building.w / 2, building.y + building.h / 2) < 100) {
      if (building.type === 'safehouse') {
        if (gameState.loopActive) {
          gameState.ghostReplays.push({
            loopNumber: gameState.loopNumber,
            actions: player.actionHistory,
          });
          gameState.persistentLoot += player.loot;
          addMessage(`LOOP ${gameState.loopNumber} SAVED - Loot recorded`, '#00ff00');
        }
        showSafehouse();
      } else if (building.type === 'terminal') {
        showContractTerminal(building);
      }
    }
  }
}

function showSafehouse() {
  gameState.loopActive = false;
  safehouseModal.classList.remove('hidden');

  const ghostList = document.getElementById('ghostList');
  ghostList.innerHTML = '';
  for (const replay of gameState.ghostReplays) {
    const div = document.createElement('div');
    div.textContent = `Loop ${replay.loopNumber}: ${replay.actions.length} actions recorded`;
    ghostList.appendChild(div);
  }

  document.getElementById('safehouseLoot').textContent = `$${Math.floor(gameState.persistentLoot)} from previous loops`;

  const activeContracts = document.getElementById('activeContracts');
  activeContracts.innerHTML = '';
  gameState.activeContracts.forEach(contract => {
    const div = document.createElement('div');
    div.textContent = `${contract.title} ($${contract.reward})`;
    activeContracts.appendChild(div);
  });
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
    addMessage('LOCKDOWN PROTOCOL ACTIVATED', '#ff0000');
    player.loot *= 0.5;
    handleInteraction();
  }

  updatePlayer(delta);
  updateGuards(delta);
  updateSuspicion(delta);
  updateHeat();
  updateCamera();
  player.takedownCooldown = Math.max(0, player.takedownCooldown - delta);
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
  if (key === 'f') hijackVehicle();
  if (key === 'e') handleInteraction();
  if (key === ' ') {
    event.preventDefault();
    performTakedown();
  }
});

window.addEventListener('keyup', (event) => {
  gameState.keys[event.key.toLowerCase()] = false;
});

window.addEventListener('resize', () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});

startRunBtn.addEventListener('click', startNewLoop);
closeContractBtn.addEventListener('click', () => {
  contractTerminalModal.classList.add('hidden');
});

// Initialize
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
spawnVehicles();
spawnGuards();
addMessage('Welcome to CHRONO SYNDICATE: NIGHTFALL', '#00ff96');
addMessage('F: Hijack vehicles | E: Interact | SPACE: Takedown', '#ffaa00');
showSafehouse();

requestAnimationFrame(loop);
