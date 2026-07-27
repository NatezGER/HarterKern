# Harter Kern – 2 Fast 2 Drink

Premium React-Web-App für Events, Spieler, Versuche und offizielle Rekorde.

## Stack

- React, TypeScript und Vite
- Tailwind CSS und shadcn/ui-basierte Komponenten
- React Router und Framer Motion
- Supabase Auth und PostgreSQL mit Row Level Security

## Lokal starten

```bash
npm install
cp .env.example .env.local
npm run dev
```

Die drei öffentlichen Variablen in `.env.local` müssen auf ein vorbereitetes
Supabase-Projekt zeigen. Ohne Konfiguration startet die App weiterhin, zeigt
aber einen klaren Setup-Hinweis statt erfundener Daten.

## Qualität

```bash
npm run lint
npm run test
npm run build
```

Schema, Seed, Sicherheit und Deployment sind in
[docs/MILESTONE_2_SETUP.md](docs/MILESTONE_2_SETUP.md) dokumentiert.
