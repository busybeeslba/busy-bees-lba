'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, Trash2, ClipboardList, Calendar, Eye, MoreVertical } from 'lucide-react';
import React from 'react';
import { useTableSettings, ColumnDef } from '@/hooks/useTableSettings';
import TableSettingsDrawer from '@/components/ui/TableSettingsDrawer';
import styles from './page.module.css';
import { dbClient } from '@/lib/dbClient';


export default function BaselineSheetListPage() {
    const router = useRouter();
    const [sheets, setSheets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIds, setSelectedIds] = useState<(number | string)[]>([]);

    useEffect(() => {
        dbClient.get('/academic_baselines').catch(() => [])
            .then(data => setSheets(Array.isArray(data) ? data : []))
            .finally(() => setLoading(false));
    }, []);

    const handleDelete = async (id: number | string) => {
        if (!confirm('Delete this Baseline Sheet?')) return;
            await dbClient.delete(`/academic_baselines/${id}`);
        setSheets(prev => prev.filter(s => s.id !== id));
        setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
    };

    const handleBulkDelete = async () => {
        if (!confirm(`Delete ${selectedIds.length} selected Baseline Forms?`)) return;
        setLoading(true);
        try {
            await Promise.all(selectedIds.map(id => dbClient.delete(`/academic_baselines/${id}`)));
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

    const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);

    const COLUMNS: ColumnDef<any>[] = React.useMemo(() => [
        { id: 'clientName', label: 'Client', renderCell: (sheet: any) => <td key="clientName" className={styles.clientCell} onClick={() => router.push(`/forms/baseline-sheet/${sheet.id}`)}><span className={styles.avatar}>{(sheet.clientName || '?')[0]}</span>{sheet.clientName || '—'}</td> },
        { id: 'program', label: 'Program', renderCell: (sheet: any) => <td key="program"><span className={styles.programChip}>{sheet.program || '—'}</span></td> },
        { id: 'sto', label: 'STO', renderCell: (sheet: any) => <td key="sto">{getStepCount(sheet)}</td> },
        { id: 'sessions', label: 'Sessions', renderCell: (sheet: any) => { const c = getSessionCount(sheet); return <td key="sessions"><span className={styles.sessionCountBadge}><Calendar size={11} style={{ display: 'inline', marginRight: 4 }} />{c} day{c !== 1 ? 's' : ''}</span></td> } },
        { id: 'lastSession', label: 'Last Session', renderCell: (sheet: any) => { const last = getLastSession(sheet); return <td key="lastSession" className={styles.dateCell}>{last ? new Date(last.date).toLocaleDateString() : '—'}</td> } },
        { id: 'lastEmployee', label: 'Last Employee', renderCell: (sheet: any) => { const last = getLastSession(sheet); return <td key="lastEmployee">{last?.employee || '—'}</td> } },
        { id: 'passFail', label: 'Pass / Fail', renderCell: (sheet: any) => {
            const { pass, fail, pct } = getPassFail(sheet);
            return <td key="passFail" onClick={e => e.stopPropagation()}>
                {pass === 0 && fail === 0 ? <span style={{ color: '#94a3b8', fontSize: 12 }}>—</span> :
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700 }}>
                    <span style={{ color: '#15803d', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '2px 7px' }}>✓{pass}</span>
                    <span style={{ color: '#dc2626', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 6, padding: '2px 7px' }}>✗{fail}</span>
                    {pct !== null && <span style={{ color: 'var(--primary)', background: 'var(--background-light)', border: '1px solid var(--border-light)', borderRadius: 6, padding: '2px 7px' }}>{pct}%</span>}
                </span>}
            </td>
        } }
    ], [router]);

    const { activeColumns, allColumnsOrdered, hiddenColumnIds, toggleColumnVisibility, moveColumn, resetToDefaults } = useTableSettings('baseline_forms_table_config', COLUMNS);

    return (
        <div className={styles.page}>
            {/* Header */}
            <div className={styles.pageHeader}>
                <div className={styles.headerLeft}>
                    <ClipboardList size={22} className={styles.headerIcon} />
                    <div>
                        <h1 className={styles.pageTitle}>Baseline Form</h1>
                        <p className={styles.pageSubtitle}>Longitudinal skill tracking — one sheet per client program</p>
                    </div>
                </div>
                <div>
                    {selectedIds.length > 0 && (
                        <button className={styles.deleteBtn} onClick={handleBulkDelete} style={{ height: '36px', padding: '0 16px', borderRadius: '8px', border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Trash2 size={16} /> Delete Selected ({selectedIds.length})
                        </button>
                    )}
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: 'auto' }}>
                    <button className={styles.addBtn} onClick={() => router.push('/forms/baseline-sheet/new')}>
                        <Plus size={16} /> Add New
                    </button>
                    <button 
                        className={styles.addBtn} 
                        style={{ background: 'transparent', color: 'var(--text-secondary-light)', border: '1px solid var(--border-light)', padding: '6px', width: 'auto' }} 
                        onClick={() => setShowSettingsDrawer(true)} 
                        title="Page Settings"
                    >
                        <MoreVertical size={20} />
                    </button>
                </div>
            </div>

            {/* Table */}
            {loading ? (
                <div className={styles.empty}>Loading…</div>
            ) : filtered.length === 0 ? (
                <div className={styles.empty}>
                    No Baseline Forms yet. Click <strong>+ Add New</strong> to create one.
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
                                            router.push(`/forms/baseline-sheet/${sheet.id}`);
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
                                        <td onClick={e => e.stopPropagation()}>
                                            <div className={styles.actions}>
                                                <button className={styles.editBtn} title="View" onClick={(e) => { e.stopPropagation(); window.open(`/forms/baseline-sheet/${sheet.id}/view`, '_blank'); }}>
                                                    <Eye size={13} />
                                                </button>
                                                <button className={styles.editBtn} title="Edit" onClick={(e) => { e.stopPropagation(); router.push(`/forms/baseline-sheet/${sheet.id}`); }}>
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
