import { Bell, Moon, MonitorSmartphone, ShieldCheck } from "lucide-react";
import { AnimatedCard } from "@/components/common/AnimatedCard";
import { PageHeader } from "@/components/common/PageHeader";
import { ManagementPanel } from "@/components/management/ManagementPanel";
import { SectionHeading } from "@/components/common/SectionHeading";

const settingsSections = [
  { icon: Moon, title: "Darstellung", description: "Dark Theme ist für das beste Arena-Erlebnis optimiert.", status: "Aktiv" },
  { icon: Bell, title: "Benachrichtigungen", description: "Event-Updates und neue Rekorde.", status: "Vorbereitet" },
  { icon: MonitorSmartphone, title: "Anzeige", description: "Optimierte Ansichten für Mobile, Desktop und TV.", status: "Automatisch" },
  { icon: ShieldCheck, title: "Daten & Privatsphäre", description: "Spieler, Events und Versuche werden gemeinsam über Supabase synchronisiert.", status: "Supabase" },
];

export function SettingsPage() {
  return (
    <div className="space-y-10">
      <PageHeader eyebrow="Preferences" title="Einstellungen" description="Öffentliche Anzeigeoptionen und geschützte Administration für Events, Versuche und Spieler." />
      <div className="grid gap-4 md:grid-cols-2">
        {settingsSections.map(({ icon: Icon, title, description, status }, index) => (
          <AnimatedCard key={title} delay={index * 0.06} className="flex items-start gap-5 p-6">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gold-400/10 text-gold-400"><Icon className="size-5" /></span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-4">
                <h2 className="font-display text-xl font-black uppercase">{title}</h2>
                <span className="rounded-full border border-white/10 px-3 py-1 text-[9px] font-bold uppercase tracking-widest text-white/35">{status}</span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-white/40">{description}</p>
            </div>
          </AnimatedCard>
        ))}
      </div>
      <section>
        <SectionHeading eyebrow="Geschützter Bereich" title="Administration" />
        <ManagementPanel />
      </section>
    </div>
  );
}
