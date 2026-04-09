'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, Trash2, Calendar, Eye, Activity, Filter, Printer } from 'lucide-react';
import styles from '../baseline-sheet/page.module.css'; // Reusing existing styling
import { dbClient } from '@/lib/dbClient';

export default function TransactionSheetListPage() {
    const router = useRouter();
    const [sheets, setSheets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
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
        if (!confirm('Delete this Transaction Sheet?')) return;
        await dbClient.delete(`/transaction-sheets/${id}`);
        setSheets(prev => prev.filter(s => s.id !== id));
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

    return (
        <div className={styles.page}>
            {/* Header */}
            <div className={styles.pageHeader}>
                <div className={styles.headerLeft}>
                    <Activity size={22} className={styles.headerIcon} />
                    <div>
                        <h1 className={styles.pageTitle}>Transaction Sheets</h1>
                        <p className={styles.pageSubtitle}>Log and track location transitions and behaviors</p>
                    </div>
                </div>
                <button className={styles.addBtn} onClick={() => router.push('/forms/transaction-sheet/new')}>
                    <Plus size={16} /> New Sheet
                </button>
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
            </div>

            {/* Table */}
            {loading ? (
                <div className={styles.empty}>Loading…</div>
            ) : filtered.length === 0 ? (
                <div className={styles.empty}>
                    No Transaction Sheets found matching your filters.
                </div>
            ) : (
                <div className={styles.tableWrap}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th onClick={() => requestSort('id')} style={{cursor: 'pointer'}}>ID {sortConfig?.key === 'id' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                                <th onClick={() => requestSort('clientName')} style={{cursor: 'pointer'}}>Client {sortConfig?.key === 'clientName' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                                <th onClick={() => requestSort('date')} style={{cursor: 'pointer'}}>Date Range {sortConfig?.key === 'date' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                                <th>Locations Trk.</th>
                                <th>Employee</th>
                                <th>Last Edit</th>
                                <th>By</th>
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
                                    <tr key={sheet.id} className={styles.clickableRow} onClick={() => router.push(`/forms/transaction-sheet/${sheet.id}`)}>
                                        <td style={{ fontWeight: 600, color: '#64748b' }}>#{sheet.id}</td>
                                        <td className={styles.clientCell}>
                                            <span className={styles.avatar}>{(sheet.clientName || '?')[0]}</span>
                                            {sheet.clientName || '—'}
                                        </td>
                                        <td className={styles.dateCell}>
                                            <Calendar size={13} style={{ display: 'inline', marginRight: 6, opacity: 0.6 }} />
                                            {dates}
                                        </td>
                                        <td>
                                            <span style={{ fontWeight: 600, color: '#334155' }}>{locationSpecs}</span> total
                                        </td>
                                        <td>{sheet.employeeName || '—'}</td>
                                        <td>{sheet.updatedAt ? new Date(sheet.updatedAt).toLocaleDateString() : '—'}</td>
                                        <td>{sheet.lastEditBy || '—'}</td>
                                        <td>
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
        </div>
    );
}
