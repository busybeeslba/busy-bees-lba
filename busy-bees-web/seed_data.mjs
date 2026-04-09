import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Load .env.local
const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    let [k, ...vSplit] = line.split('=');
    if (k && vSplit.length) {
        let v = vSplit.join('=').trim().replace(/^"|"$/g, '');
        env[k.trim()] = v;
    }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

function getPastDateStr(daysAgo) {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function run() {
    console.log('Fetching Noam Nuri client...');
    let { data: clients } = await supabase.from('clients')
        .select('*')
        .or('name.ilike.%Noam%,kidsName.ilike.%Noam%')
        .limit(1);

    let client = clients?.[0];
    let clientId = client ? client.id : 'CLI-NOAM-123';
    let clientName = client ? (client.kidsName || client.name) : 'Noam Nuri';

    console.log(`Using Client: ${clientName} (ID: ${clientId})`);

    // We'll generate data for two programs: Colors and Shapes
    const programs = [
        {
            name: 'Colors',
            rows: [
                { step: 'Yellow' },
                { step: 'Green' },
                { step: 'Red' },
                { step: 'Blue' }
            ]
        },
        {
            name: 'Shapes',
            rows: [
                { step: 'Circle' },
                { step: 'Triangle' },
                { step: 'Square' },
                { step: 'Star' }
            ]
        }
    ];

    for (const prog of programs) {
        console.log(`Deleting old program data for ${prog.name}...`);
        await supabase.from('academic_baselines')
            .delete()
            .eq('clientName', clientName)
            .eq('program', prog.name);

        console.log(`Generating 30 sessions for ${prog.name}...`);
        let sessions = [];
        
        // Generate 30 days of data
        for (let i = 0; i < 30; i++) {
            const dayNum = i + 1;
            const daysAgo = 30 - dayNum; 
            
            const results = {};
            prog.rows.forEach((row, ri) => {
                // progressive passing chance from 20% on day 1 up to 90% on day 30
                const passChance = 0.2 + (0.7 * (i / 30));
                results[String(ri)] = Math.random() < passChance ? 'pass' : 'fail';
            });

            sessions.push({
                day: dayNum,
                date: getPastDateStr(daysAgo),
                employeeName: 'Admin Busy Bees',
                employeeId: 'EMP-001',
                results: results
            });
        }

        const payload = {
            clientId: clientId,
            clientName: clientName,
            program: prog.name,
            rows: prog.rows,
            sessions: sessions,
            createdAt: new Date().toISOString()
        };

        const { data, error } = await supabase.from('academic_baselines').insert(payload);
        if (error) {
            console.error(`Error inserting ${prog.name}:`, error);
        } else {
            console.log(`Successfully seeded 30 sessions for ${prog.name}!`);
        }
    }

    console.log("Mock data seeding complete!");
}

run().catch(console.error);
