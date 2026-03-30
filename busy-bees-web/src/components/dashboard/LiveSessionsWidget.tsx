"use client";

import React, { useEffect, useState } from 'react';
import { Activity, Clock } from 'lucide-react';
import styles from './Dashboard.module.css';

interface LiveSessionsWidgetProps {
    defaultCount?: number;
}

export default function LiveSessionsWidget({ defaultCount = 0 }: LiveSessionsWidgetProps) {
    const [sessions, setSessions] = useState<any[]>([]);
    const [count, setCount] = useState(defaultCount);
    // Track if we successfully fetched at least once so we don't flash default states if possible
    const [hasLoaded, setHasLoaded] = useState(false);

    useEffect(() => {
        const fetchLive = async () => {
            try {
                // Map to the dashboard's current hostname dynamically
                const hostname = window.location.hostname;
                const res = await fetch(`http://${hostname}:6011/sessions?status=active`);
                if (res.ok) {
                    const data = await res.json();
                    
                    // Count only today's sessions!
                    const todayDate = new Date().toDateString();
                    const live = data.filter((s: any) => new Date(s.startTime).toDateString() === todayDate);
                    
                    setSessions(live);
                    setCount(live.length);
                    setHasLoaded(true);
                }
            } catch (e) {
                // Ignore API connection errors gracefully (will retry on next poll)
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
                    <div 
                        key={s.id} 
                        style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '12px', 
                            background: '#f8fafc', 
                            padding: '10px 12px', 
                            borderRadius: '8px', 
                            border: '1px solid #e2e8f0',
                            animation: 'fadeIn 0.3s ease-out'
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
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.clientName}</span>
                            </span>
                        </div>
                    </div>
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
