import React, { useCallback } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useResilientTimer } from '@/hooks/useResilientTimer';
import { useAuth } from '@/contexts/AuthContext';

interface TimerProps {
  onTimerEnd?: () => void;
}

const MIN_DURATION = 5; // minutes
const MAX_DURATION = 60; // minutes
const STEP_DURATION = 5; // minutes

export function TimerWidget({ onTimerEnd }: TimerProps) {
  const { user } = useAuth();
  const {
    status,
    durationMs,
    remainingMs,
    start,
    pause,
    resume,
    reset,
    setDuration
  } = useResilientTimer();

  // Conversion pour l'UI
  const durationMin = Math.round(durationMs / 60000);
  
  // Gestion des événements de fin
  React.useEffect(() => {
    if (status === 'finished') {
      onTimerEnd?.();
    }
  }, [status, onTimerEnd]);

  const handleDurationChange = useCallback((values: number[]) => {
    if (!values || values.length === 0 || status !== 'idle') return;
    
    const minutes = values[0];
    if (!Number.isFinite(minutes) || minutes < MIN_DURATION || minutes > MAX_DURATION) return;
    
    // Arrondir au multiple de 5 le plus proche
    const roundedMinutes = Math.round(minutes / STEP_DURATION) * STEP_DURATION;
    const clampedMinutes = Math.max(MIN_DURATION, Math.min(MAX_DURATION, roundedMinutes));
    
    const newDurationMs = clampedMinutes * 60 * 1000;
    setDuration(newDurationMs);
  }, [status, setDuration]);

  const handleStart = useCallback(() => {
    const durationToUse = durationMin * 60 * 1000;
    start(durationToUse);
  }, [start, durationMin]);

  const formatTime = (ms: number) => {
    if (isNaN(ms) || ms < 0) return '00:00';
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Calculer la progression (cercle plein au début, vide à la fin)
  const progress = status === 'idle' 
    ? 100 // Cercle plein avant démarrage
    : durationMs > 0 
      ? (remainingMs / durationMs) * 100 
      : 0;

  const canStart = user && status === 'idle';
  
  return (
    <div className="space-y-6">
      {/* Affichage du temps avec cercle */}
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
            
            {/* Cercle de progression (plein au début, se vide) */}
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
              {status === 'idle' ? formatTime(durationMs) : formatTime(remainingMs)}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {status === 'idle' ? 'Prêt' : 
               status === 'running' ? 'En cours' :
               status === 'paused' ? 'En pause' : 'Terminé'}
            </div>
          </div>
        </div>

        {/* Slider de durée (visible seulement avant démarrage) */}
        {status === 'idle' && (
          <div className="w-80 px-4">
            <div className="space-y-4">
              <h3 className="font-heading text-lg text-center">Durée de la session</h3>
              <Slider
                value={[durationMin]}
                onValueChange={handleDurationChange}
                min={MIN_DURATION}
                max={MAX_DURATION}
                step={STEP_DURATION}
                className="w-full h-4"
                aria-label="Durée de la session en minutes"
                disabled={!user}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{MIN_DURATION} min</span>
                <span>{MAX_DURATION} min</span>
              </div>
            </div>
          </div>
        )}

        {/* Contrôles */}
        <div className="flex gap-4">
          {status === 'idle' && (
            <>
              {!user ? (
                <div className="text-center">
                  <Button disabled size="lg" className="font-semibold mb-2">
                    <Play className="h-5 w-5 mr-2" />
                    Démarrer
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    Connecte-toi pour démarrer le timer
                  </p>
                </div>
              ) : (
                <Button
                  onClick={handleStart}
                  size="lg"
                  className="font-semibold"
                >
                  <Play className="h-5 w-5 mr-2" />
                  Démarrer
                </Button>
              )}
            </>
          )}

          {status === 'running' && (
            <Button
              onClick={pause}
              size="lg"
              className="font-semibold"
            >
              <Pause className="h-5 w-5 mr-2" />
              Pause
            </Button>
          )}

          {status === 'paused' && (
            <Button
              onClick={resume}
              size="lg"
              className="font-semibold"
            >
              <Play className="h-5 w-5 mr-2" />
              Reprendre
            </Button>
          )}

          {(status === 'running' || status === 'paused' || status === 'finished') && (
            <Button
              onClick={reset}
              variant="outline"
              size="lg"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}