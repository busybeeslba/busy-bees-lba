'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, Trash2, BarChart2, Calendar, Eye } from 'lucide-react';
import styles from './page.module.css';
import { dbClient } from '@/lib/dbClient';


export default function MassTrialListPage() {
    const router = useRouter();
    const [sheets, setSheets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIds, setSelectedIds] = useState<(number | string)[]>([]);

    useEffect(() => {
        dbClient.get('/mass_trials').catch(() => [])
            .then(data => setSheets(Array.isArray(data) ? data : []))
            .finally(() => setLoading(false));
    }, []);

    const handleDelete = async (id: number | string) => {
        if (!confirm('Delete this Mass Trial / DTT sheet?')) return;
        await dbClient.delete(`/mass_trials/${id}`);
        setSheets(prev => prev.filter(s => s.id !== id));
        setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
    };

    const handleBulkDelete = async () => {
        if (!confirm(`Delete ${selectedIds.length} selected Mass Trials?`)) return;
        setLoading(true);
        try {
            await Promise.all(selectedIds.map(id => dbClient.delete(`/mass_trials/${id}`)));
            setSheets(prev => prev.filter(s => !selectedIds.includes(s.id)));
            setSelectedIds([]);
        } catch (e) {
            console.error(e);
            alert('Failed to delete some forms.');
        } finally {
            setLoading(false);
        }
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === filtered.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filtered.map(s => s.id));
        }
    };

    const toggleSelect = (id: number | string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const filtered = sheets.filter(s =>
        !searchQuery ||
        (s.clientName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.program || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getSessionCount = (sheet: any): number =>
        Array.isArray(sheet.sessions) ? sheet.sessions.length : 0;

    const getLastSession = (sheet: any): { date: string; employee: string } | null => {
        if (Array.isArray(sheet.sessions) && sheet.sessions.length > 0) {
            const last = sheet.sessions[sheet.sessions.length - 1];
            return { date: last.date, employee: last.employeeName };
        }
        return null;
    };

    const getStepCount = (sheet: any): number => sheet.rows?.length || 0;

    // Calculate overall % correct across all sessions
    const getAvgPct = (sheet: any): number | null => {
        const rows: any[] = Array.isArray(sheet.rows) ? sheet.rows : [];
        const sessions: any[] = Array.isArray(sheet.sessions) ? sheet.sessions : [];
        if (!sessions.length || !rows.length) return null;
        let totalPlus = 0, totalTrials = 0;
        sessions.forEach(sess => {
            rows.forEach((_, i) => {
                const trials: string[] = sess.results?.[String(i)] || [];
                trials.forEach(t => {
                    if (t === '+' || t === '-') {
                        totalTrials++;
                        if (t === '+') totalPlus++;
                    }
                });
            });
        });
        return totalTrials > 0 ? Math.round(totalPlus / totalTrials * 100) : null;
    };

    return (
        <div className={styles.page}>
            {/* Header */}
            <div className={styles.pageHeader}>
                <div className={styles.headerLeft}>
                    <BarChart2 size={22} className={styles.headerIcon} />
                    <div>
                        <h1 className={styles.pageTitle}>Mass Trial / DTT</h1>
                        <p className={styles.pageSubtitle}>Discrete Trial Training — 5 trials per STO per session</p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {selectedIds.length > 0 && (
                        <button className={styles.deleteBtn} onClick={handleBulkDelete} style={{ height: '36px', padding: '0 16px', borderRadius: '8px', border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Trash2 size={16} /> Delete Selected ({selectedIds.length})
                        </button>
                    )}
                    <button className={styles.addBtn} onClick={() => router.push('/forms/mass-trial/new')}>
                        <Plus size={16} /> Add New
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className={styles.toolbar}>
                <input
                    className={styles.searchInput}
                    placeholder="Search by client or program…"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                />
                <span className={styles.countBadge}>{filtered.length} sheet{filtered.length !== 1 ? 's' : ''}</span>
            </div>

            {/* Table */}
            {loading ? (
                <div className={styles.empty}>Loading…</div>
            ) : filtered.length === 0 ? (
                <div className={styles.empty}>
                    No DTT sheets yet. Click <strong>+ Add New</strong> to create one.
                </div>
            ) : (
                <div className={styles.tableWrap}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th style={{ width: '40px', textAlign: 'center' }}>
                                    <input 
                                        type="checkbox" 
                                        checked={filtered.length > 0 && selectedIds.length === filtered.length}
                                        onChange={toggleSelectAll}
                                        style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                                    />
                                </th>
                                <th>Client</th>
                                <th>Program / STO</th>
                                <th>STOs</th>
                                <th>Sessions</th>
                                <th>Last Session</th>
                                <th>Last Employee</th>
                                <th>Avg % Correct</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(sheet => {
                                const last = getLastSession(sheet);
                                const sessionCount = getSessionCount(sheet);
                                const pct = getAvgPct(sheet);
                                return (
                                    <tr key={sheet.id} onClick={(e) => { 
                                        // If clicking a row and it's not on a button, navigate or toggle selection 
                                        if ((e.target as HTMLElement).tagName.toLowerCase() === 'td') {
                                            router.push(`/forms/mass-trial/${sheet.id}`);
                                        }
                                    }} className={styles.clickableRow}>
                                        <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                                            <input 
                                                type="checkbox" 
                                                checked={selectedIds.includes(sheet.id)}
                                                onChange={() => toggleSelect(sheet.id)}
                                                style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                                            />
                                        </td>
                                        <td className={styles.clientCell} onClick={() => router.push(`/forms/mass-trial/${sheet.id}`)}>
                                            <span className={styles.avatar}>{(sheet.clientName || '?')[0]}</span>
                                            {sheet.clientName || '—'}
                                        </td>
                                        <td><span className={styles.programChip}>{sheet.program || '—'}</span></td>
                                        <td>{getStepCount(sheet)}</td>
                                        <td>
                                            <span className={styles.sessionCountBadge}>
                                                <Calendar size={11} style={{ display: 'inline', marginRight: 4 }} />
                                                {sessionCount} day{sessionCount !== 1 ? 's' : ''}
                                            </span>
                                        </td>
                                        <td className={styles.dateCell}>
                                            {last ? new Date(last.date + 'T12:00:00').toLocaleDateString() : '—'}
                                        </td>
                                        <td>{last?.employee || '—'}</td>
                                        <td onClick={e => e.stopPropagation()}>
                                            {pct !== null ? (
                                                <span style={{
                                                    display: 'inline-block', background: pct >= 80 ? '#f0fdf4' : pct >= 60 ? '#f0fdfa' : '#fef2f2',
                                                    color: pct >= 80 ? '#15803d' : pct >= 60 ? '#0f766e' : '#dc2626',
                                                    border: `1px solid ${pct >= 80 ? '#bbf7d0' : pct >= 60 ? '#99f6e4' : '#fca5a5'}`,
                                                    borderRadius: 6, padding: '2px 10px', fontSize: 13, fontWeight: 700,
                                                }}>
                                                    {pct}%
                                                </span>
                                            ) : <span style={{ color: '#94a3b8', fontSize: 12 }}>—</span>}
                                        </td>
                                        <td onClick={e => e.stopPropagation()}>
                                            <div className={styles.actions}>
                                                <button className={styles.editBtn} title="View" onClick={(e) => { e.stopPropagation(); window.open(`/forms/mass-trial/${sheet.id}/view`, '_blank'); }}>
                                                    <Eye size={13} />
                                                </button>
                                                <button className={styles.editBtn} title="Edit" onClick={(e) => { e.stopPropagation(); router.push(`/forms/mass-trial/${sheet.id}`); }}>
                                                    <Pencil size={13} />
                                                </button>
                                                <button className={styles.deleteBtn} title="Delete" onClick={(e) => { e.stopPropagation(); handleDelete(sheet.id); }}>
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
