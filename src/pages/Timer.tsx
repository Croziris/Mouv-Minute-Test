import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Play, Pause, RotateCcw, CheckCircle, Clock, Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Layout } from "@/components/layout/Layout";
import { toast } from "@/hooks/use-toast";
import { usePWA } from "@/hooks/usePWA";
import { ExerciseTimer } from "@/components/ExerciseTimer";
import { Exercise, getPrograms, getRandomExercises } from "@/data/mockContent";
import { addSessionHistoryItem } from "@/lib/localSessionStore";

type TimerState = "stopped" | "running" | "paused" | "break";

const isYoutubeEmbed = (value: string) => value.includes("youtube");

export default function Timer() {
  const navigate = useNavigate();
  const [duration, setDuration] = useState(45);
  const [state, setState] = useState<TimerState>("stopped");
  const [timeLeft, setTimeLeft] = useState(duration * 60);
  const [breakExercises, setBreakExercises] = useState<Exercise[]>([]);
  const [completedExercises, setCompletedExercises] = useState<string[]>([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  const programs = useMemo(() => getPrograms(), []);

  const { supportsNotifications, notificationPermission, requestNotificationPermission, showLocalNotification } =
    usePWA();

  useEffect(() => {
    if (state !== "running") return;

    const interval = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          const selectedExercises = getRandomExercises(5);
          setBreakExercises(selectedExercises);
          setCompletedExercises([]);
          setState("break");

          if (notificationsEnabled && notificationPermission === "granted") {
            showLocalNotification("Mouv'Minute - Temps de pause", {
              body: "C'est l'heure de faire quelques exercices.",
              tag: "break-reminder",
              requireInteraction: true,
            });
          }

          toast({
            title: "Temps de pause",
            description: "Prenez quelques minutes pour vous etirer avec nos exercices.",
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [state, notificationsEnabled, notificationPermission, showLocalNotification]);

  useEffect(() => {
    if (state === "stopped") {
      setTimeLeft(duration * 60);
    }
  }, [duration, state]);

  useEffect(() => {
    const savedNotificationState = localStorage.getItem("notifications-enabled");
    if (savedNotificationState === "true" && notificationPermission === "granted") {
      setNotificationsEnabled(true);
    }
  }, [notificationPermission]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const toggleTimer = () => {
    if (state === "running") {
      setState("paused");
      return;
    }
    if (state === "paused") {
      setState("running");
      return;
    }

    setBreakExercises([]);
    setCompletedExercises([]);
    setTimeLeft(duration * 60);
    setState("running");
    toast({
      title: "Session demarree",
      description: `Session de ${duration} minutes commencee.`,
    });
  };

  const resetTimer = () => {
    setState("stopped");
    setBreakExercises([]);
    setCompletedExercises([]);
    setTimeLeft(duration * 60);
  };

  const handleDurationChange = (newDuration: number) => {
    if (state === "stopped") {
      setDuration(newDuration);
    }
  };

  const markExerciseCompleted = (exerciseId: string) => {
    setCompletedExercises((prev) => (prev.includes(exerciseId) ? prev : [...prev, exerciseId]));
  };

  const completeSession = () => {
    addSessionHistoryItem({
      duration_minutes: duration,
      completed: true,
    });

    toast({
      title: "Seance validee",
      description: "Votre session locale a ete enregistree.",
    });

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
    breakExercises.length > 0 && breakExercises.every((exercise) => completedExercises.includes(exercise.id));

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6">
        {state !== "break" ? (
          <div className="max-w-md mx-auto space-y-8">
            <div className="text-center space-y-4">
              <h1 className="text-2xl font-heading font-bold">Session de travail</h1>
              <p className="text-muted-foreground">
                Concentrez-vous sur votre travail. Nous vous previendrons quand il sera temps de faire une
                pause.
              </p>
            </div>

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
                        style={{
                          color: state === "running" ? "#E67E22" : "hsl(var(--primary))",
                        }}
                      >
                        {state === "stopped" ? formatTime(duration * 60) : formatTime(timeLeft)}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {state === "stopped" && "Pret a commencer"}
                        {state === "running" && "En cours..."}
                        {state === "paused" && "En pause"}
                      </div>
                    </div>
                  </div>
                </div>

                {state === "stopped" && (
                  <div className="space-y-4 mb-6">
                    <div className="flex gap-2 justify-center">
                      {[30, 45, 60].map((minutes) => (
                        <Button
                          key={minutes}
                          variant={duration === minutes ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleDurationChange(minutes)}
                        >
                          {minutes} min
                        </Button>
                      ))}
                    </div>

                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground text-center">
                        Duree personnalisee: {duration} minutes
                      </div>
                      <Slider
                        value={[duration]}
                        onValueChange={(value) => handleDurationChange(value[0])}
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
                      <>
                        <Pause className="mr-2 h-5 w-5" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-5 w-5" />
                        {state === "stopped" ? "Demarrer" : "Reprendre"}
                      </>
                    )}
                  </Button>

                  {state !== "stopped" && (
                    <Button onClick={resetTimer} variant="outline" size="lg">
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Reset
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-secondary/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Duree recommandee</p>
                    <p className="text-xs text-muted-foreground">
                      30 a 45 minutes de travail, puis 5 minutes d'exercices
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {supportsNotifications && (
              <Card className="bg-accent/10 border-accent/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {notificationsEnabled ? (
                        <Bell className="h-5 w-5 text-accent" />
                      ) : (
                        <BellOff className="h-5 w-5 text-muted-foreground" />
                      )}
                      <div>
                        <p className="text-sm font-medium">Notifications de rappel</p>
                        <p className="text-xs text-muted-foreground">
                          Recevoir des alertes a la fin des sessions.
                        </p>
                      </div>
                    </div>
                    <Switch checked={notificationsEnabled} onCheckedChange={handleNotificationToggle} />
                  </div>

                  {notificationPermission === "denied" && (
                    <div className="mt-3 p-2 bg-destructive/10 rounded-md">
                      <p className="text-xs text-destructive">
                        Notifications bloquees. Reactivez-les dans les parametres de votre navigateur.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-heading">Programmes de seances</CardTitle>
                <CardDescription>
                  Seances predefinies de 3 a 5 exercices que vous pouvez lancer a tout moment.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {programs.map((program) => (
                    <Card
                      key={program.id}
                      className="cursor-pointer hover:shadow-soft transition-shadow border-muted hover:border-primary/50"
                      onClick={() => navigate(`/session/${program.id}`)}
                    >
                      <CardContent className="p-4">
                        <h3 className="font-medium text-base mb-2 text-primary">{program.title}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">{program.description}</p>
                        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                          <span>3-5 exercices</span>
                          <span>•</span>
                          <span>~5 minutes</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-heading font-bold text-accent">C'est l'heure de la pause</h1>
              <p className="text-muted-foreground">Prenez quelques minutes pour vous etirer et vous detendre.</p>
            </div>

            {breakExercises.length > 0 ? (
              <div className="space-y-4">
                {breakExercises.map((exercise) => (
                  <Card
                    key={exercise.id}
                    className={
                      completedExercises.includes(exercise.id)
                        ? "border-primary bg-primary/5"
                        : "hover:shadow-soft transition-shadow"
                    }
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg font-heading">{exercise.title}</CardTitle>
                          <CardDescription className="text-sm">
                            Zone: {exercise.zone} • {exercise.duration_sec}s
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
                            Termine
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {exercise.media_primary && (
                        <div className="rounded-lg overflow-hidden bg-black/5">
                          {isYoutubeEmbed(exercise.media_primary) ? (
                            <iframe
                              src={exercise.media_primary}
                              title={exercise.title}
                              className="w-full aspect-video"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                              referrerPolicy="strict-origin-when-cross-origin"
                              allowFullScreen
                            />
                          ) : (
                            <video src={exercise.media_primary} autoPlay loop muted playsInline className="w-full" />
                          )}
                        </div>
                      )}

                      <div className="grid gap-4">
                        <div>
                          <h4 className="font-medium mb-2">Description</h4>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {exercise.description_public}
                          </p>
                        </div>

                        {exercise.notes_kine && (
                          <div>
                            <h4 className="font-medium mb-2">Tips kine</h4>
                            <p className="text-sm text-muted-foreground leading-relaxed">{exercise.notes_kine}</p>
                          </div>
                        )}
                      </div>

                      <div className="mt-4">
                        <ExerciseTimer
                          durationSec={exercise.duration_sec}
                          onComplete={() => {
                            toast({
                              title: "Timer termine",
                              description: `Temps d'exercice ecoule pour ${exercise.title}.`,
                            });
                          }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">Aucun exercice disponible pour le moment.</p>
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
                Valider la seance
              </Button>

              <Button onClick={resetTimer} variant="outline" size="lg">
                Nouvelle session
              </Button>
            </div>

            {!allExercisesCompleted && (
              <p className="text-center text-sm text-muted-foreground">
                Terminez tous les exercices pour valider votre seance
              </p>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
