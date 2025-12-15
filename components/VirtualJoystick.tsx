import React from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';

interface VirtualJoystickProps {
  onDirectionChange: (dx: number, dy: number) => void;
}

export const VirtualJoystick: React.FC<VirtualJoystickProps> = ({ onDirectionChange }) => {
  const btnClass = "w-14 h-14 bg-white/10 active:bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 touch-none select-none";
  
  return (
    <div className="fixed bottom-8 right-8 z-50 flex flex-col items-center gap-2">
        <button 
          className={btnClass} 
          onPointerDown={(e) => { e.preventDefault(); onDirectionChange(0, -1); }}
          onPointerUp={(e) => { e.preventDefault(); onDirectionChange(0, 0); }}
          onPointerLeave={() => onDirectionChange(0, 0)}
        >
          <ArrowUp className="text-white" />
        </button>
        <div className="flex gap-2">
          <button 
            className={btnClass}
            onPointerDown={(e) => { e.preventDefault(); onDirectionChange(-1, 0); }}
            onPointerUp={(e) => { e.preventDefault(); onDirectionChange(0, 0); }}
            onPointerLeave={() => onDirectionChange(0, 0)}
          >
            <ArrowLeft className="text-white" />
          </button>
          <button 
            className={btnClass}
            onPointerDown={(e) => { e.preventDefault(); onDirectionChange(0, 1); }}
            onPointerUp={(e) => { e.preventDefault(); onDirectionChange(0, 0); }}
            onPointerLeave={() => onDirectionChange(0, 0)}
          >
            <ArrowDown className="text-white" />
          </button>
          <button 
            className={btnClass}
            onPointerDown={(e) => { e.preventDefault(); onDirectionChange(1, 0); }}
            onPointerUp={(e) => { e.preventDefault(); onDirectionChange(0, 0); }}
            onPointerLeave={() => onDirectionChange(0, 0)}
          >
            <ArrowRight className="text-white" />
          </button>
        </div>
    </div>
  );
};
