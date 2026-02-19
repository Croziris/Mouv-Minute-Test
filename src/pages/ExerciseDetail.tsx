import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Layout } from "@/components/layout/Layout";
import { ExerciseTimer } from "@/components/ExerciseTimer";
import { toast } from "@/hooks/use-toast";
import { getExerciseById, placeholderThumb } from "@/data/mockContent";

const zoneConfig = {
  nuque: { label: "Nuque", color: "bg-primary/10 text-primary" },
  bras: { label: "Bras", color: "bg-accent/10 text-accent" },
  "bas du dos": { label: "Bas du dos", color: "bg-primary/15 text-primary" },
  "haut du dos": { label: "Haut du dos", color: "bg-accent/15 text-accent" },
  autre: { label: "Autre", color: "bg-primary/20 text-primary" },
  jambes: { label: "Jambes", color: "bg-accent/20 text-accent" },
} as const;

const isYoutubeEmbed = (value: string) => value.includes("youtube");

export default function ExerciseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const exercise = useMemo(() => (id ? getExerciseById(id) : null), [id]);
  const [videoPlaying, setVideoPlaying] = useState(true);

  if (!exercise) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-6 text-center">
          <p className="text-muted-foreground">Exercice non trouve</p>
          <Button onClick={() => navigate("/exercises")} className="mt-4">
            Retour aux exercices
          </Button>
        </div>
      </Layout>
    );
  }

  const config = zoneConfig[exercise.zone as keyof typeof zoneConfig];

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
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-3">
              <h1 className="text-2xl font-heading font-bold">{exercise.title}</h1>
              <Badge className={config.color}>{config.label}</Badge>
            </div>

            <div className="flex items-center justify-center gap-4 text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span className="text-sm">{exercise.duration_sec} secondes</span>
              </div>
            </div>
          </div>

          <Card>
            <CardContent
              className="p-0"
              style={{
                backgroundImage: `url(${placeholderThumb})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
              }}
            >
              <div className="relative aspect-[9/16] max-h-[70vh] rounded-lg overflow-hidden mx-auto bg-black/5">
                {exercise.media_primary ? (
                  isYoutubeEmbed(exercise.media_primary) ? (
                    <iframe
                      src={exercise.media_primary}
                      title={exercise.title}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      referrerPolicy="strict-origin-when-cross-origin"
                      allowFullScreen
                    />
                  ) : (
                    <video
                      src={exercise.media_primary}
                      autoPlay={videoPlaying}
                      loop
                      muted
                      playsInline
                      className="w-full h-full object-contain"
                      onClick={() => setVideoPlaying(!videoPlaying)}
                    />
                  )
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center">
                      <Play className="h-16 w-16 text-primary/60 mx-auto mb-4" />
                      <p className="text-muted-foreground">Video de demonstration a venir</p>
                    </div>
                  </div>
                )}

                {exercise.media_primary && !isYoutubeEmbed(exercise.media_primary) && (
                  <div className="absolute bottom-4 right-4">
                    <Button
                      size="sm"
                      onClick={() => setVideoPlaying(!videoPlaying)}
                      className="bg-black/50 hover:bg-black/70 text-white"
                    >
                      {videoPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-heading">Description de l'exercice</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">{exercise.description_public}</p>
              </CardContent>
            </Card>

            {exercise.notes_kine && (
              <Card className="bg-secondary/30">
                <CardHeader>
                  <CardTitle className="text-lg font-heading">Tips kine</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">{exercise.notes_kine}</p>
                </CardContent>
              </Card>
            )}
          </div>

          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-6">
              <ExerciseTimer
                durationSec={exercise.duration_sec}
                onComplete={() => {
                  toast({
                    title: "Exercice termine",
                    description: `Bravo, vous avez termine ${exercise.title}.`,
                  });
                }}
              />
            </CardContent>
          </Card>

          <div className="flex gap-4 justify-center">
            <Button
              onClick={() => navigate("/timer")}
              className="bg-accent hover:bg-accent-light text-accent-foreground"
              size="lg"
            >
              Demarrer une session
            </Button>
            <Button variant="outline" onClick={() => navigate("/exercises")} size="lg">
              Autres exercices
            </Button>
          </div>

          <Card className="bg-destructive/5 border-destructive/20">
            <CardContent className="p-4">
              <p className="text-sm text-center">
                <strong>Important:</strong> Realisez cet exercice lentement et sans forcer. En cas de douleur,
                arretez immediatement et consultez un professionnel de sante.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
