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
      if (state.phase === PHASE.PLAY) state.paused = !state.paused;
    }
  });

  document.addEventListener('keyup', (e) => {
    if (keyMap[e.key]) {
      input[keyMap[e.key]] = false;
      e.preventDefault();
    }
  });

  const state = {
    phase: PHASE.MENU,
    paused: false,
    level: 1,
    round: 1,
    rounds: LEVEL_ROUNDS[0],
    score: 0,
    lives: GAME.STARTING_LIVES,
    player: null,
    chickens: [],
    eggs: [],
    powerups: [],
    projectiles: [],
    missiles: [],
    particles: [],
    formation: { x: 0, y: 80, vx: 60, dir: 1 },
    starfield: new Starfield(W, H, 100),
    msgTimer: 0,
    eggRate: 1,
    powerupTimer: 0,
  };

  // Keep the entity array names in one place so cleanup/rendering loops stay in sync.
  const ENTITY_LISTS = ['projectiles', 'missiles', 'chickens', 'eggs', 'powerups', 'particles'];

  function showMessage(main, sub, time = 2.0) {
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
    if (state.player) {
      hudWeapon.textContent = `${state.player.weaponName()} (Lv${state.player.weaponLevel})`;
    } else {
      hudWeapon.textContent = 'Ion Pulse (Lv1)';
    }
    hudMissiles.textContent = state.player ? state.player.missiles : 0;
  }

  // ---------- Round/level setup ----------

  function startGame() {
    state.level = 1;
    state.round = 1;
    state.rounds = LEVEL_ROUNDS[0];
    state.score = 0;
    state.lives = GAME.STARTING_LIVES;
    state.player = new Player(W / 2, H - 70);
    state.player.missiles = GAME.STARTING_MISSILES;
    overlay.classList.add('hidden');
    enterLevelIntro();
  }

  function clearAllEntities() {
    for (const k of ENTITY_LISTS) state[k].length = 0;
  }

  // Drop everything in entity arrays whose .dead flag has been set this frame.
  function cleanupDead() {
    for (const k of ENTITY_LISTS) {
      state[k] = state[k].filter((x) => !x.dead);
    }
  }

  // Damage every chicken within `radius` of (x,y) and destroy nearby eggs.
  // Used for missile explosions; safe to call once per missile detonation.
  function applyAOE(x, y, radius, dmg) {
    const r2 = radius * radius;
    for (const ch of state.chickens) {
      if (ch.dead) continue;
      const dx = ch.x - x;
      const dy = ch.y - y;
      if (dx * dx + dy * dy < r2) {
        ch.hit(dmg);
        if (ch.dead) onChickenKilled(ch);
      }
    }
    for (const eg of state.eggs) {
      const dx = eg.x - x;
      const dy = eg.y - y;
      if (dx * dx + dy * dy < r2) eg.dead = true;
    }
  }

  function enterLevelIntro() {
    state.phase = PHASE.LEVEL_INTRO;
    state.rounds = LEVEL_ROUNDS[state.level - 1] || 8;
    clearAllEntities();
    showMessage(`LEVEL ${state.level}`, `${state.rounds} rounds — get ready!`, 2.0);
  }

  // Difficulty scales with both level/round AND the player's weapon power so
  // a fully-upgraded laser doesn't trivialize late levels.
  function chickenHp(baseTypeHp, lvl, rnd) {
    const weaponBoost = Math.max(0, (state.player ? state.player.weaponLevel : 1) - 2);
    return Math.max(1, Math.floor(baseTypeHp + lvl * 0.4 + rnd * 0.15 + weaponBoost));
  }

  function startRound() {
    state.phase = PHASE.PLAY;
    clearAllEntities();
    state.powerupTimer = Utils.rand(4, 8);

    const lvl = state.level;
    const rnd = state.round;
    const wlvl = state.player.weaponLevel;

    // Egg + sweep speed both creep up with level/round/weapon power.
    state.eggRate = 0.7 + lvl * 0.12 + rnd * 0.06 + Math.max(0, wlvl - 2) * 0.08;
    state.formation = {
      x: 0,
      y: 70,
      vx: 50 + lvl * 9 + rnd * 4 + Math.max(0, wlvl - 2) * 8,
      dir: 1,
      ampX: 60,
      bobT: 0,
    };

    if (rnd === state.rounds) {
      buildBossWave(lvl);
      showMessage(`BOSS — LEVEL ${state.level}`, `Defeat the Chicken Overlord!`, 1.6);
      return;
    }

    const totalDifficulty = lvl * 1.2 + rnd * 0.8;
    const cols = Utils.clamp(5 + Math.floor(totalDifficulty / 3), 5, 9);
    const rows = Utils.clamp(2 + Math.floor(totalDifficulty / 4), 2, 5);

    // Pick a wave theme so each round feels different.
    const themes = [THEME.MIXED];
    if (lvl >= 2) themes.push(THEME.FAST);
    if (lvl >= 3) themes.push(THEME.ARMORED);
    if (lvl >= 4) themes.push(THEME.MIXED);
    if (lvl >= 5) themes.push(THEME.KAMIKAZE);
    const theme = Utils.pick(themes);

    buildGrid(cols, rows, lvl, rnd, theme);

    // Sprinkles: bigs / kamikazes
    if (lvl >= 2 && Math.random() < 0.35) addBigChickens(1 + Math.floor(lvl / 2), lvl, rnd);
    if (lvl >= 5 && Math.random() < 0.4) addKamikazes(1 + Math.floor(lvl / 3), lvl);

    showMessage(`ROUND ${state.round}`, `Level ${state.level} — ${theme}`, 1.2);
  }

  function pickGridType(theme, lvl, c, r, cols) {
    // Rules per theme; falls back to normal.
    if (theme === THEME.FAST) {
      // alternating fast / normal stripes
      return r % 2 === 0 ? CHICKEN.FAST : CHICKEN.NORMAL;
    }
    if (theme === THEME.ARMORED) {
      // armored core with normals on the edges
      if (c >= 1 && c <= cols - 2 && r === 0) return CHICKEN.ARMORED;
      return CHICKEN.NORMAL;
    }
    if (theme === THEME.KAMIKAZE) {
      // a couple of kamikazes scattered in the back row
      if (r === 0 && (c === 1 || c === cols - 2)) return CHICKEN.KAMIKAZE;
      return CHICKEN.NORMAL;
    }
    if (theme === THEME.MIXED) {
      const roll = Math.random();
      if (lvl >= 4 && roll < 0.1) return CHICKEN.ARMORED;
      if (lvl >= 3 && roll < 0.25) return CHICKEN.FAST;
      if (lvl >= 5 && roll < 0.32) return CHICKEN.KAMIKAZE;
      return CHICKEN.NORMAL;
    }
    return CHICKEN.NORMAL;
  }

  function hpForType(type, lvl, rnd) {
    if (type === CHICKEN.ARMORED) return chickenHp(4, lvl, rnd);
    if (type === CHICKEN.FAST) return chickenHp(1, lvl, rnd);
    if (type === CHICKEN.KAMIKAZE) return chickenHp(2, lvl, rnd);
    if (type === CHICKEN.BIG) return chickenHp(5, lvl, rnd);
    return chickenHp(1, lvl, rnd);
  }

  function buildGrid(cols, rows, lvl, rnd, theme) {
    const spacingX = 60;
    const spacingY = 50;
    const startY = 80;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const type = pickGridType(theme, lvl, c, r, cols);
        const ch = new Chicken(0, 0, hpForType(type, lvl, rnd), type);
        ch.fx = c * spacingX - ((cols - 1) * spacingX) / 2;
        ch.fy = r * spacingY;
        state.chickens.push(ch);
      }
    }
    state.formation.x = W / 2;
    state.formation.y = startY;
  }

  function addBigChickens(n, lvl, rnd) {
    const spacingX = 90;
    for (let i = 0; i < n; i++) {
      const ch = new Chicken(0, 0, hpForType(CHICKEN.BIG, lvl, rnd), CHICKEN.BIG);
      ch.fx = (i - (n - 1) / 2) * spacingX;
      ch.fy = -30;
      state.chickens.push(ch);
    }
  }

  function addKamikazes(n, lvl) {
    for (let i = 0; i < n; i++) {
      const ch = new Chicken(0, 0, chickenHp(2, lvl, 1), CHICKEN.KAMIKAZE);
      ch.fx = Utils.rand(-180, 180);
      ch.fy = -50 + Utils.rand(-20, 20);
      state.chickens.push(ch);
    }
  }

  function buildBossWave(lvl) {
    const wlvl = state.player.weaponLevel;
    // Boss HP scales hard with level + weapon level so a maxed laser still has work to do.
    const bossHp = 60 + lvl * 30 + Math.max(0, wlvl - 2) * 25;
    const boss = new Chicken(0, 0, bossHp, CHICKEN.BOSS);
    boss.fx = 0;
    boss.fy = 30;
    state.chickens.push(boss);

    // Minion escort — count and toughness scale with level.
    const minionCols = 4 + Math.floor(lvl / 2);
    const spacingX = 60;
    for (let c = 0; c < minionCols; c++) {
      const minionType = lvl >= 4 && c % 3 === 1 ? CHICKEN.ARMORED : lvl >= 2 && c % 2 === 0 ? CHICKEN.FAST : CHICKEN.NORMAL;
      const m = new Chicken(0, 0, hpForType(minionType, lvl, 1), minionType);
      m.fx = (c - (minionCols - 1) / 2) * spacingX;
      m.fy = 130;
      state.chickens.push(m);
    }
    state.formation.x = W / 2;
    state.formation.y = 90;
  }

  function maybeSpawnPowerup(dt) {
    state.powerupTimer -= dt;
    if (state.powerupTimer <= 0) {
      state.powerupTimer = Utils.rand(7, 14);
      const x = Utils.rand(60, W - 60);
      const types = [];
      if (state.player.weaponLevel < state.player.maxWeaponLevel) types.push(POWERUP.LASER, POWERUP.LASER);
      types.push(POWERUP.LEG, POWERUP.LEG);
      if (state.lives < GAME.MAX_LIVES) types.push(POWERUP.HEART);
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
        if (state.phase === PHASE.LEVEL_INTRO) {
          startRound();
        } else if (state.phase === PHASE.ROUND_CLEAR) {
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
        } else if (state.phase === PHASE.GAME_OVER) {
          showMenu();
        } else if (state.phase === PHASE.VICTORY) {
          showMenu();
        }
      }
    }

    if (state.paused || state.phase !== PHASE.PLAY) {
      // still update particles for nice background
      for (const p of state.particles) p.update(dt);
      state.particles = state.particles.filter((p) => !p.dead);
      return;
    }

    const p = state.player;
    p.update(dt, input, bounds);
    if (input.fire) p.shoot(state.projectiles);
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

    const playerPos = { x: p.x, y: p.y };
    for (const ch of state.chickens) ch.update(dt, f, state.eggs, state.eggRate, playerPos);
    for (const e of state.eggs) e.update(dt, bounds);
    for (const pu of state.powerups) pu.update(dt, bounds);
    for (const l of state.projectiles) l.update(dt, bounds);
    for (const m of state.missiles) m.update(dt, bounds, state.particles);
    for (const pa of state.particles) pa.update(dt);

    // collisions: projectiles vs chickens (with piercing support)
    for (const l of state.projectiles) {
      if (l.dead) continue;
      for (const ch of state.chickens) {
        if (ch.dead) continue;
        if (l.hits && l.hits.has(ch)) continue;
        if (!Utils.rectsOverlap(l.rect, ch.rect)) continue;

        ch.hit(l.dmg);
        spawnExplosion(state.particles, l.x, l.y, '#ffaa66', 4, 100);
        if (ch.dead) onChickenKilled(ch);

        if (l.hits) l.hits.add(ch);
        if (l.pierce > 0) {
          l.pierce -= 1;
        } else {
          l.dead = true;
          break;
        }
      }
    }

    // missiles vs chickens (AOE on impact)
    for (const m of state.missiles) {
      if (m.dead) continue;
      for (const ch of state.chickens) {
        if (ch.dead) continue;
        if (!Utils.rectsOverlap(m.rect, ch.rect)) continue;

        spawnExplosion(state.particles, m.x, m.y, '#ff8800', 30, 320);
        spawnExplosion(state.particles, m.x, m.y, '#ffd34d', 18, 220);
        applyAOE(m.x, m.y, GAME.MISSILE_AOE_RADIUS, m.dmg);
        m.dead = true;
        break;
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
        spawnExplosion(state.particles, pu.x, pu.y, PowerUp.GLOW_COLOR[pu.type], 16, 180);
      }
    }

    cleanupDead();

    maybeSpawnPowerup(dt);

    // round complete?
    if (state.chickens.length === 0 && state.phase === PHASE.PLAY) {
      const bonus = GAME.ROUND_BONUS_PER_LEVEL * state.level;
      state.score += bonus;
      if (state.round >= state.rounds) {
        // level cleared
        const levelBonus = GAME.LEVEL_CLEAR_BONUS_PER_LEVEL * state.level;
        state.score += levelBonus;
        state.phase = PHASE.ROUND_CLEAR;
        showMessage(`LEVEL ${state.level} CLEAR!`, `Bonus +${bonus + levelBonus}`, 2.4);
      } else {
        state.phase = PHASE.ROUND_CLEAR;
        showMessage(`ROUND ${state.round} CLEAR`, `Bonus +${bonus}`, 1.6);
      }
    }

    updateHUD();
  }

  function applyPowerup(type) {
    const p = state.player;
    if (type === POWERUP.LEG) {
      p.missiles = Math.min(p.missiles + 2, GAME.MAX_MISSILES);
      state.score += GAME.POWERUP_SCORE.leg;
    } else if (type === POWERUP.LASER) {
      if (p.weaponLevel < p.maxWeaponLevel) {
        p.weaponLevel += 1;
        state.score += GAME.POWERUP_SCORE.laser;
      } else {
        state.score += GAME.POWERUP_SCORE.laser_max;
      }
    } else if (type === POWERUP.HEART) {
      state.lives = Math.min(state.lives + 1, GAME.MAX_LIVES);
      state.score += GAME.POWERUP_SCORE.heart;
    }
  }

  const POWERUP_DROP_CHANCE = { [CHICKEN.BOSS]: 1.0, [CHICKEN.BIG]: 0.5 };
  const POWERUP_DROP_WEIGHTS = {
    boss: { items: [POWERUP.LEG, POWERUP.LASER, POWERUP.HEART], weights: [3, 3, 2] },
    other: { items: [POWERUP.LEG, POWERUP.LASER, POWERUP.HEART], weights: [4, 3, 1] },
  };

  function onChickenKilled(ch) {
    state.score += ch.points;
    spawnFeathers(state.particles, ch.x, ch.y);
    spawnExplosion(state.particles, ch.x, ch.y, '#ffd34d', 8, 160);

    const dropChance = POWERUP_DROP_CHANCE[ch.type] ?? 0.06;
    if (Math.random() >= dropChance) return;

    const table = ch.type === CHICKEN.BOSS ? POWERUP_DROP_WEIGHTS.boss : POWERUP_DROP_WEIGHTS.other;
    const pick = Utils.weightedPick(table.items, table.weights);
    state.powerups.push(new PowerUp(ch.x, ch.y, pick));
  }

  function loseLife() {
    state.lives -= 1;
    spawnExplosion(state.particles, state.player.x, state.player.y, '#ff6644', 36, 320);
    if (state.lives <= 0) {
      gameOver();
      return;
    }
    state.player.respawn(W / 2, H - 70);
  }

  function gameOver() {
    state.phase = PHASE.GAME_OVER;
    showMessage(`GAME OVER`, `Score: ${state.score} — press to continue`, 3.0);
  }

  function enterVictory() {
    state.phase = PHASE.VICTORY;
    showMessage(`VICTORY!`, `You saved the galaxy! Score: ${state.score}`, 4.0);
  }

  function showMenu() {
    state.phase = PHASE.MENU;
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
    for (const l of state.projectiles) l.draw(ctx);
    for (const m of state.missiles) m.draw(ctx);

    if (state.player && state.phase !== PHASE.MENU) state.player.draw(ctx);

    for (const p of state.particles) p.draw(ctx);

    if (state.phase === PHASE.PLAY) renderBossHpBar();
    if (state.paused && state.phase === PHASE.PLAY) renderPauseOverlay();
  }

  function renderBossHpBar() {
    const boss = state.chickens.find((c) => c.type === CHICKEN.BOSS && !c.dead);
    if (!boss) return;

    const bw = 540;
    const bh = 14;
    const bx = (W - bw) / 2;
    const by = 70;
    const enraged = boss.phase === 2;

    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(bx - 4, by - 18, bw + 8, bh + 24);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(enraged ? 'CHICKEN OVERLORD — ENRAGED' : 'CHICKEN OVERLORD', W / 2, by - 4);
    ctx.fillStyle = '#400';
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = enraged ? '#ff4444' : '#ff8844';
    ctx.fillRect(bx, by, bw * Utils.clamp(boss.hp / boss.maxHp, 0, 1), bh);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, bw, bh);
  }

  function renderPauseOverlay() {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 32px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', W / 2, H / 2);
    ctx.font = '14px monospace';
    ctx.fillText('Press P to resume', W / 2, H / 2 + 30);
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
