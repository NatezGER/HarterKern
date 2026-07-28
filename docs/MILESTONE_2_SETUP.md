# Milestone 2 – Supabase Core

## Überblick

Der Frontend-Datenfluss lautet:

```text
Supabase → Services → PublicData/Admin Hooks → Pages → UI-Komponenten
```

UI-Komponenten führen keine freien Supabase-Abfragen aus. Alle Abfragen und
Mutationen liegen unter `src/services/`.

## PR 6A – gemeinsame Datenbasis

PR 6A erweitert den Datenfluss zu einer einzigen autoritativen Quelle:

```text
Supabase → dataPlatformRepository → DataPlatformProvider → Public-/Live-Adapter → UI
```

Die Migrationen `202607280005` bis `202607280008` ergänzen:

- stabile Legacy-Import-IDs für Spieler, Events und Versuche,
- explizite Eventteilnehmer in `event_participants`,
- Eventabschlussgrund und gespeicherten Sieger,
- eventlose Einzelversuche sowie den AK-Wert pro Versuch,
- idempotente Sync-Funktionen für den bestehenden Live-/Management-Workflow,
- Realtime-Publikation für `players`, `events`, `attempts` und
  `event_participants`,
- aktualisierte, gemeinsam genutzte Ranking-, Rekord- und Statistik-Views.

Vor dem Deployment müssen diese vier neuen Migrationen in Dateireihenfolge
angewendet werden. Lokale PR-5-Daten aus `harter-kern-live-event-v1` oder
`harter-kern-live-event-v2` werden anschließend einmalig importiert. Erst nach
vollständig erfolgreichem Import setzt die App den Marker
`harter-kern-pr6a-supabase-migrated` und entfernt die alten Quellschlüssel.
Legacy-IDs und eindeutige Indizes machen einen abgebrochenen Wiederholungsversuch
idempotent.

Supabase bleibt nach dem ersten Load maßgeblich. Die App legt keine lokalen
Spieler-, Event-, Versuch- oder Hall-of-Fame-Overlays mehr darüber.

### Realtime und Refetch

Eine zentrale Subscription beobachtet Insert, Update und Delete der vier
gemeinsamen Tabellen. Jede Meldung löst einen entprellten vollständigen Refetch
aus. Zusätzlich wird bei Fensterfokus, `visibilitychange`, beim Öffnen der
Live-Seite und während eines aktiven Events alle 15 Sekunden aktualisiert.
Subscriptions und Timer werden beim Unmount entfernt.

### Sicherheitsgrenze ohne Login

RLS bleibt aktiv. `players`, `events` und freigegebene, nicht gelöschte
`attempts` sind wie zuvor öffentlich lesbar; `event_participants` ist ebenfalls
öffentlich lesbar. Direkte Tabellen-Schreibrechte für anonyme Clients werden
nicht ergänzt.

Damit der bereits vorhandene PR-5-Live- und Verwaltungsworkflow ohne echtes
Login geräteübergreifend funktioniert, dürfen `anon` und `authenticated` die
neuen `sync_*`-Security-Definer-Funktionen ausführen. Diese Funktionen validieren
Eingaben und erhalten Constraints, stellen aber **keine echte
Benutzerautorisierung** dar. Jeder Client mit dem öffentlichen Anon-Key kann
diese Workflows aufrufen. Eine belastbare Zugriffskontrolle erfordert einen
späteren Authentifizierungs-PR; bis dahin darf die Oberfläche nicht als
sicherer Adminbereich betrachtet werden.

## Datenbankschema

Die versionierten Migrationen liegen unter `supabase/migrations/`:

1. `202607270001_core_schema.sql`
   - `players`, `events`, `attempts`
   - `admin_roles`, `rate_limit_entries`, `merge_history`
   - Enums, Constraints, Indizes und Zeitstempel-Trigger
2. `202607270002_security_and_functions.sql`
   - RLS-Policies
   - Admin-Erkennung
   - Eventstart/-ablauf
   - öffentliche Einreichung mit Rate Limit
   - transaktionales Zusammenführen von Spielern
3. `202607270003_public_views.sql`
   - Hall of Fame mit `dense_rank`
   - Event-Sieger inklusive geteilter Siege
   - Weltrekordprogression
   - globale, Spieler- und Event-Grundstatistiken

Zeiten werden als positive Integer in Hundertstelsekunden gespeichert.
`206` entspricht `2,06 Sekunden`. DNF und Zeitwert schließen sich über einen
Check-Constraint gegenseitig aus.

Es werden keine Ranglisten- oder Rekordresultate dauerhaft gespeichert.
Views berechnen sie aus den aktuell gültigen Daten. Änderungen, Soft-Deletes,
AK-Umschaltungen und Zusammenführungen wirken dadurch rückwirkend.

