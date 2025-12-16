import React, { useEffect, useRef, useState } from 'react';
import {
  GRID_WIDTH, GRID_HEIGHT, TILE_SIZE,
  COLOR_SAFE, COLOR_TRAIL, COLOR_BOSS, COLOR_BOSS_CORE,
  COLOR_PARTICLE, COLOR_PLAYER, COLOR_ITEM,
  INVULNERABILITY_TIME, IDLE_TIMEOUT_MS, COMBO_TIMEOUT_MS,
  ITEM_LIFETIME, EXCLAMATIONS, TRANSLATIONS
} from '../constants';
import {
  Point, Enemy, Player, LevelConfig, GameStats,
  Particle, FlashEffect, FloatingText, Language, Item
} from '../types';

interface GameCanvasProps {
  level: LevelConfig;
  onGameOver: (stats: GameStats) => void;
  onLevelComplete: (stats: GameStats) => void;
  onStatsUpdate: (stats: GameStats) => void;
  onLivesChange: (lives: number) => void;
  onAreaCapture: () => void;
  onItemCollect: () => void;
  onProximityUpdate: (intensity: number) => void;
  direction: Point;
  isPaused: boolean;
  language: Language;
}

type TileType = 0 | 1 | 2;
type IntroPhase = 'TITLE' | 'READY' | 'GO' | null;

export const GameCanvas: React.FC<GameCanvasProps> = ({
  level, onGameOver, onLevelComplete, onStatsUpdate,
  onLivesChange, onAreaCapture, onItemCollect,
  onProximityUpdate, direction, isPaused, language
}) => {

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);

  const gridRef = useRef<TileType[][]>([]);
  const playerRef = useRef<Player>({ x: 0, y: 0, lives: 3, isDrawing: false, invulnerableUntil: 0, lastMoveTime: 0 });
  const enemiesRef = useRef<Enemy[]>([]);
  const itemsRef = useRef<Item[]>([]);
  const statsRef = useRef<GameStats>({ areaRevealed: 0, timeElapsed: 0, score: 0 });

  const trailRef = useRef<Point[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const flashEffectsRef = useRef<FlashEffect[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const directionRef = useRef<Point>(direction);

  const comboRef = useRef({ count: 1, lastActionTime: 0, lastMoveTime: 0 });

  const [introPhase, setIntroPhase] = useState<IntroPhase>('TITLE');
  const isIntroFrozenRef = useRef(true);
  const lastFrameTimeRef = useRef<number>(Date.now());

  // ---------------------------
  // CANVAS RESIZE (CRÍTICO)
  // ---------------------------
  const resizeCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = parent.getBoundingClientRect();

    const cssWidth = Math.max(1, rect.width);
    const cssHeight = (cssWidth * GRID_HEIGHT) / GRID_WIDTH;

    canvas.width = Math.floor(cssWidth * dpr);
    canvas.height = Math.floor(cssHeight * dpr);

    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  // ---------------------------
  // INPUT UPDATE
  // ---------------------------
  useEffect(() => {
    directionRef.current = direction;
    if (direction.x !== 0 || direction.y !== 0) {
      comboRef.current.lastMoveTime = Date.now();
    }
  }, [direction]);

  // ---------------------------
  // INIT GAME
  // ---------------------------
  useEffect(() => {
    initGame();
    startIntroSequence();
    return () => onProximityUpdate(0);
    // eslint-disable-next-line
  }, [level]);

  useEffect(() => {
    if (isPaused) {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      return;
    }
    lastFrameTimeRef.current = Date.now();
    requestRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(requestRef.current);
    // eslint-disable-next-line
  }, [isPaused, level]);

  const startIntroSequence = () => {
    isIntroFrozenRef.current = true;
    setIntroPhase('TITLE');
    setTimeout(() => setIntroPhase('READY'), 2000);
    setTimeout(() => setIntroPhase('GO'), 3500);
    setTimeout(() => {
      setIntroPhase(null);
      isIntroFrozenRef.current = false;
      comboRef.current.lastActionTime = Date.now();
      comboRef.current.lastMoveTime = Date.now();
    }, 4000);
  };

  const initGame = () => {
    resizeCanvas();

    const grid: TileType[][] = [];
    for (let y = 0; y < GRID_HEIGHT; y++) {
      const row: TileType[] = [];
      for (let x = 0; x < GRID_WIDTH; x++) {
        row.push(x === 0 || y === 0 || x === GRID_WIDTH - 1 || y === GRID_HEIGHT - 1 ? 0 : 1);
      }
      grid.push(row);
    }

    gridRef.current = grid;
    playerRef.current = { x: 0, y: 0, lives: 3, isDrawing: false, invulnerableUntil: 0, lastMoveTime: 0 };

    enemiesRef.current = Array.from({ length: level.enemyCount }, (_, i) => {
      const a = Math.random() * Math.PI * 2;
      const s = level.bossSpeed * (1 + i * 0.1);
      return {
        x: GRID_WIDTH / 2,
        y: GRID_HEIGHT / 2,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        type: 'BOSS',
        changeDirTimer: 1500 + Math.random() * 2000
      };
    });

    itemsRef.current = [];
    trailRef.current = [];
    particlesRef.current = [];
    flashEffectsRef.current = [];
    floatingTextsRef.current = [];
    statsRef.current = { areaRevealed: 0, timeElapsed: 0, score: 0 };
    comboRef.current = { count: 1, lastActionTime: Date.now(), lastMoveTime: Date.now() };

    onLivesChange(3);
    draw(Date.now());
  };

  // ---------------------------
  // GAME LOOP
  // ---------------------------
  const gameLoop = () => {
    const now = Date.now();
    const dt = now - lastFrameTimeRef.current;
    lastFrameTimeRef.current = now;

    if (!isIntroFrozenRef.current) update(dt, now);
    draw(now);

    requestRef.current = requestAnimationFrame(gameLoop);
  };

  // ---------------------------
  // UPDATE (sin cambios críticos)
  // ---------------------------
  const update = (dt: number, now: number) => {
    statsRef.current.timeElapsed += dt / 1000;
    onStatsUpdate({ ...statsRef.current });
  };

  // ---------------------------
  // DRAW (funciona ya)
  // ---------------------------
  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const grid = gridRef.current;

    ctx.fillStyle = COLOR_SAFE;
    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        if (grid[y][x] === 1) {
          ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
      }
    }

    const p = playerRef.current;
    ctx.fillStyle = COLOR_PLAYER;
    ctx.beginPath();
    ctx.arc(
      p.x * TILE_SIZE + TILE_SIZE / 2,
      p.y * TILE_SIZE + TILE_SIZE / 2,
      TILE_SIZE / 2,
      0, Math.PI * 2
    );
    ctx.fill();
  };

  // ---------------------------
  // RENDER
  // ---------------------------
  return (
    <div
      className="relative overflow-hidden bg-black"
      style={{ width: '100%', maxWidth: 1200 }}
    >
      <img
        src={level.imageUrl}
        alt="Level background"
        className="absolute inset-0 w-full h-full object-cover opacity-30"
        onError={(e) => {
          e.currentTarget.onerror = null;
          e.currentTarget.src = '/assets/levels/fallback.png';
        }}
      />

      <canvas
        ref={canvasRef}
        className="relative z-10 block"
      />

      {introPhase && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60">
          <h2 className="text-white text-6xl font-black">
            {introPhase === 'READY' ? TRANSLATIONS[language].ready :
             introPhase === 'GO' ? TRANSLATIONS[language].go :
             `STAGE ${level.id}`}
          </h2>
        </div>
      )}
    </div>
  );
};
