'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

export interface OnlineUser {
    email: string;
    location?: { latitude: number; longitude: number };
    deviceType?: 'mobile' | 'desktop';
}

interface PresenceContextType {
    onlineUsers: OnlineUser[];
    selectedUserEmail: string | null;
    setSelectedUserEmail: (email: string | null) => void;
}

const PresenceContext = createContext<PresenceContextType>({ 
    onlineUsers: [],
    selectedUserEmail: null,
    setSelectedUserEmail: () => {}
});

export function PresenceProvider({ children }: { children: React.ReactNode }) {
    const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
    const [selectedUserEmail, setSelectedUserEmail] = useState<string | null>(null);
    const supabase = createClient();
    


    useEffect(() => {
        let channel: any = null;
        let isActive = true;

        const updatePresence = (state: any) => {
            const activeUsers: OnlineUser[] = [];
            for (const key in state) {
                state[key].forEach((presence: any) => {
                    if (presence.email) {
                        activeUsers.push({
                            email: String(presence.email).toLowerCase(),
                            location: presence.location || undefined,
                            deviceType: presence.deviceType || 'mobile'
                        });
                    }
                });
            }
            const uniqueUsers = Array.from(new Map(activeUsers.map(it => [it.email, it])).values());
            setOnlineUsers([...uniqueUsers]);
        };

        const setupChannel = async () => {
            const { data } = await supabase.auth.getSession();
            if (!isActive) return;
            
            const email = data?.session?.user?.email;

            // Only clean up this specific channel to prevent destroying the global realtime websocket connection
            const existing = supabase.getChannels().find((c: any) => c.topic === 'realtime:online-users');
            if (existing) {
                await supabase.removeChannel(existing);
            }

            channel = supabase.channel('online-users');

            channel.on('presence', { event: 'sync' }, () => {
                if (!channel) return;
                updatePresence(channel.presenceState());
            });
            channel.on('presence', { event: 'join' }, () => {
                if (!channel) return;
                updatePresence(channel.presenceState());
            });
            channel.on('presence', { event: 'leave' }, () => {
                if (!channel) return;
                updatePresence(channel.presenceState());
            });

            channel.subscribe(async (status: string) => {
                if (status === 'SUBSCRIBED' && email) {
                    await channel.track({ email: email.toLowerCase(), deviceType: 'desktop' });
                }
            });
        };

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
                setupChannel();
            } else if (event === 'SIGNED_OUT') {
                const activeChan = channel;
                if (activeChan) {
                    (async () => {
                        await activeChan.untrack();
                        await supabase.removeChannel(activeChan);
                    })();
                }
                channel = null;
                setOnlineUsers([]);
            }
        });

        return () => {
            isActive = false;
            subscription.unsubscribe();
            if (channel) {
                const activeChan = channel;
                (async () => {
                    await activeChan.untrack();
                    await supabase.removeChannel(activeChan);
                })();
            }
        };
    }, [supabase]);

    return (
        <PresenceContext.Provider value={{ onlineUsers, selectedUserEmail, setSelectedUserEmail }}>
            {children}
        </PresenceContext.Provider>
    );
}

export function usePresence() {
    return useContext(PresenceContext);
}
