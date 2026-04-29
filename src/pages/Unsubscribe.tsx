import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Check, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Status = "validating" | "ready" | "already_unsubscribed" | "invalid" | "submitting" | "success" | "error";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export default function Unsubscribe() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<Status>("validating");
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      setErrorMsg("No unsubscribe token provided.");
      return;
    }

    (async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          { headers: { apikey: SUPABASE_ANON_KEY } }
        );
        const data = await res.json();
        if (!res.ok) {
          setStatus("invalid");
          setErrorMsg(data?.error || "Invalid or expired link.");
          return;
        }
        if (data.valid === false && data.reason === "already_unsubscribed") {
          setStatus("already_unsubscribed");
          return;
        }
        if (data.valid === true) {
          setStatus("ready");
          return;
        }
        setStatus("invalid");
      } catch (err) {
        setStatus("invalid");
        setErrorMsg("Couldn't reach the server. Try again later.");
      }
    })();
  }, [token]);

  const handleConfirm = async () => {
    if (!token) return;
    setStatus("submitting");
    try {
      const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", {
        body: { token },
      });
      if (error) throw error;
      if (data?.success) {
        setStatus("success");
      } else if (data?.reason === "already_unsubscribed") {
        setStatus("already_unsubscribed");
      } else {
        setStatus("error");
        setErrorMsg(data?.error || "Failed to process unsubscribe.");
      }
    } catch (err: any) {
      setStatus("error");
      setErrorMsg(err?.message || "Something went wrong.");
    }
  };

  return (
    <main className="min-h-[100dvh] flex items-center justify-center bg-background p-6 safe-top safe-bottom safe-x">
      <Card className="w-full max-w-md p-8 text-center space-y-6">
        <div className="flex justify-center">
          <img src="/logo.svg" alt="R@lly" className="w-16 h-16 rounded-full" />
        </div>

        {status === "validating" && (
          <>
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Checking your link…</p>
          </>
        )}

        {status === "ready" && (
          <>
            <h1 className="text-2xl font-bold">Unsubscribe from R@lly emails?</h1>
            <p className="text-muted-foreground">
              You'll stop receiving app notifications from R@lly. You can still get critical
              account emails (security, password resets).
            </p>
            <Button onClick={handleConfirm} size="lg" className="w-full">
              Confirm Unsubscribe
            </Button>
          </>
        )}

        {status === "submitting" && (
          <>
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Processing…</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Check className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">You're unsubscribed.</h1>
            <p className="text-muted-foreground">
              We won't send you app emails anymore. Catch you on the next R@lly.
            </p>
          </>
        )}

        {status === "already_unsubscribed" && (
          <>
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto">
              <Check className="w-6 h-6 text-muted-foreground" />
            </div>
            <h1 className="text-2xl font-bold">Already unsubscribed.</h1>
            <p className="text-muted-foreground">
              You're already off the list — no further action needed.
            </p>
          </>
        )}

        {(status === "invalid" || status === "error") && (
          <>
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold">Link not valid</h1>
            <p className="text-muted-foreground">{errorMsg || "This unsubscribe link is invalid or expired."}</p>
          </>
        )}
      </Card>
    </main>
  );
}
