import { ArrowLeft, Flag } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function NotFoundPage() {
  return (
    <div className="grid min-h-[65vh] place-items-center">
      <div className="max-w-xl text-center">
        <Flag className="mx-auto size-8 text-gold-400" />
        <p className="gold-text display-title mt-5 text-8xl sm:text-9xl">404</p>
        <h1 className="display-title mt-3 text-4xl sm:text-5xl">Strecke verlassen</h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-white/40">
          Diese Seite hat das Ziel nicht erreicht. Zurück ins Rennen.
        </p>
        <Button asChild className="mt-8"><Link to="/"><ArrowLeft className="size-4" /> Zum Dashboard</Link></Button>
      </div>
    </div>
  );
}
