import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, Play, Pause, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Layout } from "@/components/layout/Layout";
import { ExerciseTimer } from "@/components/ExerciseTimer";
import { toast } from "@/hooks/use-toast";
import { exerciseService, Exercise } from "@/lib/pocketbase";
import { buildYouTubeEmbedUrl } from "@/lib/youtube";

const zoneConfig = {
  nuque:    { label: "Nuque",    color: "bg-primary/10 text-primary" },
  epaules:  { label: "Épaules",  color: "bg-accent/10 text-accent" },
  dos:      { label: "Dos",      color: "bg-primary/15 text-primary" },
  trapezes: { label: "Trapèzes", color: "bg-accent/15 text-accent" },
  tronc:    { label: "Tronc",    color: "bg-primary/20 text-primary" },
  jambes:   { label: "Jambes",   color: "bg-accent/20 text-accent" },
  general:  { label: "Général",  color: "bg-secondary text-secondary-foreground" },
} as const;

export default function ExerciseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [loading, setLoading] = useState(true);
  const [videoPlaying, setVideoPlaying] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetch = async () => {
      try {
        setLoading(true);
        const data = await exerciseService.getById(id);
        setExercise(data);
      } catch (err) {
        console.error("Exercice non trouvé:", err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!exercise) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-6 text-center space-y-4">
          <p className="text-muted-foreground">Exercice non trouvé</p>
          <Button onClick={() => navigate("/exercises")}>
            Retour aux exercices
          </Button>
        </div>
      </Layout>
    );
  }

  const config = zoneConfig[exercise.zone as keyof typeof zoneConfig];

  const youtubeEmbed = buildYouTubeEmbedUrl(exercise.youtube_id);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/exercises")}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </div>

        <div className="max-w-4xl mx-auto space-y-6">
          {/* Titre + Badge */}
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-3">
              <h1 className="text-2xl font-heading font-bold">{exercise.title}</h1>
              {config && <Badge className={config.color}>{config.label}</Badge>}
            </div>
            <div className="flex items-center justify-center gap-4 text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span className="text-sm">{exercise.duration_sec} secondes</span>
              </div>
            </div>
          </div>

          {/* Vidéo */}
          <Card>
            <CardContent className="p-0">
              <div className="relative aspect-[9/16] max-h-[70vh] rounded-lg overflow-hidden mx-auto bg-black/5">
                {youtubeEmbed ? (
                  <iframe
                    src={youtubeEmbed}
                    title={exercise.title}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : exercise.thumb_url ? (
                  <img
                    src={exercise.thumb_url}
                    alt={exercise.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center">
                      <Play className="h-16 w-16 text-primary/60 mx-auto mb-4" />
                      <p className="text-muted-foreground">Vidéo de démonstration à venir</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Description + Tips */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-heading">Description de l'exercice</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  {exercise.description_public || "Aucune description disponible."}
                </p>
              </CardContent>
            </Card>

            {exercise.notes_kine && (
              <Card className="bg-secondary/30">
                <CardHeader>
                  <CardTitle className="text-lg font-heading">Tips kiné</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">{exercise.notes_kine}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Timer exercice */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-6">
              <ExerciseTimer
                durationSec={exercise.duration_sec}
                onComplete={() => {
                  toast({
                    title: "Exercice terminé !",
                    description: `Bravo, vous avez terminé "${exercise.title}".`,
                  });
                }}
              />
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-4 justify-center">
            <Button
              onClick={() => navigate("/timer")}
              className="bg-accent hover:bg-accent-light text-accent-foreground"
              size="lg"
            >
              Démarrer une session
            </Button>
            <Button variant="outline" onClick={() => navigate("/exercises")} size="lg">
              Autres exercices
            </Button>
          </div>

          {/* Avertissement */}
          <Card className="bg-destructive/5 border-destructive/20">
            <CardContent className="p-4">
              <p className="text-sm text-center">
                <strong>Important :</strong> Réalisez cet exercice lentement et sans forcer.
                En cas de douleur, arrêtez immédiatement et consultez un professionnel de santé.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
