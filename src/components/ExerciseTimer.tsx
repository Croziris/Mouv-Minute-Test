import { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface ExerciseTimerProps {
  durationSec: number;
  onComplete?: () => void;
  className?: string;
}

export function ExerciseTimer({ durationSec, onComplete, className = "" }: ExerciseTimerProps) {
  const [timeLeft, setTimeLeft] = useState(durationSec);
  const [isRunning, setIsRunning] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            setIsCompleted(true);
            onComplete?.();
            return 0;
          }
          return prev - 1;
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
      }
    };
  }, [isRunning, timeLeft, onComplete]);

  const handleStartPause = () => {
    if (isCompleted) return;
    setIsRunning(!isRunning);
  };

  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(durationSec);
    setIsCompleted(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = ((durationSec - timeLeft) / durationSec) * 100;

  return (
    <div className={`bg-secondary/30 rounded-lg p-4 space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Timer</span>
        <span className={`text-lg font-mono ${isCompleted ? 'text-primary' : 'text-foreground'}`}>
          {formatTime(timeLeft)}
        </span>
      </div>
      
      <Progress value={progress} className="h-2" />
      
      <div className="flex gap-2 justify-center">
        <Button
          size="sm"
          variant={isRunning ? "secondary" : "default"}
          onClick={handleStartPause}
          disabled={isCompleted}
          className="flex items-center gap-1"
        >
          {isRunning ? (
            <>
              <Pause className="h-3 w-3" />
              Pause
            </>
          ) : (
            <>
              <Play className="h-3 w-3" />
              {isCompleted ? 'Terminé' : 'Démarrer'}
            </>
          )}
        </Button>
        
        <Button
          size="sm"
          variant="outline"
          onClick={handleReset}
          className="flex items-center gap-1"
        >
          <RotateCcw className="h-3 w-3" />
          Reset
        </Button>
      </div>
      
      {isCompleted && (
        <div className="text-center text-sm text-primary font-medium">
          ✨ Exercice terminé !
        </div>
      )}
    </div>
  );
}