'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, Trash2, Calendar, Eye, Activity, Filter, Printer, MoreVertical } from 'lucide-react';
import React from 'react';
import { useTableSettings, ColumnDef } from '@/hooks/useTableSettings';
import TableSettingsDrawer from '@/components/ui/TableSettingsDrawer';
import styles from '../baseline-sheet/page.module.css';
import { dbClient } from '@/lib/dbClient';

export default function TransactionSheetListPage() {
    const router = useRouter();
    const [sheets, setSheets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIds, setSelectedIds] = useState<(number | string)[]>([]);
    const [clientFilter, setClientFilter] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

    useEffect(() => {
        dbClient.get('/transaction-sheets').catch(() => [])
            .then(data => setSheets(Array.isArray(data) ? data : []))
            .finally(() => setLoading(false));
    }, []);

    const handleDelete = async (id: number | string) => {
        if (!confirm('Delete this Transaction Form?')) return;
        await dbClient.delete(`/transaction-sheets/${id}`);
        setSheets(prev => prev.filter(s => s.id !== id));
        setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
    };

    const handleBulkDelete = async () => {
        if (!confirm(`Delete ${selectedIds.length} selected Transaction Forms?`)) return;
        setLoading(true);
        try {
            await Promise.all(selectedIds.map(id => dbClient.delete(`/transaction-sheets/${id}`)));
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

    // Calculate dynamic filter options
    const uniqueClients = Array.from(new Set(sheets.map(s => s.clientName).filter(Boolean))).sort();

    const filtered = sheets.filter(s => {
        const matchesSearch = !searchQuery || 
            (s.clientName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (s.employeeName || '').toLowerCase().includes(searchQuery.toLowerCase());
        
        const matchesClient = !clientFilter || s.clientName === clientFilter;
        
        // Check date range
        let matchesDate = true;
        const sheetDates: string[] = [];
        if (Array.isArray(s.sessions)) {
            sheetDates.push(...s.sessions.map((sess: any) => sess.date).filter(Boolean));
        } else if (s.date) {
            sheetDates.push(s.date);
        }

        if (startDate) {
            matchesDate = matchesDate && sheetDates.some(d => d >= startDate);
        }
        if (endDate) {
            matchesDate = matchesDate && sheetDates.some(d => d <= endDate);
        }
        
        // If the sheet has no dates, we still might want to show it if no date filters are active
        if ((startDate || endDate) && sheetDates.length === 0) {
            matchesDate = false; 
        }

        return matchesSearch && matchesClient && matchesDate;
    });

    const sortedData = [...filtered];
    if (sortConfig !== null) {
        sortedData.sort((a, b) => {
            let aValue = a[sortConfig.key];
            let bValue = b[sortConfig.key];
            
            if (sortConfig.key === 'clientName') {
                aValue = (a.clientName || '').toLowerCase();
                bValue = (b.clientName || '').toLowerCase();
            } else if (sortConfig.key === 'date') {
                const getSheetDate = (sheet: any) => {
                    if (Array.isArray(sheet.sessions) && sheet.sessions.length > 0) {
                        return new Date(sheet.sessions[0].date).getTime();
                    }
                    return new Date(sheet.date || sheet.createdAt || 0).getTime();
                };
                aValue = getSheetDate(a);
                bValue = getSheetDate(b);
            } else if (sortConfig.key === 'id') {
                aValue = Number(a.id) || 0;
                bValue = Number(b.id) || 0;
            }

            if (aValue < bValue) {
                return sortConfig.direction === 'asc' ? -1 : 1;
            }
            if (aValue > bValue) {
                return sortConfig.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });
    }

    const requestSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const handleViewAggregate = () => {
        if (!clientFilter) {
            alert('Please select a Client from the dropdown first to view an aggregate report.');
            return;
        }
        const query = new URLSearchParams({
            client: clientFilter,
            start: startDate,
            end: endDate
        }).toString();
        window.open(`/forms/transaction-sheet/report?${query}`, '_blank');
    };

    const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);

    const COLUMNS: ColumnDef<any>[] = React.useMemo(() => [
        { id: 'id', label: 'ID', sortKey: 'id', renderCell: (sheet: any) => <td key="id" style={{ fontWeight: 600, color: '#64748b' }}>#{sheet.id}</td> },
        { id: 'clientName', label: 'Client', sortKey: 'clientName', renderCell: (sheet: any) => <td key="clientName" className={styles.clientCell} onClick={() => router.push(`/forms/transaction-sheet/${sheet.id}`)}><span className={styles.avatar}>{(sheet.clientName || '?')[0]}</span>{sheet.clientName || '—'}</td> },
        { id: 'date', label: 'Date Range', sortKey: 'date', renderCell: (sheet: any) => {
            let dates = '—';
            if (Array.isArray(sheet.sessions) && sheet.sessions.length > 0) {
                const d1 = new Date(sheet.sessions[0].date + 'T12:00:00').toLocaleDateString();
                const d2 = new Date(sheet.sessions[sheet.sessions.length - 1].date + 'T12:00:00').toLocaleDateString();
                dates = d1 === d2 ? d1 : `${d1} - ${d2}`;
            } else if (sheet.date) {
                dates = new Date(sheet.date + 'T12:00:00').toLocaleDateString();
            }
            return <td key="date" className={styles.dateCell}><Calendar size={13} style={{ display: 'inline', marginRight: 6, opacity: 0.6 }} />{dates}</td>
        } },
        { id: 'locationsTrk', label: 'Locations Trk.', renderCell: (sheet: any) => {
            const locationSpecs = Array.isArray(sheet.sessions) 
                ? sheet.sessions.reduce((acc: number, sess: any) => acc + (Array.isArray(sess.locations) ? sess.locations.length : 0), 0)
                : (Array.isArray(sheet.locations) ? sheet.locations.length : 0);
            return <td key="locationsTrk"><span style={{ fontWeight: 600, color: '#334155' }}>{locationSpecs}</span> total</td>
        } },
        { id: 'employee', label: 'Employee', renderCell: (sheet: any) => <td key="employee">{sheet.employeeName || '—'}</td> },
        { id: 'lastEdit', label: 'Last Edit', renderCell: (sheet: any) => <td key="lastEdit">{sheet.updatedAt ? new Date(sheet.updatedAt).toLocaleDateString() : '—'}</td> },
        { id: 'by', label: 'By', renderCell: (sheet: any) => <td key="by">{sheet.lastEditBy || '—'}</td> }
    ], [router]);

    const { activeColumns, allColumnsOrdered, hiddenColumnIds, toggleColumnVisibility, moveColumn, resetToDefaults } = useTableSettings('transaction_sheet_list_config', COLUMNS);

    return (
        <div className={styles.page}>
            {/* Header */}
            <div className={styles.pageHeader}>
                <div className={styles.headerLeft}>
                    <Activity size={22} className={styles.headerIcon} />
                    <div>
                        <h1 className={styles.pageTitle}>Transaction Form</h1>
                        <p className={styles.pageSubtitle}>Log and track location transitions and behaviors</p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {selectedIds.length > 0 && (
                        <button className={styles.deleteBtn} onClick={handleBulkDelete} style={{ height: '36px', padding: '0 16px', borderRadius: '8px', border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Trash2 size={16} /> Delete Selected ({selectedIds.length})
                        </button>
                    )}
                    <button className={styles.addBtn} onClick={() => router.push('/forms/transaction-sheet/new')}>
                        <Plus size={16} /> Add New
                    </button>
                </div>
            </div>

            {/* Search & Filters */}
            <div className={styles.toolbar}>
                <input
                    className={styles.searchInput}
                    placeholder="Search by client or employee…"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                />

                <select 
                    className={styles.searchInput} 
                    style={{ maxWidth: '160px', cursor: 'pointer' }}
                    value={clientFilter}
                    onChange={e => setClientFilter(e.target.value)}
                >
                    <option value="">All Clients</option>
                    {uniqueClients.map(client => (
                        <option key={client as string} value={client as string}>{client as string}</option>
                    ))}
                </select>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input
                        type="date"
                        className={styles.searchInput}
                        style={{ maxWidth: '130px', cursor: 'pointer' }}
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        title="Start Date"
                    />
                    <span style={{ color: '#94a3b8', fontSize: '12px' }}>to</span>
                    <input
                        type="date"
                        className={styles.searchInput}
                        style={{ maxWidth: '130px', cursor: 'pointer' }}
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                        title="End Date"
                    />
                </div>

                <button 
                    className={styles.editBtn} 
                    style={{ padding: '0 12px', width: 'auto', background: 'white' }}
                    onClick={() => { setSearchQuery(''); setClientFilter(''); setStartDate(''); setEndDate(''); }}
                    title="Clear Filters"
                >
                    <Filter size={15} style={{ marginRight: 6 }} /> Clear
                </button>

                <button 
                    className={styles.addBtn} 
                    style={{ padding: '6px 16px', height: 'auto', background: 'var(--primary)', fontWeight: 700 }}
                    onClick={handleViewAggregate}
                    title="View aggregate report for selected client and date range"
                >
                    <Eye size={15} style={{ marginRight: 6 }} /> View
                </button>

                <div style={{ flex: 1 }} />
                <span className={styles.countBadge}>{filtered.length} sheet{filtered.length !== 1 ? 's' : ''}</span>
                
                <button 
                    className={styles.addBtn} 
                    style={{ background: 'transparent', color: 'var(--text-secondary-light)', border: '1px solid var(--border-light)', padding: '6px', width: 'auto', marginLeft: '8px' }} 
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
                    No Transaction Forms found matching your filters.
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
                                        onClick={col.sortKey ? () => requestSort(col.sortKey as string) : undefined}
                                        style={{ cursor: col.sortKey ? 'pointer' : 'default', minWidth: col.minWidth }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            {col.label} {col.sortKey && sortConfig?.key === col.sortKey ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                                        </div>
                                    </th>
                                ))}
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedData.map(sheet => {
                                const locationSpecs = Array.isArray(sheet.sessions) 
                                    ? sheet.sessions.reduce((acc: number, sess: any) => acc + (Array.isArray(sess.locations) ? sess.locations.length : 0), 0)
                                    : (Array.isArray(sheet.locations) ? sheet.locations.length : 0);
                                
                                let dates = '—';
                                if (Array.isArray(sheet.sessions) && sheet.sessions.length > 0) {
                                    const d1 = new Date(sheet.sessions[0].date + 'T12:00:00').toLocaleDateString();
                                    const d2 = new Date(sheet.sessions[sheet.sessions.length - 1].date + 'T12:00:00').toLocaleDateString();
                                    dates = d1 === d2 ? d1 : `${d1} - ${d2}`;
                                } else if (sheet.date) {
                                    dates = new Date(sheet.date + 'T12:00:00').toLocaleDateString();
                                }

                                return (
                                    <tr key={sheet.id} onClick={(e) => { 
                                        if ((e.target as HTMLElement).tagName.toLowerCase() === 'td') {
                                            router.push(`/forms/transaction-sheet/${sheet.id}`);
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
                                                <button className={styles.editBtn} onClick={(e) => { e.stopPropagation(); window.open(`/forms/transaction-sheet/${sheet.id}/view`, '_blank'); }} title="View">
                                                    <Eye size={13} />
                                                </button>
                                                <button className={styles.editBtn} onClick={(e) => { e.stopPropagation(); router.push(`/forms/transaction-sheet/${sheet.id}`); }} title="Edit">
                                                    <Pencil size={13} />
                                                </button>
                                                <button className={styles.deleteBtn} onClick={(e) => { e.stopPropagation(); handleDelete(sheet.id); }} title="Delete">
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
