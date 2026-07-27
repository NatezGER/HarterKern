import { KeyRound, X } from "lucide-react";
import { useState } from "react";
import { useAdmin } from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AdminLogin() {
  const { loading, error, signIn } = useAdmin();
  const [code, setCode] = useState("");
  const [visible, setVisible] = useState(true);

  if (!visible) {
    return <Button variant="outline" onClick={() => setVisible(true)}><KeyRound className="size-4" /> Admin-Bereich öffnen</Button>;
  }

  return (
    <div className="panel relative max-w-lg p-6 sm:p-8">
      <button type="button" aria-label="Admin-Login schließen" onClick={() => setVisible(false)} className="absolute right-5 top-5 text-white/35 hover:text-white">
        <X className="size-4" />
      </button>
      <KeyRound className="size-6 text-gold-400" />
      <h2 className="display-title mt-5 text-3xl">Admin-Login</h2>
      <p className="mt-2 text-sm leading-relaxed text-white/40">
        Der Code wird ausschließlich als Passwort an Supabase Auth übertragen.
      </p>
      <form
        className="mt-6 flex flex-col gap-3 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          void signIn(code);
        }}
      >
        <Input
          type="password"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="Admin-Code"
          autoComplete="current-password"
          className="rounded-xl"
        />
        <Button type="submit" disabled={!code || loading}>{loading ? "Prüfe …" : "Anmelden"}</Button>
      </form>
      {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
    </div>
  );
}
