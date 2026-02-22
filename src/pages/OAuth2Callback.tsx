import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { pb } from "@/lib/pocketbase";
import { useAuth } from "@/contexts/AuthContext";

const OAUTH2_CALLBACK_URL = "https://app1.crozier-pierre.fr/oauth2-callback";

const clearOAuth2SessionStorage = () => {
  sessionStorage.removeItem("pb_oauth2_state");
  sessionStorage.removeItem("pb_oauth2_verifier");
  sessionStorage.removeItem("pb_oauth2_provider");
};

export default function OAuth2Callback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setUserFromRecord } = useAuth();
  const hasHandledRef = useRef(false);

  useEffect(() => {
    if (hasHandledRef.current) return;
    hasHandledRef.current = true;

    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const storedState = sessionStorage.getItem("pb_oauth2_state");
    const codeVerifier = sessionStorage.getItem("pb_oauth2_verifier");
    const provider = sessionStorage.getItem("pb_oauth2_provider");

    const handleCallback = async () => {
      try {
        if (!code || !state || !storedState || !codeVerifier || provider !== "google") {
          throw new Error("oauth2_data_missing");
        }

        if (state !== storedState) {
          throw new Error("oauth2_state_mismatch");
        }

        const auth = await pb.collection("users").authWithOAuth2Code(
          "google",
          code,
          codeVerifier,
          OAUTH2_CALLBACK_URL,
          { createData: {} }
        );

        setUserFromRecord(auth.record);
        navigate("/", { replace: true });
      } catch (_error: unknown) {
        navigate("/auth?error=oauth2", { replace: true });
      } finally {
        clearOAuth2SessionStorage();
      }
    };

    void handleCallback();
  }, [navigate, searchParams, setUserFromRecord]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="flex items-center gap-3 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Connexion en cours...</span>
      </div>
    </div>
  );
}
