import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Alert, ActivityIndicator, TextInput, LayoutAnimation, UIManager, Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { dbGet, dbPost, dbPatch } from '../../lib/db';
import { RootStackParamList } from '../../types/navigation';
import { useAppStore } from '../../store/useAppStore';
import { COLORS, FONTS } from '../../constants/theme';
import { ArrowLeft, Save, X, ChevronDown, ChevronUp, Pencil } from 'lucide-react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const MAX_TRIALS = 5;
const INDIGO = '#6366f1';
const INDIGO_LIGHT = '#eef2ff';
const INDIGO_BORDER = '#c7d2fe';

type TrialVal = '+' | '-' | '';

interface TrialSession {
    day: number;
    date: string;
    employeeName: string;
    employeeId: string;
    results: Record<string, TrialVal[]>; // indexed by row index string
}
interface StepRow { step: string; }
interface MassTrialSheet {
    id?: string | number;
    clientId: string;
    clientName: string;
    program: string;
    rows: StepRow[];
    sessions: TrialSession[];
    createdAt?: string;
}

const todayStr = () => new Date().toISOString().slice(0, 10);
const fmtDate = (d: string) => {
    try {
        const safe = /^\d{4}-\d{2}-\d{2}$/.test(d) ? d + 'T12:00:00' : d;
        const dt = new Date(safe);
        return `${dt.toLocaleString('default', { month: 'short' })} ${dt.getDate()}`;
    } catch { return d; }
};

function emptyTrials(rows: StepRow[]): Record<string, TrialVal[]> {
    const r: Record<string, TrialVal[]> = {};
    rows.forEach((_, i) => { r[String(i)] = Array(MAX_TRIALS).fill(''); });
    return r;
}

function pctOf(trials: TrialVal[]): number | null {
    const counted = trials.filter(t => t === '+' || t === '-');
    if (!counted.length) return null;
    return Math.round(counted.filter(t => t === '+').length / counted.length * 100);
}

