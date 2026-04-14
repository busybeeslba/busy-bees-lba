-- ==============================================================================
-- PHASE 3: N8N WEBHOOK TRIGGER SCRIPT
-- ==============================================================================
-- This script sets up a database trigger to send new chat messages with 
-- attachments to your n8n server.
-- 
-- REQUIRES native HTTP extension (pg_net) which is enabled by default on new
-- Supabase projects, or using the Supabase Webhooks Dashboard.
-- Alternatively, you can just set up the Webhook directly from the Supabase 
-- Dashboard (Database -> Webhooks). It's much easier!
-- ==============================================================================

-- If pg_net is enabled, you can create a function:

CREATE OR REPLACE FUNCTION notify_n8n_chat_attachment()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only trigger if an attachment exists
  IF NEW.attachment_url IS NOT NULL THEN
    -- REPLACE THE URL with your actual n8n Catch Webhook Node URL
    PERFORM net.http_post(
        url := 'https://your-n8n-instance.com/webhook/chat-backup',
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := jsonb_build_object(
            'id', NEW.id,
            'conversation_id', NEW.conversation_id,
            'sender_id', NEW.sender_id,
            'content', NEW.content,
            'attachment_url', NEW.attachment_url,
            'created_at', NEW.created_at
        )
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS trg_notify_n8n_chat_attachment ON public."chat_messages";

-- Create the trigger on INSERT
CREATE TRIGGER trg_notify_n8n_chat_attachment
AFTER INSERT ON public."chat_messages"
FOR EACH ROW
EXECUTE FUNCTION notify_n8n_chat_attachment();
