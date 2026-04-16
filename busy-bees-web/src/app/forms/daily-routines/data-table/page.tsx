'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardCheck, ArrowLeft, Download, Search, Filter, ChevronDown, ChevronUp, X, MoreVertical } from 'lucide-react';
import { useTableSettings, ColumnDef } from '@/hooks/useTableSettings';
import TableSettingsDrawer from '@/components/ui/TableSettingsDrawer';
import styles from '../../baseline-sheet/data-table/data-table.module.css';
import { dbClient } from '@/lib/dbClient';

const COLORS = ['#0d9488', '#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#06b6d4', '#ef4444', '#84cc16', '#f97316', '#6366f1'];

interface DailyRoutineRow {
    sheetId: number | string;
    clientName: string;
    program: string;
    day: number;
    date: string;
    employee: string;
    stepIdx: number;
    stepName: string;
    result: 'pass' | 'fail' | null;
}

export default function DailyRoutinesDataTablePage() {
    const router = useRouter();
    const [sheets, setSheets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [search, setSearch] = useState('');
    const [filterClient, setFilterClient] = useState('');
    const [filterProgram, setFilterProgram] = useState('');
    const [filterEmployee, setFilterEmployee] = useState('');
    const [filterResult, setFilterResult] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    // Sort
    const [sortCol, setSortCol] = useState<string>('date');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

    // Grouping
    const [groupBy, setGroupBy] = useState<'none' | 'client' | 'program' | 'day'>('client');
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

    useEffect(() => {
        dbClient.get('/daily_routines')
            .catch(() => []) // Handle error by returning an empty array
            .then(data => setSheets(Array.isArray(data) ? data : []))
            .finally(() => setLoading(false));
    }, []);

    // Flatten all sheets → one row per Step per session
    const allRows: DailyRoutineRow[] = [];
    sheets.forEach(sheet => {
        const rows: any[] = Array.isArray(sheet.rows) ? sheet.rows : [];
        const sessions: any[] = Array.isArray(sheet.sessions) ? sheet.sessions : [];
        sessions.forEach(sess => {
            rows.forEach((row, ri) => {
                const result = sess.results?.[String(ri)] ?? null;
                allRows.push({
                    sheetId: sheet.id,
                    clientName: sheet.clientName || '—',
                    program: sheet.program || '—',
                    day: sess.day ?? 1,
                    date: sess.date,
                    employee: sess.employeeName || '—',
                    stepIdx: ri,
                    stepName: row.step || `Step ${ri + 1}`,
                    result: result === 'pass' ? 'pass' : result === 'fail' ? 'fail' : null,
                });
            });
        });
    });

    const uniqueClients = [...new Set(allRows.map(r => r.clientName))].sort();
    const uniquePrograms = [...new Set(allRows.map(r => r.program))].sort();
    const uniqueEmployees = [...new Set(allRows.map(r => r.employee))].sort();

    // Apply filters
    let filtered = allRows.filter(r => {
        if (search && !`${r.clientName} ${r.program} ${r.stepName} ${r.employee}`.toLowerCase().includes(search.toLowerCase())) return false;
        if (filterClient && r.clientName !== filterClient) return false;
        if (filterProgram && r.program !== filterProgram) return false;
        if (filterEmployee && r.employee !== filterEmployee) return false;
        if (filterResult === 'pass' && r.result !== 'pass') return false;
        if (filterResult === 'fail' && r.result !== 'fail') return false;
        if (filterResult === 'empty' && r.result !== null) return false;
        return true;
    });

    // Apply sort
    filtered = [...filtered].sort((a, b) => {
        let av: any, bv: any;
        switch (sortCol) {
            case 'client': av = a.clientName; bv = b.clientName; break;
            case 'program': av = a.program; bv = b.program; break;
            case 'day': av = a.day; bv = b.day; break;
            case 'date': av = a.date; bv = b.date; break;
            case 'employee': av = a.employee; bv = b.employee; break;
            case 'step': av = a.stepName.toLowerCase(); bv = b.stepName.toLowerCase(); break;
            case 'result': av = a.result ?? 'z'; bv = b.result ?? 'z'; break;
            default: av = a.date; bv = b.date;
        }
        if (av < bv) return sortDir === 'asc' ? -1 : 1;
        if (av > bv) return sortDir === 'asc' ? 1 : -1;
        return 0;
    });

    const handleSort = (col: string) => {
        if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortCol(col); setSortDir('asc'); }
    };
    const SortIcon = ({ col }: { col: string }) => sortCol === col
        ? (sortDir === 'asc' ? <ChevronUp size={11} style={{ display: 'inline' }} /> : <ChevronDown size={11} style={{ display: 'inline' }} />)
        : <span style={{ opacity: 0.3 }}><ChevronDown size={11} style={{ display: 'inline' }} /></span>;

    const getGroupKey = (r: DailyRoutineRow) => {
        if (groupBy === 'client') return r.clientName;
        if (groupBy === 'program') return `${r.clientName} — ${r.program}`;
        if (groupBy === 'day') return `${r.clientName} — ${r.program} — Day ${r.day}`;
        return 'all';
    };
    const groups: { key: string; rows: DailyRoutineRow[] }[] = [];
    if (groupBy === 'none') {
        groups.push({ key: 'all', rows: filtered });
    } else {
        const map = new Map<string, DailyRoutineRow[]>();
        filtered.forEach(r => {
            const k = getGroupKey(r);
            if (!map.has(k)) map.set(k, []);
            map.get(k)!.push(r);
        });
        map.forEach((rows, key) => groups.push({ key, rows }));
    }
    const toggleGroup = (k: string) => setCollapsedGroups(prev => {
        const next = new Set(prev);
        next.has(k) ? next.delete(k) : next.add(k);
        return next;
    });

    const fmtDate = (d: string) => {
        try {
            const safe = /^\d{4}-\d{2}-\d{2}$/.test(d) ? d + 'T12:00:00' : d;
            return new Date(safe).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        } catch { return d; }
    };

    const groupPassRate = (rows: DailyRoutineRow[]) => {
        const recorded = rows.filter(r => r.result !== null);
        if (!recorded.length) return null;
        return Math.round(recorded.filter(r => r.result === 'pass').length / recorded.length * 100);
    };

    const exportCsv = () => {
        const headers = ['Client', 'Program', 'Day', 'Date', 'Employee', 'Step', 'Result'];
        const csvRows = [headers.join(',')];
        filtered.forEach(r => {
            csvRows.push([
                `"${r.clientName}"`, `"${r.program}"`, r.day, `"${r.date}"`, `"${r.employee}"`, `"${r.stepName}"`,
                r.result ?? '',
            ].join(','));
        });
        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'daily-routines-data.csv'; a.click();
        URL.revokeObjectURL(url);
    };

    const activeFilterCount = [filterClient, filterProgram, filterEmployee, filterResult].filter(Boolean).length;

    const totalPass = filtered.filter(r => r.result === 'pass').length;
    const totalFail = filtered.filter(r => r.result === 'fail').length;
    const totalRecorded = totalPass + totalFail;
    const avgPct = totalRecorded > 0 ? Math.round(totalPass / totalRecorded * 100) : null;

    const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);

    const COLUMNS: ColumnDef<any>[] = React.useMemo(() => [
        { 
            id: 'client', 
            label: 'Client', 
            sortKey: 'client', 
            renderCell: (r: any) => (
                <td key={`client-${r.sheetId}`} className={styles.td}>
                    <div className={styles.clientCell}>
                        <span className={styles.avatar}>{(r.clientName || '?')[0]}</span>
                        <span>{r.clientName}</span>
                    </div>
                </td>
            )
        },
        { 
            id: 'program', 
            label: 'Program', 
            sortKey: 'program', 
            renderCell: (r: any) => {
                const programColor = COLORS[uniquePrograms.indexOf(r.program) % COLORS.length];
                return (
                    <td key={`program-${r.sheetId}`} className={styles.td}>
                        <span className={styles.programChip} style={{ background: `${programColor}18`, color: programColor, border: `1px solid ${programColor}40` }}>
                            {r.program}
                        </span>
                    </td>
                );
            }
        },
        { id: 'day', label: 'Day', sortKey: 'day', renderCell: (r: any) => <td key={`day-${r.sheetId}`} className={`${styles.td} ${styles.tdCenter}`}><span className={styles.dayBadge}>D{r.day}</span></td> },
        { id: 'date', label: 'Date', sortKey: 'date', renderCell: (r: any) => <td key={`date-${r.sheetId}`} className={styles.td}>{fmtDate(r.date)}</td> },
        { id: 'employee', label: 'Employee', sortKey: 'employee', renderCell: (r: any) => <td key={`employee-${r.sheetId}`} className={styles.td}>{r.employee}</td> },
        { id: 'step', label: 'Step', sortKey: 'step', renderCell: (r: any) => <td key={`step-${r.sheetId}`} className={styles.td}><span className={styles.stoName}>{r.stepName}</span></td> },
        { id: 'result', label: 'Result', sortKey: 'result', renderCell: (r: any) => (
            <td key={`result-${r.sheetId}`} className={`${styles.td} ${styles.tdCenter}`}>
                {r.result === 'pass' ? (
                    <span className={styles.passChip}>
                        <span className={styles.resultIconPass}>✓</span> Pass
                    </span>
                ) : r.result === 'fail' ? (
                    <span className={styles.failChip}>
                        <span className={styles.resultIconFail}>✗</span> Fail
                    </span>
                ) : (
                    <span className={styles.emptyDash}>—</span>
                )}
            </td>
        ) }
    ], [uniquePrograms]);

    const { activeColumns, allColumnsOrdered, hiddenColumnIds, toggleColumnVisibility, moveColumn, resetToDefaults } = useTableSettings('daily_routines_data_table_config', COLUMNS);

    return (
        <div className={styles.page}>
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    <button className={styles.backBtn} onClick={() => router.push('/forms/daily-routines')} title="Back to list">
                        <ArrowLeft size={16} />
                    </button>
                    <ClipboardCheck size={22} className={styles.headerIcon} />
                    <div>
                        <h1 className={styles.title}>Daily Routines — Data Table</h1>
                        <p className={styles.subtitle}>{filtered.length} rows · {allRows.length} total entries</p>
                    </div>
                </div>
                <button className={styles.exportBtn} onClick={exportCsv} title="Export as CSV">
                    <Download size={15} /> Export CSV
                </button>
            </div>

            {/* Toolbar */}
            <div className={styles.toolbar}>
                <div className={styles.searchWrap}>
                    <Search size={14} className={styles.searchIcon} />
                    <input className={styles.search} placeholder="Search client, program, step, employee…"
                        value={search} onChange={e => setSearch(e.target.value)} />
                    {search && <button className={styles.clearBtn} onClick={() => setSearch('')}><X size={12} /></button>}
                </div>
                <div className={styles.toolbarRight}>
                    <label className={styles.selectLabel}>Group by</label>
                    <select className={styles.select} value={groupBy} onChange={e => setGroupBy(e.target.value as any)}>
                        <option value="none">None</option>
                        <option value="client">Client</option>
                        <option value="program">Client + Program</option>
                        <option value="day">Client + Program + Day</option>
                    </select>
                    <button className={`${styles.filterBtn} ${showFilters ? styles.filterBtnActive : ''}`} onClick={() => setShowFilters(f => !f)}>
                        <Filter size={14} /> Filters
                        {activeFilterCount > 0 && <span className={styles.filterCount}>{activeFilterCount}</span>}
                    </button>
                    <button className={styles.filterBtn} onClick={() => setShowSettingsDrawer(true)} title="Page Settings" style={{ padding: '8px' }}>
                        <MoreVertical size={16} />
                    </button>
                </div>
            </div>

            {/* Filter panel */}
            {showFilters && (
                <div className={styles.filterPanel}>
                    <div className={styles.filterRow}>
                        <div className={styles.filterGroup}>
                            <label className={styles.filterLabel}>Client</label>
                            <select className={styles.filterSelect} value={filterClient} onChange={e => setFilterClient(e.target.value)}>
                                <option value="">All clients</option>
                                {uniqueClients.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div className={styles.filterGroup}>
                            <label className={styles.filterLabel}>Program</label>
                            <select className={styles.filterSelect} value={filterProgram} onChange={e => setFilterProgram(e.target.value)}>
                                <option value="">All programs</option>
                                {uniquePrograms.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                        <div className={styles.filterGroup}>
                            <label className={styles.filterLabel}>Employee</label>
                            <select className={styles.filterSelect} value={filterEmployee} onChange={e => setFilterEmployee(e.target.value)}>
                                <option value="">All employees</option>
                                {uniqueEmployees.map(e => <option key={e} value={e}>{e}</option>)}
                            </select>
                        </div>
                        <div className={styles.filterGroup}>
                            <label className={styles.filterLabel}>Result</label>
                            <select className={styles.filterSelect} value={filterResult} onChange={e => setFilterResult(e.target.value)}>
                                <option value="">All results</option>
                                <option value="pass">✓ Pass only</option>
                                <option value="fail">✗ Fail only</option>
                                <option value="empty">— Not recorded</option>
                            </select>
                        </div>
                        {activeFilterCount > 0 && (
                            <button className={styles.clearFiltersBtn} onClick={() => {
                                setFilterClient(''); setFilterProgram(''); setFilterEmployee(''); setFilterResult('');
                            }}>
                                <X size={12} /> Clear all
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Table */}
            {loading ? (
                <div className={styles.empty}>Loading…</div>
            ) : filtered.length === 0 ? (
                <div className={styles.empty}>No rows match the current filters.</div>
            ) : (
                <div className={styles.tableWrap}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                {activeColumns.filter(col => {
                                    if (col.id === 'client' && groupBy !== 'none') return false;
                                    if (col.id === 'program' && groupBy !== 'none' && groupBy !== 'client') return false;
                                    return true;
                                }).map(col => (
                                    <th 
                                        key={col.id} 
                                        className={`${styles.th} ${col.id === 'result' ? styles.thTrial : ''}`} 
                                        onClick={col.sortKey ? () => handleSort(col.sortKey as string) : undefined}
                                        style={{ minWidth: col.minWidth }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            {col.label} {col.sortKey && <SortIcon col={col.sortKey} />}
                                        </div>
                                    </th>
                                ))}
                                <th className={`${styles.th} ${styles.thAction}`}>Edit</th>
                            </tr>
                        </thead>
                        <tbody>
                            {groups.map(({ key, rows }) => {
                                const isCollapsed = collapsedGroups.has(key);
                                const pct = groupPassRate(rows);
                                const pctColor = pct === null ? '#94a3b8' : pct >= 80 ? '#15803d' : pct >= 60 ? '#0f766e' : '#dc2626';
                                const pctBg = pct === null ? 'transparent' : pct >= 80 ? '#f0fdf4' : pct >= 60 ? '#f0fdfa' : '#fef2f2';
                                const pctBorder = pct === null ? 'transparent' : pct >= 80 ? '#86efac' : pct >= 60 ? '#fde68a' : '#fca5a5';
                                const passCount = rows.filter(r => r.result === 'pass').length;
                                const failCount = rows.filter(r => r.result === 'fail').length;

                                return (
                                    <React.Fragment key={key}>
                                        {groupBy !== 'none' && (
                                            <tr key={`gh-${key}`} className={styles.groupHeader} onClick={() => toggleGroup(key)}>
                                                <td colSpan={99}>
                                                    <div className={styles.groupHeaderInner}>
                                                        <span className={styles.groupChevron}>{isCollapsed ? '▶' : '▼'}</span>
                                                        <span className={styles.groupName}>{key}</span>
                                                        <span className={styles.groupCount}>{rows.length} row{rows.length !== 1 ? 's' : ''}</span>
                                                        <span className={styles.groupPassFail}>
                                                            <span style={{ color: '#15803d' }}>✓{passCount}</span>
                                                            <span style={{ color: '#dc2626' }}>✗{failCount}</span>
                                                        </span>
                                                        {pct !== null && (
                                                            <span className={styles.groupPct} style={{ color: pctColor, background: pctBg, border: `1px solid ${pctBorder}` }}>
                                                                {pct}% pass
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                        {!isCollapsed && rows.map((r, ri) => {
                                            return (
                                                <tr key={`${r.sheetId}-${r.day}-${r.stepIdx}-${ri}`}
                                                    className={ri % 2 === 0 ? styles.rowEven : styles.rowOdd}>
                                                    {activeColumns.filter(col => {
                                                        if (col.id === 'client' && groupBy !== 'none') return false;
                                                        if (col.id === 'program' && groupBy !== 'none' && groupBy !== 'client') return false;
                                                        return true;
                                                    }).map(col => col.renderCell?.(r))}
                                                    <td className={`${styles.td} ${styles.tdCenter}`}>
                                                        <a href={`/forms/daily-routines/${r.sheetId}`} className={styles.editLink} onClick={e => e.stopPropagation()}>✏</a>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>

                    {/* Summary footer */}
                    <div className={styles.footer}>
                        <span>{filtered.length} row{filtered.length !== 1 ? 's' : ''}</span>
                        <span>·</span>
                        <span style={{ color: '#15803d' }}>✓ {totalPass} Pass</span>
                        <span style={{ color: '#dc2626' }}>✗ {totalFail} Fail</span>
                        {avgPct !== null && (
                            <span style={{
                                color: avgPct >= 80 ? '#15803d' : avgPct >= 60 ? '#0f766e' : '#dc2626',
                                fontWeight: 800
                            }}>{avgPct}% pass rate</span>
                        )}
                    </div>
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
