'use strict';

// Game phase the state machine is currently in.
const PHASE = Object.freeze({
  MENU: 'menu',
  LEVEL_INTRO: 'levelIntro',
  PLAY: 'play',
  ROUND_CLEAR: 'roundClear',
  GAME_OVER: 'gameOver',
  VICTORY: 'victory',
});

// Power-up identifiers — used in PowerUp.type and in spawn/apply logic.
const POWERUP = Object.freeze({
  LEG: 'leg',       // adds missiles
  LASER: 'laser',   // upgrades weapon tier
  HEART: 'heart',   // restores a life
});

// Chicken type identifiers — used in Chicken.type and in spawn rules.
const CHICKEN = Object.freeze({
  NORMAL: 'normal',
  FAST: 'fast',
  ARMORED: 'armored',
  BIG: 'big',
  KAMIKAZE: 'kamikaze',
  BOSS: 'boss',
});

// Wave-composition themes a non-boss round can use.
const THEME = Object.freeze({
  MIXED: 'mixed',
  FAST: 'fast',
  ARMORED: 'armored',
  KAMIKAZE: 'kamikaze',
});

// Tunable gameplay numbers — single source of truth for caps and starting values.
const GAME = Object.freeze({
  STARTING_LIVES: 3,
  MAX_LIVES: 5,
  STARTING_MISSILES: 3,
  MAX_MISSILES: 99,
  MAX_WEAPON_LEVEL: 5,

  PLAYER_INVULN_AFTER_HIT: 1.6,
  PLAYER_INVULN_AFTER_RESPAWN: 2.0,
  MISSILE_AOE_RADIUS: 80,

  ROUND_BONUS_PER_LEVEL: 100,
  LEVEL_CLEAR_BONUS_PER_LEVEL: 500,
  POWERUP_SCORE: { leg: 50, laser: 100, heart: 75, laser_max: 250 },
});

// Number of rounds per level (index 0 = level 1).
const LEVEL_ROUNDS = Object.freeze([3, 4, 4, 5, 5, 6, 6, 7, 7, 8]);
const TOTAL_LEVELS = LEVEL_ROUNDS.length;
