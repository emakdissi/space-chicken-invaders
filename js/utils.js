'use strict';

const Utils = {
  rand(min, max) {
    return Math.random() * (max - min) + min;
  },

  randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  },

  // Weighted random pick. items[i] has the corresponding weights[i] chance.
  weightedPick(items, weights) {
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < items.length; i++) {
      r -= weights[i];
      if (r <= 0) return items[i];
    }
    return items[items.length - 1];
  },

  clamp(v, min, max) {
    return v < min ? min : v > max ? max : v;
  },

  rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  },

  circleRectOverlap(cx, cy, r, rect) {
    const nx = Utils.clamp(cx, rect.x, rect.x + rect.w);
    const ny = Utils.clamp(cy, rect.y, rect.y + rect.h);
    const dx = cx - nx;
    const dy = cy - ny;
    return dx * dx + dy * dy < r * r;
  },

  drawStar(ctx, x, y, r, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = (Math.PI * 2 * i) / 5 - Math.PI / 2;
      const a2 = a + Math.PI / 5;
      ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      ctx.lineTo(x + Math.cos(a2) * r * 0.5, y + Math.sin(a2) * r * 0.5);
    }
    ctx.closePath();
    ctx.fill();
  },
};

class Starfield {
  constructor(w, h, count = 80) {
    this.w = w;
    this.h = h;
    this.stars = [];
    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        s: Math.random() * 1.6 + 0.4,
        v: Math.random() * 40 + 20,
      });
    }
  }

  update(dt) {
    for (const st of this.stars) {
      st.y += st.v * dt;
      if (st.y > this.h) {
        st.y = 0;
        st.x = Math.random() * this.w;
      }
    }
  }

  draw(ctx) {
    for (const st of this.stars) {
      const alpha = Utils.clamp(st.s / 2, 0.3, 1);
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.fillRect(st.x, st.y, st.s, st.s);
    }
  }
}

class Particle {
  constructor(x, y, vx, vy, life, color, size = 3) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.life = life;
    this.maxLife = life;
    this.color = color;
    this.size = size;
    this.dead = false;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vx *= 0.96;
    this.vy *= 0.96;
    this.life -= dt;
    if (this.life <= 0) this.dead = true;
  }

  draw(ctx) {
    const a = Utils.clamp(this.life / this.maxLife, 0, 1);
    ctx.globalAlpha = a;
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
    ctx.globalAlpha = 1;
  }
}

function spawnExplosion(particles, x, y, color = '#ff8', count = 18, speed = 220) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = Math.random() * speed + 40;
    particles.push(
      new Particle(
        x,
        y,
        Math.cos(a) * s,
        Math.sin(a) * s,
        Utils.rand(0.3, 0.8),
        color,
        Utils.rand(2, 4),
      ),
    );
  }
}

function spawnFeathers(particles, x, y) {
  const colors = ['#fff', '#ffd', '#fff7c0'];
  for (let i = 0; i < 14; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = Math.random() * 140 + 30;
    particles.push(
      new Particle(
        x,
        y,
        Math.cos(a) * s,
        Math.sin(a) * s - 40,
        Utils.rand(0.6, 1.2),
        Utils.pick(colors),
        Utils.rand(2, 4),
      ),
    );
  }
}
