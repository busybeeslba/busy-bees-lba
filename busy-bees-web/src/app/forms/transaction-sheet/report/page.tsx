'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { ArrowLeft, Printer, Download } from 'lucide-react';
import TransactionSheetPrintView from '@/components/forms/TransactionSheetPrintView';
import { dbClient } from '@/lib/dbClient';

function AggregateReportContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    
    const clientParam = searchParams.get('client') || '';
    const startParam = searchParams.get('start') || '';
    const endParam = searchParams.get('end') || '';

    const [aggregateSheet, setAggregateSheet] = useState<any>(null);
    const [allClients, setAllClients] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const buildAggregate = async () => {
            try {
                setLoading(true);
                const data = await dbClient.get('/transaction-sheets');
                if (!Array.isArray(data)) throw new Error('Failed to fetch transaction sheets');

                const unique = Array.from(new Set(data.map(s => s.clientName).filter(Boolean))).sort();
                setAllClients(unique as string[]);

                if (!clientParam) {
                    setError('Please specify a client in the dropdown to view an aggregate report.');
                    setLoading(false);
                    return;
                }

                // Filter logic identical to list page
                const filtered = data.filter(s => {
                    const matchesClient = s.clientName === clientParam;
                    
                    let matchesDate = true;
                    const sheetDates: string[] = [];
                    
                    if (Array.isArray(s.sessions)) {
                        sheetDates.push(...s.sessions.map((sess: any) => sess.date).filter(Boolean));
                    } else if (s.date) {
                        sheetDates.push(s.date);
                    }

                    if (startParam) {
                        matchesDate = matchesDate && sheetDates.some(d => d >= startParam);
                    }
                    if (endParam) {
                        matchesDate = matchesDate && sheetDates.some(d => d <= endParam);
                    }

                    if ((startParam || endParam) && sheetDates.length === 0) {
                        matchesDate = false; 
                    }

                    return matchesClient && matchesDate;
                });

                if (filtered.length === 0) {
                    setError('No transaction sheets found for this client and date range.');
                    setLoading(false);
                    return;
                }

                setError(null);

                // Aggregate
                const allSessions: any[] = [];
                let programStr = '';

                filtered.forEach(sheet => {
                    if (!programStr && sheet.program) programStr = sheet.program;

                    if (Array.isArray(sheet.sessions) && sheet.sessions.length > 0) {
                        const validSessions = sheet.sessions.filter((sess: any) => {
                            if (!sess.date) return true;
                            if (startParam && sess.date < startParam) return false;
                            if (endParam && sess.date > endParam) return false;
                            return true;
                        });
                        allSessions.push(...validSessions);
                    } else if (sheet.locations || sheet.date) {
                        // Legacy single-day migration
                        allSessions.push({
                            id: sheet.id || String(Math.random()),
                            date: sheet.date || '',
                            employeeId: sheet.employeeId || '',
                            employeeName: sheet.employeeName || '',
                            cellPhoneLocation: sheet.cellPhoneLocation || '',
                            locations: sheet.locations || []
                        });
                    }
                });

                // Sort ascending by date
                allSessions.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

                const sheetObj = {
                    clientName: clientParam,
                    program: programStr || 'Multiple/Varied Programs',
                    sessions: allSessions
                };

                setAggregateSheet(sheetObj);
            } catch (err: any) {
                console.error(err);
                setError(err.message || 'Error fetching data');
            } finally {
                setLoading(false);
            }
        };

        buildAggregate();
    }, [clientParam, startParam, endParam]);

    const handlePrint = () => {
        window.print();
    };

    const handleDownload = async () => {
        if (!aggregateSheet) return;
        try {
            const html2pdf = (await import('html2pdf.js')).default;
            const element = document.getElementById('transaction-sheet-print-container');
            if (!element) return;
            
            const opt = {
                margin:       10,
                filename:     `Aggregate_Report_${clientParam}_${startParam || 'All'}_to_${endParam || 'All'}.pdf`,
                image:        { type: 'jpeg' as const, quality: 0.98 },
                html2canvas:  { scale: 2, useCORS: true },
                jsPDF:        { unit: 'mm' as const, format: 'letter' as const, orientation: 'landscape' as const }
            };
            
            html2pdf().from(element).set(opt).save();
        } catch (err) {
            console.error('Failed to generate PDF:', err);
            alert('Failed to generate PDF. Please try using the browser print dialog (Ctrl/Cmd + P).');
        }
    };

    const setFilter = (key: string, val: string) => {
        const q = new URLSearchParams(searchParams.toString());
        if (val) q.set(key, val);
        else q.delete(key);
        router.push(`${pathname}?${q.toString()}`);
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f8fafc' }}>
                <div style={{ padding: '20px 40px', background: 'white', borderRadius: 12, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', color: '#64748b', fontWeight: 500 }}>
                    Building aggregate report...
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: '#f1f5f9', fontFamily: 'system-ui, sans-serif' }}>
            <style>{`
                @media print {
                    .no-print { display: none !important; }
                    body { background: white !important; }
                    .print-container { 
                        box-shadow: none !important; 
                        margin: 0 !important; 
                        padding: 0 !important;
                        max-width: 100% !important;
                    }
                    @page { margin: 15mm 12mm; size: A4 landscape; }
                }
            `}</style>
            
            <div className="no-print" style={{ 
                background: 'white', 
                borderBottom: '1px solid #e2e8f0',
                padding: '12px 24px',
                position: 'sticky',
                top: 0,
                zIndex: 10,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <button 
                        onClick={() => router.push('/forms/transaction-sheet')}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            background: 'transparent', border: 'none',
                            color: '#64748b', fontWeight: 600, fontSize: '14px',
                            cursor: 'pointer', padding: '6px 12px', borderRadius: '6px',
                            transition: 'background 0.2s'
                        }}
                        onMouseOver={e => e.currentTarget.style.background = '#f1f5f9'}
                        onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                    >
                        <ArrowLeft size={16} /> Back
                    </button>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderLeft: '1px solid #e2e8f0', paddingLeft: '20px' }}>
                        <select 
                            style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', outline: 'none' }}
                            value={clientParam}
                            onChange={(e) => setFilter('client', e.target.value)}
                        >
                            <option value="">Select Client...</option>
                            {allClients.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <input
                            type="date"
                            style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', outline: 'none' }}
                            value={startParam}
                            onChange={(e) => setFilter('start', e.target.value)}
                        />
                        <span style={{color: '#94a3b8', fontSize: '13px'}}>to</span>
                        <input
                            type="date"
                            style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', outline: 'none' }}
                            value={endParam}
                            onChange={(e) => setFilter('end', e.target.value)}
                        />
                    </div>
                </div>
                
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button 
                        onClick={handleDownload}
                        disabled={!!error || !aggregateSheet}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            background: 'white', color: '#1e293b', border: '1px solid #cbd5e1',
                            padding: '8px 16px', borderRadius: '6px', fontWeight: 600, fontSize: '13px',
                            cursor: (error || !aggregateSheet) ? 'not-allowed' : 'pointer', opacity: (error || !aggregateSheet) ? 0.5 : 1
                        }}
                    >
                        <Download size={15} /> Download PDF
                    </button>
                    <button 
                        onClick={handlePrint}
                        disabled={!!error || !aggregateSheet}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            background: '#1e293b', color: 'white', border: 'none',
                            padding: '8px 16px', borderRadius: '6px', fontWeight: 600, fontSize: '13px',
                            cursor: (error || !aggregateSheet) ? 'not-allowed' : 'pointer', opacity: (error || !aggregateSheet) ? 0.5 : 1,
                            boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                        }}
                    >
                        <Printer size={15} /> Print Report
                    </button>
                </div>
            </div>

            {error || !aggregateSheet ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 60px)' }}>
                    <div style={{ padding: '20px 40px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, color: '#ef4444', fontWeight: 500 }}>
                        {error || 'No report available.'}
                    </div>
                </div>
            ) : (
                <div style={{ padding: '32px 0', width: '96%', maxWidth: '1500px', margin: '0 auto' }}>
                    <div className="print-container" style={{ 
                        background: 'white', 
                        borderRadius: '12px', 
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.05)',
                        padding: '40px' 
                    }}>
                        <div id="transaction-sheet-print-container">
                            <TransactionSheetPrintView sheet={aggregateSheet} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function AggregateReportPage() {
    return (
        <Suspense fallback={<div style={{ padding: 40 }}>Loading report...</div>}>
            <AggregateReportContent />
        </Suspense>
    );
}
