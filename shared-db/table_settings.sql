CREATE TABLE public.table_settings (
    id TEXT PRIMARY KEY,
    ordered_ids JSONB DEFAULT '[]'::jsonb,
    hidden_ids JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Realtime so clients can listen for live table setting changes if they want
alter publication supabase_realtime add table public.table_settings;
