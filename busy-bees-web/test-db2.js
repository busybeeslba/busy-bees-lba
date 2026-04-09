import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
    const [k, v] = line.split('=')
    if (k && v) acc[k.trim()] = v.trim().replace(/^"|"$/g, '')
    return acc
}, {})

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

async function run() {
    const { data: cols, error: e1 } = await supabase.from('academic_baselines').select('*').limit(1)
    console.log('academic_baselines select err:', e1 || 'OK')
    
    // Test insert with UI payload
    const payload = {
        clientId: 'test',
        clientName: 'test',
        program: 'test',
        rows: [],
        sessions: []
    }
    const { data, error } = await supabase.from('academic_baselines').insert(payload)
    console.log('academic_baselines insert err:', error || 'OK')
}
run()
