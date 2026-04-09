'use client';

import React from 'react';
import Link from 'next/link';
import { X, User, Hash, Briefcase, FileText, MapPin, ExternalLink } from 'lucide-react';
import styles from './SessionDetailModal.module.css';

function formatDuration(seconds: number): string {
    if (!seconds || isNaN(seconds)) return '—';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
}

function formatDateTime(iso: string): { date: string; time: string; full: string } {
    if (!iso) return { date: '—', time: '—', full: '—' };
    const d = new Date(iso);
    return {
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        full: d.toLocaleString('en-US'),
    };
}

function formatLatLng(lat: number, lng: number): string {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

interface SessionDetailModalProps {
    session: any;
    allSessions: any[];
    onClose: () => void;
}

export default function SessionDetailModal({ session, allSessions, onClose }: SessionDetailModalProps) {
    if (!session) return null;

    // Collect all forms across every session for this client
    const clientSessions = allSessions.filter(
        s => s.clientId === session.clientId || s.clientName === session.clientName
    );
    const allForms: any[] = [];
    clientSessions.forEach(s => {
        (s.documents || []).forEach((doc: any) => {
            allForms.push({
                sessionId: s.id,
                sessionDate: s.startTime,
                employeeName: s.employeeName,
                formType: doc.type || doc.templateType || '—',
                formDate: doc.createdAt || s.startTime,
                isCurrentSession: s.id === session.id,
            });
        });
    });

    // Sort newest first
    allForms.sort((a, b) => new Date(b.formDate).getTime() - new Date(a.formDate).getTime());

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px'
        }} onClick={onClose}>
            <div className={styles.detailPanel} onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh' }}>
                <div className={styles.detailHeader}>
                    <div>
                        <span className={`${styles.statusBadge} ${
                            session.status === 'active' ? styles.active : 
                            session.status === 'cancelled' ? styles.cancelled : styles.completed
                        }`}>
                            {session.status === 'active' ? 'Active' : 
                             session.status === 'cancelled' ? 'Cancelled' : 'Completed'}
                        </span>
                        <h2 className={styles.detailTitle}>{session.sessionId || `SES-${String(session.id || '').padStart(6, '0')}`}</h2>
                        <p className={styles.detailSubtitle}>{formatDateTime(session.startTime).full}</p>
                    </div>
                    <button className={styles.closeBtn} onClick={onClose}><X size={20} /></button>
                </div>

                <div className={styles.detailBody}>
                    {/* Employee */}
                    <div className={styles.detailSection}>
                        <h3 className={styles.sectionLabel}><User size={14} /> Employee</h3>
                        <div className={styles.detailGrid}>
                            <div className={styles.detailItem}>
                                <label>Name</label><span>{session.employeeName || '—'}</span>
                            </div>
                            <div className={styles.detailItem}>
                                <label>Employee ID</label><span>{session.employeeId || '—'}</span>
                            </div>
                        </div>
                    </div>

                    <div className={styles.divider} />

                    {/* Client */}
                    <div className={styles.detailSection}>
                        <h3 className={styles.sectionLabel}><Hash size={14} /> Client</h3>
                        <div className={styles.detailGrid}>
                            <div className={styles.detailItem}>
                                <label>Name</label>
                                {session.clientId && session.clientName ? (
                                    <Link href={`/clients/${session.clientId}`} style={{ color: 'var(--primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                                        {session.clientName}
                                        <ExternalLink size={12} />
                                    </Link>
                                ) : (
                                    <span>{session.clientName || '—'}</span>
                                )}
                            </div>
                            <div className={styles.detailItem}>
                                <label>Client ID</label><span>{session.clientId || '—'}</span>
                            </div>
                            <div className={styles.detailItem}>
                                <label>Client Status</label>
                                <span className={`${styles.statusBadge} ${session.clientStatus === 'Active' ? styles.completed : styles.inactive}`}>
                                    {session.clientStatus || '—'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className={styles.divider} />

                    {/* Service */}
                    <div className={styles.detailSection}>
                        <h3 className={styles.sectionLabel}><Briefcase size={14} /> Service</h3>
                        <div className={styles.detailGrid}>
                            <div className={styles.detailItem}>
                                <label>Type</label><span>{session.serviceType || '—'}</span>
                            </div>
                            <div className={styles.detailItem}>
                                <label>Duration</label>
                                <span style={{ fontWeight: 600 }}>{formatDuration(session.durationSeconds)}</span>
                            </div>
                            <div className={styles.detailItem}>
                                <label>Start Time</label><span>{formatDateTime(session.startTime).full}</span>
                            </div>
                            {session.endTime && (
                                <div className={styles.detailItem}>
                                    <label>End Time</label><span>{formatDateTime(session.endTime).full}</span>
                                </div>
                            )}
                        </div>
                        {session.notes && (
                            <div className={styles.notesBox}>
                                <label>Session Notes</label>
                                <p>{session.notes}</p>
                            </div>
                        )}
                    </div>

                    {/* Client Form History */}
                    <div className={styles.divider} />
                    <div className={styles.detailSection}>
                        <h3 className={styles.sectionLabel}><FileText size={14} /> Form History — {session.clientName || 'Unknown'}</h3>
                        {allForms.length === 0 ? (
                            <p style={{ fontSize: '13px', color: 'var(--text-secondary-light)', margin: '8px 0 0' }}>No forms submitted for this client yet.</p>
                        ) : (
                            <div className={styles.historyTableWrap}>
                                <table className={styles.historyTable}>
                                    <thead>
                                        <tr>
                                            <th>Session</th>
                                            <th>Date</th>
                                            <th>Employee</th>
                                            <th>Form Type</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {allForms.map((row, i) => (
                                            <tr key={i} className={row.isCurrentSession ? styles.currentSessionRow : ''}>
                                                <td>
                                                    <span style={{ fontWeight: 600, color: row.isCurrentSession ? 'var(--primary)' : 'inherit' }}>
                                                        {`SES-${String(row.sessionId).padStart(6, '0')}`}
                                                    </span>
                                                    {row.isCurrentSession && (
                                                        <span className={styles.thisSessionTag}>This</span>
                                                    )}
                                                </td>
                                                <td>
                                                    <div style={{ fontWeight: 500, fontSize: '12px' }}>{formatDateTime(row.formDate).date}</div>
                                                    <div style={{ fontSize: '11px', color: 'var(--text-secondary-light)' }}>{formatDateTime(row.formDate).time}</div>
                                                </td>
                                                <td style={{ fontSize: '12px' }}>{row.employeeName || '—'}</td>
                                                <td>
                                                    <span className={styles.formBubble}>
                                                        <FileText size={11} />{row.formType}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <div className={styles.historyFooter}>
                                    {allForms.length} form{allForms.length !== 1 ? 's' : ''} across {clientSessions.filter(s => s.documents?.length > 0).length} session{clientSessions.filter(s => s.documents?.length > 0).length !== 1 ? 's' : ''}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* GPS Locations */}
                    <div className={styles.divider} />
                    <div className={styles.detailSection}>
                        <h3 className={styles.sectionLabel}><MapPin size={14} /> GPS Location History ({(session.route || []).length} points)</h3>
                        {(!session.route || session.route.length === 0) ? (
                            <p style={{ fontSize: '13px', color: 'var(--text-secondary-light)' }}>No GPS data recorded for this session.</p>
                        ) : (
                            <div className={styles.locationList}>
                                {session.route.map((pt: any, i: number) => (
                                    <div key={i} className={styles.locationRow}>
                                        <div className={styles.locationDot} />
                                        <div>
                                            <div style={{ fontFamily: 'monospace', fontSize: '13px' }}>
                                                {formatLatLng(pt.latitude, pt.longitude)}
                                            </div>
                                            <div style={{ fontSize: '11px', color: 'var(--text-secondary-light)' }}>
                                                {pt.timestamp ? new Date(pt.timestamp).toLocaleTimeString() : ''} {pt.accuracy ? `· ±${Math.round(pt.accuracy)}m` : ''}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
