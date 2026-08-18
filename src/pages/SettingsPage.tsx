import { PageHeader } from "@/components/common/PageHeader";
import { ManagementPanel } from "@/components/management/ManagementPanel";
import { SectionHeading } from "@/components/common/SectionHeading";

export function SettingsPage() {
  return (
    <div className="space-y-10">
      <PageHeader eyebrow="Administration" title="Einstellungen" description="Geschützte Verwaltung für Versuche, Events, Spieler und Auszeichnungen." />
      <section>
        <SectionHeading eyebrow="Geschützter Bereich" title="Administration" />
        <ManagementPanel />
      </section>
    </div>
  );
}
