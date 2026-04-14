-- ==============================================================================
-- ONESIGNAL PUSH NOTIFICATION WEBHOOK (V2)
-- ==============================================================================
-- Updated with EXCEPTION wrappers and strict casting to prevent Postgres JSONB
-- compiler mismatches from aborting the database inserts natively!
-- ==============================================================================

-- 1. Ensure the networking extension is active
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Create the server-side dispatcher function
CREATE OR REPLACE FUNCTION public.handle_new_chat_message()
RETURNS trigger AS $$
DECLARE
  target_user_id uuid;
  sender_first_name text;
  display_name text;
BEGIN
  -- Find the specific user who is supposed to RECEIVE the message (not the sender)
  SELECT user_id INTO target_user_id
  FROM public.chat_participants 
  WHERE conversation_id = NEW.conversation_id AND user_id != NEW.sender_id
  LIMIT 1;
  
  IF target_user_id IS NOT NULL THEN
      -- Grab the nice readable First Name of the Sender
      SELECT first_name INTO sender_first_name
      FROM public.users
      WHERE id = NEW.sender_id;

      display_name := coalesce(sender_first_name, 'A user');

      -- Fire HTTP request rapidly and securely to OneSignal servers
      -- Wrapped in a try/catch block so a network stall NEVER drops a message!
      BEGIN
          PERFORM net.http_post(
              url := 'https://onesignal.com/api/v1/notifications',
              headers := '{"Content-Type": "application/json", "Authorization": "Basic os_v2_app_5idgj2wobfcgjezduzukyb7eow4zoww7y6ounqfayh4yjdlznzvu73o4htvntlx22jet4o4qloppjlde2wu3dcocta2mqnms3wgecxi"}'::jsonb,
              body := jsonb_build_object(
                  'app_id', 'ea0664ea-ce09-4464-9323-a668ac07e475',
                  'include_aliases', jsonb_build_object('external_id', jsonb_build_array(target_user_id::text)),
                  'target_channel', 'push',
                  'contents', jsonb_build_object('en', coalesce(NEW.content::text, 'Sent an attachment 📎')),
                  'headings', jsonb_build_object('en', 'New message from ' || display_name::text),
                  'data', jsonb_build_object('roomId', NEW.conversation_id::text)
              )
          );
      EXCEPTION WHEN OTHERS THEN
          -- Failsafe: if pg_net errors due to API limits or schema mismatches, do not abort the chat!
      END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Bind the dispatcher to the specific table
DROP TRIGGER IF EXISTS on_chat_message_created ON public.chat_messages;
CREATE TRIGGER on_chat_message_created
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_chat_message();
