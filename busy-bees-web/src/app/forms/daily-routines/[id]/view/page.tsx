'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { dbClient } from '@/lib/dbClient';
import DailyRoutinesPrintView from '@/components/forms/DailyRoutinesPrintView';
import { ArrowLeft, Download, Printer, Filter } from 'lucide-react';

export default function DailyRoutinesViewPage() {
    const params = useParams();
    const router = useRouter();
    
    const [sheet, setSheet] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [includeGraph, setIncludeGraph] = useState(true);

    // Filter states
    const [showFilters, setShowFilters] = useState(false);
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());

    useEffect(() => {
        if (!params.id) return;
        setLoading(true);
        dbClient.get(`/daily_routines/${params.id}`)
            .then(data => {
                setSheet(data);
                if (data?.rows) {
                    setSelectedItems(new Set(data.rows.map((_: any, i: number) => i)));
                }
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [params.id]);

    const handlePrint = () => {
        window.print();
    };

    const handleDownloadPDF = async () => {
        try {
            const html2pdf = (await import('html2pdf.js')).default;
            const element = document.getElementById('daily-routines-print-container');
            if (!element) return;
            
            const clientName = sheet?.clientName || 'Client';
            const programName = sheet?.program || 'Program';
            const date = new Date().toISOString().split('T')[0];
            const filename = `DailyRoutines_${clientName}_${programName}_${date}.pdf`.replace(/[^a-zA-Z0-9_.-]/g, '_');

            const opt = {
                margin: 15,
                filename: filename,
                image: { type: 'jpeg' as const, quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true },
                jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'landscape' as const }
            };

            const clonedElement = element.cloneNode(true) as HTMLElement;
            const container = document.createElement('div');
            container.appendChild(clonedElement);
            document.body.appendChild(container);
            
            html2pdf().from(container).set(opt).save().then(() => {
                document.body.removeChild(container);
            });
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Failed to generate PDF. Please try printing to PDF instead.');
        }
    };

    const toggleItem = (idx: number) => {
        const next = new Set(selectedItems);
        if (next.has(idx)) next.delete(idx);
        else next.add(idx);
        setSelectedItems(next);
    };

    const filteredSheet = useMemo(() => {
        if (!sheet) return null;
        
        // Filter rows and inject originalIndex
        const filteredRows = (sheet.rows || [])
            .map((r: any, i: number) => ({ ...r, originalIndex: i }))
            .filter((r: any) => selectedItems.has(r.originalIndex));
            
        // Filter sessions by date range
        const filteredSessions = (sheet.sessions || []).filter((s: any) => {
            if (!s.date) return true;
            if (startDate && s.date < startDate) return false;
            if (endDate && s.date > endDate) return false;
            return true;
        });
        
        return {
            ...sheet,
            rows: filteredRows,
            sessions: filteredSessions
        };
    }, [sheet, startDate, endDate, selectedItems]);

    if (loading) {
        return <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading document...</div>;
    }

    if (!sheet) {
        return (
            <div style={{ padding: '40px', textAlign: 'center' }}>
                <h2 style={{ color: '#0f172a', marginBottom: '12px' }}>Document Not Found</h2>
                <button 
                    onClick={() => router.push('/forms/daily-routines')}
                    style={{ 
                        padding: '8px 16px', background: 'var(--primary)', border: 'none', 
                        borderRadius: '6px', fontWeight: 600, cursor: 'pointer' 
                    }}
                >
                    Return to List
                </button>
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
                background: 'white', borderBottom: '1px solid #e2e8f0', padding: '12px 24px',
                position: 'sticky', top: 0, zIndex: 10, display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}>
                <button 
                    onClick={() => router.push(`/forms/daily-routines/${params.id}`)}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: 'none',
                        color: '#64748b', fontWeight: 600, fontSize: '14px', cursor: 'pointer', padding: '6px 12px', borderRadius: '6px',
                        transition: 'background 0.2s'
                    }}
                    onMouseOver={e => e.currentTarget.style.background = '#f1f5f9'}
                    onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                >
                    <ArrowLeft size={16} /> Back to Edit
                </button>
                
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <button 
                        onClick={() => setShowFilters(!showFilters)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            background: showFilters ? '#f0fdfa' : 'white',
                            color: showFilters ? '#0f766e' : '#475569',
                            border: showFilters ? '1px solid var(--primary)' : '1px solid #e2e8f0', 
                            padding: '6px 16px', borderRadius: '6px',
                            fontWeight: 600, fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s'
                        }}
                    >
                        <Filter size={16} /> Filters
                    </button>

                    <label style={{ 
                        display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#475569', cursor: 'pointer',
                        padding: '4px 8px', borderRadius: '6px', transition: 'background 0.2s'
                    }} onMouseOver={e => e.currentTarget.style.background = '#f1f5f9'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                        <input 
                            type="checkbox" checked={includeGraph} onChange={(e) => setIncludeGraph(e.target.checked)} 
                            style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: 'var(--primary)' }}
                        />
                        Include Graph
                    </label>

                    <button 
                        onClick={handlePrint}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '8px', background: '#1e293b', color: 'white',
                            border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 600, fontSize: '14px', cursor: 'pointer',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                        }}
                    >
                        <Printer size={16} /> Print
                    </button>
                    <button 
                        onClick={handleDownloadPDF}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--primary)', color: '#0f172a',
                            border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 700, fontSize: '14px', cursor: 'pointer',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                        }}
                    >
                        <Download size={16} /> Download
                    </button>
                </div>
            </div>

            {showFilters && (
                <div className="no-print" style={{
                    background: 'white', padding: '24px 32px', borderBottom: '1px solid #e2e8f0',
                    display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
                }}>
                    <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date Range</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <input 
                                    type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                                    style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none', color: '#1e293b' }}
                                />
                                <span style={{ color: '#94a3b8', fontWeight: 500 }}>to</span>
                                <input 
                                    type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                                    style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none', color: '#1e293b' }}
                                />
                                {(startDate || endDate) && (
                                    <button 
                                        onClick={() => { setStartDate(''); setEndDate(''); }}
                                        style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                                    >Clear Dates</button>
                                )}
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Filter Steps</span>
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <button onClick={() => setSelectedItems(new Set(sheet.rows.map((_: any, i: number) => i)))} style={{ background: 'transparent', border: 'none', color: '#0d9488', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>Select All</button>
                                    <button onClick={() => setSelectedItems(new Set())} style={{ background: 'transparent', border: 'none', color: '#64748b', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>Deselect All</button>
                                </div>
                            </div>
                            <div style={{ 
                                display: 'flex', flexWrap: 'wrap', gap: '8px', 
                                background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0',
                                maxHeight: '120px', overflowY: 'auto'
                            }}>
                                {sheet.rows?.map((row: any, i: number) => (
                                    <label key={i} style={{ 
                                        display: 'flex', alignItems: 'center', gap: '6px', 
                                        background: selectedItems.has(i) ? 'white' : 'transparent',
                                        border: selectedItems.has(i) ? '1px solid var(--primary)' : '1px solid #cbd5e1',
                                        padding: '4px 10px', borderRadius: '100px',
                                        fontSize: '13px', fontWeight: 600, color: selectedItems.has(i) ? '#0f766e' : '#64748b',
                                        cursor: 'pointer', transition: 'all 0.1s'
                                    }}>
                                        <input 
                                            type="checkbox" checked={selectedItems.has(i)} onChange={() => toggleItem(i)}
                                            style={{ margin: 0, accentColor: 'var(--primary)' }}
                                        />
                                        {row.step || `Step ${i + 1}`}
                                    </label>
                                ))}
                                {(!sheet.rows || sheet.rows.length === 0) && <span style={{ color: '#94a3b8', fontSize: '13px' }}>No steps found.</span>}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div style={{ padding: '32px 24px' }}>
                <div 
                    className="print-container"
                    style={{
                        maxWidth: '1000px', margin: '0 auto', background: 'white', padding: '40px',
                        borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)'
                    }}
                >
                    <div id="daily-routines-print-container">
                        <DailyRoutinesPrintView sheet={filteredSheet} printOnly={false} includeGraph={includeGraph} />
                    </div>
                </div>
            </div>
        </div>
    );
}
