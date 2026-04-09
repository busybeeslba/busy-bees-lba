'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save, Pencil, X, Plus } from 'lucide-react';
import styles from './entry.module.css';
import { dbClient } from '@/lib/dbClient';
import { createClient } from '@/utils/supabase/client';

const TRIAL_COUNT = 5;

type TrialVal = '+' | '-' | '';

interface DttSession {
    day: number;
    date: string;
    employeeName: string;
    employeeId: string;
    results: Record<string, TrialVal[]>; // key = rowIdx, value = array of 5 trials
}

interface StepRow { step: string; }

interface DttSheet {
    id?: string | number;
    clientId: string;
    clientName: string;
    program: string;
    rows: StepRow[];
    sessions: DttSession[];
    createdAt?: string;
}

const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const fmtDate = (d: string) => {
    try {
        const dt = new Date(d.length === 10 ? d + 'T12:00:00' : d);
        return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
    } catch { return d; }
};

function emptyTrials(rows: StepRow[]): Record<string, TrialVal[]> {
    const r: Record<string, TrialVal[]> = {};
    rows.forEach((_, i) => { r[String(i)] = Array(TRIAL_COUNT).fill(''); });
    return r;
}

function cycleTrialVal(v: TrialVal): TrialVal {
    if (v === '') return '+';
    if (v === '+') return '-';
    return '';
}

function calcPct(trials: TrialVal[]): number | null {
    const counted = trials.filter(t => t === '+' || t === '-');
    if (!counted.length) return null;
    return Math.round(counted.filter(t => t === '+').length / counted.length * 100);
}

