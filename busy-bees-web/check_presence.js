import { createClient } from '@supabase/supabase-js';

// Get these from the .env.local file or hardcode if we know them from previous steps. Wait! I can just use dotenv.
import dotenv from 'dotenv';
dotenv.config();

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

console.log("Listening to online-users channel...");

const channel = supabaseAdmin.channel('online-users');
channel.on('presence', { event: 'sync' }, () => {
    const state = channel.presenceState();
    console.log("🔥 SYNC EVENT! Current Presence State:");
    console.log(JSON.stringify(state, null, 2));
});

channel.subscribe(async (status) => {
    console.log("Subscription status:", status);
});

// Run for 15 seconds then exit
setTimeout(() => {
    console.log("Done listening.");
    process.exit(0);
}, 15000);
