'use client';

import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useBrand } from '@/context/BrandContext';

export default function BaselineSheetPrintView({ sheet, printOnly = false, includeGraph = true }: { sheet: any, printOnly?: boolean, includeGraph?: boolean }) {
    const { logoBase64 } = useBrand();

    if (!sheet) return null;

    const allSess = sheet.sessions || [];
    const sheetRows = sheet.rows || [];
    const generated = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    const chunkArray = (arr: any[], size: number) =>
        Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
            arr.slice(i * size, i * size + size)
        );

    const sessionChunks = chunkArray(allSess, 7);

    // Calculate daily progress for the graph
    const graphData = allSess.map((s: any) => {
        let dp = 0; let df = 0;
        sheetRows.forEach((row: any, i: number) => {
            const idxStr = String(row.originalIndex ?? i);
            if (s.results?.[idxStr] === 'pass') dp++;
            if (s.results?.[idxStr] === 'fail') df++;
        });
        const dt = dp + df;
        const dpct = dt > 0 ? Math.round((dp / dt) * 100) : 0;
        return {
            name: `Day ${s.day}`,
            date: new Date(s.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            success: dpct
        };
    });

    return (
        <div style={{
            fontFamily: "Arial, 'Helvetica Neue', sans-serif",
            background: '#fff',
            color: '#111',
            fontSize: '12px',
            width: '100%',
        }}>
            <style>{`
                .bs-table { width: 100%; border-collapse: collapse; margin-top: 4px; }
                .bs-table thead th {
                    background: #f8fafc;
                    padding: 10px 12px;
                    text-align: center;
                    font-size: 11px;
                    font-weight: 800;
                    color: #334155;
                    border: 1px solid #cbd5e1;
                    letter-spacing: 0.3px;
                }
                .bs-table thead th.th-sto { text-align: left; }
                .bs-table thead th .day-label { font-size: 12px; font-weight: 800; color: #1e293b; display: block; }
                .bs-table thead th .day-date  { font-size: 10px; font-weight: 400; color: #64748b; display: block; margin-top: 1px; }
                .bs-table thead th .day-emp   { font-size: 10px; font-weight: 700; color: var(--primary); display: block; margin-top: 1px; }

                .bs-table tbody tr:nth-child(even) td { background: #fafbff; }
                .bs-table tbody tr:hover td { background: #f0f9ff; }

                .bs-table td { padding: 9px 12px; border: 1px solid #dde3ec; text-align: center; vertical-align: middle; }
                .bs-table td.td-num  { color: #94a3b8; font-size: 11px; font-weight: 600; width: 36px; }
                .bs-table td.td-sto  { text-align: left; font-weight: 700; font-size: 12px; color: #1e293b; }
                .bs-table td.td-pass { font-size: 18px; font-weight: 900; color: #16a34a; }
                .bs-table td.td-fail { font-size: 18px; font-weight: 900; color: #dc2626; }
                .bs-table td.td-nil  { font-size: 16px; color: #d1d5db; }
                .bs-table td.td-total{ white-space: nowrap; font-size: 11px; }

                .bs-table tfoot tr td {
                    background: #f1f5f9;
                    border-top: 2px solid #94a3b8;
                    border: 1px solid #cbd5e1;
                    padding: 10px 12px;
                    font-size: 11px;
                    font-weight: 700;
                }
                .bs-table tfoot td.ft-label { text-align: left; color: #475569; font-size: 11px; }
                .bs-table tfoot td.ft-data  { text-align: center; white-space: nowrap; }

                .pass-txt { color: #16a34a; font-weight: 800; }
                .fail-txt { color: #dc2626; font-weight: 800; }
                .pct-txt  { color: var(--primary-dark); font-weight: 800; }
                .sep      { color: #94a3b8; margin: 0 3px; }

                @media print {
                    .bs-table thead th, .bs-table tfoot td, .bs-table tbody tr:nth-child(even) td, .bs-table tbody tr:hover td {
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
                    color: '#111', border: '2px solid #111', padding: '4px 12px', borderRadius: '6px', background: 'transparent' 
                }}>
                    Baseline Sheet
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

            {includeGraph && graphData.length > 0 && (
                <div style={{ marginTop: '16px', marginBottom: '24px', padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', pageBreakInside: 'avoid' }}>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#334155', marginBottom: '16px', textAlign: 'center' }}>
                        Overall Progress Percentage
                    </div>
                    <div style={{ width: '100%', height: 260 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={graphData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} dx={-10} domain={[0, 100]} tickFormatter={(val) => `${val}%`} />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    labelStyle={{ fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}
                                    itemStyle={{ fontWeight: 600, color: 'var(--primary)' }}
                                    formatter={(value: any) => [`${value}%`, 'Success Rate']}
                                />
                                <Line type="monotone" dataKey="success" stroke="var(--primary)" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6, strokeWidth: 0, fill: 'var(--primary)' }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Overall Results Table */}
            <div style={{ pageBreakInside: 'avoid', marginBottom: '32px' }}>
                <h3 style={{ fontSize: '13px', color: 'var(--primary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Overall Results</h3>
                <table className="bs-table">
                    <thead>
                        <tr>
                            <th style={{ width: '36px' }}>#</th>
                            <th className="th-sto">STO / Target</th>
                            <th>Total Pass / Fail</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sheetRows.map((row: any, mapRi: number) => {
                            const ri = row.originalIndex ?? mapRi;
                            let totalPass = 0;
                            let totalFail = 0;
                            
                            allSess.forEach((s: any) => {
                                const v = s.results?.[String(ri)];
                                if (v === 'pass') totalPass++;
                                if (v === 'fail') totalFail++;
                            });

                            const rTotal = totalPass + totalFail;
                            const pct = rTotal > 0 ? Math.round((totalPass / rTotal) * 100) : null;

                            return (
                                <tr key={mapRi}>
                                    <td className="td-num">{mapRi + 1}</td>
                                    <td className="td-sto">{row.step || ''}</td>
                                    {rTotal > 0 ? (
                                        <td className="td-total">
                                            <span className="pass-txt">&#10003; {totalPass}</span>
                                            <span className="sep"> &middot; </span>
                                            <span className="fail-txt">&#10007; {totalFail}</span>
                                            {pct !== null && (
                                                <>
                                                    <span className="sep"> &middot; </span>
                                                    <span className="pct-txt">{pct}%</span>
                                                </>
                                            )}
                                        </td>
                                    ) : <td className="td-nil">&mdash;</td>}
                                </tr>
                            );
                        })}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td className="td-num" style={{ fontWeight: 800 }}>&Sigma;</td>
                            <td className="ft-label">System Total</td>
                            {(() => {
                                let gPass = 0; let gFail = 0;
                                sheetRows.forEach((row: any, i: number) => {
                                    const riStr = String(row.originalIndex ?? i);
                                    allSess.forEach((s: any) => {
                                        if (s.results?.[riStr] === 'pass') gPass++;
                                        if (s.results?.[riStr] === 'fail') gFail++;
                                    });
                                });
                                const gTotal = gPass + gFail;
                                const gPct = gTotal > 0 ? Math.round((gPass / gTotal) * 100) : null;
                                return (
                                    <td className="ft-data">
                                        {gTotal > 0 ? (
                                            <>
                                                <span className="pass-txt">&#10003; {gPass}</span>
                                                <span className="sep"> &middot; </span>
                                                <span className="fail-txt">&#10007; {gFail}</span>
                                                {gPct !== null && (
                                                    <>
                                                        <span className="sep"> &middot; </span>
                                                        <span className="pct-txt">{gPct}%</span>
                                                    </>
                                                )}
                                            </>
                                        ) : <>&mdash;</>}
                                    </td>
                                );
                            })()}
                        </tr>
                    </tfoot>
                </table>
            </div>

            {sessionChunks.map((chunk, chunkIndex) => (
                <div key={chunkIndex} style={{ pageBreakInside: 'avoid', marginBottom: '32px' }}>
                    {sessionChunks.length > 1 && <h3 style={{ fontSize: '13px', color: 'var(--primary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Week {chunkIndex + 1}</h3>}

            <table className="bs-table">
                <thead>
                    <tr>
                        <th style={{ width: '36px' }}>#</th>
                        <th className="th-sto">STO</th>
                        {chunk.map((s: any, idx: number) => (
                            <th key={idx}>
                                <span className="day-label">Day {s.day}</span>
                                <span className="day-date">{new Date(s.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' })}</span>
                                <span className="day-emp">{s.employeeName || ''}</span>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {sheetRows.map((row: any, mapRi: number) => {
                        const ri = row.originalIndex ?? mapRi;
                        let totalPass = 0;
                        let totalFail = 0;
                        
                        allSess.forEach((s: any) => {
                            const v = s.results?.[String(ri)];
                            if (v === 'pass') totalPass++;
                            if (v === 'fail') totalFail++;
                        });

                        return (
                            <tr key={mapRi}>
                                <td className="td-num">{mapRi + 1}</td>
                                <td className="td-sto">{row.step || ''}</td>
                                {chunk.map((s: any, si: number) => {
                                    const v = s.results?.[String(ri)];
                                    if (v === 'pass') { return <td key={si} className="td-pass">&#10003;</td>; }
                                    if (v === 'fail') { return <td key={si} className="td-fail">&#10007;</td>; }
                                    return <td key={si} className="td-nil">&mdash;</td>;
                                })}
                            </tr>
                        );
                    })}
                </tbody>
                <tfoot>
                    <tr>
                        <td className="td-num" style={{ fontWeight: 800 }}>&Sigma;</td>
                        <td className="ft-label">Total per day</td>
                        {chunk.map((s: any, si: number) => {
                            let dp = 0; let df = 0;
                            sheetRows.forEach((row: any, i: number) => {
                                const riStr = String(row.originalIndex ?? i);
                                if (s.results?.[riStr] === 'pass') dp++;
                                if (s.results?.[riStr] === 'fail') df++;
                            });
                            const dt = dp + df;
                            const dpct = dt > 0 ? Math.round((dp / dt) * 100) : null;
                            return (
                                <td key={si} className="ft-data">
                                    {dt > 0 ? (
                                        <>
                                            <span className="pass-txt">&#10003; {dp}</span>
                                            <span className="sep"> &middot; </span>
                                            <span className="fail-txt">&#10007; {df}</span>
                                            {dpct !== null && (
                                                <>
                                                    <span className="sep"> &middot; </span>
                                                    <span className="pct-txt">{dpct}%</span>
                                                </>
                                            )}
                                        </>
                                    ) : <>&mdash;</>}
                                </td>
                            );
                        })}
                    </tr>
                </tfoot>
            </table>
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
