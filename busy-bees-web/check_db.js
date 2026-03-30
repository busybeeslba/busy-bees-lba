const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://cyhyoexagdqdshouclej.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5aHlvZXhhZ2RxZHNob3VjbGVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzODMwNjQsImV4cCI6MjA4OTk1OTA2NH0.p5g0CRR9iw6ehyIY-ho1f_1uGptn0xa1tlhzE8-0gXo';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log("Fetching latest 5 sessions...");
  const { data, error } = await supabase
    .from('sessions')
    .select('id, sessionId, clientName, status, startTime')
    .order('startTime', { ascending: false })
    .limit(5);

  if (error) {
    console.error("Error fetching:", error);
  } else {
    console.log("Latest Sessions:", data);
  }
}

check();
