-- ==============================================================================
-- PHASE 3.5 CHAT GROUP MIGRATION SCRIPT
-- ==============================================================================
-- Alters the chat_rooms table to support group chats by adding name and avatar_url.
-- ==============================================================================

ALTER TABLE public."chat_rooms" ADD COLUMN IF NOT EXISTS "name" TEXT;
ALTER TABLE public."chat_rooms" ADD COLUMN IF NOT EXISTS "avatar_url" TEXT;
