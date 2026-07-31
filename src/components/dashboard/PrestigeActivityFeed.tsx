import { Award, Crown, Gauge, Milestone } from "lucide-react";
import { Link } from "react-router-dom";
import { AnimatedCard } from "@/components/common/AnimatedCard";
import { ProfileAvatar } from "@/components/common/ProfileAvatar";
import { SectionHeading } from "@/components/common/SectionHeading";
import { useEffectivePublicData } from "@/hooks/useEffectivePublicData";
import { formatDate, formatTime } from "@/utils/format";

const icons = { world_record: Crown, personal_best: Gauge, badge: Award, group_milestone: Milestone };

export function PrestigeActivityFeed() {
  const { data } = useEffectivePublicData();
  return (
    <section>
      <SectionHeading eyebrow="Nur was zählt" title="Liga-Momente" />
      <AnimatedCard className="p-5 sm:p-7" hover={false}>
        <ol className="divide-y divide-white/[0.06]">
          {data.activities.length === 0 && <li className="py-12 text-center text-sm text-white/35">Noch keine besonderen Liga-Momente.</li>}
          {data.activities.slice(0, 8).map((activity) => {
            const Icon = icons[activity.type];
            const content = (
              <div className="flex items-start gap-3 py-4">
                {activity.playerId && activity.playerName ? (
                  <ProfileAvatar id={activity.playerId} name={activity.playerName} url={activity.avatarUrl} className="size-10" />
                ) : <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gold-400/10 text-gold-300"><Icon className="size-4" /></span>}
                <div className="min-w-0 flex-1"><p className="font-bold text-white/85">{activity.title}</p><p className="mt-1 text-xs leading-relaxed text-white/40">{activity.description}</p><p className="mt-2 text-[10px] uppercase tracking-wider text-white/25">{formatDate(activity.occurredAt.slice(0, 10))}{activity.eventName ? ` · ${activity.eventName}` : ""}</p></div>
                {activity.timeHundredths != null && <p className="font-display text-xl font-black text-gold-300">{formatTime(activity.timeHundredths / 100)}</p>}
              </div>
            );
            return <li key={activity.id}>{activity.eventId ? <Link to={`/events/${activity.eventId}`} className="block rounded-xl transition hover:bg-white/[0.025] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400">{content}</Link> : content}</li>;
          })}
        </ol>
      </AnimatedCard>
    </section>
  );
}
