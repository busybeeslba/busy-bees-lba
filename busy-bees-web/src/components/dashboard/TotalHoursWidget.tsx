"use client";

import React, { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { dbClient } from '../../lib/dbClient';
import { supabase } from '../../lib/supabase';
import styles from './Dashboard.module.css';

interface TotalHoursWidgetProps {
    defaultTotal?: string;
}

export default function TotalHoursWidget({ defaultTotal = "0.0" }: TotalHoursWidgetProps) {
    const [sessions, setSessions] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [totalHours, setTotalHours] = useState(defaultTotal);
    const [now, setNow] = useState(Date.now());
    const [hasLoaded, setHasLoaded] = useState(false);

    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [sessionsData, usersData] = await Promise.all([
                    dbClient.get('/sessions'),
                    dbClient.get('/users')
                ]);
                
                const todayDate = new Date().toDateString();
                const todaySessions = (sessionsData || []).filter((s: any) => new Date(s.startTime).toDateString() === todayDate);
                
                setSessions(todaySessions);
                setUsers(usersData || []);
                setHasLoaded(true);
            } catch (e) {
                console.error("Widget fetch error:", e);
            }
        };

        fetchData();
        
        // Listen for realtime database changes to update instantly!
        const channel = supabase.channel('realtime_total_hours')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'sessions' },
                () => { fetchData(); }
            )
            .subscribe();

        const interval = setInterval(fetchData, 60000);
        return () => {
            clearInterval(interval);
            supabase.removeChannel(channel);
        };
    }, []);

    // Process data to group by employee dynamically
    const employeeStats = React.useMemo(() => {
        const stats: Record<string, { employeeName: string, email: string, avatar: string, totalSeconds: number }> = {};
        
        // Match users easily
        const userMap = new Map(users.map(u => [String(u.email).toLowerCase(), u]));

        // Calculate all session durations
        sessions.forEach(s => {
            // Ignore non-client sessions for total hour accumulation
            if (!s.clientName || s.clientName === 'Unknown') return;

            // Find base identifier - preferably email/employeeId, fallback to name
            const id = s.employeeId || s.employeeName || 'Unknown';
            if (!stats[id]) {
                const mappedUser = users.find(u => 
                    u.id === s.employeeId || 
                    String(u.email).toLowerCase() === String(s.employeeId).toLowerCase() ||
                    `${u.firstName} ${u.lastName}` === s.employeeName
                );
                
                stats[id] = {
                    employeeName: s.employeeName || 'Unknown',
                    email: mappedUser?.email || '',
                    avatar: mappedUser?.avatar || '',
                    totalSeconds: 0
                };
            }

            if (s.status === 'completed') {
                let diffSeconds = s.durationSeconds || 0;
                if (!diffSeconds && s.endTime) {
                     diffSeconds = Math.floor((new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / 1000);
                }
                stats[id].totalSeconds += Math.max(0, diffSeconds);
            } else if (s.status === 'active') {
                const start = new Date(s.startTime).getTime();
                const diffSeconds = Math.floor((now - start) / 1000);
                stats[id].totalSeconds += Math.max(0, diffSeconds);
            }
        });

        // Convert to array and sort by hours (highest first)
        const sorted = Object.values(stats).sort((a, b) => b.totalSeconds - a.totalSeconds);
        return sorted;
    }, [sessions, users, now]);

    // Update the big total stat dynamically
    useEffect(() => {
        if (!hasLoaded) return;
        const totalSecs = employeeStats.reduce((acc, curr) => acc + curr.totalSeconds, 0);
        setTotalHours(formatHHMMSS(totalSecs));
    }, [employeeStats, hasLoaded]);

    const formatHHMMSS = (totalSeconds: number) => {
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className={styles.statCard} style={{ display: 'flex', flexDirection: 'column', gap: '8px', minHeight: '160px' }}>
            <div className={styles.statHeader} style={{ marginBottom: employeeStats.length > 0 ? '12px' : '0', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                    <span className={styles.statValue} style={{ margin: 0, lineHeight: 1 }}>{totalHours}</span>
                    <span className={styles.statTitle} style={{ margin: 0, fontSize: '13px' }}>Total Hours (Today)</span>
                </div>
                <div className={styles.iconBox}>
                    <Clock size={20} color="var(--primary)" />
                </div>
            </div>
            
            {/* Real-time scrolling list of hours by staff */}
            <div style={{ 
                flex: 1, 
                overflowY: 'auto', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '8px',
                paddingRight: '4px',
                maxHeight: '180px' // allow scrolling if there are many active
            }}>
                {hasLoaded && employeeStats.length === 0 && (
                    <span style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic', marginTop: 'auto' }}>
                        No session hours logged today.
                    </span>
                )}
                
                {employeeStats.map((staff, i) => {
                    return (
                        <div 
                            key={i} 
                            style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '12px', 
                                background: '#f8fafc', 
                                padding: '10px 12px', 
                                borderRadius: '8px', 
                                border: '1px solid #e2e8f0',
                                transition: 'all 0.2s ease',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
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
                            {/* Avatar section */}
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
                                    {staff.avatar ? (
                                        <img src={staff.avatar} alt={staff.employeeName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <span>{staff.employeeName.charAt(0)}</span>
                                    )}
                                </div>
                            </div>
                            
                            {/* Info section */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden', flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '13.5px', fontWeight: '600', color: '#334155', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                        {staff.employeeName}
                                    </span>
                                    <span style={{ fontSize: '13.5px', fontWeight: '700', color: 'var(--primary)' }}>
                                        {formatHHMMSS(staff.totalSeconds)}
                                    </span>
                                </div>
                                <span style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Clock size={10} />
                                    Logged today
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
