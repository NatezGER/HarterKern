// Page composition only: shared metric keys and registry remain intact.
export const performanceSections = [
  { id: "speed", title: "I. Geschwindigkeit & Bestzeiten", keys: ["fastest", "average", "median", "fastest-five", "best-five-window", "thresholds"] },
  { id: "consistency", title: "II. Konstanz & Zuverlässigkeit", keys: ["consistency", "dnf", "streak"] },
  { id: "precision", title: "III. Präzision & Zeitkuriositäten", keys: ["near-repeat", "matrix-glitch", "smooth", "common"] },
  { id: "volume", title: "IV. Aktivität & Volumen", keys: ["valid", "event-max", "two-in-sixty-total", "two-in-sixty-best"] },
  { id: "start", title: "V. Start & Endspurt", keys: ["fastest-first", "fast-starter", "performance-endspurt"] },
  // VI has no PR-A metrics. Do not render a future placeholder.
  { id: "leadership", title: "VII. Event-Führung & Rivalries", keys: ["lead-time", "takeovers", "performance-rivalry-events", "performance-chaos-takeovers"] },
  { id: "records", title: "VIII. Rekorde & Karriere", keys: ["pb-jump", "wr-reign", "wr-improvements", "wr-jump"] },
] as const;

export const timeThresholds = [
  { key: "sub5", label: "5,00" }, { key: "sub4", label: "4,00" },
  { key: "sub3", label: "3,00" }, { key: "sub25", label: "2,50" },
  { key: "sub2", label: "2,00" },
] as const;
