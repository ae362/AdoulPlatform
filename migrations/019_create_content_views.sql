-- Content view tracking (unique viewers per content)

create table if not exists content_views (
  id bigserial primary key,
  content_key text not null,
  viewer_key text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists content_views_unique on content_views (content_key, viewer_key);
create index if not exists content_views_content_key_idx on content_views (content_key);

create or replace view content_view_counts as
select
  content_key,
  count(*)::int as view_count
from content_views
group by content_key;

