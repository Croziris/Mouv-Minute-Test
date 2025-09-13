import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle, Shield, Bell, LogIn, UserPlus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Callout } from "@/components/ui/callout";
import { Layout } from "@/components/layout/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { BasicTimer } from "@/components/BasicTimer";
import { PushNotificationButton } from "@/components/PushNotificationButton";
import { usePushSetup } from "@/hooks/usePushSetup";
import { ErrorBoundary } from "@/components/ErrorBoundary";

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

// Constantes
const ENABLE_TIMER = import.meta.env.VITE_ENABLE_TIMER !== 'false';

function TimerDisabled() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="border-warning/20 bg-warning/5">
          <CardHeader className="text-center">
            <CardTitle className="text-xl font-heading text-warning">
              Timer temporairement désactivé
            </CardTitle>
            <CardDescription>
              Cette fonctionnalité est en cours de maintenance. Elle sera bientôt disponible.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertDescription>
                Pour les développeurs : définissez <code>VITE_ENABLE_TIMER=true</code> dans vos variables d'environnement.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

function TimerComponent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // État des exercices et sessions
  const [state, setState] = useState<TimerState>('stopped');
  const [breakExercises, setBreakExercises] = useState<Exercise[]>([]);
  const [completedExercises, setCompletedExercises] = useState<string[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Hook pour les notifications push
  const pushSetup = usePushSetup();

  // État des notifications pour cette session
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

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

  // TODO: Réintégrer les features deadline/background derrière un feature flag si nécessaire

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

  const startSession = async (durationMinutes: number) => {
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
          duration_minutes: durationMinutes,
          started_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      setSessionId(session.id);
      setState('running');

      toast({
        title: "Session démarrée",
        description: `Timer lancé pour ${durationMinutes} minutes.`,
      });

    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Erreur lors du démarrage de la session:', error);
      }
      toast({
        title: "Erreur",
        description: "Impossible de démarrer la session.",
        variant: "destructive",
      });
    }
  };

  const handleTimerEnd = async () => {
    setState('break');
    
    // Récupérer des exercices pour la pause
    const exercises = await getRandomExercises();
    setBreakExercises(exercises);
    setCompletedExercises([]);

    // Notification locale simple
    if (typeof window !== 'undefined' && notificationsEnabled && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('Session terminée 🎉', {
          body: 'Il est temps de faire tes exercices.',
          icon: '/icon-192.png'
        });
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('Notification failed:', error);
        }
      }
    }
  };

  const resetSession = () => {
    setState('stopped');
    setBreakExercises([]);
    setCompletedExercises([]);
    setSessionId(null);
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

      resetSession();
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Erreur lors de la finalisation:', error);
      }
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
      }
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Erreur lors du chargement du programme:', error);
      }
    }
  };

  const handleNotificationToggle = (enabled: boolean) => {
    setNotificationsEnabled(enabled);
  };

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
              onClick={resetSession} 
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
          
          <CardContent>
            {/* Message de connexion ou Timer */}
            {!user ? (
              <Callout 
                variant="info" 
                title="Connexion requise" 
                icon={<Shield className="h-5 w-5" />}
                className="max-w-md mx-auto"
              >
                <p className="mb-4">Connecte-toi pour démarrer une session et recevoir les rappels.</p>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    onClick={() => navigate('/auth')}
                    className="flex-1"
                  >
                    <LogIn className="h-4 w-4 mr-2" />
                    Se connecter
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => navigate('/auth')}
                    className="flex-1"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Créer un compte
                  </Button>
                </div>
              </Callout>
            ) : (
              <BasicTimer onTimerEnd={handleTimerEnd} />
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

export default function Timer() {
  if (!ENABLE_TIMER) {
    return <TimerDisabled />;
  }

  return (
    <ErrorBoundary>
      <TimerComponent />
    </ErrorBoundary>
  );
}