-- Additive identity backfill only: no publication, revision increments or content edits.
begin;
create table public.site_analytics_keys (
  key text primary key check (key ~ '^[0-9a-f]{32}$'),
  kind text not null check (kind in ('stories','trunkCards')),
  legacy_id text
);
alter table public.site_analytics_keys enable row level security;
revoke all on public.site_analytics_keys from public,anon,authenticated;
-- These random constants identify only the supplied starter content.
insert into public.site_analytics_keys(key,kind,legacy_id) values
('e45fb32669c94bd890bf137b4e15aac2','stories','tathaastu'),
('2d12694a17df43d8b25c692f681f09bc','stories','mushhk'),
('f8a572bd947b4f4c813a64f2a0803abc','trunkCards','a-tale'),
('ba23169cfbc640529e81a2d19ebf850c','trunkCards','a-feature'),
('37dc61b5d5234f98af2cae10d49d65ab','trunkCards','your-gift');

create function public.baksa_key_site(doc jsonb, previous jsonb default null, legacy boolean default false)
returns jsonb language plpgsql security definer set search_path=public as $$
declare collection text; item jsonb; items jsonb; k text; seen text[];
begin
  if doc is null then return null; end if;
  foreach collection in array array['stories','trunkCards'] loop
    items := '[]'::jsonb; seen := array[]::text[];
    for item in select value from jsonb_array_elements(doc->collection) loop
      k := null;
      if not legacy then k := item->>'analyticsKey'; end if;
      if not legacy and k is not null and exists(
        select 1 from jsonb_array_elements(previous->collection) p
        where p->>'id'=item->>'id' and p->>'analyticsKey' is not null and p->>'analyticsKey'<>k
      ) then raise exception 'Editorial analytics keys cannot be changed' using errcode='22023'; end if;
      if k is not null and not exists(select 1 from site_analytics_keys a where a.key=k and a.kind=collection) then
        raise exception 'Unknown editorial analytics key. Remove it to import as new content.' using errcode='22023';
      end if;
      if k is null then
        select value->>'analyticsKey' into k from jsonb_array_elements(previous->collection)
          where value->>'id'=item->>'id' limit 1;
      end if;
      if k is null and legacy then
        select a.key into k from site_analytics_keys a where a.kind=collection and a.legacy_id=item->>'id' limit 1;
      end if;
      if k is null then
        k := replace(gen_random_uuid()::text,'-','');
        insert into site_analytics_keys values(k,collection,case when legacy then item->>'id' end);
      end if;
      if k=any(seen) then raise exception 'Duplicate editorial analytics key' using errcode='22023'; end if;
      seen := array_append(seen,k);
      items := items || jsonb_build_array((item-'analyticsKey') || jsonb_build_object('analyticsKey',k));
    end loop;
    doc := jsonb_set(doc,array[collection],items);
  end loop;
  return doc;
end $$;
revoke all on function public.baksa_key_site(jsonb,jsonb,boolean) from public,anon,authenticated;

-- Legacy IDs are used locally only during the one-time backfill to associate revisions.
-- No ID, title or hash of editable content becomes a measurement key.
do $$
declare v record;
begin
  for v in select id,document from public.site_versions order by id loop
    update public.site_versions set document=public.baksa_key_site(v.document,null,true) where id=v.id;
  end loop;
  update public.site_content set published=public.baksa_key_site(published,null,true),
    draft=public.baksa_key_site(draft,null,true);
end $$;

create function public.baksa_persist_site_keys()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  -- Runs under the same row lock / optimistic revision check as baksa_edit_site.
  if tg_op='INSERT' then
    new.draft := public.baksa_key_site(new.draft);
  elsif new.draft is distinct from old.draft then
    -- An exact historical snapshot may restore an older identity after an ID
    -- was deleted and reused. Still validate all its keys against the registry.
    if exists(select 1 from public.site_versions v where v.document=new.draft) then
      new.draft := public.baksa_key_site(new.draft);
    else
      new.draft := public.baksa_key_site(new.draft,old.draft);
    end if;
  end if;
  return new;
end $$;
revoke all on function public.baksa_persist_site_keys() from public,anon,authenticated;
create trigger site_keys_before_write before insert or update on public.site_content
for each row execute function public.baksa_persist_site_keys();
commit;
