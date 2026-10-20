-- Criação do bucket público de mídia
insert into storage.buckets (id, name, public)
values ('wedding-media', 'wedding-media', true)
on conflict (id) do nothing;

-- Políticas de Storage para convidados enviarem e visualizarem mídias
create policy "Leitura publica wedding-media"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'wedding-media');

create policy "Upload publico wedding-media"
on storage.objects for insert
to anon, authenticated
with check (bucket_id = 'wedding-media');

-- Tabela principal de postagens
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  guest_name text not null,
  media_url text not null,
  media_type text not null check (media_type in ('photo', 'video', 'boomerang')),
  duration_ms integer not null default 5000,
  has_animated_overlay boolean not null default false,
  overlay_data jsonb null,
  visible boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_posts_created_at on public.posts (created_at desc);
create index if not exists idx_posts_visible on public.posts (visible);

alter table public.posts enable row level security;

create policy "Convidados podem ler posts"
on public.posts for select
to anon, authenticated
using (true);

create policy "Convidados podem criar posts"
on public.posts for insert
to anon, authenticated
with check (true);

-- Ativar Realtime na tabela posts
alter publication supabase_realtime add table public.posts;
