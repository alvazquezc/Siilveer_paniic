import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { VirtualJoystick } from './components/VirtualJoystick';
import { RetroJukebox, RetroJukeboxRef } from './components/RetroJukebox';
import { getGameCommentary } from './services/geminiService';
import { LEVELS, MOCK_SCORES, TEASING_PHRASES, SILVER_AVATAR, TRANSLATIONS } from './constants';
import { GameStatus, GameStats, Point, Language } from './types';
import { Trophy, Play, Skull, RefreshCw, Zap, Heart, MessageSquare, Pause, PlayCircle, Star, ImageOff, Globe } from 'lucide-react';

export default function App() {
  const [status, setStatus] = useState<GameStatus>(GameStatus.MENU);
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
  const [stats, setStats] = useState<GameStats>({ areaRevealed: 0, timeElapsed: 0, score: 0 });
  const [lives, setLives] = useState(3); 
  const [commentary, setCommentary] = useState<string>('');
  const [direction, setDirection] = useState<Point>({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(false);
  const [language, setLanguage] = useState<Language>('ES');
  
  // Audio Ref
  const jukeboxRef = useRef<RetroJukeboxRef>(null);

  // Silver's Mood State
  const [silverMood, setSilverMood] = useState<'NEUTRAL' | 'EXCITED' | 'SAD' | 'DEFEATED'>('NEUTRAL');
  const moodTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Banner state
  const [bannerText, setBannerText] = useState(TRANSLATIONS['ES'].instructions);

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
        return prev;
    });
  }, []);

  // Auto-pause on blur (Essential for itch.io iframes)
  useEffect(() => {
    const handleBlur = () => {
      if (status === GameStatus.PLAYING) {
        setStatus(GameStatus.PAUSED);
      }
    };
    
    // Auto-focus window on mount/click to ensure keyboard works immediately
    const handleFocus = () => {
        window.focus();
    };

    window.addEventListener('blur', handleBlur);
    window.addEventListener('click', handleFocus);
    
    // Initial focus attempt
    window.focus();

    return () => {
        window.removeEventListener('blur', handleBlur);
        window.removeEventListener('click', handleFocus);
    };
  }, [status]);

  // Input Handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      
      // Prevent scrolling on itch.io page
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'space', 'w', 'a', 's', 'd'].includes(key)) {
          e.preventDefault();
      }

      // Logic for "Press any key to continue" when level is complete
      if (status === GameStatus.LEVEL_COMPLETE) {
          nextLevel();
          return;
      }

      // Pause shortcut
      if (key === 'p' || key === 'escape') {
          togglePause();
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
  }, [status, currentLevelIndex, togglePause]); 

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
    setBannerText(TRANSLATIONS[language].instructions);
  };

  const handleGameOver = async (finalStats: GameStats) => {
    setStatus(GameStatus.GAME_OVER);
    setStats(finalStats);
    setSilverMood('DEFEATED');
    setCommentary("...");
    const text = await getGameCommentary('GAME_OVER', finalStats, LEVELS[currentLevelIndex].name, language);
    setCommentary(text);
  };

  const handleLevelComplete = async (finalStats: GameStats) => {
    setStatus(GameStatus.LEVEL_COMPLETE);
    setStats(finalStats);
    setSilverMood('EXCITED');
    setCommentary("...");
    const text = await getGameCommentary('WIN', finalStats, LEVELS[currentLevelIndex].name, language);
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
                 src={SILVER_AVATAR[silverMood === 'DEFEATED' ? 'SAD' : silverMood]} 
                 alt="Silver" 
                 onError={(e) => {
                     e.currentTarget.style.display = 'none';
                     e.currentTarget.parentElement?.classList.add('bg-slate-600');
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
                <span className="text-[10px] sm:text-xs text-slate-400">{TRANSLATIONS[language].area}</span>
                <span className={`font-mono text-base sm:text-lg ${stats.areaRevealed > LEVELS[currentLevelIndex].minRevealPercent ? "text-green-400" : "text-white"}`}>
                  {stats.areaRevealed.toFixed(1)}%
                </span>
             </div>
             
             <div className="flex flex-col items-center min-w-[50px]">
                <span className="text-[10px] sm:text-xs text-slate-400">{TRANSLATIONS[language].score}</span>
                <span className="font-mono text-base sm:text-lg text-yellow-400">{stats.score}</span>
             </div>

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
          <div className="w-full flex flex-col items-center animate-fade-in relative z-10 overflow-y-auto max-h-full py-4 no-scrollbar">
            
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
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.parentElement?.classList.add('bg-slate-700');
                    }}
                  />
                  <div className="absolute bottom-0 w-full bg-black/80 text-center text-yellow-400 font-arcade text-xs py-1">
                    SILVER
                  </div>
               </div>
            </div>

            {/* "Select Stage" Header */}
            <div className="bg-blue-800/80 border-y-4 border-blue-500 w-full max-w-3xl py-2 mb-6 text-center transform skew-x-[-10deg] shrink-0">
               <h2 className="text-xl md:text-2xl font-black text-white italic tracking-widest font-arcade animate-pulse transform skew-x-[10deg]">
                 {TRANSLATIONS[language].menu_start}
               </h2>
            </div>
            
            {/* Retro Grid Selection */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 max-w-4xl mx-auto w-full px-4 shrink-0">
              {LEVELS.map((level, idx) => (
                <button
                  key={level.id}
                  onClick={() => startGame(idx)}
                  className="group relative bg-slate-800 border-4 border-slate-600 hover:border-pink-500 transition-all duration-100 hover:scale-105 active:scale-95 shadow-[4px_4px_0px_#000] overflow-hidden aspect-[4/3]"
                >
                  <img 
                    src={level.imageUrl} 
                    className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-all duration-500 blur-xl grayscale group-hover:grayscale-0 group-hover:blur-md" 
                    alt={level.name}
                    onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.parentElement?.classList.add('bg-slate-900');
                    }}
                  />
                  
                  <div className="absolute inset-0 flex items-center justify-center -z-10">
                     <ImageOff size={48} className="text-slate-700"/>
                  </div>
                  
                  <div className="absolute inset-0 bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAADCAYAAABS3WWCAAAAE0lEQVQIW2NkQAKrVq36zwjjgAAACOgC0fBM6zwAAAAASUVORK5CYII=')] opacity-30 pointer-events-none"></div>

                  <div className="absolute inset-0 flex flex-col justify-between p-2 bg-gradient-to-t from-black/90 to-transparent">
                     <div className="self-end">
                       <span className="font-arcade text-[10px] text-yellow-300 bg-black/50 px-1 border border-yellow-300">
                         LVL {level.id}
                       </span>
                     </div>
                     <div className="text-left">
                       <div className="font-black text-sm text-white uppercase leading-none drop-shadow-md">{level.name}</div>
                       <div className="flex gap-0.5 mt-1">
                          {[...Array(level.difficulty)].map((_, i) => (
                              <Star key={i} size={8} className="fill-yellow-400 text-yellow-400" />
                          ))}
                       </div>
                     </div>
                  </div>

                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition-opacity">
                      <span className="font-arcade text-xs text-red-500 animate-blink bg-black px-2 py-1 border border-red-500">
                        PUSH START
                      </span>
                  </div>
                </button>
              ))}
            </div>

            {/* Footer Credits */}
            <div className="mt-8 mb-4 text-center shrink-0">
               <button onClick={() => setStatus(GameStatus.LEADERBOARD)} className="font-arcade text-xs md:text-sm text-cyan-400 hover:text-white hover:underline mb-4 animate-pulse">
                 [ {TRANSLATIONS[language].menu_scores} ]
               </button>
               <div className="text-[10px] text-slate-500 font-mono uppercase">
                 © 2025 SIILVEER GAMES. {TRANSLATIONS[language].menu_credits}.<br/>
                 MADE WITH REACT & GEMINI.
               </div>
            </div>
          </div>
        )}

        {/* GAME CANVAS */}
        {(status === GameStatus.PLAYING || status === GameStatus.PAUSED) && (
          <div className="relative w-full flex-1 flex items-center justify-center min-h-0">
             <GameCanvas 
                level={LEVELS[currentLevelIndex]}
                onGameOver={handleGameOver}
                onLevelComplete={handleLevelComplete}
                onStatsUpdate={(s) => setStats(s)}
                direction={direction}
                onLivesChange={handleLivesChange}
                onAreaCapture={handleAreaCapture}
                onItemCollect={handleItemCollect}
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
                            <button 
                                onClick={togglePause}
                                className="px-6 py-3 bg-green-600 hover:bg-green-500 rounded-full font-bold flex items-center justify-center gap-2 transition-transform hover:scale-105"
                            >
                                <Play size={20} fill="white" /> {TRANSLATIONS[language].resume}
                            </button>
                            <button 
                                onClick={() => setStatus(GameStatus.MENU)}
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
                    <img 
                        src={LEVELS[currentLevelIndex].imageUrl} 
                        className="relative z-10 block w-full h-auto max-h-[70vh] object-contain bg-black rounded-lg shadow-2xl mx-auto"
                        alt="Level Complete Reward"
                        onError={(e) => {
                            e.currentTarget.src = 'https://placehold.co/600x400/000000/FFF?text=Level+Image+Missing';
                        }}
                    />
                    
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
                                    onClick={() => setStatus(GameStatus.MENU)}
                                    className="px-4 py-2 bg-slate-700 rounded-full hover:bg-slate-600 font-bold text-sm"
                                >
                                    Menu
                                </button>
                                <button 
                                    onClick={nextLevel}
                                    className="px-6 py-2 bg-green-600 hover:bg-green-500 rounded-full font-bold flex items-center gap-2 shadow-[0_0_15px_rgba(34,197,94,0.5)] animate-bounce"
                                >
                                    <Play size={16} /> Next
                                </button>
                             </div>
                         </div>
                    </div>
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
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.parentElement?.classList.add('bg-slate-800');
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
               {MOCK_SCORES.map((entry, i) => (
                 <div key={i} className="flex justify-between items-center p-3 bg-slate-700/50 rounded hover:bg-slate-700 transition">
                    <div className="flex items-center gap-4">
                      <span className={`font-bold w-6 sm:w-8 text-center ${i===0?'text-yellow-400':i===1?'text-slate-300':'text-orange-400'}`}>#{i+1}</span>
                      <span className="truncate max-w-[120px] sm:max-w-none">{entry.playerName}</span>
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