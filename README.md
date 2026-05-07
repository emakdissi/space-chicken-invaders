# Space Chicken Invaders

A browser-based 2D space shooter inspired by the classic *Chicken Invaders* series. Pilot your fighter ship through escalating waves of intergalactic chickens, dodge falling eggs, collect power-ups, and clear all 10 levels to save the galaxy.

The entire game runs in vanilla HTML5 + Canvas + JavaScript — no build step, no dependencies, no installation.

## ▶ Play it now

**Live demo: https://emakdissi.github.io/space-chicken-invaders/**

Hosted free on GitHub Pages — open the link in any modern browser and click **START GAME**. No install, no account, nothing to download.

> The live site is served from a deployment mirror at [`emakdissi/space-chicken-invaders`](https://github.com/emakdissi/space-chicken-invaders). Active development happens here on the `EM1-dev` branch of `amenai-interns-playground`.

---

## How to Play

1. Open the [live demo](https://emakdissi.github.io/space-chicken-invaders/), **or** clone this repo and open `index.html` locally.
2. Click **START GAME**.
3. Survive each round, clear each level, defeat the boss chickens.

> Running locally: opening `index.html` directly via `file://` works in most browsers, but if you hit any loading issues, serve the folder over HTTP:
>
> ```bash
> python3 -m http.server 8000
> # then open http://localhost:8000
> ```

---

## Controls

| Key | Action |
|-----|--------|
| `←` / `→` / `↑` / `↓` or `WASD` | Move your ship |
| `Space` | Fire laser (hold for autofire) |
| `X` | Launch a missile (consumes 1 from your stock) |
| `P` | Pause / resume |

---

## Game Structure

The campaign is divided into **10 levels**. Each level contains a number of rounds that grows as you progress:

| Level | Rounds |
|-------|--------|
| 1 | 3 |
| 2 | 4 |
| 3 | 4 |
| 4 | 5 |
| 5 | 5 |
| 6 | 6 |
| 7 | 6 |
| 8 | 7 |
| 9 | 7 |
| 10 | 8 |

Difficulty scales with both level and round: the chicken formation moves faster, drops eggs more often, includes more rows/columns, and chickens have more health. The **final round of every level is a boss round** — a giant mutant chicken backed by a wave of minions.

Clearing a round awards a level-scaled bonus. Clearing a final round awards a much larger level-clear bonus.

---

## Power-ups

Power-ups occasionally drop from the sky and can also fall from defeated chickens. Catch them with your ship to collect them.

| Power-up | Effect |
|----------|--------|
| 🍗 **Chicken Leg** | Adds 2 missiles to your stock |
| 🟢 **Laser Crystal** | Upgrades your laser (up to 5 levels — more bullets, more damage, faster fire rate) |
| ❤️ **Heart** | Restores 1 life (up to a max of 5) |

Bosses are guaranteed to drop a power-up. Big chickens have a 50% drop chance.

---

## Lives & Damage

- You start with **3 lives** (max 5).
- Each hit by an egg or chicken collision costs **1 life** plus **1 weapon level** (down to a minimum of level 1).
- After being hit you get a brief invulnerability window so you can recover.
- When all lives are gone, it's **GAME OVER**.

---

## Project Structure

```
.
├── index.html        # entry point + HUD/menu markup
├── css/style.css     # styling for HUD, menu, and overlays
├── js/
│   ├── utils.js      # helpers, starfield background, particles
│   ├── entities.js   # Player, Laser, Missile, Chicken, Egg, PowerUp
│   └── game.js       # main loop, levels, rounds, collisions, state
└── README.md
```

No external assets — all visuals are drawn procedurally with `<canvas>` 2D primitives.

---

## Tweaking the Game

A few quick knobs if you want to mess with the difficulty curve:

- **`LEVEL_ROUNDS`** in `js/game.js` — array setting how many rounds each level has.
- **`startRound()`** in `js/game.js` — controls grid size, formation speed, egg rate, big/boss chicken counts.
- **`Player.shoot()`** in `js/entities.js` — defines bullet patterns for each weapon level.
- **`onChickenKilled()`** in `js/game.js` — drop rates and weighted power-up types.

---

## Browser Compatibility

Tested on recent Chromium and Firefox builds. The game uses standard `<canvas>` 2D APIs and modern (ES2017+) JavaScript — no transpilation needed for any current browser.

Have fun, and don't let the chickens win.
