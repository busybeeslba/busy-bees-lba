'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save, Printer, Plus, Trash2, MapPin, ChevronDown, ChevronRight, CheckCircle2 } from 'lucide-react';
import styles from './transaction.module.css';
import TransactionSheetPrintView from '@/components/forms/TransactionSheetPrintView';
import { dbClient } from '@/lib/dbClient';


type PassFailNA = 'N/A' | 'Pass' | 'Fail' | '';
type YesNo = 'Yes' | 'No' | '';
type PromptType = 'I' | 'V' | 'G' | 'PP' | 'FP' | '';

interface TransactionLocation {
    id: string; // unique string (e.g., timestamp)
    name: string;
    // 1. Transition
    transition: PassFailNA;
    delay: PassFailNA;
    delayTime: string;
    transitionNote: string;
    // 2. Prompts Given
    prompt: PromptType;
    promptCount: string;
    assistantNeeded: PassFailNA;
    food: PassFailNA;
    promptNote: string;
    // 3. Classwork Completed
    cwTaskAssigned: string;
    cwTaskCompleted: string;
    cwNote: string;
    // 4. Program Completed
    pgTaskAssigned: string;
    pgTaskCompleted: string;
    pgNote: string;
    // 5. Schedule Change
    scheduleChange: YesNo;
    scheduleNote: string;
    // 6. Crisis Called
    crisis: YesNo;
    crisisNote: string;
    // 7. Summary
    summaryExtra: string;
}

interface TransactionSheet {
    id?: string | number;
    clientId: string;
    clientName: string;
    employeeId: string;
    employeeName: string;
    date: string;
    cellPhoneLocation: string;
    program: string;
    locations: TransactionLocation[];
    createdAt?: string;
}

const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const newLocationBase = (): Omit<TransactionLocation, 'id' | 'name'> => ({
    transition: '', delay: '', delayTime: '', transitionNote: '',
    prompt: '', promptCount: '', assistantNeeded: '', food: '', promptNote: '',
    cwTaskAssigned: '', cwTaskCompleted: '', cwNote: '',
    pgTaskAssigned: '', pgTaskCompleted: '', pgNote: '',
    scheduleChange: '', scheduleNote: '',
    crisis: '', crisisNote: '',
    summaryExtra: ''
});

