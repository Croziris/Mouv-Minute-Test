import { useState, useEffect } from "react";
import { Play, Pause, RotateCcw, CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Layout } from "@/components/layout/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

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
  const [state, setState] = useState<TimerState>('stopped');
  const [timeLeft, setTimeLeft] = useState(45 * 60); // 45 minutes par défaut
  const [totalTime] = useState(45 * 60);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [breakExercises, setBreakExercises] = useState<Exercise[]>([]);
  const [completedExercises, setCompletedExercises] = useState<string[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<string | null>(null);

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (state === 'running' && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            // Temps écoulé, passer en pause
            handleTimeUp();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [state, timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getRandomExercises = async () => {
    const { data: allExercises } = await supabase
      .from('exercises')
      .select('*')
      .limit(20);

    if (allExercises && allExercises.length > 0) {
      // Sélectionner 2-3 exercices aléatoires
      const shuffled = [...allExercises].sort(() => 0.5 - Math.random());
      return shuffled.slice(0, 3);
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
      // Créer une nouvelle session
      const { data: session, error } = await supabase
        .from('sessions')
        .insert({
          user_id: user.id,
          duration_minutes: Math.floor(totalTime / 60),
        })
        .select()
        .single();

      if (error) throw error;

      setSessionId(session?.id);
      setState('running');
      
      toast({
        title: "Session démarrée",
        description: `Session de ${Math.floor(totalTime / 60)} minutes commencée.`,
      });
    } catch (error) {
      console.error('Error starting session:', error);
      toast({
        title: "Erreur",
        description: "Impossible de démarrer la session.",
        variant: "destructive",
      });
    }
  };

  const handleTimeUp = async () => {
    setState('break');
    
    // Charger des exercices aléatoires
    const exercises = await getRandomExercises();
    setBreakExercises(exercises);

    // Ajouter les exercices à la session
    if (sessionId && exercises.length > 0) {
      const sessionExercises = exercises.map(exercise => ({
        session_id: sessionId,
        exercise_id: exercise.id,
      }));

      await supabase
        .from('session_exercises')
        .insert(sessionExercises);
    }

    // Notification si possible
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Mouv\'Minute - Temps de pause !', {
        body: 'C\'est l\'heure de faire quelques exercices.',
        icon: '/favicon.ico',
      });
    }

    toast({
      title: "⏰ Temps de pause !",
      description: "Prenez quelques minutes pour vous étirer avec nos exercices.",
    });
  };

  const toggleTimer = () => {
    if (state === 'running') {
      setState('paused');
    } else if (state === 'paused') {
      setState('running');
    } else {
      startSession();
    }
  };

  const resetTimer = () => {
    setState('stopped');
    setTimeLeft(totalTime);
    setSessionId(null);
    setBreakExercises([]);
    setCompletedExercises([]);
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
          ended_at: new Date().toISOString(),
          completed: true,
        })
        .eq('id', sessionId);

      // Marquer les exercices comme terminés
      if (completedExercises.length > 0) {
        await supabase
          .from('session_exercises')
          .update({ completed: true })
          .eq('session_id', sessionId)
          .in('exercise_id', completedExercises);
      }

      toast({
        title: "Séance validée !",
        description: "Votre session a été enregistrée avec succès.",
      });

      resetTimer();
    } catch (error) {
      console.error('Error completing session:', error);
      toast({
        title: "Erreur",
        description: "Impossible de valider la session.",
        variant: "destructive",
      });
    }
  };

  const progress = ((totalTime - timeLeft) / totalTime) * 100;
  const allExercisesCompleted = breakExercises.length > 0 && 
    breakExercises.every(exercise => completedExercises.includes(exercise.id));

  // Charger les programmes
  useEffect(() => {
    const fetchPrograms = async () => {
      const { data } = await supabase
        .from('programs')
        .select('*')
        .order('order_index', { ascending: true });
      
      if (data) {
        setPrograms(data);
      }
    };

    fetchPrograms();
  }, []);

  // Demander la permission pour les notifications
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const launchProgram = async (programId: string) => {
    try {
      // Récupérer les exercices du programme
      const { data: programExercises } = await supabase
        .from('program_exercises')
        .select(`
          exercise_id,
          order_index,
          exercises (
            id,
            title,
            description_public,
            duration_sec,
            zone
          )
        `)
        .eq('program_id', programId)
        .order('order_index', { ascending: true });

      if (programExercises && programExercises.length > 0) {
        const exercises = programExercises.map(pe => pe.exercises).filter(Boolean);
        setBreakExercises(exercises);
        setCompletedExercises([]);
        setState('break');
        
        // Ajouter les exercices à la session si une session est active
        if (sessionId) {
          const sessionExercises = exercises.map(exercise => ({
            session_id: sessionId,
            exercise_id: exercise.id,
          }));

          await supabase
            .from('session_exercises')
            .insert(sessionExercises);
        }
      }
    } catch (error) {
      console.error('Error launching program:', error);
      toast({
        title: "Erreur",
        description: "Impossible de lancer le programme.",
        variant: "destructive",
      });
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6">
        {state !== 'break' ? (
          /* État normal - Timer */
          <div className="max-w-md mx-auto space-y-8">
            <div className="text-center space-y-4">
              <h1 className="text-2xl font-heading font-bold">Session de travail</h1>
              <p className="text-muted-foreground">
                Concentrez-vous sur votre travail. Nous vous préviendrons quand il sera temps de faire une pause.
              </p>
            </div>

            {/* Timer circulaire */}
            <Card className="text-center">
              <CardContent className="p-8">
                <div className="relative mb-6">
                  <div className="mx-auto h-48 w-48 rounded-full border-8 border-secondary flex items-center justify-center relative overflow-hidden">
                    <div 
                      className="absolute inset-0 rounded-full border-8 border-primary transition-all duration-1000"
                      style={{
                        background: `conic-gradient(hsl(var(--primary)) ${progress * 3.6}deg, transparent 0deg)`,
                        clipPath: 'inset(0 0 50% 0)',
                      }}
                    />
                    <div className="relative z-10 text-center">
                      <div className="text-3xl font-heading font-bold text-primary">
                        {formatTime(timeLeft)}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {state === 'stopped' && 'Prêt à commencer'}
                        {state === 'running' && 'En cours...'}
                        {state === 'paused' && 'En pause'}
                      </div>
                    </div>
                  </div>
                </div>

                <Progress value={progress} className="mb-6" />

                <div className="flex gap-4 justify-center">
                  <Button
                    onClick={toggleTimer}
                    size="lg"
                    className={
                      state === 'running' 
                        ? "bg-accent hover:bg-accent-light text-accent-foreground"
                        : "bg-primary hover:bg-primary-dark text-primary-foreground"
                    }
                  >
                    {state === 'running' ? (
                      <>
                        <Pause className="mr-2 h-5 w-5" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-5 w-5" />
                        {state === 'stopped' ? 'Démarrer' : 'Reprendre'}
                      </>
                    )}
                  </Button>

                  {state !== 'stopped' && (
                    <Button onClick={resetTimer} variant="outline" size="lg">
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Reset
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-secondary/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Durée recommandée</p>
                    <p className="text-xs text-muted-foreground">
                      45 minutes de travail, puis 3 minutes d'exercices
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Programmes de séances */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-heading">Programmes de séances</CardTitle>
                <CardDescription>
                  Séances prédéfinies de 3 exercices que vous pouvez lancer à tout moment
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {programs.map((program) => (
                    <Button
                      key={program.id}
                      variant="outline"
                      onClick={() => launchProgram(program.id)}
                      className="h-auto p-3 text-left flex flex-col items-start"
                    >
                      <span className="font-medium text-sm">{program.title}</span>
                      <span className="text-xs text-muted-foreground mt-1">
                        {program.description}
                      </span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          /* État pause - Exercices */
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-heading font-bold text-accent">
                ⏰ C'est l'heure de la pause !
              </h1>
              <p className="text-muted-foreground">
                Prenez quelques minutes pour vous étirer et vous détendre.
              </p>
            </div>

            {breakExercises.length > 0 ? (
              <div className="space-y-4">
                {breakExercises.map((exercise) => (
                  <Card 
                    key={exercise.id} 
                    className={
                      completedExercises.includes(exercise.id)
                        ? "border-primary bg-primary/5"
                        : "hover:shadow-soft transition-shadow"
                    }
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg font-heading">
                            {exercise.title}
                          </CardTitle>
                          <CardDescription className="text-sm">
                            Zone: {exercise.zone} • {exercise.duration_sec}s
                          </CardDescription>
                        </div>
                        {completedExercises.includes(exercise.id) ? (
                          <CheckCircle className="h-6 w-6 text-primary" />
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => markExerciseCompleted(exercise.id)}
                            className="bg-primary hover:bg-primary-dark text-primary-foreground"
                          >
                            Terminé
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {exercise.description_public}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">
                    Aucun exercice disponible pour le moment.
                  </p>
                </CardContent>
              </Card>
            )}

            <div className="flex gap-4 justify-center">
              <Button
                onClick={completeSession}
                disabled={!allExercisesCompleted}
                size="lg"
                className="bg-accent hover:bg-accent-light text-accent-foreground disabled:opacity-50"
              >
                <CheckCircle className="mr-2 h-5 w-5" />
                Valider la séance
              </Button>
              
              <Button onClick={resetTimer} variant="outline" size="lg">
                Nouvelle session
              </Button>
            </div>

            {!allExercisesCompleted && (
              <p className="text-center text-sm text-muted-foreground">
                Terminez tous les exercices pour valider votre séance
              </p>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}