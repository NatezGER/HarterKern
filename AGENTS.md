# Arbeitsregeln für Codex

## Verbindliche Grundlage

- Repository und aktueller `main`-Stand sind die Wahrheit.
- Vor jeder Arbeit zuerst `docs/CURRENT_STATUS.md`, `docs/MODULES.md` und
  `docs/ARCHITECTURE.md` lesen.
- Nur das im Auftrag genannte Modul untersuchen.
- Den Scope nur bei einer belegten direkten Abhängigkeit erweitern.
- Keine ungefragten Features oder Refactorings umsetzen.
- Neue Ideen ausschließlich als Backlog-Hinweis melden.

## Arbeitsphasen

- Pro Prompt nur eine Arbeitsphase bearbeiten.
- Analyse, Implementierung, Tests, Browserprüfung und Release nicht ungefragt
  kombinieren.
- Browser, Vercel, Commit, Push und Pull Request nur ausführen, wenn die
  jeweilige Phase ausdrücklich verlangt wurde.
- Aufgabenstellung nicht wiederholen; Ergebnisse kompakt melden.

## Prüfungen

- Standardmäßig keine vollständige Testsuite ausführen.
- Standardprüfung während der Entwicklung: `npm run check:quick`.
- `npm run check:full` nur bei ausdrücklich angeforderter vollständiger
  Verifikation oder Releaseprüfung.
- Gezielt vorhandene Testpfade stehen in `docs/MODULES.md`.
- Keine vollständigen erfolgreichen Logs ausgeben.
- Bei Fehlern nur relevante Fehlermeldung und betroffenen Bereich nennen.

## Datenbank und Daten

- Produktiv angewendete Migrationen niemals verändern.
- Neue Datenbankänderungen ausschließlich über additive Migrationen.
- `sources/` niemals verändern.
- Keine Test- oder Produktionsdaten erfinden.

## Statusangaben

- Klar zwischen lokal geändert, committed, gepusht, Pull Request erstellt,
  Preview deployt, gemergt und produktiv live unterscheiden.
