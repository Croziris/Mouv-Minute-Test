import { useCallback, useEffect, useState } from "react";
import { Clock, Loader2, Play, Plus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/layout/Layout";
import { useNavigate } from "react-router-dom";
import { exerciseService, Exercise } from "@/lib/pocketbase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { ExerciseAdminPanel } from "@/components/exercises/ExerciseAdminPanel";
import { ExerciseZone, zoneConfig } from "@/components/exercises/exerciseConfig";
import { buildYouTubeThumbnailUrl } from "@/lib/youtube";

export default function Exercises() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [selectedZone, setSelectedZone] = useState<ExerciseZone | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminOpen, setAdminOpen] = useState(false);

  const zones = Object.keys(zoneConfig) as ExerciseZone[];
  const isAbortError = (error: unknown) => Boolean((error as { isAbort?: boolean })?.isAbort);

  const loadExercises = useCallback(async () => {
    try {
      setLoading(true);
      const data = await exerciseService.getAll(selectedZone || undefined);
      setExercises(data);
    } catch (error) {
      if (isAbortError(error)) return;
      console.error("Error loading exercises:", error);
      const status = (error as { status?: number })?.status;
      toast({
        title: "Erreur",
        description:
          status === 403
            ? "Acces refuse. Verifie la regle List/Search de la collection exercises."
            : "Impossible de charger les exercices.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [selectedZone]);

  useEffect(() => {
    void loadExercises();
  }, [loadExercises]);

  const groupedExercises = exercises.reduce((acc, exercise) => {
    if (!acc[exercise.zone]) acc[exercise.zone] = [];
    acc[exercise.zone].push(exercise);
    return acc;
  }, {} as Record<string, Exercise[]>);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex items-start gap-3">
          <div className="flex-1 text-center space-y-2">
            <h1 className="text-2xl font-heading font-bold">Banque d'exercices</h1>
            <p className="text-muted-foreground">Decouvrez des exercices adaptes a votre zone de tension</p>
          </div>
          {isAdmin && (
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={() => setAdminOpen(true)}
              title="Panel admin exercices"
              aria-label="Ouvrir le panel admin des exercices"
            >
              <Plus className="h-5 w-5" />
            </Button>
          )}
        </div>

        <div className="flex flex-wrap gap-2 justify-center">
          <Button
            variant={selectedZone === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedZone(null)}
            className="rounded-full"
          >
            Toutes les zones
          </Button>
          {zones.map((zone) => {
            const config = zoneConfig[zone];
            return (
              <Button
                key={zone}
                variant={selectedZone === zone ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedZone(zone)}
                className="rounded-full"
              >
                {config.label}
              </Button>
            );
          })}
        </div>

        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {!loading && (
          <div className="space-y-8">
            {Object.entries(groupedExercises).map(([zone, zoneExercises]) => {
              const config = zoneConfig[zone as ExerciseZone];
              return (
                <section key={zone} className="space-y-4">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-heading font-semibold">{config?.label ?? zone}</h2>
                    <Badge className={config?.color}>
                      {zoneExercises.length} exercice{zoneExercises.length > 1 ? "s" : ""}
                    </Badge>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {zoneExercises.map((exercise) => {
                      const fallbackThumb = buildYouTubeThumbnailUrl(exercise.youtube_id);
                      return (
                        <Card
                          key={exercise.id}
                          className="hover:shadow-soft transition-all duration-300 cursor-pointer hover:bg-secondary/30"
                          onClick={() => navigate(`/exercises/${exercise.id}`)}
                        >
                          <CardHeader className="pb-3">
                            <div className="relative h-32 rounded-lg mb-3 flex items-center justify-center bg-secondary/30">
                              {exercise.thumb_url ? (
                                <img
                                  src={exercise.thumb_url}
                                  alt={exercise.title}
                                  className="w-full h-full object-cover rounded-lg"
                                />
                              ) : fallbackThumb ? (
                                <img
                                  src={fallbackThumb}
                                  alt={exercise.title}
                                  className="w-full h-full object-cover rounded-lg"
                                />
                              ) : (
                                <div className="text-center">
                                  <Play className="h-8 w-8 text-primary/60 mx-auto mb-2" />
                                  <p className="text-xs text-muted-foreground">Video de demonstration</p>
                                </div>
                              )}
                            </div>

                            <CardTitle className="text-lg font-heading line-clamp-2">{exercise.title}</CardTitle>

                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <CardDescription className="text-sm">{exercise.duration_sec} secondes</CardDescription>
                            </div>
                          </CardHeader>

                          <CardContent>
                            <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                              {exercise.description_public}
                            </p>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}

        {!loading && exercises.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center space-y-2">
              <p className="text-muted-foreground font-medium">Aucun exercice disponible.</p>
              <p className="text-sm text-muted-foreground">Les exercices seront ajoutes depuis le panel admin.</p>
            </CardContent>
          </Card>
        )}

        <Card className="bg-secondary/30">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground text-center">
              <strong>Conseil:</strong> Realisez ces exercices lentement et ecoutez votre corps. En cas de douleur
              inhabituelle, arretez et consultez un professionnel de sante.
            </p>
          </CardContent>
        </Card>
      </div>

      <ExerciseAdminPanel
        open={adminOpen}
        onOpenChange={setAdminOpen}
        isAdmin={isAdmin}
        onExercisesChanged={loadExercises}
      />
    </Layout>
  );
}