export const MassTrialScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { sheetId, clientId, sessionId, isNew } = route.params || {};
    const { activeSession, user, clients } = useAppStore();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [sheet, setSheet] = useState<MassTrialSheet | null>(null);
    // newTrials: results for the next session being entered
    const [newTrials, setNewTrials] = useState<Record<string, TrialVal[]>>({});

    const [editingSessionIdx, setEditingSessionIdx] = useState<number | null>(null);
    const [editDraft, setEditDraft] = useState<Record<string, TrialVal[]>>({});
    const [expandedDay, setExpandedDay] = useState<number | null>(null);
    const [showAddStep, setShowAddStep] = useState(false);
    const [newStepText, setNewStepText] = useState('');

    const numericClientId = activeSession?.clientId?.replace('CLI-', '');
    const clientRecord: any =
        clients.find((c: any) => String(c.id) === numericClientId) ||
        clients.find((c: any) =>
            (c.kidsName || c.name || '').toLowerCase() ===
            (activeSession?.clientName || '').toLowerCase()
        );

    // Programs come from programCategories (same as baseline)
    const availablePrograms: string[] = (() => {
        let cats: any[] = [];
        if (typeof clientRecord?.programCategories === 'string') {
            try { cats = JSON.parse(clientRecord.programCategories); } catch { cats = []; }
        } else if (Array.isArray(clientRecord?.programCategories)) {
            cats = clientRecord.programCategories;
        }
        return cats.map((c: any) => c.name).filter(Boolean);
    })();

    const [selectedProgram, setSelectedProgram] = useState<string>(
        availablePrograms[0] || ''
    );

    useEffect(() => {
        if (sheetId && availablePrograms.includes(sheetId)) { // Assuming sheetId might be used to pre-select program if it's a program name
            setSelectedProgram(sheetId);
        }
    }, [sheetId, availablePrograms.join(',')]);

    // Load / create the mass_trial sheet for this client+program
    useEffect(() => {
        if (!selectedProgram || !clientRecord) { setLoading(false); return; }
        setLoading(true);
        setEditingSessionIdx(null);
        setExpandedDay(null);
        const currentClientId = activeSession?.clientId || `CLI-${clientRecord.id}`;
        const fetchFromDB = () => {
            dbGet<any[]>('/mass_trials')
                .then(all => {
                    const found = (Array.isArray(all) ? all : []).find(s =>
                        (s.clientId === currentClientId || s.clientName === (clientRecord.kidsName || clientRecord.name)) &&
                        s.program === selectedProgram
                    );
                    if (found) {
                        const rows: StepRow[] = Array.isArray(found.rows) ? found.rows.map((r: any) => ({ step: r.step || '' })) : [];
                        const sessions = Array.isArray(found.sessions) ? found.sessions.map((sess: any) => ({
                            ...sess,
                            results: (() => {
                                const res: Record<string, TrialVal[]> = {};
                                rows.forEach((_, i) => {
                                    const raw = sess.results?.[String(i)];
                                    res[String(i)] = Array.isArray(raw)
                                        ? [...Array(MAX_TRIALS)].map((_, ti) => (raw[ti] as TrialVal) || '')
                                        : Array(MAX_TRIALS).fill('');
                                });
                                return res;
                            })(),
                        })) : [];
                        const loaded: MassTrialSheet = { id: found.id, clientId: currentClientId, clientName: found.clientName, program: found.program, rows, sessions };
                        setSheet(loaded);
                        setNewTrials(emptyTrials(rows));
                    } else {
                        let cats: any[] = [];
                        if (typeof clientRecord.programCategories === 'string') {
                            try { cats = JSON.parse(clientRecord.programCategories); } catch { cats = []; }
                        } else if (Array.isArray(clientRecord.programCategories)) {
                            cats = clientRecord.programCategories;
                        }
                        const cat = cats.find((c: any) => c.name === selectedProgram);
                        const rows: StepRow[] = cat?.targets?.map((t: any) => ({ step: t.name })) || [];
                        const newSheet: MassTrialSheet = {
                            clientId: currentClientId, clientName: activeSession?.clientName || clientRecord.kidsName || clientRecord.name || '',
                            program: selectedProgram, rows, sessions: [],
                        };
                        setSheet(newSheet);
                        setNewTrials(emptyTrials(rows));
                    }
                })
                .catch(() => { })
                .finally(() => setLoading(false));
        };
        fetchFromDB();
    }, [selectedProgram, clientRecord, activeSession?.clientId, activeSession?.clientName]);

    // Toggle a single trial cell: '' → '+' → '-' → ''
    const cycleTrialVal = (v: TrialVal): TrialVal => {
        if (v === '') return '+';
        if (v === '+') return '-';
        return '';
    };

    const toggleNewTrial = (rowIdx: number, trialIdx: number) => {
        setNewTrials(prev => {
            const row = [...(prev[String(rowIdx)] || Array(MAX_TRIALS).fill(''))];
            row[trialIdx] = cycleTrialVal(row[trialIdx]);
            return { ...prev, [String(rowIdx)]: row };
        });
    };

    const startEdit = (sessIdx: number) => {
        if (!sheet) return;
        setEditingSessionIdx(sessIdx);
        const draft: Record<string, TrialVal[]> = {};
        sheet.rows.forEach((_, ri) => {
            draft[String(ri)] = [...(sheet.sessions[sessIdx].results[String(ri)] || Array(MAX_TRIALS).fill(''))];
        });
        setEditDraft(draft);
        setExpandedDay(null);
    };
    const cancelEdit = () => { setEditingSessionIdx(null); setEditDraft({}); };

    const toggleEditTrial = (rowIdx: number, trialIdx: number) => {
        setEditDraft(prev => {
            const row = [...(prev[String(rowIdx)] || Array(MAX_TRIALS).fill(''))];
            row[trialIdx] = cycleTrialVal(row[trialIdx]);
            return { ...prev, [String(rowIdx)]: row };
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
            await dbPatch(`/mass_trials/${sheet.id}`, updatedSheet);
            setSheet(updatedSheet);
            setEditingSessionIdx(null);
            setEditDraft({});
            Alert.alert('Saved!', 'Session corrected successfully.');
        } catch {
            Alert.alert('Error', 'Could not save correction.');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveNew = async () => {
        if (!sheet) { Alert.alert('Error', 'No sheet loaded.'); return; }
        setSaving(true);
        try {
            const newSession: TrialSession = {
                day: (sheet.sessions?.length || 0) + 1,
                date: todayStr(), employeeName: user?.name || '', employeeId: user?.employeeId || '',
                results: newTrials,
            };
            const updatedSheet = { ...sheet, sessions: [...(sheet.sessions || []), newSession] };
            if (sheet.id) {
                await dbPatch(`/mass_trials/${sheet.id}`, updatedSheet);
            } else {
                await dbPost('/mass_trials', { ...updatedSheet, createdAt: new Date().toISOString() });
            }
            Alert.alert('Success', 'Session saved!');
        } catch {
            Alert.alert('Error', 'Could not save — check your connection.');
        } finally {
            setSaving(false);
        }
    };

    const handleAddStep = () => {
        const name = newStepText.trim();
        if (!name || !sheet) return;
        const newIdx = sheet.rows?.length || 0;
        setSheet(prev => prev ? { ...prev, rows: [...(prev.rows || []), { step: name }] } : prev);
        setNewTrials(prev => ({ ...prev, [String(newIdx)]: Array(MAX_TRIALS).fill('') }));
        setNewStepText('');
        setShowAddStep(false);
    };

    const toggleDayExpand = (dayNum: number) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpandedDay(prev => prev === dayNum ? null : dayNum);
    };

    const rows = sheet?.rows || [];
    const allSessions = sheet?.sessions || [];
    const nextDay = allSessions.length + 1;
    const isEditMode = editingSessionIdx !== null;
    const editingSess = isEditMode ? allSessions[editingSessionIdx!] : null;
    const activeTrials = isEditMode ? editDraft : newTrials;
    const toggleTrial = isEditMode ? toggleEditTrial : toggleNewTrial;

    return (
        <View style={s.container}>
            {/* ── Header ── */}
            <View style={[s.header, isEditMode && s.headerEditMode]}>
                <TouchableOpacity style={s.backBtn} onPress={isEditMode ? cancelEdit : () => navigation.goBack()}>
                    {isEditMode ? <X size={18} color={INDIGO} /> : <ArrowLeft size={18} color="#fff" />}
                </TouchableOpacity>
                <View style={s.headerTitle}>
                    <Text style={[s.title, isEditMode && s.titleEditMode]}>
                        {isEditMode ? `Correcting Day ${editingSess?.day}` : 'Mass Trial / DTT'}
                    </Text>
                    <Text style={[s.subtitle, isEditMode && s.subtitleEditMode]}>
                        {isEditMode
                            ? `${editingSess?.employeeName} · ${fmtDate(editingSess?.date || '')}`
                            : activeSession?.clientName || 'No client'}
                    </Text>
                </View>
                <TouchableOpacity
                    style={[s.saveBtn, isEditMode && s.saveBtnEdit]}
                    onPress={isEditMode ? saveEdit : handleSaveNew}
                    disabled={saving || !sheet}
                >
                    {saving ? <ActivityIndicator color="#fff" size="small" /> : (
                        <><Save size={15} color="#fff" /><Text style={s.saveBtnText}>{isEditMode ? 'Save Edit' : `Save D${nextDay}`}</Text></>
                    )}
                </TouchableOpacity>
            </View>

            {/* ── Program Selector ── */}
            {availablePrograms.length > 0 && !isEditMode && (
                <View style={s.programSelector}>
                    <Text style={s.sectionLabel}>Program Category</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {availablePrograms.map(prog => (
                            <TouchableOpacity
                                key={prog}
                                style={[s.programChip, selectedProgram === prog && s.programChipActive]}
                                onPress={() => setSelectedProgram(prog)}
                            >
                                <Text style={[s.programChipText, selectedProgram === prog && s.programChipTextActive]}>{prog}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}

            {loading ? (
                <View style={s.center}><ActivityIndicator color={INDIGO} size="large" /></View>
            ) : !sheet || rows.length === 0 ? (
                <View style={s.center}>
                    <Text style={s.emptyText}>
                        {availablePrograms.length === 0 ? 'No programs found for this client.' : 'Select a program above to load the sheet.'}
                    </Text>
                </View>
            ) : (
                <ScrollView style={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

                    {/* ── Section 1: Entry ── */}
                    <View style={s.sectionCard}>
                        <View style={[s.sessionBanner, isEditMode && s.sessionBannerEdit]}>
                            <View>
                                <Text style={[s.sessionBannerTitle, isEditMode && s.sessionBannerTitleEdit]}>
                                    {isEditMode ? `✏️ Correcting Day ${editingSess?.day}` : `Day ${nextDay} — ${fmtDate(todayStr())}`}
                                </Text>
                                <Text style={[s.sessionBannerEmp, isEditMode && s.sessionBannerEmpEdit]}>
                                    {isEditMode ? editingSess?.employeeName : user?.name || 'You'}
                                </Text>
                            </View>
                            <View style={s.trialsLegend}>
                                <Text style={s.legendPass}>✓ Pass</Text>
                                <Text style={s.legendFail}>  ✗ Fail</Text>
                            </View>
                        </View>

                        {/* Table header */}
                        <View style={s.tableHeader}>
                            <Text style={[s.headerCell, { width: 22 }]}>#</Text>
                            <Text style={[s.headerCell, { flex: 1 }]}>STO</Text>
                            {Array.from({ length: MAX_TRIALS }, (_, i) => (
                                <Text key={i} style={[s.headerCell, { width: 36, textAlign: 'center' }]}>T{i + 1}</Text>
                            ))}
                            <Text style={[s.headerCell, { width: 42, textAlign: 'center' }]}>%</Text>
                        </View>

                        {/* STO rows */}
                        {rows.map((row, rowIdx) => {
                            const trials = activeTrials[String(rowIdx)] || Array(MAX_TRIALS).fill('');
                            const pct = pctOf(trials);
                            return (
                                <View key={rowIdx} style={[s.row, rowIdx % 2 === 1 && s.rowAlt]}>
                                    <Text style={s.rowNum}>{rowIdx + 1}</Text>
                                    <Text style={s.stepText}>{row.step}</Text>
                                    {trials.map((t, ti) => (
                                        <TouchableOpacity
                                            key={ti}
                                            style={[s.trialBtn,
                                            t === '+' ? s.trialPass :
                                                t === '-' ? s.trialFail :
                                                    s.trialEmpty
                                            ]}
                                            onPress={() => toggleTrial(rowIdx, ti)}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={[s.trialBtnText,
                                            t === '+' ? s.trialPassText :
                                                t === '-' ? s.trialFailText :
                                                    s.trialEmptyText
                                            ]}>
                                                {t === '+' ? '✓' : t === '-' ? '✗' : '·'}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                    <View style={s.pctCell}>
                                        {pct !== null ? (
                                            <Text style={[s.pctText,
                                            pct >= 80 ? s.pctGreen : pct >= 60 ? s.pctAmber : s.pctRed
                                            ]}>{pct}%</Text>
                                        ) : <Text style={s.pctDash}>—</Text>}
                                    </View>
                                </View>
                            );
                        })}

                        {/* Add Step */}
                        {!isEditMode && (
                            <View style={s.addStepBar}>
                                {showAddStep ? (
                                    <View style={s.addStepRow}>
                                        <TextInput
                                            style={s.addStepInput}
                                            placeholder="New STO name…"
                                            placeholderTextColor="#94a3b8"
                                            value={newStepText}
                                            onChangeText={(t: string) => setNewStepText(t.length > 0 ? t[0].toUpperCase() + t.slice(1) : t)}
                                            onSubmitEditing={handleAddStep}
                                            returnKeyType="done"
                                            autoFocus
                                        />
                                        <TouchableOpacity style={s.addStepConfirm} onPress={handleAddStep} disabled={!newStepText.trim()}>
                                            <Text style={s.addStepConfirmText}>Add</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={s.addStepCancel} onPress={() => { setShowAddStep(false); setNewStepText(''); }}>
                                            <Text style={s.addStepCancelText}>✕</Text>
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    <TouchableOpacity style={s.addStepBtn} onPress={() => setShowAddStep(true)}>
                                        <Text style={s.addStepBtnText}>+ Add STO</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}

                        {/* Footer summary */}
                        <View style={s.entryFooter}>
                            {(() => {
                                let totalPlus = 0, totalMinus = 0;
                                rows.forEach((_, ri) => {
                                    const t = activeTrials[String(ri)] || [];
                                    t.forEach(v => { if (v === '+') totalPlus++; else if (v === '-') totalMinus++; });
                                });
                                const total = totalPlus + totalMinus;
                                const pct = total > 0 ? Math.round(totalPlus / total * 100) : null;
                                return (
                                    <Text style={s.entryFooterText}>
                                        {rows.length} STOs · {' '}
                                        <Text style={{ color: '#15803d', fontWeight: '700' }}>✓{totalPlus}</Text>
                                        {' · '}
                                        <Text style={{ color: '#dc2626', fontWeight: '700' }}>✗{totalMinus}</Text>
                                        {pct !== null ? <Text style={{ color: INDIGO, fontWeight: '700' }}> · {pct}%</Text> : null}
                                    </Text>
                                );
                            })()}
                        </View>
                    </View>

                    {/* ── Section 2: Past Sessions Accordion ── */}
                    {allSessions.length > 0 && !isEditMode && (
                        <View style={s.sectionCard}>
                            <Text style={s.sectionTitle}>Past Sessions</Text>
                            {allSessions.map((sess, sessIdx) => {
                                let sPlus = 0, sMinus = 0;
                                rows.forEach((_, ri) => {
                                    (sess.results[String(ri)] || []).forEach((v: TrialVal) => { if (v === '+') sPlus++; else if (v === '-') sMinus++; });
                                });
                                const sTotal = sPlus + sMinus;
                                const sPct = sTotal > 0 ? Math.round(sPlus / sTotal * 100) : null;
                                const isExpanded = expandedDay === sess.day;
                                return (
                                    <View key={sess.day} style={s.accordionItem}>
                                        <TouchableOpacity style={s.accordionHeader} onPress={() => toggleDayExpand(sess.day)} activeOpacity={0.75}>
                                            <View style={s.accordionLeft}>
                                                <Text style={s.accordionDay}>Day {sess.day}</Text>
                                                <Text style={s.accordionMeta}>{fmtDate(sess.date)} · {sess.employeeName || '—'}</Text>
                                            </View>
                                            <View style={s.accordionRight}>
                                                {sPlus > 0 && <Text style={s.statPass}>✓{sPlus}</Text>}
                                                {sMinus > 0 && <Text style={s.statFail}> ✗{sMinus}</Text>}
                                                {sPct !== null && <Text style={s.statPct}> {sPct}%</Text>}
                                                {sTotal === 0 && <Text style={s.statNone}>—</Text>}
                                                {isExpanded
                                                    ? <ChevronUp size={16} color="#94a3b8" style={{ marginLeft: 6 }} />
                                                    : <ChevronDown size={16} color="#94a3b8" style={{ marginLeft: 6 }} />}
                                            </View>
                                        </TouchableOpacity>

                                        {isExpanded && (
                                            <View style={s.accordionBody}>
                                                {/* Mini table header */}
                                                <View style={s.dayTableHeader}>
                                                    <Text style={[s.dayHeaderCell, { width: 22 }]}>#</Text>
                                                    <Text style={[s.dayHeaderCell, { flex: 1 }]}>STO</Text>
                                                    {Array.from({ length: MAX_TRIALS }, (_, i) => (
                                                        <Text key={i} style={[s.dayHeaderCell, { width: 30, textAlign: 'center' }]}>T{i + 1}</Text>
                                                    ))}
                                                    <Text style={[s.dayHeaderCell, { width: 38, textAlign: 'center' }]}>%</Text>
                                                </View>
                                                {rows.map((row, ri) => {
                                                    const trials: TrialVal[] = sess.results[String(ri)] || Array(MAX_TRIALS).fill('');
                                                    const pct = pctOf(trials);
                                                    return (
                                                        <View key={ri} style={[s.dayRow, ri % 2 === 1 && s.dayRowAlt]}>
                                                            <Text style={s.dayRowNum}>{ri + 1}</Text>
                                                            <Text style={s.dayRowStep}>{row.step}</Text>
                                                            {trials.map((t, ti) => (
                                                                <View key={ti} style={s.dayTrialCell}>
                                                                    <Text style={t === '+' ? s.dayTrialPass : t === '-' ? s.dayTrialFail : s.dayTrialEmpty}>
                                                                        {t === '+' ? '✓' : t === '-' ? '✗' : '·'}
                                                                    </Text>
                                                                </View>
                                                            ))}
                                                            <View style={s.dayPctCell}>
                                                                {pct !== null ? (
                                                                    <Text style={[s.dayPctText, pct >= 80 ? s.pctGreen : pct >= 60 ? s.pctAmber : s.pctRed]}>{pct}%</Text>
                                                                ) : <Text style={s.pctDash}>—</Text>}
                                                            </View>
                                                        </View>
                                                    );
                                                })}
                                                <TouchableOpacity style={s.editDayBtn} onPress={() => startEdit(sessIdx)}>
                                                    <Pencil size={12} color={INDIGO} />
                                                    <Text style={s.editDayBtnText}>Edit this day</Text>
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                    </View>
                                );
                            })}
                        </View>
                    )}

                    <View style={{ height: 40 }} />
                </ScrollView>
            )}
        </View>
    );
};

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f0f2f5' },

    // Header — indigo
    header: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: INDIGO,
        paddingTop: 52, paddingBottom: 14, paddingHorizontal: 16, gap: 12,
    },
    headerEditMode: { backgroundColor: INDIGO_LIGHT, borderBottomWidth: 2, borderBottomColor: INDIGO_BORDER },
    backBtn: {
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: { flex: 1 },
    title: { fontSize: 17, fontWeight: '800', color: '#fff', fontFamily: FONTS.bold },
    titleEditMode: { color: INDIGO },
    subtitle: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontFamily: FONTS.regular, marginTop: 1 },
    subtitleEditMode: { color: '#6366f1' },
    saveBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 9,
        paddingHorizontal: 14, paddingVertical: 8,
    },
    saveBtnEdit: { backgroundColor: INDIGO },
    saveBtnText: { fontSize: 13, fontWeight: '700', color: '#fff', fontFamily: FONTS.bold },

    // Program selector
    programSelector: {
        backgroundColor: 'white', paddingVertical: 12, paddingHorizontal: 16,
        borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
    },
    sectionLabel: {
        fontSize: 10, fontWeight: '700', color: '#94a3b8',
        textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, fontFamily: FONTS.bold,
    },
    programChip: {
        paddingHorizontal: 14, paddingVertical: 7, borderRadius: 100,
        backgroundColor: '#f1f5f9', marginRight: 8,
        borderWidth: 1.5, borderColor: 'transparent',
    },
    programChipActive: { backgroundColor: INDIGO_LIGHT, borderColor: INDIGO },
    programChipText: { fontSize: 13, fontWeight: '600', color: '#64748b', fontFamily: FONTS.regular },
    programChipTextActive: { color: '#4338ca', fontFamily: FONTS.bold },

    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
    emptyText: { fontSize: 14, color: '#94a3b8', textAlign: 'center', fontFamily: FONTS.regular, lineHeight: 22 },
    scroll: { flex: 1 },

    sectionCard: {
        backgroundColor: 'white', marginHorizontal: 12, marginTop: 12,
        borderRadius: 16, overflow: 'hidden',
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
    },
    sectionTitle: {
        fontSize: 11, fontWeight: '800', color: '#94a3b8',
        textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: FONTS.bold,
        paddingHorizontal: 14, paddingTop: 14, paddingBottom: 8,
    },

    // Session banner
    sessionBanner: {
        paddingHorizontal: 14, paddingVertical: 10,
        backgroundColor: INDIGO_LIGHT, borderBottomWidth: 1, borderBottomColor: INDIGO_BORDER,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    sessionBannerEdit: { backgroundColor: '#fffde7', borderBottomColor: '#ffe082' },
    sessionBannerTitle: { fontSize: 14, fontWeight: '800', color: '#4338ca', fontFamily: FONTS.bold },
    sessionBannerTitleEdit: { color: '#d97706' },
    sessionBannerEmp: { fontSize: 11, color: INDIGO, marginTop: 2, fontFamily: FONTS.regular },
    sessionBannerEmpEdit: { color: '#d97706' },
    trialsLegend: { flexDirection: 'row', alignItems: 'center' },
    legendPass: { fontSize: 11, fontWeight: '700', color: '#15803d', fontFamily: FONTS.bold },
    legendFail: { fontSize: 11, fontWeight: '700', color: '#dc2626', fontFamily: FONTS.bold },

    // Table header
    tableHeader: {
        flexDirection: 'row', backgroundColor: INDIGO_LIGHT,
        borderBottomWidth: 1.5, borderBottomColor: INDIGO_BORDER,
        paddingVertical: 8, paddingHorizontal: 12,
        alignItems: 'center',
    },
    headerCell: { fontSize: 9, fontWeight: '700', color: '#4338ca', textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: FONTS.bold },

    // STO rows
    row: {
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: 6, paddingHorizontal: 12,
        borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
        backgroundColor: 'white',
    },
    rowAlt: { backgroundColor: '#fafbff' },
    rowNum: { width: 22, fontSize: 10, color: '#94a3b8', fontWeight: '600', fontFamily: FONTS.regular },
    stepText: { flex: 1, fontSize: 13, fontWeight: '600', color: '#1e293b', fontFamily: FONTS.bold, flexShrink: 1 },

    // Trial buttons
    trialBtn: {
        width: 36, height: 36, borderRadius: 8,
        alignItems: 'center', justifyContent: 'center',
        marginRight: 0,
    },
    trialEmpty: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0' },
    trialPass: { backgroundColor: '#f0fdf4', borderWidth: 1.5, borderColor: '#86efac' },
    trialFail: { backgroundColor: '#fef2f2', borderWidth: 1.5, borderColor: '#fca5a5' },
    trialBtnText: { fontSize: 14, fontWeight: '800' },
    trialPassText: { color: '#15803d' },
    trialFailText: { color: '#dc2626' },
    trialEmptyText: { color: '#cbd5e1' },

    // % column
    pctCell: { width: 42, alignItems: 'center' },
    pctText: { fontSize: 11, fontWeight: '800', fontFamily: FONTS.bold },
    pctGreen: { color: '#15803d' },
    pctAmber: { color: '#d97706' },
    pctRed: { color: '#dc2626' },
    pctDash: { fontSize: 14, color: '#e2e8f0' },

    // Add Step
    addStepBar: { paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
    addStepBtn: {
        borderWidth: 1.5, borderColor: INDIGO_BORDER, borderStyle: 'dashed',
        borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14, alignSelf: 'flex-start',
    },
    addStepBtnText: { fontSize: 13, fontWeight: '700', color: INDIGO, fontFamily: FONTS.bold },
    addStepRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    addStepInput: {
        flex: 1, borderWidth: 1.5, borderColor: INDIGO_BORDER, borderRadius: 8,
        paddingHorizontal: 12, paddingVertical: 8, fontSize: 13,
        backgroundColor: '#fff', color: '#1e293b', fontFamily: FONTS.regular,
    },
    addStepConfirm: { backgroundColor: INDIGO, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
    addStepConfirmText: { fontSize: 13, fontWeight: '700', color: 'white', fontFamily: FONTS.bold },
    addStepCancel: {
        backgroundColor: '#f8fafc', borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0',
        paddingHorizontal: 10, paddingVertical: 8,
    },
    addStepCancelText: { fontSize: 13, color: '#64748b', fontFamily: FONTS.regular },

    // Entry footer
    entryFooter: { paddingVertical: 12, paddingHorizontal: 14, borderTopWidth: 1, borderTopColor: '#f1f5f9', alignItems: 'center' },
    entryFooterText: { fontSize: 12, color: '#94a3b8', fontFamily: FONTS.regular },

    // Past sessions accordion
    accordionItem: { borderTopWidth: 1, borderTopColor: '#f1f5f9' },
    accordionHeader: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingVertical: 13, paddingHorizontal: 14,
    },
    accordionLeft: { flex: 1 },
    accordionDay: { fontSize: 14, fontWeight: '800', color: '#1e293b', fontFamily: FONTS.bold },
    accordionMeta: { fontSize: 11, color: '#94a3b8', marginTop: 2, fontFamily: FONTS.regular },
    accordionRight: { flexDirection: 'row', alignItems: 'center' },
    statPass: { fontSize: 12, fontWeight: '700', color: '#15803d', fontFamily: FONTS.bold },
    statFail: { fontSize: 12, fontWeight: '700', color: '#dc2626', fontFamily: FONTS.bold },
    statPct: { fontSize: 12, fontWeight: '700', color: INDIGO, fontFamily: FONTS.bold },
    statNone: { fontSize: 12, color: '#cbd5e1', fontFamily: FONTS.regular },

    // Expanded body
    accordionBody: { backgroundColor: '#fafbff', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingBottom: 6 },
    dayTableHeader: {
        flexDirection: 'row', backgroundColor: INDIGO_LIGHT,
        paddingVertical: 6, paddingHorizontal: 14,
        borderBottomWidth: 1, borderBottomColor: INDIGO_BORDER,
        alignItems: 'center',
    },
    dayHeaderCell: { fontSize: 9, fontWeight: '700', color: '#4338ca', textTransform: 'uppercase', letterSpacing: 0.4, fontFamily: FONTS.bold },
    dayRow: {
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: 7, paddingHorizontal: 14,
        borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
    },
    dayRowAlt: { backgroundColor: '#f0f4ff' },
    dayRowNum: { width: 22, fontSize: 10, color: '#94a3b8', fontFamily: FONTS.regular },
    dayRowStep: { flex: 1, fontSize: 12, color: '#334155', fontFamily: FONTS.regular },
    dayTrialCell: { width: 30, alignItems: 'center' },
    dayTrialPass: { fontSize: 13, fontWeight: '800', color: '#15803d' },
    dayTrialFail: { fontSize: 13, fontWeight: '800', color: '#dc2626' },
    dayTrialEmpty: { fontSize: 14, color: '#e2e8f0' },
    dayPctCell: { width: 38, alignItems: 'center' },
    dayPctText: { fontSize: 11, fontWeight: '700', fontFamily: FONTS.bold },

    editDayBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        alignSelf: 'flex-end', margin: 12,
        backgroundColor: INDIGO_LIGHT, borderRadius: 8,
        paddingHorizontal: 12, paddingVertical: 7,
        borderWidth: 1, borderColor: INDIGO_BORDER,
    },
    editDayBtnText: { fontSize: 12, fontWeight: '700', color: INDIGO, fontFamily: FONTS.bold },
});
