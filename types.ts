
export enum GameStatus {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  GAME_OVER = 'GAME_OVER',
  LEVEL_COMPLETE = 'LEVEL_COMPLETE',
  LEADERBOARD = 'LEADERBOARD'
}

export type Language = 'ES' | 'EN' | 'FR';

export interface LevelConfig {
  id: number;
  name: string;
  imageUrl: string;
  difficulty: number; // 1-10
  bossSpeed: number;
  minRevealPercent: number;
  enemyCount: number; // New: Number of enemies
}

export interface ScoreEntry {
  playerName: string;
  score: number;
  level: number;
  date: string;
}

export interface Point {
  x: number;
  y: number;
}

export interface Player {
  x: number;
  y: number;
  lives: number;
  isDrawing: boolean;
  invulnerableUntil: number; // Timestamp until when player is safe
  lastMoveTime?: number; // Added optional property for movement timing
}

export interface Enemy {
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: 'BOSS' | 'MINION';
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number; // Remaining life in ms
  maxLife: number;
  color: string;
  size: number;
}

export interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  size: number;
  life: number; // 0 to 1
  vy: number; // Float speed
}

export interface FlashEffect {
  x: number;
  y: number;
  life: number; // 0.0 to 1.0 (opacity)
  decay: number; // Speed of fading
}

export interface GameStats {
  areaRevealed: number; // Percentage 0-100
  timeElapsed: number;
  score: number;
}