const game = document.getElementById("game");
const healthValue = document.getElementById("healthValue");
const scoreValue = document.getElementById("scoreValue");
const itemsValue = document.getElementById("itemsValue");
const levelValue = document.getElementById("levelValue");
const message = document.getElementById("message");

const WORLD = {
  width: 960,
  height: 540,
  gravity: 0.55,
  playerSpeed: 4.4,
  jumpForce: 11.8,
  stompBounce: 8.4,
  enemyBaseSpeed: 1.7,
  transformDuration: 5,
};

const LEVELS = [
  {
    platforms: [
      { x: 0, y: 430, width: 960, height: 110 },
      { x: 130, y: 350, width: 160, height: 18 },
      { x: 360, y: 285, width: 140, height: 18 },
      { x: 565, y: 235, width: 120, height: 18 },
      { x: 735, y: 330, width: 145, height: 18 },
    ],
    items: [
      { x: 170, y: 318 },
      { x: 405, y: 253 },
      { x: 605, y: 203 },
      { x: 775, y: 298 },
      { x: 890, y: 398 },
    ],
    enemies: [
      { x: 250, y: 402 },
      { x: 520, y: 402 },
      { x: 690, y: 207 },
    ],
    goldenBox: { x: 830, y: 298 },
    playerSpawn: { x: 42, y: 380 },
  },
  {
    platforms: [
      { x: 0, y: 430, width: 960, height: 110 },
      { x: 70, y: 300, width: 160, height: 18 },
      { x: 290, y: 365, width: 120, height: 18 },
      { x: 420, y: 230, width: 150, height: 18 },
      { x: 635, y: 305, width: 120, height: 18 },
      { x: 775, y: 190, width: 110, height: 18 },
    ],
    items: [
      { x: 110, y: 268 },
      { x: 335, y: 333 },
      { x: 470, y: 198 },
      { x: 675, y: 273 },
      { x: 810, y: 158 },
      { x: 900, y: 398 },
    ],
    enemies: [
      { x: 220, y: 402 },
      { x: 490, y: 402 },
      { x: 665, y: 277 },
      { x: 820, y: 158 },
    ],
    goldenBox: { x: 520, y: 198 },
    playerSpawn: { x: 32, y: 380 },
  },
  {
    platforms: [
      { x: 0, y: 430, width: 960, height: 110 },
      { x: 85, y: 355, width: 120, height: 18 },
      { x: 250, y: 285, width: 140, height: 18 },
      { x: 430, y: 345, width: 120, height: 18 },
      { x: 585, y: 255, width: 155, height: 18 },
      { x: 790, y: 315, width: 120, height: 18 },
    ],
    items: [
      { x: 115, y: 323 },
      { x: 290, y: 253 },
      { x: 470, y: 313 },
      { x: 630, y: 223 },
      { x: 830, y: 283 },
      { x: 905, y: 398 },
    ],
    enemies: [
      { x: 210, y: 402 },
      { x: 380, y: 257 },
      { x: 610, y: 223 },
      { x: 840, y: 283 },
      { x: 730, y: 402 },
    ],
    goldenBox: { x: 165, y: 323 },
    playerSpawn: { x: 36, y: 380 },
  },
];

const keys = new Set();
let animationId = 0;
let lastTimestamp = 0;
let gameState;

function createEntity(className, width, height) {
  const node = document.createElement("div");
  node.className = `entity ${className}`;
  node.style.width = `${width}px`;
  node.style.height = `${height}px`;
  game.appendChild(node);
  return node;
}

function createPlatform(platform) {
  const node = document.createElement("div");
  node.className = "platform";
  node.style.left = `${platform.x}px`;
  node.style.top = `${platform.y}px`;
  node.style.width = `${platform.width}px`;
  node.style.height = `${platform.height}px`;
  game.appendChild(node);
  return node;
}

