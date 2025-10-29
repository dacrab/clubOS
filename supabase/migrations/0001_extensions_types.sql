-- ClubOS: Extensions and Types
BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE public.user_role AS ENUM ('admin', 'staff', 'secretary');

COMMIT;

