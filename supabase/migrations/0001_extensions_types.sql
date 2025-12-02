-- ============================================================================
-- ClubOS Database Schema v2.0
-- Migration 1: Extensions and Custom Types
-- ============================================================================

BEGIN;

-- Required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Custom enum types
CREATE TYPE public.user_role AS ENUM ('admin', 'secretary', 'staff');
CREATE TYPE public.booking_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed', 'no_show');
CREATE TYPE public.order_status AS ENUM ('pending', 'completed', 'refunded', 'voided');
CREATE TYPE public.payment_method AS ENUM ('cash', 'card', 'mixed', 'coupon', 'other');

COMMIT;
