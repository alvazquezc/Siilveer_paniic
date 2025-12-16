import { LevelConfig, Language } from './types';

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
export const COLOR_ITEM = '#fbbf24'; // Amber 400

// Game logic
export const PLAYER_SPEED_MS = 60; // Update interval for player movement
export const BOSS_BASE_SPEED = 0.1; // Reduced base logic speed
export const INVULNERABILITY_TIME = 3000; // 3 Seconds blinking
export const ITEM_LIFETIME = 6000; // 6 seconds

// COMBO SYSTEM
export const COMBO_TIMEOUT_MS = 2500; // Increased to 2.5s for easier chaining
export const IDLE_TIMEOUT_MS = 2000; // Increased to 2s before combo breaks from standing still

// --- CONFIGURACIÓN DE IMÁGENES ---
// Corrección de rutas: Usamos rutas relativas "assets/..." sin barra inicial.
// Esto permite que funcione mejor si el juego no está servido desde la raíz absoluta.

export const SILVER_AVATAR = {
  NEUTRAL: 'assets/avatars/silver_neutral.png',
  EXCITED: 'assets/avatars/silver_excited.png',
  SAD: 'assets/avatars/silver_sad.png',
  DEFEATED: 'assets/avatars/silver_defeated.png',
};

export const LEVELS: LevelConfig[] = [
  {
    id: 0,
    name: "Simulation Zero",
    imageUrl: 'assets/levels/level_0.png', // Fallback will handle this
    difficulty: 0,
    bossSpeed: 0.05, 
    minRevealPercent: 60, // Easier for tutorial
    enemyCount: 1
  },
  {
    id: 1,
    name: "Midnight Whisper",
    imageUrl: 'assets/levels/level_1.png',
    difficulty: 1,
    bossSpeed: 0.08, 
    minRevealPercent: 75,
    enemyCount: 1
  },
  {
    id: 2,
    name: "Azure Palace",
    imageUrl: 'assets/levels/level_2.png',
    difficulty: 2,
    bossSpeed: 0.12,
    minRevealPercent: 80,
    enemyCount: 2
  },
  {
    id: 3,
    name: "Noir Elegance",
    imageUrl: 'assets/levels/level_3.png',
    difficulty: 3,
    bossSpeed: 0.16,
    minRevealPercent: 80,
    enemyCount: 2
  },
  {
    id: 4,
    name: "Lunar Secret",
    imageUrl: 'assets/levels/level_4.png',
    difficulty: 4,
    bossSpeed: 0.20,
    minRevealPercent: 85,
    enemyCount: 3
  },
  {
    id: 5,
    name: "Violet Storm",
    imageUrl: 'assets/levels/level_5.png',
    difficulty: 5,
    bossSpeed: 0.25,
    minRevealPercent: 90,
    enemyCount: 4
  },
  {
    id: 6,
    name: "Crimson Finale",
    imageUrl: 'assets/levels/level_6.png',
    difficulty: 6,
    bossSpeed: 0.30,
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

// STATIC COMMENTARY (Offline Mode)
export const COMMENTARY_WIN_ES = [
  "¡Increíble! Tus reflejos son de otro planeta. 🚀",
  "¡GG! Eso fue quirúrgico. ¿Eres un robot? 🤖",
  "¡Destrucción total! El nivel no tuvo oportunidad. 🔥",
];

export const COMMENTARY_LOSE_ES = [
  "¡Uff! Eso dolió de ver. Más suerte la próxima. 💀",
  "¿Lag o falta de habilidad? Tú decides. 🤔",
  "¡Casi! Pero en el arcade 'casi' no cuenta. ❌",
];

export const COMMENTARY_WIN_EN = [
  "Incredible! Your reflexes are from another planet. 🚀",
  "GG! That was surgical. Are you a robot? 🤖",
  "Total destruction! The level didn't stand a chance. 🔥",
];

export const COMMENTARY_LOSE_EN = [
  "Ouch! That hurt to watch. Better luck next time. 💀",
  "Lag or lack of skill? You decide. 🤔",
  "Almost! But 'almost' doesn't count in arcade. ❌",
];

export const COMMENTARY_WIN_FR = [
  "Incroyable! Tes réflexes viennent d'une autre planète. 🚀",
  "GG! C'était chirurgical. Es-tu un robot? 🤖",
  "Destruction totale! Le niveau n'avait aucune chance. 🔥",
];

export const COMMENTARY_LOSE_FR = [
  "Aïe! Ça faisait mal à voir. Plus de chance la prochaine fois. 💀",
  "Lag ou manque de talent? À toi de décider. 🤔",
  "Presque! Mais 'presque' ne compte pas ici. ❌",
];

export const EXCLAMATIONS = [
  "WOW!", "SICK!", "RADICAL!", "SUPER!", "INSANE!", "OMG!", "HYPER!", "GODLIKE!"
];

export const TRANSLATIONS = {
  ES: {
    menu_start: "SELECCIONA NIVEL",
    menu_scores: "MEJORES PUNTUACIONES",
    menu_credits: "DESARROLLADO POR SIILVEER GAMES",
    instructions: "Instrucciones: Corta zonas para revelar el fondo. ¡Evita los enemigos!",
    level: "NIVEL",
    score: "PUNTOS",
    area: "AREA",
    pause_title: "PAUSA",
    pause_subtitle: "Juego detenido",
    resume: "Reanudar",
    quit: "Salir al Menú",
    win_title: "Nivel Completado",
    win_subtitle: "Presiona cualquier tecla...",
    ai_comment: "Comentario IA",
    game_over: "GAME OVER",
    retry: "Reintentar",
    exit: "Salir",
    ready: "LISTO?",
    go: "YA!",
    broken: "ROTO!",
    footer: "Usa flechas/WASD para moverte. Corta para revelar. 'P' para pausar."
  },
  EN: {
    menu_start: "SELECT STAGE",
    menu_scores: "HIGH SCORES",
    menu_credits: "DEVELOPED BY SIILVEER GAMES",
    instructions: "Instructions: Cut areas to reveal the background. Avoid enemies!",
    level: "LEVEL",
    score: "SCORE",
    area: "AREA",
    pause_title: "PAUSED",
    pause_subtitle: "Game Stopped",
    resume: "Resume",
    quit: "Quit to Menu",
    win_title: "Level Complete",
    win_subtitle: "Press any key...",
    ai_comment: "AI Commentary",
    game_over: "GAME OVER",
    retry: "Retry",
    exit: "Exit",
    ready: "READY?",
    go: "GO!",
    broken: "BROKEN!",
    footer: "Use arrows/WASD to move. Cut to reveal. 'P' to pause."
  },
  FR: {
    menu_start: "CHOISIR NIVEAU",
    menu_scores: "MEILLEURS SCORES",
    menu_credits: "DÉVELOPPÉ PAR SIILVEER GAMES",
    instructions: "Instructions: Coupez les zones pour révéler le fond. Évitez les ennemis!",
    level: "NIVEAU",
    score: "SCORE",
    area: "ZONE",
    pause_title: "PAUSE",
    pause_subtitle: "Jeu arrêté",
    resume: "Reprendre",
    quit: "Quitter",
    win_title: "Niveau Terminé",
    win_subtitle: "Appuyez sur une touche...",
    ai_comment: "Commentaire IA",
    game_over: "GAME OVER",
    retry: "Réessayer",
    exit: "Quitter",
    ready: "PRÊT?",
    go: "ALLEZ!",
    broken: "CASSÉ!",
    footer: "Utilisez flèches/WASD pour bouger. Coupez pour révéler. 'P' pour pause."
  }
};