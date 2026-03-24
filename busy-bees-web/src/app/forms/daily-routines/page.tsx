'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, Trash2, CheckSquare, Calendar } from 'lucide-react';
import styles from '../baseline-sheet/page.module.css'; // Reusing existing styling
import { dbClient } from '@/lib/dbClient';


export default function DailyRoutinesListPage() {
    const router = useRouter();
    const [sheets, setSheets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        dbClient.get('/daily_routines').catch(() => [])
            .then(data => setSheets(Array.isArray(data) ? data : []))
            .finally(() => setLoading(false));
    }, []);

    const handleDelete = async (id: number | string) => {
        if (!confirm('Delete this Daily Routine sheet?')) return;
        await dbClient.delete(`/daily_routines/${id}`);
        setSheets(prev => prev.filter(s => s.id !== id));
    };

    const filtered = sheets.filter(s =>
        !searchQuery ||
        (s.clientName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.program || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getSessionCount = (sheet: any): number => {
        if (Array.isArray(sheet.sessions)) return sheet.sessions.length;
        return 0;
    };

    const getLastSession = (sheet: any): { date: string; employee: string } | null => {
        if (Array.isArray(sheet.sessions) && sheet.sessions.length > 0) {
            const last = sheet.sessions[sheet.sessions.length - 1];
            return { date: last.date, employee: last.employeeName };
        }
        if (sheet.createdAt) return { date: sheet.createdAt.slice(0, 10), employee: sheet.employeeName || '—' };
        return null;
    };

    const getStepCount = (sheet: any): number => sheet.rows?.length || 0;

    // Tally pass/fail across all sessions
    const getStats = (sheet: any): { filled: number; highestPct: number | null } => {
        const rows: any[] = Array.isArray(sheet.rows) ? sheet.rows : [];
        const sessions: any[] = Array.isArray(sheet.sessions) ? sheet.sessions : [];
        let filled = 0;
        let highestPct = -1;

        sessions.forEach(sess => {
            let rowPass = 0;
            let rowFail = 0;
            rows.forEach((_, i) => {
                const v = sess.results?.[String(i)];
                if (v === 'pass' || v === 'fail') {
                    filled++;
                    if (v === 'pass') rowPass++;
                    if (v === 'fail') rowFail++;
                }
            });
            const total = rowPass + rowFail;
            if (total > 0) {
                const pct = Math.round((rowPass / total) * 100);
                if (pct > highestPct) highestPct = pct;
            }
        });
        return { 
            filled, 
            highestPct: highestPct >= 0 ? highestPct : null 
        };
    };

    return (
        <div className={styles.page}>
            {/* Header */}
            <div className={styles.pageHeader}>
                <div className={styles.headerLeft}>
                    <CheckSquare size={22} className={styles.headerIcon} />
                    <div>
                        <h1 className={styles.pageTitle}>Daily Routines</h1>
                        <p className={styles.pageSubtitle}>Track daily routine progress (fractional tracking)</p>
                    </div>
                </div>
                <button className={styles.addBtn} onClick={() => router.push('/forms/daily-routines/new')}>
                    <Plus size={16} /> New Tracking
                </button>
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
                    No Daily Routines tracked yet. Use the Mobile App to log sessions.
                </div>
            ) : (
                <div className={styles.tableWrap}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Client</th>
                                <th>Program</th>
                                <th>Routines</th>
                                <th>Sessions</th>
                                <th>Last Session</th>
                                <th>Last Employee</th>
                                <th>Stats</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(sheet => {
                                const last = getLastSession(sheet);
                                const sessionCount = getSessionCount(sheet);
                                return (
                                    <tr key={sheet.id} className={styles.clickableRow} onClick={() => router.push(`/forms/daily-routines/${sheet.id}`)}>
                                        <td className={styles.clientCell}>
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
                                            {last ? new Date(last.date).toLocaleDateString() : '—'}
                                        </td>
                                        <td>{last?.employee || '—'}</td>
                                        <td>
                                            {(() => {
                                                const { filled, highestPct } = getStats(sheet);
                                                if (filled === 0) return <span style={{ color: '#94a3b8', fontSize: 12 }}>—</span>;
                                                return (
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700 }}>
                                                        <span style={{ color: '#0f766e', background: '#eefcf5', border: '1px solid #6ee7b7', borderRadius: 6, padding: '2px 7px' }}>{filled} entries</span>
                                                        {highestPct !== null && <span style={{ color: '#6366f1', background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 6, padding: '2px 7px' }}>High: {highestPct}%</span>}
                                                    </span>
                                                );
                                            })()}
                                        </td>
                                        <td>
                                            <div className={styles.actions}>
                                                <button className={styles.editBtn} onClick={(e) => { e.stopPropagation(); router.push(`/forms/daily-routines/${sheet.id}`); }}>
                                                    <Pencil size={13} />
                                                </button>
                                                <button className={styles.deleteBtn} onClick={(e) => { e.stopPropagation(); handleDelete(sheet.id); }}>
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
