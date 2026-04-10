'use client';

import { useState, useMemo, useEffect } from 'react';
import {
    Search, Filter, ArrowUpDown, Calendar,
    Clock, User, FileText, Trash2, MoreVertical,
    MapPin, X, ChevronRight, Briefcase, Hash
} from 'lucide-react';
import { useDataFilter, FilterRule, MatchType } from '@/hooks/useDataFilter';
import FilterDrawer from '@/components/ui/FilterDrawer';
import styles from './page.module.css';
import { dbClient } from '@/lib/dbClient';


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

function formatSessionId(id: string | number): string {
    return `SES-${String(id).padStart(6, '0')}`;
}

export default function SessionSummaryPage() {
    const [sessions, setSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterRules, setFilterRules] = useState<FilterRule[]>([]);
    const [matchType, setMatchType] = useState<MatchType>('AND');
    const [showFilterDrawer, setShowFilterDrawer] = useState(false);
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
    const [activeActionId, setActiveActionId] = useState<string | null>(null);
    const [selectedSession, setSelectedSession] = useState<any | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        const load = () => {
            dbClient.get('/sessions')
                .then((data: any[]) => {
                    const mapped = data.map((s: any) => ({
                        id: String(s.id),
                        sessionId: s.sessionId || `SES-${String(s.id).padStart(6, '0')}`,  // fallback for old records
                        clientName: s.clientName || '—',
                        clientId: s.clientId || '—',
                        clientStatus: s.clientStatus || '—',
                        employeeName: s.employeeName || s.workerName || '—',
                        employeeId: s.employeeId || '—',
                        serviceType: s.serviceType || '—',
                        startTime: s.startTime || '',
                        endTime: s.endTime || '',
                        durationSeconds: s.durationSeconds || 0,
                        status: s.status || 'completed',
                        notes: s.notes || '',
                        documents: Array.isArray(s.documents) ? s.documents : [],
                        route: Array.isArray(s.route) ? s.route : [],
                    }));
                    setSessions(mapped);
                })
                .catch(() => console.warn('⚠️  Shared database not reachable on port 3011.'))
                .finally(() => setLoading(false));
        };

        load(); // initial fetch
        const interval = setInterval(load, 10_000); // poll every 10 seconds
        return () => clearInterval(interval);
    }, []);

    const handleSort = (key: string) => {
        setSortConfig(prev =>
            prev?.key === key && prev.direction === 'asc'
                ? { key, direction: 'desc' }
                : { key, direction: 'asc' }
        );
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this session?')) return;
        try {
            await dbClient.delete(`/sessions/${id}`);
            setSessions(prev => prev.filter(s => s.id !== id));
            if (selectedSession?.id === id) setSelectedSession(null);
        } catch {
            alert('Could not delete — is the shared database running?');
        }
        setActiveActionId(null);
    };

    const handleBulkDelete = async () => {
        if (!confirm(`Delete ${selectedIds.size} selected session(s)?`)) return;
        try {
            await Promise.all(Array.from(selectedIds).map(id => dbClient.delete(`/sessions/${id}`)));
            setSessions(prev => prev.filter(s => !selectedIds.has(s.id)));
            setSelectedIds(new Set());
            if (selectedSession && selectedIds.has(selectedSession.id)) setSelectedSession(null);
        } catch {
            alert('Could not delete some sessions.');
        }
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === displayed.length && displayed.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(displayed.map((s: any) => s.id)));
        }
    };

    const toggleSelect = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const filteredByRules = useDataFilter({ data: sessions, rules: filterRules, matchType });

    const displayed = useMemo(() => {
        let items = filteredByRules.filter((s: any) =>
            [s.clientName, s.employeeName, s.serviceType, s.id, s.clientId]
                .join(' ').toLowerCase().includes(searchQuery.toLowerCase())
        );
        if (sortConfig) {
            items = [...items].sort((a: any, b: any) => {
                const av = a[sortConfig.key] ?? '';
                const bv = b[sortConfig.key] ?? '';
                if (av < bv) return sortConfig.direction === 'asc' ? -1 : 1;
                if (av > bv) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return items;
    }, [filteredByRules, searchQuery, sortConfig]);

    const SortIcon = ({ col }: { col: string }) => (
        <ArrowUpDown size={14} color={sortConfig?.key === col ? 'var(--primary)' : 'var(--text-secondary-light)'} />
    );

    return (
        <div className={styles.container}>
            {/* Toolbar */}
            <div className={styles.toolbar}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div className={styles.searchBox}>
                        <Search size={20} color="var(--text-secondary-light)" />
                        <input type="text" placeholder="Search sessions..." className={styles.searchInput}
                            value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    {selectedIds.size > 0 && (
                        <button 
                            onClick={handleBulkDelete}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}
                        >
                            <Trash2 size={16} /> Delete Selected ({selectedIds.size})
                        </button>
                    )}
                    <button className={styles.filterBtn} onClick={() => setShowFilterDrawer(true)}>
                        <Filter size={16} color="currentColor" />
                        <span>Filter {filterRules.length > 0 && `(${filterRules.length})`}</span>
                    </button>
                </div>
            </div>

            <FilterDrawer
                isOpen={showFilterDrawer}
                onClose={() => setShowFilterDrawer(false)}
                storageKey="session_summary"
                columns={[
                    { id: 'clientName', label: 'Client Name' },
                    { id: 'employeeName', label: 'Employee' },
                    { id: 'serviceType', label: 'Service Type' },
                    { id: 'status', label: 'Status' },
                    { id: 'clientStatus', label: 'Client Status' },
                ]}
                rules={filterRules}
                matchType={matchType}
                onApply={(rules, type) => { setFilterRules(rules); setMatchType(type); setShowFilterDrawer(false); }}
            />

            {/* Split View */}
            <div className={styles.contentWrapper}>
                {/* Table */}
                <div className={`${styles.tableContainer} ${selectedSession ? styles.tableContainerShrink : ''}`}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th style={{ width: '40px', textAlign: 'center', cursor: 'pointer' }} onClick={toggleSelectAll}>
                                    <input 
                                        type="checkbox" 
                                        checked={displayed.length > 0 && selectedIds.size === displayed.length} 
                                        onChange={toggleSelectAll} 
                                        onClick={e => e.stopPropagation()}
                                        style={{ cursor: 'pointer' }}
                                    />
                                </th>
                                <th onClick={() => handleSort('id')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>Session ID <SortIcon col="id" /></div>
                                </th>
                                <th onClick={() => handleSort('startTime')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>Date &amp; Time <SortIcon col="startTime" /></div>
                                </th>
                                <th onClick={() => handleSort('employeeName')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>Employee <SortIcon col="employeeName" /></div>
                                </th>
                                <th onClick={() => handleSort('clientName')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>Client <SortIcon col="clientName" /></div>
                                </th>
                                <th onClick={() => handleSort('serviceType')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>Service Type <SortIcon col="serviceType" /></div>
                                </th>
                                <th onClick={() => handleSort('durationSeconds')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>Duration <SortIcon col="durationSeconds" /></div>
                                </th>
                                <th>Forms</th>
                                <th>Notes</th>
                                <th onClick={() => handleSort('status')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>Status <SortIcon col="status" /></div>
                                </th>
                                <th style={{ textAlign: 'center' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && (
                                <tr><td colSpan={10} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary-light)' }}>Loading sessions…</td></tr>
                            )}
                            {!loading && displayed.length === 0 && (
                                <tr><td colSpan={10} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary-light)' }}>
                                    No sessions found. Sessions completed on the mobile app will appear here automatically.
                                </td></tr>
                            )}
                            {displayed.map(session => {
                                const { date, time } = formatDateTime(session.startTime);
                                const isActive = session.status === 'active';
                                const isSelected = selectedSession?.id === session.id;
                                return (
                                    <tr key={session.id}
                                        className={`${isSelected ? styles.selectedRow : ''} ${selectedIds.has(session.id) ? styles.checkedRow : ''}`}
                                        onClick={() => setSelectedSession(isSelected ? null : session)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <td onClick={e => e.stopPropagation()} style={{ textAlign: 'center' }}>
                                            <input 
                                                type="checkbox" 
                                                checked={selectedIds.has(session.id)}
                                                onChange={() => toggleSelect(session.id)}
                                                style={{ cursor: 'pointer' }}
                                            />
                                        </td>
                                        <td>
                                            <span style={{ fontWeight: 700, color: 'var(--primary)', fontFamily: 'monospace', fontSize: '13px' }}>
                                                {session.sessionId}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <Calendar size={14} color="var(--text-secondary-light)" />
                                                <div>
                                                    <div style={{ fontWeight: 500 }}>{date}</div>
                                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary-light)' }}>{time}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: 500 }}>{session.employeeName}</div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-secondary-light)' }}>{session.employeeId}</div>
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: 500 }}>{session.clientName}</div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-secondary-light)' }}>{session.clientId}</div>
                                        </td>
                                        <td>{session.serviceType}</td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Clock size={14} color="var(--text-secondary-light)" />
                                                {formatDuration(session.durationSeconds)}
                                            </div>
                                        </td>
                                        <td>
                                            {session.documents.length > 0 ? (
                                                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                                    {session.documents.map((doc: any, i: number) => (
                                                        <span key={i} className={styles.formBubble}>
                                                            <FileText size={12} />{doc.type}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : <span style={{ fontSize: '12px', color: 'var(--text-secondary-light)' }}>—</span>}
                                        </td>
                                        <td>
                                            {session.notes ? (
                                                <span className={styles.notesPreview} title={session.notes}>
                                                    {session.notes.length > 50 ? session.notes.slice(0, 50) + '…' : session.notes}
                                                </span>
                                            ) : (
                                                <span style={{ fontSize: '12px', color: 'var(--text-secondary-light)' }}>—</span>
                                            )}
                                        </td>
                                        <td>
                                            <span className={`${styles.statusBadge} ${
                                                session.status === 'active' ? styles.active : 
                                                session.status === 'cancelled' ? styles.cancelled : styles.completed
                                            }`}>
                                                {session.status === 'active' ? 'Active' : 
                                                 session.status === 'cancelled' ? 'Cancelled' : 'Completed'}
                                            </span>
                                        </td>
                                        <td onClick={e => e.stopPropagation()}>
                                            <div className={styles.actionMenuContainer}>
                                                <button className={styles.actionBtn}
                                                    onClick={e => { e.stopPropagation(); setActiveActionId(activeActionId === session.id ? null : session.id); }}>
                                                    <MoreVertical size={20} />
                                                </button>
                                                {activeActionId === session.id && (
                                                    <div className={styles.dropdownMenu} onClick={e => e.stopPropagation()}>
                                                        <button className={styles.dropdownItem}
                                                            onClick={() => { setSelectedSession(session); setActiveActionId(null); }}>
                                                            <ChevronRight size={16} /><span>View Details</span>
                                                        </button>
                                                        <button className={`${styles.dropdownItem} ${styles.deleteItem}`}
                                                            onClick={() => handleDelete(session.id)}>
                                                            <Trash2 size={16} /><span>Delete</span>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    <div className={styles.tableFooter}>Showing {displayed.length} rows</div>
                </div>

                {/* Detail Panel */}
                {selectedSession && (
                    <aside className={styles.detailPanel}>
                        <div className={styles.detailHeader}>
                            <div>
                                <span className={`${styles.statusBadge} ${
                                    selectedSession.status === 'active' ? styles.active : 
                                    selectedSession.status === 'cancelled' ? styles.cancelled : styles.completed
                                }`}>
                                    {selectedSession.status === 'active' ? 'Active' : 
                                     selectedSession.status === 'cancelled' ? 'Cancelled' : 'Completed'}
                                </span>
                                <h2 className={styles.detailTitle}>{selectedSession.sessionId}</h2>
                                <p className={styles.detailSubtitle}>{formatDateTime(selectedSession.startTime).full}</p>
                            </div>
                            <button className={styles.closeBtn} onClick={() => setSelectedSession(null)}><X size={20} /></button>
                        </div>

                        <div className={styles.detailBody}>
                            {/* Employee */}
                            <div className={styles.detailSection}>
                                <h3 className={styles.sectionLabel}><User size={14} /> Employee</h3>
                                <div className={styles.detailGrid}>
                                    <div className={styles.detailItem}>
                                        <label>Name</label><span>{selectedSession.employeeName}</span>
                                    </div>
                                    <div className={styles.detailItem}>
                                        <label>Employee ID</label><span>{selectedSession.employeeId}</span>
                                    </div>
                                </div>
                            </div>

                            <div className={styles.divider} />

                            {/* Client */}
                            <div className={styles.detailSection}>
                                <h3 className={styles.sectionLabel}><Hash size={14} /> Client</h3>
                                <div className={styles.detailGrid}>
                                    <div className={styles.detailItem}>
                                        <label>Name</label><span>{selectedSession.clientName}</span>
                                    </div>
                                    <div className={styles.detailItem}>
                                        <label>Client ID</label><span>{selectedSession.clientId}</span>
                                    </div>
                                    <div className={styles.detailItem}>
                                        <label>Client Status</label>
                                        <span className={`${styles.statusBadge} ${selectedSession.clientStatus === 'Active' ? styles.completed : styles.inactive}`}>
                                            {selectedSession.clientStatus || '—'}
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
                                        <label>Type</label><span>{selectedSession.serviceType}</span>
                                    </div>
                                    <div className={styles.detailItem}>
                                        <label>Duration</label>
                                        <span style={{ fontWeight: 600 }}>{formatDuration(selectedSession.durationSeconds)}</span>
                                    </div>
                                    <div className={styles.detailItem}>
                                        <label>Start Time</label><span>{formatDateTime(selectedSession.startTime).full}</span>
                                    </div>
                                    {selectedSession.endTime && (
                                        <div className={styles.detailItem}>
                                            <label>End Time</label><span>{formatDateTime(selectedSession.endTime).full}</span>
                                        </div>
                                    )}
                                </div>
                                {selectedSession.notes && (
                                    <div className={styles.notesBox}>
                                        <label>Session Notes</label>
                                        <p>{selectedSession.notes}</p>
                                    </div>
                                )}
                            </div>

                            {/* Client Form History — all sessions for this client */}
                            <div className={styles.divider} />
                            <div className={styles.detailSection}>
                                <h3 className={styles.sectionLabel}><FileText size={14} /> Form History — {selectedSession.clientName}</h3>
                                {(() => {
                                    // Collect all forms across every session for this client
                                    const clientSessions = sessions.filter(
                                        s => s.clientId === selectedSession.clientId || s.clientName === selectedSession.clientName
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
                                                isCurrentSession: s.id === selectedSession.id,
                                            });
                                        });
                                    });

                                    if (allForms.length === 0) {
                                        return <p style={{ fontSize: '13px', color: 'var(--text-secondary-light)', margin: '8px 0 0' }}>No forms submitted for this client yet.</p>;
                                    }

                                    // Sort newest first
                                    allForms.sort((a, b) => new Date(b.formDate).getTime() - new Date(a.formDate).getTime());

                                    return (
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
                                                                    #{row.sessionId}
                                                                </span>
                                                                {row.isCurrentSession && (
                                                                    <span className={styles.thisSessionTag}>This</span>
                                                                )}
                                                            </td>
                                                            <td>
                                                                <div style={{ fontWeight: 500, fontSize: '12px' }}>{formatDateTime(row.formDate).date}</div>
                                                                <div style={{ fontSize: '11px', color: 'var(--text-secondary-light)' }}>{formatDateTime(row.formDate).time}</div>
                                                            </td>
                                                            <td style={{ fontSize: '12px' }}>{row.employeeName}</td>
                                                            <td>
                                                                <span className={styles.formBubble}>
                                                                    <FileText size={11} />{row.formType}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            <div className={styles.historyFooter}>{allForms.length} form{allForms.length !== 1 ? 's' : ''} across {clientSessions.filter(s => s.documents?.length > 0).length} session{clientSessions.filter(s => s.documents?.length > 0).length !== 1 ? 's' : ''}</div>
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* GPS Locations */}
                            <div className={styles.divider} />
                            <div className={styles.detailSection}>
                                <h3 className={styles.sectionLabel}><MapPin size={14} /> GPS Location History ({selectedSession.route.length} points)</h3>
                                {selectedSession.route.length === 0 ? (
                                    <p style={{ fontSize: '13px', color: 'var(--text-secondary-light)' }}>No GPS data recorded for this session.</p>
                                ) : (
                                    <div className={styles.locationList}>
                                        {selectedSession.route.map((pt: any, i: number) => (
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
                    </aside>
                )}
            </div>
        </div>
    );
}
