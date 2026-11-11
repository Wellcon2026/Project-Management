-- ติดตั้งแล้ว (11/11/2026) ทั้ง public + staging ด้วย migration usage_tracking · ไฟล์นี้เป็นต้นแบบ: แทน __S__ = public / staging
-- __AUTHCHK__: public = coalesce(auth.role(),'') <> 'authenticated' · staging = false · __ANON__: public = '' · staging = ', anon' · __REVOKE_AUTH__: public = ', authenticated' · staging = ''
-- Wellcon · การใช้งานระบบ (Usage) · schema: __S__
create table if not exists __S__.usage_seen (
  email text not null, app text not null, day date not null, n int not null default 1,
  first_at timestamptz not null default now(), last_at timestamptz not null default now(), primary key (email, app, day));
alter table __S__.usage_seen enable row level security;
drop policy if exists usage_seen_none on __S__.usage_seen;
revoke all on __S__.usage_seen from anon__REVOKE_AUTH__;

-- บันทึกการเปิดใช้ (เรียกจากแอปตอนเปิด / ทุก 30 นาที) · 1 แถวต่อคน ต่อแอป ต่อวัน
create or replace function __S__.usage_touch(p_email text, p_app text) returns void
language plpgsql security definer set search_path = __S__, public as $$
declare e text := lower(trim(coalesce(p_email,''))); a text := left(regexp_replace(coalesce(p_app,'pm'),'[^a-z0-9_-]','','g'),20);
begin
  if __AUTHCHK__ then return; end if;
  if e = '' or position('@' in e) = 0 or length(e) > 120 then return; end if;
  if not exists (select 1 from __S__.accounts x where lower(x.data->>'email') = e) then return; end if;
  insert into __S__.usage_seen(email, app, day) values (e, coalesce(nullif(a,''),'pm'), (now() at time zone 'Asia/Bangkok')::date)
  on conflict (email, app, day) do update set n = __S__.usage_seen.n + 1, last_at = now();
end $$;
revoke all on function __S__.usage_touch(text,text) from public;
grant execute on function __S__.usage_touch(text,text) to authenticated__ANON__;

