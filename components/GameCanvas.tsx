import React, { useEffect, useRef, useState } from 'react';
import { 
  GRID_WIDTH, GRID_HEIGHT, TILE_SIZE, 
  COLOR_SAFE, COLOR_TRAIL, COLOR_BOSS, COLOR_BOSS_CORE, COLOR_PARTICLE, COLOR_PLAYER, COLOR_ITEM,
  INVULNERABILITY_TIME, IDLE_TIMEOUT_MS, COMBO_TIMEOUT_MS, ITEM_LIFETIME, EXCLAMATIONS, TRANSLATIONS
} from '../constants';
import { Point, Enemy, Player, LevelConfig, GameStats, Particle, FlashEffect, FloatingText, Language, Item } from '../types';

interface GameCanvasProps {
  level: LevelConfig;
  onGameOver: (stats: GameStats) => void;
  onLevelComplete: (stats: GameStats) => void;
  onStatsUpdate: (stats: GameStats) => void;
  onLivesChange: (lives: number) => void;
  onAreaCapture: () => void;
  onItemCollect: () => void; // New prop
  direction: Point;
  isPaused: boolean; 
  language: Language;
}

// 0: Empty (Revealed), 1: Filled (Hidden), 2: Trail (Currently drawing)
type TileType = 0 | 1 | 2;

type IntroPhase = 'TITLE' | 'READY' | 'GO' | null;

