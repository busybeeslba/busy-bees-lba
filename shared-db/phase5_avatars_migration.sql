-- Phase 5: Avatar Storage Bucket Migration
-- This script creates a public bucket called 'user_avatars' for profile pictures.

-- 1. Create the Storage Bucket for Avatars
INSERT INTO storage.buckets (id, name, public) 
VALUES ('user_avatars', 'user_avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Storage Policies (Standard public read, authenticated insert/update)
-- Allow anyone to read avatars
CREATE POLICY "Public Avatar Views" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'user_avatars' );

-- Allow authenticated users to upload and update their own avatars
CREATE POLICY "Authenticated users can upload avatars" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK ( bucket_id = 'user_avatars' );

CREATE POLICY "Authenticated users can update their avatars" 
ON storage.objects FOR UPDATE 
TO authenticated 
USING ( bucket_id = 'user_avatars' );

-- Note: Ensure that the public.users table has an 'avatar' or 'avatarUrl' column.
-- MIGRATION COMPLETE.
