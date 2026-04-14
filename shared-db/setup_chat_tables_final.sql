-- ==============================================================================
-- FINAL CHAT MODULE SCHEMA DEFINITION
-- Run this script in the Supabase SQL Editor.
-- It ensures that the required tables for real-time chat actually exist.
-- ==============================================================================

-- 1. Create chat_rooms table
CREATE TABLE IF NOT EXISTS public."chat_rooms" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "type" TEXT DEFAULT 'direct', -- 'direct' or 'group'
    "name" TEXT, -- Added for group chats
    "avatar_url" TEXT, -- Added for group chats
    "created_at" TIMESTAMPTZ DEFAULT now()
);

-- 2. Create chat_participants table
CREATE TABLE IF NOT EXISTS public."chat_participants" (
    "conversation_id" UUID REFERENCES public."chat_rooms"("id") ON DELETE CASCADE,
    "user_id" UUID REFERENCES public."users"("id") ON DELETE CASCADE,
    "joined_at" TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY ("conversation_id", "user_id")
);

-- 3. Create chat_messages table
CREATE TABLE IF NOT EXISTS public."chat_messages" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "conversation_id" UUID REFERENCES public."chat_rooms"("id") ON DELETE CASCADE,
    "sender_id" UUID REFERENCES public."users"("id") ON DELETE CASCADE,
    "content" TEXT NOT NULL,
    "attachment_url" TEXT,
    "status" TEXT DEFAULT 'sent',
    "created_at" TIMESTAMPTZ DEFAULT now()
);

-- 4. Storage Bucket Setup
INSERT INTO storage.buckets (id, name, public) 
VALUES ('chat_attachments', 'chat_attachments', true)
ON CONFLICT (id) DO NOTHING;

-- 5. Realtime Publication
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime;
COMMIT;
ALTER PUBLICATION supabase_realtime ADD TABLE public."chat_messages";

-- (Optional) If you have Row Level Security enabled, you MUST disable it 
-- temporarily for testing, or add policies. Let's ensure it's disabled for MVP chat functionality:
ALTER TABLE public."chat_rooms" DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."chat_participants" DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."chat_messages" DISABLE ROW LEVEL SECURITY;
