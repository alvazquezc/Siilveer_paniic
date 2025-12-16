import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { VirtualJoystick } from './components/VirtualJoystick';
import { RetroJukebox, RetroJukeboxRef } from './components/RetroJukebox';
import { getGameCommentary } from './services/geminiService';
import { LEVELS, MOCK_SCORES, TEASING_PHRASES, SILVER_AVATAR, TRANSLATIONS } from './constants';
import { GameStatus, GameStats, Point, Language, ScoreEntry } from './types';
import { Trophy, Play, Skull, RefreshCw, Zap, Heart, MessageSquare, Pause, PlayCircle, Star, ImageOff, Save, ChevronRight, Eye, X, Coins, Gamepad2, Trash2, Terminal, FastForward } from 'lucide-react';

// VERSION CONTROL CONSTANT
// Changing this forces a data reset for the user. 
// Useful when changing core mechanics like level indices.
const DATA_VERSION = 'v2.0_tutorial_update';

export default function App() {
  const [status, setStatus] = useState<GameStatus>(GameStatus.MENU);
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
  const [stats, setStats] = useState<GameStats>({ areaRevealed: 0, timeElapsed: 0, score: 0 });
  const [lives, setLives] = useState(3); 
  const [commentary, setCommentary] = useState<string>('');
  const [direction, setDirection] = useState<Point>({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(false);
  const [language, setLanguage] = useState<Language>('ES');
  
  // Progression Logic
  const [unlockedLevels, setUnlockedLevels] = useState<number[]>([]);
  const [continuesUsed, setContinuesUsed] = useState(0);
  const [continueTimer, setContinueTimer] = useState(10);
  
  // High Score Logic
  const [highScores, setHighScores] = useState<ScoreEntry[]>([]);
  const [playerName, setPlayerName] = useState('AAA');
  
  // View Image Logic for Gallery
  const [viewGalleryImage, setViewGalleryImage] = useState<string | null>(null);

  // Audio Ref
  const jukeboxRef = useRef<RetroJukeboxRef>(null);

  // Safety Ref to prevent race conditions on quit
  const isGameActiveRef = useRef(false);

  // Silver's Mood State
  const [silverMood, setSilverMood] = useState<'NEUTRAL' | 'EXCITED' | 'SAD' | 'DEFEATED'>('NEUTRAL');
  const moodTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Banner state
  const [bannerText, setBannerText] = useState(TRANSLATIONS['ES'].instructions);

  // Fallback Images (Anime Style)
  const FALLBACK_AVATAR = "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&q=80"; // Anime/Cosplay style girl
  const FALLBACK_SCENERY = "https://images.unsplash.com/photo-1636955860106-9eb89e576026?q=80&w=1080"; // Cyberpunk City

  // --- INITIALIZATION ---
  useEffect(() => {
      const storedVersion = localStorage.getItem('SIILVEER_DATA_VERSION');

      // RESET LOGIC if version mismatch (forces Level 0 start)
      if (storedVersion !== DATA_VERSION) {
          console.log("New version detected or first run. Resetting progress to ensure correct flow.");
          
          // Clear old data
          localStorage.removeItem('SIILVEER_PANIIC_UNLOCKS');
          // We can optionally keep scores, but let's reset to be clean
          // localStorage.removeItem('SIILVEER_PANIIC_SCORES'); 

          // Set defaults
          setUnlockedLevels([0]); // Only Level 0 is unlocked
          
          // Load or Mock Scores (preserving scores if we want, but versioning usually implies reset)
          setHighScores(MOCK_SCORES);
          
          // Save new version
          localStorage.setItem('SIILVEER_DATA_VERSION', DATA_VERSION);
          localStorage.setItem('SIILVEER_PANIIC_UNLOCKS', JSON.stringify([0]));
      } else {
          // NORMAL LOAD
          const storedScores = localStorage.getItem('SIILVEER_PANIIC_SCORES');
          if (storedScores) {
              setHighScores(JSON.parse(storedScores));
          } else {
              setHighScores(MOCK_SCORES);
          }

          const storedUnlocks = localStorage.getItem('SIILVEER_PANIIC_UNLOCKS');
          if (storedUnlocks) {
              const parsed = JSON.parse(storedUnlocks);
              setUnlockedLevels(parsed);
          } else {
              setUnlockedLevels([0]);
          }
      }
  }, []);

  // Continue Timer Countdown
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (status === GameStatus.CONTINUE_SCREEN) {
        timer = setInterval(() => {
            setContinueTimer((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    handleGiveUp(); // Auto give up
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }
    return () => clearInterval(timer);
  }, [status]);

  // Update banner text when language changes
  useEffect(() => {
      if (status === GameStatus.PLAYING) {
         setBannerText(TRANSLATIONS[language].instructions);
      }
  }, [language, status]);

  // Pause toggle function
  const togglePause = useCallback(() => {
    setStatus(prev => {
        if (prev === GameStatus.PLAYING) return GameStatus.PAUSED;
        if (prev === GameStatus.PAUSED) return GameStatus.PLAYING;
        // Allow exiting fullscreen view with pause/esc
        if (prev === GameStatus.VIEW_IMAGE) return GameStatus.LEVEL_COMPLETE;
        return prev;
    });
  }, []);

  // HTML5 VISIBILITY API & BLUR HANDLING
  useEffect(() => {
    const handleVisibilityChange = () => {
       if (document.hidden && status === GameStatus.PLAYING) {
           setStatus(GameStatus.PAUSED);
       }
    };

    const handleBlur = () => {
      if (status === GameStatus.PLAYING) {
        setStatus(GameStatus.PAUSED);
      }
    };
    
    // Auto-focus window on mount/click to ensure keyboard works immediately
    const handleFocus = () => {
        window.focus();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('click', handleFocus);
    
    // Initial focus attempt
    window.focus();

    return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('blur', handleBlur);
        window.removeEventListener('click', handleFocus);
    };
  }, [status]);

  // Input Handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      
      // Allow typing in High Score Input
      if (status === GameStatus.NEW_HIGHSCORE) return;

      // Prevent scrolling on itch.io page
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'space', 'w', 'a', 's', 'd'].includes(key)) {
          e.preventDefault();
      }

      // Pause shortcut
      if (key === 'p' || key === 'escape') {
          if (viewGalleryImage) {
             setViewGalleryImage(null);
          } else {
             togglePause();
          }
          return;
      }

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
  }, [status, currentLevelIndex, togglePause, viewGalleryImage]); 

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

  const startGame = (levelIndex: number, resetScore: boolean = true) => {
    isGameActiveRef.current = true; // Activar el juego
    setCurrentLevelIndex(levelIndex);
    if (resetScore) {
        setStats({ areaRevealed: 0, timeElapsed: 0, score: 0 });
        setContinuesUsed(0);
    } else {
        // Reset only level specific stats, keep score
        setStats(prev => ({ areaRevealed: 0, timeElapsed: 0, score: prev.score }));
    }
    setLives(3); 
    setDirection({ x: 0, y: 0 });
    setStatus(GameStatus.PLAYING);
    setCommentary('');
    setSilverMood('NEUTRAL');
    setBannerText(TRANSLATIONS[language].instructions);
  };

  // Called when player loses all lives
  const handlePlayerDeath = (finalStats: GameStats) => {
    if (!isGameActiveRef.current) return;
    setStats(finalStats);
    setSilverMood('DEFEATED');
    setContinueTimer(10);
    setStatus(GameStatus.CONTINUE_SCREEN);
  };

  const handleContinue = () => {
      isGameActiveRef.current = true;
      // Penalty: Lose 30% of score
      const penalty = Math.floor(stats.score * 0.3);
      setStats(prev => ({ ...prev, score: Math.max(0, prev.score - penalty) }));
      setContinuesUsed(prev => prev + 1);
      
      // Restart current level
      startGame(currentLevelIndex, false);
  };

  const handleGiveUp = async () => {
    // True Game Over
    // Check for High Score logic here
    const lowestScore = highScores.length < 10 ? 0 : highScores[highScores.length - 1].score;
    
    // Only allow high score if score > 0 and better than lowest
    if (stats.score > 0 && stats.score > lowestScore) {
        setStatus(GameStatus.NEW_HIGHSCORE);
        setPlayerName('AAA'); 
    } else {
        setStatus(GameStatus.GAME_OVER);
        setCommentary("...");
        const text = await getGameCommentary('GAME_OVER', stats, LEVELS[currentLevelIndex].name, language);
        setCommentary(text);
    }
  };

  const submitHighScore = () => {
      const newEntry: ScoreEntry = {
          playerName: playerName.toUpperCase().substring(0, 3),
          score: stats.score,
          level: LEVELS[currentLevelIndex].id,
          date: new Date().toISOString().split('T')[0]
      };

      const updatedScores = [...highScores, newEntry]
          .sort((a, b) => b.score - a.score)
          .slice(0, 10);
      
      setHighScores(updatedScores);
      localStorage.setItem('SIILVEER_PANIIC_SCORES', JSON.stringify(updatedScores));
      
      setStatus(GameStatus.LEADERBOARD);
  };

  const handleLevelComplete = async (finalStats: GameStats) => {
    // SECURITY CHECK: If game is not active (e.g., user quit), IGNORE win condition
    if (!isGameActiveRef.current) return;

    setStatus(GameStatus.LEVEL_COMPLETE);
    setStats(finalStats);
    setSilverMood('EXCITED');
    setCommentary("...");
    
    // Unlock NEXT Level Logic
    // currentLevelIndex correlates to LEVELS array index.
    // If we just finished Level 0 (Index 0), next is Level 1 (Index 1).
    const nextLevelIdx = currentLevelIndex + 1;
    
    if (nextLevelIdx < LEVELS.length) {
        const nextLevelId = LEVELS[nextLevelIdx].id;
        
        // Ensure we add the NEXT level ID to unlocks if not present
        if (!unlockedLevels.includes(nextLevelId)) {
            const newUnlocks = [...unlockedLevels, nextLevelId];
            setUnlockedLevels(newUnlocks);
            localStorage.setItem('SIILVEER_PANIIC_UNLOCKS', JSON.stringify(newUnlocks));
        }
    }

    const text = await getGameCommentary('WIN', finalStats, LEVELS[currentLevelIndex].name, language);
    setCommentary(text);
  };
  
  // Lógica específica para saltar el nivel 0
  const handleSkipSimulation = () => {
      // Forzamos active para permitir el skip
      isGameActiveRef.current = true;
      const mockStats = { ...stats, areaRevealed: 100, timeElapsed: 0 };
      handleLevelComplete(mockStats);
  };

  // Función segura para salir al menú sin guardar progreso erróneo
  const handleQuitToMenu = () => {
      // CRITICAL: Kill the game session immediately.
      // This prevents any pending frame in GameCanvas from triggering a win.
      isGameActiveRef.current = false;
      
      setStats({ areaRevealed: 0, timeElapsed: 0, score: 0 });
      setStatus(GameStatus.MENU);
  };

  const nextLevel = () => {
    if (currentLevelIndex + 1 < LEVELS.length) {
      startGame(currentLevelIndex + 1, false); // false = keep score
    } else {
      // Beat the game!
      handleGiveUp(); // Trigger High Score check since game is done
    }
  };

  const handleLivesChange = (newLives: number) => {
      if (newLives < lives) {
          triggerSilverMood('SAD');
          jukeboxRef.current?.playDamageSound();
      }
      setLives(newLives);
  };

  const handleAreaCapture = () => {
      triggerSilverMood('EXCITED');
      jukeboxRef.current?.playCaptureSound();
  };

  const handleItemCollect = () => {
      jukeboxRef.current?.playItemSound();
      triggerSilverMood('EXCITED');
  };

  const handleProximityUpdate = (intensity: number) => {
      jukeboxRef.current?.setProximityIntensity(intensity);
  };

  const resetProgress = () => {
     // Use a standard confirm dialog
     const confirmed = window.confirm("¡ATENCIÓN! \n\n¿Estás seguro de que quieres BORRAR todo tu progreso y puntuaciones? \n\nEsta acción no se puede deshacer y la página se recargará.");
     
     if (confirmed) {
        // Clear specific keys
        localStorage.removeItem('SIILVEER_PANIIC_UNLOCKS');
        localStorage.removeItem('SIILVEER_PANIIC_SCORES');
        localStorage.removeItem('SIILVEER_DATA_VERSION'); // Clear version to force re-init
        
        // Force reload to clean slate
        window.location.reload();
     }
  };

  // Calculate highest unlocked level for Resume feature
  // With Level 0 starting at index 0, we simply take the max ID
  const maxUnlockedLevel = Math.max(...unlockedLevels, 0);

  // Helper component for the Arcade Logo
  const ArcadeLogo = () => (
    <div className="relative mb-6 transform -skew-x-6 rotate-[-5deg] hover:scale-105 transition-transform duration-500 cursor-default">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[60%] bg-pink-500/80 blur-xl rounded-full z-0 animate-pulse"></div>
      <h1 className="relative z-10 text-6xl md:text-8xl font-black leading-none tracking-tighter neon-hollow-cyan" style={{ fontFamily: '"Black Ops One", system-ui' }}>
        SIILVEER
      </h1>
      <h1 className="relative z-20 text-6xl md:text-8xl font-black leading-none tracking-tighter -mt-4 md:-mt-8 ml-12 md:ml-24 neon-hollow-warm" style={{ fontFamily: '"Black Ops One", system-ui' }}>
        PANIIC
        <span className="absolute -right-8 -top-4 text-pink-400 animate-bounce text-6xl drop-shadow-[0_0_10px_rgba(244,114,182,0.8)]">!</span>
      </h1>
    </div>
  );

  return (
    <div className={`w-full h-full text-white font-sans flex flex-col items-center justify-center p-2 sm:p-4 overflow-hidden ${status === GameStatus.MENU ? 'bg-brick' : 'bg-slate-900'}`}>
      
      <RetroJukebox 
        ref={jukeboxRef}
        levelIndex={currentLevelIndex} 
        gameStatus={status}
      />

      {/* Dynamic Banner */}
      {status === GameStatus.PLAYING && (
          <div className="fixed top-0 left-0 w-full bg-pink-900/80 backdrop-blur border-b border-pink-500 text-center py-2 z-50 animate-pulse-slow overflow-hidden">
             <span className="font-bold text-pink-200 tracking-wider flex items-center justify-center gap-2 text-sm sm:text-base">
               <MessageSquare size={16} /> {bannerText}
             </span>
          </div>
      )}

      {/* Header / HUD */}
      {(status === GameStatus.PLAYING || status === GameStatus.PAUSED) && (
        <div className="w-full max-w-5xl flex flex-col md:flex-row gap-4 justify-between items-center mb-4 bg-slate-800 p-3 rounded-lg border border-slate-700 shadow-lg mt-14 relative overflow-visible shrink-0">
          
          <div className="absolute -top-8 md:-top-10 left-1/2 transform -translate-x-1/2 md:left-auto md:right-8 md:translate-x-0 w-16 h-16 md:w-20 md:h-20 bg-slate-800 rounded-full border-4 border-slate-600 z-10 overflow-hidden shadow-xl transition-transform hover:scale-110 flex items-center justify-center bg-black">
              <img 
                 src={SILVER_AVATAR[silverMood]} 
                 alt="Silver" 
                 onError={(e) => {
                     e.currentTarget.onerror = null; // Prevent infinite loop
                     e.currentTarget.src = FALLBACK_AVATAR; // Anime Fallback
                 }}
                 className={`w-full h-full object-cover transition-all duration-300 ${silverMood === 'EXCITED' ? 'scale-110 brightness-110' : ''} ${silverMood === 'SAD' ? 'grayscale opacity-80' : ''}`}
              />
              <div className="absolute inset-0 flex items-center justify-center -z-10">
                 <ImageOff size={24} className="text-slate-500"/>
              </div>
          </div>

          <div className="flex items-center gap-2 mt-8 md:mt-0 text-center md:text-left">
            <span className="text-rose-400 font-bold whitespace-nowrap">{TRANSLATIONS[language].level} {LEVELS[currentLevelIndex].id}</span>
            <span className="text-slate-400 hidden sm:inline">|</span>
            <span className="truncate max-w-[150px] sm:max-w-none">{LEVELS[currentLevelIndex].name}</span>
          </div>
          
          <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-6 mt-2 md:mt-0 md:mr-24 w-full md:w-auto">
             <div className="flex items-center gap-1">
                {LEVELS[currentLevelIndex].id === 0 ? (
                    <span className="text-green-400 font-bold text-xs tracking-widest animate-pulse border border-green-500/50 px-2 py-0.5 rounded bg-green-900/20">
                        INF LIVES
                    </span>
                ) : (
                    [...Array(3)].map((_, i) => (
                        <Heart 
                            key={i} 
                            size={20} 
                            className={`${i < lives ? 'fill-red-500 text-red-500' : 'text-slate-600'} transition-all`} 
                        />
                    ))
                )}
             </div>

             <div className="h-6 w-px bg-slate-600 mx-1 sm:mx-2"></div>

             <div className="flex flex-col items-center min-w-[50px]">
                <span className="text-[10px] sm:text-xs text-slate-400">{TRANSLATIONS[language].area}</span>
                <span className={`font-mono text-base sm:text-lg ${stats.areaRevealed > LEVELS[currentLevelIndex].minRevealPercent ? "text-green-400" : "text-white"}`}>
                  {stats.areaRevealed.toFixed(1)}%
                </span>
             </div>
             
             <div className="flex flex-col items-center min-w-[50px]">
                <span className="text-[10px] sm:text-xs text-slate-400">{TRANSLATIONS[language].score}</span>
                <span className="font-mono text-base sm:text-lg text-yellow-400">
                    {LEVELS[currentLevelIndex].id === 0 ? "---" : stats.score}
                </span>
             </div>

             {/* Skip Simulation Button (Only Level 0) */}
             {LEVELS[currentLevelIndex].id === 0 && (
                 <button
                    onClick={handleSkipSimulation}
                    className="ml-2 p-2 bg-green-900/40 hover:bg-green-600/60 rounded-full transition-colors text-green-400 hover:text-white border border-green-500/30"
                    title="Skip Simulation"
                 >
                     <FastForward size={24} />
                 </button>
             )}

             <button 
                onClick={togglePause}
                className="ml-2 p-2 hover:bg-slate-700 rounded-full transition-colors text-slate-300 hover:text-white"
                aria-label={status === GameStatus.PAUSED ? "Resume" : "Pause"}
             >
                 {status === GameStatus.PAUSED ? <PlayCircle size={24} /> : <Pause size={24} />}
             </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="relative w-full max-w-5xl flex flex-col items-center flex-1 justify-center min-h-0">
        
        {/* MENU - RETRO COVER STYLE */}
        {status === GameStatus.MENU && (
          <div className="w-full flex flex-col items-center animate-fade-in relative z-10 overflow-y-auto max-h-full py-4 pb-20 no-scrollbar">
            
            {/* Top Section: Logo & Silver */}
            <div className="flex flex-col md:flex-row items-center justify-center gap-8 mb-8 mt-4 w-full shrink-0">
               <ArcadeLogo />
               
               {/* Language Selector in Menu */}
               <div className="absolute top-0 right-0 p-2 flex gap-2">
                 {(['ES', 'EN', 'FR'] as Language[]).map((lang) => (
                   <button 
                     key={lang}
                     onClick={() => setLanguage(lang)}
                     className={`px-3 py-1 font-bold text-xs rounded border-2 ${language === lang ? 'bg-yellow-400 text-black border-yellow-400' : 'bg-slate-800 text-slate-400 border-slate-600 hover:border-slate-400'}`}
                   >
                     {lang}
                   </button>
                 ))}
               </div>

               {/* "Interactive" Character Display */}
               <div className="hidden md:block relative w-48 h-48 border-4 border-yellow-400 bg-slate-800 rotate-3 shadow-[8px_8px_0px_#000]">
                  <div className="absolute -top-3 -left-3 bg-red-600 text-white font-bold px-2 py-0.5 text-xs font-arcade animate-pulse z-20">
                    NEW!
                  </div>
                  <img 
                    src={SILVER_AVATAR.NEUTRAL} 
                    className="w-full h-full object-cover opacity-90" 
                    alt="Character" 
                    onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = FALLBACK_AVATAR;
                    }}
                  />
                  <div className="absolute bottom-0 w-full bg-black/80 text-center text-yellow-400 font-arcade text-xs py-1">
                    SILVER
                  </div>
               </div>
            </div>

            {/* START / CONTINUE BUTTONS */}
            <div className="flex flex-col gap-4 mb-8 z-20 items-center">
                {/* Only show Continue if we have passed Level 0 (so index is > 0) */}
                {maxUnlockedLevel > 0 && (
                    <button 
                        onClick={() => startGame(maxUnlockedLevel)} 
                        className="relative group px-12 py-6 bg-green-600 hover:bg-green-500 border-b-8 border-green-800 active:border-b-0 active:translate-y-2 rounded-xl transition-all shadow-[0_0_30px_rgba(34,197,94,0.6)] animate-bounce"
                    >
                        <div className="flex items-center gap-4 text-2xl md:text-3xl font-black italic text-white font-arcade uppercase tracking-widest">
                                <PlayCircle size={40} className="animate-pulse" />
                                CONTINUE LVL {maxUnlockedLevel}
                        </div>
                        <div className="absolute inset-0 rounded-xl border-4 border-white opacity-0 group-hover:opacity-100 animate-pulse transition-opacity pointer-events-none"></div>
                    </button>
                )}

                <button 
                    onClick={() => startGame(0)} 
                    className={`relative group px-8 py-4 ${maxUnlockedLevel > 0 ? 'bg-slate-700 hover:bg-slate-600 border-slate-900 text-sm' : 'bg-red-600 hover:bg-red-500 border-red-800 text-3xl animate-bounce'} border-b-8 active:border-b-0 active:translate-y-2 rounded-xl transition-all shadow-xl`}
                >
                    <div className="flex items-center gap-3 font-black italic text-white font-arcade uppercase tracking-widest justify-center">
                            <Gamepad2 size={maxUnlockedLevel > 0 ? 24 : 40} />
                            {maxUnlockedLevel > 0 ? "RESTART (LVL 0)" : "START MISSION"}
                    </div>
                </button>
            </div>
            
            {/* Gallery Grid (VIEW ONLY) */}
            <div className="bg-slate-800/80 w-full max-w-4xl p-2 rounded-t-lg mb-2 text-center text-slate-400 text-xs font-arcade uppercase tracking-widest">
                 UNLOCKED GALLERY
            </div>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-4 max-w-4xl mx-auto w-full px-4 shrink-0 pb-8">
              {LEVELS.filter(l => l.id > 0).map((level, idx) => {
                const isUnlocked = unlockedLevels.includes(level.id);
                return (
                <div
                  key={level.id}
                  onClick={() => {
                      if (isUnlocked) setViewGalleryImage(level.imageUrl);
                  }}
                  className={`group relative bg-slate-800 border-2 border-slate-600 overflow-hidden aspect-square rounded cursor-pointer transition-all ${isUnlocked ? 'hover:border-green-400 hover:scale-105' : 'opacity-50 cursor-not-allowed'}`}
                >
                  <img 
                    src={level.imageUrl} 
                    className={`w-full h-full object-cover transition-all duration-500 ${isUnlocked ? 'grayscale-0' : 'blur-md grayscale opacity-50'}`} 
                    alt={level.name}
                    onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = FALLBACK_SCENERY;
                    }}
                  />
                  
                  {isUnlocked && (
                      <div className="absolute top-1 right-1 bg-green-500 text-white rounded-full p-0.5 shadow">
                          <Eye size={10} />
                      </div>
                  )}

                  <div className="absolute bottom-0 w-full bg-black/60 text-[8px] sm:text-[10px] text-white text-center py-1 truncate px-1">
                      {isUnlocked ? level.name : 'LOCKED'}
                  </div>
                </div>
              )})}
            </div>

            {/* Footer Credits and Controls */}
            <div className="mt-auto mb-4 text-center shrink-0 flex flex-col items-center gap-4">
               <button onClick={() => setStatus(GameStatus.LEADERBOARD)} className="font-arcade text-xs md:text-sm text-cyan-400 hover:text-white hover:underline animate-pulse">
                 [ {TRANSLATIONS[language].menu_scores} ]
               </button>
               
               {/* RESET PROGRESS BUTTON */}
               <button 
                  onClick={resetProgress}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-red-900/30 text-red-500 hover:text-red-400 border border-slate-700 hover:border-red-800 rounded-full transition-all text-xs z-50 cursor-pointer"
                  title="Borrar progreso y recargar"
               >
                  <Trash2 size={14} /> BORRAR DATOS
               </button>

               <div className="text-[10px] text-slate-500 font-mono uppercase">
                 © 2025 SIILVEER GAMES. {TRANSLATIONS[language].menu_credits}.<br/>
                 MADE WITH REACT & GEMINI.
               </div>
            </div>
          </div>
        )}

        {/* GALLERY FULLSCREEN VIEW (FROM MENU) */}
        {viewGalleryImage && (
             <div 
                className="absolute inset-0 z-50 bg-black/95 flex items-center justify-center cursor-zoom-out animate-fade-in"
                onClick={() => setViewGalleryImage(null)}
             >
                <img 
                    src={viewGalleryImage}
                    className="max-w-full max-h-full object-contain p-4 shadow-[0_0_50px_rgba(255,255,255,0.1)]"
                    alt="Gallery View"
                    onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = FALLBACK_SCENERY;
                    }}
                />
                <button className="absolute top-4 right-4 text-white/50 hover:text-white">
                    <X size={32} />
                </button>
                <div className="absolute bottom-8 text-white font-arcade text-sm bg-black/50 px-4 py-2 rounded-full border border-white/20">
                    CLICK TO CLOSE
                </div>
             </div>
        )}

        {/* GAME CANVAS */}
        {(status === GameStatus.PLAYING || status === GameStatus.PAUSED) && (
          <div className="relative w-full flex-1 flex items-center justify-center min-h-0">
             <GameCanvas 
                level={LEVELS[currentLevelIndex]}
                onGameOver={handlePlayerDeath}
                onLevelComplete={handleLevelComplete}
                onStatsUpdate={(s) => setStats(s)}
                direction={direction}
                onLivesChange={handleLivesChange}
                onAreaCapture={handleAreaCapture}
                onItemCollect={handleItemCollect}
                onProximityUpdate={handleProximityUpdate}
                isPaused={status === GameStatus.PAUSED}
                language={language}
            />
            {/* PAUSE OVERLAY */}
            {status === GameStatus.PAUSED && (
                <div className="absolute inset-0 z-30 flex flex-col items-center justify-center pointer-events-none">
                    <div className="bg-black/70 backdrop-blur-sm p-8 rounded-xl border border-slate-600 shadow-2xl animate-scale-up text-center pointer-events-auto">
                        <h2 className="text-4xl font-black text-white mb-2 tracking-widest">{TRANSLATIONS[language].pause_title}</h2>
                        <p className="text-slate-400 mb-6">{TRANSLATIONS[language].pause_subtitle}</p>
                        
                        <div className="flex flex-col gap-3">
                            {/* Skip Simulation in Pause Menu too (Only Level 0) */}
                            {LEVELS[currentLevelIndex].id === 0 && (
                                <button 
                                    onClick={handleSkipSimulation}
                                    className="px-6 py-3 bg-green-800/80 hover:bg-green-600 rounded-full font-bold flex items-center justify-center gap-2 text-green-200 transition-colors border border-green-500/50 mb-2"
                                >
                                    <FastForward size={20} /> SKIP SIMULATION
                                </button>
                            )}

                            <button 
                                onClick={togglePause}
                                className="px-6 py-3 bg-green-600 hover:bg-green-500 rounded-full font-bold flex items-center justify-center gap-2 transition-transform hover:scale-105"
                            >
                                <Play size={20} fill="white" /> {TRANSLATIONS[language].resume}
                            </button>
                            <button 
                                onClick={handleQuitToMenu}
                                className="px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-full font-bold flex items-center justify-center gap-2 text-slate-200 transition-colors"
                            >
                                {TRANSLATIONS[language].quit}
                            </button>
                        </div>
                    </div>
                </div>
            )}
          </div>
        )}

        {/* WIN SCREEN */}
        {status === GameStatus.LEVEL_COMPLETE && (
            <div className="relative w-full max-w-4xl animate-scale-up z-10 px-2">
                <div className="relative rounded-lg p-1 bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 animate-pulse shadow-[0_0_50px_rgba(236,72,153,0.6)]">
                    <div className="absolute inset-0 bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 blur-lg opacity-75"></div>
                    
                    {/* Click to view fullscreen - BUT NOT FOR LEVEL 0 (Tutorial) */}
                    {LEVELS[currentLevelIndex].id !== 0 ? (
                        <div 
                            className="relative z-10 block w-full bg-black rounded-lg shadow-2xl mx-auto overflow-hidden cursor-zoom-in group"
                            onClick={() => setStatus(GameStatus.VIEW_IMAGE)}
                        >
                            <img 
                                src={LEVELS[currentLevelIndex].imageUrl} 
                                className="w-full h-auto max-h-[70vh] object-contain transition-transform duration-500 group-hover:scale-105"
                                alt="Level Complete Reward"
                                onError={(e) => {
                                    e.currentTarget.onerror = null;
                                    e.currentTarget.src = FALLBACK_SCENERY;
                                }}
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-white font-bold flex items-center gap-2 bg-black/50 px-4 py-2 rounded-full backdrop-blur-sm border border-white/20">
                                    <Eye size={20} /> View Fullscreen
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="relative z-10 block w-full bg-slate-900 rounded-lg shadow-2xl mx-auto overflow-hidden border-4 border-slate-700 p-8 flex flex-col items-center justify-center min-h-[300px] mb-4">
                             <Terminal className="text-green-500 w-16 h-16 mb-4 animate-pulse" />
                             <h2 className="text-4xl md:text-6xl font-black text-green-500 font-arcade mb-4 text-center tracking-widest">
                                SYSTEM READY
                             </h2>
                             <div className="font-mono text-green-400/80 text-sm md:text-base text-center max-w-md space-y-2">
                                <p>{'>'} SIMULATION_SEQUENCE_COMPLETE</p>
                                <p>{'>'} SENSORS_CALIBRATED: OK</p>
                                <p>{'>'} COMBAT_MODULE: ONLINE</p>
                                <p className="animate-pulse">{'>'} AWAITING_INPUT...</p>
                             </div>
                        </div>
                    )}
                    
                    <div className="absolute bottom-0 left-0 right-0 bg-black/80 backdrop-blur-md p-4 sm:p-6 rounded-b-lg flex flex-col md:flex-row justify-between items-center gap-4 border-t border-white/10 z-20">
                         <div className="text-center md:text-left">
                             <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center justify-center md:justify-start gap-2">
                                <Trophy className="text-yellow-400" /> {TRANSLATIONS[language].win_title}
                             </h2>
                             <div className="flex justify-center md:justify-start gap-4 text-sm text-slate-300 mt-1 font-mono">
                                <span>{TRANSLATIONS[language].score}: <span className="text-white">{stats.score}</span></span>
                                <span>Time: <span className="text-white">{stats.timeElapsed.toFixed(1)}s</span></span>
                             </div>
                             <div className="text-xs text-green-400 mt-2 animate-pulse">
                                {TRANSLATIONS[language].win_subtitle}
                             </div>
                         </div>
                         
                         <div className="flex flex-col items-center md:items-end gap-2">
                             <div className="hidden sm:block text-right">
                                <div className="text-xs text-indigo-300 uppercase">{TRANSLATIONS[language].ai_comment}</div>
                                <div className="text-xs italic text-indigo-100 max-w-[200px] whitespace-normal truncate">
                                    "{commentary.substring(0, 60)}..."
                                </div>
                             </div>
                             <div className="flex gap-2">
                                <button 
                                    onClick={nextLevel}
                                    className="px-8 py-3 bg-green-600 hover:bg-green-500 rounded-full font-bold flex items-center gap-2 shadow-[0_0_15px_rgba(34,197,94,0.5)] animate-bounce"
                                >
                                    <Play size={20} /> 
                                    {currentLevelIndex < LEVELS.length - 1 ? "Next Level" : "Finish Game"}
                                </button>
                             </div>
                         </div>
                    </div>
                </div>
            </div>
        )}

        {/* FULLSCREEN IMAGE VIEW */}
        {status === GameStatus.VIEW_IMAGE && (
             <div 
                className="absolute inset-0 z-50 bg-black flex items-center justify-center cursor-zoom-out"
                onClick={() => setStatus(GameStatus.LEVEL_COMPLETE)}
             >
                <img 
                    src={LEVELS[currentLevelIndex].imageUrl}
                    className="max-w-full max-h-full object-contain"
                    alt="Fullscreen Reward"
                    onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = FALLBACK_SCENERY;
                    }}
                />
                <button className="absolute top-4 right-4 text-white/50 hover:text-white">
                    <X size={32} />
                </button>
             </div>
        )}

        {/* CONTINUE SCREEN */}
        {status === GameStatus.CONTINUE_SCREEN && (
            <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-50">
                 <div className="flex flex-col items-center animate-pulse">
                     <h2 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-red-600 font-arcade mb-8">
                         CONTINUE?
                     </h2>
                     
                     <div className="text-9xl font-mono text-white mb-12 drop-shadow-[0_0_20px_rgba(255,0,0,0.8)]">
                         {continueTimer}
                     </div>
                     
                     <div className="flex flex-col gap-4 w-full max-w-sm">
                         <button 
                            onClick={handleContinue}
                            className="w-full py-4 bg-green-600 hover:bg-green-500 text-white font-black text-xl uppercase rounded flex items-center justify-center gap-2 shadow-[0_4px_0_#15803d] active:shadow-none active:translate-y-[4px] transition-all"
                         >
                            <Coins size={24} className="text-yellow-300" />
                            YES (-30% Score)
                         </button>
                         <button 
                            onClick={handleGiveUp}
                            className="w-full py-4 bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold text-sm uppercase rounded"
                         >
                            NO (GIVE UP)
                         </button>
                     </div>
                     
                     <div className="mt-8 text-slate-500 text-sm font-mono">
                         CONTINUES USED: {continuesUsed}
                     </div>
                 </div>
            </div>
        )}

        {/* NEW HIGH SCORE SCREEN (ARCADE ENTRY) */}
        {status === GameStatus.NEW_HIGHSCORE && (
             <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
                <div className="bg-slate-900 border-4 border-yellow-500 p-8 rounded-2xl w-full max-w-md shadow-[0_0_100px_rgba(234,179,8,0.3)] animate-bounce-slow text-center">
                    <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4 animate-bounce" />
                    <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 font-arcade mb-2">NEW RECORD!</h2>
                    <p className="text-slate-300 mb-6 font-arcade text-sm">ENTER YOUR INITIALS</p>
                    
                    <div className="flex justify-center mb-8">
                        <input 
                           autoFocus
                           maxLength={3}
                           value={playerName}
                           onChange={(e) => setPlayerName(e.target.value.toUpperCase())}
                           className="bg-black text-white text-6xl font-arcade text-center tracking-[0.5em] w-full max-w-[240px] border-b-4 border-white focus:border-yellow-400 outline-none uppercase p-2"
                        />
                    </div>

                    <div className="mb-6">
                        <div className="text-sm text-slate-400 uppercase">Score</div>
                        <div className="text-3xl font-mono text-white">{stats.score}</div>
                    </div>

                    <button 
                       onClick={submitHighScore}
                       className="w-full py-4 bg-yellow-600 hover:bg-yellow-500 text-black font-black text-xl uppercase rounded shadow-[0_4px_0_#b45309] active:shadow-none active:translate-y-[4px] transition-all flex items-center justify-center gap-2"
                    >
                        <Save size={20} /> SAVE SCORE
                    </button>
                </div>
             </div>
        )}

        {/* GAME OVER SCREEN */}
        {status === GameStatus.GAME_OVER && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border-4 border-slate-700 p-1 rounded-3xl w-full max-w-lg shadow-[0_0_50px_rgba(220,38,38,0.5)] animate-scale-up overflow-hidden relative">
              
              <div className="absolute inset-0 bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAADCAYAAABS3WWCAAAAE0lEQVQIW2NkQAKrVq36zwjjgAAACOgC0fBM6zwAAAAASUVORK5CYII=')] opacity-10 pointer-events-none z-10"></div>
              
              <div className="bg-slate-900 p-6 sm:p-8 rounded-[20px] relative z-20 flex flex-col items-center">
                  
                  <div className="flex items-center gap-3 mb-6">
                    <Skull className="w-10 h-10 text-red-600 animate-pulse" />
                    <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-red-500 to-red-900 tracking-tighter drop-shadow-sm font-arcade">
                      {TRANSLATIONS[language].game_over}
                    </h2>
                    <Skull className="w-10 h-10 text-red-600 animate-pulse" />
                  </div>

                  <div className="w-48 h-48 mb-6 rounded-full border-4 border-red-900 overflow-hidden shadow-inner bg-black flex items-center justify-center">
                      <img 
                          src={SILVER_AVATAR.DEFEATED} 
                          alt="Defeated" 
                          onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = FALLBACK_AVATAR;
                          }}
                          className="w-full h-full object-cover opacity-80 grayscale-[50%]"
                      />
                      <div className="absolute inset-0 flex items-center justify-center -z-10">
                        <ImageOff size={32} className="text-red-900/50"/>
                      </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 w-full mb-6">
                      <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 text-center">
                          <div className="text-xs text-slate-400 uppercase mb-1">{TRANSLATIONS[language].area}</div>
                          <div className="text-2xl font-mono text-red-400">{stats.areaRevealed.toFixed(1)}%</div>
                      </div>
                      <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 text-center">
                          <div className="text-xs text-slate-400 uppercase mb-1">{TRANSLATIONS[language].score}</div>
                          <div className="text-2xl font-mono text-yellow-400 font-bold">{stats.score}</div>
                      </div>
                  </div>

                  <div className="w-full mb-8 relative">
                      <div className="absolute -top-3 left-4 bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase flex items-center gap-1 shadow-sm">
                          <Zap size={10} /> {TRANSLATIONS[language].ai_comment}
                      </div>
                      <div className="bg-indigo-900/40 border border-indigo-500/50 p-4 pt-5 rounded-xl text-center text-indigo-100 italic text-sm leading-relaxed">
                          "{commentary || '...'}"
                      </div>
                  </div>

                  <div className="flex gap-4 w-full">
                    <button 
                      onClick={() => setStatus(GameStatus.MENU)}
                      className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition-all uppercase text-sm border border-slate-600"
                    >
                      {TRANSLATIONS[language].exit}
                    </button>
                    <button 
                      onClick={() => startGame(currentLevelIndex)}
                      className="flex-[2] py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(220,38,38,0.4)] transition-transform hover:scale-105 uppercase text-sm"
                    >
                      <RefreshCw size={18} /> {TRANSLATIONS[language].retry}
                    </button>
                  </div>
              </div>
            </div>
          </div>
        )}

        {/* LEADERBOARD */}
        {status === GameStatus.LEADERBOARD && (
          <div className="bg-slate-800 p-6 sm:p-8 rounded-xl max-w-2xl w-full border border-slate-700 mx-4 z-20">
             <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-center text-yellow-400 flex items-center justify-center gap-3">
               <Trophy /> {TRANSLATIONS[language].menu_scores}
             </h2>
             <div className="space-y-2">
               {highScores.map((entry, i) => (
                 <div key={i} className={`flex justify-between items-center p-3 rounded hover:bg-slate-700 transition ${entry.date === new Date().toISOString().split('T')[0] ? 'bg-slate-600 border border-slate-500' : 'bg-slate-700/50'}`}>
                    <div className="flex items-center gap-4">
                      <span className={`font-bold w-6 sm:w-8 text-center ${i===0?'text-yellow-400':i===1?'text-slate-300':'text-orange-400'}`}>#{i+1}</span>
                      <span className="font-arcade tracking-wider">{entry.playerName}</span>
                    </div>
                    <div className="flex items-center gap-4 sm:gap-8 text-xs sm:text-sm text-slate-400">
                      <span>Lvl {entry.level}</span>
                      <span className="text-white font-mono font-bold text-base sm:text-lg">{entry.score}</span>
                    </div>
                 </div>
               ))}
             </div>
             <button onClick={() => setStatus(GameStatus.MENU)} className="mt-8 w-full py-3 bg-slate-700 rounded hover:bg-slate-600">
               {TRANSLATIONS[language].exit}
             </button>
          </div>
        )}

      </div>

      {/* Mobile Controls */}
      {status === GameStatus.PLAYING && isMobile && (
        <VirtualJoystick onDirectionChange={(dx, dy) => setDirection({x: dx, y: dy})} />
      )}
      
      {/* Footer info */}
      <div className="mt-8 text-slate-500 text-xs text-center hidden sm:block z-10 relative shrink-0 uppercase">
        {TRANSLATIONS[language].footer}
      </div>
    </div>
  );
}