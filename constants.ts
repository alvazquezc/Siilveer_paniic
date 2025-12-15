import { LevelConfig } from './types';

// Grid Configuration
export const GRID_WIDTH = 60;
export const GRID_HEIGHT = 45;
export const TILE_SIZE = 12; // Base logical size, will scale with canvas

// Colors
export const COLOR_SAFE = '#0f172a'; // Solid Slate 900 (Mate/Opaque)
export const COLOR_TRAIL = '#f43f5e'; // Rose 500
export const COLOR_REVEALED = 'transparent';
export const COLOR_PLAYER = '#38bdf8'; // Sky 400
export const COLOR_BOSS = '#e11d48'; // Rose 600
export const COLOR_BOSS_CORE = '#881337'; // Rose 900
export const COLOR_PARTICLE = '#38bdf8'; 

// Game logic
export const PLAYER_SPEED_MS = 60; // Update interval for player movement
export const BOSS_BASE_SPEED = 0.2; // Logical grid units per frame
export const INVULNERABILITY_TIME = 3000; // 3 Seconds blinking

// Using Pollinations.ai to generate Anime style images on the fly
const getAnimeUrl = (prompt: string, seed: number) => 
  `https://image.pollinations.ai/prompt/anime%20style%20${encodeURIComponent(prompt)}%20masterpiece%20high%20quality%208k?width=800&height=600&nologo=true&seed=${seed}`;

// Silver Character Avatars
export const SILVER_AVATAR = {
  NEUTRAL: getAnimeUrl("handsome man short black hair glasses goatee beard cool smile portrait", 901),
  EXCITED: getAnimeUrl("handsome man short black hair glasses goatee beard excited winking victory sign anime", 902),
  SAD: getAnimeUrl("man short black hair glasses goatee beard shocked scared dizzy anime face", 903),
};

export const LEVELS: LevelConfig[] = [
  {
    id: 1,
    name: "Cyber invitation",
    imageUrl: getAnimeUrl("cyberpunk girl neon lights reaching out hand inviting viewer to play perspective", 201),
    difficulty: 1,
    bossSpeed: 0.15,
    minRevealPercent: 75,
    enemyCount: 1
  },
  {
    id: 2,
    name: "Forest Play",
    imageUrl: getAnimeUrl("cute elf girl glowing magic forest winking playful finger on lips", 202),
    difficulty: 2,
    bossSpeed: 0.25,
    minRevealPercent: 80,
    enemyCount: 2
  },
  {
    id: 3,
    name: "Cockpit Welcome",
    imageUrl: getAnimeUrl("scifi girl pilot tight suit turning around in chair smiling at viewer welcoming", 203),
    difficulty: 3,
    bossSpeed: 0.35,
    minRevealPercent: 80,
    enemyCount: 2
  },
  {
    id: 4,
    name: "Gothic Gaze",
    imageUrl: getAnimeUrl("gothic lolita girl dark castle sitting on throne looking down with interest", 204),
    difficulty: 4,
    bossSpeed: 0.45,
    minRevealPercent: 85,
    enemyCount: 3
  },
  {
    id: 5,
    name: "Divine Challenge",
    imageUrl: getAnimeUrl("goddess divine girl galaxy hair arms open wide epic composition challenging viewer", 205),
    difficulty: 5,
    bossSpeed: 0.6,
    minRevealPercent: 90,
    enemyCount: 4
  },
  {
    id: 6,
    name: "Celestial Queen",
    imageUrl: getAnimeUrl("celestial queen anime girl stars nebula hair floating in space winking inviting mysterious", 206),
    difficulty: 6,
    bossSpeed: 0.7,
    minRevealPercent: 92,
    enemyCount: 5
  }
];

export const MOCK_SCORES = [
  { playerName: "OtakuKing", score: 12500, level: 6, date: "2024-05-10" },
  { playerName: "WaifuHunter", score: 9950, level: 5, date: "2024-05-11" },
  { playerName: "NeonBlade", score: 7200, level: 3, date: "2024-05-12" },
  { playerName: "PixelArt", score: 4000, level: 2, date: "2024-05-12" },
];

export const TEASING_PHRASES = [
  "¿Eso es todo lo que tienes?",
  "Estás jugando con fuego...",
  "Más rápido, más profundo.",
  "No me decepciones ahora.",
  "Te veo temblar...",
  "Casi me tocas.",
  "¿Te da miedo el éxito?",
  "Arriésgate un poco más.",
  "Qué técnica tan... interesante.",
  "Me estoy aburriendo aquí dentro.",
  "Cuidado con la retaguardia.",
  "Demasiado lento para mi gusto."
];