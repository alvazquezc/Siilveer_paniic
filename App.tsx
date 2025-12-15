import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { VirtualJoystick } from './components/VirtualJoystick';
import { getGameCommentary } from './services/geminiService';
import { LEVELS, MOCK_SCORES, TEASING_PHRASES, SILVER_AVATAR } from './constants';
import { GameStatus, LevelConfig, GameStats, ScoreEntry, Point } from './types';
import { Trophy, Play, Skull, RefreshCw, Zap, Heart, MessageSquare } from 'lucide-react';

export default function App() {
  const [status, setStatus] = useState<GameStatus>(GameStatus.MENU);
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
  const [stats, setStats] = useState<GameStats>({ areaRevealed: 0, timeElapsed: 0, score: 0 });
  const [lives, setLives] = useState(3); 
  const [commentary, setCommentary] = useState<string>('');
  const [direction, setDirection] = useState<Point>({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(false);
  
  // Silver's Mood State
  const [silverMood, setSilverMood] = useState<'NEUTRAL' | 'EXCITED' | 'SAD'>('NEUTRAL');
  const moodTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Banner state
  const [bannerText, setBannerText] = useState("Instrucciones: Corta zonas para revelar el fondo. ¡Evita los enemigos!");

  // Input Handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Logic for "Press any key to continue" when level is complete
      if (status === GameStatus.LEVEL_COMPLETE) {
          nextLevel();
          return;
      }

      const key = e.key.toLowerCase();
      switch(key) {
        case 'arrowup': 
        case 'w':
          setDirection({ x: 0, y: -1 }); 
          break;
        case 'arrowdown': 
        case 's':
          setDirection({ x: 0, y: 1 }); 
          break;
        case 'arrowleft': 
        case 'a':
          setDirection({ x: -1, y: 0 }); 
          break;
        case 'arrowright': 
        case 'd':
          setDirection({ x: 1, y: 0 }); 
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
       const key = e.key.toLowerCase();
       if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(key)) {
           setDirection({ x: 0, y: 0 });
       }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    // Detect mobile
    setIsMobile('ontouchstart' in window);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [status, currentLevelIndex]); // Add dependencies needed for nextLevel closure

  // Banner rotation logic
  useEffect(() => {
    if (status !== GameStatus.PLAYING) return;

    let intervalId: ReturnType<typeof setInterval>;
    
    const timeoutId = setTimeout(() => {
        const rotate = () => {
             const randomPhrase = TEASING_PHRASES[Math.floor(Math.random() * TEASING_PHRASES.length)];
             setBannerText(randomPhrase);
        };
        rotate();
        intervalId = setInterval(rotate, 8000); 
    }, 5000);

    return () => {
        clearTimeout(timeoutId);
        if (intervalId) clearInterval(intervalId);
    };
  }, [status]);

  const triggerSilverMood = (mood: 'EXCITED' | 'SAD') => {
      if (moodTimeoutRef.current) clearTimeout(moodTimeoutRef.current);
      setSilverMood(mood);
      moodTimeoutRef.current = setTimeout(() => {
          setSilverMood('NEUTRAL');
      }, 1500);
  };

  const startGame = (levelIndex: number) => {
    setCurrentLevelIndex(levelIndex);
    setStats({ areaRevealed: 0, timeElapsed: 0, score: 0 });
    setLives(3); 
    setDirection({ x: 0, y: 0 });
    setStatus(GameStatus.PLAYING);
    setCommentary('');
    setSilverMood('NEUTRAL');
    setBannerText("Instrucciones: Corta zonas para revelar el fondo. ¡Evita los enemigos!");
  };

  const handleGameOver = async (finalStats: GameStats) => {
    setStatus(GameStatus.GAME_OVER);
    setStats(finalStats);
    setSilverMood('SAD');
    setCommentary("Analizando tu derrota...");
    const text = await getGameCommentary('GAME_OVER', finalStats, LEVELS[currentLevelIndex].name);
    setCommentary(text);
  };

  const handleLevelComplete = async (finalStats: GameStats) => {
    setStatus(GameStatus.LEVEL_COMPLETE);
    setStats(finalStats);
    setSilverMood('EXCITED');
    setCommentary("Calculando desempeño...");
    const text = await getGameCommentary('WIN', finalStats, LEVELS[currentLevelIndex].name);
    setCommentary(text);
  };

  const nextLevel = () => {
    if (currentLevelIndex + 1 < LEVELS.length) {
      startGame(currentLevelIndex + 1);
    } else {
      startGame(0);
    }
  };

  const handleLivesChange = (newLives: number) => {
      if (newLives < lives) {
          triggerSilverMood('SAD');
      }
      setLives(newLives);
  };

  const handleAreaCapture = () => {
      triggerSilverMood('EXCITED');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans flex flex-col items-center justify-center p-2 sm:p-4">
      
      {/* Dynamic Banner */}
      {status === GameStatus.PLAYING && (
          <div className="fixed top-0 left-0 w-full bg-pink-900/80 backdrop-blur border-b border-pink-500 text-center py-2 z-50 animate-pulse-slow overflow-hidden">
             <span className="font-bold text-pink-200 tracking-wider flex items-center justify-center gap-2 text-sm sm:text-base">
               <MessageSquare size={16} /> {bannerText}
             </span>
          </div>
      )}

      {/* Header / HUD */}
      {status === GameStatus.PLAYING && (
        <div className="w-full max-w-5xl flex flex-col md:flex-row gap-4 justify-between items-center mb-4 bg-slate-800 p-3 rounded-lg border border-slate-700 shadow-lg mt-14 relative overflow-visible">
          
          {/* Silver Character Avatar - Position adjusted for mobile */}
          <div className="absolute -top-8 md:-top-10 left-1/2 transform -translate-x-1/2 md:left-auto md:right-8 md:translate-x-0 w-16 h-16 md:w-20 md:h-20 bg-slate-800 rounded-full border-4 border-slate-600 z-10 overflow-hidden shadow-xl transition-transform hover:scale-110">
              <img 
                 src={SILVER_AVATAR[silverMood]} 
                 alt="Silver" 
                 className={`w-full h-full object-cover transition-all duration-300 ${silverMood === 'EXCITED' ? 'scale-110 brightness-110' : ''} ${silverMood === 'SAD' ? 'grayscale opacity-80' : ''}`}
              />
          </div>

          <div className="flex items-center gap-2 mt-8 md:mt-0 text-center md:text-left">
            <span className="text-rose-400 font-bold whitespace-nowrap">Nivel {LEVELS[currentLevelIndex].id}</span>
            <span className="text-slate-400 hidden sm:inline">|</span>
            <span className="truncate max-w-[150px] sm:max-w-none">{LEVELS[currentLevelIndex].name}</span>
          </div>
          
          <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-6 mt-2 md:mt-0 md:mr-24 w-full md:w-auto">
             {/* Lives */}
             <div className="flex items-center gap-1">
                {[...Array(3)].map((_, i) => (
                    <Heart 
                        key={i} 
                        size={20} 
                        className={`${i < lives ? 'fill-red-500 text-red-500' : 'text-slate-600'} transition-all`} 
                    />
                ))}
             </div>

             <div className="h-6 w-px bg-slate-600 mx-1 sm:mx-2"></div>

             <div className="flex flex-col items-center min-w-[50px]">
                <span className="text-[10px] sm:text-xs text-slate-400">AREA</span>
                <span className={`font-mono text-base sm:text-lg ${stats.areaRevealed > LEVELS[currentLevelIndex].minRevealPercent ? "text-green-400" : "text-white"}`}>
                  {stats.areaRevealed.toFixed(1)}%
                </span>
             </div>
             
             <div className="flex flex-col items-center min-w-[50px]">
                <span className="text-[10px] sm:text-xs text-slate-400">PUNTOS</span>
                <span className="font-mono text-base sm:text-lg text-yellow-400">{stats.score}</span>
             </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="relative w-full max-w-5xl flex flex-col items-center">
        
        {/* MENU */}
        {status === GameStatus.MENU && (
          <div className="text-center space-y-6 sm:space-y-8 animate-fade-in w-full px-2">
            <h1 className="text-4xl sm:text-6xl font-black bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 text-transparent bg-clip-text drop-shadow-lg p-2">
              SIILVEER PANIIC
            </h1>
            <p className="text-slate-400 text-lg sm:text-xl max-w-md mx-auto">
              Corta el tablero, evita al Virus Neón y revela la imagen oculta.
            </p>
            
            {/* Responsive Grid: 1 col mobile, 2 cols tablet, 3 cols desktop (for 6 levels) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto mt-8 w-full">
              {LEVELS.map((level, idx) => (
                <button
                  key={level.id}
                  onClick={() => startGame(idx)}
                  className="group relative overflow-hidden rounded-xl border border-slate-700 bg-slate-800 p-4 hover:border-pink-500 transition-all hover:scale-105 flex items-center gap-4 text-left"
                >
                    <img src={level.imageUrl} className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-md opacity-50 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    <div className="flex-grow min-w-0">
                      <div className="font-bold text-lg truncate text-white">{level.name}</div>
                      <div className="text-xs text-slate-400 mt-1">
                         Dif: {'⭐'.repeat(level.difficulty)}
                      </div>
                      <div className="text-xs text-slate-500">
                         Enemigos: {level.enemyCount}
                      </div>
                    </div>
                </button>
              ))}
            </div>

            <button onClick={() => setStatus(GameStatus.LEADERBOARD)} className="mt-8 text-slate-400 hover:text-white underline block mx-auto">
              Ver Tabla de Posiciones Global
            </button>
          </div>
        )}

        {/* GAME CANVAS */}
        {status === GameStatus.PLAYING && (
          <GameCanvas 
            level={LEVELS[currentLevelIndex]}
            onGameOver={handleGameOver}
            onLevelComplete={handleLevelComplete}
            onStatsUpdate={(s) => setStats(s)}
            direction={direction}
            onLivesChange={handleLivesChange}
            onAreaCapture={handleAreaCapture}
          />
        )}

        {/* WIN SCREEN (Full Image) */}
        {status === GameStatus.LEVEL_COMPLETE && (
            <div className="relative w-full max-w-4xl animate-scale-up z-10 px-2">
                {/* Glowing Frame Container */}
                <div className="relative rounded-lg p-1 bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 animate-pulse shadow-[0_0_50px_rgba(236,72,153,0.6)]">
                    <div className="absolute inset-0 bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 blur-lg opacity-75"></div>
                    <img 
                        src={LEVELS[currentLevelIndex].imageUrl} 
                        className="relative z-10 block w-full h-auto max-h-[70vh] object-contain bg-black rounded-lg shadow-2xl mx-auto"
                        alt="Level Complete Reward"
                    />
                    
                    {/* Overlay UI */}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/80 backdrop-blur-md p-4 sm:p-6 rounded-b-lg flex flex-col md:flex-row justify-between items-center gap-4 border-t border-white/10 z-20">
                         <div className="text-center md:text-left">
                             <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center justify-center md:justify-start gap-2">
                                <Trophy className="text-yellow-400" /> Nivel Completado
                             </h2>
                             <div className="flex justify-center md:justify-start gap-4 text-sm text-slate-300 mt-1 font-mono">
                                <span>Score: <span className="text-white">{stats.score}</span></span>
                                <span>Tiempo: <span className="text-white">{stats.timeElapsed.toFixed(1)}s</span></span>
                             </div>
                             <div className="text-xs text-green-400 mt-2 animate-pulse">
                                Presiona cualquier tecla para continuar...
                             </div>
                         </div>
                         
                         <div className="flex flex-col items-center md:items-end gap-2">
                             <div className="hidden sm:block text-right">
                                <div className="text-xs text-indigo-300 uppercase">Comentario IA</div>
                                <div className="text-xs italic text-indigo-100 max-w-[200px] whitespace-normal truncate">
                                    "{commentary.substring(0, 60)}..."
                                </div>
                             </div>
                             <div className="flex gap-2">
                                <button 
                                    onClick={() => setStatus(GameStatus.MENU)}
                                    className="px-4 py-2 bg-slate-700 rounded-full hover:bg-slate-600 font-bold text-sm"
                                >
                                    Menú
                                </button>
                                <button 
                                    onClick={nextLevel}
                                    className="px-6 py-2 bg-green-600 hover:bg-green-500 rounded-full font-bold flex items-center gap-2 shadow-[0_0_15px_rgba(34,197,94,0.5)] animate-bounce"
                                >
                                    <Play size={16} /> Siguiente
                                </button>
                             </div>
                         </div>
                    </div>
                </div>
            </div>
        )}

        {/* GAME OVER SCREEN */}
        {status === GameStatus.GAME_OVER && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 rounded-lg p-4">
            <div className="bg-slate-900 border-2 border-slate-700 p-6 sm:p-8 rounded-2xl w-full max-w-md text-center shadow-2xl animate-scale-up">
              <Skull className="w-16 h-16 sm:w-20 sm:h-20 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl sm:text-3xl font-bold mb-2">GAME OVER</h2>
              
              <div className="bg-slate-800 p-4 rounded-lg my-4 text-left space-y-2 font-mono">
                <div className="flex justify-between"><span>Area:</span> <span>{stats.areaRevealed.toFixed(1)}%</span></div>
                <div className="flex justify-between text-yellow-400 font-bold"><span>Score:</span> <span>{stats.score}</span></div>
              </div>

              {/* Gemini Commentary */}
              <div className="mb-6 p-3 bg-indigo-900/30 border border-indigo-500/30 rounded-lg italic text-indigo-200">
                <div className="text-xs text-indigo-400 uppercase tracking-widest mb-1 flex items-center justify-center gap-1">
                  <Zap size={12}/> Comentario IA
                </div>
                <div className="text-sm">"{commentary || '...'}"</div>
              </div>

              <div className="flex gap-4 justify-center">
                <button 
                  onClick={() => setStatus(GameStatus.MENU)}
                  className="px-4 sm:px-6 py-2 sm:py-3 bg-slate-700 rounded-full hover:bg-slate-600 font-bold text-sm sm:text-base"
                >
                  Menú
                </button>
                <button 
                  onClick={() => startGame(currentLevelIndex)}
                  className="px-4 sm:px-6 py-2 sm:py-3 bg-rose-600 hover:bg-rose-500 rounded-full font-bold flex items-center gap-2 text-sm sm:text-base"
                >
                  <RefreshCw size={20} /> Reintentar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* LEADERBOARD */}
        {status === GameStatus.LEADERBOARD && (
          <div className="bg-slate-800 p-6 sm:p-8 rounded-xl max-w-2xl w-full border border-slate-700 mx-4">
             <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-center text-yellow-400 flex items-center justify-center gap-3">
               <Trophy /> Salón de la Fama
             </h2>
             <div className="space-y-2">
               {MOCK_SCORES.map((entry, i) => (
                 <div key={i} className="flex justify-between items-center p-3 bg-slate-700/50 rounded hover:bg-slate-700 transition">
                    <div className="flex items-center gap-4">
                      <span className={`font-bold w-6 sm:w-8 text-center ${i===0?'text-yellow-400':i===1?'text-slate-300':'text-orange-400'}`}>#{i+1}</span>
                      <span className="truncate max-w-[120px] sm:max-w-none">{entry.playerName}</span>
                    </div>
                    <div className="flex items-center gap-4 sm:gap-8 text-xs sm:text-sm text-slate-400">
                      <span>Nivel {entry.level}</span>
                      <span className="text-white font-mono font-bold text-base sm:text-lg">{entry.score}</span>
                    </div>
                 </div>
               ))}
             </div>
             <button onClick={() => setStatus(GameStatus.MENU)} className="mt-8 w-full py-3 bg-slate-700 rounded hover:bg-slate-600">
               Volver
             </button>
          </div>
        )}

      </div>

      {/* Mobile Controls */}
      {status === GameStatus.PLAYING && isMobile && (
        <VirtualJoystick onDirectionChange={(dx, dy) => setDirection({x: dx, y: dy})} />
      )}
      
      {/* Footer info */}
      <div className="mt-8 text-slate-500 text-xs text-center hidden sm:block">
        Usa las flechas del teclado o WASD para moverte. Corta áreas para revelar la imagen. Tienes 3 vidas.
      </div>
    </div>
  );
}