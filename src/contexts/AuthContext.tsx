import React, { createContext, useContext, useEffect, useState } from "react";
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
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: unknown | null }>;
  signIn: (email: string, password: string) => Promise<{ error: unknown | null }>;
  signInWithGoogle: () => Promise<{ error: unknown | null }>;
  requestOtp: (email: string) => Promise<{ error: unknown | null; otpId: string | null }>;
  signInWithOtp: (otpId: string, otpCode: string) => Promise<{ error: unknown | null }>;
  signOut: () => Promise<{ error: unknown | null }>;
  updateProfile: (
    updates: Partial<Pick<AppUser, "displayName" | "email">>
  ) => Promise<{ error: unknown | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface PocketBaseError {
  status?: number;
  message?: string;
  isAbort?: boolean;
  originalError?: {
    message?: string;
  };
  response?: {
    message?: string;
    data?: {
      email?: {
        message?: string;
      };
    };
  };
}

const toPocketBaseError = (err: unknown): PocketBaseError => {
  if (typeof err === "object" && err !== null) {
    return err as PocketBaseError;
  }
  return {};
};

const toAppUser = (model: unknown): AppUser => {
  const safeModel = typeof model === "object" && model !== null ? (model as Record<string, unknown>) : {};
  const email = typeof safeModel.email === "string" ? safeModel.email : "";
  const displayName =
    typeof safeModel.display_name === "string"
      ? safeModel.display_name
      : typeof safeModel.name === "string"
        ? safeModel.name
        : email.split("@")[0] || "utilisateur";

  return {
    id: typeof safeModel.id === "string" ? safeModel.id : "",
    email,
    displayName,
    role: typeof safeModel.role === "string" ? safeModel.role : "user",
    subscription_status:
      typeof safeModel.subscription_status === "string" ? safeModel.subscription_status : "free",
  };
};

const getGoogleAuthErrorMessage = (err: unknown): string => {
  const pocketErr = toPocketBaseError(err);
  const message = [
    pocketErr.message,
    pocketErr.response?.message,
    pocketErr.originalError?.message,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (
    message.includes("popup_blocked") ||
    message.includes("popup blocked") ||
    message.includes("not in a browser context")
  ) {
    return "La popup Google est bloquee. Autorisez les popups puis reessayez.";
  }

  if (
    pocketErr.isAbort ||
    message.includes("abort") ||
    message.includes("cancel") ||
    message.includes("oauth2 redirect error") ||
    message.includes("state parameters don't match")
  ) {
    return "Connexion Google annulee.";
  }

  return "Impossible de se connecter avec Google pour le moment.";
};

const getOtpRequestErrorMessage = (err: unknown): string => {
  if (toPocketBaseError(err).response?.data?.email?.message) {
    return "Adresse email invalide.";
  }

  return "Impossible d'envoyer le code OTP. Reessayez dans un instant.";
};

const getOtpAuthErrorMessage = (err: unknown): string => {
  const status = toPocketBaseError(err).status;
  if (status === 400 || status === 404) {
    return "Code OTP invalide ou expire.";
  }

  return "Connexion OTP impossible. Verifiez le code puis reessayez.";
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Restaurer la session PocketBase au démarrage
  useEffect(() => {
    if (pb.authStore.isValid && pb.authStore.model && typeof pb.authStore.model === "object") {
      setUser(toAppUser(pb.authStore.model));
    }
    setLoading(false);

    // Écouter les changements d'auth (token expiré, déconnexion...)
    const unsubscribe = pb.authStore.onChange((_token, model) => {
      if (model && typeof model === "object") {
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
    } catch (err: unknown) {
      const pocketErr = toPocketBaseError(err);
      const message =
        pocketErr.response?.data?.email?.message === "The email is invalid or already in use."
          ? "Un compte existe deja avec cet email."
          : pocketErr.message || "Erreur lors de l'inscription.";

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
    } catch (err: unknown) {
      toast({
        title: "Connexion impossible",
        description: "Email ou mot de passe invalide.",
        variant: "destructive",
      });

      return { error: err };
    }
  };

  const signInWithGoogle = async () => {
    try {
      console.log("PB URL:", import.meta.env.VITE_POCKETBASE_URL);
      console.log(
        "OAuth2 redirect URI attendue:",
        import.meta.env.VITE_POCKETBASE_URL + "/api/oauth2-redirect"
      );

      const auth = await pb.collection("users").authWithOAuth2({
        provider: "google",
      });

      setUser(toAppUser(auth.record));

      toast({
        title: "Connecte",
        description: `Bon retour, ${toAppUser(auth.record).displayName} !`,
      });

      return { error: null };
    } catch (err: unknown) {
      toast({
        title: "Connexion Google impossible",
        description: getGoogleAuthErrorMessage(err),
        variant: "destructive",
      });

      return { error: err };
    }
  };

  const requestOtp = async (email: string) => {
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const result = await pb.collection("users").requestOTP(normalizedEmail);

      toast({
        title: "Code envoye",
        description: "Consultez votre email pour recuperer le code de connexion.",
      });

      return { error: null, otpId: typeof result.otpId === "string" ? result.otpId : null };
    } catch (err: unknown) {
      toast({
        title: "Envoi impossible",
        description: getOtpRequestErrorMessage(err),
        variant: "destructive",
      });

      return { error: err, otpId: null };
    }
  };

  const signInWithOtp = async (otpId: string, otpCode: string) => {
    if (!otpId) {
      const error = new Error("missing_otp_id");
      toast({
        title: "Connexion OTP impossible",
        description: "Demandez d'abord un code OTP.",
        variant: "destructive",
      });
      return { error };
    }

    try {
      const auth = await pb.collection("users").authWithOTP(otpId, otpCode.trim());

      setUser(toAppUser(auth.record));

      toast({
        title: "Connecte",
        description: `Bon retour, ${toAppUser(auth.record).displayName} !`,
      });

      return { error: null };
    } catch (err: unknown) {
      toast({
        title: "Connexion OTP impossible",
        description: getOtpAuthErrorMessage(err),
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
    } catch (err: unknown) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le profil.",
        variant: "destructive",
      });
      return { error: err };
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    requestOtp,
    signInWithOtp,
    signOut,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
