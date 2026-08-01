import { Button } from "@/components/ui/button";

export function PersonalBestDetailsToggle({ expanded, controls, onToggle }: { expanded: boolean; controls: string; onToggle: () => void }) {
  return <Button
    type="button"
    variant="outline"
    className="mt-4 w-full sm:hidden"
    aria-controls={controls}
    aria-expanded={expanded}
    onClick={onToggle}
  >
    {expanded ? "Einzelne Bestzeiten ausblenden" : "Einzelne Bestzeiten anzeigen"}
  </Button>;
}
