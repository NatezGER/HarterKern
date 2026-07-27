import { brand } from "@/constants/navigation";

export function Footer() {
  return (
    <footer className="border-t border-white/[0.07]">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-2 px-5 py-8 text-xs text-white/30 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
        <p>© 2025 {brand.name} — {brand.subtitle}</p>
        <p className="uppercase tracking-[0.16em]">Geschwindigkeit. Präzision. Legenden.</p>
      </div>
    </footer>
  );
}
