import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  Lock,
  Pencil,
  Plus,
  Settings,
  Trash2,
} from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Exercise, WorkoutPlan, WorkoutPlanExercise, exerciseService, workoutPlanService } from "@/lib/pocketbase";

type AdminTab = "plans" | "plan-exercises";
type EditingPlanId = string | "new" | null;

interface PlanFormState {
  title: string;
  description: string;
  order_index: string;
}

const EMPTY_PLAN_FORM: PlanFormState = {
  title: "",
  description: "",
  order_index: "0",
};

const sortPlans = (plans: WorkoutPlan[]) => [...plans].sort((a, b) => a.order_index - b.order_index);
const sortPlanExercises = (entries: WorkoutPlanExercise[]) =>
  [...entries].sort((a, b) => a.order_index - b.order_index);

const formatDuration = (seconds: number) => {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}min ${remaining}s`;
};

const toYoutubeThumbnail = (youtubeId: string) => `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
const isAdminTab = (value: string): value is AdminTab => value === "plans" || value === "plan-exercises";

export default function Session() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openPlanId, setOpenPlanId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [planExercisesById, setPlanExercisesById] = useState<Record<string, WorkoutPlanExercise[]>>({});
  const [planExercisesLoadingById, setPlanExercisesLoadingById] = useState<Record<string, boolean>>({});

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
      setIsLoading(true);
      const data = await workoutPlanService.getAll();
      const sorted = sortPlans(data);
      setPlans(sorted);

      setSelectedAdminPlanId((prev) => {
        if (sorted.length === 0) return "";
        if (!prev || !sorted.some((plan) => plan.id === prev)) return sorted[0].id;
        return prev;
      });

      setOpenPlanId((prev) => {
        if (!prev) return prev;
        return sorted.some((plan) => plan.id === prev) ? prev : null;
      });
    } catch (error) {
      console.error("Error loading workout plans:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les seances.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadPlanExercisesForUser = useCallback(async (planId: string) => {
    try {
      setPlanExercisesLoadingById((prev) => ({ ...prev, [planId]: true }));
      const data = await workoutPlanService.getExercises(planId);
      const sorted = sortPlanExercises(data);
      setPlanExercisesById((prev) => ({ ...prev, [planId]: sorted }));
    } catch (error) {
      console.error("Error loading plan exercises:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les exercices de la seance.",
        variant: "destructive",
      });
    } finally {
      setPlanExercisesLoadingById((prev) => ({ ...prev, [planId]: false }));
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
      setPlanExercisesById((prev) => ({ ...prev, [planId]: sorted }));

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

  useEffect(() => {
    void loadPlans();
  }, [loadPlans]);

  useEffect(() => {
    setCurrentStep(0);
    if (openPlanId) {
      void loadPlanExercisesForUser(openPlanId);
    }
  }, [openPlanId, loadPlanExercisesForUser]);

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

  const openPlanExercises = openPlanId ? planExercisesById[openPlanId] ?? [] : [];
  const isLoadingOpenPlanExercises = openPlanId ? Boolean(planExercisesLoadingById[openPlanId]) : false;

  useEffect(() => {
    if (openPlanExercises.length === 0) {
      setCurrentStep(0);
      return;
    }
    if (currentStep > openPlanExercises.length - 1) {
      setCurrentStep(0);
    }
  }, [currentStep, openPlanExercises]);

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

  const togglePlan = (planId: string) => {
    setOpenPlanId((prev) => (prev === planId ? null : planId));
  };

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
      toast({ title: "Ordre invalide", description: "L'ordre doit etre un nombre positif ou nul.", variant: "destructive" });
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

      if (openPlanId === plan.id) setOpenPlanId(null);
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
      if (openPlanId === selectedAdminPlanId) {
        await loadPlanExercisesForUser(selectedAdminPlanId);
      }
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
      if (openPlanId === selectedAdminPlanId) {
        await loadPlanExercisesForUser(selectedAdminPlanId);
      }
    } catch (error) {
      console.error("Error removing plan exercise:", error);
      toast({ title: "Erreur", description: "Impossible de retirer l'exercice.", variant: "destructive" });
    } finally {
      setIsSavingPlanExercise(false);
    }
  };

  const addExerciseToPlan = async () => {
    if (!selectedAdminPlanId) {
      toast({ title: "Seance requise", description: "Choisissez une seance avant d'ajouter un exercice.", variant: "destructive" });
      return;
    }

    if (!selectedExerciseIdToAdd) {
      toast({ title: "Exercice requis", description: "Selectionnez un exercice a ajouter.", variant: "destructive" });
      return;
    }

    const orderIndex = Number(newExerciseOrderIndex);
    if (!Number.isFinite(orderIndex) || orderIndex < 0) {
      toast({ title: "Position invalide", description: "La position doit etre un nombre positif ou nul.", variant: "destructive" });
      return;
    }

    try {
      setIsSavingPlanExercise(true);
      await workoutPlanService.addExercise(selectedAdminPlanId, selectedExerciseIdToAdd, Math.floor(orderIndex));
      await loadAdminPlanExercises(selectedAdminPlanId);
      if (openPlanId === selectedAdminPlanId) {
        await loadPlanExercisesForUser(selectedAdminPlanId);
      }

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

  return (
    <Layout>
      <div className="container mx-auto space-y-6 px-4 py-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-heading font-bold">Seances d'exercices</h1>
            <p className="text-sm text-muted-foreground">Suivez chaque seance et avancez etape par etape.</p>
          </div>

          {isAdmin ? (
            <Button variant="outline" onClick={() => setAdminOpen(true)}>
              <Settings className="mr-2 h-4 w-4" />
              ⚙ Gérer les séances
            </Button>
          ) : null}
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[0, 1, 2].map((index) => (
              <Card key={`session-skeleton-${index}`}>
                <CardHeader className="space-y-2">
                  <Skeleton className="h-5 w-1/3" />
                  <Skeleton className="h-4 w-2/3" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-14 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : plans.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">Aucune séance disponible</CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {plans.map((plan) => {
              const isOpen = openPlanId === plan.id;
              const entries = isOpen ? openPlanExercises : [];
              const isLastStep = entries.length > 0 && currentStep === entries.length - 1;

              return (
                <Card
                  key={plan.id}
                  className="cursor-pointer border-border/70 transition-all duration-300 hover:border-primary/40"
                  onClick={() => togglePlan(plan.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">{plan.title}</CardTitle>
                        <CardDescription>{plan.description || "Aucune description."}</CardDescription>
                      </div>
                      {isOpen ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </CardHeader>

                  {isOpen ? (
                    <CardContent className="space-y-3 pt-0" onClick={(event) => event.stopPropagation()}>
                      {isLoadingOpenPlanExercises ? (
                        <div className="flex justify-center py-6">
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                      ) : entries.length === 0 ? (
                        <Card className="border-dashed">
                          <CardContent className="p-4 text-sm text-muted-foreground">
                            Aucun exercice dans cette seance.
                          </CardContent>
                        </Card>
                      ) : (
                        entries.map((entry, index) => {
                          const exercise = entry.expand?.exercise;
                          const title = exercise?.title || "Exercice indisponible";
                          const duration = exercise ? formatDuration(exercise.duration_sec) : "";

                          if (index < currentStep) {
                            return (
                              <Card key={entry.id} className="bg-green-50 opacity-50 transition-all duration-300">
                                <CardContent className="flex items-center gap-2 py-3">
                                  <CheckCircle2 className="h-4 w-4 text-green-700" />
                                  <p className="text-sm line-through">{title}</p>
                                </CardContent>
                              </Card>
                            );
                          }

                          if (index > currentStep) {
                            return (
                              <Card key={entry.id} className="cursor-not-allowed opacity-40 transition-all duration-300">
                                <CardContent className="flex items-center justify-between py-3">
                                  <p className="text-sm">{title}</p>
                                  <Lock className="h-4 w-4 text-muted-foreground" />
                                </CardContent>
                              </Card>
                            );
                          }

                          return (
                            <Card key={entry.id} className="border-primary/40 transition-all duration-300">
                              <CardHeader>
                                <CardTitle className="text-base">{title}</CardTitle>
                                <CardDescription>
                                  Etape {index + 1}/{entries.length}
                                  {duration ? ` • ${duration}` : ""}
                                </CardDescription>
                              </CardHeader>
                              <CardContent className="space-y-4">
                                {exercise?.youtube_id ? (
                                  <div className="overflow-hidden rounded-md bg-secondary/20">
                                    <img
                                      src={toYoutubeThumbnail(exercise.youtube_id)}
                                      alt={title}
                                      className="h-48 w-full object-cover"
                                    />
                                  </div>
                                ) : null}

                                <p className="text-sm text-muted-foreground">
                                  {exercise?.description_public || "Aucune description."}
                                </p>

                                {!isLastStep ? (
                                  <Button onClick={() => setCurrentStep((prev) => prev + 1)}>Exercice suivant →</Button>
                                ) : (
                                  <Button
                                    className="bg-primary hover:bg-primary-dark text-primary-foreground"
                                    onClick={() => {
                                      setCurrentStep(0);
                                      setOpenPlanId(null);
                                    }}
                                  >
                                    Terminer la séance ✓
                                  </Button>
                                )}
                              </CardContent>
                            </Card>
                          );
                        })
                      )}
                    </CardContent>
                  ) : null}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={adminOpen} onOpenChange={setAdminOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Gestion des seances</DialogTitle>
            <DialogDescription>Creer, modifier et organiser les seances et leurs exercices.</DialogDescription>
          </DialogHeader>

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
                    <CardContent className="space-y-2">
                      {isLoadingAdminExercises ? (
                        <div className="flex justify-center py-6">
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                      ) : adminPlanExercises.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Aucun exercice dans cette seance.</p>
                      ) : (
                        adminPlanExercises.map((entry, index) => (
                          <div
                            key={entry.id}
                            className="flex items-center justify-between rounded-md border border-border/70 p-3"
                          >
                            <p className="text-sm">
                              <span className="font-medium">{entry.order_index}</span> - {entry.expand?.exercise?.title || "Exercice indisponible"}
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
                        ))
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
                        {isSavingPlanExercise ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                        Ajouter
                      </Button>
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
