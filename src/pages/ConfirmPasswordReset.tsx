import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { pb } from "@/lib/pocketbase";

type ConfirmResetState = "idle" | "loading" | "success" | "error";

const isExpiredResetTokenError = (error: unknown): boolean => {
  const message =
    typeof error === "object" && error !== null
      ? [
          "message" in error ? (error as { message?: unknown }).message : null,
          "response" in error &&
          typeof (error as { response?: unknown }).response === "object" &&
          (error as { response?: { message?: unknown } }).response !== null
            ? (error as { response?: { message?: unknown } }).response?.message
            : null,
        ]
          .filter((part): part is string => typeof part === "string")
          .join(" ")
          .toLowerCase()
      : "";

  const hasTokenKeyword = message.includes("token");
  const hasExpiredKeyword = message.includes("expired") || message.includes("invalid");

  return hasTokenKeyword && hasExpiredKeyword;
};

export default function ConfirmPasswordReset() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const token = searchParams.get("token")?.trim() ?? "";
  const [formData, setFormData] = useState({
    password: searchParams.get("password") ?? "",
    passwordConfirm: searchParams.get("passwordConfirm") ?? "",
  });
  const [state, setState] = useState<ConfirmResetState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [isExpiredToken, setIsExpiredToken] = useState(false);
  const redirectTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!token) {
      navigate("/auth", { replace: true });
    }
  }, [token, navigate]);

  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current !== null) {
        window.clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state === "loading" || !token) return;

    if (formData.password.length < 8) {
      setState("error");
      setIsExpiredToken(false);
      setErrorMessage("Le mot de passe doit contenir au moins 8 caract\u00E8res.");
      return;
    }

    if (formData.password !== formData.passwordConfirm) {
      setState("error");
      setIsExpiredToken(false);
      setErrorMessage("Les mots de passe ne correspondent pas.");
      return;
    }

    setState("loading");
    setErrorMessage("");
    setIsExpiredToken(false);

    try {
      await pb
        .collection("users")
        .confirmPasswordReset(token, formData.password, formData.passwordConfirm);

      setState("success");
      if (redirectTimeoutRef.current !== null) {
        window.clearTimeout(redirectTimeoutRef.current);
      }
      redirectTimeoutRef.current = window.setTimeout(() => {
        navigate("/auth", { replace: true });
      }, 2000);
    } catch (error: unknown) {
      setState("error");

      if (isExpiredResetTokenError(error)) {
        setIsExpiredToken(true);
        setErrorMessage(
          "Ce lien a expir\u00E9. Demandez un nouveau lien depuis la page de connexion."
        );
        return;
      }

      setIsExpiredToken(false);
      setErrorMessage("Une erreur est survenue, r\u00E9essayez.");
    }
  };

  if (!token) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-nature p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-glow">
          <CardHeader className="text-center space-y-2">
            <CardTitle className="text-xl font-heading">Nouveau mot de passe</CardTitle>
            <CardDescription>
              {"Choisissez un nouveau mot de passe puis validez la mise \u00E0 jour."}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-password">Nouveau mot de passe</Label>
                <Input
                  id="reset-password"
                  type="password"
                  minLength={8}
                  placeholder={"Minimum 8 caract\u00E8res"}
                  value={formData.password}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      password: e.target.value,
                    }))
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reset-password-confirm">Confirmer le mot de passe</Label>
                <Input
                  id="reset-password-confirm"
                  type="password"
                  placeholder="Retapez le mot de passe"
                  value={formData.passwordConfirm}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      passwordConfirm: e.target.value,
                    }))
                  }
                  required
                />
              </div>

              {state === "success" && (
                <Alert className="border-emerald-500/40 bg-emerald-50 text-emerald-800">
                  <AlertDescription>
                    {"Mot de passe mis \u00E0 jour ! Redirection vers la connexion..."}
                  </AlertDescription>
                </Alert>
              )}

              {state === "error" && (
                <Alert variant="destructive">
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={state === "loading"}>
                {state === "loading"
                  ? "Mise a jour..."
                  : "Mettre \u00E0 jour le mot de passe"}
              </Button>
            </form>

            {isExpiredToken && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => navigate("/auth")}
              >
                Retour vers /auth
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
