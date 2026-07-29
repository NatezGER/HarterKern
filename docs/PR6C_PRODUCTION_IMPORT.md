# PR 6C production import

Migration `202607290012_pr6c_production_data.sql` replaces all existing player,
event, participant and attempt records with the verified production dataset.
Authentication users and `admin_roles` are retained.

## Backup before applying

Create a database-only backup from the Supabase dashboard or with the CLI:

```bash
supabase db dump --linked --data-only --file pr6c-pre-import-data.sql
```

Store this export outside the repository. It is a rollback artifact only and
must not be used as an additional production import source.

## Expected result

- 16 permanent players
- 1 closed event (`Spieleabend 22.02.2025`)
- 17 event attempts
- 31 historical attempts
- 1 historical guest attempt (`Jan`, out of competition)
- 48 source records in total

The migration uses deterministic IDs and `legacy_source_id` values. Supabase
applies a versioned migration only once; rerunning the SQL manually produces
the same final product records rather than duplicates.
