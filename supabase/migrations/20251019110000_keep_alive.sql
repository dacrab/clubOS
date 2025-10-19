-- Enable required extension for gen_random_uuid()
create extension if not exists pgcrypto with schema extensions;

-- Keep-alive table used by scheduled endpoint to ping the database
create table if not exists "keep-alive" (
  id bigserial primary key,
  name text default ''::text,
  random uuid default gen_random_uuid()
);

-- Seed a couple of example rows
insert into "keep-alive" (name) values ('placeholder') on conflict do nothing;
insert into "keep-alive" (name) values ('example') on conflict do nothing;


