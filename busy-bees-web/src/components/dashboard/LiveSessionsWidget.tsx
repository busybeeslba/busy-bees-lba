"use client";

import React, { useEffect, useState } from 'react';
import { Activity, Clock } from 'lucide-react';
import Link from 'next/link';
import { dbClient } from '../../lib/dbClient';
import { supabase } from '../../lib/supabase';
import styles from './Dashboard.module.css';

interface LiveSessionsWidgetProps {
    defaultCount?: number;
    workers?: any[];
}

export default function LiveSessionsWidget({ defaultCount = 0, workers = [] }: LiveSessionsWidgetProps) {
    const [sessions, setSessions] = useState<any[]>([]);
    const [count, setCount] = useState(defaultCount);
    // Track if we successfully fetched at least once so we don't flash default states if possible
    const [hasLoaded, setHasLoaded] = useState(false);
    const [now, setNow] = useState(Date.now());

    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const fetchLive = async () => {
            try {
                // Fetch directly from our newly migrated Supabase architecture!
                const data = await dbClient.get('/sessions?status=active');
                
                // Count only today's sessions!
                const todayDate = new Date().toDateString();
                const live = (data || []).filter((s: any) => new Date(s.startTime).toDateString() === todayDate);
                
                setSessions(live);
                setCount(live.length);
                setHasLoaded(true);
            } catch (e) {
                // Ignore API connection errors gracefully (will retry on next poll)
                console.error("Widget fetch error:", e);
            }
        };

        // Fire immediately on mount
        fetchLive();

        // Listen for realtime database changes to update instantly!
        const channel = supabase.channel('realtime_live_sessions')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'sessions' },
                () => { fetchLive(); }
            )
            .subscribe();
        
        // Poll every 60 seconds as a pure background fallback
        const interval = setInterval(fetchLive, 60000);
        return () => {
            clearInterval(interval);
            supabase.removeChannel(channel);
        };
    }, []);

    // Helper to format start time nicely
    const formatTime = (isoString?: string) => {
        if (!isoString) return '';
        try {
            return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch {
            return '';
        }
    };

    const getElapsedTime = (isoString?: string) => {
        if (!isoString) return '';
        try {
            const start = new Date(isoString).getTime();
            const diffSeconds = Math.floor((now - start) / 1000);
            if (diffSeconds < 0) return '0m 0s';
            
            const hours = Math.floor(diffSeconds / 3600);
            const minutes = Math.floor((diffSeconds % 3600) / 60);
            const seconds = diffSeconds % 60;
            
            if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
            return `${minutes}m ${seconds}s`;
        } catch {
            return '';
        }
    };

    return (
        <div className={styles.statCard} style={{ display: 'flex', flexDirection: 'column', gap: '8px', minHeight: '160px' }}>
            <div className={styles.statHeader} style={{ marginBottom: sessions.length > 0 ? '12px' : '0', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                    <span className={styles.statValue} style={{ margin: 0, lineHeight: 1 }}>{count}</span>
                    <span className={styles.statTitle} style={{ margin: 0, fontSize: '13px' }}>Live Sessions</span>
                </div>
                <div className={styles.iconBox}>
                    <Activity size={20} color="var(--primary)" />
                </div>
            </div>
            
            {/* Real-time scrolling list of active sessions */}
            <div style={{ 
                flex: 1, 
                overflowY: 'auto', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '8px',
                paddingRight: '4px',
                maxHeight: '180px' // allow scrolling if there are many active
            }}>
                {hasLoaded && sessions.length === 0 && (
                    <span style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic', marginTop: 'auto' }}>
                        No ongoing sessions right now.
                    </span>
                )}
                
                {sessions.map(s => {
                    const matchedWorker = workers.find(w => 
                        (w.employeeId && s.employeeId && w.employeeId === s.employeeId) || 
                        (`${w.firstName} ${w.lastName}`.trim() === s.employeeName)
                    );
                    const avatarToUse = matchedWorker?.avatar || s.avatar;

                    return (
                    <Link 
                        key={s.id} 
                        href={`/clients/${s.clientId}`}
                        style={{ textDecoration: 'none', display: 'block' }}
                    >
                        <div 
                            style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '12px', 
                                background: '#f8fafc', 
                                padding: '10px 12px', 
                                borderRadius: '8px', 
                                border: '1px solid #e2e8f0',
                                animation: 'fadeIn 0.3s ease-out',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-1px)';
                                e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.05)';
                                e.currentTarget.style.borderColor = 'var(--primary)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
                                e.currentTarget.style.borderColor = '#e2e8f0';
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {/* Pulsing indicator */}
                                    <div style={{ 
                                        position: 'absolute', 
                                        width: '12px', 
                                        height: '12px', 
                                        borderRadius: '50%', 
                                        backgroundColor: 'var(--success)', 
                                        opacity: 0.3,
                                        animation: 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite' 
                                    }} />
                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--success)', zIndex: 1 }} />
                                </div>
                                
                                {/* Employee Avatar Fallback */}
                                <div style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    backgroundColor: 'var(--primary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    overflow: 'hidden',
                                    fontSize: '12px',
                                    fontWeight: 'bold',
                                    color: 'var(--bg-dark)'
                                }}>
                                    {avatarToUse ? (
                                        <img src={avatarToUse} alt={s.employeeName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <span>{s.employeeName ? s.employeeName.substring(0, 2).toUpperCase() : 'U'}</span>
                                    )}
                                </div>
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', overflow: 'hidden', flex: 1 }}>
                                <span style={{ fontSize: '13.5px', fontWeight: '600', color: '#334155', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                    {s.employeeName}
                                </span>
                                <span style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ color: 'var(--primary)', fontWeight: '600' }}>{getElapsedTime(s.startTime)}</span>
                                    <span style={{ opacity: 0.5, fontSize: '10px' }}>•</span> 
                                    <span style={{ fontWeight: '500', color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {s.clientName}
                                    </span>
                                </span>
                            </div>
                        </div>
                    </Link>
                )})}
            </div>
            {/* Adding generic keyframes inline for simplicity */}
            <style dangerouslySetInnerHTML={{__html: `
                @keyframes ping {
                    75%, 100% { transform: scale(3.5); opacity: 0; }
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(5px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}} />
        </div>
    );
}
