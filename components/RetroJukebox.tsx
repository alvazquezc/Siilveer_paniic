import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { GameStatus } from '../types';

export interface RetroJukeboxRef {
  playDamageSound: () => void;
  playCaptureSound: () => void;
  playItemSound: () => void;
  setProximityIntensity: (intensity: number) => void;
}

interface RetroJukeboxProps {
  levelIndex: number;
  gameStatus: GameStatus; // Added to track Game Over
}

// Frequencies
const NOTE = {
  C3: 130.8, D3: 146.8, E3: 164.8, F3: 174.6, G3: 196.0, Gs3: 207.7, A3: 220.0, B3: 246.9,
  C4: 261.6, Cs4: 277.2, D4: 293.7, Ds4: 311.1, Eb4: 311.1, E4: 329.6, F4: 349.2, Fs4: 370.0, G4: 392.0, Gs4: 415.3, A4: 440.0, As4: 466.2, B4: 493.9,
  C5: 523.3, D5: 587.3, Ds5: 622.3, E5: 659.3, F5: 698.5, G5: 784.0, A5: 880.0, B5: 987.8, C6: 1046.5, E6: 1318.5
};

// Song Patterns
const SONGS = [
  // SONG 1: Happy / Chill (Levels 1-2)
  {
    tempo: 0.13,
    melody: [
      { f: NOTE.C4, d: 2 }, { f: NOTE.E4, d: 2 }, { f: NOTE.G4, d: 2 }, { f: NOTE.B4, d: 2 },
      { f: NOTE.A4, d: 2 }, { f: NOTE.G4, d: 2 }, { f: NOTE.E4, d: 4 },
      { f: NOTE.C4, d: 2 }, { f: NOTE.E4, d: 2 }, { f: NOTE.G4, d: 2 }, { f: NOTE.C5, d: 4 },
      { f: NOTE.B4, d: 2 }, { f: NOTE.G4, d: 2 }, { f: NOTE.A4, d: 4 },
    ],
    bass: [NOTE.C3, NOTE.G3, NOTE.A3, NOTE.F3]
  },
  // SONG 2: Tense / Action (Levels 3-4)
  {
    tempo: 0.10,
    melody: [
      { f: NOTE.E4, d: 2 }, { f: NOTE.E4, d: 2 }, { f: NOTE.G4, d: 2 }, { f: NOTE.E4, d: 2 },
      { f: NOTE.Ds4, d: 4 }, { f: NOTE.D4, d: 4 },
      { f: NOTE.C4, d: 2 }, { f: NOTE.C4, d: 2 }, { f: NOTE.D4, d: 2 }, { f: NOTE.Ds4, d: 2 },
      { f: NOTE.E4, d: 2 }, { f: NOTE.B3, d: 2 }, { f: NOTE.E4, d: 4 },
    ],
    bass: [NOTE.E3, NOTE.B3, NOTE.C3, NOTE.B3]
  },
  // SONG 3: Fast / Boss (Levels 5-6)
  {
    tempo: 0.08,
    melody: [
      { f: NOTE.F4, d: 1 }, { f: NOTE.G4, d: 1 }, { f: NOTE.Gs4, d: 2 }, { f: NOTE.F4, d: 1 }, { f: NOTE.Gs4, d: 1 }, { f: NOTE.C5, d: 2 },
      { f: NOTE.F5, d: 2 }, { f: NOTE.Ds5, d: 2 }, { f: NOTE.C5, d: 2 }, { f: NOTE.Gs4, d: 2 },
      { f: NOTE.G4, d: 1 }, { f: NOTE.F4, d: 1 }, { f: NOTE.G4, d: 1 }, { f: NOTE.Gs4, d: 1 }, { f: NOTE.G4, d: 4 },
    ],
    bass: [NOTE.F3, NOTE.C3, NOTE.Gs3, NOTE.C4]
  }
];

