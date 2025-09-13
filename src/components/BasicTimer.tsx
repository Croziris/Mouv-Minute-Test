import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface BasicTimerProps {
  onTimerEnd?: () => void;
}

const DURATION_OPTIONS = [5, 10, 15, 20, 30, 45, 60]; // minutes

export function BasicTimer({ onTimerEnd }: BasicTimerProps) {
  const [durationMin, setDurationMin] = useState<number>(45);
  const [remainingSec, setRemainingSec] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialiser remainingSec quand durationMin change
  useEffect(() => {
    if (!isRunning) {
      setRemainingSec(durationMin * 60);
    }
  }, [durationMin, isRunning]);

  // Nettoyer l'interval au unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  // Gérer le timer principal
  useEffect(() => {
    if (isRunning && remainingSec > 0) {
      intervalRef.current = setInterval(() => {
        setRemainingSec(prev => {
          const newValue = prev - 1;
          if (newValue <= 0) {
            setIsRunning(false);
            onTimerEnd?.();
            return 0;
          }
          return newValue;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, remainingSec, onTimerEnd]);

  const formatTime = useCallback((seconds: number): string => {
    if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const handleStart = useCallback(() => {
    if (!Number.isFinite(durationMin) || durationMin <= 0) return;
    
    if (remainingSec <= 0) {
      setRemainingSec(durationMin * 60);
    }
    setIsRunning(true);
  }, [durationMin, remainingSec]);

  const handlePause = useCallback(() => {
    setIsRunning(false);
  }, []);

  const handleReset = useCallback(() => {
    setIsRunning(false);
    setRemainingSec(durationMin * 60);
  }, [durationMin]);

  const handleDurationChange = useCallback((value: string) => {
    const minutes = Number.parseInt(value, 10);
    if (!Number.isFinite(minutes) || minutes <= 0) return;
    
    setDurationMin(minutes);
    if (!isRunning) {
      setRemainingSec(minutes * 60);
    }
  }, [isRunning]);

  const progress = durationMin > 0 ? ((durationMin * 60 - remainingSec) / (durationMin * 60)) * 100 : 0;
  const canStart = Number.isFinite(durationMin) && durationMin > 0;

  return (
    <div className="space-y-6">
      {/* Sélecteur de durée */}
      {!isRunning && remainingSec === durationMin * 60 && (
        <div className="space-y-4">
          <h3 className="font-heading text-lg text-center">Durée de la session</h3>
          <div className="flex justify-center">
            <Select value={durationMin.toString()} onValueChange={handleDurationChange}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Durée" />
              </SelectTrigger>
              <SelectContent>
                {DURATION_OPTIONS.map((minutes) => (
                  <SelectItem key={minutes} value={minutes.toString()}>
                    {minutes} min
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Affichage du temps */}
      <div className="flex flex-col items-center space-y-6">
        <div className="relative w-64 h-64">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            {/* Cercle de fond */}
            <circle
              cx="50"
              cy="50"
              r="45"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              className="text-muted/20"
            />
            
            {/* Cercle de progression */}
            <circle
              cx="50"
              cy="50"
              r="45"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              className="text-primary transition-all duration-1000 ease-out"
              strokeDasharray={`${2 * Math.PI * 45}`}
              strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
              strokeLinecap="round"
            />
          </svg>
          
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-4xl font-mono font-bold text-foreground">
              {formatTime(remainingSec)}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {isRunning ? 'En cours' : remainingSec > 0 ? 'En pause' : 'Arrêté'}
            </div>
          </div>
        </div>

        {/* Contrôles */}
        <div className="flex gap-4">
          <Button
            onClick={isRunning ? handlePause : handleStart}
            size="lg"
            className="font-semibold"
            disabled={!canStart}
          >
            {isRunning ? (
              <>
                <Pause className="h-5 w-5 mr-2" />
                Pause
              </>
            ) : (
              <>
                <Play className="h-5 w-5 mr-2" />
                {remainingSec > 0 && remainingSec !== durationMin * 60 ? 'Reprendre' : 'Démarrer'}
              </>
            )}
          </Button>
          
          <Button
            onClick={handleReset}
            variant="outline"
            size="lg"
            disabled={remainingSec === durationMin * 60 && !isRunning}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>
      </div>
    </div>
  );
}