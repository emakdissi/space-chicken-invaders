'use strict';

(function () {
  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const bounds = { w: W, h: H };

  const hudLevel = document.getElementById('hud-level');
  const hudRound = document.getElementById('hud-round');
  const hudRounds = document.getElementById('hud-rounds');
  const hudScore = document.getElementById('hud-score');
  const hudLives = document.getElementById('hud-lives');
  const hudWeapon = document.getElementById('hud-weapon');
  const hudMissiles = document.getElementById('hud-missiles');
  const overlay = document.getElementById('overlay');
  const overlayPanel = overlay.querySelector('.panel');
  const startBtn = document.getElementById('start-btn');
  const messageEl = document.getElementById('message');

  const LEVEL_ROUNDS = [3, 4, 4, 5, 5, 6, 6, 7, 7, 8];
  const TOTAL_LEVELS = LEVEL_ROUNDS.length;

  const input = { left: false, right: false, up: false, down: false, fire: false, missile: false };

  const keyMap = {
    ArrowLeft: 'left', a: 'left', A: 'left',
    ArrowRight: 'right', d: 'right', D: 'right',
    ArrowUp: 'up', w: 'up', W: 'up',
    ArrowDown: 'down', s: 'down', S: 'down',
    ' ': 'fire',
    x: 'missile', X: 'missile',
  };

  document.addEventListener('keydown', (e) => {
    if (keyMap[e.key]) {
      input[keyMap[e.key]] = true;
      e.preventDefault();
    }
    if (e.key === 'p' || e.key === 'P') {
      if (state.phase === 'play') state.paused = !state.paused;
    }
  });

  document.addEventListener('keyup', (e) => {
    if (keyMap[e.key]) {
      input[keyMap[e.key]] = false;
      e.preventDefault();
    }
  });

  const state = {
    phase: 'menu', // menu | play | levelIntro | roundClear | levelClear | gameOver | victory
    paused: false,
    level: 1,
    round: 1,
    rounds: 3,
    score: 0,
    lives: 3,
    player: null,
    chickens: [],
    eggs: [],
    powerups: [],
    lasers: [],
    missiles: [],
    particles: [],
    formation: { x: 0, y: 80, vx: 60, dir: 1 },
    starfield: new Starfield(W, H, 100),
    msgTimer: 0,
    msgMain: '',
    msgSub: '',
    spawnQueue: [],
    spawnTimer: 0,
    eggRate: 1,
    powerupTimer: 0,
  };

  function showMessage(main, sub, time = 2.0) {
    state.msgMain = main;
    state.msgSub = sub;
    state.msgTimer = time;
    messageEl.innerHTML = main + (sub ? `<span class="sub">${sub}</span>` : '');
    messageEl.classList.remove('hidden');
  }

  function hideMessage() {
    messageEl.classList.add('hidden');
    state.msgTimer = 0;
  }

  function updateHUD() {
    hudLevel.textContent = state.level;
    hudRound.textContent = state.round;
    hudRounds.textContent = state.rounds;
    hudScore.textContent = state.score;
    hudLives.textContent = state.lives;
    hudWeapon.textContent = 'Lv ' + (state.player ? state.player.weaponLevel : 1);
    hudMissiles.textContent = state.player ? state.player.missiles : 0;
  }

  // ---------- Round/level setup ----------

  function startGame() {
    state.level = 1;
    state.round = 1;
    state.rounds = LEVEL_ROUNDS[0];
    state.score = 0;
    state.lives = 3;
    state.player = new Player(W / 2, H - 70);
    state.player.missiles = 3;
    overlay.classList.add('hidden');
    enterLevelIntro();
  }

  function enterLevelIntro() {
    state.phase = 'levelIntro';
    state.rounds = LEVEL_ROUNDS[state.level - 1] || 8;
    state.chickens.length = 0;
    state.eggs.length = 0;
    state.powerups.length = 0;
    state.lasers.length = 0;
    state.missiles.length = 0;
    state.particles.length = 0;
    showMessage(`LEVEL ${state.level}`, `${state.rounds} rounds — get ready!`, 2.0);
  }

  function startRound() {
    state.phase = 'play';
    state.chickens.length = 0;
    state.eggs.length = 0;
    state.powerups.length = 0;
    state.spawnQueue.length = 0;
    state.spawnTimer = 0;
    state.powerupTimer = Utils.rand(4, 8);

    const lvl = state.level;
    const rnd = state.round;

    state.eggRate = 0.7 + lvl * 0.12 + rnd * 0.06;
    state.formation = {
      x: 0,
      y: 70,
      vx: 50 + lvl * 8 + rnd * 4,
      dir: 1,
      ampX: 60,
      bobT: 0,
    };

    const totalDifficulty = lvl * 1.2 + rnd * 0.8;

    let cols, rows, type;
    const r = Utils.rand(0, 1);

    if (rnd === state.rounds) {
      // boss round
      buildBossWave(lvl);
    } else if (lvl >= 3 && r < 0.25) {
      cols = 5;
      rows = 2;
      type = 'big';
      buildGrid(cols, rows, type, Math.max(2, Math.floor(2 + lvl * 0.6)));
    } else {
      cols = Utils.clamp(5 + Math.floor(totalDifficulty / 3), 5, 9);
      rows = Utils.clamp(2 + Math.floor(totalDifficulty / 4), 2, 5);
      type = 'normal';
      const hp = Math.max(1, Math.floor(1 + lvl * 0.3));
      buildGrid(cols, rows, type, hp);
      // chance for big chickens mixed in
      if (lvl >= 2 && Math.random() < 0.4) addBigChickens(1 + Math.floor(lvl / 2));
    }

    showMessage(`ROUND ${state.round}`, `Level ${state.level}`, 1.2);
  }

  function buildGrid(cols, rows, type, hp) {
    const spacingX = 60;
    const spacingY = 50;
    const startX = (W - (cols - 1) * spacingX) / 2;
    const startY = 80;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const ch = new Chicken(startX + c * spacingX, startY + r * spacingY, hp, type);
        ch.fx = c * spacingX - ((cols - 1) * spacingX) / 2;
        ch.fy = r * spacingY;
        state.chickens.push(ch);
      }
    }
    state.formation.x = W / 2;
    state.formation.y = startY;
  }

  function addBigChickens(n) {
    const spacingX = 90;
    const startX = (W - (n - 1) * spacingX) / 2;
    for (let i = 0; i < n; i++) {
      const ch = new Chicken(startX + i * spacingX, 50, 5 + state.level, 'big');
      ch.fx = (startX + i * spacingX) - W / 2;
      ch.fy = -30;
      state.chickens.push(ch);
    }
  }

  function buildBossWave(lvl) {
    const bossHp = 30 + lvl * 18;
    const ch = new Chicken(W / 2, 100, bossHp, 'boss');
    ch.w = 70;
    ch.h = 60;
    ch.fx = 0;
    ch.fy = 30;
    ch.swayAmp = 80;
    ch.bobAmp = 18;
    state.chickens.push(ch);

    // a few minions
    const minionCols = 4 + Math.floor(lvl / 2);
    const spacingX = 60;
    const startX = (W - (minionCols - 1) * spacingX) / 2;
    for (let c = 0; c < minionCols; c++) {
      const m = new Chicken(startX + c * spacingX, 180, 1 + Math.floor(lvl / 2), 'normal');
      m.fx = c * spacingX - ((minionCols - 1) * spacingX) / 2;
      m.fy = 100;
      state.chickens.push(m);
    }
    state.formation.x = W / 2;
    state.formation.y = 70;
  }

  function maybeSpawnPowerup(dt) {
    state.powerupTimer -= dt;
    if (state.powerupTimer <= 0) {
      state.powerupTimer = Utils.rand(7, 14);
      const x = Utils.rand(60, W - 60);
      const types = [];
      if (state.player.weaponLevel < state.player.maxWeaponLevel) types.push('laser', 'laser');
      types.push('leg', 'leg');
      if (state.lives < 5) types.push('heart');
      if (Math.random() < 0.85) {
        state.powerups.push(new PowerUp(x, -20, Utils.pick(types)));
      }
    }
  }

  // ---------- Update ----------

  function update(dt) {
    state.starfield.update(dt);

    if (state.msgTimer > 0) {
      state.msgTimer -= dt;
      if (state.msgTimer <= 0) {
        hideMessage();
        if (state.phase === 'levelIntro') {
          startRound();
        } else if (state.phase === 'roundClear') {
          state.round += 1;
          if (state.round > state.rounds) {
            state.round = 1;
            state.level += 1;
            if (state.level > TOTAL_LEVELS) {
              enterVictory();
              return;
            }
            enterLevelIntro();
          } else {
            startRound();
          }
        } else if (state.phase === 'gameOver') {
          showMenu();
        } else if (state.phase === 'victory') {
          showMenu();
        }
      }
    }

    if (state.paused || state.phase !== 'play') {
      // still update particles for nice background
      for (const p of state.particles) p.update(dt);
      state.particles = state.particles.filter((p) => !p.dead);
      return;
    }

    const p = state.player;
    p.update(dt, input, bounds);
    if (input.fire) p.shoot(state.lasers);
    if (input.missile) p.launchMissile(state.missiles);

    // formation movement
    const f = state.formation;
    f.bobT = (f.bobT || 0) + dt;
    f.x += f.vx * f.dir * dt;
    if (f.x > W - 80) {
      f.dir = -1;
      f.y += 12;
    } else if (f.x < 80) {
      f.dir = 1;
      f.y += 12;
    }
    if (f.y > H - 240) f.y = H - 240;

    for (const ch of state.chickens) ch.update(dt, f, state.eggs, state.eggRate);
    for (const e of state.eggs) e.update(dt, bounds);
    for (const pu of state.powerups) pu.update(dt, bounds);
    for (const l of state.lasers) l.update(dt, bounds);
    for (const m of state.missiles) m.update(dt, bounds, state.particles);
    for (const pa of state.particles) pa.update(dt);

    // collisions: lasers vs chickens
    for (const l of state.lasers) {
      if (l.dead) continue;
      for (const ch of state.chickens) {
        if (ch.dead) continue;
        if (Utils.rectsOverlap(l.rect, ch.rect)) {
          ch.hit(l.dmg);
          l.dead = true;
          spawnExplosion(state.particles, l.x, l.y, '#ffaa66', 4, 100);
          if (ch.dead) onChickenKilled(ch);
          break;
        }
      }
    }

    // missiles vs chickens (AOE)
    for (const m of state.missiles) {
      if (m.dead) continue;
      for (const ch of state.chickens) {
        if (ch.dead) continue;
        if (Utils.rectsOverlap(m.rect, ch.rect)) {
          // AOE explosion
          const ex = m.x;
          const ey = m.y;
          spawnExplosion(state.particles, ex, ey, '#ff8800', 30, 320);
          spawnExplosion(state.particles, ex, ey, '#ffd34d', 18, 220);
          for (const t of state.chickens) {
            if (t.dead) continue;
            const dx = t.x - ex;
            const dy = t.y - ey;
            if (dx * dx + dy * dy < 80 * 80) {
              t.hit(m.dmg);
              if (t.dead) onChickenKilled(t);
            }
          }
          // also destroy nearby eggs
          for (const eg of state.eggs) {
            const dx = eg.x - ex;
            const dy = eg.y - ey;
            if (dx * dx + dy * dy < 80 * 80) eg.dead = true;
          }
          m.dead = true;
          break;
        }
      }
    }

    // eggs vs player
    for (const e of state.eggs) {
      if (e.dead) continue;
      if (Utils.rectsOverlap(e.rect, p.rect)) {
        e.dead = true;
        spawnExplosion(state.particles, e.x, e.y, '#fff8e0', 10, 160);
        if (p.hit()) loseLife();
      }
    }

    // chickens vs player (collision)
    for (const ch of state.chickens) {
      if (ch.dead) continue;
      if (Utils.rectsOverlap(ch.rect, p.rect)) {
        spawnFeathers(state.particles, ch.x, ch.y);
        ch.hit(99);
        if (ch.dead) onChickenKilled(ch);
        if (p.hit()) loseLife();
      }
    }

    // powerups vs player
    for (const pu of state.powerups) {
      if (pu.dead) continue;
      if (Utils.rectsOverlap(pu.rect, p.rect)) {
        pu.dead = true;
        applyPowerup(pu.type);
        spawnExplosion(state.particles, pu.x, pu.y, pickPuColor(pu.type), 16, 180);
      }
    }

    // cleanup
    state.lasers = state.lasers.filter((x) => !x.dead);
    state.missiles = state.missiles.filter((x) => !x.dead);
    state.chickens = state.chickens.filter((x) => !x.dead);
    state.eggs = state.eggs.filter((x) => !x.dead);
    state.powerups = state.powerups.filter((x) => !x.dead);
    state.particles = state.particles.filter((x) => !x.dead);

    maybeSpawnPowerup(dt);

    // round complete?
    if (state.chickens.length === 0 && state.phase === 'play') {
      const bonus = 100 * state.level;
      state.score += bonus;
      if (state.round >= state.rounds) {
        // level cleared
        const levelBonus = 500 * state.level;
        state.score += levelBonus;
        state.phase = 'roundClear';
        showMessage(`LEVEL ${state.level} CLEAR!`, `Bonus +${bonus + levelBonus}`, 2.4);
      } else {
        state.phase = 'roundClear';
        showMessage(`ROUND ${state.round} CLEAR`, `Bonus +${bonus}`, 1.6);
      }
    }

    updateHUD();
  }

  function pickPuColor(t) {
    if (t === 'leg') return '#ffaa66';
    if (t === 'laser') return '#88ffaa';
    return '#ff6688';
  }

  function applyPowerup(type) {
    const p = state.player;
    if (type === 'leg') {
      p.missiles = Math.min(p.missiles + 2, 99);
      state.score += 50;
    } else if (type === 'laser') {
      if (p.weaponLevel < p.maxWeaponLevel) {
        p.weaponLevel += 1;
        state.score += 100;
      } else {
        state.score += 250;
      }
    } else if (type === 'heart') {
      state.lives = Math.min(state.lives + 1, 5);
      state.score += 75;
    }
  }

  function onChickenKilled(ch) {
    state.score += ch.points;
    spawnFeathers(state.particles, ch.x, ch.y);
    spawnExplosion(state.particles, ch.x, ch.y, '#ffd34d', 8, 160);

    // chance to drop a powerup
    const dropChance = ch.type === 'boss' ? 1 : ch.type === 'big' ? 0.5 : 0.06;
    if (Math.random() < dropChance) {
      const types = ['leg', 'laser', 'heart'];
      const weights = ch.type === 'boss' ? [3, 3, 2] : [4, 3, 1];
      const total = weights.reduce((a, b) => a + b, 0);
      let r = Math.random() * total;
      let pick = 'leg';
      for (let i = 0; i < types.length; i++) {
        r -= weights[i];
        if (r <= 0) {
          pick = types[i];
          break;
        }
      }
      state.powerups.push(new PowerUp(ch.x, ch.y, pick));
    }
  }

  function loseLife() {
    state.lives -= 1;
    spawnExplosion(state.particles, state.player.x, state.player.y, '#ff6644', 36, 320);
    if (state.lives <= 0) {
      gameOver();
      return;
    }
    // ship survives — punishment: weapon level drops by one
    const keptMissiles = state.player.missiles;
    const keptLevel = Math.max(1, state.player.weaponLevel - 1);
    state.player = new Player(W / 2, H - 70);
    state.player.weaponLevel = keptLevel;
    state.player.missiles = keptMissiles;
    state.player.invuln = 2.0;
  }

  function gameOver() {
    state.phase = 'gameOver';
    showMessage(`GAME OVER`, `Score: ${state.score} — press to continue`, 3.0);
  }

  function enterVictory() {
    state.phase = 'victory';
    showMessage(`VICTORY!`, `You saved the galaxy! Score: ${state.score}`, 4.0);
  }

  function showMenu() {
    state.phase = 'menu';
    overlay.classList.remove('hidden');
    overlayPanel.querySelector('h1').textContent = state.score > 0 ? 'GAME COMPLETE' : 'SPACE CHICKEN INVADERS';
    startBtn.textContent = state.score > 0 ? 'PLAY AGAIN' : 'START GAME';
    hideMessage();
  }

  // ---------- Render ----------

  function render() {
    ctx.clearRect(0, 0, W, H);

    // background gradient
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#050018');
    grad.addColorStop(1, '#000');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    state.starfield.draw(ctx);

    for (const pu of state.powerups) pu.draw(ctx);
    for (const ch of state.chickens) ch.draw(ctx);
    for (const e of state.eggs) e.draw(ctx);
    for (const l of state.lasers) l.draw(ctx);
    for (const m of state.missiles) m.draw(ctx);

    if (state.player && state.phase !== 'menu') state.player.draw(ctx);

    for (const p of state.particles) p.draw(ctx);

    if (state.paused && state.phase === 'play') {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 32px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('PAUSED', W / 2, H / 2);
      ctx.font = '14px monospace';
      ctx.fillText('Press P to resume', W / 2, H / 2 + 30);
    }
  }

  // ---------- Loop ----------

  let last = performance.now();
  function loop(now) {
    const dt = Math.min((now - last) / 1000, 1 / 30);
    last = now;
    update(dt);
    render();
    requestAnimationFrame(loop);
  }

  startBtn.addEventListener('click', () => {
    startGame();
  });

  // ensure HUD shows initial values
  updateHUD();
  requestAnimationFrame(loop);
})();
