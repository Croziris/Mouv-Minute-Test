import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Play, CheckCircle, ArrowRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Layout } from "@/components/layout/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ExerciseTimer } from "@/components/ExerciseTimer";

interface Exercise {
  id: string;
  title: string;
  description_public: string;
  duration_sec: number;
  zone: string;
  thumb_url: string | null;
  media_primary: string | null;
  notes_kine: string | null;
}

interface Program {
  id: string;
  title: string;
  description: string;
}

export default function Session() {
  const { programId } = useParams<{ programId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [program, setProgram] = useState<Program | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [currentExercise, setCurrentExercise] = useState(0);
  const [completedExercises, setCompletedExercises] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProgramAndExercises = async () => {
      if (!programId) return;

      try {
        // Récupérer le programme
        const { data: programData, error: programError } = await supabase
          .from('programs')
          .select('*')
          .eq('id', programId)
          .single();

        if (programError) throw programError;
        setProgram(programData);

        // Récupérer les exercices du programme
        const { data: programExercises, error: exercisesError } = await supabase
          .from('program_exercises')
          .select(`
            exercise_id,
            order_index,
            exercises (
              id,
              title,
              description_public,
              duration_sec,
              zone,
              thumb_url,
              media_primary,
              notes_kine
            )
          `)
          .eq('program_id', programId)
          .order('order_index', { ascending: true });

        if (exercisesError) throw exercisesError;

        const exerciseList = programExercises
          ?.map(pe => pe.exercises)
          .filter(Boolean) as Exercise[] || [];
        
        setExercises(exerciseList);
      } catch (error) {
        console.error('Error fetching program:', error);
        toast({
          title: "Erreur",
          description: "Impossible de charger le programme.",
          variant: "destructive",
        });
        navigate('/timer');
      } finally {
        setLoading(false);
      }
    };

    fetchProgramAndExercises();
  }, [programId, navigate]);

  const handleCompleteExercise = () => {
    const exercise = exercises[currentExercise];
    if (exercise && !completedExercises.includes(exercise.id)) {
      setCompletedExercises(prev => [...prev, exercise.id]);
      
      toast({
        title: "Exercice terminé !",
        description: `${exercise.title} complété avec succès.`,
      });
    }
  };

  const handleNextExercise = () => {
    if (currentExercise < exercises.length - 1) {
      setCurrentExercise(currentExercise + 1);
    }
  };

  const handleFinishSession = async () => {
    if (!user) return;

    try {
      // Créer une session pour cette séance
      const { data: session, error } = await supabase
        .from('sessions')
        .insert([{
          duration_minutes: Math.ceil(exercises.reduce((sum, ex) => sum + ex.duration_sec, 0) / 60),
          completed: true,
          ended_at: new Date().toISOString(),
        } as any])
        .select()
        .single();

      if (error) throw error;

      // Ajouter les exercices terminés à la session
      if (session && completedExercises.length > 0) {
        const sessionExercises = completedExercises.map(exerciseId => ({
          session_id: session.id,
          exercise_id: exerciseId,
          completed: true,
        }));

        await supabase
          .from('session_exercises')
          .insert(sessionExercises);
      }

      toast({
        title: "Séance terminée !",
        description: "Votre séance a été enregistrée avec succès.",
      });

      navigate('/timer');
    } catch (error) {
      console.error('Error finishing session:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer la séance.",
        variant: "destructive",
      });
    }
  };

  const handleRestart = () => {
    setCurrentExercise(0);
    setCompletedExercises([]);
  };

  // Vérifier si l'utilisateur est connecté
  if (!user) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-6">
          <div className="max-w-2xl mx-auto text-center space-y-6">
            <div className="p-8 bg-muted/30 rounded-lg border">
              <h1 className="text-2xl font-heading font-bold mb-4 text-primary">
                Contenu réservé aux utilisateurs connectés
              </h1>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Pour accéder aux séances d'exercices personnalisées, vous devez vous connecter à votre compte.
                Rejoignez notre communauté pour bénéficier de programmes adaptés à vos besoins.
              </p>
              <Button 
                onClick={() => navigate('/auth')} 
                size="lg"
                className="bg-primary hover:bg-primary-dark text-primary-foreground"
              >
                Se connecter
              </Button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-6">
          <div className="max-w-2xl mx-auto">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-muted rounded"></div>
              <div className="h-64 bg-muted rounded"></div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!program || exercises.length === 0) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-6">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-2xl font-heading font-bold mb-4">Programme introuvable</h1>
            <p className="text-muted-foreground mb-6">
              Le programme demandé n'existe pas ou ne contient aucun exercice.
            </p>
            <Button onClick={() => navigate('/timer')}>
              Retour aux programmes
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  const progress = ((completedExercises.length) / exercises.length) * 100;
  const currentEx = exercises[currentExercise];
  const isCurrentCompleted = currentEx && completedExercises.includes(currentEx.id);
  const canGoNext = isCurrentCompleted && currentExercise < exercises.length - 1;
  const canFinish = completedExercises.length === exercises.length;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-heading font-bold text-primary">
              {program.title}
            </h1>
            <p className="text-muted-foreground">
              {program.description}
            </p>
          </div>

          {/* Progress */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">
                  Exercice {currentExercise + 1} sur {exercises.length}
                </span>
                <span className="text-sm text-muted-foreground">
                  {completedExercises.length}/{exercises.length} terminés
                </span>
              </div>
              <Progress value={progress} className="h-2" />
            </CardContent>
          </Card>

          {/* Current Exercise */}
          {currentEx && (
            <Card className={isCurrentCompleted ? "border-primary bg-primary/5" : ""}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-heading">
                      {currentEx.title}
                    </CardTitle>
                    <CardDescription>
                      Zone: {currentEx.zone} • {currentEx.duration_sec}s
                    </CardDescription>
                  </div>
                  {isCurrentCompleted && (
                    <CheckCircle className="h-6 w-6 text-primary" />
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {currentEx.thumb_url && (
                  <img
                    src={currentEx.thumb_url}
                    alt={currentEx.title}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                )}
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Description</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {currentEx.description_public}
                    </p>
                  </div>
                  
                  {currentEx.notes_kine && (
                    <div>
                      <h4 className="font-medium mb-2">💡 Tips kiné</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {currentEx.notes_kine}
                      </p>
                    </div>
                  )}
                </div>

                {currentEx.media_primary && (
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">Vidéo de démonstration</h4>
                    <video
                      src={currentEx.media_primary}
                      autoPlay
                      loop
                      muted
                      playsInline
                      controls
                      className="w-full max-w-md mx-auto rounded-lg"
                      style={{ maxHeight: '300px' }}
                      preload="metadata"
                    >
                      Votre navigateur ne supporte pas la lecture vidéo.
                    </video>
                  </div>
                )}
                
                {/* Timer pour l'exercice */}
                <div className="mt-4">
                  <ExerciseTimer
                    durationSec={currentEx.duration_sec}
                    onComplete={() => {
                      toast({
                        title: "Timer terminé !",
                        description: `Temps d'exercice écoulé pour ${currentEx.title}`,
                      });
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex gap-4 justify-center">
            {!isCurrentCompleted ? (
              <Button
                onClick={handleCompleteExercise}
                size="lg"
                className="bg-primary hover:bg-primary-dark text-primary-foreground"
              >
                <CheckCircle className="mr-2 h-5 w-5" />
                Marquer comme terminé
              </Button>
            ) : canGoNext ? (
              <Button
                onClick={handleNextExercise}
                size="lg"
                className="bg-accent hover:bg-accent-light text-accent-foreground"
              >
                Exercice suivant
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            ) : canFinish ? (
              <Button
                onClick={handleFinishSession}
                size="lg"
                className="bg-primary hover:bg-primary-dark text-primary-foreground"
              >
                <CheckCircle className="mr-2 h-5 w-5" />
                Terminer la séance
              </Button>
            ) : null}
            
            <Button onClick={handleRestart} variant="outline" size="lg">
              <RotateCcw className="mr-2 h-4 w-4" />
              Recommencer
            </Button>
          </div>

          {/* Exercise Navigation */}
          <Card className="bg-secondary/30">
            <CardHeader>
              <CardTitle className="text-lg">Exercices de cette séance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {exercises.map((exercise, index) => (
                  <div
                    key={exercise.id}
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                      index === currentExercise
                        ? "border-primary bg-primary/10"
                        : completedExercises.includes(exercise.id)
                        ? "border-primary/30 bg-primary/5"
                        : "border-muted hover:border-primary/50"
                    }`}
                    onClick={() => setCurrentExercise(index)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                        completedExercises.includes(exercise.id)
                          ? "bg-primary text-primary-foreground"
                          : index === currentExercise
                          ? "bg-primary/20 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {completedExercises.includes(exercise.id) ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : (
                          index + 1
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{exercise.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {exercise.zone} • {exercise.duration_sec}s
                        </p>
                      </div>
                    </div>
                    {index === currentExercise && (
                      <Play className="h-4 w-4 text-primary" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}