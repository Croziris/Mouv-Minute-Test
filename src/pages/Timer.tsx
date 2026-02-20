import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Play, Pause, RotateCcw, CheckCircle, Clock, Bell, BellOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Layout } from "@/components/layout/Layout";
import { toast } from "@/hooks/use-toast";
import { usePWA } from "@/hooks/usePWA";
import { ExerciseTimer } from "@/components/ExerciseTimer";
import { programService, exerciseService, sessionService, Exercise, Program } from "@/lib/pocketbase";
import { useAuth } from "@/contexts/AuthContext";
import { buildYouTubeEmbedUrl } from "@/lib/youtube";

type TimerState = "stopped" | "running" | "paused" | "break";

export default function Timer() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [duration, setDuration] = useState(45);
  const [state, setState] = useState<TimerState>("stopped");
  const [timeLeft, setTimeLeft] = useState(duration * 60);
  const [breakExercises, setBreakExercises] = useState<Exercise[]>([]);
  const [completedExercises, setCompletedExercises] = useState<string[]>([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loadingPrograms, setLoadingPrograms] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const {
    supportsNotifications,
    notificationPermission,
    requestNotificationPermission,
    showLocalNotification,
  } = usePWA();

  // Charger les programmes depuis PocketBase
  useEffect(() => {
    const load = async () => {
      try {
        setLoadingPrograms(true);
        const data = await programService.getAll();
        setPrograms(data);
      } catch (err) {
        console.error("Erreur chargement programmes:", err);
      } finally {
        setLoadingPrograms(false);
      }
    };
    load();
  }, []);

  // Restaurer préférence notifications
  useEffect(() => {
    const saved = localStorage.getItem("notifications-enabled");
    if (saved === "true" && notificationPermission === "granted") {
      setNotificationsEnabled(true);
    }
  }, [notificationPermission]);

  // Countdown timer
  useEffect(() => {
    if (state !== "running") return;
    const interval = window.setInterval(async () => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Charger des exercices aléatoires depuis PocketBase
          exerciseService.getAll().then((allExercises) => {
            const shuffled = [...allExercises].sort(() => Math.random() - 0.5);
            setBreakExercises(shuffled.slice(0, 5));
            setCompletedExercises([]);
          });

          setState("break");

          if (notificationsEnabled && notificationPermission === "granted") {
            showLocalNotification("Mouv'Minute - Temps de pause ! 🧘", {
              body: "C'est l'heure de faire quelques exercices.",
              tag: "break-reminder",
              requireInteraction: true,
            });
          }

          toast({
            title: "Temps de pause !",
            description: "Prenez quelques minutes pour vous étirer.",
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [state, notificationsEnabled, notificationPermission, showLocalNotification]);

  // Reset timeLeft quand durée change à l'arrêt
  useEffect(() => {
    if (state === "stopped") setTimeLeft(duration * 60);
  }, [duration, state]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const toggleTimer = async () => {
    if (state === "running") { setState("paused"); return; }
    if (state === "paused") { setState("running"); return; }

    setBreakExercises([]);
    setCompletedExercises([]);
    setTimeLeft(duration * 60);
    setState("running");

    // Démarrer une session PocketBase si connecté
    if (user) {
      try {
        const session = await sessionService.start(duration);
        setSessionId(session.id);
      } catch (err) {
        console.error("Erreur création session:", err);
      }
    }

    toast({
      title: "Session démarrée ▶️",
      description: `Session de ${duration} minutes commencée.`,
    });
  };

  const resetTimer = () => {
    setState("stopped");
    setBreakExercises([]);
    setCompletedExercises([]);
    setTimeLeft(duration * 60);
    setSessionId(null);
  };

  const markExerciseCompleted = (exerciseId: string) => {
    setCompletedExercises((prev) =>
      prev.includes(exerciseId) ? prev : [...prev, exerciseId]
    );
  };

  const completeSession = async () => {
    try {
      if (sessionId) await sessionService.end(sessionId);
      toast({
        title: "Séance validée 🎉",
        description: "Votre session a été enregistrée dans PocketBase.",
      });
    } catch (err) {
      console.error("Erreur fin de session:", err);
    }
    resetTimer();
  };

  const handleNotificationToggle = async (enabled: boolean) => {
    if (enabled && notificationPermission !== "granted") {
      const granted = await requestNotificationPermission();
      if (granted) {
        setNotificationsEnabled(true);
        localStorage.setItem("notifications-enabled", "true");
      }
      return;
    }
    setNotificationsEnabled(enabled);
    localStorage.setItem("notifications-enabled", enabled.toString());
  };

  const progress = ((duration * 60 - timeLeft) / Math.max(1, duration * 60)) * 100;
  const allExercisesCompleted =
    breakExercises.length > 0 &&
    breakExercises.every((ex) => completedExercises.includes(ex.id));

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6">
        {state !== "break" ? (
          <div className="max-w-md mx-auto space-y-8">

            {/* Titre */}
            <div className="text-center space-y-4">
              <h1 className="text-2xl font-heading font-bold">Session de travail</h1>
              <p className="text-muted-foreground">
                Concentrez-vous sur votre travail. Nous vous préviendrons quand il sera temps de faire une pause.
              </p>
            </div>

            {/* Timer circulaire */}
            <Card className="text-center">
              <CardContent className="p-8">
                <div className="relative mb-6">
                  <div className="mx-auto h-48 w-48 rounded-full border-8 border-secondary flex items-center justify-center relative overflow-hidden">
                    <div
                      className="absolute inset-0 rounded-full transition-all duration-1000"
                      style={{
                        background: `conic-gradient(hsl(var(--primary)) ${
                          Math.max(0, Math.min(100, progress)) * 3.6
                        }deg, transparent 0deg)`,
                      }}
                    />
                    <div className="relative z-20 text-center">
                      <div
                        className="text-3xl font-heading font-bold transition-colors duration-300"
                        style={{ color: state === "running" ? "#E67E22" : "hsl(var(--primary))" }}
                      >
                        {state === "stopped" ? formatTime(duration * 60) : formatTime(timeLeft)}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {state === "stopped" && "Prêt à commencer"}
                        {state === "running" && "En cours..."}
                        {state === "paused" && "En pause"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sélection durée */}
                {state === "stopped" && (
                  <div className="space-y-4 mb-6">
                    <div className="flex gap-2 justify-center">
                      {[30, 45, 60].map((minutes) => (
                        <Button
                          key={minutes}
                          variant={duration === minutes ? "default" : "outline"}
                          size="sm"
                          onClick={() => setDuration(minutes)}
                        >
                          {minutes} min
                        </Button>
                      ))}
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground text-center">
                        Durée personnalisée : {duration} minutes
                      </div>
                      <Slider
                        value={[duration]}
                        onValueChange={(v) => setDuration(v[0])}
                        min={5}
                        max={60}
                        step={5}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>5 min</span>
                        <span>60 min</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Boutons timer */}
                <div className="flex gap-4 justify-center">
                  <Button
                    onClick={toggleTimer}
                    size="lg"
                    className={
                      state === "running"
                        ? "bg-accent hover:bg-accent-light text-accent-foreground"
                        : "bg-primary hover:bg-primary-dark text-primary-foreground"
                    }
                  >
                    {state === "running" ? (
                      <><Pause className="mr-2 h-5 w-5" />Pause</>
                    ) : (
                      <><Play className="mr-2 h-5 w-5" />{state === "stopped" ? "Démarrer" : "Reprendre"}</>
                    )}
                  </Button>
                  {state !== "stopped" && (
                    <Button onClick={resetTimer} variant="outline" size="lg">
                      <RotateCcw className="mr-2 h-4 w-4" />Reset
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Conseil durée */}
            <Card className="bg-secondary/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Durée recommandée</p>
                    <p className="text-xs text-muted-foreground">
                      30 à 45 minutes de travail, puis 5 minutes d'exercices
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notifications */}
            {supportsNotifications && (
              <Card className="bg-accent/10 border-accent/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {notificationsEnabled
                        ? <Bell className="h-5 w-5 text-accent" />
                        : <BellOff className="h-5 w-5 text-muted-foreground" />}
                      <div>
                        <p className="text-sm font-medium">Notifications de rappel</p>
                        <p className="text-xs text-muted-foreground">
                          Recevoir des alertes à la fin des sessions.
                        </p>
                      </div>
                    </div>
                    <Switch checked={notificationsEnabled} onCheckedChange={handleNotificationToggle} />
                  </div>
                  {notificationPermission === "denied" && (
                    <div className="mt-3 p-2 bg-destructive/10 rounded-md">
                      <p className="text-xs text-destructive">
                        Notifications bloquées. Réactivez-les dans les paramètres de votre navigateur.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Programmes PocketBase */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-heading">Programmes de séances</CardTitle>
                <CardDescription>
                  Séances prédéfinies de 3 à 5 exercices que vous pouvez lancer à tout moment.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingPrograms ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : programs.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Aucun programme disponible pour le moment.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {programs.map((program) => (
                      <Card
                        key={program.id}
                        className="cursor-pointer hover:shadow-soft transition-shadow border-muted hover:border-primary/50"
                        onClick={() => navigate(`/session/${program.id}`)}
                      >
                        <CardContent className="p-4">
                          <h3 className="font-medium text-base mb-2 text-primary">{program.title}</h3>
                          {program.description && (
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {program.description}
                            </p>
                          )}
                          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                            <span>3–5 exercices</span>
                            <span>•</span>
                            <span>~5 minutes</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

        ) : (
          /* Mode PAUSE */
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-heading font-bold text-accent">C'est l'heure de la pause 🧘</h1>
              <p className="text-muted-foreground">Prenez quelques minutes pour vous étirer et vous détendre.</p>
            </div>

            {breakExercises.length > 0 ? (
              <div className="space-y-4">
                {breakExercises.map((exercise) => {
                  const embedUrl = buildYouTubeEmbedUrl(exercise.youtube_id);
                  return (
                  <Card
                    key={exercise.id}
                    className={completedExercises.includes(exercise.id)
                      ? "border-primary bg-primary/5"
                      : "hover:shadow-soft transition-shadow"}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg font-heading">{exercise.title}</CardTitle>
                          <CardDescription>
                            Zone : {exercise.zone} • {exercise.duration_sec}s
                          </CardDescription>
                        </div>
                        {completedExercises.includes(exercise.id) ? (
                          <CheckCircle className="h-6 w-6 text-primary" />
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => markExerciseCompleted(exercise.id)}
                            className="bg-primary hover:bg-primary-dark text-primary-foreground"
                          >
                            Terminé
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {embedUrl ? (
                        <div className="rounded-lg overflow-hidden bg-black/5">
                          <iframe
                            src={embedUrl}
                            title={exercise.title}
                            className="w-full aspect-video"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                      ) : exercise.thumb_url ? (
                        <img
                          src={exercise.thumb_url}
                          alt={exercise.title}
                          className="w-full h-40 object-cover rounded-lg"
                        />
                      ) : null}

                      <div className="grid gap-4">
                        <div>
                          <h4 className="font-medium mb-2">Description</h4>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {exercise.description_public || "Aucune description."}
                          </p>
                        </div>
                        {exercise.notes_kine && (
                          <div>
                            <h4 className="font-medium mb-2">Tips kiné</h4>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {exercise.notes_kine}
                            </p>
                          </div>
                        )}
                      </div>

                      <ExerciseTimer
                        durationSec={exercise.duration_sec}
                        onComplete={() => {
                          toast({
                            title: "Timer terminé ⏱️",
                            description: `Temps écoulé pour ${exercise.title}.`,
                          });
                        }}
                      />
                    </CardContent>
                  </Card>
                  );
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto mb-2" />
                  <p className="text-muted-foreground">Chargement des exercices...</p>
                </CardContent>
              </Card>
            )}

            <div className="flex gap-4 justify-center">
              <Button
                onClick={completeSession}
                disabled={!allExercisesCompleted}
                size="lg"
                className="bg-accent hover:bg-accent-light text-accent-foreground disabled:opacity-50"
              >
                <CheckCircle className="mr-2 h-5 w-5" />
                Valider la séance
              </Button>
              <Button onClick={resetTimer} variant="outline" size="lg">
                Nouvelle session
              </Button>
            </div>

            {!allExercisesCompleted && (
              <p className="text-center text-sm text-muted-foreground">
                Terminez tous les exercices pour valider votre séance
              </p>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
