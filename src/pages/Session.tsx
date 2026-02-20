import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Play, CheckCircle, ArrowRight, RotateCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Layout } from "@/components/layout/Layout";
import { toast } from "@/hooks/use-toast";
import { ExerciseTimer } from "@/components/ExerciseTimer";
import { programService, sessionService, Exercise, ProgramExercise } from "@/lib/pocketbase";
import { useAuth } from "@/contexts/AuthContext";

export default function Session() {
  const { programId } = useParams<{ programId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [program, setProgram] = useState<any>(null);
  const [exercises, setExercises] = useState<(ProgramExercise & { expand: { exercise: Exercise } })[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentExercise, setCurrentExercise] = useState(0);
  const [completedExercises, setCompletedExercises] = useState<string[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (!programId) return;
    const load = async () => {
      try {
        setLoading(true);

        // Charger le programme
        const programs = await programService.getAll();
        const found = programs.find((p) => p.id === programId);
        setProgram(found || null);

        // Charger les exercices du programme
        const exs = await programService.getExercises(programId);
        setExercises(exs as any);

        // Démarrer une session PocketBase si connecté
        if (user) {
          const totalMin = exs.reduce((sum: number, e: any) =>
            sum + (e.expand?.exercise?.duration_sec || 0), 0) / 60;
          const session = await sessionService.start(Math.ceil(totalMin));
          setSessionId(session.id);
        }
      } catch (err) {
        console.error("Erreur chargement session:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [programId, user?.id]);

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
            <Button onClick={() => navigate("/timer")}>Retour aux programmes</Button>
          </div>
        </div>
      </Layout>
    );
  }

  const progress = (completedExercises.length / exercises.length) * 100;
  const currentEx = exercises[currentExercise];
  const currentExData: Exercise | null = (currentEx as any)?.expand?.exercise || null;
  const isCurrentCompleted = currentEx ? completedExercises.includes(currentEx.id) : false;
  const canGoNext = isCurrentCompleted && currentExercise < exercises.length - 1;
  const canFinish = completedExercises.length === exercises.length;

  const handleCompleteExercise = () => {
    if (!currentEx) return;
    if (!completedExercises.includes(currentEx.id)) {
      setCompletedExercises((prev) => [...prev, currentEx.id]);
      toast({
        title: "Exercice terminé ✅",
        description: `${currentExData?.title} complété avec succès.`,
      });
    }
  };

  const handleNextExercise = () => {
    if (currentExercise < exercises.length - 1) {
      setCurrentExercise((v) => v + 1);
    }
  };

  const handleFinishSession = async () => {
    try {
      if (sessionId) {
        await sessionService.end(sessionId);
      }
      toast({
        title: "Séance terminée 🎉",
        description: "Votre séance a été enregistrée dans PocketBase.",
      });
      navigate("/timer");
    } catch (err) {
      console.error("Erreur fin de session:", err);
      navigate("/timer");
    }
  };

  const handleRestart = () => {
    setCurrentExercise(0);
    setCompletedExercises([]);
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-2xl mx-auto space-y-6">

          {/* Titre programme */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-heading font-bold text-primary">{program.title}</h1>
            {program.description && (
              <p className="text-muted-foreground">{program.description}</p>
            )}
          </div>

          {/* Barre de progression */}
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

          {/* Exercice courant */}
          {currentExData && (
            <Card className={isCurrentCompleted ? "border-primary bg-primary/5" : ""}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-heading">{currentExData.title}</CardTitle>
                    <CardDescription>
                      Zone : {currentExData.zone} • {currentExData.duration_sec}s
                    </CardDescription>
                  </div>
                  {isCurrentCompleted && <CheckCircle className="h-6 w-6 text-primary" />}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">

                {/* Miniature / vidéo */}
                {currentExData.youtube_id ? (
                  <div className="w-full rounded-lg overflow-hidden bg-black/5">
                    <iframe
                      src={`https://www.youtube.com/embed/${currentExData.youtube_id}?autoplay=1&loop=1&playlist=${currentExData.youtube_id}`}
                      title={currentExData.title}
                      className="w-full aspect-video"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : currentExData.thumb_url ? (
                  <img
                    src={currentExData.thumb_url}
                    alt={currentExData.title}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-full h-48 bg-secondary/30 rounded-lg flex items-center justify-center">
                    <p className="text-muted-foreground text-sm">Vidéo à venir</p>
                  </div>
                )}

                {/* Description + Tips */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Description</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {currentExData.description_public || "Aucune description."}
                    </p>
                  </div>
                  {currentExData.notes_kine && (
                    <div>
                      <h4 className="font-medium mb-2">Tips kiné</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {currentExData.notes_kine}
                      </p>
                    </div>
                  )}
                </div>

                {/* Timer */}
                <div className="mt-4">
                  <ExerciseTimer
                    durationSec={currentExData.duration_sec}
                    onComplete={() => {
                      toast({
                        title: "Timer terminé ⏱️",
                        description: `Temps écoulé pour ${currentExData.title}.`,
                      });
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Boutons d'action */}
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

          {/* Liste des exercices */}
          <Card className="bg-secondary/30">
            <CardHeader>
              <CardTitle className="text-lg">Exercices de cette séance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {exercises.map((ex, index) => {
                  const exData: Exercise | null = (ex as any)?.expand?.exercise || null;
                  return (
                    <div
                      key={ex.id}
                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                        index === currentExercise
                          ? "border-primary bg-primary/10"
                          : completedExercises.includes(ex.id)
                          ? "border-primary/30 bg-primary/5"
                          : "border-muted hover:border-primary/50"
                      }`}
                      onClick={() => setCurrentExercise(index)}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                            completedExercises.includes(ex.id)
                              ? "bg-primary text-primary-foreground"
                              : index === currentExercise
                              ? "bg-primary/20 text-primary"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {completedExercises.includes(ex.id)
                            ? <CheckCircle className="h-4 w-4" />
                            : index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{exData?.title || "Exercice"}</p>
                          <p className="text-xs text-muted-foreground">
                            {exData?.zone} • {exData?.duration_sec}s
                          </p>
                        </div>
                      </div>
                      {index === currentExercise && (
                        <Play className="h-4 w-4 text-primary" />
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