export default function TransactionSheetEntryPage() {
    const params = useParams();
    const router = useRouter();
    const isNew = params.id === 'new';

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [clients, setClients] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    
    // Sheet State
    const [selectedClient, setSelectedClient] = useState<any>(null);
    const [sheet, setSheet] = useState<TransactionSheet>({
        clientId: '', clientName: '', employeeId: '', employeeName: '',
        date: today(), cellPhoneLocation: '', program: '', locations: []
    });

    const [collapsedLocs, setCollapsedLocs] = useState<Set<string>>(new Set());

    useEffect(() => {
        Promise.all([
            dbClient.get('/clients').catch(() => []),
            dbClient.get('/users').catch(() => []),
        ]).then(([cls, usrs]) => {
            setClients(Array.isArray(cls) ? cls : []);
            const userList = Array.isArray(usrs) ? usrs : [];
            setUsers(userList);
            if (isNew && userList.length > 0) {
                setSheet(s => ({ ...s, employeeId: userList[0].employeeId || '', employeeName: userList[0].name || '' }));
            }
        });
    }, [isNew]);

    useEffect(() => {
        if (isNew) { setLoading(false); return; }
        dbClient.get(`/transaction-sheets/${params.id}`)
            .then((data: any) => {
                if (data.id) setSheet(data);
                if (data.clientId) {
                    dbClient.get('/clients').then(cls => {
                        const cl = cls.find((c: any) => c.clientId === data.clientId || String(c.id) === data.clientId || String(c.id) === data.clientId.replace('CLI-',''));
                        if (cl) setSelectedClient(cl);
                    }).catch(()=>{});
                }
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [params.id, isNew]);

    const handleClientChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const cl = clients.find(c => String(c.id) === e.target.value);
        setSelectedClient(cl || null);
        setSheet(s => ({
            ...s,
            clientId: cl ? cl.clientId || `CLI-${cl.id}` : '',
            clientName: cl ? cl.kidsName || cl.name : '',
            program: '',
            locations: []
        }));
    };

    const handleEmployeeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const u = users.find(u => u.employeeId === e.target.value);
        setSheet(s => ({ ...s, employeeId: u?.employeeId || '', employeeName: u?.name || '' }));
    };

    const handleProgramChange = (prog: string) => {
        setSheet(s => ({ ...s, program: prog }));
    };

    const updateLoc = (locId: string, updates: Partial<TransactionLocation>) => {
        setSheet(s => {
            const newLocs = s.locations.map(loc => {
                if (loc.id !== locId) return loc;
                const next = { ...loc, ...updates };
                // Transition auto-fill logic
                if (updates.transition === 'N/A') {
                    next.delay = 'N/A';
                    next.delayTime = 'N/A';
                }
                return next;
            });
            return { ...s, locations: newLocs };
        });
    };

    const addLocation = () => {
        const name = prompt('Enter new location name (e.g. Art Room):');
        if (!name) return;
        setSheet(s => ({
            ...s,
            locations: [...s.locations, { id: Math.random().toString(36).substr(2,9), name, ...newLocationBase() }]
        }));
    };

    const removeLocation = (locId: string) => {
        if (!confirm('Remove this location from the sheet?')) return;
        setSheet(s => ({ ...s, locations: s.locations.filter(l => l.id !== locId) }));
    };

    const toggleLocation = (locId: string) => {
        setCollapsedLocs(prev => {
            const next = new Set(prev);
            if (next.has(locId)) next.delete(locId);
            else next.add(locId);
            return next;
        });
    };

    const handleSave = async () => {
        if (!sheet.clientId) { alert('Please select a client.'); return; }
        setSaving(true);
        try {
            const payload = { ...sheet, createdAt: sheet.createdAt || new Date().toISOString() };
            if (sheet.id) {
                await dbClient.patch(`/transaction-sheets/${sheet.id}`, payload);
            } else {
                await dbClient.post('/transaction-sheets', payload);
            }
            router.push('/forms/transaction-sheet');
        } catch {
            alert('Could not save — is the database running?');
        } finally {
            setSaving(false);
        }
    };

    const availablePrograms: string[] = (() => {
        if (!selectedClient) return [];
        let cats: any[] = [];
        if (typeof selectedClient.programCategories === 'string') { try { cats = JSON.parse(selectedClient.programCategories); } catch { cats = []; } }
        else if (Array.isArray(selectedClient.programCategories)) { cats = selectedClient.programCategories; }
        return cats.map((c: any) => c.name).filter(Boolean);
    })();

    if (loading) return <div className={styles.loading}>Loading…</div>;

    const renderSelect = (label: string, val: string, onChange: (v: string) => void, options: string[], isNPA: boolean = false) => (
        <div className={styles.fieldRow}>
            <span className={styles.fieldLabel}>{label}</span>
            <div className={styles.fieldInputWrap}>
                <select className={styles.gridSelect} value={val} onChange={e => onChange(e.target.value)}>
                    <option value="">--</option>
                    {options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
            </div>
        </div>
    );

    const renderInput = (label: string, val: string, onChange: (v: string) => void, placeholder: string = '') => (
        <div className={styles.fieldRow}>
            <span className={styles.fieldLabel}>{label}</span>
            <div className={styles.fieldInputWrap}>
                <input type="text" className={styles.gridInput} placeholder={placeholder} value={val} onChange={e => onChange(e.target.value)} />
            </div>
        </div>
    );

    const renderNumber = (label: string, val: string, onChange: (v: string) => void) => (
        <div className={styles.fieldRow}>
            <span className={styles.fieldLabel}>{label}</span>
            <div className={styles.fieldInputWrap}>
                <input type="number" className={styles.gridInputNumber} value={val} onChange={e => onChange(e.target.value)} />
            </div>
        </div>
    );

    return (
        <div className={styles.page}>
            {/* Header */}
            <div className={styles.pageHeader}>
                <div className={styles.headerLeft}>
                    <button className={styles.backBtn} onClick={() => router.push('/forms/transaction-sheet')} disabled={saving}>
                        <ArrowLeft size={16} /> Back
                    </button>
                    <div>
                        <h1 className={styles.pageTitle}>Transaction Sheet</h1>
                        <p className={styles.pageSubtitle}>Log client behaviors across locations</p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button className={styles.printBtn} onClick={() => window.print()}>
                        <Printer size={16} /> Print / PDF
                    </button>
                    <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
                        <Save size={16} /> {saving ? 'Saving…' : 'Save Sheet'}
                    </button>
                </div>
            </div>

            {/* Meta Card */}
            <div className={styles.metaCard}>
                <div className={styles.metaGrid}>
                    <div className={styles.metaField}>
                        <label className={styles.label}>Date</label>
                        <input type="date" className={styles.input} value={sheet.date} onChange={e => setSheet({ ...sheet, date: e.target.value })} />
                    </div>
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
                                <label className={styles.label}>Program (Load Targets)</label>
                                <input 
                                    className={styles.input} 
                                    value={sheet.program || ''} 
                                    onChange={e => handleProgramChange(e.target.value)} 
                                    placeholder="Type or select…" 
                                    disabled={!selectedClient}
                                    list="program-datalist"
                                />
                                <datalist id="program-datalist">
                                    {availablePrograms.map(p => <option key={p} value={p} />)}
                                </datalist>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className={styles.metaField}>
                                <label className={styles.label}>Client</label>
                                <div style={{ fontSize: 16, fontWeight: 700 }}>{sheet.clientName || '—'}</div>
                            </div>
                            <div className={styles.metaField}>
                                <label className={styles.label}>Program</label>
                                <input 
                                    className={styles.input} 
                                    value={sheet.program || ''} 
                                    onChange={e => setSheet({ ...sheet, program: e.target.value })} 
                                    placeholder="Edit program name..."
                                />
                            </div>
                        </>
                    )}
                    <div className={styles.metaField}>
                        <label className={styles.label}>Provider</label>
                        <select className={styles.select} value={sheet.employeeId} onChange={handleEmployeeChange}>
                            <option value="">Select Provider…</option>
                            {users.map(u => <option key={u.id} value={u.employeeId}>{u.name}</option>)}
                        </select>
                    </div>
                    <div className={styles.metaField} style={{ gridColumn: '1 / -1' }}>
                        <label className={styles.label}>Cell Phone</label>
                        <input className={`${styles.input} ${styles.hidePrint}`} placeholder="e.g. In the bag, in his pocket..." value={sheet.cellPhoneLocation} onChange={e => setSheet({ ...sheet, cellPhoneLocation: e.target.value })} />
                        <div className={styles.showPrintOnly} style={{ marginTop: '4px', fontWeight: 600, fontSize: '13px', color: '#000' }}>
                            {sheet.cellPhoneLocation || 'N/A'}
                        </div>
                    </div>
                </div>

                <div className={styles.locationsSelector}>
                    <span className={styles.label}>Locations</span>
                    <div className={styles.locationPills}>
                        {Array.from(new Set(['Cafeteria', 'GYM', '211', 'Launch', 'Bus', ...sheet.locations.map(l => l.name)])).map(locName => {
                            const isActive = sheet.locations.some(l => l.name === locName);
                            return (
                                <button 
                                    key={locName} 
                                    onClick={() => {
                                        if (isActive) {
                                            removeLocation(sheet.locations.find(l => l.name === locName)!.id);
                                        } else {
                                            setSheet(s => ({
                                                ...s,
                                                locations: [...s.locations, { id: Math.random().toString(36).substr(2,9), name: locName, ...newLocationBase() }]
                                            }));
                                        }
                                    }} 
                                    className={`${styles.locPill} ${isActive ? styles.locPillActive : ''}`}
                                >
                                    {locName}
                                </button>
                            );
                        })}
                        <button onClick={addLocation} className={`${styles.locPill} ${styles.locPillCustom}`}>
                            + Custom
                        </button>
                    </div>
                </div>
            </div>

            {/* Locations Table */}
            {sheet.locations.length > 0 && (
                <div className={styles.tableContainer}>
                    <div className={styles.gridHeader}>
                        <span className={styles.gridTitle}>Transaction Locations</span>
                        {sheet.program && <span className={styles.programBadge}>{sheet.program}</span>}
                        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#92400e', background: 'rgba(255, 193, 7, 0.15)', padding: '2px 10px', borderRadius: 100 }}>{sheet.locations.length} location{sheet.locations.length !== 1 ? 's' : ''} added</span>
                    </div>
                    <table className={styles.dataTable}>
                        <thead>
                            <tr>
                                <th style={{ minWidth: 160, maxWidth: 220 }}>Location</th>
                                <th style={{ minWidth: 220, maxWidth: 280 }}>Transition</th>
                                <th style={{ minWidth: 260, maxWidth: 320 }}>Prompts Given</th>
                                <th style={{ minWidth: 160, maxWidth: 220 }}>Classwork Task</th>
                                <th style={{ minWidth: 160, maxWidth: 220 }}>Program Task</th>
                                <th style={{ minWidth: 160, maxWidth: 220 }}>Schedule Change</th>
                                <th style={{ minWidth: 160, maxWidth: 220 }}>Crisis Called</th>
                                <th style={{ minWidth: 220, maxWidth: 300 }}>Summary</th>
                                <th style={{ width: 48, textAlign: 'center' }}>Act</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sheet.locations.map((loc, index) => {
                                const bullets = [
                                    loc.transitionNote ? `Transition: ${loc.transitionNote}` : null,
                                    loc.promptNote ? `Prompts: ${loc.promptNote}` : null,
                                    loc.cwNote ? `Classwork: ${loc.cwNote}` : null,
                                    loc.pgNote ? `Program: ${loc.pgNote}` : null,
                                    loc.scheduleNote ? `Schedule: ${loc.scheduleNote}` : null,
                                    loc.crisisNote ? `Crisis: ${loc.crisisNote}` : null,
                                ].filter(Boolean);

                                return (
                                    <tr key={loc.id}>
                                        <td>
                                            <div className={styles.locName}>{index + 1}. {loc.name}</div>
                                        </td>

                                        {/* TRANSITION */}
                                        <td>
                                            <div className={styles.cellStack}>
                                                <div className={styles.cellRow}>
                                                    <span className={styles.cellLabel}>Transition</span>
                                                    <select className={styles.compactSelect} value={loc.transition} onChange={e => updateLoc(loc.id, { transition: e.target.value as any })}>
                                                        <option value=""></option><option value="N/A">N/A</option><option value="Pass">Pass</option><option value="Fail">Fail</option>
                                                    </select>
                                                </div>
                                                <div className={styles.cellRow}>
                                                    <span className={styles.cellLabel}>Delay</span>
                                                    <select className={styles.compactSelect} value={loc.delay} onChange={e => updateLoc(loc.id, { delay: e.target.value as any })}>
                                                        <option value=""></option><option value="Yes">Yes</option><option value="No">No</option><option value="N/A">N/A</option>
                                                    </select>
                                                </div>
                                                <div className={styles.cellRow}>
                                                    <span className={styles.cellLabel}>Time</span>
                                                    <input className={styles.compactInput} placeholder="e.g. 15m" value={loc.delayTime} onChange={e => updateLoc(loc.id, { delayTime: e.target.value })} />
                                                </div>
                                                <textarea className={styles.compactNote} placeholder="Transition note..." value={loc.transitionNote} onChange={e => updateLoc(loc.id, { transitionNote: e.target.value })} />
                                            </div>
                                        </td>

                                        {/* PROMPTS */}
                                        <td>
                                            <div className={styles.cellStack}>
                                                <div className={styles.cellRow}>
                                                    <span className={styles.cellLabel}>Prompt</span>
                                                    <select className={styles.compactSelect} value={loc.prompt} onChange={e => updateLoc(loc.id, { prompt: e.target.value as any })}>
                                                        <option value=""></option><option value="I">I</option><option value="V">V</option><option value="G">G</option><option value="PP">PP</option><option value="FP">FP</option>
                                                    </select>
                                                </div>
                                                <div className={styles.cellRow}>
                                                    <span className={styles.cellLabel}>Given #</span>
                                                    <input className={styles.compactInput} type="number" value={loc.promptCount} onChange={e => updateLoc(loc.id, { promptCount: e.target.value })} />
                                                </div>
                                                <div className={styles.cellRow}>
                                                    <span className={styles.cellLabel}>Assist</span>
                                                    <select className={styles.compactSelect} value={loc.assistantNeeded} onChange={e => updateLoc(loc.id, { assistantNeeded: e.target.value as any })}>
                                                        <option value=""></option><option value="Yes">Yes</option><option value="No">No</option><option value="N/A">N/A</option>
                                                    </select>
                                                </div>
                                                <div className={styles.cellRow}>
                                                    <span className={styles.cellLabel}>Food</span>
                                                    <select className={styles.compactSelect} value={loc.food} onChange={e => updateLoc(loc.id, { food: e.target.value as any })}>
                                                        <option value=""></option><option value="Yes">Yes</option><option value="No">No</option><option value="N/A">N/A</option>
                                                    </select>
                                                </div>
                                                <textarea className={styles.compactNote} placeholder="Prompts note..." value={loc.promptNote} onChange={e => updateLoc(loc.id, { promptNote: e.target.value })} />
                                            </div>
                                        </td>

                                        {/* CLASSWORK TASK */}
                                        <td>
                                            <div className={styles.cellStack}>
                                                <div style={{ fontSize: 11, fontWeight: 800, color: '#d97706', textTransform: 'uppercase', letterSpacing: 0.5 }}><span style={{display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: 'currentColor', marginRight: 6}}></span>Classwork Task</div>
                                                <div className={styles.cellRow}>
                                                    <span className={styles.cellLabelWide}>Assigned #</span>
                                                    <input className={styles.compactInput} type="number" value={loc.cwTaskAssigned} onChange={e => updateLoc(loc.id, { cwTaskAssigned: e.target.value })} />
                                                </div>
                                                <div className={styles.cellRow}>
                                                    <span className={styles.cellLabelWide}>Complete #</span>
                                                    <input className={styles.compactInput} type="number" value={loc.cwTaskCompleted} onChange={e => updateLoc(loc.id, { cwTaskCompleted: e.target.value })} />
                                                </div>
                                                <textarea className={styles.compactNote} placeholder="CW note..." value={loc.cwNote} onChange={e => updateLoc(loc.id, { cwNote: e.target.value })} />
                                            </div>
                                        </td>

                                        {/* PROGRAM TASK */}
                                        <td>
                                            <div className={styles.cellStack}>
                                                <div style={{ fontSize: 11, fontWeight: 800, color: '#0891b2', textTransform: 'uppercase', letterSpacing: 0.5 }}><span style={{display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: 'currentColor', marginRight: 6}}></span>Program Task</div>
                                                <div className={styles.cellRow}>
                                                    <span className={styles.cellLabelWide}>Assigned #</span>
                                                    <input className={styles.compactInput} type="number" value={loc.pgTaskAssigned} onChange={e => updateLoc(loc.id, { pgTaskAssigned: e.target.value })} />
                                                </div>
                                                <div className={styles.cellRow}>
                                                    <span className={styles.cellLabelWide}>Complete #</span>
                                                    <input className={styles.compactInput} type="number" value={loc.pgTaskCompleted} onChange={e => updateLoc(loc.id, { pgTaskCompleted: e.target.value })} />
                                                </div>
                                                <textarea className={styles.compactNote} placeholder="PG note..." value={loc.pgNote} onChange={e => updateLoc(loc.id, { pgNote: e.target.value })} />
                                            </div>
                                        </td>

                                        {/* SCHEDULE CHANGE */}
                                        <td>
                                            <div className={styles.cellStack}>
                                                <div style={{ fontSize: 11, fontWeight: 800, color: '#d97706', textTransform: 'uppercase', letterSpacing: 0.5 }}><span style={{display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: 'currentColor', marginRight: 6}}></span>Schedule Change</div>
                                                <div className={styles.cellRow}>
                                                    <span className={styles.cellLabel}>Change</span>
                                                    <select className={styles.compactSelect} value={loc.scheduleChange} onChange={e => updateLoc(loc.id, { scheduleChange: e.target.value as any })}>
                                                        <option value=""></option><option value="Yes">Yes</option><option value="No">No</option>
                                                    </select>
                                                </div>
                                                <textarea className={styles.compactNote} placeholder="Schedule note..." value={loc.scheduleNote} onChange={e => updateLoc(loc.id, { scheduleNote: e.target.value })} />
                                            </div>
                                        </td>

                                        {/* CRISIS CALLED */}
                                        <td>
                                            <div className={styles.cellStack}>
                                                <div style={{ fontSize: 11, fontWeight: 800, color: '#0891b2', textTransform: 'uppercase', letterSpacing: 0.5 }}><span style={{display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: 'currentColor', marginRight: 6}}></span>Crisis Called</div>
                                                <div className={styles.cellRow}>
                                                    <span className={styles.cellLabel}>Crisis</span>
                                                    <select className={styles.compactSelect} value={loc.crisis} onChange={e => updateLoc(loc.id, { crisis: e.target.value as any })}>
                                                        <option value=""></option><option value="Yes">Yes</option><option value="No">No</option>
                                                    </select>
                                                </div>
                                                <textarea className={styles.compactNote} placeholder="Crisis note..." value={loc.crisisNote} onChange={e => updateLoc(loc.id, { crisisNote: e.target.value })} />
                                            </div>
                                        </td>

                                        {/* SUMMARY */}
                                        <td style={{ background: '#f8fafc' }}>
                                            <div className={styles.cellStack} style={{ height: '100%' }}>
                                                {bullets.length > 0 ? (
                                                    <ul style={{ margin: '0 0 12px', paddingLeft: 16, color: '#166534', fontSize: 12, lineHeight: 1.5 }}>
                                                        {bullets.map((b, i) => <li key={i}>{b}</li>)}
                                                    </ul>
                                                ) : (
                                                    <div style={{ fontStyle: 'italic', color: '#16a34a', fontSize: 12, opacity: 0.7, marginBottom: 12 }}>No notes compiled.</div>
                                                )}
                                                <textarea
                                                    className={styles.compactNote}
                                                    style={{ borderColor: '#bbf7d0', background: '#fff' }}
                                                    placeholder="Add additional summary details..."
                                                    value={loc.summaryExtra}
                                                    onChange={e => updateLoc(loc.id, { summaryExtra: e.target.value })}
                                                />
                                            </div>
                                        </td>

                                        <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>
                                            <button className={styles.deleteRowBtn} onClick={() => removeLocation(loc.id)} title="Remove Row">
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* PRINT-ONLY HTML FORM VIEW */}
            {sheet.locations.length > 0 && (
                <div className={styles.printOnlyDocument}>
                    <TransactionSheetPrintView sheet={sheet} printOnly={true} />
                </div>
            )}



            {sheet.locations.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                    <button className={styles.saveBtn} style={{ padding: '14px 32px', fontSize: 16 }} onClick={handleSave} disabled={saving}>
                        <Save size={18} /> {saving ? 'Saving…' : 'Save Transaction Sheet'}
                    </button>
                </div>
            )}
        </div>
    );
}
