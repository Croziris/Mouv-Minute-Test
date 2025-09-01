import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Layout } from "@/components/layout/Layout";
import { supabase } from "@/integrations/supabase/client";

interface Exercise {
  id: string;
  title: string;
  zone: string;
  duration_sec: number;
  description_public: string;
  notes_kine: string;
  thumb_url: string | null;
  media_primary: string | null;
}

const zoneConfig = {
  nuque: { label: "Nuque", color: "bg-primary/10 text-primary" },
  epaules: { label: "Épaules", color: "bg-accent/10 text-accent" },
  dos: { label: "Dos", color: "bg-primary/15 text-primary" },
  trapezes: { label: "Trapèzes", color: "bg-accent/15 text-accent" },
  tronc: { label: "Tronc", color: "bg-primary/20 text-primary" },
  jambes: { label: "Jambes", color: "bg-accent/20 text-accent" },
};

export default function ExerciseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [loading, setLoading] = useState(true);
  const [videoPlaying, setVideoPlaying] = useState(true);

  useEffect(() => {
    if (id) {
      loadExercise(id);
    }
  }, [id]);

  const loadExercise = async (exerciseId: string) => {
    try {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .eq('id', exerciseId)
        .single();

      if (error) throw error;
      setExercise(data);
    } catch (error) {
      console.error('Error loading exercise:', error);
      navigate('/exercises');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-64 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!exercise) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-6 text-center">
          <p className="text-muted-foreground">Exercice non trouvé</p>
          <Button onClick={() => navigate('/exercises')} className="mt-4">
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
        {/* Header avec retour */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/exercises')}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </div>

        {/* Contenu principal */}
        <div className="max-w-4xl mx-auto space-y-6">
          {/* En-tête de l'exercice */}
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-3">
              <h1 className="text-2xl font-heading font-bold">
                {exercise.title}
              </h1>
              <Badge className={config.color}>
                {config.label}
              </Badge>
            </div>

            <div className="flex items-center justify-center gap-4 text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span className="text-sm">{exercise.duration_sec} secondes</span>
              </div>
            </div>
          </div>

          {/* Vidéo ou placeholder */}
          <Card>
            <CardContent className="p-0">
              <div className="relative aspect-video bg-gradient-nature rounded-lg overflow-hidden">
                {exercise.media_primary ? (
                  <video
                    src={exercise.media_primary}
                    autoPlay={videoPlaying}
                    loop
                    muted
                    className="w-full h-full object-cover"
                    onClick={() => setVideoPlaying(!videoPlaying)}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center">
                      <Play className="h-16 w-16 text-primary/60 mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        Vidéo de démonstration à venir
                      </p>
                    </div>
                  </div>
                )}

                {exercise.media_primary && (
                  <div className="absolute bottom-4 right-4">
                    <Button
                      size="sm"
                      onClick={() => setVideoPlaying(!videoPlaying)}
                      className="bg-black/50 hover:bg-black/70 text-white"
                    >
                      {videoPlaying ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Description */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-heading">
                  Description de l'exercice
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  {exercise.description_public}
                </p>
              </CardContent>
            </Card>

            {exercise.notes_kine && (
              <Card className="bg-secondary/30">
                <CardHeader>
                  <CardTitle className="text-lg font-heading flex items-center gap-2">
                    💡 Conseils du kinésithérapeute
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    {exercise.notes_kine}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-4 justify-center">
            <Button
              onClick={() => navigate('/timer')}
              className="bg-accent hover:bg-accent-light text-accent-foreground"
              size="lg"
            >
              Démarrer une session
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/exercises')}
              size="lg"
            >
              Autres exercices
            </Button>
          </div>

          {/* Note de sécurité */}
          <Card className="bg-destructive/5 border-destructive/20">
            <CardContent className="p-4">
              <p className="text-sm text-center">
                ⚠️ <strong>Important :</strong> Réalisez cet exercice lentement et sans forcer. 
                Si vous ressentez une douleur, arrêtez immédiatement et consultez un professionnel de santé.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}