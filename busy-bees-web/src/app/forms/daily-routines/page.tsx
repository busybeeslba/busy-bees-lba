'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, Trash2, CheckSquare, Calendar, Eye, MoreVertical } from 'lucide-react';
import React from 'react';
import { useTableSettings, ColumnDef } from '@/hooks/useTableSettings';
import TableSettingsDrawer from '@/components/ui/TableSettingsDrawer';
import styles from '../baseline-sheet/page.module.css'; // Reusing existing styling
import { dbClient } from '@/lib/dbClient';


export default function DailyRoutinesListPage() {
    const router = useRouter();
    const [sheets, setSheets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIds, setSelectedIds] = useState<(number | string)[]>([]);

    useEffect(() => {
        dbClient.get('/daily_routines').catch(() => [])
            .then(data => setSheets(Array.isArray(data) ? data : []))
            .finally(() => setLoading(false));
    }, []);

    const handleDelete = async (id: number | string) => {
        if (!confirm('Delete this Daily Routine sheet?')) return;
        await dbClient.delete(`/daily_routines/${id}`);
        setSheets(prev => prev.filter(s => s.id !== id));
        setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
    };

    const handleBulkDelete = async () => {
        if (!confirm(`Delete ${selectedIds.length} selected Daily Routines?`)) return;
        setLoading(true);
        try {
            await Promise.all(selectedIds.map(id => dbClient.delete(`/daily_routines/${id}`)));
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

    const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);

    const COLUMNS: ColumnDef<any>[] = React.useMemo(() => [
        { id: 'clientName', label: 'Client', renderCell: (sheet: any) => <td key="clientName" className={styles.clientCell} onClick={() => router.push(`/forms/daily-routines/${sheet.id}`)}><span className={styles.avatar}>{(sheet.clientName || '?')[0]}</span>{sheet.clientName || '—'}</td> },
        { id: 'program', label: 'Program', renderCell: (sheet: any) => <td key="program"><span className={styles.programChip}>{sheet.program || '—'}</span></td> },
        { id: 'routines', label: 'Routines', renderCell: (sheet: any) => <td key="routines">{getStepCount(sheet)}</td> },
        { id: 'sessions', label: 'Sessions', renderCell: (sheet: any) => { const c = getSessionCount(sheet); return <td key="sessions"><span className={styles.sessionCountBadge}><Calendar size={11} style={{ display: 'inline', marginRight: 4 }} />{c} day{c !== 1 ? 's' : ''}</span></td> } },
        { id: 'lastSession', label: 'Last Session', renderCell: (sheet: any) => { const last = getLastSession(sheet); return <td key="lastSession" className={styles.dateCell}>{last ? new Date(last.date).toLocaleDateString() : '—'}</td> } },
        { id: 'lastEmployee', label: 'Last Employee', renderCell: (sheet: any) => { const last = getLastSession(sheet); return <td key="lastEmployee">{last?.employee || '—'}</td> } },
        { id: 'stats', label: 'Stats', renderCell: (sheet: any) => {
            const { filled, highestPct } = getStats(sheet);
            return <td key="stats" onClick={e => e.stopPropagation()}>
                {filled === 0 ? <span style={{ color: '#94a3b8', fontSize: 12 }}>—</span> :
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700 }}>
                    <span style={{ color: '#0f766e', background: '#eefcf5', border: '1px solid #6ee7b7', borderRadius: 6, padding: '2px 7px' }}>{filled} entries</span>
                    {highestPct !== null && <span style={{ color: 'var(--primary)', background: 'var(--background-light)', border: '1px solid var(--border-light)', borderRadius: 6, padding: '2px 7px' }}>High: {highestPct}%</span>}
                </span>}
            </td>
        } }
    ], [router]);

    const { activeColumns, allColumnsOrdered, hiddenColumnIds, toggleColumnVisibility, moveColumn, resetToDefaults } = useTableSettings('daily_routines_forms_table_config', COLUMNS);

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
                <div style={{ display: 'flex', gap: '8px' }}>
                    {selectedIds.length > 0 && (
                        <button className={styles.deleteBtn} onClick={handleBulkDelete} style={{ height: '36px', padding: '0 16px', borderRadius: '8px', border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Trash2 size={16} /> Delete Selected ({selectedIds.length})
                        </button>
                    )}
                    <button className={styles.addBtn} onClick={() => router.push('/forms/daily-routines/new')}>
                        <Plus size={16} /> Add New
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className={styles.toolbar} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input
                        className={styles.searchInput}
                        placeholder="Search by client or program…"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                    <span className={styles.countBadge}>{filtered.length} sheet{filtered.length !== 1 ? 's' : ''}</span>
                </div>
                <button 
                    className={styles.addBtn} 
                    style={{ background: 'transparent', color: 'var(--text-secondary-light)', border: '1px solid var(--border-light)', padding: '6px', width: 'auto', justifySelf: 'flex-end', marginLeft: 'auto' }} 
                    onClick={() => setShowSettingsDrawer(true)} 
                    title="Page Settings"
                >
                    <MoreVertical size={20} />
                </button>
            </div>

            {/* Table */}
            {loading ? (
                <div className={styles.empty}>Loading…</div>
            ) : filtered.length === 0 ? (
                <div className={styles.empty}>
                    No Daily Routines tracked yet. Click <strong>+ Add New</strong> to create one.
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
                                {activeColumns.map(col => (
                                    <th 
                                        key={col.id}
                                        style={{ minWidth: col.minWidth }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            {col.label}
                                        </div>
                                    </th>
                                ))}
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(sheet => {
                                return (
                                    <tr key={sheet.id} onClick={(e) => { 
                                        // If clicking a row and it's not on a button, navigate or toggle selection 
                                        if ((e.target as HTMLElement).tagName.toLowerCase() === 'td') {
                                            router.push(`/forms/daily-routines/${sheet.id}`);
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
                                        {activeColumns.map(col => col.renderCell?.(sheet))}
                                        <td>
                                            <div className={styles.actions}>
                                                <button className={styles.editBtn} title="View" onClick={(e) => { e.stopPropagation(); window.open(`/forms/daily-routines/${sheet.id}/view`, '_blank'); }}>
                                                    <Eye size={13} />
                                                </button>
                                                <button className={styles.editBtn} title="Edit" onClick={(e) => { e.stopPropagation(); router.push(`/forms/daily-routines/${sheet.id}`); }}>
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
            <TableSettingsDrawer 
                isOpen={showSettingsDrawer}
                onClose={() => setShowSettingsDrawer(false)}
                columns={allColumnsOrdered}
                hiddenColumnIds={hiddenColumnIds}
                onToggleVisibility={toggleColumnVisibility}
                onMoveColumn={moveColumn}
                onReset={resetToDefaults}
            />
        </div>
    );
}
