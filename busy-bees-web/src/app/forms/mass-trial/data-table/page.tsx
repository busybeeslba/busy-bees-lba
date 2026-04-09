'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart2, ArrowLeft, Download, Search, Filter, ChevronDown, ChevronUp, X } from 'lucide-react';
import styles from './data-table.module.css';
import { dbClient } from '@/lib/dbClient';

const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ec4899', '#3b82f6', '#8b5cf6', '#ef4444', '#06b6d4', '#84cc16', '#f97316'];
const MAX_TRIALS = 5;

interface Trial {
    sheetId: number | string;
    clientName: string;
    program: string;
    day: number;
    date: string;
    employee: string;
    stoIdx: number;
    stoName: string;
    trials: string[];
    pct: number | null;
}

export default function DttDataTablePage() {
    const router = useRouter();
    const [sheets, setSheets] = useState<any[]>([]);
    const [clients, setClients] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [search, setSearch] = useState('');
    const [filterClient, setFilterClient] = useState('');
    const [filterProgram, setFilterProgram] = useState('');
    const [filterEmployee, setFilterEmployee] = useState('');
    const [filterPctMin, setFilterPctMin] = useState('');
    const [filterPctMax, setFilterPctMax] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    // Sort
    const [sortCol, setSortCol] = useState<string>('date');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

    // Grouping
    const [groupBy, setGroupBy] = useState<'none' | 'client' | 'program' | 'day'>('client');
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

    useEffect(() => {
        Promise.all([
            dbClient.get('/mass_trials').catch(() => []),
            dbClient.get('/clients').catch(() => []),
        ]).then(([massTr, cls]) => {
            setSheets(Array.isArray(massTr) ? massTr : []);
            setClients(Array.isArray(cls) ? cls : []);
        }).finally(() => setLoading(false));
    }, []);

    // Flatten all sheets into individual STO×Session rows
    const allRows: Trial[] = [];
    sheets.forEach(sheet => {
        const rows: any[] = Array.isArray(sheet.rows) ? sheet.rows : [];
        const sessions: any[] = Array.isArray(sheet.sessions) ? sheet.sessions : [];
        sessions.forEach(sess => {
            rows.forEach((row, ri) => {
                const t: string[] = sess.results?.[String(ri)] || [];
                const counted = t.filter((v: string) => v === '+' || v === '-');
                const pct = counted.length > 0 ? Math.round(counted.filter((v: string) => v === '+').length / counted.length * 100) : null;
                allRows.push({
                    sheetId: sheet.id,
                    clientName: sheet.clientName || '—',
                    program: sheet.program || '—',
                    day: sess.day ?? 1,
                    date: sess.date,
                    employee: sess.employeeName || '—',
                    stoIdx: ri,
                    stoName: row.step || `STO ${ri + 1}`,
                    trials: Array.from({ length: MAX_TRIALS }, (_, i) => t[i] || ''),
                    pct,
                });
            });
        });
    });

    // Gather unique filter options
    const uniqueClients = [...new Set(allRows.map(r => r.clientName))].sort();
    const uniquePrograms = [...new Set(allRows.map(r => r.program))].sort();
    const uniqueEmployees = [...new Set(allRows.map(r => r.employee))].sort();

    // Apply filters
    let filtered = allRows.filter(r => {
        if (search && !`${r.clientName} ${r.program} ${r.stoName} ${r.employee}`.toLowerCase().includes(search.toLowerCase())) return false;
        if (filterClient && r.clientName !== filterClient) return false;
        if (filterProgram && r.program !== filterProgram) return false;
        if (filterEmployee && r.employee !== filterEmployee) return false;
        if (filterPctMin !== '' && (r.pct === null || r.pct < Number(filterPctMin))) return false;
        if (filterPctMax !== '' && (r.pct === null || r.pct > Number(filterPctMax))) return false;
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
            case 'sto': av = a.stoName.toLowerCase(); bv = b.stoName.toLowerCase(); break;
            case 'pct': av = a.pct ?? -1; bv = b.pct ?? -1; break;
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

    // Group rows
    const getGroupKey = (r: Trial) => {
        if (groupBy === 'client') return r.clientName;
        if (groupBy === 'program') return `${r.clientName} — ${r.program}`;
        if (groupBy === 'day') return `${r.clientName} — ${r.program} — Day ${r.day}`;
        return 'all';
    };
    const groups: { key: string; rows: Trial[] }[] = [];
    if (groupBy === 'none') {
        groups.push({ key: 'all', rows: filtered });
    } else {
        const map = new Map<string, Trial[]>();
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

    const pctColor = (p: number | null) => {
        if (p === null) return { color: '#94a3b8', bg: 'transparent', border: 'transparent' };
        if (p >= 80) return { color: '#15803d', bg: '#f0fdf4', border: '#86efac' };
        if (p >= 60) return { color: '#0f766e', bg: '#f0fdfa', border: '#fde68a' };
        return { color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' };
    };

    const TrialCell = ({ val }: { val: string }) => {
        if (val === '+') return <span className={styles.trialPass}>✓</span>;
        if (val === '-') return <span className={styles.trialFail}>✗</span>;
        return <span className={styles.trialEmpty}>·</span>;
    };

    // Export CSV
    const exportCsv = () => {
        const headers = ['Client', 'Program', 'Day', 'Date', 'Employee', 'STO', 'T1', 'T2', 'T3', 'T4', 'T5', '% Correct'];
        const csvRows = [headers.join(',')];
        filtered.forEach(r => {
            csvRows.push([
                `"${r.clientName}"`, `"${r.program}"`, r.day, `"${r.date}"`, `"${r.employee}"`, `"${r.stoName}"`,
                ...r.trials.map(t => t === '+' ? 'Pass' : t === '-' ? 'Fail' : ''),
                r.pct !== null ? `${r.pct}%` : '',
            ].join(','));
        });
        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'dtt-data.csv'; a.click();
        URL.revokeObjectURL(url);
    };

    const activeFilterCount = [filterClient, filterProgram, filterEmployee, filterPctMin, filterPctMax].filter(Boolean).length;

    return (
        <div className={styles.page}>
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    <button className={styles.backBtn} onClick={() => router.push('/forms/mass-trial')} title="Back to list">
                        <ArrowLeft size={16} />
                    </button>
                    <BarChart2 size={22} className={styles.headerIcon} />
                    <div>
                        <h1 className={styles.title}>Mass Trial / DTT — Data Table</h1>
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
                    <input className={styles.search} placeholder="Search client, program, STO, employee…"
                        value={search} onChange={e => setSearch(e.target.value)} />
                    {search && <button className={styles.clearBtn} onClick={() => setSearch('')}><X size={12} /></button>}
                </div>

                <div className={styles.toolbarRight}>
                    {/* Group by */}
                    <label className={styles.selectLabel}>Group by</label>
                    <select className={styles.select} value={groupBy} onChange={e => setGroupBy(e.target.value as any)}>
                        <option value="none">None</option>
                        <option value="client">Client</option>
                        <option value="program">Client + Program</option>
                        <option value="day">Client + Program + Day</option>
                    </select>

                    {/* Filters toggle */}
                    <button className={`${styles.filterBtn} ${showFilters ? styles.filterBtnActive : ''}`} onClick={() => setShowFilters(f => !f)}>
                        <Filter size={14} />
                        Filters{activeFilterCount > 0 && <span className={styles.filterCount}>{activeFilterCount}</span>}
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
                            <label className={styles.filterLabel}>% Correct</label>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                <input className={styles.filterInput} type="number" placeholder="Min" min={0} max={100}
                                    value={filterPctMin} onChange={e => setFilterPctMin(e.target.value)} />
                                <span style={{ color: '#94a3b8', fontSize: 12 }}>–</span>
                                <input className={styles.filterInput} type="number" placeholder="Max" min={0} max={100}
                                    value={filterPctMax} onChange={e => setFilterPctMax(e.target.value)} />
                            </div>
                        </div>
                        {activeFilterCount > 0 && (
                            <button className={styles.clearFiltersBtn} onClick={() => {
                                setFilterClient(''); setFilterProgram(''); setFilterEmployee('');
                                setFilterPctMin(''); setFilterPctMax('');
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
                                {groupBy === 'none' && (
                                    <th className={styles.th} onClick={() => handleSort('client')} style={{ minWidth: 130 }}>
                                        Client <SortIcon col="client" />
                                    </th>
                                )}
                                {(groupBy === 'none' || groupBy === 'client') && (
                                    <th className={styles.th} onClick={() => handleSort('program')} style={{ minWidth: 110 }}>
                                        Program <SortIcon col="program" />
                                    </th>
                                )}
                                <th className={styles.th} onClick={() => handleSort('day')} style={{ width: 56 }}>
                                    Day <SortIcon col="day" />
                                </th>
                                <th className={styles.th} onClick={() => handleSort('date')} style={{ minWidth: 110 }}>
                                    Date <SortIcon col="date" />
                                </th>
                                <th className={styles.th} onClick={() => handleSort('employee')} style={{ minWidth: 120 }}>
                                    Employee <SortIcon col="employee" />
                                </th>
                                <th className={styles.th} onClick={() => handleSort('sto')} style={{ minWidth: 140 }}>
                                    STO <SortIcon col="sto" />
                                </th>
                                {/* Trial columns T1–T5 */}
                                {Array.from({ length: MAX_TRIALS }, (_, i) => (
                                    <th key={i} className={`${styles.th} ${styles.thTrial}`}>T{i + 1}</th>
                                ))}
                                <th className={styles.th} onClick={() => handleSort('pct')} style={{ minWidth: 80 }}>
                                    % Correct <SortIcon col="pct" />
                                </th>
                                <th className={`${styles.th} ${styles.thTrial}`}>Edit</th>
                            </tr>
                        </thead>
                        <tbody>
                            {groups.map(({ key, rows }) => {
                                const isCollapsed = collapsedGroups.has(key);
                                const groupPct = (() => {
                                    const counted = rows.filter(r => r.pct !== null);
                                    return counted.length > 0 ? Math.round(counted.reduce((s, r) => s + (r.pct ?? 0), 0) / counted.length) : null;
                                })();
                                const pc = pctColor(groupPct);

                                return (
                                    <React.Fragment key={key}>
                                        {/* Group header row */}
                                        {groupBy !== 'none' && (
                                            <tr className={styles.groupHeader} onClick={() => toggleGroup(key)}>
                                                <td colSpan={99}>
                                                    <div className={styles.groupHeaderInner}>
                                                        <span className={styles.groupChevron}>{isCollapsed ? '▶' : '▼'}</span>
                                                        <span className={styles.groupName}>{key}</span>
                                                        <span className={styles.groupCount}>{rows.length} row{rows.length !== 1 ? 's' : ''}</span>
                                                        {groupPct !== null && (
                                                            <span className={styles.groupPct} style={{ color: pc.color, background: pc.bg, border: `1px solid ${pc.border}` }}>
                                                                {groupPct}% avg
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}

                                        {/* Data rows */}
                                        {!isCollapsed && rows.map((r, ri) => {
                                            const pc2 = pctColor(r.pct);
                                            const programColor = COLORS[uniquePrograms.indexOf(r.program) % COLORS.length];
                                            return (
                                                <tr key={`${r.sheetId}-${r.day}-${r.stoIdx}-${ri}`}
                                                    className={ri % 2 === 0 ? styles.rowEven : styles.rowOdd}>
                                                    {groupBy === 'none' && (
                                                        <td className={styles.td}>
                                                            <div className={styles.clientCell}>
                                                                <span className={styles.avatar}>{(r.clientName || '?')[0]}</span>
                                                                <span>{r.clientName}</span>
                                                            </div>
                                                        </td>
                                                    )}
                                                    {(groupBy === 'none' || groupBy === 'client') && (
                                                        <td className={styles.td}>
                                                            <span className={styles.programChip} style={{ background: `${programColor}18`, color: programColor, border: `1px solid ${programColor}40` }}>
                                                                {r.program}
                                                            </span>
                                                        </td>
                                                    )}
                                                    <td className={`${styles.td} ${styles.tdCenter}`}>
                                                        <span className={styles.dayBadge}>D{r.day}</span>
                                                    </td>
                                                    <td className={styles.td}>{fmtDate(r.date)}</td>
                                                    <td className={styles.td}>{r.employee}</td>
                                                    <td className={styles.td}>
                                                        <span className={styles.stoName}>{r.stoName}</span>
                                                    </td>
                                                    {r.trials.map((t, ti) => (
                                                        <td key={ti} className={`${styles.td} ${styles.tdCenter}`}>
                                                            <TrialCell val={t} />
                                                        </td>
                                                    ))}
                                                    <td className={`${styles.td} ${styles.tdCenter}`}>
                                                        {r.pct !== null ? (
                                                            <span className={styles.pctBadge} style={{ color: pc2.color, background: pc2.bg, border: `1.5px solid ${pc2.border}` }}>
                                                                {r.pct}%
                                                            </span>
                                                        ) : <span className={styles.emptyDash}>—</span>}
                                                    </td>
                                                    <td className={`${styles.td} ${styles.tdCenter}`}>
                                                        <a href={`/forms/mass-trial/${r.sheetId}`} className={styles.editLink} onClick={e => e.stopPropagation()}>✏</a>
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
                        <span style={{ color: '#15803d' }}>✓ {filtered.reduce((s, r) => s + r.trials.filter(t => t === '+').length, 0)} Pass</span>
                        <span style={{ color: '#dc2626' }}>✗ {filtered.reduce((s, r) => s + r.trials.filter(t => t === '-').length, 0)} Fail</span>
                        {(() => {
                            const withPct = filtered.filter(r => r.pct !== null);
                            if (!withPct.length) return null;
                            const avg = Math.round(withPct.reduce((s, r) => s + (r.pct ?? 0), 0) / withPct.length);
                            const pc = pctColor(avg);
                            return <span style={{ color: pc.color, fontWeight: 800 }}>{avg}% avg correct</span>;
                        })()}
                    </div>
                </div>
            )}
        </div>
    );
}
