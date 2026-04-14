"use client";

import React from 'react';
import { Users, Smartphone, Monitor } from 'lucide-react';
import styles from './Dashboard.module.css';
import { usePresence } from '@/context/PresenceContext';
import { createClient } from '@/utils/supabase/client';

export default function OnlineStaff({ workers: initialWorkers }: { workers: any[] }) {
    const { onlineUsers, selectedUserEmail, setSelectedUserEmail } = usePresence();
    const [workers, setWorkers] = React.useState(initialWorkers);

    React.useEffect(() => { setWorkers(initialWorkers); }, [initialWorkers]);

    React.useEffect(() => {
        const supabase = createClient();
        const chan = supabase.channel('online_staff_db_updates')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users' }, (payload) => {
                setWorkers(prev => prev.map(w => String(w.email).toLowerCase() === String(payload.new.email).toLowerCase() ? { ...w, ...payload.new } : w));
            })
            .subscribe();
        return () => { supabase.removeChannel(chan); };
    }, []);

    // Map online emails back to the complete Postgres user objects
    const currentOnlineStaff = workers.filter(w => {
        const isWebSocketOnline = onlineUsers.some(u => u.email === String(w.email).toLowerCase());
        
        // Mobile iOS actively freezes WebSockets in background, so we check background GPS loop heartbeat (3 mins)
        const isDatabaseOnline = w.lastEditAt && (new Date().getTime() - new Date(w.lastEditAt).getTime() < 180000);

        return isWebSocketOnline || isDatabaseOnline;
    });

    return (
        <div className={styles.statCard} style={{ display: 'flex', flexDirection: 'column', gap: '8px', minHeight: '160px' }}>
            <div className={styles.statHeader} style={{ marginBottom: currentOnlineStaff.length > 0 ? '12px' : '0', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                    <span className={styles.statValue} style={{ margin: 0, lineHeight: 1 }}>{currentOnlineStaff.length}</span>
                    <span className={styles.statTitle} style={{ margin: 0, fontSize: '13px' }}>Online Staff</span>
                </div>
                <div className={styles.iconBox}>
                    <Users size={20} color="var(--primary)" />
                </div>
            </div>
            
            {/* Real-time scrolling list of online staff */}
            <div style={{ 
                flex: 1, 
                overflowY: 'auto', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '8px',
                paddingRight: '4px',
                maxHeight: '180px' // allow scrolling if there are many active
            }}>
                {currentOnlineStaff.length === 0 && (
                    <span style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic', marginTop: 'auto' }}>
                        No staff currently online.
                    </span>
                )}
                
                {currentOnlineStaff.map((staff, i) => {
                    const presenceInfo = onlineUsers.find(u => u.email === String(staff.email).toLowerCase());
                    // If no WebSocket presence exists, they must be alive via the background GPS ping (mobile constraint)
                    const isMobile = presenceInfo ? presenceInfo.deviceType === 'mobile' : true; 
                    const isSelected = selectedUserEmail === String(staff.email).toLowerCase();

                    return (
                        <div 
                            key={staff.id} 
                            onClick={() => setSelectedUserEmail(String(staff.email).toLowerCase())}
                            style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '12px', 
                                background: isSelected ? '#f1f5f9' : '#f8fafc', 
                                padding: '10px 12px', 
                                borderRadius: '8px', 
                                border: isSelected ? '1px solid var(--primary)' : '1px solid #e2e8f0',
                                animation: 'fadeIn 0.3s ease-out',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                boxShadow: isSelected ? '0 2px 4px rgba(0, 227, 191, 0.15)' : '0 1px 2px rgba(0,0,0,0.05)'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-1px)';
                                e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.05)';
                                if (!isSelected) e.currentTarget.style.borderColor = '#cbd5e1';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = isSelected ? '0 2px 4px rgba(0, 227, 191, 0.15)' : '0 1px 2px rgba(0,0,0,0.05)';
                                if (!isSelected) e.currentTarget.style.borderColor = '#e2e8f0';
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
                                        <img src={staff.avatar} alt={staff.firstName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <span>{staff.firstName[0]}{staff.lastName?.[0]}</span>
                                    )}
                                </div>
                                <div style={{
                                    position: 'absolute',
                                    bottom: '-2px',
                                    right: '-2px',
                                    backgroundColor: 'white',
                                    borderRadius: '50%',
                                    padding: '2px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
                                    zIndex: 2,
                                }}>
                                    {isMobile ? 
                                        <Smartphone size={10} color="#475569" strokeWidth={3} /> : 
                                        <Monitor size={10} color="#475569" strokeWidth={3} />
                                    }
                                </div>
                            </div>
                            
                            {/* Info section */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden', flex: 1 }}>
                                <span style={{ fontSize: '13.5px', fontWeight: '600', color: '#334155', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                    {staff.firstName} {staff.lastName}
                                </span>
                                <span style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span style={{ color: 'var(--success)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                        <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--success)' }} />
                                        Live
                                    </span>
                                    <span style={{ opacity: 0.5, margin: '0 2px' }}>•</span>
                                    {isMobile ? 'Mobile App' : 'Web Dashboard'}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
            {/* Adding generic keyframes inline for simplicity */}
            <style dangerouslySetInnerHTML={{__html: `
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(5px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}} />
        </div>
    );
}
