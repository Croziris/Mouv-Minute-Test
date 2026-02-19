import { useEffect, useMemo, useState } from "react";
import { User, Settings, TrendingUp, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Layout } from "@/components/layout/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { getSessionHistory } from "@/lib/localSessionStore";
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
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

export default function Profile() {
  const { user, signOut, updateProfile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [sessionDuration, setSessionDuration] = useState(45);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const [profile, setProfile] = useState(() => ({
    display_name: user?.displayName ?? "",
    email: user?.email ?? "",
  }));

  useEffect(() => {
    const saved = safeParse<{ sessionDuration: number; notificationsEnabled: boolean }>(
      localStorage.getItem(SETTINGS_KEY),
      { sessionDuration: 45, notificationsEnabled: true }
    );
    setSessionDuration(saved.sessionDuration);
    setNotificationsEnabled(saved.notificationsEnabled);
  }, []);

  const stats = useMemo<SessionStats>(() => {
    const sessions = getSessionHistory();
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const completedSessions = sessions.filter((session) => session.completed);
    const weekSessions = sessions.filter((session) => new Date(session.created_at) > weekAgo);
    const monthSessions = sessions.filter((session) => new Date(session.created_at) > monthAgo);
    const totalTimeMinutes = completedSessions.reduce(
      (sum, session) => sum + (session.duration_minutes || 0),
      0
    );

    return {
      totalSessions: sessions.length,
      completedSessions: completedSessions.length,
      totalTimeMinutes,
      weekSessions: weekSessions.length,
      monthSessions: monthSessions.length,
    };
  }, []);

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

    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({
        sessionDuration,
        notificationsEnabled,
      })
    );

    toast({
      title: "Profil mis a jour",
      description: "Vos informations locales ont ete sauvegardees.",
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
              Connectez-vous pour acceder a votre profil local et vos statistiques.
            </p>
            <Link to="/auth">
              <Button>Aller a la connexion</Button>
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
          <p className="text-muted-foreground">Gerez vos informations et consultez vos statistiques</p>
        </div>

        <section className="space-y-4">
          <h2 className="text-xl font-heading font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Mes statistiques
          </h2>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Sessions totales</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-heading font-bold text-primary">{stats.totalSessions}</div>
                <p className="text-xs text-muted-foreground mt-1">{stats.completedSessions} terminees</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Cette semaine</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-heading font-bold text-accent">{stats.weekSessions}</div>
                <p className="text-xs text-muted-foreground mt-1">sessions</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Ce mois</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-heading font-bold text-primary">{stats.monthSessions}</div>
                <p className="text-xs text-muted-foreground mt-1">sessions</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Temps total</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-heading font-bold text-accent">{formatTime(stats.totalTimeMinutes)}</div>
                <p className="text-xs text-muted-foreground mt-1">d'activite</p>
              </CardContent>
            </Card>
          </div>

          {stats.completedSessions > 0 && (
            <Card className="bg-gradient-primary border-0 text-primary-foreground">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Award className="h-6 w-6" />
                  <div>
                    <p className="font-medium">Felicitations</p>
                    <p className="text-sm opacity-90">
                      Vous avez termine {stats.completedSessions} session
                      {stats.completedSessions > 1 ? "s" : ""}. Continuez comme ca.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </section>

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
                    onChange={(event) => setProfile((prev) => ({ ...prev, display_name: event.target.value }))}
                    placeholder="Votre nom"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    onChange={(event) => setProfile((prev) => ({ ...prev, email: event.target.value }))}
                    placeholder="votre@email.com"
                  />
                </div>
              </div>

              <Button onClick={saveProfile} disabled={saving} className="w-full md:w-auto">
                {saving ? "Sauvegarde..." : "Sauvegarder"}
              </Button>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-heading font-semibold flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Parametres
          </h2>

          <Card>
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Duree des sessions</Label>
                  <CardDescription>Duree par defaut de vos sessions de travail</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={sessionDuration === 45 ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSessionDuration(45)}
                  >
                    45 min
                  </Button>
                  <Button
                    variant={sessionDuration === 60 ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSessionDuration(60)}
                  >
                    60 min
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Notifications</Label>
                  <CardDescription>Recevoir des rappels pour les pauses</CardDescription>
                </div>
                <Switch checked={notificationsEnabled} onCheckedChange={setNotificationsEnabled} />
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-4">
          <Card className="border-destructive/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-destructive">Zone de danger</Label>
                  <CardDescription>Deconnectez-vous de votre compte local</CardDescription>
                </div>
                <Button variant="destructive" onClick={signOut}>
                  Se deconnecter
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </Layout>
  );
}