export default function MassTrialEntryPage() {
    const params = useParams();
    const router = useRouter();
    const isNew = params.id === 'new';

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [clients, setClients] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [selectedClient, setSelectedClient] = useState<any>(null);
    const [sheet, setSheet] = useState<DttSheet | null>(null);

    const [newResults, setNewResults] = useState<Record<string, TrialVal[]>>({});
    const [newEmployee, setNewEmployee] = useState({ name: '', id: '' });
    const [selProgram, setSelProgram] = useState('');

    const [editingSessionIdx, setEditingSessionIdx] = useState<number | null>(null);
    const [editDraft, setEditDraft] = useState<Record<string, TrialVal[]>>({});

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
        dbClient.get(`/mass_trials/${params.id}`)
            .then((data: any) => {
                setSheet(data);
                setNewResults(emptyTrials(data.rows || []));
            })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, [params.id]);

    const handleClientChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const cl = clients.find(c => String(c.id) === e.target.value);
        setSelectedClient(cl || null);
        setSelProgram('');
        setSheet(null);
    };

    const handleProgramChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const prog = e.target.value;
        setSelProgram(prog);
        if (!selectedClient || !prog) return;
        const cid = selectedClient.clientId || `CLI-${selectedClient.id}`;
        const existing: any[] = await dbClient.get(`/mass_trials`).catch(() => []);
        const found = existing.find(s =>
            (s.clientId === cid || s.clientName === (selectedClient.kidsName || selectedClient.name)) && s.program === prog
        );
        if (found) {
            setSheet(found);
            setNewResults(emptyTrials(found.rows || []));
        } else {
            let cats: any[] = [];
            if (typeof selectedClient.programCategories === 'string') {
                try { cats = JSON.parse(selectedClient.programCategories); } catch { cats = []; }
            } else if (Array.isArray(selectedClient.programCategories)) { cats = selectedClient.programCategories; }
            const cat = cats.find((c: any) => c.name === prog);
            const rows: StepRow[] = cat?.targets?.map((t: any) => ({ step: t.name })) || [];
            setSheet({ clientId: cid, clientName: selectedClient.kidsName || selectedClient.name || '', program: prog, rows, sessions: [] });
            setNewResults(emptyTrials(rows));
        }
    };

    const toggleNewTrial = (rowIdx: number, trialIdx: number) => {
        setNewResults(prev => {
            const arr = [...(prev[String(rowIdx)] || Array(TRIAL_COUNT).fill(''))];
            arr[trialIdx] = cycleTrialVal(arr[trialIdx]);
            return { ...prev, [String(rowIdx)]: arr };
        });
    };

    // ── Edit mode ──
    const startEdit = (sessIdx: number) => {
        if (!sheet) return;
        setEditingSessionIdx(sessIdx);
        // Deep copy
        const draft: Record<string, TrialVal[]> = {};
        const sess = sheet.sessions[sessIdx];
        sheet.rows.forEach((_, i) => {
            draft[String(i)] = [...(sess.results?.[String(i)] || Array(TRIAL_COUNT).fill(''))];
        });
        setEditDraft(draft);
    };

    const cancelEdit = () => { 
        setEditingSessionIdx(null); 
        setEditDraft({}); 
    };

    const toggleEditTrial = (rowIdx: number, trialIdx: number) => {
        setEditDraft(prev => {
            const arr = [...(prev[String(rowIdx)] || Array(TRIAL_COUNT).fill(''))];
            arr[trialIdx] = cycleTrialVal(arr[trialIdx]);
            return { ...prev, [String(rowIdx)]: arr };
        });
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
            await dbClient.patch(`/mass_trials/${sheet.id}`, updatedSheet);
            setSheet(updatedSheet);
            setEditingSessionIdx(null);
            setEditDraft({});
        } catch {
            alert('Could not save — is the shared database running?');
        } finally {
            setSaving(false);
        }
    };

    // ── Add new session ──
    const handleSave = async () => {
        if (!sheet) { alert('Please select a client and program.'); return; }
        setSaving(true);
        try {
            const sessionToAdd: DttSession = {
                day: (sheet.sessions?.length || 0) + 1,
                date: today(),
                employeeName: newEmployee.name,
                employeeId: newEmployee.id,
                results: newResults,
            };
            const updatedSheet: DttSheet = {
                ...sheet,
                sessions: [...(sheet.sessions || []), sessionToAdd],
                ...(sheet.id ? {} : { createdAt: new Date().toISOString() }),
            };
            if (sheet.id) {
                await dbClient.patch(`/mass_trials/${sheet.id}`, updatedSheet);
            } else {
                await dbClient.post('/mass_trials', updatedSheet);
            }
            router.push('/forms/mass-trial');
        } catch {
            alert('Could not save — is the shared database running?');
        } finally {
            setSaving(false);
        }
    };

    const handleAddStep = () => {
        const name = newStepText.trim();
        if (!name || !sheet) return;
        const newIdx = sheet.rows?.length || 0;
        setSheet(prev => prev ? { ...prev, rows: [...(prev.rows || []), { step: name }] } : prev);
        setNewResults(prev => ({ ...prev, [String(newIdx)]: Array(TRIAL_COUNT).fill('') }));
        setNewStepText('');
        setShowAddStep(false);
    };

    const handleViewPDF = () => {
        if (!sheet?.id && params.id === 'new') {
            alert('Please save the sheet first before viewing/printing.');
            return;
        }
        if (sheet?.id) {
            router.push(`/forms/mass-trial/${sheet.id}/view`);
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
                    <button className={styles.backBtn} onClick={() => router.push('/forms/mass-trial')}>
                        <ArrowLeft size={16} /> Back
                    </button>
                    <div>
                        <h1 className={styles.pageTitle}>Mass Trial / DTT</h1>
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
                            {sheet?.id ? <Plus size={15} /> : <Save size={15} />}
                            {saving ? 'Saving…' : sheet?.id ? `Add Day ${nextDay}` : 'Create Sheet'}
                        </button>
                    </div>
                )}
            </div>

            {/* Legend */}
            <div className={styles.legendBar}>
                <span className={styles.legendItem}><span className={styles.legendPass}>✓</span> Click once = <strong>Pass (✓)</strong></span>
                <span className={styles.legendSep}>·</span>
                <span className={styles.legendItem}><span className={styles.legendFail}>✗</span> Click twice = <strong>Fail (✗)</strong></span>
                <span className={styles.legendSep}>·</span>
                <span className={styles.legendItem}><span className={styles.legendEmpty}>·</span> Click third = <strong>Clear</strong></span>
                <span className={styles.legendSep}>·</span>
                <span className={styles.legendItem} style={{ color: '#94a3b8' }}>% correct auto-calculates per session</span>
                {editingSessionIdx === null && (
                    <><span className={styles.legendSep}>·</span>
                        <span className={styles.legendItem} style={{ color: '#94a3b8' }}>✏️ Click Edit on any past session to correct it</span></>
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
                                <label className={styles.label}>Program / STO</label>
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
                                <label className={styles.label}>Program / STO</label>
                                <div className={styles.metaValue}>{sheet?.program || '—'}</div>
                            </div>
                        </>
                    )}
                    {editingSessionIdx === null && (
                        <div className={styles.metaField}>
                            <label className={styles.label}>Provider recording session</label>
                            <div className={styles.metaValue}>{newEmployee.name || '—'}</div>
                        </div>
                    )}
                    {editingSessionIdx !== null && (
                        <div className={styles.metaField}>
                            <label className={styles.label}>Correcting</label>
                            <div className={styles.metaValue} style={{ color: '#0d9488' }}>
                                Day {allSessions[editingSessionIdx]?.day} · {allSessions[editingSessionIdx]?.employeeName || 'No Provider'} · {fmtDate(allSessions[editingSessionIdx]?.date)}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Grid */}
            {sheet && rows.length > 0 && (
                <div className={styles.gridCard}>
                    <div className={styles.gridHeader}>
                        <span className={styles.gridTitle}>Mass Trial / DTT</span>
                        {sheet.program && <span className={styles.programBadge}>{sheet.program}</span>}
                        {allSessions.length > 0 && (
                            <span className={styles.historyNote}>{allSessions.length} session{allSessions.length !== 1 ? 's' : ''} recorded</span>
                        )}
                        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#64748b' }}>{TRIAL_COUNT} trials per session per STO</span>
                    </div>
                    <div className={styles.tableWrap}>
                        <table className={styles.grid}>
                            <thead>
                                <tr>
                                    <th className={styles.stepNumCol}>#</th>
                                    <th className={styles.stepNameCol}>STO / Target</th>
                                    {allSessions.map((sess, sessIdx) => (
                                        <th key={sess.day} className={editingSessionIdx === sessIdx ? styles.editingSessionCol : styles.pastSessionCol}
                                            colSpan={TRIAL_COUNT + 1}>
                                            <div className={styles.colDayLabel}>Day {sess.day}</div>
                                            <div className={styles.colDateLabel}>{fmtDate(sess.date)}</div>
                                            {editingSessionIdx === sessIdx ? (
                                                <div className={styles.colEmpLabel} style={{ textAlign: 'center', color: '#0d9488', fontWeight: 700 }}>{sess.employeeName || '—'}</div>
                                            ) : (
                                                <div className={styles.colEmpLabel}>{sess.employeeName || '—'}</div>
                                            )}
                                            {editingSessionIdx === null && (
                                                <button className={styles.editColBtn} onClick={() => startEdit(sessIdx)}>
                                                    <Pencil size={10} /> Edit
                                                </button>
                                            )}
                                            {editingSessionIdx === sessIdx && <span className={styles.editingLabel}>✏️ Editing</span>}
                                        </th>
                                    ))}
                                    {editingSessionIdx === null && (
                                        <th className={styles.newSessionCol} colSpan={TRIAL_COUNT + 1}>
                                            <div className={styles.colDayLabel} style={{ color: '#16a34a' }}>Day {nextDay}</div>
                                            <div className={styles.colDateLabel}>{fmtDate(today())}</div>
                                            <div className={styles.colEmpLabel} style={{ color: '#15803d', fontWeight: 700 }}>{newEmployee.name}</div>
                                        </th>
                                    )}
                                    <th className={styles.totalCol}>Overall</th>
                                </tr>
                                {/* Sub-header: Trial 1-5 + % */}
                                <tr className={styles.subHeaderRow}>
                                    <th className={styles.stepNumCol} />
                                    <th className={styles.stepNameCol} />
                                    {allSessions.map((sess, sessIdx) => (
                                        <>
                                            {Array.from({ length: TRIAL_COUNT }, (_, ti) => (
                                                <th key={`${sess.day}-t${ti}`} className={editingSessionIdx === sessIdx ? styles.editingSessionCol : styles.milestoneSubHead}>
                                                    T{ti + 1}
                                                </th>
                                            ))}
                                            <th key={`${sess.day}-pct`} className={editingSessionIdx === sessIdx ? styles.editingSessionCol : styles.milestoneSubHead}>%</th>
                                        </>
                                    ))}
                                    {editingSessionIdx === null && (
                                        <>
                                            {Array.from({ length: TRIAL_COUNT }, (_, ti) => (
                                                <th key={`new-t${ti}`} className={styles.newMilestoneSubHead}>T{ti + 1}</th>
                                            ))}
                                            <th className={styles.newMilestoneSubHead}>%</th>
                                        </>
                                    )}
                                    <th className={styles.totalCol} />
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row, rowIdx) => {
                                    // Overall totals across all sessions for this STO
                                    let oPlus = 0, oTotal = 0;
                                    allSessions.forEach((s, si) => {
                                        const t: TrialVal[] = editingSessionIdx === si
                                            ? (editDraft[String(rowIdx)] || Array(TRIAL_COUNT).fill(''))
                                            : (s.results?.[String(rowIdx)] || Array(TRIAL_COUNT).fill(''));
                                        t.forEach(v => { if (v === '+' || v === '-') { oTotal++; if (v === '+') oPlus++; } });
                                    });
                                    if (editingSessionIdx === null) {
                                        const nt: TrialVal[] = newResults[String(rowIdx)] || Array(TRIAL_COUNT).fill('');
                                        nt.forEach(v => { if (v === '+' || v === '-') { oTotal++; if (v === '+') oPlus++; } });
                                    }
                                    const oPct = oTotal > 0 ? Math.round(oPlus / oTotal * 100) : null;

                                    return (
                                        <tr key={rowIdx} className={`${styles.gridRow} ${rowIdx % 2 === 1 ? styles.rowAlt : ''}`}>
                                            <td className={styles.rowNum}>{rowIdx + 1}</td>
                                            <td className={styles.stepCell}>{row.step}</td>

                                            {allSessions.map((sess, sessIdx) => {
                                                const isEditing = editingSessionIdx === sessIdx;
                                                const trials: TrialVal[] = isEditing
                                                    ? (editDraft[String(rowIdx)] || Array(TRIAL_COUNT).fill(''))
                                                    : (sess.results?.[String(rowIdx)] || Array(TRIAL_COUNT).fill(''));
                                                const pct = calcPct(trials);
                                                return (
                                                    <>
                                                        {trials.map((val, ti) => (
                                                            <td key={`${sess.day}-${ti}`} className={isEditing ? styles.editingCell : styles.pastCell}>
                                                                {isEditing ? (
                                                                    <button
                                                                        className={`${styles.trialBtn} ${val === '+' ? styles.trialPlus : val === '-' ? styles.trialMinus : styles.trialEmpty}`}
                                                                        onClick={() => toggleEditTrial(rowIdx, ti)}
                                                                    >
                                                                        {val === '+' ? '✓' : val === '-' ? '✗' : '·'}
                                                                    </button>
                                                                ) : (
                                                                    <span className={val === '+' ? styles.pastTrialPlus : val === '-' ? styles.pastTrialMinus : styles.pastTrialEmpty}>
                                                                        {val === '+' ? '✓' : val === '-' ? '✗' : '·'}
                                                                    </span>
                                                                )}
                                                            </td>
                                                        ))}
                                                        <td key={`${sess.day}-pct`} className={isEditing ? styles.editingCell : styles.pastCell}>
                                                            {pct !== null
                                                                ? <span className={styles.pctScore}>{pct}%</span>
                                                                : <span className={styles.pastTrialEmpty}>—</span>}
                                                        </td>
                                                    </>
                                                );
                                            })}

                                            {editingSessionIdx === null && (
                                                <>
                                                    {(newResults[String(rowIdx)] || Array(TRIAL_COUNT).fill('')).map((val: TrialVal, ti: number) => (
                                                        <td key={`new-${ti}`} className={styles.milestoneCell}>
                                                            <button
                                                                className={`${styles.trialBtn} ${val === '+' ? styles.trialPlus : val === '-' ? styles.trialMinus : styles.trialEmpty}`}
                                                                onClick={() => toggleNewTrial(rowIdx, ti)}
                                                            >
                                                                {val === '+' ? '✓' : val === '-' ? '✗' : '·'}
                                                            </button>
                                                        </td>
                                                    ))}
                                                    <td className={styles.milestoneCell}>
                                                        {(() => {
                                                            const pct = calcPct(newResults[String(rowIdx)] || Array(TRIAL_COUNT).fill(''));
                                                            return pct !== null
                                                                ? <span className={styles.pctScore}>{pct}%</span>
                                                                : <span className={styles.pastTrialEmpty}>—</span>;
                                                        })()}
                                                    </td>
                                                </>
                                            )}

                                            <td className={styles.totalCell}>
                                                {oPct !== null ? (
                                                    <span className={styles.dayTotalsLabel}>
                                                        <span style={{ color: '#15803d' }}>{oPlus}+</span>
                                                        <span style={{ color: '#94a3b8' }}> / </span>
                                                        <span style={{ color: '#dc2626' }}>{oTotal - oPlus}−</span>
                                                        <span style={{ color: '#94a3b8' }}> · </span>
                                                        <span style={{ color: 'var(--primary)', fontWeight: 800 }}>{oPct}%</span>
                                                    </span>
                                                ) : <span className={styles.emptyScore}>—</span>}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Add Step */}
                    {editingSessionIdx === null && (
                        <div className={styles.addStepBar}>
                            {showAddStep ? (
                                <div className={styles.addStepRow}>
                                    <input
                                        className={styles.addStepInput}
                                        type="text"
                                        placeholder="Type new STO / target name…"
                                        value={newStepText}
                                        onChange={e => setNewStepText(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') handleAddStep(); if (e.key === 'Escape') setShowAddStep(false); }}
                                        autoFocus
                                    />
                                    <button className={styles.addStepConfirm} onClick={handleAddStep} disabled={!newStepText.trim()}>Add</button>
                                    <button className={styles.addStepCancel} onClick={() => setShowAddStep(false)}>Cancel</button>
                                </div>
                            ) : (
                                <button className={styles.addStepBtn} onClick={() => setShowAddStep(true)}>
                                    <Plus size={14} /> Add STO / Target
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}

            {sheet && rows.length === 0 && (
                <div className={styles.emptyHint}>
                    <p style={{ marginBottom: 12 }}>No STOs / targets yet.</p>
                    <button className={styles.addStepBtn} onClick={() => setShowAddStep(true)}>
                        <Plus size={14} /> Add STO / Target
                    </button>
                    {showAddStep && (
                        <div className={styles.addStepRow} style={{ marginTop: 12, justifyContent: 'center' }}>
                            <input className={styles.addStepInput} style={{ maxWidth: 340 }} type="text"
                                placeholder="Type STO / target name…" value={newStepText}
                                onChange={e => setNewStepText(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') handleAddStep(); }} autoFocus />
                            <button className={styles.addStepConfirm} onClick={handleAddStep} disabled={!newStepText.trim()}>Add</button>
                            <button className={styles.addStepCancel} onClick={() => setShowAddStep(false)}>Cancel</button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
