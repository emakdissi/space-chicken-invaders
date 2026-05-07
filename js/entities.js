'use strict';

class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.w = 48;
    this.h = 40;
    this.speed = 360;
    this.weaponLevel = 1;
    this.maxWeaponLevel = GAME.MAX_WEAPON_LEVEL;
    this.missiles = 0;
    this.fireCd = 0;
    this.missileCd = 0;
    this.invuln = 0;
    this.dead = false;
    this.flash = 0;
  }

  get rect() {
    return { x: this.x - this.w / 2, y: this.y - this.h / 2, w: this.w, h: this.h };
  }

  update(dt, input, bounds) {
    let dx = 0;
    let dy = 0;
    if (input.left) dx -= 1;
    if (input.right) dx += 1;
    if (input.up) dy -= 1;
    if (input.down) dy += 1;
    if (dx !== 0 && dy !== 0) {
      dx *= 0.7071;
      dy *= 0.7071;
    }
    this.x += dx * this.speed * dt;
    this.y += dy * this.speed * dt;
    this.x = Utils.clamp(this.x, this.w / 2, bounds.w - this.w / 2);
    this.y = Utils.clamp(this.y, this.h / 2 + 40, bounds.h - this.h / 2);

    this.fireCd -= dt;
    this.missileCd -= dt;
    this.invuln -= dt;
    this.flash -= dt;
  }

  shoot(projectiles) {
    if (this.fireCd > 0) return;
    const cooldownByLvl = [0, 0.22, 0.20, 0.22, 0.18, 0.14];
    this.fireCd = cooldownByLvl[this.weaponLevel] || 0.1;

    const lvl = this.weaponLevel;
    if (lvl === 1) {
      // Ion Pulse — single yellow pellet
      projectiles.push(new IonShot(this.x, this.y - 22));
    } else if (lvl === 2) {
      // Twin Laser — two crimson beams
      projectiles.push(new LaserBeam(this.x - 10, this.y - 22));
      projectiles.push(new LaserBeam(this.x + 10, this.y - 22));
    } else if (lvl === 3) {
      // Plasma Cannon — 3 plasma orbs in a fan
      projectiles.push(new PlasmaOrb(this.x, this.y - 26, 0));
      projectiles.push(new PlasmaOrb(this.x - 12, this.y - 18, -150));
      projectiles.push(new PlasmaOrb(this.x + 12, this.y - 18, 150));
    } else if (lvl === 4) {
      // Lightning Stream — 2 piercing zigzag bolts
      projectiles.push(new Lightning(this.x - 8, this.y - 22));
      projectiles.push(new Lightning(this.x + 8, this.y - 22));
    } else {
      // Photon Storm — wide piercing beam + escort spread
      projectiles.push(new PhotonBeam(this.x, this.y - 28));
      projectiles.push(new IonShot(this.x - 22, this.y - 14, -260, -640));
      projectiles.push(new IonShot(this.x + 22, this.y - 14, 260, -640));
    }
  }

  weaponName() {
    const names = ['', 'Ion Pulse', 'Twin Laser', 'Plasma Cannon', 'Lightning Stream', 'Photon Storm'];
    return names[this.weaponLevel] || '???';
  }

  launchMissile(projectiles) {
    if (this.missileCd > 0 || this.missiles <= 0) return;
    this.missileCd = 0.25;
    this.missiles -= 1;
    projectiles.push(new Missile(this.x, this.y - 24));
  }

  hit() {
    if (this.invuln > 0) return false;
    this.invuln = GAME.PLAYER_INVULN_AFTER_HIT;
    this.flash = 0.6;
    return true;
  }

  // Bring the ship back from the dead — keeps missiles, drops one weapon tier
  // as a soft penalty, and grants a longer invuln window than a normal hit.
  respawn(x, y) {
    this.x = x;
    this.y = y;
    this.weaponLevel = Math.max(1, this.weaponLevel - 1);
    this.fireCd = 0;
    this.missileCd = 0;
    this.invuln = GAME.PLAYER_INVULN_AFTER_RESPAWN;
    this.flash = 0;
    this.dead = false;
  }

  draw(ctx) {
    if (this.invuln > 0 && Math.floor(this.invuln * 12) % 2 === 0) return;

    const x = this.x;
    const y = this.y;

    // engine flames
    const t = performance.now() / 60;
    const flameLen = 14 + Math.sin(t) * 4;
    ctx.fillStyle = '#ff8800';
    ctx.beginPath();
    ctx.moveTo(x - 10, y + 14);
    ctx.lineTo(x, y + 14 + flameLen);
    ctx.lineTo(x + 10, y + 14);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffe060';
    ctx.beginPath();
    ctx.moveTo(x - 5, y + 14);
    ctx.lineTo(x, y + 14 + flameLen * 0.6);
    ctx.lineTo(x + 5, y + 14);
    ctx.closePath();
    ctx.fill();

    // body
    const bodyColor = this.flash > 0 ? '#fff' : '#cfd8ff';
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.moveTo(x, y - 20);
    ctx.lineTo(x - 22, y + 14);
    ctx.lineTo(x + 22, y + 14);
    ctx.closePath();
    ctx.fill();

    // wings
    ctx.fillStyle = '#5a78d8';
    ctx.beginPath();
    ctx.moveTo(x - 22, y + 14);
    ctx.lineTo(x - 28, y + 6);
    ctx.lineTo(x - 14, y + 8);
    ctx.lineTo(x - 14, y + 14);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + 22, y + 14);
    ctx.lineTo(x + 28, y + 6);
    ctx.lineTo(x + 14, y + 8);
    ctx.lineTo(x + 14, y + 14);
    ctx.closePath();
    ctx.fill();

    // cockpit
    ctx.fillStyle = '#88e0ff';
    ctx.beginPath();
    ctx.arc(x, y - 2, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x - 1, y - 4, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // nose accent
    ctx.fillStyle = '#ffd34d';
    ctx.fillRect(x - 1, y - 18, 2, 4);
  }
}

