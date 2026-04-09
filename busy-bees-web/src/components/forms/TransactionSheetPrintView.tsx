'use client';

import React from 'react';
import { TriangleAlert } from 'lucide-react';
import { useBrand } from '@/context/BrandContext';

export default function TransactionSheetPrintView({ sheet, printOnly = false }: { sheet: any, printOnly?: boolean }) {
    const { logoBase64 } = useBrand();

    if (!sheet) return null;

    const allSess = sheet.sessions || [];
    const generated = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    return (
        <div style={{
            fontFamily: "Arial, 'Helvetica Neue', sans-serif",
            background: '#fff',
            color: '#111',
            fontSize: '12px',
            width: '100%',
            maxWidth: '100%',
            margin: '0 auto',
            padding: printOnly ? '0' : '20px'
        }}>
            <style>{`
                .ts-table { width: 100%; border-collapse: collapse; margin-top: 4px; border: 1px solid #dde3ec; border-radius: 8px; overflow: hidden; }
                .ts-table thead th {
                    background: #f8fafc;
                    padding: 10px 14px;
                    text-align: left;
                    font-size: 11px;
                    font-weight: 800;
                    color: #334155;
                    border: 1px solid #cbd5e1;
                    letter-spacing: 0.3px;
                    text-transform: uppercase;
                }
                .ts-table tbody tr.primary-row td { border-bottom: none; }
                .ts-table tbody tr.summary-row td { border-top: none; padding-top: 4px; padding-bottom: 16px; font-size: 11px; }
                .ts-table tbody tr:nth-child(4n-3) td, .ts-table tbody tr:nth-child(4n-2) td { background: #fafbff; } /* Alternate background by location pairs */
                .ts-table tbody tr:hover td { background: #f0f9ff; }
                .ts-table td { padding: 12px 14px; border: 1px solid #dde3ec; text-align: left; vertical-align: top; }
                .ts-table td.td-label { font-weight: 700; color: #1e293b; font-size: 12px; }
                .ts-table td.td-val { color: #334155; font-size: 12px; }
                .ts-badge { display: inline-block; padding: 3px 8px; background: #f1f5f9; border-radius: 4px; font-weight: 700; font-size: 11px; color: #475569; }
                
                @media print {
                    .ts-table thead th, .ts-table tbody tr:nth-child(even) td, .ts-table tbody tr:hover td, .ts-badge {
                        -webkit-print-color-adjust: exact; print-color-adjust: exact;
                    }
                }
            `}</style>
            
            <div style={{
                borderBottom: '3px solid var(--primary)', paddingBottom: '16px', marginBottom: '22px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end'
            }}>
                <div>
                    <img 
                        src={logoBase64 || "/logo.png"} 
                        alt="Company Logo" 
                        style={{ height: '36px', objectFit: 'contain', marginBottom: '4px' }}
                    />
                    <div style={{ fontSize: '11px', color: '#777', marginTop: '3px' }}>Generated on {generated}</div>
                </div>
                <div style={{ 
                    fontSize: '11px', fontWeight: 800, letterSpacing: '1.5px', textTransform: 'uppercase', 
                    display: 'inline-block', background: 'transparent', color: '#111', 
                    border: '2px solid #111', padding: '4px 12px', borderRadius: '6px' 
                }}>
                    TRANSACTION SHEET
                </div>
            </div>

            <div style={{ 
                display: 'flex', gap: 0, marginBottom: '24px', 
                border: '1px solid #dde3ec', borderRadius: '10px', overflow: 'hidden' 
            }}>
                <div style={{ flex: 1, padding: '14px 18px', borderRight: '1px solid #dde3ec' }}>
                    <div style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', color: '#94a3b8', marginBottom: '4px' }}>Client</div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#111' }}>{sheet.clientName || '—'}</div>
                </div>
                <div style={{ flex: 1, padding: '14px 18px', borderRight: '1px solid #dde3ec' }}>
                    <div style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', color: '#94a3b8', marginBottom: '4px' }}>Program Category</div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#111' }}>{sheet.program || '—'}</div>
                </div>
                <div style={{ flex: 1, padding: '14px 18px' }}>
                    <div style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', color: '#94a3b8', marginBottom: '4px' }}>Total Sessions</div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#111' }}>
                        <span style={{ 
                            display: 'inline-block', background: 'transparent', color: 'var(--primary)', 
                            border: '1.5px solid var(--primary)', borderRadius: '20px', padding: '2px 12px', 
                            fontSize: '12px', fontWeight: 700 
                        }}>
                            {allSess.length} session{allSess.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                </div>
            </div>

            {allSess.map((session: any, sIdx: number) => (
                <div key={session.id || sIdx} style={{ pageBreakInside: 'avoid', marginBottom: '36px' }}>
                    {allSess.length > 1 && (
                        <div style={{ 
                            background: '#f8fafc', padding: '10px 16px', borderLeft: '4px solid var(--primary)', 
                            marginBottom: '16px', borderRadius: '0 8px 8px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}>
                            <div>
                                <span style={{ fontWeight: 800, fontSize: '14px', color: '#1e293b', marginRight: '8px' }}>Day {sIdx + 1}</span>
                                <span style={{ color: '#64748b', fontSize: '13px' }}>{session.date ? new Date(session.date + 'T12:00:00').toLocaleDateString() : '—'}</span>
                            </div>
                            <div style={{ display: 'flex', gap: '16px' }}>
                                <span style={{ fontSize: '12px', color: '#475569' }}><strong>Provider:</strong> {session.employeeName || '—'}</span>
                                <span style={{ fontSize: '12px', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}><strong>Phone Collected:</strong> {session.cellPhoneLocation === 'Yes' ? <span style={{ color: '#16a34a', fontWeight: 900, fontSize: '18px', lineHeight: 1 }}>&#10003;</span> : <span style={{ color: '#dc2626', fontWeight: 900, fontSize: '18px', lineHeight: 1 }}>&#10007;</span>}</span>
                            </div>
                        </div>
                    )}

                    {(!session.locations || session.locations.length === 0) ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', border: '1px dashed #cbd5e1', borderRadius: '8px' }}>
                            No locations tracked for this session.
                        </div>
                    ) : (
                        <table className="ts-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '13%' }}>Location</th>
                                    <th style={{ width: '14%' }}>Transition</th>
                                    <th style={{ width: '15%' }}>Prompts</th>
                                    <th style={{ width: '15%' }}>Classwork</th>
                                    <th style={{ width: '15%' }}>Program</th>
                                    <th style={{ width: '14%' }}>Schedule</th>
                                    <th style={{ width: '14%' }}>Crisis</th>
                                </tr>
                            </thead>
                            <tbody>
                                {session.locations.map((loc: any, idx: number) => {
                                    const locBullets = [
                                        loc.transitionNote ? `Transition: ${loc.transitionNote}` : null,
                                        loc.promptNote ? `Prompts: ${loc.promptNote}` : null,
                                        loc.cwNote ? `Classwork: ${loc.cwNote}` : null,
                                        loc.pgNote ? `Program: ${loc.pgNote}` : null,
                                        loc.scheduleNote ? `Schedule: ${loc.scheduleNote}` : null,
                                        loc.crisisNote ? `Crisis: ${loc.crisisNote}` : null,
                                    ].filter(Boolean);

                                    return (
                                        <React.Fragment key={loc.id || idx}>
                                            <tr className="primary-row">
                                                <td className="td-label">
                                                    <div style={{ color: 'var(--primary)', fontWeight: 800, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Loc {idx + 1}</div>
                                                    <div style={{ fontSize: '13px' }}>{loc.name || '—'}</div>
                                                </td>
                                                
                                                <td className="td-val" style={{ fontSize: '11px' }}>
                                                    <div style={{ marginBottom: '4px' }}><strong>Status:</strong> {loc.transition || '—'}</div>
                                                    <div style={{ marginBottom: '4px' }}><strong>Delay:</strong> {loc.delay || '—'}</div>
                                                    <div><strong>Time:</strong> {loc.delayTime || '—'}</div>
                                                </td>
                                                
                                                <td className="td-val" style={{ fontSize: '11px' }}>
                                                    <div style={{ marginBottom: '4px' }}><strong>Type:</strong> {loc.prompt || '—'}</div>
                                                    <div style={{ marginBottom: '4px' }}><strong>Given:</strong> {loc.promptCount || '—'}</div>
                                                    <div style={{ marginBottom: '4px' }}><strong>Assist:</strong> {loc.assistantNeeded || '—'}</div>
                                                    <div><strong>Food:</strong> {loc.food || '—'}</div>
                                                </td>
                                                
                                                <td className="td-val" style={{ fontSize: '11px' }}>
                                                    <div style={{ marginBottom: '4px' }}><strong>Assign:</strong> {loc.cwTaskAssigned || '0'}</div>
                                                    <div><strong>Done:</strong> {loc.cwTaskCompleted || '0'}</div>
                                                </td>

                                                <td className="td-val" style={{ fontSize: '11px' }}>
                                                    <div style={{ marginBottom: '4px' }}><strong>Assign:</strong> {loc.pgTaskAssigned || '0'}</div>
                                                    <div><strong>Done:</strong> {loc.pgTaskCompleted || '0'}</div>
                                                </td>

                                                <td className="td-val" style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                                    {loc.scheduleChange === 'Yes' ? (
                                                        <span style={{ display: 'inline-block', background: '#fef2f2', color: '#dc2626', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 800 }}>Changed</span>
                                                    ) : <span style={{ color: '#94a3b8', fontSize: '11px' }}>No</span>}
                                                </td>

                                                <td className="td-val" style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                                    {loc.crisis === 'Yes' ? (
                                                        <span style={{ display: 'inline-flex', alignItems: 'center', background: '#fef2f2', color: '#dc2626', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 800 }}>
                                                            <TriangleAlert size={12} style={{ marginRight: '4px' }} /> Crisis
                                                        </span>
                                                    ) : <span style={{ color: '#94a3b8', fontSize: '11px' }}>No</span>}
                                                </td>
                                            </tr>
                                            <tr className="summary-row">
                                                <td colSpan={7}>
                                                    <div style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.6)', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                                                        <strong style={{ color: 'var(--primary)', marginRight: '8px', fontSize: '11px' }}>SUMMARY:</strong>
                                                        {locBullets.map((b, i) => {
                                                            const text = b as string;
                                                            return (
                                                                <span key={i} style={{ color: '#475569', marginRight: '16px' }}>
                                                                    <span style={{color:'var(--primary)', marginRight: '4px'}}>•</span>
                                                                    <strong style={{ fontSize: '13px', fontWeight: 800 }}>{text.split(':')[0]}:</strong>{text.split(':').slice(1).join(':')}
                                                                </span>
                                                            );
                                                        })}
                                                        {loc.summaryExtra && <span style={{ color: '#334155', fontStyle: 'italic' }}>"{loc.summaryExtra}"</span>}
                                                        {locBullets.length === 0 && !loc.summaryExtra && <span style={{color: '#94a3b8', fontStyle: 'italic'}}>No notes compiled.</span>}
                                                    </div>
                                                </td>
                                            </tr>
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            ))}

            <div style={{ 
                marginTop: '32px', paddingTop: '12px', borderTop: '1px solid #e2e8f0', 
                fontSize: '10px', color: '#94a3b8', display: 'flex', justifyContent: 'space-between' 
            }}>
                <span>Busy Bees LBA &mdash; Confidential</span>
                <span>Generated {generated}</span>
            </div>
        </div>
    );
}