function intersects(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function setPosition(entity) {
  entity.node.style.transform = `translate(${entity.x}px, ${entity.y}px)`;
}

function showMessage(text) {
  message.textContent = text;
  message.classList.remove("hidden");
}

function hideMessage() {
  message.classList.add("hidden");
}

function updateHud() {
  healthValue.textContent = Math.max(0, Math.ceil(gameState.player.health));
  scoreValue.textContent = gameState.score;
  itemsValue.textContent = gameState.items.filter((item) => !item.collected).length;
  levelValue.textContent = gameState.levelNumber;
}

function enemySpeedForLevel(levelIndex) {
  return WORLD.enemyBaseSpeed + levelIndex * 0.65;
}

function applyEnemyAppearance(enemy) {
  enemy.node.className = `entity ${enemy.state === "friendly" ? "item" : "enemy"}`;
}

function buildLevel(levelIndex) {
  const template = LEVELS[levelIndex % LEVELS.length];

  game.innerHTML = "";
  hideMessage();

  const platforms = template.platforms.map((platform) => {
    createPlatform(platform);
    return platform;
  });

  const items = template.items.map((item) => ({
    ...item,
    width: 24,
    height: 24,
    collected: false,
    node: createEntity("item", 24, 24),
  }));

  const enemySpeed = enemySpeedForLevel(levelIndex);
  const enemies = template.enemies.map((enemy, index) => {
    const entity = {
      ...enemy,
      width: 26,
      height: 26,
      vx: index % 2 === 0 ? enemySpeed : -enemySpeed,
      vy: 0,
      directionTimer: 0.9 + Math.random(),
      squished: false,
      state: "hostile",
      transformedUntil: 0,
      node: createEntity("enemy", 26, 26),
    };
    return entity;
  });

  const goldenBox = {
    ...template.goldenBox,
    width: 24,
    height: 24,
    active: true,
    cooldownUntil: 0,
    node: createEntity("golden", 24, 24),
  };

  const player = {
    x: template.playerSpawn.x,
    y: template.playerSpawn.y,
    width: 30,
    height: 30,
    vx: 0,
    vy: 0,
    health: gameState ? gameState.player.health : 100,
    onGround: false,
    invulnerableUntil: 0,
    node: createEntity("player", 30, 30),
  };

  gameState = {
    levelIndex,
    levelNumber: levelIndex + 1,
    platforms,
    items,
    enemies,
    goldenBox,
    player,
    score: gameState ? gameState.score : 0,
    running: true,
    time: 0,
  };

  setPosition(player);
  items.forEach(setPosition);
  enemies.forEach(setPosition);
  setPosition(goldenBox);
  updateHud();
}

function resetGame() {
  cancelAnimationFrame(animationId);
  lastTimestamp = 0;
  keys.clear();
  gameState = null;
  buildLevel(0);
  animationId = requestAnimationFrame(loop);
}

function applyPlatformCollisions(entity) {
  entity.onGround = false;

  for (const platform of gameState.platforms) {
    const nextBounds = {
      x: entity.x,
      y: entity.y,
      width: entity.width,
      height: entity.height,
    };

    if (!intersects(nextBounds, platform)) {
      continue;
    }

    const entityBottom = entity.y + entity.height;
    const entityTop = entity.y;
    const entityRight = entity.x + entity.width;
    const entityLeft = entity.x;

    const platformBottom = platform.y + platform.height;
    const platformRight = platform.x + platform.width;

    const overlapBottom = platformBottom - entityTop;
    const overlapTop = entityBottom - platform.y;
    const overlapRight = entityRight - platform.x;
    const overlapLeft = platformRight - entityLeft;
    const smallestOverlap = Math.min(overlapBottom, overlapTop, overlapRight, overlapLeft);

    if (smallestOverlap === overlapTop && entity.vy >= 0) {
      entity.y = platform.y - entity.height;
      entity.vy = 0;
      entity.onGround = true;
    } else if (smallestOverlap === overlapBottom && entity.vy < 0) {
      entity.y = platformBottom;
      entity.vy = 0;
    } else if (smallestOverlap === overlapRight && entity.vx > 0) {
      entity.x = platform.x - entity.width;
      entity.vx *= -0.85;
    } else if (smallestOverlap === overlapLeft && entity.vx < 0) {
      entity.x = platformRight;
      entity.vx *= -0.85;
    }
  }
}

function updatePlayer() {
  const player = gameState.player;
  player.vx = 0;

  if (keys.has("ArrowLeft") || keys.has("KeyA")) {
    player.vx = -WORLD.playerSpeed;
  }

  if (keys.has("ArrowRight") || keys.has("KeyD")) {
    player.vx = WORLD.playerSpeed;
  }

  if ((keys.has("ArrowUp") || keys.has("Space") || keys.has("KeyW")) && player.onGround) {
    player.vy = -WORLD.jumpForce;
    player.onGround = false;
  }

  player.vy += WORLD.gravity;
  player.x += player.vx;
  player.y += player.vy;

  player.x = Math.max(0, Math.min(WORLD.width - player.width, player.x));

  if (player.y > WORLD.height) {
    player.health = 0;
  }

  applyPlatformCollisions(player);
  setPosition(player);
}

function updateEnemies(deltaSeconds) {
  const speedMultiplier = enemySpeedForLevel(gameState.levelIndex);

  for (const enemy of gameState.enemies) {
    if (enemy.squished) {
      continue;
    }

    if (enemy.state === "friendly" && gameState.time >= enemy.transformedUntil) {
      enemy.state = "hostile";
      applyEnemyAppearance(enemy);
    }

    enemy.directionTimer -= deltaSeconds;

    if (enemy.directionTimer <= 0) {
      enemy.directionTimer = 0.45 + Math.random() * 1.2;
      enemy.vx = (Math.random() * speedMultiplier + speedMultiplier * 0.55) * (Math.random() < 0.5 ? -1 : 1);

      if (Math.random() < 0.24 + gameState.levelIndex * 0.03) {
        enemy.vy = -7.8 - gameState.levelIndex * 0.35;
      }
    }

    enemy.vy += WORLD.gravity;
    enemy.x += enemy.vx;
    enemy.y += enemy.vy;

    if (enemy.x < 0 || enemy.x + enemy.width > WORLD.width) {
      enemy.x = Math.max(0, Math.min(WORLD.width - enemy.width, enemy.x));
      enemy.vx *= -1;
    }

    applyPlatformCollisions(enemy);
    setPosition(enemy);
  }
}

function handleItemCollection() {
  const player = gameState.player;

  for (const item of gameState.items) {
    if (item.collected) {
      continue;
    }

    if (intersects(player, item)) {
      item.collected = true;
      item.node.remove();
      gameState.score += 10;
    }
  }
}

function handleGoldenBox() {
  const player = gameState.player;
  const goldenBox = gameState.goldenBox;

  if (!goldenBox.active && gameState.time >= goldenBox.cooldownUntil) {
    goldenBox.active = true;
    goldenBox.node.classList.remove("hidden");
  }

  if (goldenBox.active && intersects(player, goldenBox)) {
    goldenBox.active = false;
    goldenBox.cooldownUntil = gameState.time + WORLD.transformDuration + 2;
    goldenBox.node.classList.add("hidden");

    for (const enemy of gameState.enemies) {
      if (enemy.squished) {
        continue;
      }

      enemy.state = "friendly";
      enemy.transformedUntil = gameState.time + WORLD.transformDuration;
      applyEnemyAppearance(enemy);
    }
  }
}

function handleEnemyInteractions() {
  const player = gameState.player;

  for (const enemy of gameState.enemies) {
    if (enemy.squished || !intersects(player, enemy)) {
      continue;
    }

    if (enemy.state === "friendly") {
      enemy.squished = true;
      enemy.node.remove();
      gameState.score += 15;
      continue;
    }

    const playerBottom = player.y + player.height;
    const stompWindow = enemy.y + 10;
    const fallingOntoEnemy = player.vy > 1.5 && playerBottom - player.vy <= stompWindow;

    if (fallingOntoEnemy) {
      enemy.squished = true;
      enemy.node.remove();
      player.vy = -WORLD.stompBounce;
      gameState.score += 20;
      continue;
    }

    if (gameState.time >= player.invulnerableUntil) {
      player.health -= 15;
      player.invulnerableUntil = gameState.time + 1.1;
      player.vx = enemy.x < player.x ? 6 : -6;
      player.vy = -6;
    }
  }
}

function completeLevel() {
  const nextLevelIndex = gameState.levelIndex + 1;
  gameState.running = false;
  showMessage(`Level ${gameState.levelNumber} cleared! Get ready for Level ${gameState.levelNumber + 1}...`);

  window.setTimeout(() => {
    if (!gameState || gameState.running) {
      return;
    }

    buildLevel(nextLevelIndex);
  }, 1500);
}

function checkEndState() {
  const remainingItems = gameState.items.filter((item) => !item.collected).length;
  const remainingFriendlyEnemies = gameState.enemies.filter(
    (enemy) => !enemy.squished && enemy.state === "friendly"
  ).length;

  if (remainingItems === 0 && remainingFriendlyEnemies === 0) {
    completeLevel();
  } else if (gameState.player.health <= 0) {
    gameState.running = false;
    showMessage(`Game over on Level ${gameState.levelNumber}. Final score: ${gameState.score}. Press R to try again.`);
  }
}

function loop(timestamp) {
  if (!lastTimestamp) {
    lastTimestamp = timestamp;
  }

  const deltaSeconds = Math.min((timestamp - lastTimestamp) / 1000, 0.03);
  lastTimestamp = timestamp;
  gameState.time += deltaSeconds;

  if (gameState.running) {
    updatePlayer();
    updateEnemies(deltaSeconds);
    handleItemCollection();
    handleGoldenBox();
    handleEnemyInteractions();
    updateHud();
    checkEndState();
  }

  animationId = requestAnimationFrame(loop);
}

window.addEventListener("keydown", (event) => {
  if (event.code === "KeyR") {
    resetGame();
    return;
  }

  const controlledKeys = ["ArrowLeft", "ArrowRight", "ArrowUp", "Space", "KeyA", "KeyD", "KeyW"];

  if (controlledKeys.includes(event.code)) {
    event.preventDefault();
    keys.add(event.code);
  }
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.code);
});

game.style.width = `${WORLD.width}px`;
game.style.maxWidth = "100%";
resetGame();
