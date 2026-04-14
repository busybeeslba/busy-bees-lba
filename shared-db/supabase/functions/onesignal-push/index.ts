import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID')!;
const ONESIGNAL_BOT_KEY = Deno.env.get('ONESIGNAL_REST_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  try {
    const { record, type } = await req.json();
    if (type !== 'INSERT') {
       return new Response("Not an INSERT", { status: 200 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch all participants of the conversation
    const { data: participants, error } = await supabase
      .from('chat_participants')
      .select('user_id')
      .eq('conversation_id', record.conversation_id)
      .neq('user_id', record.sender_id);

    if (error || !participants || participants.length === 0) {
      return new Response("No target recipients found", { status: 200 });
    }

    const targetUserIds = participants.map(p => p.user_id.toString());

    const body = {
      app_id: ONESIGNAL_APP_ID,
      include_aliases: {
        external_id: targetUserIds
      },
      target_channel: "push",
      headings: { en: "Busy Bees" },
      contents: { en: record.content || "You received a new message or attachment." },
      data: {
        action: "open_chat",
        conversation_id: record.conversation_id
      }
    };

    const response = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${ONESIGNAL_BOT_KEY}`
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    return new Response(JSON.stringify(data), { status: 200, headers: { "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 400 });
  }
});
