import { Delete } from "lucide-react";
import { appendTimeKey } from "@/lib/numericTimeInput";

const keys = ["7", "8", "9", "4", "5", "6", "1", "2", "3", "back", "0", ","];

export function NumericTimePad({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2" aria-label="Ziffernfeld">
      {keys.map((key) => (
        <button
          key={key}
          type="button"
          aria-label={key === "back" ? "Letzte Ziffer löschen" : key}
          onClick={() => onChange(appendTimeKey(value, key))}
          className="grid h-16 place-items-center rounded-2xl border border-white/10 bg-white/[0.045] font-display text-2xl font-black transition hover:border-gold-400/40 hover:bg-gold-400/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 active:scale-95"
        >
          {key === "back" ? <Delete className="size-6" /> : key}
        </button>
      ))}
    </div>
  );
}
