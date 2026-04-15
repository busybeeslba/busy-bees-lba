CREATE TABLE public.system_settings (
    "id" TEXT PRIMARY KEY,
    "primaryColor" TEXT,
    "secondaryColor" TEXT,
    "sidebarBg" TEXT,
    "logoBase64" TEXT,
    "logoCollapsedBase64" TEXT,
    "logoZoom" INTEGER DEFAULT 100,
    "logoCollapsedZoom" INTEGER DEFAULT 100,
    "staffAvatarSize" INTEGER DEFAULT 36
);

-- Insert the default global settings row so the application can patch it
INSERT INTO public.system_settings (
    "id", 
    "primaryColor", 
    "secondaryColor", 
    "sidebarBg", 
    "logoZoom", 
    "logoCollapsedZoom", 
    "staffAvatarSize"
) 
VALUES (
    'global', 
    '#5ce1e6', 
    '#fef08a', 
    '#5ce1e6', 
    100, 
    100, 
    36
)
ON CONFLICT ("id") DO NOTHING;

-- Enable Realtime for this table (optional, but good practice for global settings if you use websocket sync later)
alter publication supabase_realtime add table public.system_settings;
