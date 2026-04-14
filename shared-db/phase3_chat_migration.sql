-- ==============================================================================
-- PHASE 3 CHAT MIGRATION SCRIPT
-- ==============================================================================
-- 1. Alters the chat_messages table to include attachment_url and status.
-- 2. Sets up a storage bucket for chat attachments.
-- 3. Inserts dummy UUIDs into users and chat_rooms to prevent Foreign Key errors
--    when testing the MVP frontend.
-- ==============================================================================

-- 1. Insert dummy records to satisfy UUID Foreign Keys during Phase 3 Network Test
INSERT INTO public."users" ("id", "firstName", "lastName", "email")
VALUES 
  ('00000000-0000-0000-0000-111111111111', 'Admin', 'Me', 'admin@busybees.com'),
  ('00000000-0000-0000-0000-000000000001', 'Alex', 'Bee', 'alex@busybees.com'),
  ('00000000-0000-0000-0000-000000000002', 'Maria', 'Santos', 'maria@busybees.com')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO public."chat_rooms" ("id", "type")
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'direct'),
  ('00000000-0000-0000-0000-000000000002', 'direct')
ON CONFLICT ("id") DO NOTHING;

-- 2. Update chat_messages table
ALTER TABLE public."chat_messages" ADD COLUMN IF NOT EXISTS "attachment_url" TEXT;
ALTER TABLE public."chat_messages" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'sent';

-- 3. Update existing chat_messages just in case
UPDATE public."chat_messages" SET "status" = 'sent' WHERE "status" IS NULL;

-- 4. Create Storage bucket for chat attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('chat_attachments', 'chat_attachments', true)
ON CONFLICT (id) DO NOTHING;

-- 5. Set up Storage security policies for chat_attachments
-- Allow public access to view attachments
CREATE POLICY "Public Access chat_attachments" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'chat_attachments' );

-- Allow inserts
CREATE POLICY "Allow Inserts chat_attachments" 
ON storage.objects FOR INSERT 
WITH CHECK ( bucket_id = 'chat_attachments' );

-- 6. Setup realtime
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime;
COMMIT;
ALTER PUBLICATION supabase_realtime ADD TABLE public."chat_messages";