// Base projectile — covers movement, off-screen cleanup, and pierce bookkeeping.
class Projectile {
  constructor(x, y, vx, vy, w, h, dmg) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.w = w;
    this.h = h;
    this.dmg = dmg;
    this.dead = false;
    this.pierce = 0; // how many extra hits beyond the first this projectile gets
    this.hits = null; // Set of chickens already hit (for piercing weapons)
  }

  get rect() {
    return { x: this.x - this.w / 2, y: this.y - this.h / 2, w: this.w, h: this.h };
  }

  update(dt, bounds) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (
      this.y < -40 ||
      this.y > bounds.h + 40 ||
      this.x < -40 ||
      this.x > bounds.w + 40
    ) {
      this.dead = true;
    }
  }
}

// Tier 1 — Ion Pulse: small yellow pellet
class IonShot extends Projectile {
  constructor(x, y, vx = 0, vy = -720) {
    super(x, y, vx, vy, 6, 12, 1);
  }
  draw(ctx) {
    ctx.shadowColor = '#ffd34d';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#ffaa00';
    ctx.fillRect(this.x - 3, this.y - 6, 6, 12);
    ctx.fillStyle = '#fff7c0';
    ctx.fillRect(this.x - 1, this.y - 6, 2, 12);
    ctx.shadowBlur = 0;
  }
}

// Tier 2 — Twin Laser: thin crimson beams
class LaserBeam extends Projectile {
  constructor(x, y) {
    super(x, y, 0, -780, 4, 20, 2);
  }
  draw(ctx) {
    ctx.shadowColor = '#ff3344';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#ff3344';
    ctx.fillRect(this.x - 2, this.y - 10, 4, 20);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(this.x - 0.5, this.y - 10, 1, 20);
    ctx.shadowBlur = 0;
  }
}

