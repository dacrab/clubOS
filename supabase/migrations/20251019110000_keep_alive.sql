-- Enable required extension for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Keep-alive table used by scheduled endpoint to ping the database
create table if not exists "keep-alive" (
  id bigserial primary key,
  name text default ''::text,
  random uuid default gen_random_uuid()
);

-- Seed a couple of example rows
insert into "keep-alive" (name) values ('placeholder') on conflict do nothing;
insert into "keep-alive" (name) values ('example') on conflict do nothing;


-- Enforce RLS with explicit deny-all policy (admin/service role bypasses RLS)
ALTER TABLE public."keep-alive" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny all by default" ON public."keep-alive" FOR ALL TO public USING (false) WITH CHECK (false);

