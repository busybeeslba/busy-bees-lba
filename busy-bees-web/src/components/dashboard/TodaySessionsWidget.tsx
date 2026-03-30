"use client";

import React, { useEffect, useState } from 'react';
import { Calendar, Clock, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { dbClient } from '../../lib/dbClient';
import styles from './Dashboard.module.css';

interface TodaySessionsWidgetProps {
    defaultCount?: number;
}

export default function TodaySessionsWidget({ defaultCount = 0 }: TodaySessionsWidgetProps) {
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
        const fetchToday = async () => {
            try {
                // Fetch directly from our newly migrated Supabase architecture!
                const data = await dbClient.get('/sessions');
                
                // Count only today's sessions!
                const todayDate = new Date().toDateString();
                const todaySessions = data.filter((s: any) => new Date(s.startTime).toDateString() === todayDate);
                
                // Sort so active sessions are at top, completed ones below
                todaySessions.sort((a: any, b: any) => {
                    if (a.status === 'active' && b.status !== 'active') return -1;
                    if (b.status === 'active' && a.status !== 'active') return 1;
                    return new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
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
        
        // Poll every 10 seconds for updates instead of 5
        const interval = setInterval(fetchToday, 10000);
        return () => clearInterval(interval);
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
            // For completed, we just show their final duration if we have it, or calc from endTime
            if (s.status === 'completed') {
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
            <div className={styles.statHeader} style={{ marginBottom: '8px' }}>
                <span className={styles.statTitle}>Sessions Today</span>
                <div className={styles.iconBox}>
                    <Calendar size={20} color="var(--primary)" />
                </div>
            </div>
            
            <div className={styles.statValue} style={{ marginBottom: sessions.length > 0 ? '12px' : '0' }}>
                {count}
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
                        No sessions started today yet.
                    </span>
                )}
                
                {sessions.map(s => {
                    const isActive = s.status === 'active';
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
                                    background: isActive ? '#f8fafc' : '#ffffff', 
                                    padding: '10px 12px', 
                                    borderRadius: '8px', 
                                    border: '1px solid #e2e8f0',
                                    animation: 'fadeIn 0.3s ease-out',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                    opacity: isActive ? 1 : 0.85
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                    e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.05)';
                                    e.currentTarget.style.borderColor = isActive ? 'var(--primary)' : '#cbd5e1';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
                                    e.currentTarget.style.borderColor = '#e2e8f0';
                                }}
                            >
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {isActive ? (
                                    <>
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
                                    </>
                                ) : (
                                    <CheckCircle2 size={16} color="#94a3b8" />
                                )}
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                                <span style={{ fontSize: '13.5px', fontWeight: '600', color: '#334155', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                    {s.employeeName}
                                </span>
                                <span style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Clock size={10} />
                                    {formatTime(s.startTime)}
                                    <span style={{ opacity: 0.5, margin: '0 2px' }}>•</span>
                                    <span style={{ color: isActive ? 'var(--primary)' : '#64748b', fontWeight: isActive ? '600' : '500' }}>
                                        {getDurationOrElapsed(s)}
                                    </span>
                                    <span style={{ opacity: 0.5, margin: '0 2px' }}>•</span> 
                                    <span style={{ fontWeight: isActive ? '500' : '400', color: isActive ? '#334155' : '#64748b' }}>{s.serviceType}</span>
                                    <span style={{ opacity: 0.5, margin: '0 2px' }}>•</span> 
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.clientName}</span>
                                </span>
                            </div>
                        </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
