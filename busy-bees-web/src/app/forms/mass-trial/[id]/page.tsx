'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save, Pencil, X, Plus } from 'lucide-react';
import styles from './entry.module.css';
import { dbClient } from '@/lib/dbClient';

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
        Promise.all([
            dbClient.get('/clients').catch(() => []),
            dbClient.get('/users').catch(() => []),
        ]).then(([cls, usrs]) => {
            setClients(Array.isArray(cls) ? cls : []);
            const userList = Array.isArray(usrs) ? usrs : [];
            setUsers(userList);
            if (userList.length > 0) setNewEmployee({ name: userList[0].name || '', id: userList[0].employeeId || '' });
        });
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
        const existing: any[] = await dbClient.get(`/mass_trials`).then(r => r.json()).catch(() => []);
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

    const handleEmployeeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const u = users.find(u => u.employeeId === e.target.value);
        setNewEmployee({ name: u?.name || '', id: u?.employeeId || '' });
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

    const cancelEdit = () => { setEditingSessionIdx(null); setEditDraft({}); };

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
                i === editingSessionIdx ? { ...s, results: editDraft } : s
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

    const openPDF = () => {
        if (!sheet) return;
        const allSess = sheet.sessions || [];
        const sheetRows = sheet.rows || [];
        const generated = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

        const sessionHeaders = allSess.map(s =>
            `<th><span class="day-label">Day ${s.day}</span><span class="day-date">${fmtDate(s.date)}</span><span class="day-emp">${s.employeeName || ''}</span></th>`
        ).join('');

        const bodyRows = sheetRows.map((row, ri) => {
            const cells = allSess.map(s => {
                const trials: TrialVal[] = s.results?.[String(ri)] || Array(TRIAL_COUNT).fill('');
                const pct = calcPct(trials);
                const trialStr = trials.map(t => t === '+' ? '<span class="t-plus">+</span>' : t === '-' ? '<span class="t-minus">−</span>' : '<span class="t-blank">·</span>').join(' ');
                return `<td class="td-trials">${trialStr}${pct !== null ? `<br/><span class="td-pct">${pct}%</span>` : ''}</td>`;
            }).join('');

            // Per-STO totals across all sessions
            let totalPlus = 0, totalTotal = 0;
            allSess.forEach(s => {
                const t: TrialVal[] = s.results?.[String(ri)] || [];
                t.forEach(v => { if (v === '+' || v === '-') { totalTotal++; if (v === '+') totalPlus++; } });
            });
            const rPct = totalTotal > 0 ? Math.round(totalPlus / totalTotal * 100) : null;
            const totalCell = totalTotal > 0
                ? `<td class="td-total"><span class="pass-txt">${totalPlus}+</span> / <span class="fail-txt">${totalTotal - totalPlus}−</span>${rPct !== null ? ` <span class="pct-txt">${rPct}%</span>` : ''}</td>`
                : `<td class="td-nil">—</td>`;

            return `<tr><td class="td-num">${ri + 1}</td><td class="td-sto">${row.step || ''}</td>${cells}${totalCell}</tr>`;
        }).join('');

        const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Mass Trial / DTT – ${sheet.clientName} – ${sheet.program}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: Arial, 'Helvetica Neue', sans-serif; background: #fff; color: #111; font-size: 12px; }
  .page { max-width: 980px; margin: 0 auto; padding: 36px 48px; }
  .action-bar { display: flex; justify-content: flex-end; gap: 10px; margin-bottom: 28px; }
  .btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 20px; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer; border: none; }
  .btn-print { background: #1e293b; color: #fff; }
  .doc-header { border-bottom: 3px solid #6366f1; padding-bottom: 16px; margin-bottom: 22px; display: flex; justify-content: space-between; align-items: flex-end; }
  .org-name { font-size: 26px; font-weight: 900; }
  .org-name .purple { color: #6366f1; }
  .doc-label { font-size: 11px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; color: #6366f1; border: 2px solid #6366f1; padding: 4px 12px; border-radius: 6px; }
  .meta { display: flex; gap: 0; margin-bottom: 24px; border: 1px solid #dde3ec; border-radius: 10px; overflow: hidden; }
  .meta-item { flex: 1; padding: 14px 18px; border-right: 1px solid #dde3ec; }
  .meta-item:last-child { border-right: none; }
  .meta-label { font-size: 9px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; color: #94a3b8; margin-bottom: 4px; }
  .meta-val { font-size: 15px; font-weight: 800; color: #111; }
  table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  thead th { background: #f8fafc; padding: 10px 10px; text-align: center; font-size: 11px; font-weight: 800; color: #334155; border: 1px solid #cbd5e1; }
  thead th.th-sto { text-align: left; }
  thead th .day-label { font-size: 11px; font-weight: 800; color: #1e293b; display: block; }
  thead th .day-date { font-size: 9px; color: #64748b; display: block; margin-top: 1px; }
  thead th .day-emp { font-size: 9px; font-weight: 700; color: #6366f1; display: block; margin-top: 1px; }
  td { padding: 8px 10px; border: 1px solid #dde3ec; text-align: center; vertical-align: middle; }
  td.td-num { color: #94a3b8; font-size: 10px; font-weight: 600; width: 36px; }
  td.td-sto { text-align: left; font-weight: 700; font-size: 12px; color: #1e293b; }
  td.td-trials { font-size: 13px; font-weight: 700; white-space: nowrap; }
  td.td-pct, .td-pct { font-size: 10px; color: #6366f1; font-weight: 700; }
  td.td-total { white-space: nowrap; font-size: 11px; }
  td.td-nil { color: #d1d5db; }
  .t-plus { color: #16a34a; font-weight: 900; }
  .t-minus { color: #dc2626; font-weight: 900; }
  .t-blank { color: #d1d5db; }
  .pass-txt { color: #16a34a; font-weight: 800; }
  .fail-txt { color: #dc2626; font-weight: 800; }
  .pct-txt { color: #6366f1; font-weight: 800; }
  .doc-footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; display: flex; justify-content: space-between; }
  @media print { .action-bar { display: none !important; } .page { padding: 0; max-width: 100%; } @page { margin: 15mm 12mm; size: A4 landscape; } }
</style></head><body>
<div class="page">
  <div class="action-bar">
    <button class="btn btn-print" onclick="window.print()">🖨 Print / Download PDF</button>
  </div>
  <div class="doc-header">
    <div>
      <div class="org-name"><span class="purple">Busy</span> Bees LBA</div>
      <div style="font-size:11px;color:#777;margin-top:3px">Generated on ${generated}</div>
    </div>
    <div class="doc-label">Mass Trial / DTT</div>
  </div>
  <div class="meta">
    <div class="meta-item"><div class="meta-label">Client</div><div class="meta-val">${sheet.clientName || '—'}</div></div>
    <div class="meta-item"><div class="meta-label">Program</div><div class="meta-val">${sheet.program || '—'}</div></div>
    <div class="meta-item"><div class="meta-label">Total Sessions</div><div class="meta-val">${allSess.length} session${allSess.length !== 1 ? 's' : ''}</div></div>
  </div>
  <table>
    <thead><tr><th style="width:36px">#</th><th class="th-sto">STO / Target</th>${sessionHeaders}<th>Overall</th></tr></thead>
    <tbody>${bodyRows}</tbody>
  </table>
  <div class="doc-footer">
    <span>Busy Bees LBA — Confidential</span>
    <span>Generated ${generated}</span>
  </div>
</div></body></html>`;

        const win = window.open('', '_blank');
        if (win) { win.document.write(html); win.document.close(); }
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
                            <button className={styles.printBtn} onClick={openPDF} title="Print / Save as PDF">
                                🖨️ Print / PDF
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
                            <label className={styles.label}>Employee (Day {nextDay})</label>
                            <select className={styles.select} value={newEmployee.id} onChange={handleEmployeeChange}>
                                {users.map(u => <option key={u.employeeId} value={u.employeeId}>{u.name}</option>)}
                            </select>
                        </div>
                    )}
                    {editingSessionIdx !== null && (
                        <div className={styles.metaField}>
                            <label className={styles.label}>Correcting</label>
                            <div className={styles.metaValue} style={{ color: '#d97706' }}>
                                Day {allSessions[editingSessionIdx]?.day} · {allSessions[editingSessionIdx]?.employeeName} · {fmtDate(allSessions[editingSessionIdx]?.date)}
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
                                            <div className={styles.colEmpLabel}>{sess.employeeName}</div>
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
                                                        <span style={{ color: '#6366f1', fontWeight: 800 }}>{oPct}%</span>
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
