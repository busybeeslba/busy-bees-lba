"use client";

import React from 'react';
import { Users, Smartphone, Monitor } from 'lucide-react';
import styles from './Dashboard.module.css';
import { usePresence } from '@/context/PresenceContext';
import { useBrand } from '@/context/BrandContext';

export default function OnlineStaff({ workers }: { workers: any[] }) {
    const { onlineUsers, selectedUserEmail, setSelectedUserEmail } = usePresence();
    const { staffAvatarSize } = useBrand();

    // Map online emails back to the complete Postgres user objects
    const currentOnlineStaff = workers.filter(w =>
        onlineUsers.some(u => u.email === String(w.email).toLowerCase())
    );

    return (
        <div className={styles.statCard} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div className={styles.statHeader}>
                <span className={styles.statTitle}>Online Staff</span>
                <div className={styles.iconBox}>
                    <Users size={20} color="var(--primary)" />
                </div>
            </div>
            
            <div className={styles.statValue}>{currentOnlineStaff.length}</div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minHeight: '40px', marginTop: '4px' }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', paddingTop: '4px' }}>
                    {currentOnlineStaff.slice(0, 5).map((staff, i) => {
                        const presenceInfo = onlineUsers.find(u => u.email === String(staff.email).toLowerCase());
                        const isMobile = presenceInfo?.deviceType === 'mobile';
                        const isSelected = selectedUserEmail === String(staff.email).toLowerCase();

                        return (
                            <div key={staff.id} style={{ position: 'relative' }}>
                                <div
                                    title={`${staff.firstName} ${staff.lastName} (${isMobile ? 'Mobile' : 'Desktop'})`}
                                    onClick={() => setSelectedUserEmail(String(staff.email).toLowerCase())}
                                    style={{
                                        width: `${staffAvatarSize}px`,
                                        height: `${staffAvatarSize}px`,
                                        borderRadius: '50%',
                                        backgroundColor: 'var(--primary)',
                                        border: isSelected ? '3px solid var(--primary)' : '2px solid white',
                                        boxShadow: isSelected ? '0 0 0 3px rgba(0, 227, 191, 0.4)' : 'none',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        overflow: 'hidden',
                                        fontSize: `${Math.max(10, Math.floor(staffAvatarSize * 0.35))}px`,
                                        fontWeight: 'bold',
                                        color: 'var(--bg-dark)',
                                        transition: 'all 0.2s ease',
                                        transform: isSelected ? 'scale(1.15)' : 'scale(1)',
                                        zIndex: isSelected ? 10 : 1
                                    }}
                                >
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
                                    zIndex: isSelected ? 11 : 2,
                                    transition: 'all 0.2s ease',
                                    transform: isSelected ? 'scale(1.15) translate(2px, 2px)' : 'scale(1)'
                                }}>
                                    {isMobile ? 
                                        <Smartphone size={10} color="#475569" strokeWidth={3} /> : 
                                        <Monitor size={10} color="#475569" strokeWidth={3} />
                                    }
                                </div>
                            </div>
                        );
                    })}
                    {currentOnlineStaff.length > 5 && (
                        <div style={{
                            width: `${staffAvatarSize}px`,
                            height: `${staffAvatarSize}px`,
                            borderRadius: '50%',
                            backgroundColor: '#f1f5f9',
                            border: '2px solid white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: `${Math.max(9, Math.floor(staffAvatarSize * 0.33))}px`,
                            fontWeight: 'bold',
                            color: '#64748b'
                        }}>
                            +{currentOnlineStaff.length - 5}
                        </div>
                    )}
                </div>
                {currentOnlineStaff.length > 0 ? (
                    <span style={{ fontSize: '13px', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '500' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--success)' }} />
                        Live
                    </span>
                ) : (
                    <span style={{ fontSize: '13px', color: '#94a3b8' }}>No active staff</span>
                )}
            </div>
        </div>
    );
}
