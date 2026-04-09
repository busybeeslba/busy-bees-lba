'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save, CheckCircle, XCircle, Pencil, X } from 'lucide-react';
import styles from './entry.module.css';
import { dbClient } from '@/lib/dbClient';
import { createClient } from '@/utils/supabase/client';


type CellResult = 'pass' | 'fail' | null;

interface Session {
    day: number;
    date: string;
    employeeName: string;
    employeeId: string;
    results: Record<string, CellResult>;
}

interface StepRow { step: string; }

interface MasterySheet {
    id?: string | number;
    clientId: string;
    clientName: string;
    program: string;
    rows: StepRow[];
    sessions: Session[];
    createdAt?: string;
}

const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const fmtDate = (d: string) => {
    try {
        // Append T12:00:00 so date-only strings are parsed as local noon,
        // not UTC midnight (which would roll back by 1 day in US timezones)
        const dt = new Date(d.length === 10 ? d + 'T12:00:00' : d);
        return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
    } catch { return d; }
};
const cycleResult = (v: CellResult): CellResult => {
    if (!v) return 'pass';
    if (v === 'pass') return 'fail';
    return null;
};

function initResults(rows: StepRow[]): Record<string, CellResult> {
    const r: Record<string, CellResult> = {};
    rows.forEach((_, i) => { r[String(i)] = null; });
    return r;
}

function migrateSheet(data: any): MasterySheet {
    const oldRows: any[] = data.rows || [];
    const rows: StepRow[] = oldRows.map((r: any) => ({ step: r.step || '' }));

    if (Array.isArray(data.sessions) && data.sessions.length > 0) {
        const sessions: Session[] = data.sessions.map((sess: any) => {
            const results: Record<string, CellResult> = {};
            rows.forEach((_, i) => {
                const r = sess.results?.[String(i)];
                if (!r || typeof r === 'string') {
                    results[String(i)] = (r as CellResult) || null;
                } else {
                    const vals = [r.introduced, r.mastered, r.generalized].filter(Boolean);
                    results[String(i)] = vals.includes('fail') ? 'fail' : vals.includes('pass') ? 'pass' : null;
                }
            });
            return { ...sess, results };
        });
        return { id: data.id, clientId: data.clientId, clientName: data.clientName, program: data.program, rows, sessions, createdAt: data.createdAt };
    }

    // Oldest flat format
    const results: Record<string, CellResult> = {};
    oldRows.forEach((r: any, i: number) => {
        const pick = (cell: any): CellResult => (!cell ? null : cell.result === 'pass' ? 'pass' : cell.result === 'fail' ? 'fail' : null);
        const vals = [pick(r.introduced), pick(r.mastered), pick(r.generalized)];
        results[String(i)] = vals.includes('fail') ? 'fail' : vals.includes('pass') ? 'pass' : null;
    });

    return {
        id: data.id, clientId: data.clientId || '', clientName: data.clientName || '',
        program: data.program || '', rows,
        sessions: [{ day: 1, date: data.createdAt?.slice(0, 10) || today(), employeeName: data.employeeName || '', employeeId: data.employeeId || '', results }],
        createdAt: data.createdAt,
    };
}

