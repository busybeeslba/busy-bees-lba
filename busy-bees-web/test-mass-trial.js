import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

async function run() {
    const { data, error } = await supabase.from('mass_trials').insert({
        clientId: 'test',
        clientName: 'test',
        program: 'test',
        rows: [],
        sessions: []
    })
    console.log("DATA:", data)
    console.log("ERROR:", JSON.stringify(error, null, 2))
}
run()
