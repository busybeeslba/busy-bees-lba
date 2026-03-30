"use client";

import React, { useEffect, useState } from 'react';
import { Activity, Clock } from 'lucide-react';
import Link from 'next/link';
import { dbClient } from '../../lib/dbClient';
import styles from './Dashboard.module.css';

interface LiveSessionsWidgetProps {
    defaultCount?: number;
}

export default function LiveSessionsWidget({ defaultCount = 0 }: LiveSessionsWidgetProps) {
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
                const live = data.filter((s: any) => new Date(s.startTime).toDateString() === todayDate);
                
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
        
        // Poll every 5 seconds for updates
        const interval = setInterval(fetchLive, 5000);
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
            <div className={styles.statHeader} style={{ marginBottom: '8px' }}>
                <span className={styles.statTitle}>Live Sessions</span>
                <div className={styles.iconBox}>
                    <Activity size={20} color="var(--primary)" />
                </div>
            </div>
            
            <div className={styles.statValue} style={{ marginBottom: sessions.length > 0 ? '12px' : '0' }}>
                {count}
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
                
                {sessions.map(s => (
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
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                            <span style={{ fontSize: '13.5px', fontWeight: '600', color: '#334155', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                {s.employeeName}
                            </span>
                            <span style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Clock size={10} />
                                {formatTime(s.startTime)}
                                <span style={{ opacity: 0.5, margin: '0 2px' }}>•</span>
                                <span style={{ color: 'var(--primary)', fontWeight: '600' }}>{getElapsedTime(s.startTime)}</span>
                                <span style={{ opacity: 0.5, margin: '0 2px' }}>•</span> 
                                <span style={{ fontWeight: '500' }}>{s.serviceType}</span>
                                <span style={{ opacity: 0.5, margin: '0 2px' }}>•</span> 
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.clientName}</span>
                            </span>
                        </div>
                    </div>
                    </Link>
                ))}
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
