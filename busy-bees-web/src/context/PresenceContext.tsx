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
    
    // We maintain a single unified map of all users currently active
    const usersMapRef = React.useRef<Map<string, OnlineUser>>(new Map());

    const flushUsers = () => {
        setOnlineUsers(Array.from(usersMapRef.current.values()));
    };

    useEffect(() => {
        let currentChannel: any;
        let isConnecting = false;
        let connectionActive = true;

        const connectPresence = async (email: string) => {
            // First, vigorously destroy any existing cached instances of this channel to prevent React StrictMode crashing
            const allChannels = supabase.getChannels();
            const danglingChannel = allChannels.find((c: any) => c.topic === 'realtime:online-users');
            if (danglingChannel) {
                await supabase.removeChannel(danglingChannel);
            }
            if (currentChannel) {
                await supabase.removeChannel(currentChannel);
            }
            
            // 1. Fetch any users who have synced background locations in the last 14 hours
            const cutoff = new Date(Date.now() - 14 * 60 * 60 * 1000).toISOString();
            const { data: bgUsers } = await supabase
                .from('users')
                .select('email, location, lastEditAt')
                .gte('lastEditAt', cutoff)
                .not('location', 'is', null);

            if (bgUsers) {
                bgUsers.forEach(u => {
                    if (u.email && u.location) {
                        try {
                            const normalized = String(u.email).toLowerCase();
                            usersMapRef.current.set(normalized, {
                                email: normalized,
                                location: JSON.parse(u.location),
                                deviceType: 'mobile'
                            });
                        } catch (e) { /* ignore */ }
                    }
                });
                flushUsers();
            }

            // 2. Open the EXACT named channel that the Mobile App broadcasts to
            
            // To be completely safe against React StrictMode races:
            if (!connectionActive) return;
            
            currentChannel = supabase.channel('online-users');
            
            // If somehow the channel was already joined by a race condition, nuke it
            if (currentChannel.state !== 'closed') {
                await supabase.removeChannel(currentChannel);
                currentChannel = supabase.channel('online-users');
            }
            
            // Listen to Foreground App users (Screen is ON)
            currentChannel.on('presence', { event: 'sync' }, () => {
                const state = currentChannel.presenceState();
                
                // When we get a foreground WS sync, update the unified map
                for (const key in state) {
                    state[key].forEach((presence: any) => {
                        if (presence.email) {
                            const normalizedEmail = String(presence.email).toLowerCase();
                            const existing = usersMapRef.current.get(normalizedEmail);
                            
                            usersMapRef.current.set(normalizedEmail, {
                                email: normalizedEmail,
                                location: presence.location || existing?.location,
                                deviceType: presence.deviceType || existing?.deviceType || 'mobile'
                            });
                        }
                    });
                }
                flushUsers();
            });

            // Listen to Background App users (Screen is OFF, phone is in pocket)
            currentChannel.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users' }, (payload: any) => {
                const updatedRow = payload.new as any;
                if (updatedRow.email && updatedRow.location) {
                    try {
                        const normalizedEmail = String(updatedRow.email).toLowerCase();
                        usersMapRef.current.set(normalizedEmail, {
                            email: normalizedEmail,
                            location: JSON.parse(updatedRow.location),
                            deviceType: 'mobile'
                        });
                        flushUsers();
                    } catch (e) { /* ignore invalid json */ }
                }
            });

            // Subscribe only AFTER bindings
            currentChannel.subscribe(async (status: string) => {
                if (status === 'SUBSCRIBED') {
                    await currentChannel.track({ email: email.toLowerCase(), deviceType: 'desktop' });
                }
            });
        };

        // Initialize immediately if session exists
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user?.email && !isConnecting) {
                isConnecting = true;
                connectPresence(session.user.email).finally(() => { isConnecting = false; });
            }
        });

        // Listen for auth changes (login/logout) to track dynamically without remounting RootLayout
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user?.email) {
                if (!isConnecting) {
                    isConnecting = true;
                    connectPresence(session.user.email).finally(() => { isConnecting = false; });
                }
            } else if (event === 'SIGNED_OUT') {
                if (currentChannel) {
                    supabase.removeChannel(currentChannel);
                    currentChannel = null;
                }
                setOnlineUsers([]);
                usersMapRef.current.clear();
            }
        });

        return () => {
            connectionActive = false;
            subscription.unsubscribe();
            if (currentChannel) {
                supabase.removeChannel(currentChannel);
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
