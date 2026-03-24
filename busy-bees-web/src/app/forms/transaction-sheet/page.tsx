'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, Trash2, CheckSquare, Calendar, Eye, Activity } from 'lucide-react';
import styles from '../baseline-sheet/page.module.css'; // Reusing existing styling
import { dbClient } from '@/lib/dbClient';


export default function TransactionSheetListPage() {
    const router = useRouter();
    const [sheets, setSheets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

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

    const filtered = sheets.filter(s =>
        !searchQuery ||
        (s.clientName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.employeeName || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

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

            {/* Search */}
            <div className={styles.toolbar}>
                <input
                    className={styles.searchInput}
                    placeholder="Search by client or employee…"
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
                    No Transaction Sheets tracked yet. Click "New Sheet" to start tracking.
                </div>
            ) : (
                <div className={styles.tableWrap}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Client</th>
                                <th>Date</th>
                                <th>Locations Trk.</th>
                                <th>Employee</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(sheet => {
                                const locationCount = Array.isArray(sheet.locations) ? sheet.locations.length : 0;
                                return (
                                    <tr key={sheet.id} className={styles.clickableRow} onClick={() => router.push(`/forms/transaction-sheet/${sheet.id}`)}>
                                        <td className={styles.clientCell}>
                                            <span className={styles.avatar}>{(sheet.clientName || '?')[0]}</span>
                                            {sheet.clientName || '—'}
                                        </td>
                                        <td className={styles.dateCell}>
                                            <Calendar size={13} style={{ display: 'inline', marginRight: 6, opacity: 0.6 }} />
                                            {sheet.date ? new Date(sheet.date + 'T12:00:00').toLocaleDateString() : '—'}
                                        </td>
                                        <td>
                                            <span style={{ fontWeight: 600, color: '#334155' }}>{locationCount}</span> logged
                                        </td>
                                        <td>{sheet.employeeName || '—'}</td>
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
