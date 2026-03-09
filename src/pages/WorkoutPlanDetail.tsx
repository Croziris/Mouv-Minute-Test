import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Clock, Loader2, Lock, Stethoscope } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { ExerciseTimer } from "@/components/ExerciseTimer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { WorkoutPlan, WorkoutPlanExercise, sessionService, workoutPlanService } from "@/lib/pocketbase";
import { buildYouTubeEmbedUrl } from "@/lib/youtube";

interface WorkoutPlanDetailLocationState {
  plan?: WorkoutPlan;
}

interface WorkoutPlanRouteParams {
  planId?: string;
  id?: string;
}

const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds} secondes`;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  if (remaining === 0) return `${minutes} minute${minutes > 1 ? "s" : ""}`;
  return `${minutes} min ${remaining}s`;
};

export default function WorkoutPlanDetail() {
  const params = useParams<WorkoutPlanRouteParams>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [planExercises, setPlanExercises] = useState<WorkoutPlanExercise[]>([]);
  const [isLoadingPlan, setIsLoadingPlan] = useState(true);
  const [isLoadingExercises, setIsLoadingExercises] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [isFinishing, setIsFinishing] = useState(false);

  const locationState = location.state as WorkoutPlanDetailLocationState | null;
  const fallbackPlan = locationState?.plan ?? null;
  const routePlanId = params.planId ?? params.id ?? null;
  const effectivePlanId = routePlanId ?? fallbackPlan?.id ?? null;

  const loadPlan = useCallback(async () => {
    if (!effectivePlanId) {
      setIsLoadingPlan(false);
      setIsLoadingExercises(false);
      return;
    }

    setIsLoadingPlan(true);
    setIsLoadingExercises(true);

    let resolvedPlan: WorkoutPlan | null =
      fallbackPlan && fallbackPlan.id === effectivePlanId ? fallbackPlan : null;

    if (!resolvedPlan) {
      try {
        resolvedPlan = await workoutPlanService.getById(effectivePlanId);
      } catch (error) {
        console.warn("Workout plan getById failed, trying fallback lookup:", error);
      }
    }

    if (!resolvedPlan) {
      try {
        const plans = await workoutPlanService.getAll();
        resolvedPlan = plans.find((item) => item.id === effectivePlanId) ?? null;
      } catch (error) {
        console.warn("Workout plan getAll fallback failed:", error);
      }
    }

    if (!resolvedPlan) {
      toast({
        title: "Erreur",
        description: "Séance introuvable.",
        variant: "destructive",
      });
      setPlan(null);
      setPlanExercises([]);
      setIsLoadingPlan(false);
      setIsLoadingExercises(false);
      return;
    }

    setPlan(resolvedPlan);
    setIsLoadingPlan(false);

    try {
      const exercisesData = await workoutPlanService.getExercises(effectivePlanId);
      setPlanExercises(exercisesData);
      setCurrentStep(0);
    } catch (error) {
      console.error("Error loading workout plan exercises:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les exercices de cette séance.",
        variant: "destructive",
      });
      setPlanExercises([]);
    } finally {
      setIsLoadingExercises(false);
    }
  }, [effectivePlanId, fallbackPlan]);

  useEffect(() => {
    void loadPlan();
  }, [loadPlan]);

  useEffect(() => {
    if (planExercises.length === 0) {
      setCurrentStep(0);
      return;
    }
    if (currentStep > planExercises.length - 1) {
      setCurrentStep(planExercises.length - 1);
    }
  }, [currentStep, planExercises.length]);

  const totalDurationSec = useMemo(
    () => planExercises.reduce((total, entry) => total + (entry.expand?.exercise?.duration_sec ?? 0), 0),
    [planExercises],
  );

  const handleFinish = useCallback(async () => {
    try {
      setIsFinishing(true);
      if (user) {
        const durationMinutes = Math.max(1, Math.ceil(totalDurationSec / 60));
        const session = await sessionService.start(durationMinutes);
        await sessionService.end(session.id);
      }

      toast({
        title: "Séance terminée",
        description: "Bravo pour votre progression.",
      });
      navigate("/session");
    } catch (error) {
      console.error("Error finishing workout plan:", error);
      toast({
        title: "Erreur",
        description: "Impossible de valider la séance.",
        variant: "destructive",
      });
    } finally {
      setIsFinishing(false);
    }
  }, [navigate, totalDurationSec, user]);

  return (
    <Layout>
      <div className="container mx-auto space-y-6 px-4 py-6">
        <Button variant="outline" onClick={() => navigate("/session")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>

        {isLoadingPlan ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Chargement de la séance...</p>
            </CardContent>
          </Card>
        ) : !plan ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">Séance introuvable.</CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl font-heading">{plan.title}</CardTitle>
                <CardDescription>
                  {plan.description || "Suivez chaque exercice dans l'ordre pour terminer la séance."}
                </CardDescription>
              </CardHeader>
            </Card>

            {isLoadingExercises ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Chargement des exercices...</p>
                </CardContent>
              </Card>
            ) : planExercises.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-sm text-muted-foreground">
                  Aucun exercice dans cette séance.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {planExercises.map((entry, index) => {
                  const exercise = entry.expand?.exercise;
                  const title = exercise?.title || "Exercice indisponible";

                  if (index < currentStep) {
                    return (
                      <Card key={entry.id} className="bg-green-50 opacity-60">
                        <CardContent className="flex items-center gap-2 py-3">
                          <CheckCircle2 className="h-4 w-4 text-green-700" />
                          <p className="text-sm line-through">{title}</p>
                        </CardContent>
                      </Card>
                    );
                  }

                  if (index > currentStep) {
                    return (
                      <Card key={entry.id} className="cursor-not-allowed opacity-40">
                        <CardContent className="flex items-center justify-between py-3">
                          <p className="text-sm">{title}</p>
                          <Lock className="h-4 w-4 text-muted-foreground" />
                        </CardContent>
                      </Card>
                    );
                  }

                  const embedUrl = exercise ? buildYouTubeEmbedUrl(exercise.youtube_id) : null;
                  const isLast = index === planExercises.length - 1;
                  const zones = exercise?.zones ?? [];

                  return (
                    <Card key={entry.id} className="border-primary/40">
                      <CardHeader>
                        <CardTitle className="text-xl">{title}</CardTitle>
                        <CardDescription className="flex flex-wrap items-center gap-3">
                          <span>
                            Etape {index + 1}/{planExercises.length}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {exercise ? formatDuration(exercise.duration_sec) : "--"}
                          </span>
                        </CardDescription>
                        {zones.length > 0 ? (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {zones.map((zone) => (
                              <Badge key={`${entry.id}-${zone}`} variant="secondary">
                                {zone}
                              </Badge>
                            ))}
                          </div>
                        ) : null}
                      </CardHeader>

                      <CardContent className="space-y-4">
                        {embedUrl ? (
                          <div className="overflow-hidden rounded-lg bg-black/5">
                            <iframe
                              src={embedUrl}
                              title={title}
                              className="aspect-video w-full"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          </div>
                        ) : null}

                        <div className="space-y-1">
                          <h3 className="font-medium">Description</h3>
                          <p className="text-sm text-muted-foreground">{exercise?.description_public || "--"}</p>
                        </div>

                        <div className="rounded-md border bg-secondary/20 p-3">
                          <p className="mb-1 inline-flex items-center gap-1 text-sm font-medium">
                            <Stethoscope className="h-4 w-4" />
                            Conseil kiné
                          </p>
                          <p className="text-sm text-muted-foreground">{exercise?.notes_kine || "--"}</p>
                        </div>

                        <ExerciseTimer
                          durationSec={exercise?.duration_sec ?? 0}
                          onComplete={() => {
                            toast({
                              title: "Exercice terminé",
                              description: `${title} est terminé.`,
                            });
                          }}
                        />

                        {!isLast ? (
                          <Button onClick={() => setCurrentStep((prev) => prev + 1)}>Exercice suivant -&gt;</Button>
                        ) : (
                          <Button
                            onClick={() => void handleFinish()}
                            disabled={isFinishing}
                            className="bg-primary hover:bg-primary-dark text-primary-foreground"
                          >
                            {isFinishing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Terminer la séance
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
