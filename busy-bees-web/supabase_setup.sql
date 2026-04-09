-- Run this in your Supabase SQL Editor
-- This script safely adds missing JSONB columns to the existing tables,
-- and creates any missing tables.

-- 1. Academic Baselines
ALTER TABLE academic_baselines 
  ADD COLUMN IF NOT EXISTS "clientName" text,
  ADD COLUMN IF NOT EXISTS "program" text,
  ADD COLUMN IF NOT EXISTS "rows" jsonb,
  ADD COLUMN IF NOT EXISTS "sessions" jsonb;

-- 2. Mass Trials
ALTER TABLE mass_trials
  ADD COLUMN IF NOT EXISTS "clientName" text,
  ADD COLUMN IF NOT EXISTS "program" text,
  ADD COLUMN IF NOT EXISTS "targets" jsonb,
  ADD COLUMN IF NOT EXISTS "dailyLogs" jsonb;

-- 3. Daily Routines
CREATE TABLE IF NOT EXISTS daily_routines (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  "clientName" text,
  "routineName" text,
  "config" jsonb,
  "dailyLogs" jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Transaction Sheets
CREATE TABLE IF NOT EXISTS transaction_sheets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  "clientName" text,
  "employeeId" text,
  "program" text,
  "locations" jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Note: Ensure RLS is enabled and appropriate policies are set if needed.
-- For now, if you're not using RLS, you don't need additional policies.
