import * as TaskManager from 'expo-task-manager';
import { supabase } from '../lib/supabase';

export const BACKGROUND_LOCATION_TASK = 'BACKGROUND_LOCATION_TASK';

TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
    if (error) {
        console.error("Background Location Error:", error);
        return;
    }
    if (data) {
        const { locations } = data as { locations: any[] };
        if (locations && locations.length > 0) {
            const loc = locations[0];
            try {
                // Get the persisted authenticated session even if the app is headless
                const { data: { session } } = await supabase.auth.getSession();
                
                if (session?.user?.email) {
                    const updatePayload = {
                        location: JSON.stringify({
                            latitude: loc.coords.latitude,
                            longitude: loc.coords.longitude,
                            accuracy: loc.coords.accuracy,
                            timestamp: loc.timestamp
                        }),
                        lastEditAt: new Date().toISOString()
                    };

                    await supabase
                        .from('users')
                        .update(updatePayload)
                        .eq('email', session.user.email);
                        
                    console.log(`[Background GPS] Synced coordinates for ${session.user.email}`);
                }
            } catch (err) {
                console.error("[Background GPS] Failed to sync to Supabase:", err);
            }
        }
    }
});
