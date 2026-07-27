# Milestone 2 – Supabase Core

## Überblick

Der Frontend-Datenfluss lautet:

```text
Supabase → Services → PublicData/Admin Hooks → Pages → UI-Komponenten
```

UI-Komponenten führen keine freien Supabase-Abfragen aus. Alle Abfragen und
Mutationen liegen unter `src/services/`.

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
