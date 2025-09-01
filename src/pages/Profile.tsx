import { useState, useEffect } from "react";
import { User, Settings, TrendingUp, Clock, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Layout } from "@/components/layout/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface ProfileData {
  display_name: string;
  email: string;
}

interface SessionStats {
  totalSessions: number;
  completedSessions: number;
  totalTimeMinutes: number;
  weekSessions: number;
  monthSessions: number;
}

export default function Profile() {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<ProfileData>({ display_name: '', email: '' });
  const [stats, setStats] = useState<SessionStats>({
    totalSessions: 0,
    completedSessions: 0,
    totalTimeMinutes: 0,
    weekSessions: 0,
    monthSessions: 0,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Paramètres
  const [sessionDuration, setSessionDuration] = useState(45);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  useEffect(() => {
    if (user) {
      loadProfile();
      loadStats();
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('display_name, email')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // Pas d'erreur si pas de résultat
        throw error;
      }

      if (data) {
        setProfile(data);
      } else {
        // Pas de profil trouvé, utiliser les données de l'utilisateur
        setProfile({
          display_name: user.user_metadata?.display_name || '',
          email: user.email || '',
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    if (!user) return;

    try {
      // Sessions totales
      const { data: allSessions } = await supabase
        .from('sessions')
        .select('completed, duration_minutes, created_at')
        .eq('user_id', user.id);

      if (allSessions) {
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const completedSessions = allSessions.filter(s => s.completed);
        const weekSessions = allSessions.filter(s => new Date(s.created_at) > weekAgo);
        const monthSessions = allSessions.filter(s => new Date(s.created_at) > monthAgo);
        
        const totalTimeMinutes = completedSessions.reduce((sum, session) => 
          sum + (session.duration_minutes || 0), 0
        );

        setStats({
          totalSessions: allSessions.length,
          completedSessions: completedSessions.length,
          totalTimeMinutes,
          weekSessions: weekSessions.length,
          monthSessions: monthSessions.length,
        });
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const saveProfile = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          display_name: profile.display_name,
          email: profile.email,
        });

      if (error) throw error;

      toast({
        title: "Profil mis à jour",
        description: "Vos informations ont été sauvegardées.",
      });
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder le profil.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}min`;
    }
    return `${mins}min`;
  };

  if (loading) {
    return (
      <Layout showBottomNav={false}>
        <div className="container mx-auto px-4 py-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-32 bg-muted rounded"></div>
            <div className="h-48 bg-muted rounded"></div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout showBottomNav={false}>
      <div className="container mx-auto px-4 py-6 max-w-4xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-heading font-bold">Mon profil</h1>
          <p className="text-muted-foreground">
            Gérez vos informations et consultez vos statistiques
          </p>
        </div>

        {/* Statistiques */}
        <section className="space-y-4">
          <h2 className="text-xl font-heading font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Mes statistiques
          </h2>
          
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
                <p className="text-xs text-muted-foreground mt-1">
                  sessions
                </p>
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
                <p className="text-xs text-muted-foreground mt-1">
                  sessions
                </p>
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
                <p className="text-xs text-muted-foreground mt-1">
                  d'activité
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Encouragement */}
          {stats.completedSessions > 0 && (
            <Card className="bg-gradient-primary border-0 text-primary-foreground">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Award className="h-6 w-6" />
                  <div>
                    <p className="font-medium">Félicitations !</p>
                    <p className="text-sm opacity-90">
                      Vous avez terminé {stats.completedSessions} session{stats.completedSessions > 1 ? 's' : ''}. 
                      Continuez comme ça !
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
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
                    onChange={(e) => setProfile(prev => ({ ...prev, display_name: e.target.value }))}
                    placeholder="Votre nom"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
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
                  <CardDescription>
                    Durée par défaut de vos sessions de travail
                  </CardDescription>
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
                  <CardDescription>
                    Recevoir des rappels pour les pauses
                  </CardDescription>
                </div>
                <Switch
                  checked={notificationsEnabled}
                  onCheckedChange={setNotificationsEnabled}
                />
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Actions */}
        <section className="space-y-4">
          <Card className="border-destructive/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-destructive">Zone de danger</Label>
                  <CardDescription>
                    Déconnectez-vous de votre compte
                  </CardDescription>
                </div>
                <Button variant="destructive" onClick={handleSignOut}>
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