export const GameCanvas: React.FC<GameCanvasProps> = ({ 
  level, 
  onGameOver, 
  onLevelComplete, 
  onStatsUpdate,
  onLivesChange,
  onAreaCapture,
  onItemCollect,
  direction,
  isPaused,
  language
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  
  // Game State Refs
  const gridRef = useRef<TileType[][]>([]);
  const playerRef = useRef<Player>({ x: 0, y: 0, lives: 3, isDrawing: false, invulnerableUntil: 0, lastMoveTime: 0 });
  const enemiesRef = useRef<Enemy[]>([]);
  const itemsRef = useRef<Item[]>([]); // New items ref
  const statsRef = useRef<GameStats>({ areaRevealed: 0, timeElapsed: 0, score: 0 });
  
  // Timing & Logic Refs
  const lastFrameTimeRef = useRef<number>(Date.now());
  const trailRef = useRef<Point[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const flashEffectsRef = useRef<FlashEffect[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const directionRef = useRef<Point>(direction);

  // Combo System Refs
  const comboRef = useRef({ count: 1, lastActionTime: 0, lastMoveTime: 0 });

  // Intro Sequence State
  const [introPhase, setIntroPhase] = useState<IntroPhase>('TITLE');
  const isIntroFrozenRef = useRef(true); 

  useEffect(() => {
    directionRef.current = direction;
    // Update movement time if direction is not 0,0
    if (direction.x !== 0 || direction.y !== 0) {
        comboRef.current.lastMoveTime = Date.now();
    }
  }, [direction]);

  // Initialization Effect (Run on level load)
  useEffect(() => {
    initGame();
    startIntroSequence();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level]); 

  // Game Loop Control Effect
  useEffect(() => {
    if (isPaused) {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      return;
    }

    lastFrameTimeRef.current = Date.now();
    requestRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPaused, level]); 

  const startIntroSequence = () => {
      isIntroFrozenRef.current = true;
      setIntroPhase('TITLE');

      setTimeout(() => { setIntroPhase('READY'); }, 2000);
      setTimeout(() => { setIntroPhase('GO'); }, 3500);
      setTimeout(() => {
          setIntroPhase(null);
          isIntroFrozenRef.current = false;
          playerRef.current.lastMoveTime = Date.now();
          comboRef.current.lastActionTime = Date.now();
          comboRef.current.lastMoveTime = Date.now();
      }, 4000);
  };

  const initGame = () => {
    const newGrid: TileType[][] = [];
    for (let y = 0; y < GRID_HEIGHT; y++) {
      const row: TileType[] = [];
      for (let x = 0; x < GRID_WIDTH; x++) {
        if (x === 0 || x === GRID_WIDTH - 1 || y === 0 || y === GRID_HEIGHT - 1) {
          row.push(0);
        } else {
          row.push(1);
        }
      }
      newGrid.push(row);
    }
    gridRef.current = newGrid;
    playerRef.current = { x: 0, y: 0, lives: 3, isDrawing: false, invulnerableUntil: 0, lastMoveTime: 0 }; 
    
    // Spawn Enemies
    const newEnemies: Enemy[] = [];
    for(let i=0; i<level.enemyCount; i++) {
        newEnemies.push({
            x: GRID_WIDTH / 2 + (Math.random() * 10 - 5), 
            y: GRID_HEIGHT / 2 + (Math.random() * 10 - 5), 
            vx: level.bossSpeed * (Math.random() > 0.5 ? 1 : -1) * (1 + i * 0.2), 
            vy: level.bossSpeed * (Math.random() > 0.5 ? 1 : -1) * (1 + i * 0.2),
            type: 'BOSS'
        });
    }
    enemiesRef.current = newEnemies;

    itemsRef.current = []; // Clear items
    trailRef.current = [];
    particlesRef.current = [];
    flashEffectsRef.current = [];
    floatingTextsRef.current = [];
    statsRef.current = { areaRevealed: 0, timeElapsed: 0, score: 0 };
    directionRef.current = { x: 0, y: 0 };
    comboRef.current = { count: 1, lastActionTime: Date.now(), lastMoveTime: Date.now() };
    
    onLivesChange(3);
    
    draw(Date.now());
  };

  const gameLoop = () => {
    const nowTs = Date.now();
    const dt = nowTs - lastFrameTimeRef.current;
    lastFrameTimeRef.current = nowTs;

    if (!isIntroFrozenRef.current) {
        update(dt, nowTs);
    }
    
    draw(nowTs);

    if (playerRef.current.lives > 0 && statsRef.current.areaRevealed < 100) {
       requestRef.current = requestAnimationFrame(gameLoop);
    }
  };

  const spawnFloatingText = (x: number, y: number, text: string, color: string, size: number = 1) => {
     floatingTextsRef.current.push({
         x, y, text, color, size, life: 1.0, vy: -0.05
     });
  };

  const breakCombo = () => {
      if (comboRef.current.count > 1) {
          spawnFloatingText(playerRef.current.x, playerRef.current.y - 2, TRANSLATIONS[language].broken, "#ef4444", 0.8);
          comboRef.current.count = 1;
      }
  };

  const update = (dt: number, nowTs: number) => {
    const player = playerRef.current;
    const enemies = enemiesRef.current;
    const grid = gridRef.current;
    const currentDirection = directionRef.current; 

    const isInvulnerable = nowTs < player.invulnerableUntil;

    // 0. Update Time
    statsRef.current.timeElapsed += dt / 1000;

    // COMBO CHECKER
    if (nowTs - comboRef.current.lastMoveTime > IDLE_TIMEOUT_MS) {
        breakCombo();
    }
    if (comboRef.current.count > 1 && nowTs - comboRef.current.lastActionTime > COMBO_TIMEOUT_MS) {
        breakCombo();
    }

    // 1. Update Particles
    for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= dt;
        if (p.life <= 0) {
            particlesRef.current.splice(i, 1);
        }
    }

    // 2. Update Flash Effects
    for (let i = flashEffectsRef.current.length - 1; i >= 0; i--) {
      const f = flashEffectsRef.current[i];
      f.life -= f.decay * (dt / 16); 
      if (f.life <= 0) {
        flashEffectsRef.current.splice(i, 1);
      }
    }

    // 3. Update Floating Texts
    for (let i = floatingTextsRef.current.length - 1; i >= 0; i--) {
        const ft = floatingTextsRef.current[i];
        ft.life -= 0.02 * (dt/16);
        ft.y += ft.vy; // Float up
        if (ft.life <= 0) {
            floatingTextsRef.current.splice(i, 1);
        }
    }

    // 4. Item Logic (Spawn & Update)
    // Spawn chance approx once every few seconds
    if (Math.random() < 0.003 && itemsRef.current.length < 3) {
        // Find a random spot
        const rx = Math.floor(Math.random() * (GRID_WIDTH - 2)) + 1;
        const ry = Math.floor(Math.random() * (GRID_HEIGHT - 2)) + 1;
        // Ideally in hidden area to force risk, but not on trail
        if (grid[ry][rx] === 1 || grid[ry][rx] === 0) {
             itemsRef.current.push({
                 x: rx,
                 y: ry,
                 type: 'SCORE',
                 life: ITEM_LIFETIME,
                 maxLife: ITEM_LIFETIME
             });
        }
    }

    // Update Items
    for (let i = itemsRef.current.length - 1; i >= 0; i--) {
        const item = itemsRef.current[i];
        item.life -= dt;
        if (item.life <= 0) {
            itemsRef.current.splice(i, 1);
            continue;
        }

        // Check Collision with Player
        // Simple distance check in grid units
        const dx = player.x - item.x;
        const dy = player.y - item.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        if (dist < 1.5) {
             // Collect!
             itemsRef.current.splice(i, 1);
             onItemCollect();
             statsRef.current.score += 500;
             spawnFloatingText(player.x, player.y - 1, "+500", COLOR_ITEM, 1.2);
             spawnParticles(item.x, item.y, COLOR_ITEM, 10);
        }
    }

    // 5. Move Player
    if (Date.now() - (playerRef.current.lastMoveTime || 0) > 60) {
        if (currentDirection.x !== 0 || currentDirection.y !== 0) {
            const nextX = player.x + currentDirection.x;
            const nextY = player.y + currentDirection.y;
            
            // Register movement for combo
            comboRef.current.lastMoveTime = nowTs;

            if (nextX >= 0 && nextX < GRID_WIDTH && nextY >= 0 && nextY < GRID_HEIGHT) {
                const nextTile = grid[nextY][nextX];

                if (nextTile === 2) {
                    if (!isInvulnerable) handleDeath();
                } else if (nextTile === 1) {
                    player.isDrawing = true;
                    grid[nextY][nextX] = 2; 
                    trailRef.current.push({ x: nextX, y: nextY });
                    player.x = nextX;
                    player.y = nextY;
                } else if (nextTile === 0) {
                    if (player.isDrawing) {
                         player.x = nextX;
                         player.y = nextY;
                         fillCapturedArea();
                         player.isDrawing = false;
                         trailRef.current = [];
                    } else {
                        player.x = nextX;
                        player.y = nextY;
                    }
                }
            }
            playerRef.current.lastMoveTime = Date.now();
        }
    }

    // 6. Move Enemies (Loop)
    for (const enemy of enemies) {
        let nextX = enemy.x + enemy.vx;
        let nextY = enemy.y + enemy.vy;

        const tileX = Math.floor(nextX);
        const tileY = Math.floor(nextY);
        let collision = false;
        
        // Wall Bounce
        if (tileX < 0 || tileX >= GRID_WIDTH || (grid[tileY]?.[tileX] === 0)) {
           enemy.vx *= -1;
           collision = true;
        }
        if (tileY < 0 || tileY >= GRID_HEIGHT || (grid[tileY]?.[tileX] === 0)) {
           enemy.vy *= -1;
           collision = true;
        }
        
        // Trail Collision
        if (!isInvulnerable && grid[tileY]?.[tileX] === 2) {
            handleDeath();
        }
        
        // Player Collision
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (!isInvulnerable && dist < 2) { 
            handleDeath();
        }

        if (!collision) {
            enemy.x = nextX;
            enemy.y = nextY;
        }
    }

    // 7. Update Stats
    if (Math.random() > 0.9) {
         onStatsUpdate({...statsRef.current});
    }
    
    // Check win
    if (statsRef.current.areaRevealed >= level.minRevealPercent) {
         if (requestRef.current) cancelAnimationFrame(requestRef.current);
         onLevelComplete(statsRef.current);
    }
  };

  const spawnParticles = (x: number, y: number, color: string, count: number) => {
      for (let i = 0; i < count; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = Math.random() * 0.5 + 0.1;
          particlesRef.current.push({
              x: x,
              y: y,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              life: 500 + Math.random() * 500,
              maxLife: 1000,
              color: color,
              size: Math.random() * 0.5 + 0.2
          });
      }
  };

  const fillCapturedArea = () => {
    const grid = gridRef.current;
    const enemies = enemiesRef.current;

    // UPDATE COMBO
    comboRef.current.count += 1;
    comboRef.current.lastActionTime = Date.now();
    const combo = comboRef.current.count;

    // Spawn Combo Text
    const comboColor = combo < 3 ? "#facc15" : combo < 6 ? "#fb923c" : "#f43f5e";
    spawnFloatingText(playerRef.current.x, playerRef.current.y - 3, `x${combo}`, comboColor, 1 + (combo*0.1));

    // Exclamations for high combos
    if (combo % 3 === 0) {
        const ex = EXCLAMATIONS[Math.min(Math.floor(combo/3)-1, EXCLAMATIONS.length-1)];
        spawnFloatingText(playerRef.current.x, playerRef.current.y - 5, ex, "#a855f7", 1.5);
    }

    const tempGrid = grid.map(row => [...row]);
    
    trailRef.current.forEach(p => {
        tempGrid[p.y][p.x] = 0; 
    });

    const visited = new Set<string>();

    for (const enemy of enemies) {
        const startX = Math.floor(enemy.x);
        const startY = Math.floor(enemy.y);
        
        if (startX < 0 || startX >= GRID_WIDTH || startY < 0 || startY >= GRID_HEIGHT) continue;

        if (tempGrid[startY][startX] === 0) continue;
        
        if (visited.has(`${startX},${startY}`)) continue;

        const stack = [{x: startX, y: startY}];
        visited.add(`${startX},${startY}`);

        while (stack.length > 0) {
            const p = stack.pop()!;
            const neighbors = [
                {x: p.x+1, y: p.y}, {x: p.x-1, y: p.y},
                {x: p.x, y: p.y+1}, {x: p.x, y: p.y-1}
            ];

            for (const n of neighbors) {
                if (n.x >= 0 && n.x < GRID_WIDTH && n.y >= 0 && n.y < GRID_HEIGHT) {
                    if (tempGrid[n.y][n.x] === 1 && !visited.has(`${n.x},${n.y}`)) {
                        visited.add(`${n.x},${n.y}`);
                        stack.push(n);
                    }
                }
            }
        }
    }

    let revealedCount = 0;
    let totalCount = GRID_WIDTH * GRID_HEIGHT;
    let didCapture = false;

    for (let y = 0; y < GRID_HEIGHT; y++) {
        for (let x = 0; x < GRID_WIDTH; x++) {
            if (grid[y][x] === 2) {
                grid[y][x] = 0; 
                flashEffectsRef.current.push({ x, y, life: 1.0, decay: 0.05 });
                spawnParticles(x, y, COLOR_TRAIL, 1);
            } 
            else if (grid[y][x] === 1) {
                if (!visited.has(`${x},${y}`)) {
                    grid[y][x] = 0;
                    // APPLY COMBO MULTIPLIER TO SCORE
                    statsRef.current.score += 10 * combo; 
                    didCapture = true;
                    flashEffectsRef.current.push({ 
                        x, 
                        y, 
                        life: 1.0, 
                        decay: 0.03 + Math.random() * 0.02 
                    });
                    
                    if (Math.random() > 0.95) spawnParticles(x, y, '#22d3ee', 1); 
                }
            }
            
            if (grid[y][x] === 0) {
                revealedCount++;
            }
        }
    }
    
    if (didCapture) {
        onAreaCapture();
        spawnParticles(playerRef.current.x, playerRef.current.y, '#ffffff', 20);
    }
    
    const percent = (revealedCount / totalCount) * 100;
    statsRef.current.areaRevealed = percent;
  };

  const handleDeath = () => {
    const player = playerRef.current;
    
    spawnParticles(player.x, player.y, COLOR_PARTICLE, 30);
    spawnParticles(player.x, player.y, '#ffffff', 10);
    
    // BREAK COMBO ON DEATH
    spawnFloatingText(playerRef.current.x, playerRef.current.y - 2, TRANSLATIONS[language].broken, "#ef4444", 1.2);
    comboRef.current.count = 1;

    player.lives -= 1;
    onLivesChange(player.lives);
    
    trailRef.current.forEach(p => {
        gridRef.current[p.y][p.x] = 1; 
        spawnParticles(p.x, p.y, COLOR_TRAIL, 2); 
    });
    trailRef.current = [];
    player.isDrawing = false;
    
    player.x = 0;
    player.y = 0;

    if (player.lives > 0) {
        player.invulnerableUntil = Date.now() + INVULNERABILITY_TIME;
    } else {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
        onGameOver(statsRef.current);
    }
  };

  const draw = (nowTs: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const grid = gridRef.current;
    const player = playerRef.current;
    
    // 1. Draw Grid
    ctx.fillStyle = COLOR_SAFE; 
    ctx.beginPath();
    for (let y = 0; y < GRID_HEIGHT; y++) {
        for (let x = 0; x < GRID_WIDTH; x++) {
            if (grid[y][x] === 1) {
                ctx.rect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE + 0.5, TILE_SIZE + 0.5); 
            }
        }
    }
    ctx.fill();

    // 2. Draw Flash Effects
    for (const f of flashEffectsRef.current) {
      const alpha = Math.max(0, f.life);
      if (f.life > 0.5) {
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      } else {
          ctx.fillStyle = `rgba(34, 211, 238, ${alpha})`; 
      }
      ctx.fillRect(f.x * TILE_SIZE, f.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }

    // 3. Draw Trail
    ctx.fillStyle = COLOR_TRAIL;
    ctx.beginPath();
    for (const p of trailRef.current) {
        ctx.rect(p.x * TILE_SIZE, p.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
    ctx.fill();

    // 4. Draw Items
    for (const item of itemsRef.current) {
        const itemLifeRatio = item.life / item.maxLife;
        const ix = item.x * TILE_SIZE + TILE_SIZE/2;
        const iy = item.y * TILE_SIZE + TILE_SIZE/2;
        
        ctx.fillStyle = COLOR_ITEM;
        ctx.shadowColor = COLOR_ITEM;
        ctx.shadowBlur = 10 * Math.sin(nowTs/100) + 15;
        
        // Draw Star/Diamond shape
        const size = TILE_SIZE * 0.8 * (0.8 + 0.2 * Math.sin(nowTs / 150));
        
        ctx.beginPath();
        ctx.moveTo(ix, iy - size);
        ctx.lineTo(ix + size/2, iy);
        ctx.lineTo(ix, iy + size);
        ctx.lineTo(ix - size/2, iy);
        ctx.closePath();
        ctx.fill();

        // Warning/Blink if about to expire
        if (itemLifeRatio < 0.3 && Math.floor(nowTs / 100) % 2 === 0) {
            ctx.fillStyle = '#fff';
            ctx.fill();
        }
        ctx.shadowBlur = 0;
    }

    // 5. Draw Player
    const isInvulnerable = nowTs < player.invulnerableUntil;
    const opacity = isInvulnerable ? (Math.floor(nowTs / 100) % 2 === 0 ? 0.3 : 1) : 1;
    const px = player.x * TILE_SIZE + TILE_SIZE/2;
    const py = player.y * TILE_SIZE + TILE_SIZE/2;
    
    ctx.globalAlpha = opacity;
    
    // Pulsing Target Ring
    const ringSize = (Math.sin(nowTs / 200) * 0.3 + 1.4) * (TILE_SIZE / 2);
    ctx.strokeStyle = COLOR_PLAYER;
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = 5;
    ctx.shadowColor = COLOR_PLAYER;
    ctx.beginPath();
    ctx.arc(px, py, ringSize, 0, Math.PI * 2);
    ctx.stroke();

    // High Contrast Outline
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff'; 
    ctx.beginPath();
    ctx.arc(px, py, TILE_SIZE / 2 + 1, 0, Math.PI * 2);
    ctx.fill();

    // Player Core
    ctx.fillStyle = COLOR_PLAYER;
    ctx.shadowColor = '#ffffff'; 
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(px, py, TILE_SIZE / 2 - 1, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;

    // 6. Draw Enemies
    const pulse = Math.sin(nowTs / 200) * 0.2 + 1; 
    
    for (const enemy of enemiesRef.current) {
        const cx = enemy.x * TILE_SIZE + TILE_SIZE/2;
        const cy = enemy.y * TILE_SIZE + TILE_SIZE/2;
        
        ctx.fillStyle = COLOR_BOSS;
        ctx.shadowColor = COLOR_BOSS;
        ctx.shadowBlur = 20;
        
        const spikes = 8; 
        const outerRadius = TILE_SIZE * 1.5 * pulse;
        const innerRadius = TILE_SIZE * 0.7;
        
        ctx.beginPath();
        for(let i=0; i<spikes*2; i++) {
            const r = i%2 === 0 ? outerRadius : innerRadius;
            const angle = (Math.PI * i) / spikes + (nowTs / 500); 
            ctx.lineTo(cx + Math.cos(angle)*r, cy + Math.sin(angle)*r);
        }
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = COLOR_BOSS_CORE;
        ctx.beginPath();
        ctx.arc(cx, cy, innerRadius * 0.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    // 7. Draw Particles
    for (const p of particlesRef.current) {
        ctx.globalAlpha = p.life / p.maxLife;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        const size = p.size * TILE_SIZE;
        ctx.rect(p.x * TILE_SIZE, p.y * TILE_SIZE, size, size);
        ctx.fill();
    }
    ctx.globalAlpha = 1;

    // 8. Draw Floating Texts (Combos)
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur = 2;
    ctx.shadowColor = '#000';
    
    for (const ft of floatingTextsRef.current) {
        ctx.globalAlpha = ft.life;
        const scale = 1 + (1 - ft.life) * 0.5; // Grow slightly as it fades
        ctx.font = `900 ${14 * ft.size * scale}px "Black Ops One", sans-serif`;
        ctx.fillStyle = ft.color;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        
        const tx = ft.x * TILE_SIZE + TILE_SIZE/2;
        const ty = ft.y * TILE_SIZE + TILE_SIZE/2;
        
        ctx.strokeText(ft.text, tx, ty);
        ctx.fillText(ft.text, tx, ty);
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    // 9. DRAW COMBO METER (Moved to Canvas for instant response)
    if (comboRef.current.count > 1) {
        const timeLeft = Math.max(0, COMBO_TIMEOUT_MS - (nowTs - comboRef.current.lastActionTime));
        const idleTimeLeft = Math.max(0, IDLE_TIMEOUT_MS - (nowTs - comboRef.current.lastMoveTime));
        
        // Only draw if not timed out
        if (timeLeft > 0 && idleTimeLeft > 0) {
             const cx = (GRID_WIDTH * TILE_SIZE) - 60;
             const cy = 40;
             
             // Text
             ctx.textAlign = 'right';
             ctx.font = '900 36px "Press Start 2P"';
             ctx.fillStyle = '#facc15';
             ctx.shadowColor = '#b45309';
             ctx.shadowBlur = 10;
             ctx.fillText(`x${comboRef.current.count}`, cx + 40, cy);
             
             // Bar Background
             ctx.shadowBlur = 0;
             ctx.fillStyle = '#334155';
             ctx.fillRect(cx - 60, cy + 10, 100, 8);
             
             // Bar Fill
             const fillPercent = timeLeft / COMBO_TIMEOUT_MS;
             ctx.fillStyle = '#facc15';
             ctx.fillRect(cx - 60, cy + 10, 100 * fillPercent, 8);
             
             // Border
             ctx.strokeStyle = '#ffffff';
             ctx.lineWidth = 1;
             ctx.strokeRect(cx - 60, cy + 10, 100, 8);
        }
    }
  };

  return (
    <div className="relative rounded-lg overflow-hidden shadow-2xl border-4 border-slate-700 select-none bg-black">
       {/* Background Image is always there, but covered by the canvas */}
       <div 
         className="absolute inset-0 z-0 bg-cover bg-center"
         style={{ backgroundImage: `url(${level.imageUrl})` }}
       />
       <canvas
         ref={canvasRef}
         width={GRID_WIDTH * TILE_SIZE}
         height={GRID_HEIGHT * TILE_SIZE}
         className="relative z-10 block"
         style={{ 
            width: '100%', 
            height: 'auto',
            aspectRatio: `${GRID_WIDTH}/${GRID_HEIGHT}` 
         }}
       />
       
       {/* INTRO OVERLAY */}
       {introPhase && (
           <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
               {introPhase === 'TITLE' && (
                   <div className="flex flex-col items-center animate-bounce">
                        <h2 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 drop-shadow-[0_4px_0_#000] font-arcade transform -skew-x-12">
                            STAGE {level.id}
                        </h2>
                        <div className="text-white font-bold tracking-widest mt-2 bg-black px-4 py-1 skew-x-12 text-lg uppercase border-2 border-white">
                            {level.name}
                        </div>
                   </div>
               )}
               {introPhase === 'READY' && (
                   <h2 className="text-6xl md:text-8xl font-black text-white tracking-widest animate-pulse font-arcade drop-shadow-[0_0_20px_rgba(255,255,255,0.8)]">
                       {TRANSLATIONS[language].ready}
                   </h2>
               )}
               {introPhase === 'GO' && (
                   <h2 className="text-8xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-b from-green-400 to-blue-600 tracking-tighter animate-ping font-arcade">
                       {TRANSLATIONS[language].go}
                   </h2>
               )}
           </div>
       )}
       
       {/* Simple Pause Overlay for Canvas Context */}
       {isPaused && (
         <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] z-20" />
       )}
    </div>
  );
};