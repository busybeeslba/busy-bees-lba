"use client";

import React, { useEffect, useState } from 'react';
import { Calendar, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { dbClient } from '../../lib/dbClient';
import { supabase } from '../../lib/supabase';
import styles from './Dashboard.module.css';
import SessionDetailModal from '../session/SessionDetailModal';

interface TodaySessionsWidgetProps {
    defaultCount?: number;
    workers?: any[];
}

export default function TodaySessionsWidget({ defaultCount = 0, workers = [] }: TodaySessionsWidgetProps) {
    const [allSessions, setAllSessions] = useState<any[]>([]);
    const [sessions, setSessions] = useState<any[]>([]);
    const [count, setCount] = useState(defaultCount);
    // Track if we successfully fetched at least once so we don't flash default states if possible
    const [hasLoaded, setHasLoaded] = useState(false);
    const [now, setNow] = useState(Date.now());
    const [selectedSession, setSelectedSession] = useState<any | null>(null);

    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const fetchToday = async () => {
            try {
                // Fetch directly from our newly migrated Supabase architecture!
                const data = await dbClient.get('/sessions');
                setAllSessions(data || []);
                
                // Count today's sessions that are explicitly completed or cancelled
                const todayDate = new Date().toDateString();
                const todaySessions = (data || []).filter((s: any) => 
                    new Date(s.startTime).toDateString() === todayDate && 
                    (s.status === 'completed' || s.status === 'cancelled')
                );
                
                // Sort so most recently completed are at the top
                todaySessions.sort((a: any, b: any) => {
                    return new Date(b.endTime || b.startTime).getTime() - new Date(a.endTime || a.startTime).getTime();
                });

                setSessions(todaySessions);
                setCount(todaySessions.length);
                setHasLoaded(true);
            } catch (e) {
                // Ignore API connection errors gracefully (will retry on next poll)
                console.error("Widget fetch error:", e);
            }
        };

        // Fire immediately on mount
        fetchToday();

        // Listen for realtime database changes to update instantly!
        const channel = supabase.channel('realtime_today_sessions')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'sessions' },
                () => { fetchToday(); }
            )
            .subscribe();
        
        // Poll every 60 seconds as a pure background fallback
        const interval = setInterval(fetchToday, 60000);
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

    const getDurationOrElapsed = (s: any) => {
        if (!s.startTime) return '';
        
        try {
            // For completed/cancelled, we just show their final duration if we have it, or calc from endTime
            if (s.status === 'completed' || s.status === 'cancelled') {
                let diffSeconds = s.durationSeconds || 0;
                if (!diffSeconds && s.endTime) {
                     diffSeconds = Math.floor((new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / 1000);
                }
                
                if (diffSeconds <= 0) return 'Finished';
                
                const hours = Math.floor(diffSeconds / 3600);
                const minutes = Math.floor((diffSeconds % 3600) / 60);
                if (hours > 0) return `${hours}h ${minutes}m`;
                return `${minutes}m`;
            }

            // For active sessions, calculate elapsed live
            const start = new Date(s.startTime).getTime();
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
                    <span className={styles.statTitle} style={{ margin: 0, fontSize: '13px' }}>Completed Today</span>
                </div>
                <div className={styles.iconBox}>
                    <Calendar size={20} color="var(--primary)" />
                </div>
            </div>
            
            {/* Real-time scrolling list of all today's sessions */}
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
                        No completed sessions today yet.
                    </span>
                )}
                
                {sessions.map(s => {
                    const matchedWorker = workers.find(w => 
                        (w.employeeId && s.employeeId && w.employeeId === s.employeeId) || 
                        (`${w.firstName} ${w.lastName}`.trim() === s.employeeName)
                    );
                    const avatarToUse = matchedWorker?.avatar || s.avatar;

                    return (
                        <div key={s.id}>
                            <div 
                                onClick={() => setSelectedSession(s)}
                                style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '12px', 
                                    background: '#ffffff', 
                                    padding: '10px 12px', 
                                    borderRadius: '8px', 
                                    border: '1px solid #e2e8f0',
                                    animation: 'fadeIn 0.3s ease-out',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                    opacity: 0.95
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                    e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.05)';
                                    e.currentTarget.style.borderColor = '#cbd5e1';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
                                    e.currentTarget.style.borderColor = '#e2e8f0';
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {(s.status === 'cancelled' || !s.clientName || s.clientName === 'Unknown') ? (
                                            <XCircle size={18} color="var(--error)" strokeWidth={2.5} />
                                        ) : (
                                            <CheckCircle2 size={18} color="var(--success)" strokeWidth={2.5} />
                                        )}
                                    </div>
                                    
                                    {/* Employee Avatar */}
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
                                        <span style={{ color: '#64748b', fontWeight: '600' }}>{getDurationOrElapsed(s)}</span>
                                        <span style={{ opacity: 0.5, fontSize: '10px' }}>•</span> 
                                        <span style={{ fontWeight: '500', color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {s.clientName}
                                        </span>
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {selectedSession && (
                <SessionDetailModal 
                    session={selectedSession} 
                    allSessions={allSessions} 
                    onClose={() => setSelectedSession(null)} 
                />
            )}
        </div>
    );
}
