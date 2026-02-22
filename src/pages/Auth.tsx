import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, User, Mail, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { pb } from "@/lib/pocketbase";

const GoogleLogo = () => (
  <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" className="h-4 w-4">
    <path
      fill="#4285F4"
      d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.54-5.17 3.54-8.87Z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.07 7.93-2.91l-3.88-3c-1.07.72-2.44 1.15-4.05 1.15-3.11 0-5.74-2.1-6.68-4.93H1.3v3.09A12 12 0 0 0 12 24Z"
    />
    <path
      fill="#FBBC05"
      d="M5.32 14.31A7.2 7.2 0 0 1 4.95 12c0-.8.14-1.57.37-2.31V6.6H1.3A12 12 0 0 0 0 12c0 1.93.46 3.75 1.3 5.4l4.02-3.09Z"
    />
    <path
      fill="#EA4335"
      d="M12 4.77c1.76 0 3.34.61 4.58 1.8l3.43-3.43C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.3 6.6l4.02 3.09c.94-2.83 3.57-4.92 6.68-4.92Z"
    />
  </svg>
);

type ResetRequestState = "idle" | "loading" | "success" | "error";

const getPocketBaseStatus = (error: unknown): number | null => {
  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof (error as { status?: unknown }).status === "number"
  ) {
    return (error as { status: number }).status;
  }

  return null;
};

const isTechnicalResetError = (error: unknown): boolean => {
  const status = getPocketBaseStatus(error);
  if (status === null) return true;
  return status === 0 || status >= 500;
};

