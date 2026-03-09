import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  BellOff,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Loader2,
  Lock,
  Pause,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Settings,
  Trash2,
} from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { ExerciseTimer } from "@/components/ExerciseTimer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { usePWA } from "@/hooks/usePWA";
import { toast } from "@/hooks/use-toast";
import {
  Exercise,
  WorkoutPlan,
  WorkoutPlanExercise,
  exerciseService,
  sessionService,
  workoutPlanService,
} from "@/lib/pocketbase";
import { buildYouTubeEmbedUrl } from "@/lib/youtube";

type TimerState = "stopped" | "running" | "paused" | "break";
type BreakTab = "random" | "free";
type AdminTab = "plans" | "plan-exercises";
type EditingPlanId = string | "new" | null;

interface PlanFormState {
  title: string;
  description: string;
  order_index: string;
}

interface StepItem {
  id: string;
  key: string;
  title: string;
  durationSec: number;
  youtubeId: string;
  description: string;
}

const EMPTY_PLAN_FORM: PlanFormState = {
  title: "",
  description: "",
  order_index: "0",
};

const sortPlans = (plans: WorkoutPlan[]) => [...plans].sort((a, b) => a.order_index - b.order_index);
const sortPlanExercises = (entries: WorkoutPlanExercise[]) =>
  [...entries].sort((a, b) => a.order_index - b.order_index);

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return remaining > 0 ? `${minutes}min ${remaining}s` : `${minutes}min`;
};

