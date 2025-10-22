const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const respawnBtn = document.getElementById("respawnBtn");

const playerImage = new Image();
playerImage.src = "character.png";
const enemyImage = new Image();
enemyImage.src = "enemy.png";
const cornerImage = new Image();
cornerImage.src = "corner-art.png";
const cornerLeftImage = new Image();
cornerLeftImage.src = "left-corner.png";

let gameRunning = false;
let gamePaused = false;
let showEndMessage = false;
let endMessage = "";

let typedEndMessage = "";
let typingIndex = 0;
let typingInProgress = false;

let enemyShootCooldown = 0;
let explosions = [];

const player = {
  x: 100,
  y: canvas.height - 200,
  width: 80,
  height: 160,
  velocityX: 0,
  velocityY: 0,
  onGround: true,
  health: 100,
  projectiles: [],
};

const enemy = {
  x: canvas.width - 180,
  y: canvas.height - 200,
  width: 80,
  height: 160,
  velocityX: 0,
  velocityY: 0,
  onGround: true,
  health: 100,
  projectiles: [],
  avoidCount: 0,
};

const keys = {};

function drawHealthBar(x, y, health) {
  ctx.fillStyle = "red";
  ctx.fillRect(x, y - 20, 80, 10);
  ctx.fillStyle = "green";
  ctx.fillRect(x, y - 20, 80 * (health / 100), 10);
  ctx.strokeStyle = "#fff";
  ctx.strokeRect(x, y - 20, 80, 10);
}

function drawCharacter(char, img) {
  ctx.drawImage(img, char.x, char.y, char.width, char.height);
  drawHealthBar(char.x, char.y, char.health);
}

function shootProjectile(from, direction) {
  return {
    x: from.x + from.width / 2,
    y: from.y + from.height / 2,
    radius: 8,
    speed: direction === "right" ? 8 : -8,
    owner: from,
  };
}

function createExplosion(x, y) {
  explosions.push({
    x,
    y,
    radius: 0,
    maxRadius: 30,
    alpha: 1,
  });
}

