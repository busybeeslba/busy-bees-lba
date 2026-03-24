'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, Trash2, ClipboardList, Calendar } from 'lucide-react';
import styles from './page.module.css';
import { dbClient } from '@/lib/dbClient';


export default function BaselineSheetListPage() {
    const router = useRouter();
    const [sheets, setSheets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        dbClient.get('/academic_baselines').catch(() => [])
            .then(data => setSheets(Array.isArray(data) ? data : []))
            .finally(() => setLoading(false));
    }, []);

    const handleDelete = async (id: number | string) => {
        if (!confirm('Delete this Baseline Sheet?')) return;
            await dbClient.delete(`/academic_baselines/${id}`);
        setSheets(prev => prev.filter(s => s.id !== id));
    };

    const filtered = sheets.filter(s =>
        !searchQuery ||
        (s.clientName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.program || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Get session count — new format has .sessions[], old format has .rows[] with milestone data
    const getSessionCount = (sheet: any): number => {
        if (Array.isArray(sheet.sessions)) return sheet.sessions.length;
        // Old format = 1 session worth of data
        return sheet.rows?.length > 0 ? 1 : 0;
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

    // Tally pass/fail across ALL sessions
    const getPassFail = (sheet: any): { pass: number; fail: number; pct: number | null } => {
        const rows: any[] = Array.isArray(sheet.rows) ? sheet.rows : [];
        const sessions: any[] = Array.isArray(sheet.sessions) ? sheet.sessions : [];
        let pass = 0, fail = 0;
        sessions.forEach(sess => {
            rows.forEach((_, i) => {
                const v = sess.results?.[String(i)];
                if (v === 'pass') pass++;
                else if (v === 'fail') fail++;
            });
        });
        const total = pass + fail;
        return { pass, fail, pct: total > 0 ? Math.round(pass / total * 100) : null };
    };

    return (
        <div className={styles.page}>
            {/* Header */}
            <div className={styles.pageHeader}>
                <div className={styles.headerLeft}>
                    <ClipboardList size={22} className={styles.headerIcon} />
                    <div>
                        <h1 className={styles.pageTitle}>Baseline Sheet</h1>
                        <p className={styles.pageSubtitle}>Longitudinal skill tracking — one sheet per client program</p>
                    </div>
                </div>
                <button className={styles.addBtn} onClick={() => router.push('/forms/baseline-sheet/new')}>
                    <Plus size={16} /> New Sheet
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
                    No Baseline Sheets yet. Click <strong>+ New Sheet</strong> to create one.
                </div>
            ) : (
                <div className={styles.tableWrap}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Client</th>
                                <th>Program</th>
                                <th>STO</th>
                                <th>Sessions</th>
                                <th>Last Session</th>
                                <th>Last Employee</th>
                                <th>Pass / Fail</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(sheet => {
                                const last = getLastSession(sheet);
                                const sessionCount = getSessionCount(sheet);
                                return (
                                    <tr key={sheet.id} onClick={() => router.push(`/forms/baseline-sheet/${sheet.id}`)} className={styles.clickableRow}>
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
                                        <td onClick={e => e.stopPropagation()}>
                                            {(() => {
                                                const { pass, fail, pct } = getPassFail(sheet);
                                                if (pass === 0 && fail === 0) return <span style={{ color: '#94a3b8', fontSize: 12 }}>—</span>;
                                                return (
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700 }}>
                                                        <span style={{ color: '#15803d', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '2px 7px' }}>✓{pass}</span>
                                                        <span style={{ color: '#dc2626', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 6, padding: '2px 7px' }}>✗{fail}</span>
                                                        {pct !== null && <span style={{ color: '#6366f1', background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 6, padding: '2px 7px' }}>{pct}%</span>}
                                                    </span>
                                                );
                                            })()}
                                        </td>
                                        <td onClick={e => e.stopPropagation()}>
                                            <div className={styles.actions}>
                                                <button className={styles.editBtn} onClick={() => router.push(`/forms/baseline-sheet/${sheet.id}`)}>
                                                    <Pencil size={13} />
                                                </button>
                                                <button className={styles.deleteBtn} onClick={() => handleDelete(sheet.id)}>
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