// SAD SONG (Game Over) - Slow, descending, minor
const GAME_OVER_SONG = {
  tempo: 0.18,
  melody: [
    { f: NOTE.G4, d: 3 }, { f: NOTE.Fs4, d: 3 }, { f: NOTE.F4, d: 3 }, { f: NOTE.E4, d: 6 },
    { f: NOTE.Eb4, d: 3 }, { f: NOTE.D4, d: 3 }, { f: NOTE.Cs4, d: 3 }, { f: NOTE.C4, d: 8 },
  ],
  bass: [NOTE.C3, NOTE.G3, NOTE.Eb4, NOTE.C3]
};

export const RetroJukebox = forwardRef<RetroJukeboxRef, RetroJukeboxProps>(({ levelIndex, gameStatus }, ref) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  
  // Music Refs
  const nextNoteTimeRef = useRef<number>(0);
  const schedulerTimerRef = useRef<number>(0);
  const melodyIndexRef = useRef<number>(0);
  const bassIndexRef = useRef<number>(0);
  const currentSongRef = useRef(SONGS[0]);

  // Proximity Drone Refs
  const droneOscRef = useRef<OscillatorNode | null>(null);
  const droneGainRef = useRef<GainNode | null>(null);

  // Handle song switching based on Level AND Game Status
  useEffect(() => {
      // Logic for selecting song
      if (gameStatus === GameStatus.GAME_OVER) {
          currentSongRef.current = GAME_OVER_SONG;
      } else {
          // Default level music
          const songIndex = Math.min(Math.floor(levelIndex / 2), SONGS.length - 1);
          currentSongRef.current = SONGS[songIndex];
      }
      
      // Reset melody index on significant state changes (like Game Over or New Level)
      // to ensure the new song starts from the beginning
      melodyIndexRef.current = 0;
      bassIndexRef.current = 0;

  }, [levelIndex, gameStatus]);

  useImperativeHandle(ref, () => ({
    playDamageSound: () => {
      if (!audioContextRef.current || !isPlaying) return;
      playSfx('damage');
    },
    playCaptureSound: () => {
      if (!audioContextRef.current || !isPlaying) return;
      playSfx('capture');
    },
    playItemSound: () => {
      if (!audioContextRef.current || !isPlaying) return;
      playSfx('item');
    },
    setProximityIntensity: (intensity: number) => {
       if (!audioContextRef.current || !isPlaying) return;
       updateDrone(intensity);
    }
  }));

  const updateDrone = (intensity: number) => {
    // If we have refs, update them
    if (droneOscRef.current && droneGainRef.current) {
        const now = audioContextRef.current!.currentTime;
        
        // Clamp intensity 0-1
        const val = Math.max(0, Math.min(1, intensity));
        
        // Calculate volume: 0 at far distance, up to 0.15 when close
        // Use a slight curve for smoother fade in
        const vol = val * val * 0.15;
        
        // Calculate Pitch: 50Hz base (Low hum) -> 90Hz (Tense hum)
        const freq = 50 + (val * 40);

        // Smooth transition
        droneGainRef.current.gain.setTargetAtTime(vol, now, 0.1);
        droneOscRef.current.frequency.setTargetAtTime(freq, now, 0.1);
    }
  };

  const startDrone = (ctx: AudioContext) => {
      if (droneOscRef.current) return; // Already started

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.value = 50; // Low hum base
      
      // Initial silent volume
      gain.gain.value = 0;

      // Lowpass filter to make it less harsh (optional, but 'sawtooth' can be buzzing)
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 200;

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();

      droneOscRef.current = osc;
      droneGainRef.current = gain;
  };

  const stopDrone = () => {
      if (droneOscRef.current) {
          try {
            droneOscRef.current.stop();
            droneOscRef.current.disconnect();
          } catch (e) { /* ignore */ }
          droneOscRef.current = null;
      }
      if (droneGainRef.current) {
          droneGainRef.current.disconnect();
          droneGainRef.current = null;
      }
  };

  const playSfx = (type: 'damage' | 'capture' | 'item') => {
    if (!audioContextRef.current) return;
    const ctx = audioContextRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === 'damage') {
      // Classic "Hit" sound: Sawtooth sweep down
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);
      
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

      osc.start(now);
      osc.stop(now + 0.15);
    } else if (type === 'capture') {
      // Capture Sound: Quick high-pitched arpeggio / Coin sound
      osc.type = 'sine';
      
      // Double blip
      osc.frequency.setValueAtTime(NOTE.C5, now);
      osc.frequency.setValueAtTime(NOTE.E5, now + 0.05);
      osc.frequency.setValueAtTime(NOTE.G5, now + 0.10);
      osc.frequency.setValueAtTime(NOTE.C6, now + 0.15);

      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'item') {
      // Item Sound: Shiny bell like
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(NOTE.B5, now);
      osc.frequency.linearRampToValueAtTime(NOTE.E6, now + 0.1);
      
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

      osc.start(now);
      osc.stop(now + 0.4);
    }
  };

  const toggleMusic = () => {
    if (isPlaying) {
      if (audioContextRef.current) {
        audioContextRef.current.suspend();
      }
      stopDrone(); // Stop the drone sound
      setIsPlaying(false);
    } else {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        nextNoteTimeRef.current = audioContextRef.current.currentTime + 0.1;
        scheduler();
        startDrone(audioContextRef.current); // Init drone
      } else {
        audioContextRef.current.resume();
        startDrone(audioContextRef.current); // Init drone if it was stopped
      }
      setIsPlaying(true);
    }
  };

  const playTone = (freq: number, duration: number, time: number, type: 'square' | 'triangle' | 'sawtooth', vol: number) => {
    if (!audioContextRef.current) return;
    const osc = audioContextRef.current.createOscillator();
    const gain = audioContextRef.current.createGain();

    osc.type = type;
    osc.frequency.value = freq;

    osc.connect(gain);
    gain.connect(audioContextRef.current.destination);

    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + duration - 0.05);

    osc.start(time);
    osc.stop(time + duration);
  };

  const scheduler = () => {
    if (!audioContextRef.current) return;
    
    // Look ahead
    while (nextNoteTimeRef.current < audioContextRef.current.currentTime + 0.1) {
      scheduleNote(nextNoteTimeRef.current);
    }
    
    schedulerTimerRef.current = window.setTimeout(scheduler, 25);
  };

  const scheduleNote = (time: number) => {
    const song = currentSongRef.current;
    const secondsPerBeat = song.tempo; 

    // Melody
    const note = song.melody[melodyIndexRef.current % song.melody.length];
    // Randomize velocity slightly for "human" feel or keep flat for robot feel
    playTone(note.f, note.d * secondsPerBeat, time, 'square', 0.04);
    
    melodyIndexRef.current++;

    // Bass (Simple arpeggio or root notes)
    if (melodyIndexRef.current % 4 === 0) { 
        const bassNote = song.bass[bassIndexRef.current % song.bass.length];
        playTone(bassNote, secondsPerBeat * 4, time, 'triangle', 0.06);
        bassIndexRef.current++;
    }

    // High Hat / Noise (Simulated with high freq square)
    // Don't play hi-hats during Sad Song to keep it empty
    if (song !== GAME_OVER_SONG && melodyIndexRef.current % 2 === 0) {
        playTone(1000 + Math.random() * 500, 0.05, time, 'sawtooth', 0.01);
    }

    // Advance time
    nextNoteTimeRef.current += (note.d * secondsPerBeat);
  };

  useEffect(() => {
    return () => {
      if (schedulerTimerRef.current) clearTimeout(schedulerTimerRef.current);
      stopDrone(); // Ensure drone stops on unmount
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  return (
    <button 
      onClick={toggleMusic}
      className="fixed bottom-4 right-4 z-50 p-3 bg-slate-800/80 hover:bg-slate-700 text-yellow-400 border-2 border-slate-600 rounded-full shadow-lg transition-transform hover:scale-110"
      title={isPlaying ? "Mute Music & SFX" : "Enable Music & SFX"}
    >
      {isPlaying ? <Volume2 size={20} /> : <VolumeX size={20} />}
    </button>
  );
});

RetroJukebox.displayName = 'RetroJukebox';