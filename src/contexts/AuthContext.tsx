import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { pb } from "@/lib/pocketbase";

export interface AppUser {
  id: string;
  email: string;
  displayName: string;
  role: string;
  subscription_status: string;
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
  updateProfile: (updates: Partial<Pick<AppUser, "displayName" | "email">>) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const toAppUser = (model: any): AppUser => ({
  id: model.id,
  email: model.email,
  displayName: model.display_name || model.name || model.email.split("@")[0],
  role: model.role || "user",
  subscription_status: model.subscription_status || "free",
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Restaurer la session PocketBase au démarrage
  useEffect(() => {
    if (pb.authStore.isValid && pb.authStore.model) {
      setUser(toAppUser(pb.authStore.model));
    }
    setLoading(false);

    // Écouter les changements d'auth (token expiré, déconnexion...)
    const unsubscribe = pb.authStore.onChange((token, model) => {
      if (model) {
        setUser(toAppUser(model));
      } else {
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, displayName?: string) => {
    try {
      await pb.collection("users").create({
        email: email.trim().toLowerCase(),
        password,
        passwordConfirm: password,
        display_name: displayName?.trim() || email.split("@")[0],
        role: "user",
        subscription_status: "free",
      });

      // Connexion automatique après inscription
      const auth = await pb.collection("users").authWithPassword(
        email.trim().toLowerCase(),
        password
      );

      setUser(toAppUser(auth.record));

      toast({
        title: "Compte créé",
        description: "Bienvenue sur Mouv'Minute !",
      });

      return { error: null };
    } catch (err: any) {
      const message =
        err?.response?.data?.email?.message === "The email is invalid or already in use."
          ? "Un compte existe déjà avec cet email."
          : err?.message || "Erreur lors de l'inscription.";

      toast({
        title: "Inscription impossible",
        description: message,
        variant: "destructive",
      });

      return { error: err };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const auth = await pb.collection("users").authWithPassword(
        email.trim().toLowerCase(),
        password
      );

      setUser(toAppUser(auth.record));

      toast({
        title: "Connecté",
        description: `Bon retour, ${toAppUser(auth.record).displayName} !`,
      });

      return { error: null };
    } catch (err: any) {
      toast({
        title: "Connexion impossible",
        description: "Email ou mot de passe invalide.",
        variant: "destructive",
      });

      return { error: err };
    }
  };

  const signOut = async () => {
    pb.authStore.clear();
    setUser(null);
    toast({
      title: "Déconnecté",
      description: "À bientôt !",
    });
    return { error: null };
  };

  const updateProfile = async (updates: Partial<Pick<AppUser, "displayName" | "email">>) => {
    if (!user) return { error: new Error("Aucun utilisateur connecté.") };

    try {
      const updated = await pb.collection("users").update(user.id, {
        display_name: updates.displayName?.trim(),
        email: updates.email?.trim().toLowerCase(),
      });

      setUser(toAppUser(updated));

      toast({
        title: "Profil mis à jour",
        description: "Vos modifications ont été enregistrées.",
      });

      return { error: null };
    } catch (err: any) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le profil.",
        variant: "destructive",
      });
      return { error: err };
    }
  };

  const value = useMemo(
    () => ({ user, loading, signUp, signIn, signOut, updateProfile }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
