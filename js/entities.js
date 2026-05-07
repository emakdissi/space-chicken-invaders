'use strict';

class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.w = 48;
    this.h = 40;
    this.speed = 360;
    this.weaponLevel = 1;
    this.maxWeaponLevel = 5;
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
    const cooldownByLvl = [0, 0.22, 0.18, 0.15, 0.13, 0.11];
    this.fireCd = cooldownByLvl[this.weaponLevel] || 0.1;

    const lvl = this.weaponLevel;
    if (lvl === 1) {
      projectiles.push(new Laser(this.x, this.y - 22, 0, -700, 1));
    } else if (lvl === 2) {
      projectiles.push(new Laser(this.x - 8, this.y - 22, 0, -720, 1));
      projectiles.push(new Laser(this.x + 8, this.y - 22, 0, -720, 1));
    } else if (lvl === 3) {
      projectiles.push(new Laser(this.x, this.y - 26, 0, -760, 2));
      projectiles.push(new Laser(this.x - 14, this.y - 18, -60, -700, 1));
      projectiles.push(new Laser(this.x + 14, this.y - 18, 60, -700, 1));
    } else if (lvl === 4) {
      projectiles.push(new Laser(this.x - 10, this.y - 26, 0, -780, 2));
      projectiles.push(new Laser(this.x + 10, this.y - 26, 0, -780, 2));
      projectiles.push(new Laser(this.x - 18, this.y - 12, -120, -680, 1));
      projectiles.push(new Laser(this.x + 18, this.y - 12, 120, -680, 1));
    } else {
      projectiles.push(new Laser(this.x, this.y - 28, 0, -820, 3));
      projectiles.push(new Laser(this.x - 12, this.y - 24, 0, -800, 2));
      projectiles.push(new Laser(this.x + 12, this.y - 24, 0, -800, 2));
      projectiles.push(new Laser(this.x - 22, this.y - 12, -180, -640, 1));
      projectiles.push(new Laser(this.x + 22, this.y - 12, 180, -640, 1));
    }
  }

  launchMissile(projectiles) {
    if (this.missileCd > 0 || this.missiles <= 0) return;
    this.missileCd = 0.25;
    this.missiles -= 1;
    projectiles.push(new Missile(this.x, this.y - 24));
  }

  hit() {
    if (this.invuln > 0) return false;
    this.invuln = 1.6;
    this.flash = 0.6;
    return true;
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

class Laser {
  constructor(x, y, vx, vy, dmg = 1) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.w = 4;
    this.h = 14;
    this.dmg = dmg;
    this.dead = false;
  }

  get rect() {
    return { x: this.x - this.w / 2, y: this.y - this.h / 2, w: this.w, h: this.h };
  }

  update(dt, bounds) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.y < -20 || this.y > bounds.h + 20 || this.x < -20 || this.x > bounds.w + 20) {
      this.dead = true;
    }
  }

  draw(ctx) {
    const colors = ['#ff5577', '#88ff66', '#66ddff', '#ffaa44'];
    const c = colors[Utils.clamp(this.dmg - 1, 0, 3)];
    ctx.shadowColor = c;
    ctx.shadowBlur = 8;
    ctx.fillStyle = c;
    ctx.fillRect(this.x - this.w / 2, this.y - this.h / 2, this.w, this.h);
    ctx.fillStyle = '#fff';
    ctx.fillRect(this.x - 1, this.y - this.h / 2, 2, this.h);
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
  constructor(x, y, hp, type = 'normal') {
    this.x = x;
    this.y = y;
    this.hx = x;
    this.hy = y;
    this.w = 38;
    this.h = 34;
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
    this.points = type === 'boss' ? 500 : type === 'big' ? 80 : 25;
  }

  get rect() {
    return { x: this.x - this.w / 2, y: this.y - this.h / 2, w: this.w, h: this.h };
  }

  update(dt, formation, eggs, eggRate) {
    this.t += dt;
    this.hx = formation.x + this.fx;
    this.hy = formation.y + this.fy;
    this.x = this.hx + Math.sin(this.t * this.swaySpd) * this.swayAmp * 0.3;
    this.y = this.hy + Math.sin(this.t * this.bobSpd) * this.bobAmp * 0.4;

    this.eggCd -= dt * eggRate;
    if (this.eggCd <= 0) {
      this.eggCd = Utils.rand(3, 7);
      eggs.push(new Egg(this.x, this.y + 14));
    }
  }

  hit(dmg) {
    this.hp -= dmg;
    if (this.hp <= 0) this.dead = true;
  }

  draw(ctx) {
    const x = this.x;
    const y = this.y;
    const wing = Math.sin(this.t * 6) * 3;

    let bodyColor = '#fff';
    let combColor = '#ff3344';
    let beakColor = '#ffaa00';
    if (this.type === 'big') {
      bodyColor = '#ffeecc';
      combColor = '#cc2244';
    } else if (this.type === 'boss') {
      bodyColor = '#552288';
      combColor = '#ff66ff';
      beakColor = '#ffff66';
    }

    // body
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.ellipse(x, y + 4, 16, 13, 0, 0, Math.PI * 2);
    ctx.fill();

    // wings
    ctx.fillStyle = this.type === 'boss' ? '#7733aa' : '#e8e8e8';
    ctx.beginPath();
    ctx.ellipse(x - 12, y + 4 + wing, 6, 8, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + 12, y + 4 - wing, 6, 8, 0.3, 0, Math.PI * 2);
    ctx.fill();

    // head
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.arc(x, y - 8, 9, 0, Math.PI * 2);
    ctx.fill();

    // comb
    ctx.fillStyle = combColor;
    ctx.beginPath();
    ctx.arc(x - 3, y - 14, 2.5, 0, Math.PI * 2);
    ctx.arc(x, y - 16, 2.5, 0, Math.PI * 2);
    ctx.arc(x + 3, y - 14, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // beak
    ctx.fillStyle = beakColor;
    ctx.beginPath();
    ctx.moveTo(x, y - 6);
    ctx.lineTo(x + 6, y - 4);
    ctx.lineTo(x, y - 2);
    ctx.closePath();
    ctx.fill();

    // eyes
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(x - 3, y - 9, 1.4, 0, Math.PI * 2);
    ctx.arc(x + 3, y - 9, 1.4, 0, Math.PI * 2);
    ctx.fill();

    // feet
    ctx.fillStyle = beakColor;
    ctx.fillRect(x - 6, y + 14, 2, 4);
    ctx.fillRect(x + 4, y + 14, 2, 4);

    // hp bar for big/boss
    if ((this.type === 'big' || this.type === 'boss') && this.hp < this.maxHp) {
      const w = this.type === 'boss' ? 36 : 28;
      ctx.fillStyle = '#400';
      ctx.fillRect(x - w / 2, y - 22, w, 3);
      ctx.fillStyle = '#f44';
      ctx.fillRect(x - w / 2, y - 22, w * (this.hp / this.maxHp), 3);
    }
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

    if (this.type === 'leg') {
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
    } else if (this.type === 'laser') {
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
    } else if (this.type === 'heart') {
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
