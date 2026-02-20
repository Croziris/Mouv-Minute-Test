import { useEffect, useState } from "react";
import { User, Settings, TrendingUp, Award, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Layout } from "@/components/layout/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { sessionService, Session } from "@/lib/pocketbase";
import { Link } from "react-router-dom";

interface SessionStats {
  totalSessions: number;
  completedSessions: number;
  totalTimeMinutes: number;
  weekSessions: number;
  monthSessions: number;
}

const SETTINGS_KEY = "mouv-minute-profile-settings";

const safeParse = <T,>(value: string | null, fallback: T): T => {
  if (!value) return fallback;
  try { return JSON.parse(value) as T; } catch { return fallback; }
};

export default function Profile() {
  const { user, signOut, updateProfile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [loadingStats, setLoadingStats] = useState(true);
  const [sessionDuration, setSessionDuration] = useState(45);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [stats, setStats] = useState<SessionStats>({
    totalSessions: 0,
    completedSessions: 0,
    totalTimeMinutes: 0,
    weekSessions: 0,
    monthSessions: 0,
  });

  const [profile, setProfile] = useState({
    display_name: user?.displayName ?? "",
    email: user?.email ?? "",
  });

  // Restaurer préférences locales
  useEffect(() => {
    const saved = safeParse<{ sessionDuration: number; notificationsEnabled: boolean }>(
      localStorage.getItem(SETTINGS_KEY),
      { sessionDuration: 45, notificationsEnabled: true }
    );
    setSessionDuration(saved.sessionDuration);
    setNotificationsEnabled(saved.notificationsEnabled);
  }, []);

  // Charger les stats depuis PocketBase
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        setLoadingStats(true);
        const result = await sessionService.getHistory();
        const sessions: Session[] = result.items;

        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const completed = sessions.filter((s) => s.completed);
        const weekSessions = sessions.filter((s) => new Date(s.created) > weekAgo);
        const monthSessions = sessions.filter((s) => new Date(s.created) > monthAgo);
        const totalTime = completed.reduce((sum, s) => sum + (s.duration_minute || 0), 0);

        setStats({
          totalSessions: sessions.length,
          completedSessions: completed.length,
          totalTimeMinutes: totalTime,
          weekSessions: weekSessions.length,
          monthSessions: monthSessions.length,
        });
      } catch (err) {
        console.error("Erreur chargement stats:", err);
      } finally {
        setLoadingStats(false);
      }
    };
    load();
  }, [user]);

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);

    const { error } = await updateProfile({
      displayName: profile.display_name,
      email: profile.email,
    });

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder le profil.",
        variant: "destructive",
      });
      setSaving(false);
      return;
    }

    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ sessionDuration, notificationsEnabled }));

    toast({
      title: "Profil mis à jour ✅",
      description: "Vos informations ont été sauvegardées.",
    });
    setSaving(false);
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) return `${hours}h ${mins}min`;
    return `${mins}min`;
  };

  if (!user) {
    return (
      <Layout showBottomNav={false}>
        <div className="container mx-auto px-4 py-6 max-w-2xl">
          <Card className="p-6 text-center">
            <h1 className="text-2xl font-heading font-bold mb-4">Connexion requise</h1>
            <p className="text-muted-foreground mb-6">
              Connectez-vous pour accéder à votre profil et vos statistiques.
            </p>
            <Link to="/auth">
              <Button>Aller à la connexion</Button>
            </Link>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout showBottomNav={false}>
      <div className="container mx-auto px-4 py-6 max-w-4xl space-y-8">

        <div className="text-center space-y-2">
          <h1 className="text-2xl font-heading font-bold">Mon profil</h1>
          <p className="text-muted-foreground">Gérez vos informations et consultez vos statistiques</p>
        </div>

        {/* Statistiques */}
        <section className="space-y-4">
          <h2 className="text-xl font-heading font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Mes statistiques
          </h2>

          {loadingStats ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Sessions totales
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-heading font-bold text-primary">
                      {stats.totalSessions}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {stats.completedSessions} terminées
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Cette semaine
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-heading font-bold text-accent">
                      {stats.weekSessions}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">sessions</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Ce mois
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-heading font-bold text-primary">
                      {stats.monthSessions}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">sessions</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Temps total
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-heading font-bold text-accent">
                      {formatTime(stats.totalTimeMinutes)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">d'activité</p>
                  </CardContent>
                </Card>
              </div>

              {stats.completedSessions > 0 && (
                <Card className="bg-gradient-primary border-0 text-primary-foreground">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Award className="h-6 w-6" />
                      <div>
                        <p className="font-medium">Félicitations 🎉</p>
                        <p className="text-sm opacity-90">
                          Vous avez terminé {stats.completedSessions} session
                          {stats.completedSessions > 1 ? "s" : ""}. Continuez comme ça !
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </section>

        {/* Informations personnelles */}
        <section className="space-y-4">
          <h2 className="text-xl font-heading font-semibold flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Informations personnelles
          </h2>

          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="display-name">Nom d'affichage</Label>
                  <Input
                    id="display-name"
                    value={profile.display_name}
                    onChange={(e) => setProfile((prev) => ({ ...prev, display_name: e.target.value }))}
                    placeholder="Votre nom"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="votre@email.com"
                  />
                </div>
              </div>

              {/* Badge rôle et abonnement */}
              <div className="flex gap-2 text-xs">
                <span className="px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
                  {(user as any).role || "user"}
                </span>
                <span className="px-2 py-1 rounded-full bg-accent/10 text-accent font-medium">
                  {(user as any).subscription_status || "free"}
                </span>
              </div>

              <Button onClick={saveProfile} disabled={saving} className="w-full md:w-auto">
                {saving ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sauvegarde...</>
                ) : "Sauvegarder"}
              </Button>
            </CardContent>
          </Card>
        </section>

        {/* Paramètres */}
        <section className="space-y-4">
          <h2 className="text-xl font-heading font-semibold flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Paramètres
          </h2>

          <Card>
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Durée des sessions</Label>
                  <CardDescription>Durée par défaut de vos sessions de travail</CardDescription>
                </div>
                <div className="flex gap-2">
                  {[30, 45, 60].map((min) => (
                    <Button
                      key={min}
                      variant={sessionDuration === min ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSessionDuration(min)}
                    >
                      {min} min
                    </Button>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Notifications</Label>
                  <CardDescription>Recevoir des rappels pour les pauses</CardDescription>
                </div>
                <Switch
                  checked={notificationsEnabled}
                  onCheckedChange={setNotificationsEnabled}
                />
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Zone danger */}
        <section>
          <Card className="border-destructive/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-destructive">Zone de danger</Label>
                  <CardDescription>Déconnectez-vous de votre compte</CardDescription>
                </div>
                <Button variant="destructive" onClick={signOut}>
                  Se déconnecter
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </Layout>
  );
}
