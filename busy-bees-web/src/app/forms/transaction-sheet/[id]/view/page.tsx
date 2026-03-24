'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Download } from 'lucide-react';
import TransactionSheetPrintView from '@/components/forms/TransactionSheetPrintView';
import { dbClient } from '@/lib/dbClient';


export default function TransactionSheetViewPage() {
    const params = useParams();
    const id = params.id as string;
    const [sheet, setSheet] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) return;

        const loadSheet = async () => {
            try {
                const res = await dbClient.get(`/transaction-sheets/${id}`);
                if (!res.ok) throw new Error('Failed to fetch transaction sheet');
                const data = res; // Was .json()
                setSheet(data);
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
                jsPDF:        { unit: 'mm' as const, format: 'letter' as const, orientation: 'portrait' as const }
            };
            
            html2pdf().from(element).set(opt).save();
        } catch (err) {
            console.error('Failed to generate PDF:', err);
            alert('Failed to generate PDF. Please try using the browser print dialog (Ctrl/Cmd + P).');
        }
    };

    return (
        <div style={{ minHeight: '100vh', background: '#f1f5f9', padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <style>{`
                @media print {
                    .no-print { display: none !important; }
                    body { background: white !important; }
                }
            `}</style>
            
            <div className="no-print" style={{ width: '100%', maxWidth: 900, display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
                <button 
                    onClick={handleDownload}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '10px 20px', background: 'white', color: '#0f172a',
                        border: '1px solid #e2e8f0', borderRadius: 8, fontWeight: 600,
                        cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                    }}
                >
                    <Download size={18} />
                    Download PDF
                </button>
            </div>

            <div style={{ 
                background: 'white', 
                width: '100%', 
                maxWidth: 900, 
                borderRadius: 16, 
                padding: '40px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
            }}>
                <div id="transaction-sheet-print-container">
                    <TransactionSheetPrintView sheet={sheet} printOnly={false} />
                </div>
            </div>
        </div>
    );
}
