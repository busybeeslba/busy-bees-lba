-- Clear all orphaned unread messages to sync badges back to zero
UPDATE public.chat_messages SET status = 'read' WHERE status != 'read';