function drawExplosions() {
  explosions.forEach((exp, i) => {
    ctx.save();
    ctx.globalAlpha = exp.alpha;
    ctx.fillStyle = "orange";
    ctx.beginPath();
    ctx.arc(exp.x, exp.y, exp.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    exp.radius += 2;
    exp.alpha -= 0.05;

    if (exp.radius >= exp.maxRadius || exp.alpha <= 0) {
      explosions.splice(i, 1);
    }
  });
}

function updateCharacter(char) {
  if (!char.onGround) char.velocityY += 0.5;
  char.y += char.velocityY;
  char.x += char.velocityX;
  if (char.y + char.height >= canvas.height) {
    char.y = canvas.height - char.height;
    char.velocityY = 0;
    char.onGround = true;
  } else {
    char.onGround = false;
  }
}

function updateProjectiles() {
  for (let i = player.projectiles.length - 1; i >= 0; i--) {
    const p = player.projectiles[i];
    p.x += p.speed;

    for (let j = enemy.projectiles.length - 1; j >= 0; j--) {
      const e = enemy.projectiles[j];
      if (
        Math.abs(p.x - e.x) < p.radius + e.radius &&
        Math.abs(p.y - e.y) < p.radius + e.radius
      ) {
        createExplosion((p.x + e.x) / 2, (p.y + e.y) / 2);
        player.projectiles.splice(i, 1);
        enemy.projectiles.splice(j, 1);
        return;
      }
    }

    if (
      p.x > enemy.x &&
      p.x < enemy.x + enemy.width &&
      p.y > enemy.y &&
      p.y < enemy.y + enemy.height
    ) {
      if (enemy.avoidCount < 2) {
        enemy.x -= 30;
        enemy.avoidCount++;
      } else {
        enemy.health -= 20;
        createExplosion(p.x, p.y);
      }
      player.projectiles.splice(i, 1);
      return;
    }

    if (p.x < 0 || p.x > canvas.width) player.projectiles.splice(i, 1);
  }

  for (let i = enemy.projectiles.length - 1; i >= 0; i--) {
    const e = enemy.projectiles[i];
    e.x += e.speed;

    if (
      e.x > player.x &&
      e.x < player.x + player.width &&
      e.y > player.y &&
      e.y < player.y + player.height
    ) {
      player.health -= 20;
      createExplosion(e.x, e.y);
      enemy.projectiles.splice(i, 1);
      return;
    }

    if (e.x < 0 || e.x > canvas.width) enemy.projectiles.splice(i, 1);
  }
}

function drawProjectiles() {
  ctx.fillStyle = "red";
  [...player.projectiles, ...enemy.projectiles].forEach((proj) => {
    ctx.beginPath();
    ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawTitle() {
  ctx.save();
  ctx.fillStyle = "rgba(149, 228, 228, 0.95)";
  ctx.font = "bold 50px Arial";
  ctx.textAlign = "center";
  ctx.filter =
    "brightness(1.4) drop-shadow(0 0 10px rgba(243, 243, 243, 0.96))";
  ctx.shadowColor = "rgba(248, 248, 248, 0.4)";
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.shadowBlur = 10;
  ctx.fillText("Merlinio Playground", canvas.width / 2, 60);
  ctx.restore();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const cornerWidth = 500;
  const cornerHeight = (cornerImage.height / cornerImage.width) * cornerWidth;
  ctx.drawImage(
    cornerImage,
    canvas.width - cornerWidth,
    canvas.height - cornerHeight,
    cornerWidth,
    cornerHeight
  );

  const cornerLeftWidth = 500;
  const cornerLeftHeight =
    (cornerLeftImage.height / cornerLeftImage.width) * cornerLeftWidth;
  ctx.drawImage(
    cornerLeftImage,
    0,
    canvas.height - cornerLeftHeight,
    cornerLeftWidth,
    cornerLeftHeight
  );

  drawCharacter(player, playerImage);
  drawCharacter(enemy, enemyImage);
  drawProjectiles();
  drawExplosions();
  drawTitle();

  if (showEndMessage) {
    ctx.fillStyle = endMessage.includes("won") ? "grey" : "black";
    ctx.font = "bold 30px Arial";
    ctx.textAlign = "center";
    ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.shadowBlur = 10;
    ctx.fillText(typedEndMessage, canvas.width / 2, canvas.height / 2);
  }
}

function typeEndMessage() {
  if (!typingInProgress) return;
  if (typingIndex < endMessage.length) {
    typedEndMessage += endMessage.charAt(typingIndex);
    typingIndex++;
    draw();
    requestAnimationFrame(typeEndMessage);
  } else {
    typingInProgress = false;
    respawnBtn.style.display = "block";
  }
}

function update() {
  updateCharacter(player);
  updateCharacter(enemy);
  updateProjectiles();

  if (enemyShootCooldown <= 0 && enemy.projectiles.length === 0) {
    enemy.projectiles.push(shootProjectile(enemy, "left"));
    enemyShootCooldown = Math.max(30, 120 - (100 - player.health));
  } else {
    enemyShootCooldown--;
  }
}

function gameLoop() {
  if (!gameRunning || gamePaused) return;
  update();
  draw();
  if (player.health > 0 && enemy.health > 0) {
    requestAnimationFrame(gameLoop);
  } else {
    showEndMessage = true;
    endMessage =
      player.health <= 0 ? "Game over, you lost!" : "You won? howwww!";

    typedEndMessage = "";
    typingIndex = 0;
    typingInProgress = true;
    draw();
    typeEndMessage();
    gameRunning = false;
  }
}

startBtn.onclick = () => {
  gameRunning = true;
  gamePaused = false;
  showEndMessage = false;
  typedEndMessage = "";
  endMessage = "";
  typingIndex = 0;
  typingInProgress = false;
  respawnBtn.style.display = "none";
  gameLoop();
};

pauseBtn.onclick = () => {
  gamePaused = !gamePaused;
  if (!gamePaused) gameLoop();
};

respawnBtn.onclick = () => {
  player.health = 100;
  enemy.health = 100;
  player.projectiles = [];
  enemy.projectiles = [];
  explosions = [];
  player.x = 100;
  enemy.x = canvas.width - 180;
  player.velocityX = 0;
  player.velocityY = 0;
  enemy.velocityX = 0;
  enemy.velocityY = 0;
  enemy.avoidCount = 0;
  showEndMessage = false;
  endMessage = "";
  typedEndMessage = "";
  typingIndex = 0;
  typingInProgress = false;
  respawnBtn.style.display = "none";
  gameRunning = true;
  gamePaused = false;
  gameLoop();
};

window.addEventListener("keydown", (e) => {
  keys[e.key] = true;
  if (e.key === "ArrowRight") player.velocityX = 5;
  if (e.key === "ArrowLeft") player.velocityX = -5;
  if (e.key === "ArrowUp" && player.onGround) {
    player.velocityY = -15;
    player.onGround = false;
  }
  if (e.key === "a" && player.projectiles.length === 0) {
    player.projectiles.push(shootProjectile(player, "right"));
  }
});

window.addEventListener("keyup", (e) => {
  keys[e.key] = false;
  if (e.key === "ArrowRight" || e.key === "ArrowLeft") player.velocityX = 0;
});
