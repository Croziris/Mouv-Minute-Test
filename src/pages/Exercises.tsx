import { useMemo, useState } from "react";
import { Clock, Play } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/layout/Layout";
import { useNavigate } from "react-router-dom";
import { Exercise, getExercises, placeholderThumb } from "@/data/mockContent";

const zoneConfig = {
  nuque: { label: "Nuque", color: "bg-primary/10 text-primary" },
  bras: { label: "Bras", color: "bg-accent/10 text-accent" },
  "bas du dos": { label: "Bas du dos", color: "bg-primary/15 text-primary" },
  "haut du dos": { label: "Haut du dos", color: "bg-accent/15 text-accent" },
  autre: { label: "Autre", color: "bg-primary/20 text-primary" },
  jambes: { label: "Jambes", color: "bg-accent/20 text-accent" },
} as const;

export default function Exercises() {
  const navigate = useNavigate();
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const exercises = useMemo(() => getExercises(), []);

  const filteredExercises = selectedZone
    ? exercises.filter((exercise) => exercise.zone === selectedZone)
    : exercises;

  const groupedExercises = filteredExercises.reduce((acc, exercise) => {
    if (!acc[exercise.zone]) {
      acc[exercise.zone] = [];
    }
    acc[exercise.zone].push(exercise);
    return acc;
  }, {} as Record<string, Exercise[]>);

  const zones = Object.keys(zoneConfig);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-heading font-bold">Banque d'exercices</h1>
          <p className="text-muted-foreground">Decouvrez des exercices adaptes a votre zone de tension</p>
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

        <div className="space-y-8">
          {Object.entries(groupedExercises).map(([zone, zoneExercises]) => {
            const config = zoneConfig[zone as keyof typeof zoneConfig];
            return (
              <section key={zone} className="space-y-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-heading font-semibold">{config.label}</h2>
                  <Badge className={config.color}>
                    {zoneExercises.length} exercice{zoneExercises.length > 1 ? "s" : ""}
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
                        <div
                          className="relative h-32 rounded-lg mb-3 flex items-center justify-center"
                          style={{
                            backgroundImage: `url(${placeholderThumb})`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                            backgroundRepeat: "no-repeat",
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
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        {filteredExercises.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">Aucun exercice trouve pour cette zone.</p>
            </CardContent>
          </Card>
        )}

        <Card className="bg-secondary/30">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground text-center">
              <strong>Conseil:</strong> Realisez ces exercices lentement et ecoutez votre corps. En cas de
              douleur inhabituelle, arretez l'exercice et consultez un professionnel de sante.
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
