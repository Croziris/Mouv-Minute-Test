import { useCallback, useEffect, useState } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { exerciseService, Exercise, ExercisePayload } from "@/lib/pocketbase";
import { ExerciseZone, zoneConfig } from "@/components/exercises/exerciseConfig";
import { buildYouTubeWatchUrl, extractYouTubeId } from "@/lib/youtube";

type AdminTab = "list" | "form";

interface ExerciseFormState {
  title: string;
  zone: ExerciseZone;
  duration_sec: string;
  youtube_id: string;
  thumb_url: string;
  description_public: string;
  notes_kine: string;
}

const emptyForm: ExerciseFormState = {
  title: "",
  zone: "nuque",
  duration_sec: "45",
  youtube_id: "",
  thumb_url: "",
  description_public: "",
  notes_kine: "",
};

interface ExerciseAdminPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAdmin: boolean;
  onExercisesChanged: () => void | Promise<void>;
}

export function ExerciseAdminPanel({
  open,
  onOpenChange,
  isAdmin,
  onExercisesChanged,
}: ExerciseAdminPanelProps) {
  const [adminTab, setAdminTab] = useState<AdminTab>("list");
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminExercises, setAdminExercises] = useState<Exercise[]>([]);
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState<ExerciseFormState>(emptyForm);

  const zones = Object.keys(zoneConfig) as ExerciseZone[];
  const isAbortError = (error: unknown) => Boolean((error as { isAbort?: boolean })?.isAbort);

  const refreshParent = useCallback(async () => {
    await Promise.resolve(onExercisesChanged());
  }, [onExercisesChanged]);

  const loadAdminExercises = useCallback(async () => {
    if (!isAdmin) return;
    try {
      setAdminLoading(true);
      const data = await exerciseService.getAll();
      setAdminExercises(data);
    } catch (error) {
      if (isAbortError(error)) return;
      console.error("Error loading admin exercises:", error);
      const status = (error as { status?: number })?.status;
      toast({
        title: "Erreur",
        description:
          status === 403
            ? "Acces admin refuse. Verifie les rules de la collection exercises."
            : "Impossible de charger le panel admin.",
        variant: "destructive",
      });
    } finally {
      setAdminLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (open) {
      void loadAdminExercises();
    }
  }, [open, loadAdminExercises]);

  const openCreateForm = () => {
    setEditingExerciseId(null);
    setForm(emptyForm);
    setAdminTab("form");
  };

  const openEditForm = (exercise: Exercise) => {
    setEditingExerciseId(exercise.id);
    setForm({
      title: exercise.title || "",
      zone: exercise.zone,
      duration_sec: String(exercise.duration_sec || 45),
      youtube_id: buildYouTubeWatchUrl(exercise.youtube_id) || exercise.youtube_id || "",
      thumb_url: exercise.thumb_url || "",
      description_public: exercise.description_public || "",
      notes_kine: exercise.notes_kine || "",
    });
    setAdminTab("form");
  };

  const buildPayload = (): ExercisePayload | null => {
    const durationSec = Number(form.duration_sec);
    const youtubeId = extractYouTubeId(form.youtube_id);

    if (!form.title.trim()) {
      toast({
        title: "Champ requis",
        description: "Le titre est obligatoire.",
        variant: "destructive",
      });
      return null;
    }

    if (!Number.isFinite(durationSec) || durationSec <= 0) {
      toast({
        title: "Duree invalide",
        description: "La duree doit etre un nombre positif.",
        variant: "destructive",
      });
      return null;
    }

    if (!youtubeId) {
      toast({
        title: "Champ requis",
        description: "L'ID ou l'URL YouTube est obligatoire.",
        variant: "destructive",
      });
      return null;
    }

    return {
      title: form.title.trim(),
      zone: form.zone,
      duration_sec: Math.round(durationSec),
      youtube_id: youtubeId,
      thumb_url: form.thumb_url.trim(),
      description_public: form.description_public.trim(),
      notes_kine: form.notes_kine.trim(),
    };
  };

  const saveExercise = async () => {
    if (!isAdmin) return;
    const payload = buildPayload();
    if (!payload) return;

    try {
      setSaving(true);
      if (editingExerciseId) {
        await exerciseService.update(editingExerciseId, payload);
        toast({
          title: "Exercice modifie",
          description: "Les changements ont ete enregistres.",
        });
      } else {
        await exerciseService.create(payload);
        toast({
          title: "Exercice ajoute",
          description: "Le nouvel exercice est disponible.",
        });
      }

      setEditingExerciseId(null);
      setForm(emptyForm);
      setAdminTab("list");
      await Promise.all([loadAdminExercises(), refreshParent()]);
    } catch (error) {
      console.error("Error saving exercise:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer l'exercice.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteExercise = async (exercise: Exercise) => {
    if (!isAdmin) return;
    const confirmed = window.confirm(`Supprimer "${exercise.title}" ?`);
    if (!confirmed) return;

    try {
      setDeletingId(exercise.id);
      await exerciseService.remove(exercise.id);
      toast({
        title: "Exercice supprime",
        description: "L'exercice a ete retire.",
      });

      if (editingExerciseId === exercise.id) {
        setEditingExerciseId(null);
        setForm(emptyForm);
        setAdminTab("list");
      }

      await Promise.all([loadAdminExercises(), refreshParent()]);
    } catch (error) {
      console.error("Error deleting exercise:", error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'exercice.",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Panel admin - Exercices</DialogTitle>
          <DialogDescription>
            Ajouter, modifier ou supprimer des exercices. Les changements sont enregistres dans PocketBase.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <Button variant={adminTab === "list" ? "default" : "outline"} onClick={() => setAdminTab("list")}>
            Liste
          </Button>
          <Button
            variant={adminTab === "form" ? "default" : "outline"}
            onClick={() => {
              if (!editingExerciseId) setForm(emptyForm);
              setAdminTab("form");
            }}
          >
            {editingExerciseId ? "Edition" : "Ajout"}
          </Button>
        </div>

        {adminTab === "list" ? (
          <div className="space-y-3">
            <div className="flex justify-end">
              <Button onClick={openCreateForm}>
                <Plus className="mr-2 h-4 w-4" />
                Nouvel exercice
              </Button>
            </div>

            <div className="max-h-[50vh] overflow-auto space-y-2 pr-1">
              {adminLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : adminExercises.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center text-sm text-muted-foreground">
                    Aucun exercice trouve.
                  </CardContent>
                </Card>
              ) : (
                adminExercises.map((exercise) => (
                  <Card key={exercise.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="font-medium">{exercise.title}</p>
                          <p className="text-xs text-muted-foreground">
                            Zone: {exercise.zone} - Duree: {exercise.duration_sec}s
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Lien YouTube: {buildYouTubeWatchUrl(exercise.youtube_id) || "non renseigne"}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEditForm(exercise)}>
                            <Pencil className="h-4 w-4 mr-1" />
                            Editer
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => void deleteExercise(exercise)}
                            disabled={deletingId === exercise.id}
                          >
                            {deletingId === exercise.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Trash2 className="h-4 w-4 mr-1" />
                                Supprimer
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="admin-title">Titre</Label>
                <Input
                  id="admin-title"
                  value={form.title}
                  onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="Nom de l'exercice"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="admin-zone">Zone</Label>
                <select
                  id="admin-zone"
                  value={form.zone}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, zone: event.target.value as ExerciseZone }))
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {zones.map((zone) => (
                    <option key={zone} value={zone}>
                      {zoneConfig[zone].label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="admin-duration">Duree (secondes)</Label>
                <Input
                  id="admin-duration"
                  type="number"
                  min={5}
                  step={1}
                  value={form.duration_sec}
                  onChange={(event) => setForm((prev) => ({ ...prev, duration_sec: event.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="admin-youtube">Lien YouTube (URL complete)</Label>
                <Input
                  id="admin-youtube"
                  value={form.youtube_id}
                  onChange={(event) => setForm((prev) => ({ ...prev, youtube_id: event.target.value }))}
                  placeholder="Collez le lien YouTube complet (watch, youtu.be, shorts...)"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-thumb">Thumbnail URL (optionnel)</Label>
              <Input
                id="admin-thumb"
                value={form.thumb_url}
                onChange={(event) => setForm((prev) => ({ ...prev, thumb_url: event.target.value }))}
                placeholder="https://..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-description">Description publique</Label>
              <Textarea
                id="admin-description"
                value={form.description_public}
                onChange={(event) => setForm((prev) => ({ ...prev, description_public: event.target.value }))}
                placeholder="Description de l'exercice"
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-notes">Tips kine</Label>
              <Textarea
                id="admin-notes"
                value={form.notes_kine}
                onChange={(event) => setForm((prev) => ({ ...prev, notes_kine: event.target.value }))}
                placeholder="Conseils techniques"
                rows={4}
              />
            </div>

            <div className="flex justify-between gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setEditingExerciseId(null);
                  setForm(emptyForm);
                  setAdminTab("list");
                }}
              >
                Annuler
              </Button>
              <Button onClick={() => void saveExercise()} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enregistrement...
                  </>
                ) : editingExerciseId ? (
                  "Mettre a jour"
                ) : (
                  "Ajouter l'exercice"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
