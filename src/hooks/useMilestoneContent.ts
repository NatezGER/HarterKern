import { useEffect, useState } from "react";
import { getMilestoneContent, milestoneContentCache, MILESTONE_CONTENT_CHANGED, type MilestoneContentMap } from "@/services/milestoneContentService";

export function useMilestoneContent() {
  const [data, setData] = useState<MilestoneContentMap>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    const read = () => {
      void getMilestoneContent().then(value => { if (active) { setData(value); setError(""); } })
        .catch(() => { if (active) setError("Meilenstein-Inhalte konnten nicht geladen werden."); })
        .finally(() => { if (active) setLoading(false); });
    };
    const refresh = () => { if (milestoneContentCache.shouldRefresh("catalog")) read(); };
    read();
    window.addEventListener(MILESTONE_CONTENT_CHANGED, read);
    window.addEventListener("focus", refresh);
    return () => { active = false; window.removeEventListener(MILESTONE_CONTENT_CHANGED, read); window.removeEventListener("focus", refresh); };
  }, []);
  return { data, error, loading };
}