## Supabase-Projekt einrichten

Es wurden keine Projektwerte oder Zugangsdaten erzeugt. Folgende Schritte sind
im eigenen Supabase-Projekt erforderlich:

1. Ein Supabase-Projekt anlegen.
2. Supabase CLI installieren und anmelden.
3. Repository mit dem Projekt verbinden:

   ```bash
   supabase link --project-ref <PROJECT_REF>
   supabase db push
   ```

   Alternativ können die Migrationen in Dateireihenfolge im SQL-Editor
   ausgeführt werden.

4. Optional die Milestone-1-Testdaten einmalig importieren:

   ```bash
   supabase db reset
   ```

   Lokal führt `db reset` Migrationen und `supabase/seed.sql` aus. Für ein
   bestehendes Remote-Projekt `supabase/seed.sql` genau einmal im SQL-Editor
   ausführen. Alle Seed-IDs sind deterministisch und `ON CONFLICT` verhindert
   Duplikate.

## Genau einen Admin anlegen

1. Unter **Authentication → Users** genau einen Benutzer mit der gewünschten
   Admin-E-Mail und einem sicheren Passwort anlegen. Dieses Passwort ist der
   in der Oberfläche eingegebene Admin-Code.
2. Die Benutzer-UUID kopieren und einmalig im SQL-Editor ausführen:

   ```sql
   insert into public.admin_roles (user_id)
   values ('<AUTH-USER-UUID>');
   ```

3. Öffentliche Registrierung unter **Authentication → Providers → Email**
   deaktivieren. Die App bietet selbst keine Registrierung.

Die Admin-E-Mail ist kein Secret und wird als `VITE_ADMIN_EMAIL` konfiguriert.
Der Code beziehungsweise das Passwort wird nie gebündelt oder committed. Eine
Supabase-Session wird vom offiziellen Client gespeichert und kann per Logout
beendet werden.

## Row Level Security

- `players` und `events`: öffentlich lesbar.
- `attempts`: öffentlich nur `approved` und nicht soft-gelöscht lesbar.
- Direkte öffentliche Inserts/Updates/Deletes sind nicht erlaubt.
- Öffentliche Einreichungen laufen ausschließlich über
  `submit_public_attempt`; der Security-Definer setzt immer `pending`.
- Nur ein Benutzer mit Eintrag in `admin_roles` darf Admin-Policies nutzen.
- Admin-Schreibrechte sind in PostgreSQL/RLS abgesichert und nicht nur über
  ausgeblendete Schaltflächen.
- `rate_limit_entries`, `admin_roles` und `merge_history` sind öffentlich
  nicht lesbar.
- Es wird kein Service-Role-Key im Browser verwendet.

## Öffentliche Einreichung und Rate Limit

`submit_public_attempt`:

1. validiert Spieler und Zeit/DNF erneut in PostgreSQL,
2. hasht die anonyme Client-Kennung mit SHA-256,
3. prüft unter einer Transaktionssperre maximal 50 Einreichungen in 24 Stunden,
4. schließt abgelaufene Events,
5. erstellt bei Bedarf atomar ein neues 30-Stunden-Event,
6. speichert den Versuch als `pending`.

Die Client-Kennung wird lokal erzeugt; nur ihr Hash wird gespeichert. Dadurch
werden keine unnötigen personenbezogenen Daten benötigt. Einschränkung:
Gezieltes Löschen des Browser-Speichers oder rotierende Clients können dieses
einfache pseudonyme Limit umgehen. Für exponierte Installationen sollte eine
Edge Function zusätzlich IP-/Captcha-basierte Signale verwenden.

## Umgebungsvariablen

Lokal in `.env.local`, auf Vercel unter **Project Settings → Environment
Variables**:

```text
VITE_SUPABASE_URL=<Project URL>
VITE_SUPABASE_ANON_KEY=<Publishable/anon key>
VITE_ADMIN_EMAIL=<Admin email>
```

Danach das Vercel-Deployment neu auslösen. `vercel.json` enthält bereits den
SPA-Rewrite für direkte Unterseiten.

## Testen

Frontend:

```bash
npm install
npm run lint
npm run test
npm run build
npm run dev
```

Datenbanktests mit lokalem Supabase/Docker:

```bash
supabase start
supabase db reset
supabase test db
```

Die pgTAP-Tests liegen in `supabase/tests/database/milestone2.sql`.

## Bekannte Einschränkungen

- Ohne ein verbundenes Supabase-Projekt können Auth, RPCs und RLS lokal nicht
  end-to-end ausgeführt werden.
- Das Rate Limit ist datenbankseitig durchgesetzt, basiert aber auf einer
  rotierbaren pseudonymen Client-Kennung.
- Badges und tiefe Statistikdiagramme sind absichtlich nicht Teil dieses
  Milestones.
