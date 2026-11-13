-- =====================================================================
-- Wellcon : เข้าสู่ระบบครั้งเดียว ข้ามแอป (Wellcon PM ⇄ Wellcon Site Work / Claim)
-- ตั๋วใช้ครั้งเดียว อายุ 2 นาที — แนบไปกับลิงก์ตอนกดข้ามแอป (?wsso=) · ลิงก์ที่ถูกส่งต่อ / เปิดซ้ำ = ใช้ไม่ได้
-- รันซ้ำได้ · ไม่ลบข้อมูลอื่น
-- =====================================================================
create extension if not exists pgcrypto with schema extensions;
do $$
declare s text;
begin
  foreach s in array array['public','staging'] loop
    if not exists (select 1 from information_schema.schemata where schema_name = s) then continue; end if;
    execute format('create table if not exists %1$I.sso_tickets (t text primary key, email text not null, created_at timestamptz not null default now(), used_at timestamptz null)', s);
    execute format('alter table %1$I.sso_tickets enable row level security', s);
    execute format('revoke all on %1$I.sso_tickets from anon, authenticated', s);
    execute format($f$
      create or replace function %1$I.sso_issue(p_email text) returns text
      language plpgsql security definer set search_path = %1$I, extensions, public as $b$
      declare tk text := encode(extensions.gen_random_bytes(24), 'hex');
      begin
        if coalesce(auth.role(),'') <> 'authenticated' or coalesce(p_email,'') !~ '@' then return null; end if;
        delete from %1$I.sso_tickets where created_at < now() - interval '1 day';
        insert into %1$I.sso_tickets(t, email) values (tk, lower(trim(p_email)));
        return tk;
      end $b$;
      create or replace function %1$I.sso_redeem(p_t text) returns text
      language plpgsql security definer set search_path = %1$I, extensions, public as $b$
      declare em text;
      begin
        update %1$I.sso_tickets set used_at = now() where t = p_t and used_at is null and created_at > now() - interval '2 minutes' returning email into em;
        return em;
      end $b$;
    $f$, s);
    execute format('revoke all on function %1$I.sso_issue(text) from public, anon', s);
    execute format('grant execute on function %1$I.sso_issue(text) to authenticated', s);
    execute format('grant execute on function %1$I.sso_redeem(text) to anon, authenticated', s);
  end loop;
end $$;
notify pgrst, 'reload schema';
