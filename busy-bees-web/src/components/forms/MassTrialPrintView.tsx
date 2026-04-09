'use client';

import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useBrand } from '@/context/BrandContext';

const TRIAL_COUNT = 5;
type TrialVal = '+' | '-' | '';

function calcPct(trials: TrialVal[]): number | null {
    const counted = trials.filter(t => t === '+' || t === '-');
    if (!counted.length) return null;
    return Math.round(counted.filter(t => t === '+').length / counted.length * 100);
}

export default function MassTrialPrintView({ sheet, printOnly = false, includeGraph = true }: { sheet: any, printOnly?: boolean, includeGraph?: boolean }) {
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
        let tp = 0; let tt = 0;
        sheetRows.forEach((row: any, i: number) => {
            const idxStr = String(row.originalIndex ?? i);
            const t: TrialVal[] = s.results?.[idxStr] || [];
            t.forEach(v => {
                if (v === '+' || v === '-') {
                    tt++;
                    if (v === '+') tp++;
                }
            });
        });
        const pct = tt > 0 ? Math.round((tp / tt) * 100) : 0;
        return {
            name: `Day ${s.day}`,
            date: new Date(s.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            success: pct
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
                .mt-table { width: 100%; border-collapse: collapse; margin-top: 4px; }
                .mt-table thead th {
                    background: #f8fafc;
                    padding: 10px;
                    text-align: center;
                    font-size: 11px;
                    font-weight: 800;
                    color: #334155;
                    border: 1px solid #cbd5e1;
                }
                .mt-table thead th.th-sto { text-align: left; }
                .mt-table thead th .day-label { font-size: 11px; font-weight: 800; color: #1e293b; display: block; }
                .mt-table thead th .day-date { font-size: 9px; color: #64748b; display: block; margin-top: 1px; }
                .mt-table thead th .day-emp { font-size: 9px; font-weight: 700; color: var(--primary); display: block; margin-top: 1px; }

                .mt-table td { padding: 8px 10px; border: 1px solid #dde3ec; text-align: center; vertical-align: middle; }
                .mt-table td.td-num { color: #94a3b8; font-size: 10px; font-weight: 600; width: 36px; }
                .mt-table td.td-sto { text-align: left; font-weight: 700; font-size: 12px; color: #1e293b; }
                .mt-table td.td-trials { font-size: 13px; font-weight: 700; white-space: nowrap; }
                .mt-table td.td-pct, .mt-table .td-pct { font-size: 10px; color: var(--primary); font-weight: 700; }
                .mt-table td.td-total { white-space: nowrap; font-size: 11px; }
                .mt-table td.td-nil { color: #d1d5db; }

                .t-plus { color: #16a34a; font-weight: 900; }
                .t-minus { color: #dc2626; font-weight: 900; }
                .t-blank { color: #d1d5db; }

                .pass-txt { color: #16a34a; font-weight: 800; }
                .fail-txt { color: #dc2626; font-weight: 800; }
                .pct-txt { color: var(--primary); font-weight: 800; }

                @media print {
                    .mt-table thead th, .mt-table td { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
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
                    Mass Trial / DTT
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
                    <div style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', color: '#94a3b8', marginBottom: '4px' }}>Program</div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#111' }}>{sheet.program || '—'}</div>
                </div>
                <div style={{ flex: 1, padding: '14px 18px' }}>
                    <div style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', color: '#94a3b8', marginBottom: '4px' }}>Total Sessions</div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#111' }}>
                        {allSess.length} session{allSess.length !== 1 ? 's' : ''}
                    </div>
                </div>
            </div>

            {includeGraph && graphData.length > 0 && (
                <div style={{ marginTop: '16px', marginBottom: '24px', padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', pageBreakInside: 'avoid' }}>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#334155', marginBottom: '16px', textAlign: 'center' }}>
                        Overall Correct Responding
                    </div>
                    <div style={{ width: '100%', height: 260 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={graphData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} dx={-10} domain={[0, 100]} tickFormatter={(val: any) => `${val}%`} />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    labelStyle={{ fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}
                                    itemStyle={{ fontWeight: 600, color: 'var(--primary)' }}
                                    formatter={(value: any) => [`${value}%`, 'Correct Responding']}
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
                <table className="mt-table">
                    <thead>
                        <tr>
                            <th style={{ width: '36px' }}>#</th>
                            <th className="th-sto">STO / Target</th>
                            <th>Overall (+/-)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sheetRows.map((row: any, mapRi: number) => {
                            const ri = row.originalIndex ?? mapRi;
                            let totalPlus = 0, totalTotal = 0;
                            allSess.forEach((s: any) => {
                                const t: TrialVal[] = s.results?.[String(ri)] || [];
                                t.forEach(v => {
                                    if (v === '+' || v === '-') {
                                        totalTotal++;
                                        if (v === '+') totalPlus++;
                                    }
                                });
                            });
                            const rPct = totalTotal > 0 ? Math.round((totalPlus / totalTotal) * 100) : null;

                            return (
                                <tr key={mapRi}>
                                    <td className="td-num">{mapRi + 1}</td>
                                    <td className="td-sto">{row.step || ''}</td>
                                    {totalTotal > 0 ? (
                                        <td className="td-total">
                                            <span className="pass-txt">{totalPlus}+</span>
                                            <span style={{ color: '#94a3b8', margin: '0 4px' }}>/</span>
                                            <span className="fail-txt">{totalTotal - totalPlus}−</span>
                                            {rPct !== null && <span className="pct-txt" style={{ marginLeft: '4px' }}>{rPct}%</span>}
                                        </td>
                                    ) : (
                                        <td className="td-nil">—</td>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {sessionChunks.map((chunk, chunkIndex) => (
                <div key={chunkIndex} style={{ pageBreakInside: 'avoid', marginBottom: '32px' }}>
                    {sessionChunks.length > 1 && <h3 style={{ fontSize: '13px', color: 'var(--primary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Week {chunkIndex + 1}</h3>}

            <table className="mt-table">
                <thead>
                    <tr>
                        <th style={{ width: '36px' }}>#</th>
                        <th className="th-sto">STO / Target</th>
                        {chunk.map((sess: any, idx: number) => (
                            <th key={idx}>
                                <span className="day-label">Day {sess.day}</span>
                                <span className="day-date">{new Date(sess.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}</span>
                                <span className="day-emp">{sess.employeeName || ''}</span>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {sheetRows.map((row: any, mapRi: number) => {
                        const ri = row.originalIndex ?? mapRi;
                        let totalPlus = 0, totalTotal = 0;
                        allSess.forEach((s: any) => {
                            const t: TrialVal[] = s.results?.[String(ri)] || [];
                            t.forEach(v => {
                                if (v === '+' || v === '-') {
                                    totalTotal++;
                                    if (v === '+') totalPlus++;
                                }
                            });
                        });
                        const rPct = totalTotal > 0 ? Math.round((totalPlus / totalTotal) * 100) : null;

                        return (
                            <tr key={mapRi}>
                                <td className="td-num">{mapRi + 1}</td>
                                <td className="td-sto">{row.step || ''}</td>
                                {chunk.map((s: any, si: number) => {
                                    const trials: TrialVal[] = s.results?.[String(ri)] || Array(TRIAL_COUNT).fill('');
                                    const pct = calcPct(trials);
                                    
                                    return (
                                        <td key={si} className="td-trials">
                                            {trials.map((t, ti) => (
                                                <span key={ti} className={t === '+' ? 't-plus' : t === '-' ? 't-minus' : 't-blank'} style={{ margin: '0 2px' }}>
                                                    {t === '+' ? '✓' : t === '-' ? '✗' : '·'}
                                                </span>
                                            ))}
                                            {pct !== null && (
                                                <>
                                                    <br />
                                                    <span className="td-pct">{pct}%</span>
                                                </>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        );
                    })}
                </tbody>
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