// Tier 3 — Plasma Cannon: pulsing purple orbs
class PlasmaOrb extends Projectile {
  constructor(x, y, vx) {
    super(x, y, vx, -560, 16, 16, 3);
    this.t = Math.random() * 6;
  }
  update(dt, bounds) {
    this.t += dt;
    super.update(dt, bounds);
  }
  draw(ctx) {
    const r = 8 + Math.sin(this.t * 18) * 1.5;
    ctx.shadowColor = '#cc66ff';
    ctx.shadowBlur = 16;
    ctx.fillStyle = '#aa44dd';
    ctx.beginPath();
    ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffaaff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, r * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

// Tier 4 — Lightning Stream: piercing zigzag bolts
class Lightning extends Projectile {
  constructor(x, y) {
    super(x, y, 0, -700, 10, 30, 2);
    this.pierce = 2;
    this.hits = new Set();
    this.t = Math.random() * 100;
  }
  update(dt, bounds) {
    this.t += dt;
    super.update(dt, bounds);
  }
  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    const segments = 6;
    const offset = Math.sin(this.t * 30);
    // outer halo
    ctx.shadowColor = '#aaeeff';
    ctx.shadowBlur = 14;
    ctx.strokeStyle = '#88ddff';
    ctx.lineWidth = 5;
    ctx.globalAlpha = 0.45;
    ctx.beginPath();
    for (let i = 0; i <= segments; i++) {
      const py = -15 + (i / segments) * 30;
      const px = (i % 2 === 0 ? 1 : -1) * 5 + offset * 2;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    // bright core
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= segments; i++) {
      const py = -15 + (i / segments) * 30;
      const px = (i % 2 === 0 ? 1 : -1) * 5 + offset * 2;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();
  }
}

// Tier 5 — Photon Storm: fat blue beam, pierces everything
class PhotonBeam extends Projectile {
  constructor(x, y) {
    super(x, y, 0, -880, 18, 40, 5);
    this.pierce = 99;
    this.hits = new Set();
    this.t = 0;
  }
  update(dt, bounds) {
    this.t += dt;
    super.update(dt, bounds);
  }
  draw(ctx) {
    ctx.shadowColor = '#66ddff';
    ctx.shadowBlur = 20;
    ctx.fillStyle = '#3388ff';
    ctx.fillRect(this.x - 9, this.y - 20, 18, 40);
    ctx.fillStyle = '#88eeff';
    ctx.fillRect(this.x - 5, this.y - 20, 10, 40);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(this.x - 2, this.y - 20, 4, 40);
    // sparkles
    const s = Math.sin(this.t * 40) * 7;
    ctx.fillStyle = '#fff';
    ctx.fillRect(this.x - 9 + s, this.y - 14, 2, 2);
    ctx.fillRect(this.x + 7 - s, this.y + 10, 2, 2);
    ctx.shadowBlur = 0;
  }
}

class Missile {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = -260;
    this.w = 8;
    this.h = 22;
    this.dmg = 8;
    this.dead = false;
    this.trailTimer = 0;
  }

  get rect() {
    return { x: this.x - this.w / 2, y: this.y - this.h / 2, w: this.w, h: this.h };
  }

  update(dt, bounds, particles) {
    this.vy -= 600 * dt;
    if (this.vy < -800) this.vy = -800;
    this.y += this.vy * dt;
    this.x += this.vx * dt;

    this.trailTimer -= dt;
    if (this.trailTimer <= 0 && particles) {
      this.trailTimer = 0.02;
      particles.push(
        new Particle(
          this.x + Utils.rand(-2, 2),
          this.y + 12,
          Utils.rand(-30, 30),
          Utils.rand(60, 140),
          0.4,
          Utils.pick(['#ff8800', '#ffd34d', '#fff']),
          Utils.rand(2, 4),
        ),
      );
    }

    if (this.y < -30) this.dead = true;
  }

  draw(ctx) {
    const x = this.x;
    const y = this.y;
    ctx.fillStyle = '#cccccc';
    ctx.fillRect(x - 3, y - 8, 6, 16);
    ctx.fillStyle = '#ff3333';
    ctx.beginPath();
    ctx.moveTo(x, y - 14);
    ctx.lineTo(x - 3, y - 8);
    ctx.lineTo(x + 3, y - 8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#888';
    ctx.fillRect(x - 5, y + 5, 2, 5);
    ctx.fillRect(x + 3, y + 5, 2, 5);
  }
}

class Chicken {
  constructor(x, y, hp, type = CHICKEN.NORMAL) {
    this.x = x;
    this.y = y;
    this.hx = x;
    this.hy = y;
    this.hp = hp;
    this.maxHp = hp;
    this.type = type;
    this.t = Math.random() * Math.PI * 2;
    this.eggCd = Utils.rand(2, 5);
    this.dead = false;
    this.bobAmp = Utils.rand(8, 16);
    this.bobSpd = Utils.rand(1.4, 2.6);
    this.swayAmp = Utils.rand(20, 60);
    this.swaySpd = Utils.rand(0.6, 1.2);

    // Type-specific stats / sizing
    if (type === CHICKEN.FAST) {
      this.w = 30;
      this.h = 28;
      this.swayAmp *= 1.6;
      this.swaySpd *= 1.5;
      this.bobSpd *= 1.4;
      this.points = 40;
    } else if (type === CHICKEN.ARMORED) {
      this.w = 42;
      this.h = 38;
      this.swaySpd *= 0.6;
      this.swayAmp *= 0.6;
      this.points = 120;
    } else if (type === CHICKEN.KAMIKAZE) {
      this.w = 36;
      this.h = 34;
      this.points = 90;
      this.diveCd = Utils.rand(4, 8);
      this.diving = false;
      this.diveVx = 0;
      this.diveVy = 0;
    } else if (type === CHICKEN.BIG) {
      this.w = 50;
      this.h = 46;
      this.points = 80;
    } else if (type === CHICKEN.BOSS) {
      this.w = 110;
      this.h = 100;
      this.points = 1500;
      this.bobAmp = 12;
      this.bobSpd = 1.6;
      this.swayAmp = 90;
      this.swaySpd = 0.7;
      this.attackCd = 1.6;
      this.phase = 1;
    } else {
      this.w = 38;
      this.h = 34;
      this.points = 25;
    }
  }

  get rect() {
    return { x: this.x - this.w / 2, y: this.y - this.h / 2, w: this.w, h: this.h };
  }

  update(dt, formation, eggs, eggRate, playerPos) {
    this.t += dt;

    if (this.type === CHICKEN.KAMIKAZE && this.diving) {
      // dive bomber: free fall + slight homing on the player x
      this.x += this.diveVx * dt;
      this.y += this.diveVy * dt;
      this.diveVy += 280 * dt;
      if (playerPos) {
        const dx = playerPos.x - this.x;
        this.diveVx += Utils.clamp(dx, -1, 1) * 60 * dt;
      }
      // recover and rejoin formation if we shoot way past the player
      if (this.y > formation.y + 600) {
        // missed the player — kamikaze is single-use
        this.dead = true;
      }
      return;
    }

    // Formation movement
    this.hx = formation.x + this.fx;
    this.hy = formation.y + this.fy;
    this.x = this.hx + Math.sin(this.t * this.swaySpd) * this.swayAmp * 0.3;
    this.y = this.hy + Math.sin(this.t * this.bobSpd) * this.bobAmp * 0.4;

    if (this.type === CHICKEN.BOSS) {
      // boss has its own attack patterns instead of plain egg laying
      const phase2 = this.hp < this.maxHp * 0.5;
      this.phase = phase2 ? 2 : 1;
      this.attackCd -= dt * eggRate;
      if (this.attackCd <= 0) {
        this.attackCd = phase2 ? Utils.rand(0.9, 1.6) : Utils.rand(1.8, 2.8);
        this.bossAttack(eggs, phase2, playerPos);
      }
      return;
    }

    if (this.type === CHICKEN.KAMIKAZE) {
      this.diveCd -= dt * eggRate;
      if (this.diveCd <= 0) {
        this.diving = true;
        this.diveVx = (playerPos ? Utils.clamp(playerPos.x - this.x, -200, 200) : 0) * 0.4;
        this.diveVy = 220;
      }
      return; // kamikazes don't lay eggs
    }

    // Egg laying — frequency depends on type
    const eggMult = this.type === CHICKEN.FAST ? 1.4 : this.type === CHICKEN.ARMORED ? 0.4 : this.type === CHICKEN.BIG ? 1.6 : 1.0;
    this.eggCd -= dt * eggRate * eggMult;
    if (this.eggCd <= 0) {
      this.eggCd = Utils.rand(3, 7);
      eggs.push(new Egg(this.x, this.y + 14));
    }
  }

  bossAttack(eggs, phase2, playerPos) {
    const pattern = Math.floor(Math.random() * 3);
    const speedBonus = phase2 ? 80 : 0;
    if (pattern === 0) {
      // 5-egg horizontal spread
      const count = phase2 ? 7 : 5;
      const span = (count - 1) / 2;
      for (let i = 0; i < count; i++) {
        const e = new Egg(this.x, this.y + 30);
        e.vx = (i - span) * 50;
        e.vy = 200 + speedBonus;
        eggs.push(e);
      }
    } else if (pattern === 1) {
      // ring burst
      const count = phase2 ? 12 : 9;
      for (let i = 0; i < count; i++) {
        const a = (Math.PI * 2 * i) / count + Math.PI / 2;
        const e = new Egg(this.x, this.y);
        const speed = 140 + speedBonus;
        e.vx = Math.cos(a) * speed;
        e.vy = Math.sin(a) * speed;
        eggs.push(e);
      }
    } else {
      // aimed triple shot at the player
      const aim = playerPos
        ? Math.atan2(playerPos.y - this.y, playerPos.x - this.x)
        : Math.PI / 2;
      const speed = 280 + speedBonus;
      for (let i = -1; i <= 1; i++) {
        const a = aim + i * 0.18;
        const e = new Egg(this.x, this.y + 20);
        e.vx = Math.cos(a) * speed;
        e.vy = Math.sin(a) * speed;
        eggs.push(e);
      }
    }
  }

  hit(dmg) {
    this.hp -= dmg;
    if (this.hp <= 0) this.dead = true;
  }

  draw(ctx) {
    if (this.type === CHICKEN.BOSS) {
      this.drawBoss(ctx);
      return;
    }
    const x = this.x;
    const y = this.y;
    const wing = Math.sin(this.t * 6) * 3;

    let bodyColor, accent, combColor, beakColor;
    if (this.type === CHICKEN.BIG) {
      bodyColor = '#ffeecc';
      accent = '#e0c8a0';
      combColor = '#cc2244';
      beakColor = '#ffaa00';
    } else if (this.type === CHICKEN.FAST) {
      bodyColor = '#bce6ff';
      accent = '#88c8ee';
      combColor = '#33aaff';
      beakColor = '#ff7733';
    } else if (this.type === CHICKEN.ARMORED) {
      bodyColor = '#9aa0aa';
      accent = '#5e6470';
      combColor = '#ffaa33';
      beakColor = '#cc7700';
    } else if (this.type === CHICKEN.KAMIKAZE) {
      bodyColor = '#ffaa99';
      accent = '#cc4422';
      combColor = '#ff2200';
      beakColor = '#ffff44';
    } else {
      bodyColor = '#ffffff';
      accent = '#e8e8e8';
      combColor = '#ff3344';
      beakColor = '#ffaa00';
    }

    // size scales body
    const bw = this.w * 0.42;
    const bh = this.h * 0.4;

    // body
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.ellipse(x, y + 4, bw, bh, 0, 0, Math.PI * 2);
    ctx.fill();

    // wings
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.ellipse(x - bw * 0.85, y + 4 + wing, bw * 0.4, bh * 0.6, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + bw * 0.85, y + 4 - wing, bw * 0.4, bh * 0.6, 0.3, 0, Math.PI * 2);
    ctx.fill();

    // armor plating
    if (this.type === CHICKEN.ARMORED) {
      ctx.strokeStyle = '#3a4050';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x - 8, y + 1);
      ctx.lineTo(x + 8, y + 1);
      ctx.moveTo(x - 8, y + 7);
      ctx.lineTo(x + 8, y + 7);
      ctx.stroke();
      // bolts
      ctx.fillStyle = '#3a4050';
      for (const px of [-6, 0, 6]) {
        ctx.beginPath();
        ctx.arc(x + px, y + 1, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // head
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.arc(x, y - 8, this.w * 0.24, 0, Math.PI * 2);
    ctx.fill();

    // armored helmet
    if (this.type === CHICKEN.ARMORED) {
      ctx.fillStyle = '#5e6470';
      ctx.beginPath();
      ctx.arc(x, y - 10, this.w * 0.26, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#9aa0aa';
      ctx.fillRect(x - 8, y - 11, 16, 2);
    }

    // comb
    if (this.type !== CHICKEN.ARMORED) {
      ctx.fillStyle = combColor;
      ctx.beginPath();
      ctx.arc(x - 3, y - 14, 2.5, 0, Math.PI * 2);
      ctx.arc(x, y - 16, 2.5, 0, Math.PI * 2);
      ctx.arc(x + 3, y - 14, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // angry eyes for kamikaze
    if (this.type === CHICKEN.KAMIKAZE) {
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x - 6, y - 12);
      ctx.lineTo(x - 1, y - 9);
      ctx.moveTo(x + 6, y - 12);
      ctx.lineTo(x + 1, y - 9);
      ctx.stroke();
    }

    // beak
    ctx.fillStyle = beakColor;
    ctx.beginPath();
    ctx.moveTo(x, y - 6);
    ctx.lineTo(x + 6, y - 4);
    ctx.lineTo(x, y - 2);
    ctx.closePath();
    ctx.fill();

    // eyes
    ctx.fillStyle = this.type === CHICKEN.KAMIKAZE ? '#ff2200' : '#000';
    ctx.beginPath();
    ctx.arc(x - 3, y - 9, 1.4, 0, Math.PI * 2);
    ctx.arc(x + 3, y - 9, 1.4, 0, Math.PI * 2);
    ctx.fill();

    // feet
    ctx.fillStyle = beakColor;
    ctx.fillRect(x - 6, y + bh + 2, 2, 4);
    ctx.fillRect(x + 4, y + bh + 2, 2, 4);

    // hp bar for tougher chickens
    const showBar = (this.type === CHICKEN.BIG || this.type === CHICKEN.ARMORED) && this.hp < this.maxHp;
    if (showBar) {
      const w = 30;
      ctx.fillStyle = '#400';
      ctx.fillRect(x - w / 2, y - 22, w, 3);
      ctx.fillStyle = '#f44';
      ctx.fillRect(x - w / 2, y - 22, w * (this.hp / this.maxHp), 3);
    }
  }

  drawBoss(ctx) {
    const x = this.x;
    const y = this.y;
    const t = this.t;
    const wing = Math.sin(t * 4) * 8;
    const breath = 1 + Math.sin(t * 2) * 0.04;
    const phase2 = this.phase === 2;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(breath, breath);

    // dark aura
    ctx.fillStyle = phase2 ? 'rgba(160,0,40,0.35)' : 'rgba(80,0,80,0.4)';
    ctx.beginPath();
    ctx.ellipse(0, 12, 70, 22, 0, 0, Math.PI * 2);
    ctx.fill();

    // body (large)
    const bodyA = phase2 ? '#882233' : '#552288';
    const bodyB = phase2 ? '#aa3344' : '#7733aa';
    ctx.fillStyle = bodyA;
    ctx.beginPath();
    ctx.ellipse(0, 8, 46, 38, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = bodyB;
    ctx.beginPath();
    ctx.ellipse(-14, -2, 18, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    // wings
    ctx.fillStyle = phase2 ? '#551111' : '#3a1466';
    ctx.beginPath();
    ctx.ellipse(-36, 8 + wing, 16, 24, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(36, 8 - wing, 16, 24, 0.4, 0, Math.PI * 2);
    ctx.fill();

    // head
    ctx.fillStyle = bodyA;
    ctx.beginPath();
    ctx.arc(0, -22, 24, 0, Math.PI * 2);
    ctx.fill();

    // crown spikes
    const crownColor = phase2 ? '#ff3344' : '#ff66ff';
    ctx.fillStyle = crownColor;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 7, -46);
      ctx.lineTo(i * 7 - 3, -36);
      ctx.lineTo(i * 7 + 3, -36);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = '#ffff66';
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.arc(i * 7, -46, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // angry eyes
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-9, -22, 6, 0, Math.PI * 2);
    ctx.arc(9, -22, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = phase2 ? '#ff2200' : '#ffff00';
    ctx.shadowColor = phase2 ? '#ff4400' : '#ffff66';
    ctx.shadowBlur = 12;
    const pupilOff = Math.sin(t * 1.5) * 1.5;
    ctx.beginPath();
    ctx.arc(-9 + pupilOff, -22, 3, 0, Math.PI * 2);
    ctx.arc(9 + pupilOff, -22, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // angry eyebrows
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-16, -32);
    ctx.lineTo(-3, -28);
    ctx.moveTo(16, -32);
    ctx.lineTo(3, -28);
    ctx.stroke();

    // beak with teeth
    ctx.fillStyle = '#ff8800';
    ctx.beginPath();
    ctx.moveTo(0, -16);
    ctx.lineTo(16, -10);
    ctx.lineTo(0, -2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(2, -8);
    ctx.lineTo(0, -4);
    ctx.lineTo(4, -4);
    ctx.closePath();
    ctx.fill();

    // feet
    ctx.fillStyle = '#ff8800';
    ctx.fillRect(-12, 40, 5, 10);
    ctx.fillRect(7, 40, 5, 10);

    ctx.restore();
  }
}

class Egg {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 180;
    this.w = 12;
    this.h = 16;
    this.dead = false;
    this.spin = 0;
  }

  get rect() {
    return { x: this.x - this.w / 2, y: this.y - this.h / 2, w: this.w, h: this.h };
  }

  update(dt, bounds) {
    this.y += this.vy * dt;
    this.spin += dt * 4;
    if (this.y > bounds.h + 20) this.dead = true;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(Math.sin(this.spin) * 0.3);
    ctx.fillStyle = '#fff8e0';
    ctx.beginPath();
    ctx.ellipse(0, 0, 6, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e0c890';
    ctx.beginPath();
    ctx.ellipse(-2, -2, 1.5, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

class PowerUp {
  // Glow color used for the pickup explosion FX. Keyed by POWERUP type.
  static GLOW_COLOR = {
    [POWERUP.LEG]: '#ffaa66',
    [POWERUP.LASER]: '#88ffaa',
    [POWERUP.HEART]: '#ff6688',
  };

  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.vx = Utils.rand(-30, 30);
    this.vy = 90;
    this.w = 22;
    this.h = 22;
    this.type = type;
    this.t = 0;
    this.dead = false;
  }

  get rect() {
    return { x: this.x - this.w / 2, y: this.y - this.h / 2, w: this.w, h: this.h };
  }

  update(dt, bounds) {
    this.t += dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.x < 12 || this.x > bounds.w - 12) this.vx *= -1;
    if (this.y > bounds.h + 20) this.dead = true;
  }

  draw(ctx) {
    const x = this.x;
    const y = this.y + Math.sin(this.t * 4) * 2;
    const pulse = 1 + Math.sin(this.t * 6) * 0.1;

    if (this.type === POWERUP.LEG) {
      // chicken leg / drumstick
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.sin(this.t * 2) * 0.2);
      ctx.fillStyle = '#cc6622';
      ctx.beginPath();
      ctx.ellipse(0, 4, 7, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff5dd';
      ctx.fillRect(-2, -8, 4, 8);
      ctx.beginPath();
      ctx.arc(0, -8, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (this.type === POWERUP.LASER) {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(pulse, pulse);
      ctx.shadowColor = '#0f8';
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#88ffaa';
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.lineTo(8, 0);
      ctx.lineTo(0, 10);
      ctx.lineTo(-8, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillRect(-2, -4, 4, 8);
      ctx.restore();
    } else if (this.type === POWERUP.HEART) {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(pulse, pulse);
      ctx.fillStyle = '#ff3366';
      ctx.shadowColor = '#ff6688';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(0, 8);
      ctx.bezierCurveTo(10, -2, 6, -10, 0, -4);
      ctx.bezierCurveTo(-6, -10, -10, -2, 0, 8);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.ellipse(-3, -4, 1.5, 2, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.shadowBlur = 0;
  }
}
