'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Download, Printer } from 'lucide-react';
import TransactionSheetPrintView from '@/components/forms/TransactionSheetPrintView';
import { dbClient } from '@/lib/dbClient';

export default function TransactionSheetViewPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    const [sheet, setSheet] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) return;

        const loadSheet = async () => {
            try {
                const data = await dbClient.get(`/transaction-sheets/${id}`);
                if (!data) throw new Error('Failed to fetch transaction sheet');
                
                let migratedSheet = { ...data };
                if (!migratedSheet.sessions) migratedSheet.sessions = [];
                
                // If legacy data with no sessions but has a date/locations
                if (migratedSheet.sessions.length === 0 && (migratedSheet.locations || migratedSheet.date)) {
                    migratedSheet.sessions.push({
                        id: data.id ? String(Math.random()) : '',
                        date: migratedSheet.date || '',
                        employeeId: migratedSheet.employeeId || '',
                        employeeName: migratedSheet.employeeName || '',
                        cellPhoneLocation: migratedSheet.cellPhoneLocation || '',
                        locations: migratedSheet.locations || []
                    });
                }
                
                // Ensure at least one session so the meta card renders
                if (migratedSheet.sessions.length === 0) {
                    migratedSheet.sessions.push({
                        id: String(Math.random()), date: '', employeeId: '', employeeName: '', cellPhoneLocation: '', locations: []
                    });
                }
                
                setSheet(migratedSheet);
            } catch (err: any) {
                console.error('Error loading transaction sheet:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        loadSheet();
    }, [id]);

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f8fafc' }}>
                <div style={{ padding: '20px 40px', background: 'white', borderRadius: 12, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', color: '#64748b', fontWeight: 500 }}>
                    Loading sheet...
                </div>
            </div>
        );
    }

    if (error || !sheet) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f8fafc' }}>
                <div style={{ padding: '20px 40px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, color: '#ef4444', fontWeight: 500 }}>
                    {error || 'Sheet not found.'}
                </div>
            </div>
        );
    }

    const handleDownload = async () => {
        try {
            const html2pdf = (await import('html2pdf.js')).default;
            const element = document.getElementById('transaction-sheet-print-container');
            if (!element) return;
            
            const opt = {
                margin:       10,
                filename:     `Transaction_Sheet_${sheet.clientName}_${sheet.date}.pdf`,
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

    const handlePrint = () => {
        window.print();
    };

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
            
            {/* Top Navigation Bar - Hidden in Print */}
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
                <button 
                    onClick={() => router.push(`/forms/transaction-sheet/${params.id}`)}
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
                    <ArrowLeft size={16} /> Back to Edit
                </button>
                
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button 
                        onClick={handlePrint}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            background: '#1e293b', color: 'white',
                            border: 'none', padding: '8px 16px', borderRadius: '6px',
                            fontWeight: 600, fontSize: '14px', cursor: 'pointer',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                        }}
                    >
                        <Printer size={16} /> Print
                    </button>
                    <button 
                        onClick={handleDownload}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            background: 'var(--primary)', color: '#0f172a',
                            border: 'none', padding: '8px 16px', borderRadius: '6px',
                            fontWeight: 700, fontSize: '14px', cursor: 'pointer',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                        }}
                    >
                        <Download size={16} /> Download PDF
                    </button>
                </div>
            </div>

            {/* Document Container */}
            <div style={{ padding: '32px 24px' }}>
                <div 
                    className="print-container"
                    style={{
                        width: '96%',
                        maxWidth: '1500px',
                        margin: '0 auto',
                        background: 'white',
                        padding: '40px',
                        borderRadius: '12px',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)'
                    }}
                >
                    <div id="transaction-sheet-print-container">
                        <TransactionSheetPrintView sheet={sheet} printOnly={false} />
                    </div>
                </div>
            </div>
        </div>
    );
}