export default function Auth() {
  const navigate = useNavigate();
  const { signIn, signUp, signInWithGoogle, requestOtp, signInWithOtp, user, loading } = useAuth();

  // Etat du formulaire de connexion
  const [signInData, setSignInData] = useState({ email: "", password: "" });
  const [signInLoading, setSignInLoading] = useState(false);
  const [googleSignInLoading, setGoogleSignInLoading] = useState(false);

  // Etat du formulaire d'inscription
  const [signUpData, setSignUpData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    displayName: "",
  });
  const [signUpLoading, setSignUpLoading] = useState(false);

  // Etat affichage des mots de passe
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Etat mot de passe oublie
  const [forgotDialogOpen, setForgotDialogOpen] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [forgotPasswordState, setForgotPasswordState] = useState<ResetRequestState>("idle");
  const forgotPasswordCloseTimeoutRef = useRef<number | null>(null);

  // Etat du flow OTP
  const [showOtpFlow, setShowOtpFlow] = useState(false);
  const [otpStep, setOtpStep] = useState<"request" | "verify">("request");
  const [otpId, setOtpId] = useState<string | null>(null);
  const [otpRequestLoading, setOtpRequestLoading] = useState(false);
  const [otpVerifyLoading, setOtpVerifyLoading] = useState(false);
  const [otpData, setOtpData] = useState({ email: "", code: "" });

  // Redirige si deja connecte
  useEffect(() => {
    if (user && !loading) {
      navigate("/");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    return () => {
      if (forgotPasswordCloseTimeoutRef.current !== null) {
        window.clearTimeout(forgotPasswordCloseTimeoutRef.current);
      }
    };
  }, []);

  const handleForgotDialogOpenChange = (open: boolean) => {
    if (forgotPasswordCloseTimeoutRef.current !== null) {
      window.clearTimeout(forgotPasswordCloseTimeoutRef.current);
      forgotPasswordCloseTimeoutRef.current = null;
    }

    if (!open) {
      setForgotPasswordState("idle");
    }

    setForgotDialogOpen(open);
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (forgotPasswordState === "loading") return;

    const email = forgotPasswordEmail.trim().toLowerCase();
    if (!email) return;

    setForgotPasswordState("loading");

    try {
      await pb.collection("users").requestPasswordReset(email);
      setForgotPasswordState("success");
    } catch (error: unknown) {
      // Do not reveal account existence; only surface technical failures.
      if (isTechnicalResetError(error)) {
        setForgotPasswordState("error");
        return;
      }

      setForgotPasswordState("success");
    }

    if (forgotPasswordCloseTimeoutRef.current !== null) {
      window.clearTimeout(forgotPasswordCloseTimeoutRef.current);
    }

    forgotPasswordCloseTimeoutRef.current = window.setTimeout(() => {
      setForgotDialogOpen(false);
      setForgotPasswordState("idle");
      forgotPasswordCloseTimeoutRef.current = null;
    }, 3000);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signInLoading) return;

    setSignInLoading(true);
    try {
      const { error } = await signIn(signInData.email, signInData.password);
      if (!error) {
        navigate("/");
      }
    } catch (error) {
      console.error("Sign in error:", error);
    } finally {
      setSignInLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (googleSignInLoading) return;

    setGoogleSignInLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (!error) {
        navigate("/");
      }
    } catch (error) {
      console.error("Google sign in error:", error);
    } finally {
      setGoogleSignInLoading(false);
    }
  };

  const handleOpenOtpFlow = () => {
    setShowOtpFlow(true);
    setOtpStep("request");
    setOtpId(null);
    setOtpData((prev) => ({
      email: signInData.email.trim() || prev.email,
      code: "",
    }));
  };

  const handleOtpRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpRequestLoading) return;

    const email = otpData.email.trim().toLowerCase();
    if (!email) return;

    setOtpRequestLoading(true);
    try {
      const { error, otpId: newOtpId } = await requestOtp(email);
      if (!error && newOtpId) {
        setOtpId(newOtpId);
        setOtpStep("verify");
        setOtpData((prev) => ({ ...prev, email, code: "" }));
      }
    } catch (error) {
      console.error("OTP request error:", error);
    } finally {
      setOtpRequestLoading(false);
    }
  };

  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpVerifyLoading || !otpId) return;

    setOtpVerifyLoading(true);
    try {
      const { error } = await signInWithOtp(otpId, otpData.code);
      if (!error) {
        navigate("/");
      }
    } catch (error) {
      console.error("OTP sign in error:", error);
    } finally {
      setOtpVerifyLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signUpLoading) return;

    // Validation
    if (signUpData.password !== signUpData.confirmPassword) {
      return;
    }

    if (signUpData.password.length < 6) {
      return;
    }

    setSignUpLoading(true);
    try {
      const { error } = await signUp(signUpData.email, signUpData.password, signUpData.displayName);
      if (!error) {
        // Redirection geree automatiquement si session creee
      }
    } catch (error) {
      console.error("Sign up error:", error);
    } finally {
      setSignUpLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-muted rounded mb-4"></div>
          <div className="h-64 w-96 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-nature p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1
            className="text-3xl font-heading font-bold text-primary cursor-pointer hover:text-primary-dark transition-colors"
            onClick={() => navigate("/")}
          >
            Mouv'Minute
          </h1>
          <p className="text-muted-foreground">Votre compagnon bien-etre au travail</p>
        </div>

        <Card className="shadow-glow">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-xl font-heading">Bienvenue</CardTitle>
            <CardDescription>Connectez-vous ou creez votre compte pour commencer</CardDescription>
          </CardHeader>

          <CardContent>
            <Tabs defaultValue="signin" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Connexion</TabsTrigger>
                <TabsTrigger value="signup">Inscription</TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="space-y-4">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signin-email"
                        type="email"
                        placeholder="votre@email.com"
                        value={signInData.email}
                        onChange={(e) => setSignInData((prev) => ({ ...prev, email: e.target.value }))}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Mot de passe</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signin-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="********"
                        value={signInData.password}
                        onChange={(e) =>
                          setSignInData((prev) => ({ ...prev, password: e.target.value }))
                        }
                        className="pl-10 pr-10"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="text-right">
                    <Button
                      type="button"
                      variant="link"
                      className="h-auto p-0 text-xs text-muted-foreground"
                      onClick={() => {
                        setForgotPasswordEmail(signInData.email.trim());
                        setForgotPasswordState("idle");
                        handleForgotDialogOpenChange(true);
                      }}
                    >
                      {"Mot de passe oubli\u00E9 ?"}
                    </Button>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-primary hover:bg-primary-dark text-primary-foreground"
                    disabled={signInLoading}
                  >
                    {signInLoading ? "Connexion..." : "Se connecter"}
                  </Button>
                </form>

                <div className="text-center text-sm text-muted-foreground">&mdash; ou &mdash;</div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2"
                  onClick={handleGoogleSignIn}
                  disabled={googleSignInLoading}
                >
                  <GoogleLogo />
                  <span>
                    {googleSignInLoading ? "Connexion Google..." : "Se connecter avec Google"}
                  </span>
                </Button>

                <Separator />

                <div className="text-center">
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto p-0 text-sm"
                    onClick={() => {
                      if (showOtpFlow) {
                        setShowOtpFlow(false);
                        return;
                      }
                      handleOpenOtpFlow();
                    }}
                  >
                    {showOtpFlow ? "Utiliser mon mot de passe" : "Connexion sans mot de passe"}
                  </Button>
                </div>

                {showOtpFlow && (
                  <div className="space-y-4 rounded-lg border border-border/70 bg-background/60 p-4">
                    <p className="text-sm font-medium">Recevoir un lien de connexion par email</p>

                    {otpStep === "request" ? (
                      <form onSubmit={handleOtpRequest} className="space-y-3">
                        <div className="space-y-2">
                          <Label htmlFor="otp-email">Email</Label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              id="otp-email"
                              type="email"
                              placeholder="votre@email.com"
                              value={otpData.email}
                              onChange={(e) =>
                                setOtpData((prev) => ({ ...prev, email: e.target.value }))
                              }
                              className="pl-10"
                              required
                            />
                          </div>
                        </div>

                        <Button type="submit" className="w-full" disabled={otpRequestLoading}>
                          {otpRequestLoading ? "Envoi..." : "Envoyer le code OTP"}
                        </Button>
                      </form>
                    ) : (
                      <form onSubmit={handleOtpVerify} className="space-y-3">
                        <div className="space-y-2">
                          <Label htmlFor="otp-code">Code OTP recu par email</Label>
                          <Input
                            id="otp-code"
                            type="text"
                            autoComplete="one-time-code"
                            placeholder="Entrez le code OTP"
                            value={otpData.code}
                            onChange={(e) =>
                              setOtpData((prev) => ({
                                ...prev,
                                code: e.target.value.replace(/\s+/g, ""),
                              }))
                            }
                            required
                          />
                        </div>

                        <Button type="submit" className="w-full" disabled={otpVerifyLoading}>
                          {otpVerifyLoading ? "Connexion..." : "Valider le code OTP"}
                        </Button>

                        <Button
                          type="button"
                          variant="link"
                          className="h-auto p-0 text-xs text-muted-foreground"
                          onClick={() => {
                            setOtpStep("request");
                            setOtpId(null);
                            setOtpData((prev) => ({ ...prev, code: "" }));
                          }}
                        >
                          Modifier l'email ou renvoyer un code
                        </Button>
                      </form>
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="signup" className="space-y-4">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Nom d'affichage (optionnel)</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="Votre nom"
                        value={signUpData.displayName}
                        onChange={(e) =>
                          setSignUpData((prev) => ({ ...prev, displayName: e.target.value }))
                        }
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="votre@email.com"
                        value={signUpData.email}
                        onChange={(e) =>
                          setSignUpData((prev) => ({ ...prev, email: e.target.value }))
                        }
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Mot de passe</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="********"
                        value={signUpData.password}
                        onChange={(e) =>
                          setSignUpData((prev) => ({ ...prev, password: e.target.value }))
                        }
                        className="pl-10 pr-10"
                        minLength={6}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Minimum 6 caracteres</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm">Confirmer le mot de passe</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-confirm"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="********"
                        value={signUpData.confirmPassword}
                        onChange={(e) =>
                          setSignUpData((prev) => ({ ...prev, confirmPassword: e.target.value }))
                        }
                        className="pl-10 pr-10"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    {signUpData.password !== signUpData.confirmPassword && signUpData.confirmPassword && (
                      <p className="text-xs text-destructive">Les mots de passe ne correspondent pas</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-accent hover:bg-accent-light text-accent-foreground"
                    disabled={signUpLoading || signUpData.password !== signUpData.confirmPassword}
                  >
                    {signUpLoading ? "Inscription..." : "Creer mon compte"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Dialog open={forgotDialogOpen} onOpenChange={handleForgotDialogOpenChange}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{"R\u00E9initialiser votre mot de passe"}</DialogTitle>
              <DialogDescription>
                {"Entrez votre email, vous recevrez un lien de r\u00E9initialisation."}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="forgot-email">Email</Label>
                <Input
                  id="forgot-email"
                  type="email"
                  placeholder="votre@email.com"
                  value={forgotPasswordEmail}
                  onChange={(e) => setForgotPasswordEmail(e.target.value)}
                  disabled={forgotPasswordState === "loading"}
                  required
                />
              </div>

              {forgotPasswordState === "success" && (
                <Alert className="border-emerald-500/40 bg-emerald-50 text-emerald-800">
                  <AlertDescription>
                    {"Email envoy\u00E9 ! V\u00E9rifiez votre bo\u00EEte mail."}
                  </AlertDescription>
                </Alert>
              )}

              {forgotPasswordState === "error" && (
                <Alert variant="destructive">
                  <AlertDescription>{"Une erreur est survenue, r\u00E9essayez."}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={forgotPasswordState === "loading"}
              >
                {forgotPasswordState === "loading" ? "Envoi..." : "Envoyer le lien"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        <Card className="bg-secondary/30">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">
              En vous inscrivant, vous acceptez de recevoir des conseils de prevention
              pour ameliorer votre bien-etre au travail.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
