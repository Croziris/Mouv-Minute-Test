import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "@/hooks/use-toast";

export interface AppUser {
  id: string;
  email: string;
  displayName: string;
}

interface StoredUser {
  id: string;
  email: string;
  password: string;
  displayName: string;
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

const USERS_KEY = "mouv-minute-users";
const ACTIVE_USER_KEY = "mouv-minute-active-user";

const safeParse = <T,>(value: string | null, fallback: T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

const getStoredUsers = (): StoredUser[] =>
  safeParse<StoredUser[]>(localStorage.getItem(USERS_KEY), []);

const setStoredUsers = (users: StoredUser[]) => {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

const toAppUser = (stored: StoredUser): AppUser => ({
  id: stored.id,
  email: stored.email,
  displayName: stored.displayName,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const activeUser = safeParse<AppUser | null>(localStorage.getItem(ACTIVE_USER_KEY), null);
    setUser(activeUser);
    setLoading(false);
  }, []);

  const signUp = async (email: string, password: string, displayName?: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    const users = getStoredUsers();
    const existing = users.find((stored) => stored.email.toLowerCase() === normalizedEmail);

    if (existing) {
      const error = new Error("Un compte existe deja avec cet email.");
      toast({
        title: "Inscription impossible",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }

    const created: StoredUser = {
      id: crypto.randomUUID(),
      email: normalizedEmail,
      password,
      displayName: displayName?.trim() || normalizedEmail.split("@")[0],
    };

    users.push(created);
    setStoredUsers(users);
    const active = toAppUser(created);
    localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(active));
    setUser(active);

    toast({
      title: "Compte cree",
      description: "Connexion locale active.",
    });

    return { error: null };
  };

  const signIn = async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    const users = getStoredUsers();
    const found = users.find(
      (stored) => stored.email.toLowerCase() === normalizedEmail && stored.password === password
    );

    if (!found) {
      const error = new Error("Email ou mot de passe invalide.");
      toast({
        title: "Connexion impossible",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }

    const active = toAppUser(found);
    localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(active));
    setUser(active);
    return { error: null };
  };

  const signOut = async () => {
    localStorage.removeItem(ACTIVE_USER_KEY);
    setUser(null);
    return { error: null };
  };

  const updateProfile = async (updates: Partial<Pick<AppUser, "displayName" | "email">>) => {
    if (!user) {
      return { error: new Error("Aucun utilisateur connecte.") };
    }

    const users = getStoredUsers();
    const index = users.findIndex((stored) => stored.id === user.id);
    if (index === -1) {
      return { error: new Error("Utilisateur introuvable.") };
    }

    const nextStored: StoredUser = {
      ...users[index],
      displayName: updates.displayName?.trim() || users[index].displayName,
      email: updates.email?.trim().toLowerCase() || users[index].email,
    };

    users[index] = nextStored;
    setStoredUsers(users);

    const nextUser = toAppUser(nextStored);
    localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(nextUser));
    setUser(nextUser);

    return { error: null };
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      signUp,
      signIn,
      signOut,
      updateProfile,
    }),
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
