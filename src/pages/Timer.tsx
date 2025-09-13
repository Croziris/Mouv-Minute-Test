// Timer refondu avec notifications push et fonctionnement en arrière-plan
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Play, Pause, RotateCcw, CheckCircle, Clock, Bell, BellOff, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Layout } from "@/components/layout/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useDeadlineTimer } from "@/hooks/useDeadlineTimer";
import { PushNotificationButton } from "@/components/PushNotificationButton";
import { usePushSetup } from "@/hooks/usePushSetup";

type TimerState = 'stopped' | 'running' | 'paused' | 'break';

interface Exercise {
  id: string;
  title: string;
  description_public: string;
  duration_sec: number;
  zone: string;
}

interface Program {
  id: string;
  title: string;
  description: string;
  order_index: number;
}

export default function Timer() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // État du timer et des exercices
  const [state, setState] = useState<TimerState>('stopped');
  const [breakExercises, setBreakExercises] = useState<Exercise[]>([]);
  const [completedExercises, setCompletedExercises] = useState<string[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Hook pour le timer basé sur échéance
  const timer = useDeadlineTimer({
    onTimeUp: () => {
      console.log('Timer terminé, transition vers break');
      handleTimeUp();
    }
  });

    // Hook pour les notifications push
    const pushSetup = usePushSetup();
    const { scheduleNotification } = pushSetup;

    // État des notifications pour cette session
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);

    // Charger les paramètres d'URL au montage
  useEffect(() => {
    const restart = searchParams.get('restart');
    if (restart) {
      const minutes = parseInt(restart) / 60;
      if (minutes > 0) {
        timer.setDuration(minutes * 60 * 1000);
        toast({
          title: "Timer configuré",
          description: `Prêt pour une session de ${minutes} minutes`,
        });
      }
    }
  }, [searchParams]);

  // Charger les programmes disponibles
  useEffect(() => {
    const fetchPrograms = async () => {
      const { data } = await supabase
        .from('programs')
        .select('*')
        .order('order_index');
      
      if (data) {
        setPrograms(data);
      }
    };

    fetchPrograms();
  }, []);

  const formatTime = (ms: number) => {
    return timer.formatTime(ms);
  };

  const getRandomExercises = async () => {
    const { data: allExercises } = await supabase
      .from('exercises')
      .select('*')
      .limit(20);

    if (allExercises && allExercises.length > 0) {
      const shuffled = [...allExercises].sort(() => 0.5 - Math.random());
      return shuffled.slice(0, 5);
    }
    return [];
  };

  const startSession = async () => {
    if (!user) {
      toast({
        title: "Connexion requise",
        description: "Vous devez être connecté pour démarrer une session.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Créer une session en base de données
      const { data: session, error } = await supabase
        .from('sessions')
        .insert({
          user_id: user.id,
          duration_minutes: Math.round(timer.durationMs / 60000),
          started_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Démarrer le timer avec l'ID de session
      timer.start(undefined, session.id);
      setSessionId(session.id);
      setState('running');

      // Programmer la notification si activée
      if (notificationsEnabled && pushSetup.status === 'subscribed') {
        const endAt = new Date(Date.now() + timer.durationMs);
        await scheduleNotification(endAt, session.id);
        
        toast({
          title: "Session démarrée",
          description: "Vous recevrez une notification à la fin de la session.",
        });
      } else {
        toast({
          title: "Session démarrée",
          description: `Timer lancé pour ${Math.round(timer.durationMs / 60000)} minutes.`,
        });
      }

    } catch (error) {
      console.error('Erreur lors du démarrage de la session:', error);
      toast({
        title: "Erreur",
        description: "Impossible de démarrer la session.",
        variant: "destructive",
      });
    }
  };

  const handleTimeUp = async () => {
    setState('break');
    
    // Récupérer des exercices pour la pause
    const exercises = await getRandomExercises();
    setBreakExercises(exercises);
    setCompletedExercises([]);

    // Notification locale de secours si les push notifications ne marchent pas
    if (notificationsEnabled && 'Notification' in window && Notification.permission === 'granted') {
      new Notification('Session terminée 🎉', {
        body: 'Il est temps de faire tes exercices.',
        icon: '/icon-192.png'
      });
    }
  };

  const toggleTimer = () => {
    if (timer.isRunning) {
      timer.pause();
      setState('paused');
    } else if (state === 'paused') {
      timer.resume();
      setState('running');
    } else {
      startSession();
    }
  };

  const resetTimer = () => {
    timer.reset();
    setState('stopped');
    setBreakExercises([]);
    setCompletedExercises([]);
    setSessionId(null);
  };

  const handleDurationChange = (newDuration: number) => {
    if (state === 'stopped') {
      timer.setDuration(newDuration * 60 * 1000);
    }
  };

  const handleSliderChange = (value: number[]) => {
    handleDurationChange(value[0]);
  };

  const markExerciseCompleted = (exerciseId: string) => {
    setCompletedExercises(prev => [...prev, exerciseId]);
  };

  const completeSession = async () => {
    if (!sessionId) return;

    try {
      // Marquer la session comme terminée
      await supabase
        .from('sessions')
        .update({
          completed: true,
          ended_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      // Enregistrer les exercices complétés
      const exerciseRecords = completedExercises.map(exerciseId => ({
        session_id: sessionId,
        exercise_id: exerciseId,
        completed: true
      }));

      if (exerciseRecords.length > 0) {
        await supabase
          .from('session_exercises')
          .insert(exerciseRecords);
      }

      toast({
        title: "Session terminée !",
        description: `Félicitations ! Vous avez terminé ${completedExercises.length} exercices.`,
      });

      resetTimer();
    } catch (error) {
      console.error('Erreur lors de la finalisation:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder la session.",
        variant: "destructive",
      });
    }
  };

  const launchProgram = async (programId: string) => {
    try {
      const { data: exercises } = await supabase
        .from('program_exercises')
        .select(`
          exercises (*)
        `)
        .eq('program_id', programId)
        .order('order_index');

      if (exercises && exercises.length > 0) {
        const programExercises = exercises.map(pe => pe.exercises).filter(Boolean);
        setBreakExercises(programExercises as Exercise[]);
        setCompletedExercises([]);
        setState('break');
        setSelectedProgram(programId);
      }
    } catch (error) {
      console.error('Erreur lors du chargement du programme:', error);
    }
  };

  const handleNotificationToggle = (enabled: boolean) => {
    setNotificationsEnabled(enabled);
  };

  const progress = timer.progress;
  const allExercisesCompleted = breakExercises.length > 0 && completedExercises.length === breakExercises.length;

  if (state === 'break') {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Card className="border-success/20 bg-success/5">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-heading text-success">
                🎉 C'est l'heure de la pause !
              </CardTitle>
              <CardDescription>
                Faites ces exercices pour optimiser votre bien-être
              </CardDescription>
            </CardHeader>
          </Card>

          <div className="mt-6 space-y-4">
            {breakExercises.map((exercise) => {
              const isCompleted = completedExercises.includes(exercise.id);
              return (
                <Card key={exercise.id} className={`transition-all ${
                  isCompleted 
                    ? 'border-success/50 bg-success/10' 
                    : 'border-accent/20 hover:border-accent/40'
                }`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg font-heading flex items-center gap-2">
                          {isCompleted && <CheckCircle className="h-5 w-5 text-success" />}
                          {exercise.title}
                          <span className="text-sm text-muted-foreground ml-2">
                            ({exercise.duration_sec}s • {exercise.zone})
                          </span>
                        </CardTitle>
                        {exercise.description_public && (
                          <CardDescription className="mt-1">
                            {exercise.description_public}
                          </CardDescription>
                        )}
                      </div>
                      
                      {!isCompleted && (
                        <Button
                          onClick={() => markExerciseCompleted(exercise.id)}
                          variant="outline"
                          size="sm"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Terminé
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                </Card>
              );
            })}
          </div>

          <div className="mt-8 flex gap-4 justify-center">
            {allExercisesCompleted ? (
              <Button 
                onClick={completeSession} 
                size="lg" 
                className="font-semibold"
              >
                <CheckCircle className="h-5 w-5 mr-2" />
                Valider la session
              </Button>
            ) : (
              <Button 
                onClick={completeSession} 
                variant="outline" 
                size="lg"
              >
                Terminer maintenant
              </Button>
            )}
            
            <Button 
              onClick={resetTimer} 
              variant="outline" 
              size="lg"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Nouvelle session
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl space-y-8">
        {/* Timer principal */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-heading">Session de travail</CardTitle>
            <CardDescription>
              Configurez votre timer et recevez des rappels pour vos pauses actives
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-8">
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
                    {formatTime(timer.remainingMs)}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {state === 'running' ? 'En cours' : 
                     state === 'paused' ? 'En pause' : 'Arrêté'}
                  </div>
                </div>
              </div>

              {/* Contrôles du timer */}
              <div className="flex gap-4">
                <Button
                  onClick={toggleTimer}
                  size="lg"
                  className="font-semibold"
                  disabled={!user}
                >
                  {timer.isRunning ? (
                    <>
                      <Pause className="h-5 w-5 mr-2" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="h-5 w-5 mr-2" />
                      {state === 'paused' ? 'Reprendre' : 'Démarrer'}
                    </>
                  )}
                </Button>
                
                <Button
                  onClick={resetTimer}
                  variant="outline"
                  size="lg"
                  disabled={state === 'stopped'}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
              </div>
            </div>

            {/* Configuration de la durée (seulement quand arrêté) */}
            {state === 'stopped' && (
              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="font-heading text-lg mb-4">Durée de la session</h3>
                  <div className="grid grid-cols-3 gap-3 max-w-md mx-auto mb-4">
                    {[15, 25, 45].map((minutes) => (
                      <Button
                        key={minutes}
                        variant={Math.round(timer.durationMs / 60000) === minutes ? 'default' : 'outline'}
                        onClick={() => handleDurationChange(minutes)}
                        className="font-medium"
                      >
                        {minutes} min
                      </Button>
                    ))}
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-2xl font-mono font-bold">
                      {Math.round(timer.durationMs / 60000)} minutes
                    </div>
                    <Slider
                      value={[Math.round(timer.durationMs / 60000)]}
                      onValueChange={handleSliderChange}
                      min={5}
                      max={120}
                      step={5}
                      className="max-w-md mx-auto"
                    />
                    <div className="text-xs text-muted-foreground flex justify-between max-w-md mx-auto">
                      <span>5 min</span>
                      <span>2h</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Configuration des notifications */}
        <Card className="border-accent/20 bg-accent/5">
          <CardHeader>
            <CardTitle className="text-lg font-heading flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications de rappel
            </CardTitle>
            <CardDescription>
              Recevoir des alertes à la fin des sessions de travail
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <PushNotificationButton onStatusChange={handleNotificationToggle} />
          </CardContent>
        </Card>

        {/* Programmes recommandés */}
        {programs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="font-heading">Programmes d'exercices</CardTitle>
              <CardDescription>
                Sélectionnez un programme pour démarrer directement une pause active
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {programs.map((program) => (
                  <Card key={program.id} className="border-accent/20 hover:border-accent/40 transition-colors cursor-pointer" onClick={() => launchProgram(program.id)}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base font-heading">{program.title}</CardTitle>
                      {program.description && (
                        <CardDescription className="text-sm">{program.description}</CardDescription>
                      )}
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {!user && (
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Connectez-vous pour sauvegarder vos sessions et accéder à toutes les fonctionnalités.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </Layout>
  );
}