export default function BaselineSheetEntryPage() {
    const params = useParams();
    const router = useRouter();
    const isNew = params.id === 'new';

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [clients, setClients] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [selectedClient, setSelectedClient] = useState<any>(null);
    const [sheet, setSheet] = useState<MasterySheet | null>(null);

    // New session state
    const [newResults, setNewResults] = useState<Record<string, CellResult>>({});
    const [newEmployee, setNewEmployee] = useState({ name: '', id: '' });
    const [selProgram, setSelProgram] = useState('');

    // Edit mode: which past session index is being edited (null = none)
    const [editingSessionIdx, setEditingSessionIdx] = useState<number | null>(null);
    // Draft edits for the session being corrected
    const [editDraft, setEditDraft] = useState<Record<string, CellResult>>({});
    // Add step state
    const [showAddStep, setShowAddStep] = useState(false);
    const [newStepText, setNewStepText] = useState('');

    useEffect(() => {
        const fetchInit = async () => {
            const [cls, usrs] = await Promise.all([
                dbClient.get('/clients').catch(() => []),
                dbClient.get('/users').catch(() => [])
            ]);
            setClients(Array.isArray(cls) ? cls : []);
            const userList = Array.isArray(usrs) ? usrs : [];
            setUsers(userList);

            try {
                const supabase = createClient();
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const match = userList.find((u: any) => String(u.email).toLowerCase() === String(user.email).toLowerCase());
                    if (match) {
                        setNewEmployee({ name: match.name || `${match.firstName} ${match.lastName}`.trim(), id: match.employeeId || match.id });
                        return;
                    }
                }
            } catch (err) {}

            if (userList.length > 0) {
                setNewEmployee({ name: userList[0].name || '', id: userList[0].employeeId || '' });
            }
        };
        fetchInit();
    }, []);

    useEffect(() => {
        if (isNew) { setLoading(false); return; }
        dbClient.get(`/academic_baselines/${params.id}`)
            .then((data: any) => {
                const migrated = migrateSheet(data);
                setSheet(migrated);
                setNewResults(initResults(migrated.rows));
            })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, [params.id]);

    const handleClientChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const cl = clients.find(c => String(c.id) === e.target.value);
        setSelectedClient(cl || null);
        setSelProgram('');
        setSheet(null);
        setEditingSessionIdx(null);
    };

    const handleProgramChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const prog = e.target.value;
        setSelProgram(prog);
        setEditingSessionIdx(null);
        if (!selectedClient || !prog) return;
        const cid = selectedClient.clientId || `CLI-${selectedClient.id}`;
        const existing: any[] = await dbClient.get(`/program_mastery`).then(r => r.json()).catch(() => []);
        const found = existing.find(s =>
            (s.clientId === cid || s.clientName === (selectedClient.kidsName || selectedClient.name)) && s.program === prog
        );
        if (found) {
            const migrated = migrateSheet(found);
            setSheet(migrated);
            setNewResults(initResults(migrated.rows));
        } else {
            let cats: any[] = [];
            if (typeof selectedClient.programCategories === 'string') {
                try { cats = JSON.parse(selectedClient.programCategories); } catch { cats = []; }
            } else if (Array.isArray(selectedClient.programCategories)) { cats = selectedClient.programCategories; }
            const cat = cats.find((c: any) => c.name === prog);
            const rows: StepRow[] = cat?.targets?.map((t: any) => ({ step: t.name })) || [];
            setSheet({ clientId: cid, clientName: selectedClient.kidsName || selectedClient.name || '', program: prog, rows, sessions: [] });
            setNewResults(initResults(rows));
        }
    };

    const toggleNewCell = (rowIdx: number) => {
        setNewResults(prev => ({ ...prev, [String(rowIdx)]: cycleResult(prev[String(rowIdx)] ?? null) }));
    };

    const startEdit = (sessIdx: number) => {
        if (!sheet) return;
        setEditingSessionIdx(sessIdx);
        setEditDraft({ ...sheet.sessions[sessIdx].results });
    };

    const cancelEdit = () => { 
        setEditingSessionIdx(null); 
        setEditDraft({}); 
    };

    const toggleEditCell = (rowIdx: number) => {
        setEditDraft(prev => ({ ...prev, [String(rowIdx)]: cycleResult(prev[String(rowIdx)] ?? null) }));
    };

    const saveEdit = async () => {
        if (!sheet || editingSessionIdx === null) return;
        setSaving(true);
        try {
            const updatedSessions = sheet.sessions.map((s, i) =>
                i === editingSessionIdx ? { 
                    ...s, 
                    results: editDraft
                } : s
            );
            const updatedSheet = { ...sheet, sessions: updatedSessions };
            await dbClient.patch(`/academic_baselines/${sheet.id}`, updatedSheet);
            setSheet(updatedSheet);
            setEditingSessionIdx(null);
            setEditDraft({});
        } catch {
            alert('Could not save — is the shared database running?');
        } finally {
            setSaving(false);
        }
    };

    // ── Add new session ──────────────────────────────────────────────────
    const handleSave = async () => {
        if (!sheet) { alert('Please select a client and program.'); return; }
        setSaving(true);
        try {
            const sessionToAdd: Session = {
                day: (sheet.sessions?.length || 0) + 1,
                date: today(), employeeName: newEmployee.name, employeeId: newEmployee.id, results: newResults,
            };
            const updatedSheet: MasterySheet = { ...sheet, sessions: [...(sheet.sessions || []), sessionToAdd], ...(sheet.id ? {} : { createdAt: new Date().toISOString() }) };
            if (sheet.id) {
                await dbClient.patch(`/academic_baselines/${sheet.id}`, updatedSheet);
            } else {
                await dbClient.post('/academic_baselines', updatedSheet);
            }
            router.push('/forms/baseline-sheet');
        } catch {
            alert('Could not save — is the shared database running?');
        } finally {
            setSaving(false);
        }
    };

    // Add a new step row manually
    const handleAddStep = () => {
        const name = newStepText.trim();
        if (!name || !sheet) return;
        const newRow: StepRow = { step: name };
        const newIdx = (sheet.rows?.length || 0);
        setSheet(prev => prev ? { ...prev, rows: [...(prev.rows || []), newRow] } : prev);
        setNewResults(prev => ({ ...prev, [String(newIdx)]: null }));
        setNewStepText('');
        setShowAddStep(false);
    };

    const handleViewPDF = () => {
        if (!sheet?.id && params.id === 'new') {
            alert('Please save the sheet first before viewing/printing.');
            return;
        }
        if (sheet?.id) {
            router.push(`/forms/baseline-sheet/${sheet.id}/view`);
        }
    };

    const availablePrograms: string[] = (() => {
        if (!selectedClient) return [];
        let cats: any[] = [];
        if (typeof selectedClient.programCategories === 'string') { try { cats = JSON.parse(selectedClient.programCategories); } catch { cats = []; } }
        else if (Array.isArray(selectedClient.programCategories)) { cats = selectedClient.programCategories; }
        return cats.map((c: any) => c.name).filter(Boolean);
    })();

    const allSessions = sheet?.sessions || [];
    const rows = sheet?.rows || [];
    const nextDay = allSessions.length + 1;

    if (loading) return <div className={styles.loading}>Loading…</div>;

    return (
        <div className={styles.page}>
            {/* Header */}
            <div className={styles.pageHeader}>
                <div className={styles.headerLeft}>
                    <button className={styles.backBtn} onClick={() => router.push('/forms/baseline-sheet')}>
                        <ArrowLeft size={16} /> Back
                    </button>
                    <div>
                        <h1 className={styles.pageTitle}>Baseline Sheet</h1>
                        {sheet && (
                            <p className={styles.pageSubtitle}>
                                {sheet.clientName} · {sheet.program}
                                {allSessions.length > 0 && <span className={styles.sessionBadge}>{allSessions.length} session{allSessions.length !== 1 ? 's' : ''}</span>}
                                {editingSessionIdx !== null && <span className={styles.editingBadge}>✏️ Editing Day {allSessions[editingSessionIdx]?.day}</span>}
                            </p>
                        )}
                    </div>
                </div>
                {editingSessionIdx !== null ? (
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button className={styles.cancelBtn} onClick={cancelEdit} disabled={saving}>
                            <X size={14} /> Cancel
                        </button>
                        <button className={styles.saveBtn} onClick={saveEdit} disabled={saving}>
                            <Save size={15} /> {saving ? 'Saving…' : 'Save Correction'}
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        {sheet && (
                            <button className={styles.printBtn} onClick={handleViewPDF} title="View / Print / Save as PDF">
                                🖨️ View / PDF
                            </button>
                        )}
                        <button className={styles.saveBtn} onClick={handleSave} disabled={saving || !sheet}>
                            <Save size={15} /> {saving ? 'Saving…' : sheet?.id ? `Add Day ${nextDay}` : 'Create Sheet'}
                        </button>
                    </div>
                )}
            </div>

            {/* Legend */}
            <div className={styles.legendBar}>
                <span className={styles.legendItem}><span className={styles.legendPass}>✓</span> Click once = <strong>Pass</strong></span>
                <span className={styles.legendSep}>·</span>
                <span className={styles.legendItem}><span className={styles.legendFail}>✗</span> Click twice = <strong>Fail</strong></span>
                <span className={styles.legendSep}>·</span>
                <span className={styles.legendItem}><span className={styles.legendEmpty}>—</span> Click third = <strong>Clear</strong></span>
                {editingSessionIdx === null && (
                    <><span className={styles.legendSep}>·</span>
                        <span className={styles.legendItem} style={{ color: '#94a3b8' }}>✏️ Click the pencil on any past session to correct it</span></>
                )}
            </div>

            {/* Meta */}
            <div className={styles.metaCard}>
                <div className={styles.metaGrid}>
                    {isNew ? (
                        <>
                            <div className={styles.metaField}>
                                <label className={styles.label}>Client</label>
                                <select className={styles.select} value={String(selectedClient?.id || '')} onChange={handleClientChange}>
                                    <option value="">Select client…</option>
                                    {clients.map(c => <option key={c.id} value={String(c.id)}>{c.kidsName || c.name}</option>)}
                                </select>
                            </div>
                            <div className={styles.metaField}>
                                <label className={styles.label}>Program Category</label>
                                <select className={styles.select} value={selProgram} onChange={handleProgramChange} disabled={!selectedClient}>
                                    <option value="">Select program…</option>
                                    {availablePrograms.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className={styles.metaField}>
                                <label className={styles.label}>Client</label>
                                <div className={styles.metaValue}>{sheet?.clientName || '—'}</div>
                            </div>
                            <div className={styles.metaField}>
                                <label className={styles.label}>Program Category</label>
                                <div className={styles.metaValue}>{sheet?.program || '—'}</div>
                            </div>
                        </>
                    )}

                    {!isNew && editingSessionIdx !== null ? (
                        <div className={styles.metaField}>
                            <label className={styles.label}>Correcting</label>
                            <div className={styles.metaValue} style={{ color: '#0d9488' }}>
                                Day {allSessions[editingSessionIdx]?.day} · {allSessions[editingSessionIdx]?.employeeName || 'No Provider'} · {fmtDate(allSessions[editingSessionIdx]?.date)}
                            </div>
                        </div>
                    ) : (
                        <div className={styles.metaField}>
                            <label className={styles.label}>Provider recording session</label>
                            <div className={styles.metaValue}>{newEmployee.name || '—'}</div>
                        </div>
                    )}
                </div>
            </div>

            {/* Grid */}
            {sheet && rows.length > 0 && (
                <div className={styles.gridCard}>
                    <div className={styles.gridHeader}>
                        <span className={styles.gridTitle}>Baseline Sheet</span>
                        {sheet.program && <span className={styles.programBadge}>{sheet.program}</span>}
                        {allSessions.length > 0 && (
                            <span className={styles.historyNote}>{allSessions.length} session{allSessions.length !== 1 ? 's' : ''} recorded</span>
                        )}
                    </div>
                    <div className={styles.tableWrap}>
                        <table className={styles.grid}>
                            <thead>
                                <tr>
                                    <th className={styles.stepNumCol}>#</th>
                                    <th className={styles.stepNameCol}>STO</th>
                                    {allSessions.map((sess, sessIdx) => (
                                        <th key={sess.day} className={editingSessionIdx === sessIdx ? styles.editingSessionCol : styles.pastSessionCol}>
                                            <div className={styles.colDayLabel}>Day {sess.day}</div>
                                            <div className={styles.colDateLabel}>{fmtDate(sess.date)}</div>
                                            {editingSessionIdx === sessIdx ? (
                                                <div className={styles.colEmpLabel} style={{ textAlign: 'center', color: '#0d9488', fontWeight: 700 }}>{sess.employeeName || '—'}</div>
                                            ) : (
                                                <div className={styles.colEmpLabel} style={{ textAlign: 'center' }}>{sess.employeeName || '—'}</div>
                                            )}
                                            {editingSessionIdx === null && (
                                                <button
                                                    className={styles.editColBtn}
                                                    onClick={() => startEdit(sessIdx)}
                                                    title={`Correct Day ${sess.day}`}
                                                >
                                                    <Pencil size={10} /> Edit
                                                </button>
                                            )}
                                            {editingSessionIdx === sessIdx && (
                                                <span className={styles.editingLabel}>✏️ Editing</span>
                                            )}
                                        </th>
                                    ))}
                                    {editingSessionIdx === null && (
                                        <th className={styles.newSessionCol}>
                                            <div className={styles.colDayLabel} style={{ color: '#16a34a' }}>Day {nextDay}</div>
                                            <div className={styles.colDateLabel}>{fmtDate(today())}</div>
                                            <div className={styles.colEmpLabel} style={{ color: '#15803d', fontWeight: 700, textAlign: 'center' }}>{newEmployee.name}</div>
                                        </th>
                                    )}
                                    <th className={styles.totalCol}>Pass / Fail</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row, rowIdx) => {
                                    const allVals = allSessions.map((s, si) =>
                                        editingSessionIdx === si ? (editDraft[String(rowIdx)] ?? null) : (s.results[String(rowIdx)] ?? null)
                                    );
                                    const newVal = editingSessionIdx === null ? (newResults[String(rowIdx)] ?? null) : null;
                                    const totalPass = [...allVals, newVal].filter(r => r === 'pass').length;
                                    const totalFail = [...allVals, newVal].filter(r => r === 'fail').length;

                                    return (
                                        <tr key={rowIdx} className={`${styles.gridRow} ${rowIdx % 2 === 1 ? styles.rowAlt : ''}`}>
                                            <td className={styles.rowNum}>{rowIdx + 1}</td>
                                            <td className={styles.stepCell}>{row.step}</td>

                                            {allSessions.map((sess, sessIdx) => {
                                                const isEditing = editingSessionIdx === sessIdx;
                                                const val = isEditing ? (editDraft[String(rowIdx)] ?? null) : (sess.results[String(rowIdx)] ?? null);
                                                return (
                                                    <td key={sess.day} className={isEditing ? styles.editingCell : styles.pastCell}>
                                                        {isEditing ? (
                                                            <button
                                                                className={`${styles.checkBtn} ${val === 'pass' ? styles.cellPass : val === 'fail' ? styles.cellFail : styles.unchecked}`}
                                                                onClick={() => toggleEditCell(rowIdx)}
                                                                title="Click to change"
                                                            >
                                                                {val === 'pass' && <CheckCircle size={14} />}
                                                                {val === 'fail' && <XCircle size={14} />}
                                                                {!val && <span className={styles.dash}>—</span>}
                                                            </button>
                                                        ) : (
                                                            <>
                                                                {val === 'pass' && <span className={styles.pastPass}><CheckCircle size={15} /></span>}
                                                                {val === 'fail' && <span className={styles.pastFail}><XCircle size={15} /></span>}
                                                                {!val && <span className={styles.pastEmpty}>—</span>}
                                                            </>
                                                        )}
                                                    </td>
                                                );
                                            })}

                                            {editingSessionIdx === null && (
                                                <td className={styles.milestoneCell}>
                                                    <button
                                                        className={`${styles.checkBtn} ${newVal === 'pass' ? styles.cellPass : newVal === 'fail' ? styles.cellFail : styles.unchecked}`}
                                                        onClick={() => toggleNewCell(rowIdx)}
                                                    >
                                                        {newVal === 'pass' && <CheckCircle size={14} />}
                                                        {newVal === 'fail' && <XCircle size={14} />}
                                                        {!newVal && <span className={styles.dash}>—</span>}
                                                    </button>
                                                </td>
                                            )}

                                            <td className={styles.totalCell}>
                                                {(totalPass + totalFail) > 0 ? (
                                                    <span className={styles.dayTotalsLabel}>
                                                        <span style={{ color: '#15803d', fontWeight: 700 }}>✓ {totalPass} Pass</span>
                                                        <span style={{ color: '#94a3b8' }}> · </span>
                                                        <span style={{ color: '#dc2626', fontWeight: 700 }}>✗ {totalFail} Fail</span>
                                                        <span style={{ color: '#94a3b8' }}> · </span>
                                                        <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{Math.round(totalPass / (totalPass + totalFail) * 100)}%</span>
                                                    </span>
                                                ) : <span className={styles.emptyScore}>—</span>}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot>
                                <tr className={styles.totalsRow}>
                                    <td className={styles.rowNum} style={{ fontWeight: 700, color: '#64748b' }}>Σ</td>
                                    <td className={styles.stepCell} style={{ fontWeight: 700, fontSize: 11, color: '#64748b' }}>Total per day</td>
                                    {allSessions.map((sess, sessIdx) => {
                                        const dayPass = rows.filter((_, i) => {
                                            const val = editingSessionIdx === sessIdx
                                                ? (editDraft[String(i)] ?? null)
                                                : (sess.results[String(i)] ?? null);
                                            return val === 'pass';
                                        }).length;
                                        const dayFail = rows.filter((_, i) => {
                                            const val = editingSessionIdx === sessIdx
                                                ? (editDraft[String(i)] ?? null)
                                                : (sess.results[String(i)] ?? null);
                                            return val === 'fail';
                                        }).length;
                                        const dayTotal = dayPass + dayFail;
                                        return (
                                            <td key={sess.day} className={editingSessionIdx === sessIdx ? styles.editingCell : styles.pastCell}
                                                style={{ paddingTop: 10, paddingBottom: 10, whiteSpace: 'nowrap' }}>
                                                {dayTotal > 0 ? (
                                                    <span className={styles.dayTotalsLabel}>
                                                        <span style={{ color: '#15803d', fontWeight: 700 }}>✓ {dayPass} Pass</span>
                                                        <span style={{ color: '#94a3b8' }}> · </span>
                                                        <span style={{ color: '#dc2626', fontWeight: 700 }}>✗ {dayFail} Fail</span>
                                                        <span style={{ color: '#94a3b8' }}> · </span>
                                                        <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{Math.round(dayPass / dayTotal * 100)}%</span>
                                                    </span>
                                                ) : <span className={styles.emptyScore}>—</span>}
                                            </td>
                                        );
                                    })}
                                    {editingSessionIdx === null && (() => {
                                        const newPass = rows.filter((_, i) => newResults[String(i)] === 'pass').length;
                                        const newFail = rows.filter((_, i) => newResults[String(i)] === 'fail').length;
                                        const newTotal = newPass + newFail;
                                        return (
                                            <td className={styles.milestoneCell}>
                                                {newTotal > 0 ? (
                                                    <span className={styles.dayTotalsLabel}>
                                                        <span style={{ color: '#15803d', fontWeight: 700 }}>✓ {newPass} Pass</span>
                                                        <span style={{ color: '#94a3b8' }}> · </span>
                                                        <span style={{ color: '#dc2626', fontWeight: 700 }}>✗ {newFail} Fail</span>
                                                        <span style={{ color: '#94a3b8' }}> · </span>
                                                        <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{Math.round(newPass / newTotal * 100)}%</span>
                                                    </span>
                                                ) : <span className={styles.emptyScore}>—</span>}
                                            </td>
                                        );
                                    })()}
                                    <td className={styles.totalCell} style={{ fontWeight: 700 }}>
                                        {/* Grand total across all days */}
                                        {(() => {
                                            const gPass = rows.reduce((n, _, i) => {
                                                const cnt = allSessions.filter((s, si) => (editingSessionIdx === si ? editDraft[String(i)] : s.results[String(i)]) === 'pass').length
                                                    + (editingSessionIdx === null && newResults[String(i)] === 'pass' ? 1 : 0);
                                                return n + cnt;
                                            }, 0);
                                            const gFail = rows.reduce((n, _, i) => {
                                                const cnt = allSessions.filter((s, si) => (editingSessionIdx === si ? editDraft[String(i)] : s.results[String(i)]) === 'fail').length
                                                    + (editingSessionIdx === null && newResults[String(i)] === 'fail' ? 1 : 0);
                                                return n + cnt;
                                            }, 0);
                                            const gTotal = gPass + gFail;
                                            return (
                                                <span className={styles.dayTotalsLabel}>
                                                    {gTotal > 0 ? (
                                                        <>
                                                            <span style={{ color: '#15803d', fontWeight: 700 }}>✓ {gPass} Pass</span>
                                                            <span style={{ color: '#94a3b8' }}> · </span>
                                                            <span style={{ color: '#dc2626', fontWeight: 700 }}>✗ {gFail} Fail</span>
                                                            <span style={{ color: '#94a3b8' }}> · </span>
                                                            <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{Math.round(gPass / gTotal * 100)}%</span>
                                                        </>
                                                    ) : <span className={styles.emptyScore}>—</span>}
                                                </span>
                                            );
                                        })()}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    {/* Add Step manually */}
                    {editingSessionIdx === null && (
                        <div className={styles.addStepBar}>
                            {showAddStep ? (
                                <div className={styles.addStepRow}>
                                    <input
                                        className={styles.addStepInput}
                                        type="text"
                                        placeholder="Type new step name…"
                                        value={newStepText}
                                        onChange={e => { const v = e.target.value; setNewStepText(v.length > 0 ? v[0].toUpperCase() + v.slice(1) : v); }}
                                        onKeyDown={e => { if (e.key === 'Enter') handleAddStep(); if (e.key === 'Escape') { setShowAddStep(false); setNewStepText(''); } }}
                                        autoFocus
                                    />
                                    <button className={styles.addStepConfirm} onClick={handleAddStep} disabled={!newStepText.trim()}>
                                        Add
                                    </button>
                                    <button className={styles.addStepCancel} onClick={() => { setShowAddStep(false); setNewStepText(''); }}>
                                        Cancel
                                    </button>
                                </div>
                            ) : (
                                <button className={styles.addStepBtn} onClick={() => setShowAddStep(true)}>
                                    + Add Step
                                </button>
                            )}
                        </div>
                    )}

                    <div className={styles.gridFooter}>
                        <div className={styles.summary}>
                            {(() => {
                                // Grand totals across all sessions + current new session
                                const allResultVals = rows.flatMap((_, rowIdx) => [
                                    ...allSessions.map(s => s.results[String(rowIdx)] ?? null),
                                    editingSessionIdx === null ? (newResults[String(rowIdx)] ?? null) : null,
                                ]);
                                const gPass = allResultVals.filter(v => v === 'pass').length;
                                const gFail = allResultVals.filter(v => v === 'fail').length;
                                return (
                                    <>
                                        <span>{rows.length} steps</span>
                                        <span className={styles.dot}>·</span>
                                        <span className={styles.passText}>✓ {gPass} Pass</span>
                                        <span className={styles.dot}>·</span>
                                        <span className={styles.failText}>✗ {gFail} Fail</span>
                                        {editingSessionIdx !== null && <span style={{ color: '#0d9488', fontWeight: 700, marginLeft: 8 }}>· Correction mode — save when done</span>}
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}

            {!sheet && (
                <div className={styles.emptyHint}>
                    {!selectedClient ? 'Select a client to get started.' : 'Select a program to load the sheet.'}
                </div>
            )}
        </div>
    );
}
