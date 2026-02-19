import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Play, CheckCircle, ArrowRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Layout } from "@/components/layout/Layout";
import { toast } from "@/hooks/use-toast";
import { ExerciseTimer } from "@/components/ExerciseTimer";
import { getProgramById, getProgramExercises, placeholderThumb } from "@/data/mockContent";
import { addSessionHistoryItem } from "@/lib/localSessionStore";

const isYoutubeEmbed = (value: string) => value.includes("youtube");

export default function Session() {
  const { programId } = useParams<{ programId: string }>();
  const navigate = useNavigate();

  const program = useMemo(() => (programId ? getProgramById(programId) : null), [programId]);
  const exercises = useMemo(() => (programId ? getProgramExercises(programId) : []), [programId]);

  const [currentExercise, setCurrentExercise] = useState(0);
  const [completedExercises, setCompletedExercises] = useState<string[]>([]);

  if (!program || exercises.length === 0) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-6">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-2xl font-heading font-bold mb-4">Programme introuvable</h1>
            <p className="text-muted-foreground mb-6">
              Le programme demande n'existe pas ou ne contient aucun exercice.
            </p>
            <Button onClick={() => navigate("/timer")}>Retour aux programmes</Button>
          </div>
        </div>
      </Layout>
    );
  }

  const progress = (completedExercises.length / exercises.length) * 100;
  const currentEx = exercises[currentExercise];
  const isCurrentCompleted = currentEx ? completedExercises.includes(currentEx.id) : false;
  const canGoNext = isCurrentCompleted && currentExercise < exercises.length - 1;
  const canFinish = completedExercises.length === exercises.length;

  const handleCompleteExercise = () => {
    if (!currentEx) return;
    if (!completedExercises.includes(currentEx.id)) {
      setCompletedExercises((prev) => [...prev, currentEx.id]);
      toast({
        title: "Exercice termine",
        description: `${currentEx.title} complete avec succes.`,
      });
    }
  };

  const handleNextExercise = () => {
    if (currentExercise < exercises.length - 1) {
      setCurrentExercise((value) => value + 1);
    }
  };

  const handleFinishSession = () => {
    const totalMinutes = Math.ceil(exercises.reduce((sum, ex) => sum + ex.duration_sec, 0) / 60);

    addSessionHistoryItem({
      duration_minutes: totalMinutes,
      completed: true,
    });

    toast({
      title: "Seance terminee",
      description: "Votre seance locale a ete enregistree.",
    });

    navigate("/timer");
  };

  const handleRestart = () => {
    setCurrentExercise(0);
    setCompletedExercises([]);
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-heading font-bold text-primary">{program.title}</h1>
            <p className="text-muted-foreground">{program.description}</p>
          </div>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">
                  Exercice {currentExercise + 1} sur {exercises.length}
                </span>
                <span className="text-sm text-muted-foreground">
                  {completedExercises.length}/{exercises.length} termines
                </span>
              </div>
              <Progress value={progress} className="h-2" />
            </CardContent>
          </Card>

          {currentEx && (
            <Card className={isCurrentCompleted ? "border-primary bg-primary/5" : ""}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-heading">{currentEx.title}</CardTitle>
                    <CardDescription>
                      Zone: {currentEx.zone} • {currentEx.duration_sec}s
                    </CardDescription>
                  </div>
                  {isCurrentCompleted && <CheckCircle className="h-6 w-6 text-primary" />}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <img
                  src={currentEx.thumb_url || placeholderThumb}
                  alt={currentEx.title}
                  className="w-full h-48 object-cover rounded-lg"
                />

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Description</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">{currentEx.description_public}</p>
                  </div>

                  {currentEx.notes_kine && (
                    <div>
                      <h4 className="font-medium mb-2">Tips kine</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">{currentEx.notes_kine}</p>
                    </div>
                  )}
                </div>

                {currentEx.media_primary && (
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">Video de demonstration</h4>
                    <div className="w-full max-w-md mx-auto rounded-lg overflow-hidden bg-black/5">
                      {isYoutubeEmbed(currentEx.media_primary) ? (
                        <iframe
                          src={currentEx.media_primary}
                          title={currentEx.title}
                          className="w-full aspect-video"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          referrerPolicy="strict-origin-when-cross-origin"
                          allowFullScreen
                        />
                      ) : (
                        <video
                          src={currentEx.media_primary}
                          autoPlay
                          loop
                          muted
                          playsInline
                          controls
                          className="w-full"
                          preload="metadata"
                        />
                      )}
                    </div>
                  </div>
                )}

                <div className="mt-4">
                  <ExerciseTimer
                    durationSec={currentEx.duration_sec}
                    onComplete={() => {
                      toast({
                        title: "Timer termine",
                        description: `Temps d'exercice ecoule pour ${currentEx.title}.`,
                      });
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-4 justify-center">
            {!isCurrentCompleted ? (
              <Button
                onClick={handleCompleteExercise}
                size="lg"
                className="bg-primary hover:bg-primary-dark text-primary-foreground"
              >
                <CheckCircle className="mr-2 h-5 w-5" />
                Marquer comme termine
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
                Terminer la seance
              </Button>
            ) : null}

            <Button onClick={handleRestart} variant="outline" size="lg">
              <RotateCcw className="mr-2 h-4 w-4" />
              Recommencer
            </Button>
          </div>

          <Card className="bg-secondary/30">
            <CardHeader>
              <CardTitle className="text-lg">Exercices de cette seance</CardTitle>
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
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                          completedExercises.includes(exercise.id)
                            ? "bg-primary text-primary-foreground"
                            : index === currentExercise
                            ? "bg-primary/20 text-primary"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {completedExercises.includes(exercise.id) ? <CheckCircle className="h-4 w-4" /> : index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{exercise.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {exercise.zone} • {exercise.duration_sec}s
                        </p>
                      </div>
                    </div>
                    {index === currentExercise && <Play className="h-4 w-4 text-primary" />}
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
