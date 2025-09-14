import React, { useEffect, useCallback } from 'react';
import { Play, Pause, RotateCcw, Smartphone, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { useResilientTimer } from '@/hooks/useResilientTimer';
import { useBadgeAPI } from '@/hooks/useBadgeAPI';
import { useWakeLock } from '@/hooks/useWakeLock';
import { useState } from 'react';

interface ResilientTimerProps {
  onTimerEnd?: () => void;
}

const MIN_DURATION = 5; // minutes
const MAX_DURATION = 60; // minutes
const STEP_DURATION = 5; // minutes

export function ResilientTimer({ onTimerEnd }: ResilientTimerProps) {
  // Options avancées
  const [badgeEnabled, setBadgeEnabled] = useState(false);
  const [wakeLockEnabled, setWakeLockEnabled] = useState(false);
  
  // Hooks pour les fonctionnalités avancées
  const { isSupported: badgeSupported, setBadge, clearBadge } = useBadgeAPI();
  const { isSupported: wakeLockSupported, isActive: wakeLockActive, requestWakeLock, releaseWakeLock } = useWakeLock();
  
  // Hook du timer résilient
  const {
    remainingMs,
    isRunning,
    durationMs,
    start,
    stop,
    setDuration,
    formatTime,
    progress
  } = useResilientTimer({
    onTimeUp: () => {
      onTimerEnd?.();
      
      // Libérer le wake lock à la fin
      if (wakeLockActive) {
        releaseWakeLock();
      }
      
      // Effacer le badge à la fin
      if (badgeEnabled) {
        clearBadge();
      }
    }
  });

  // Conversion pour compatibilité avec l'UI existante
  const durationMin = Math.round(durationMs / 60000);
  const remainingSec = Math.ceil(remainingMs / 1000);
  
  // Mettre à jour le badge si activé
  useEffect(() => {
    if (badgeEnabled && badgeSupported && isRunning && remainingMs > 0) {
      const minutesLeft = Math.ceil(remainingMs / 60000);
      setBadge(minutesLeft);
    }
  }, [badgeEnabled, badgeSupported, isRunning, remainingMs, setBadge]);

  const handleStart = useCallback(async () => {
    if (durationMs <= 0) return;
    
    await start(durationMs);
    
    // Activer le wake lock si demandé
    if (wakeLockEnabled && wakeLockSupported) {
      await requestWakeLock();
    }
  }, [start, durationMs, wakeLockEnabled, wakeLockSupported, requestWakeLock]);

  const handlePause = useCallback(async () => {
    await stop();
    
    // Libérer le wake lock en pause
    if (wakeLockActive) {
      await releaseWakeLock();
    }
  }, [stop, wakeLockActive, releaseWakeLock]);

  const handleReset = useCallback(async () => {
    await stop();
    
    // Libérer le wake lock
    if (wakeLockActive) {
      await releaseWakeLock();
    }
    
    // Effacer le badge
    if (badgeEnabled) {
      clearBadge();
    }
  }, [stop, wakeLockActive, releaseWakeLock, badgeEnabled, clearBadge]);

  const handleDurationChange = useCallback((values: number[]) => {
    if (!values || values.length === 0) return;
    
    const minutes = values[0];
    if (!Number.isFinite(minutes) || minutes < MIN_DURATION || minutes > MAX_DURATION) return;
    
    // Arrondir au multiple de 5 le plus proche
    const roundedMinutes = Math.round(minutes / STEP_DURATION) * STEP_DURATION;
    const clampedMinutes = Math.max(MIN_DURATION, Math.min(MAX_DURATION, roundedMinutes));
    
    const newDurationMs = clampedMinutes * 60 * 1000;
    setDuration(newDurationMs);
  }, [setDuration]);

  const progressPercent = progress;
  const canStart = durationMs > 0;

  return (
    <div className="space-y-6">
      {/* Sélecteur de durée */}
      {!isRunning && remainingMs === durationMs && (
        <div className="space-y-4">
          <h3 className="font-heading text-lg text-center">Durée de la session</h3>
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
              strokeDashoffset={`${2 * Math.PI * 45 * (1 - progressPercent / 100)}`}
              strokeLinecap="round"
            />
          </svg>
          
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-4xl font-mono font-bold text-foreground">
              {formatTime(remainingMs)}
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
            disabled={remainingMs === durationMs && !isRunning}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>

        {/* Slider de durée */}
        {!isRunning && remainingMs === durationMs && (
          <div className="w-80 px-4">
            <Slider
              value={[durationMin]}
              onValueChange={handleDurationChange}
              min={MIN_DURATION}
              max={MAX_DURATION}
              step={STEP_DURATION}
              className="w-full h-4"
              aria-label="Durée de la session en minutes"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>{MIN_DURATION} min</span>
              <span>{MAX_DURATION} min</span>
            </div>
          </div>
        )}

        {/* Options avancées */}
        {!isRunning && remainingMs === durationMs && (
          <div className="mt-6 pt-4 border-t space-y-4 w-80">
            <h4 className="text-sm font-medium text-muted-foreground text-center">Options avancées</h4>
            
            {badgeSupported && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Badge de l'application</span>
                  <span className="text-xs text-muted-foreground">(minutes restantes)</span>
                </div>
                <Switch
                  checked={badgeEnabled}
                  onCheckedChange={setBadgeEnabled}
                />
              </div>
            )}
            
            {wakeLockSupported && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Moon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Maintenir l'écran allumé</span>
                  <span className="text-xs text-muted-foreground">(évite la veille)</span>
                </div>
                <Switch
                  checked={wakeLockEnabled}
                  onCheckedChange={setWakeLockEnabled}
                />
              </div>
            )}
            
            {wakeLockActive && (
              <div className="text-xs text-success flex items-center justify-center gap-1">
                <Moon className="h-3 w-3" />
                Écran maintenu allumé
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}