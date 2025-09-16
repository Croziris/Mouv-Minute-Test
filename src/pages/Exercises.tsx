import { useState, useEffect } from "react";
import { Clock, Play, Lock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/layout/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface Exercise {
  id: string;
  title: string;
  zone: string;
  duration_sec: number;
  description_public: string;
  notes_kine: string | null;
  thumb_url: string | null;
  media_primary: string | null;
}

const zoneConfig = {
  nuque: { label: "Nuque", color: "bg-primary/10 text-primary" },
  bras: { label: "Bras", color: "bg-accent/10 text-accent" },
  "bas du dos": { label: "Bas du dos", color: "bg-primary/15 text-primary" },
  "haut du dos": { label: "Haut du dos", color: "bg-accent/15 text-accent" },
  autre: { label: "Autre", color: "bg-primary/20 text-primary" },
  jambes: { label: "Jambes", color: "bg-accent/20 text-accent" },
};

export default function Exercises() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);

  useEffect(() => {
    loadExercises();
  }, []);

  const loadExercises = async () => {
    try {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .order('zone', { ascending: true });

      if (error) throw error;
      setExercises(data || []);
    } catch (error) {
      console.error('Error loading exercises:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredExercises = selectedZone
    ? exercises.filter(exercise => exercise.zone === selectedZone)
    : exercises;

  const groupedExercises = filteredExercises.reduce((acc, exercise) => {
    if (!acc[exercise.zone]) {
      acc[exercise.zone] = [];
    }
    acc[exercise.zone].push(exercise);
    return acc;
  }, {} as Record<string, Exercise[]>);

  const zones = Object.keys(zoneConfig);

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-6">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-heading font-bold">Banque d'exercices</h1>
          <p className="text-muted-foreground">
            Découvrez des exercices adaptés à votre zone de tension
          </p>
        </div>

        {/* Filtres par zone */}
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
            const config = zoneConfig[zone as keyof typeof zoneConfig];
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

        {/* Exercices groupés par zone */}
        <div className="space-y-8">
          {Object.entries(groupedExercises).map(([zone, zoneExercises]) => {
            const config = zoneConfig[zone as keyof typeof zoneConfig];
            return (
              <section key={zone} className="space-y-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-heading font-semibold">
                    {config.label}
                  </h2>
                  <Badge className={config.color}>
                    {zoneExercises.length} exercice{zoneExercises.length > 1 ? 's' : ''}
                  </Badge>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {zoneExercises.map((exercise) => (
                    <Card 
                      key={exercise.id} 
                      className="hover:shadow-soft transition-all duration-300 cursor-pointer hover:bg-secondary/30"
                      onClick={() => navigate(`/exercises/${exercise.id}`)}
                    >
                      <CardHeader className="pb-3">
                        {/* Placeholder pour la miniature */}
                        <div 
                          className="relative h-32 rounded-lg mb-3 flex items-center justify-center"
                          style={{
                            backgroundImage: 'url(https://vblqvkqkmdmlcxxphwks.supabase.co/storage/v1/object/public/Icone%20autre/Miniature%20encadree%20sans%20titre.png)',
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            backgroundRepeat: 'no-repeat'
                          }}
                        >
                          {exercise.thumb_url ? (
                            <img 
                              src={exercise.thumb_url} 
                              alt={exercise.title}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <div className="text-center">
                              <Play className="h-8 w-8 text-primary/60 mx-auto mb-2" />
                              <p className="text-xs text-muted-foreground">
                                Vidéo de démonstration
                              </p>
                            </div>
                          )}
                        </div>

                        <CardTitle className="text-lg font-heading line-clamp-2">
                          {exercise.title}
                        </CardTitle>
                        
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <CardDescription className="text-sm">
                            {exercise.duration_sec} secondes
                          </CardDescription>
                        </div>
                      </CardHeader>

                      <CardContent>
                        <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                          {exercise.description_public}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        {filteredExercises.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">
                Aucun exercice trouvé pour cette zone.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Note informative */}
        <Card className="bg-secondary/30">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground text-center">
              💡 <strong>Conseil :</strong> Réalisez ces exercices lentement et écoutez votre corps. 
              En cas de douleur inhabituelle, arrêtez l'exercice et pensez à consulter un professionnel de santé.
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}