-- สรุปการใช้งาน (ตัวเลขเท่านั้น ไม่มีราคา / ข้อมูลดิบ) · p_days = ช่วงวันย้อนหลัง
create or replace function __S__.usage_report(p_days int) returns jsonb
language plpgsql security definer set search_path = __S__, public as $$
declare d int := greatest(1, least(coalesce(p_days,7), 90)); since timestamptz; r jsonb;
begin
  if __AUTHCHK__ then raise exception 'not allowed'; end if;
  since := now() - make_interval(days => d);
  with act as (
    select lower(updated_by) em, updated_at at_, m, project from (
      select updated_by, updated_at, 'drawings' m, project from __S__.drawings union all
      select updated_by, updated_at, 'material', project from __S__.material_log union all
      select updated_by, updated_at, 'vo', project from __S__.changes union all
      select updated_by, updated_at, 'billing', project from __S__.billing union all
      select updated_by, updated_at, 'daily', project from __S__.daily_reports union all
      select updated_by, updated_at, 'defect', project from __S__.punch_log union all
      select updated_by, updated_at, 'issues', project from __S__.issue_log union all
      select updated_by, updated_at, 'survey', project from __S__.survey_log union all
      select updated_by, updated_at, 'rfi', project from __S__.rfi_log union all
      select updated_by, updated_at, 'submittal', project from __S__.submittals union all
      select updated_by, updated_at, 'po', project from __S__.site_po union all
      select updated_by, updated_at, 'boq', project from __S__.boq union all
      select updated_by, updated_at, 'plan', project from __S__.plans union all
      select updated_by, updated_at, 'aw', project from __S__.additional_work union all
      select updated_by, updated_at, 'quote', project from __S__.quotes union all
      select updated_by, updated_at, 'memo', project from __S__.memos union all
      select updated_by, updated_at, 'qs', null from __S__.takeoff_items
    ) z where coalesce(updated_by,'') like '%@%'
    union all
    select lower(e.data->>'uid'), to_timestamp((e.data->>'ts')::bigint/1000.0), 'eng:'||coalesce(e.data->>'kind',''), e.project
      from __S__.engagement e where coalesce(e.data->>'uid','') like '%@%' and coalesce(e.data->>'ts','') ~ '^\d{12,14}$'
  ),
  seen as (select email em, app, day, n, last_at from __S__.usage_seen),
  acc as (select lower(a.data->>'email') em, coalesce(nullif(a.data->>'nick',''), a.data->>'name', a.data->>'email') nm, a.data->>'name' full_name,
      coalesce(a.data->>'roleKey','') role, coalesce(a.data->>'title','') title,
      case when jsonb_typeof(a.data->'projects')='array' then jsonb_array_length(a.data->'projects') else 0 end np,
      coalesce((a.data->>'allProj')::boolean,false) allp
    from __S__.accounts a where coalesce(a.data->>'email','') like '%@%' and coalesce((a.data->>'disabled')::boolean,false) = false),
  users as (select acc.*,
      (select max(last_at) from seen s where s.em = acc.em) last_seen,
      (select max(at_) from act x where x.em = acc.em and x.m not like 'eng:login') last_write,
      (select count(distinct day) from (select day from seen s where s.em = acc.em and s.day > (since at time zone 'Asia/Bangkok')::date
                                         union select (at_ at time zone 'Asia/Bangkok')::date from act x where x.em = acc.em and x.at_ > since) q) days,
      (select count(*) from act x where x.em = acc.em and x.at_ > since and x.m not like 'eng:login') writes,
      (select coalesce(jsonb_agg(distinct app),'[]'::jsonb) from seen s where s.em = acc.em and s.day > (since at time zone 'Asia/Bangkok')::date) apps
    from acc),
  dr as (select project, case when id ~ '^dl\d{13}$' then to_timestamp(substring(id from 3)::bigint/1000.0) else updated_at end at_ from __S__.daily_reports),
  pj as (select p.id, coalesce(p.data->>'name', p.id) nm, coalesce(p.data->>'code','') code, coalesce((p.data->>'progress')::numeric,0) prog,
      p.data->>'startISO' s, p.data->>'endISO' e, coalesce(p.data->>'health','') h
    from __S__.projects p where coalesce((p.data->>'deleted')::boolean,false)=false and coalesce((p.data->>'del')::boolean,false)=false)
  select jsonb_build_object(
    'ok', true, 'days', d, 'now', now(), 'since', since,
    'tracking_since', (select min(day) from seen),
    'users', coalesce((select jsonb_agg(jsonb_build_object('email',em,'name',nm,'full',full_name,'role',role,'title',title,'np',np,'all',allp,
        'last_seen',last_seen,'last_write',last_write,'days',days,'writes',writes,'apps',apps) order by greatest(coalesce(last_seen,'epoch'),coalesce(last_write,'epoch')) desc) from users),'[]'::jsonb),
    'modules', coalesce((select jsonb_object_agg(m, n) from (select case when m like 'eng:%' then 'log' else m end m, count(*) n from act where at_ > since group by 1) q),'{}'::jsonb),
    'apps', coalesce((select jsonb_object_agg(app, n) from (select app, count(distinct em) n from seen where day > (since at time zone 'Asia/Bangkok')::date group by 1) q),'{}'::jsonb),
    'projects', coalesce((select jsonb_agg(jsonb_build_object('id',pj.id,'name',pj.nm,'code',pj.code,'progress',pj.prog,'start',pj.s,'end',pj.e,'health',pj.h,
        'daily_days',(select count(distinct (at_ at time zone 'Asia/Bangkok')::date) from dr where dr.project=pj.id and dr.at_ > since),
        'daily_last',(select max(at_) from dr where dr.project=pj.id),
        'writes',(select count(*) from act x where x.project=pj.id and x.at_ > since),
        'people',(select count(distinct em) from act x where x.project=pj.id and x.at_ > since)) order by pj.nm) from pj),'[]'::jsonb)
  ) into r;
  return r;
end $$;
revoke all on function __S__.usage_report(int) from public;
grant execute on function __S__.usage_report(int) to authenticated__ANON__;
