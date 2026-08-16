-- P10B: optional custom presentation assets for existing awards.

create table public.award_assets (
  asset_id text primary key check (
    asset_id ~ '^medal:podium:(gold|silver|bronze)$'
    or asset_id ~ '^badge:[a-z0-9][a-z0-9-]{1,119}$'
    or asset_id ~ '^trophy:(season|denmark):2026:(gold|silver|bronze)$'
  ),
  asset_type text not null check (asset_type in ('medal', 'badge', 'trophy')),
  storage_path text not null unique check (
    storage_path ~ '^(medal|badge|trophy):[a-z0-9:-]+/[0-9a-f-]{36}\.(png|webp)$'
  ),
  mime_type text not null check (mime_type in ('image/png', 'image/webp')),
  size_bytes integer not null check (size_bytes between 1 and 2097152),
  width integer not null check (width >= 512),
  height integer not null check (height >= 512 and height = width),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint award_assets_type_matches_id check (
    asset_type = split_part(asset_id, ':', 1)
  )
);

alter table public.award_assets enable row level security;

create policy award_assets_public_read on public.award_assets
for select to anon, authenticated using (true);

grant select on public.award_assets to anon, authenticated;

insert into storage.buckets (
  id, name, public, file_size_limit, allowed_mime_types
) values (
  'award-assets',
  'award-assets',
  true,
  2097152,
  array['image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy award_assets_public_storage_read on storage.objects
for select to anon, authenticated
using (bucket_id = 'award-assets');

-- No public insert, update or delete policy is created. Mutations are performed
-- only by the existing admin-media Edge Function with its service-role client.