const toYoutubeThumbnail = (youtubeId: string): string =>
  `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;

const isAdminTab = (value: string): value is AdminTab => value === "plans" || value === "plan-exercises";
const isBreakTab = (value: string): value is BreakTab => value === "random" || value === "free";

const shuffleArray = <T,>(items: T[]): T[] => {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
  }
  return copy;
};

const toPlanStepItem = (entry: WorkoutPlanExercise): StepItem => {
  const exercise = entry.expand?.exercise;
  return {
    id: exercise?.id ?? entry.exercise,
    key: entry.id,
    title: exercise?.title || "Exercice indisponible",
    durationSec: exercise?.duration_sec ?? 0,
    youtubeId: exercise?.youtube_id ?? "",
    description: exercise?.description_public || "Aucune description.",
  };
};

const toExerciseStepItem = (exercise: Exercise): StepItem => ({
  id: exercise.id,
  key: exercise.id,
  title: exercise.title,
  durationSec: exercise.duration_sec,
  youtubeId: exercise.youtube_id,
  description: exercise.description_public || "Aucune description.",
});

export default function Session() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const {
    supportsNotifications,
    notificationPermission,
    requestNotificationPermission,
    showLocalNotification,
  } = usePWA();

  const [duration, setDuration] = useState(45);
  const [timeLeft, setTimeLeft] = useState(duration * 60);
  const [timerState, setTimerState] = useState<TimerState>("stopped");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const isCompletingRef = useRef(false);

  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);

  const [breakExercises, setBreakExercises] = useState<Exercise[]>([]);
  const [isLoadingBreakExercises, setIsLoadingBreakExercises] = useState(false);
  const [randomBreakPlan, setRandomBreakPlan] = useState<WorkoutPlan | null>(null);
  const [breakPlanExercises, setBreakPlanExercises] = useState<WorkoutPlanExercise[]>([]);
  const [isLoadingBreakPlan, setIsLoadingBreakPlan] = useState(false);
  const [currentBreakStep, setCurrentBreakStep] = useState(0);
  const [breakTab, setBreakTab] = useState<BreakTab>("random");
  const [completedExercises, setCompletedExercises] = useState<string[]>([]);

  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  const [adminOpen, setAdminOpen] = useState(false);
  const [adminTab, setAdminTab] = useState<AdminTab>("plans");
  const [editingPlanId, setEditingPlanId] = useState<EditingPlanId>(null);
  const [planForm, setPlanForm] = useState<PlanFormState>(EMPTY_PLAN_FORM);
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null);

  const [selectedAdminPlanId, setSelectedAdminPlanId] = useState("");
  const [adminPlanExercises, setAdminPlanExercises] = useState<WorkoutPlanExercise[]>([]);
  const [isLoadingAdminExercises, setIsLoadingAdminExercises] = useState(false);
  const [isSavingPlanExercise, setIsSavingPlanExercise] = useState(false);
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [isLoadingAllExercises, setIsLoadingAllExercises] = useState(false);
  const [selectedExerciseIdToAdd, setSelectedExerciseIdToAdd] = useState("");
  const [newExerciseOrderIndex, setNewExerciseOrderIndex] = useState("0");

  const loadPlans = useCallback(async () => {
    try {
      setIsLoadingPlans(true);
      const data = await workoutPlanService.getAll();
      const sorted = sortPlans(data);
      setPlans(sorted);

      setSelectedAdminPlanId((prev) => {
        if (sorted.length === 0) return "";
        if (!prev || !sorted.some((plan) => plan.id === prev)) return sorted[0].id;
        return prev;
      });
    } catch (error) {
      console.error("Error loading workout plans:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les seances.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingPlans(false);
    }
  }, []);

  const loadAdminPlanExercises = useCallback(async (planId: string) => {
    if (!planId) {
      setAdminPlanExercises([]);
      return;
    }

    try {
      setIsLoadingAdminExercises(true);
      const data = await workoutPlanService.getExercises(planId);
      const sorted = sortPlanExercises(data);
      setAdminPlanExercises(sorted);

      const nextOrder = sorted.reduce((max, entry) => Math.max(max, entry.order_index), -1) + 1;
      setNewExerciseOrderIndex(String(nextOrder));
    } catch (error) {
      console.error("Error loading admin plan exercises:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les exercices de la seance selectionnee.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingAdminExercises(false);
    }
  }, []);

  const loadAllExercises = useCallback(async () => {
    try {
      setIsLoadingAllExercises(true);
      const data = await exerciseService.getAll();
      setAllExercises([...data].sort((a, b) => a.title.localeCompare(b.title)));
    } catch (error) {
      console.error("Error loading exercises:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger la liste des exercices.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingAllExercises(false);
    }
  }, []);

  const resetTimer = useCallback(() => {
    isCompletingRef.current = false;
    setTimerState("stopped");
    setTimeLeft(duration * 60);
    setBreakExercises([]);
    setRandomBreakPlan(null);
    setBreakPlanExercises([]);
    setCurrentBreakStep(0);
    setBreakTab("random");
    setCompletedExercises([]);
    setSessionId(null);
  }, [duration]);

  const markExerciseCompleted = useCallback((exerciseId: string) => {
    setCompletedExercises((prev) => (prev.includes(exerciseId) ? prev : [...prev, exerciseId]));
  }, []);

  const handleNotificationToggle = useCallback(
    async (enabled: boolean) => {
      if (enabled) {
        if (notificationPermission !== "granted") {
          const granted = await requestNotificationPermission();
          if (!granted) {
            setNotificationsEnabled(false);
            localStorage.setItem("notifications-enabled", "false");
            return;
          }
        }

        setNotificationsEnabled(true);
        localStorage.setItem("notifications-enabled", "true");
        return;
      }

      setNotificationsEnabled(false);
      localStorage.setItem("notifications-enabled", "false");
    },
    [notificationPermission, requestNotificationPermission],
  );

  const handleTimerComplete = useCallback(async () => {
    if (isCompletingRef.current) return;
    isCompletingRef.current = true;

    setIsLoadingBreakExercises(true);
    setIsLoadingBreakPlan(true);

    try {
      const [allExercises, allPlans] = await Promise.all([
        exerciseService.getAll(),
        workoutPlanService.getAll(),
      ]);

      const randomExercises = shuffleArray(allExercises).slice(0, 4);
      setBreakExercises(randomExercises);
      setCompletedExercises([]);
      setCurrentBreakStep(0);
      setBreakTab("random");

      if (allPlans.length > 0) {
        const randomPlan = allPlans[Math.floor(Math.random() * allPlans.length)];
        try {
          const planEntries = sortPlanExercises(await workoutPlanService.getExercises(randomPlan.id));
          if (planEntries.length > 0) {
            setRandomBreakPlan(randomPlan);
            setBreakPlanExercises(planEntries);
          } else {
            setRandomBreakPlan(null);
            setBreakPlanExercises([]);
          }
        } catch (error) {
          console.error("Error loading random break plan exercises:", error);
          toast({
            title: "Erreur",
            description: "Impossible de charger la seance aleatoire.",
            variant: "destructive",
          });
          setRandomBreakPlan(null);
          setBreakPlanExercises([]);
        }
      } else {
        setRandomBreakPlan(null);
        setBreakPlanExercises([]);
      }

      setTimerState("break");

      if (notificationsEnabled && notificationPermission === "granted") {
        showLocalNotification("Mouv'Minute (pause active)", {
          body: "C'est l'heure de bouger !",
          tag: "break-reminder",
          requireInteraction: true,
        });
      }

      toast({
        title: "Temps de pause !",
        description: "C'est l'heure de bouger.",
      });
    } catch (error) {
      console.error("Error preparing break mode:", error);
      toast({
        title: "Erreur",
        description: "Impossible de preparer la pause active.",
        variant: "destructive",
      });
      setBreakExercises([]);
      setRandomBreakPlan(null);
      setBreakPlanExercises([]);
      setTimerState("break");
    } finally {
      setIsLoadingBreakExercises(false);
      setIsLoadingBreakPlan(false);
      isCompletingRef.current = false;
    }
  }, [notificationPermission, notificationsEnabled, showLocalNotification]);

  const toggleTimer = useCallback(async () => {
    if (timerState === "running") {
      setTimerState("paused");
      return;
    }

    if (timerState === "paused") {
      setTimerState("running");
      return;
    }

    isCompletingRef.current = false;
    setBreakExercises([]);
    setRandomBreakPlan(null);
    setBreakPlanExercises([]);
    setCurrentBreakStep(0);
    setBreakTab("random");
    setCompletedExercises([]);
    setTimeLeft(duration * 60);
    setTimerState("running");

    if (user) {
      try {
        const session = await sessionService.start(duration);
        setSessionId(session.id);
      } catch (error) {
        console.error("Error starting session:", error);
        toast({
          title: "Erreur",
          description: "Impossible de demarrer la session.",
          variant: "destructive",
        });
      }
    }
  }, [duration, timerState, user]);

  const completeSession = useCallback(async () => {
    try {
      if (sessionId) {
        await sessionService.end(sessionId);
      }
      toast({
        title: "Séance validée",
        description: "Bravo, votre session est terminee.",
      });
      resetTimer();
    } catch (error) {
      console.error("Error completing session:", error);
      toast({
        title: "Erreur",
        description: "Impossible de valider la session.",
        variant: "destructive",
      });
    }
  }, [resetTimer, sessionId]);

  useEffect(() => {
    void loadPlans();
  }, [loadPlans]);

  useEffect(() => {
    if (!adminOpen || !isAdmin) return;
    void loadPlans();
    void loadAllExercises();
  }, [adminOpen, isAdmin, loadAllExercises, loadPlans]);

  useEffect(() => {
    if (!adminOpen || !isAdmin) return;
    if (!selectedAdminPlanId) {
      setAdminPlanExercises([]);
      return;
    }
    void loadAdminPlanExercises(selectedAdminPlanId);
  }, [adminOpen, isAdmin, selectedAdminPlanId, loadAdminPlanExercises]);

  useEffect(() => {
    const saved = localStorage.getItem("notifications-enabled");
    setNotificationsEnabled(saved === "true" && notificationPermission === "granted");
  }, [notificationPermission]);

  useEffect(() => {
    if (timerState !== "running") return;

    const interval = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(interval);
          void handleTimerComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [handleTimerComplete, timerState]);

  useEffect(() => {
    if (timerState === "stopped") {
      setTimeLeft(duration * 60);
    }
  }, [duration, timerState]);

  const availableExercisesForSelectedPlan = useMemo(() => {
    const existingExerciseIds = new Set(adminPlanExercises.map((entry) => entry.exercise));
    return allExercises.filter((exercise) => !existingExerciseIds.has(exercise.id));
  }, [adminPlanExercises, allExercises]);

  useEffect(() => {
    if (availableExercisesForSelectedPlan.length === 0) {
      setSelectedExerciseIdToAdd("");
      return;
    }
    setSelectedExerciseIdToAdd((prev) => {
      if (prev && availableExercisesForSelectedPlan.some((exercise) => exercise.id === prev)) return prev;
      return availableExercisesForSelectedPlan[0].id;
    });
  }, [availableExercisesForSelectedPlan]);

  const hasBreakPlan = randomBreakPlan !== null && breakPlanExercises.length > 0;
  const isBreakPlanFinished = hasBreakPlan && currentBreakStep >= breakPlanExercises.length;
  const isFallbackRandomFinished =
    !hasBreakPlan && breakExercises.length > 0 && currentBreakStep >= breakExercises.length;
  const isValidationDisabled =
    (hasBreakPlan && !isBreakPlanFinished) ||
    (breakTab === "free" && completedExercises.length === 0) ||
    (!hasBreakPlan && breakTab === "random" && !isFallbackRandomFinished);

  useEffect(() => {
    const stepsCount = hasBreakPlan ? breakPlanExercises.length : breakExercises.length;
    if (stepsCount === 0) {
      setCurrentBreakStep(0);
      return;
    }
    if (currentBreakStep > stepsCount) {
      setCurrentBreakStep(stepsCount);
    }
  }, [breakExercises.length, breakPlanExercises.length, currentBreakStep, hasBreakPlan]);

  const startCreatePlan = () => {
    const maxOrder = plans.reduce((max, plan) => Math.max(max, plan.order_index), -1);
    setPlanForm({ title: "", description: "", order_index: String(maxOrder + 1) });
    setEditingPlanId("new");
  };

  const startEditPlan = (plan: WorkoutPlan) => {
    setPlanForm({ title: plan.title, description: plan.description || "", order_index: String(plan.order_index) });
    setEditingPlanId(plan.id);
  };

  const cancelPlanEdition = () => {
    setEditingPlanId(null);
    setPlanForm(EMPTY_PLAN_FORM);
  };

  const savePlan = async () => {
    const title = planForm.title.trim();
    const orderIndex = Number(planForm.order_index);

    if (!title) {
      toast({ title: "Champ requis", description: "Le titre est obligatoire.", variant: "destructive" });
      return;
    }

    if (!Number.isFinite(orderIndex) || orderIndex < 0) {
      toast({
        title: "Ordre invalide",
        description: "L'ordre doit etre un nombre positif ou nul.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSavingPlan(true);
      const payload = {
        title,
        description: planForm.description.trim(),
        order_index: Math.floor(orderIndex),
      };

      if (editingPlanId === "new") {
        await workoutPlanService.create(payload);
      } else if (editingPlanId) {
        await workoutPlanService.update(editingPlanId, payload);
      } else {
        return;
      }

      toast({ title: "Seance enregistree", description: "Les modifications ont ete sauvegardees." });
      await loadPlans();
      setEditingPlanId(null);
      setPlanForm(EMPTY_PLAN_FORM);
    } catch (error) {
      console.error("Error saving workout plan:", error);
      toast({ title: "Erreur", description: "Impossible d'enregistrer la seance.", variant: "destructive" });
    } finally {
      setIsSavingPlan(false);
    }
  };

  const deletePlan = async (plan: WorkoutPlan) => {
    const confirmed = window.confirm(`Supprimer la seance "${plan.title}" ?`);
    if (!confirmed) return;

    try {
      setDeletingPlanId(plan.id);
      await workoutPlanService.remove(plan.id);
      toast({ title: "Seance supprimee", description: "La seance a ete retiree." });
      if (selectedAdminPlanId === plan.id) setAdminPlanExercises([]);
      if (editingPlanId === plan.id) cancelPlanEdition();

      await loadPlans();
    } catch (error) {
      console.error("Error deleting workout plan:", error);
      toast({ title: "Erreur", description: "Impossible de supprimer la seance.", variant: "destructive" });
    } finally {
      setDeletingPlanId(null);
    }
  };

  const reorderPlanExercise = async (entry: WorkoutPlanExercise, direction: "up" | "down") => {
    if (!selectedAdminPlanId) return;
    const newOrderIndex = direction === "up" ? entry.order_index - 1 : entry.order_index + 1;
    if (newOrderIndex < 0) return;

    try {
      setIsSavingPlanExercise(true);
      await workoutPlanService.reorderExercise(entry.id, newOrderIndex);
      await loadAdminPlanExercises(selectedAdminPlanId);
    } catch (error) {
      console.error("Error reordering plan exercise:", error);
      toast({ title: "Erreur", description: "Impossible de reordonner l'exercice.", variant: "destructive" });
    } finally {
      setIsSavingPlanExercise(false);
    }
  };

  const removePlanExercise = async (entryId: string) => {
    if (!selectedAdminPlanId) return;

    try {
      setIsSavingPlanExercise(true);
      await workoutPlanService.removeExercise(entryId);
      await loadAdminPlanExercises(selectedAdminPlanId);
    } catch (error) {
      console.error("Error removing plan exercise:", error);
      toast({ title: "Erreur", description: "Impossible de retirer l'exercice.", variant: "destructive" });
    } finally {
      setIsSavingPlanExercise(false);
    }
  };

  const addExerciseToPlan = async () => {
    if (!selectedAdminPlanId) {
      toast({
        title: "Séance requise",
        description: "Choisissez une seance avant d'ajouter un exercice.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedExerciseIdToAdd) {
      toast({
        title: "Exercice requis",
        description: "Selectionnez un exercice a ajouter.",
        variant: "destructive",
      });
      return;
    }

    const orderIndex = Number(newExerciseOrderIndex);
    if (!Number.isFinite(orderIndex) || orderIndex < 0) {
      toast({
        title: "Position invalide",
        description: "La position doit etre un nombre positif ou nul.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSavingPlanExercise(true);
      await workoutPlanService.addExercise(selectedAdminPlanId, selectedExerciseIdToAdd, Math.floor(orderIndex));
      await loadAdminPlanExercises(selectedAdminPlanId);

      toast({ title: "Exercice ajoute", description: "L'exercice a ete ajoute a la seance." });
    } catch (error) {
      console.error("Error adding exercise to plan:", error);
      toast({ title: "Erreur", description: "Impossible d'ajouter l'exercice a la seance.", variant: "destructive" });
    } finally {
      setIsSavingPlanExercise(false);
    }
  };

  const renderPlanEditor = (mode: "inline" | "create") => (
    <div className="space-y-3 rounded-lg border border-border/80 bg-muted/30 p-4">
      <div className="space-y-2">
        <Label htmlFor={`plan-title-${mode}`}>Titre</Label>
        <Input
          id={`plan-title-${mode}`}
          value={planForm.title}
          onChange={(event) => setPlanForm((prev) => ({ ...prev, title: event.target.value }))}
          placeholder="Nom de la seance"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`plan-description-${mode}`}>Description</Label>
        <Textarea
          id={`plan-description-${mode}`}
          value={planForm.description}
          onChange={(event) => setPlanForm((prev) => ({ ...prev, description: event.target.value }))}
          placeholder="Description courte (optionnel)"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`plan-order-${mode}`}>Ordre</Label>
        <Input
          id={`plan-order-${mode}`}
          type="number"
          min={0}
          value={planForm.order_index}
          onChange={(event) => setPlanForm((prev) => ({ ...prev, order_index: event.target.value }))}
        />
      </div>

      <div className="flex gap-2">
        <Button onClick={() => void savePlan()} disabled={isSavingPlan}>
          {isSavingPlan ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Sauvegarder
        </Button>
        <Button variant="outline" onClick={cancelPlanEdition} disabled={isSavingPlan}>
          Annuler
        </Button>
      </div>
    </div>
  );

  const breakPlanStepItems = useMemo(() => breakPlanExercises.map(toPlanStepItem), [breakPlanExercises]);
  const breakExerciseStepItems = useMemo(() => breakExercises.map(toExerciseStepItem), [breakExercises]);

  const totalDurationSec = duration * 60;
  const displayedTime = timerState === "stopped" ? totalDurationSec : timeLeft;
  const progress = ((totalDurationSec - displayedTime) / Math.max(1, totalDurationSec)) * 100;

  const renderStepCards = (
    items: StepItem[],
    activeStep: number,
    onNext: () => void,
    onFinish: () => void,
  ) => (
    <div className="space-y-3">
      {items.map((item, index) => {
        if (index < activeStep) {
          return (
            <Card key={item.key} className="bg-green-50 opacity-50 transition-all duration-300">
              <CardContent className="flex items-center gap-2 py-3">
                <CheckCircle2 className="h-4 w-4 text-green-700" />
                <p className="text-sm line-through">{item.title}</p>
              </CardContent>
            </Card>
          );
        }

        if (index > activeStep) {
          return (
            <Card key={item.key} className="cursor-not-allowed opacity-40 transition-all duration-300">
              <CardContent className="flex items-center justify-between py-3">
                <p className="text-sm">{item.title}</p>
                <Lock className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          );
        }

        const isLastStep = index === items.length - 1;

        return (
          <Card key={item.key} className="border-primary/40 transition-all duration-300">
            <CardHeader>
              <CardTitle className="text-base">{item.title}</CardTitle>
              <CardDescription>
                Etape {index + 1}/{items.length}
                {item.durationSec > 0 ? ` - ${formatDuration(item.durationSec)}` : ""}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {item.youtubeId ? (
                <div className="overflow-hidden rounded-md bg-secondary/20">
                  <img src={toYoutubeThumbnail(item.youtubeId)} alt={item.title} className="h-48 w-full object-cover" />
                </div>
              ) : null}

              <p className="text-sm text-muted-foreground">{item.description}</p>

              {!isLastStep ? (
                <Button onClick={onNext}>Exercice suivant -&gt;</Button>
              ) : (
                <Button className="bg-primary hover:bg-primary-dark text-primary-foreground" onClick={onFinish}>
                  Terminer la seance
                </Button>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  return (
    <Layout>
      <div className="container mx-auto space-y-6 px-4 py-6">
        {timerState !== "break" ? (
          <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h1 className="text-2xl font-heading font-bold">Session de travail</h1>
                <p className="text-sm text-muted-foreground">Concentrez-vous. Nous vous préviendrons quand bouger.</p>
              </div>

              {isAdmin ? (
                <Button variant="outline" onClick={() => setAdminOpen(true)}>
                  <Settings className="mr-2 h-4 w-4" />
                  ⚙ Gérer les séances
                </Button>
              ) : null}
            </div>

            <div className="mx-auto max-w-md space-y-4">
              <Card className="text-center">
                <CardContent className="p-8">
                  <div className="relative mb-6">
                    <div className="mx-auto relative flex h-48 w-48 items-center justify-center overflow-hidden rounded-full border-8 border-secondary">
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
                          style={{ color: timerState === "running" ? "#E67E22" : "hsl(var(--primary))" }}
                        >
                          {formatTime(displayedTime)}
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground">
                          {timerState === "stopped" && "Prêt à commencer"}
                          {timerState === "running" && "En cours..."}
                          {timerState === "paused" && "En pause"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {timerState === "stopped" ? (
                    <div className="mb-6 space-y-4">
                      <div className="flex justify-center gap-2">
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
                        <div className="text-center text-sm text-muted-foreground">Durée : {duration} minutes</div>
                        <Slider
                          value={[duration]}
                          onValueChange={(value) => {
                            const next = value[0];
                            if (typeof next === "number") setDuration(next);
                          }}
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
                  ) : null}

                  <div className="flex justify-center gap-4">
                    <Button
                      onClick={() => void toggleTimer()}
                      size="lg"
                      className={
                        timerState === "running"
                          ? "bg-accent hover:bg-accent-light text-accent-foreground"
                          : "bg-primary hover:bg-primary-dark text-primary-foreground"
                      }
                    >
                      {timerState === "running" ? (
                        <>
                          <Pause className="mr-2 h-5 w-5" />
                          Pause
                        </>
                      ) : (
                        <>
                          <Play className="mr-2 h-5 w-5" />
                          {timerState === "paused" ? "Reprendre" : "Démarrer"}
                        </>
                      )}
                    </Button>

                    {timerState !== "stopped" ? (
                      <Button onClick={resetTimer} variant="outline" size="lg">
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Reset
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-secondary/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium">Durée recommandée</p>
                      <p className="text-xs text-muted-foreground">30 à 45 min de travail, puis 5 min d'exercices.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {supportsNotifications ? (
                <Card className="border-accent/20 bg-accent/10">
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {notificationsEnabled ? (
                          <Bell className="h-5 w-5 text-accent" />
                        ) : (
                          <BellOff className="h-5 w-5 text-muted-foreground" />
                        )}
                        <div>
                          <p className="text-sm font-medium">Notifications de rappel</p>
                          <p className="text-xs text-muted-foreground">Recevoir une alerte quand le timer arrive à zéro.</p>
                        </div>
                      </div>
                      <Switch checked={notificationsEnabled} onCheckedChange={handleNotificationToggle} />
                    </div>

                    {notificationPermission === "denied" ? (
                      <div className="rounded-md bg-destructive/10 p-2">
                        <p className="text-xs text-destructive">
                          Notifications bloquées. Réactivez-les dans les paramètres de votre navigateur.
                        </p>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              ) : null}
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Séances disponibles</CardTitle>
                <CardDescription>Lancez une séance à tout moment, sans attendre le timer.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoadingPlans ? (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {[0, 1].map((index) => (
                      <Card key={`plan-skeleton-${index}`}>
                        <CardHeader className="space-y-2">
                          <Skeleton className="h-5 w-1/2" />
                          <Skeleton className="h-4 w-3/4" />
                        </CardHeader>
                        <CardContent>
                          <Skeleton className="h-4 w-1/3" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : plans.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="p-6 text-center text-sm text-muted-foreground">
                      Aucune séance disponible
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {plans.map((plan) => (
                        <Card
                          key={plan.id}
                          className="cursor-pointer border-border/70 transition-all duration-300 hover:border-primary/40"
                          onClick={() => navigate(`/session/plans/${plan.id}`, { state: { plan } })}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-1">
                                <p className="font-medium text-primary">{plan.title}</p>
                                <p className="text-sm text-muted-foreground">{plan.description || "Aucune description."}</p>
                                <p className="text-xs text-muted-foreground">3-5 exercices - ~5 min</p>
                              </div>
                              <ChevronDown className="h-5 w-5 text-muted-foreground" />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="mx-auto max-w-4xl space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-heading font-bold text-accent">C'est l'heure de bouger 🧘</h1>
              <p className="text-muted-foreground">Prenez 5 minutes pour ces exercices.</p>
            </div>

            <Tabs
              value={breakTab}
              onValueChange={(value) => {
                if (isBreakTab(value)) setBreakTab(value);
              }}
              className="space-y-4"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="random">Séance aléatoire</TabsTrigger>
                <TabsTrigger value="free">Exercices libres</TabsTrigger>
              </TabsList>

              <TabsContent value="random" className="space-y-4">
                {isLoadingBreakExercises || isLoadingBreakPlan ? (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">Préparation de la pause active...</p>
                    </CardContent>
                  </Card>
                ) : hasBreakPlan ? (
                  <div className="space-y-4">
                    <Card className="border-primary/30">
                      <CardHeader>
                        <CardTitle>{randomBreakPlan?.title}</CardTitle>
                        <CardDescription>{randomBreakPlan?.description || "Séance guidée pendant la pause."}</CardDescription>
                      </CardHeader>
                    </Card>

                    {renderStepCards(
                      breakPlanStepItems,
                      currentBreakStep,
                      () => setCurrentBreakStep((prev) => Math.min(prev + 1, breakPlanStepItems.length)),
                      () => setCurrentBreakStep(breakPlanStepItems.length),
                    )}

                    {isBreakPlanFinished ? (
                      <Card className="border-green-300 bg-green-50">
                        <CardContent className="flex items-center gap-2 p-4 text-sm text-green-800">
                          <CheckCircle2 className="h-4 w-4" />
                          Séance terminée. Vous pouvez valider.
                        </CardContent>
                      </Card>
                    ) : null}
                  </div>
                ) : breakExerciseStepItems.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center text-sm text-muted-foreground">
                      Aucun exercice trouvé pour la pause.
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {renderStepCards(
                      breakExerciseStepItems,
                      currentBreakStep,
                      () => setCurrentBreakStep((prev) => Math.min(prev + 1, breakExerciseStepItems.length)),
                      () => setCurrentBreakStep(breakExerciseStepItems.length),
                    )}

                    {isFallbackRandomFinished ? (
                      <Card className="border-green-300 bg-green-50">
                        <CardContent className="flex items-center gap-2 p-4 text-sm text-green-800">
                          <CheckCircle2 className="h-4 w-4" />
                          Série terminée. Vous pouvez valider.
                        </CardContent>
                      </Card>
                    ) : null}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="free" className="space-y-4">
                {isLoadingBreakExercises ? (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">Chargement des exercices...</p>
                    </CardContent>
                  </Card>
                ) : breakExercises.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center text-sm text-muted-foreground">
                      Aucun exercice disponible.
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {breakExercises.map((exercise) => {
                      const embedUrl = buildYouTubeEmbedUrl(exercise.youtube_id);
                      const isCompleted = completedExercises.includes(exercise.id);

                      return (
                        <Card
                          key={exercise.id}
                          className={isCompleted ? "border-primary bg-primary/5" : "transition-shadow hover:shadow-soft"}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <CardTitle className="text-lg font-heading">{exercise.title}</CardTitle>
                                <CardDescription>
                                  Zone: {exercise.zones[0] || "—"} • {formatDuration(exercise.duration_sec)}
                                </CardDescription>
                              </div>
                              <Button
                                size="sm"
                                variant={isCompleted ? "outline" : "default"}
                                onClick={() => markExerciseCompleted(exercise.id)}
                              >
                                Terminé ✓
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {embedUrl ? (
                              <div className="overflow-hidden rounded-lg bg-black/5">
                                <iframe
                                  src={embedUrl}
                                  title={exercise.title}
                                  className="aspect-video w-full"
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  allowFullScreen
                                />
                              </div>
                            ) : null}

                            <div className="grid gap-4">
                              <div>
                                <h4 className="mb-2 font-medium">Description</h4>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                  {exercise.description_public || "Aucune description."}
                                </p>
                              </div>
                              <div>
                                <h4 className="mb-2 font-medium">Notes kiné</h4>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                  {exercise.notes_kine || "—"}
                                </p>
                              </div>
                            </div>

                            <ExerciseTimer
                              durationSec={exercise.duration_sec}
                              onComplete={() => {
                                toast({
                                  title: "Timer terminé",
                                  description: `Temps écoulé pour ${exercise.title}.`,
                                });
                              }}
                            />
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            </Tabs>

            <div className="flex justify-center gap-4">
              <Button
                onClick={() => void completeSession()}
                disabled={isValidationDisabled}
                size="lg"
                className="bg-accent text-accent-foreground hover:bg-accent-light"
              >
                Valider la séance
              </Button>
              <Button onClick={resetTimer} variant="outline" size="lg">
                Passer
              </Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={adminOpen} onOpenChange={setAdminOpen}>
        <DialogContent className="max-w-3xl w-full">
          <DialogHeader>
            <DialogTitle>Gestion des seances</DialogTitle>
            <DialogDescription>Creer, modifier et organiser les seances et leurs exercices.</DialogDescription>
          </DialogHeader>

          <div className="max-h-[80vh] overflow-y-auto pr-1">
            <Tabs value={adminTab} onValueChange={(value) => isAdminTab(value) && setAdminTab(value)} className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="plans">Seances</TabsTrigger>
              <TabsTrigger value="plan-exercises">Exercices de la seance</TabsTrigger>
            </TabsList>

            <TabsContent value="plans" className="space-y-4">
              <div className="flex justify-end">
                <Button onClick={startCreatePlan}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nouvelle seance
                </Button>
              </div>

              <div className="space-y-3">
                {plans.map((plan) => (
                  <Card key={plan.id}>
                    <CardContent className="p-4">
                      {editingPlanId === plan.id ? (
                        renderPlanEditor("inline")
                      ) : (
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <p className="font-medium">{plan.title}</p>
                            <p className="text-sm text-muted-foreground">{plan.description || "Aucune description."}</p>
                            <p className="text-xs text-muted-foreground">Ordre: {plan.order_index}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => startEditPlan(plan)}>
                              <Pencil className="mr-1 h-4 w-4" />
                              Editer
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => void deletePlan(plan)}
                              disabled={deletingPlanId === plan.id}
                            >
                              {deletingPlanId === plan.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Trash2 className="mr-1 h-4 w-4" />
                                  Supprimer
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {editingPlanId === "new" ? renderPlanEditor("create") : null}
            </TabsContent>

            <TabsContent value="plan-exercises" className="space-y-4">
              {plans.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center text-sm text-muted-foreground">
                    Creez d'abord une seance dans l'onglet "Seances".
                  </CardContent>
                </Card>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>Seance a editer</Label>
                    <Select value={selectedAdminPlanId} onValueChange={setSelectedAdminPlanId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir une seance" />
                      </SelectTrigger>
                      <SelectContent>
                        {plans.map((plan) => (
                          <SelectItem key={plan.id} value={plan.id}>
                            {plan.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Exercices actuels</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {isLoadingAdminExercises ? (
                        <div className="flex justify-center py-6">
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                      ) : adminPlanExercises.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Aucun exercice dans cette seance.</p>
                      ) : (
                        <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                          {adminPlanExercises.map((entry, index) => (
                            <div
                              key={entry.id}
                              className="flex items-center justify-between rounded-md border border-border/70 p-3"
                            >
                              <p className="text-sm">
                                <span className="font-medium">{entry.order_index}</span> -{" "}
                                {entry.expand?.exercise?.title || "Exercice indisponible"}
                              </p>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => void reorderPlanExercise(entry, "up")}
                                  disabled={entry.order_index === 0 || isSavingPlanExercise}
                                >
                                  <ChevronUp className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => void reorderPlanExercise(entry, "down")}
                                  disabled={index === adminPlanExercises.length - 1 || isSavingPlanExercise}
                                >
                                  <ChevronDown className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => void removePlanExercise(entry.id)}
                                  disabled={isSavingPlanExercise}
                                >
                                  Retirer
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Ajouter un exercice</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2">
                        <Label>Exercice</Label>
                        <Select value={selectedExerciseIdToAdd} onValueChange={setSelectedExerciseIdToAdd}>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={
                                isLoadingAllExercises
                                  ? "Chargement..."
                                  : availableExercisesForSelectedPlan.length === 0
                                    ? "Tous les exercices sont deja dans la seance"
                                    : "Choisir un exercice"
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {availableExercisesForSelectedPlan.map((exercise) => (
                              <SelectItem key={exercise.id} value={exercise.id}>
                                {exercise.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="new-exercise-order">Position</Label>
                        <Input
                          id="new-exercise-order"
                          type="number"
                          min={0}
                          value={newExerciseOrderIndex}
                          onChange={(event) => setNewExerciseOrderIndex(event.target.value)}
                        />
                      </div>

                      <Button
                        onClick={() => void addExerciseToPlan()}
                        disabled={
                          isSavingPlanExercise ||
                          isLoadingAllExercises ||
                          availableExercisesForSelectedPlan.length === 0 ||
                          !selectedExerciseIdToAdd
                        }
                      >
                        {isSavingPlanExercise ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Plus className="mr-2 h-4 w-4" />
                        )}
                        Ajouter
                      </Button>
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>
          </Tabs>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
