'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, ArrowLeft, Download, Search, Filter } from 'lucide-react';
import styles from '../../baseline-sheet/data-table/data-table.module.css';
import { dbClient } from '@/lib/dbClient';


export default function TransactionDataTablePage() {
    const router = useRouter();
    const [sheets, setSheets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        dbClient.get('/transaction-sheets').catch(() => [])
            .then(data => setSheets(Array.isArray(data) ? data : []))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className={styles.page}>
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    <button className={styles.backBtn} onClick={() => router.push('/forms/transaction-sheet')} title="Back to list">
                        <ArrowLeft size={16} />
                    </button>
                    <Activity size={22} className={styles.headerIcon} />
                    <div>
                        <h1 className={styles.title}>Transaction Sheets — Data Table</h1>
                        <p className={styles.subtitle}>Aggregated view coming soon</p>
                    </div>
                </div>
                <button className={styles.exportBtn} disabled title="Export as CSV">
                    <Download size={15} /> Export CSV
                </button>
            </div>

            {/* Table */}
            {loading ? (
                <div className={styles.empty}>Loading…</div>
            ) : (
                <div className={styles.empty}>
                    The Transaction Sheet aggregated data view will be implemented soon. 
                    <br/><br/>
                    Currently {sheets.length} sheets are tracked in the database.
                </div>
            )}
        </div>
    );
}
