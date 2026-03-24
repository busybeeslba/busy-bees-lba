import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Alert, ActivityIndicator, TextInput, LayoutAnimation, UIManager, Platform,
    Modal, KeyboardAvoidingView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { useAppStore } from '../../store/useAppStore';
import { COLORS, FONTS } from '../../constants/theme';
import { ArrowLeft, Save, X, ChevronDown, ChevronUp, Pencil } from 'lucide-react-native';
import { dbGet, dbPost, dbPatch } from '../../lib/db';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

type CellResult = string | null; // e.g. "4/5", "NA", null

interface Session {
    day: number;
    date: string;
    employeeName: string;
    employeeId: string;
    results: Record<string, CellResult>;
}
interface StepRow { step: string; }
interface DailyRoutineSheet {
    id?: string | number;
    clientId: string;
    clientName: string;
    program: string;
    rows: StepRow[];
    sessions: Session[];
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

function initResults(rows: StepRow[]): Record<string, CellResult> {
    const r: Record<string, CellResult> = {};
    rows.forEach((_, i) => { r[String(i)] = null; });
    return r;
}

export const DailyRoutinesScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { sheetId, clientId, sessionId, isNew } = route.params || {};
    const { activeSession, user, clients } = useAppStore();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [sheet, setSheet] = useState<DailyRoutineSheet | null>(null);
    const [newResults, setNewResults] = useState<Record<string, CellResult>>({});

    const [editingSessionIdx, setEditingSessionIdx] = useState<number | null>(null);
    const [editDraft, setEditDraft] = useState<Record<string, CellResult>>({});

    const [expandedDay, setExpandedDay] = useState<number | null>(null);

    const [showAddStep, setShowAddStep] = useState(false);
    const [newStepText, setNewStepText] = useState('');

    // Custom Modal State for Cell Input
    const [activeCellIdx, setActiveCellIdx] = useState<number | null>(null);
    const [modalCorrect, setModalCorrect] = useState('');
    const [modalTotal, setModalTotal] = useState('');

    const numericClientId = activeSession?.clientId?.replace('CLI-', '');
    const clientRecord: any =
        clients.find((c: any) => String(c.id) === numericClientId) ||
        clients.find((c: any) =>
            (c.kidsName || c.name || '').toLowerCase() ===
            (activeSession?.clientName || '').toLowerCase()
        );

    // Parse specific "Daily routine" category, or let them pick whatever is available
    const availablePrograms: string[] = (() => {
        let cats: any[] = [];
        if (typeof clientRecord?.programCategories === 'string') {
            try { cats = JSON.parse(clientRecord.programCategories); } catch { cats = []; }
        } else if (Array.isArray(clientRecord?.programCategories)) {
            cats = clientRecord.programCategories;
        }
        return cats.map((c: any) => c.name).filter(Boolean);
    })();

    const preselectedProg = availablePrograms.find(p => p.toLowerCase().includes('daily routine'))
        || route.params?.program || availablePrograms[0] || '';

    const [selectedProgram, setSelectedProgram] = useState<string>(preselectedProg);

    useEffect(() => {
        if (!selectedProgram || !clientRecord) { setLoading(false); return; }
        setLoading(true);
        setEditingSessionIdx(null);
        setExpandedDay(null);
        const currentClientId = activeSession?.clientId || `CLI-${clientRecord.id}`;
        const fetchFromDB = async () => {
            try {
                const allSheets = await dbGet<any[]>('/daily_routines');
                const found = (Array.isArray(allSheets) ? allSheets : []).find(s =>
                    (s.clientId === currentClientId || s.clientName === (clientRecord.kidsName || clientRecord.name)) &&
                    s.program === selectedProgram
                );
                if (found) {
                    setSheet(found);
                    setNewResults(initResults(found.rows || []));
                } else {
                    let cats: any[] = [];
                    if (typeof clientRecord.programCategories === 'string') {
                        try { cats = JSON.parse(clientRecord.programCategories); } catch { cats = []; }
                    } else if (Array.isArray(clientRecord.programCategories)) {
                        cats = clientRecord.programCategories;
                    }
                    const cat = cats.find((c: any) => c.name === selectedProgram);
                    const rows: StepRow[] = cat?.targets?.map((t: any) => ({ step: t.name })) || [];
                    setSheet({ clientId: currentClientId, clientName: activeSession?.clientName || clientRecord.kidsName || clientRecord.name || '', program: selectedProgram, rows, sessions: [] });
                    setNewResults(initResults(rows));
                }
            } catch (error) {
                console.error("Failed to fetch daily routines:", error);
                Alert.alert('Error', 'Could not load daily routines.');
            } finally {
                setLoading(false);
            }
        };
        fetchFromDB();
    }, [selectedProgram, clientRecord]);

    const handleOpenCellOptions = (rowIdx: number) => {
        setActiveCellIdx(rowIdx);
        const currentVal = (editingSessionIdx !== null ? editDraft : newResults)[String(rowIdx)];
        if (currentVal && currentVal !== 'NA') {
            const [c, t] = currentVal.split('/');
            setModalCorrect(c || '');
            setModalTotal(t || '');
        } else {
            setModalCorrect('');
            setModalTotal('');
        }
    };

    const handleApplyCellVal = (val: string | null) => {
        if (activeCellIdx === null) return;
        const row = String(activeCellIdx);
        if (editingSessionIdx !== null) {
            setEditDraft(prev => ({ ...prev, [row]: val }));
        } else {
            setNewResults(prev => ({ ...prev, [row]: val }));
        }
        setActiveCellIdx(null);
    };

    const handleApplyModalNumbers = () => {
        if (modalCorrect && modalTotal) {
            handleApplyCellVal(`${modalCorrect}/${modalTotal}`);
        } else {
            handleApplyCellVal(null);
        }
    };

    const startEdit = (sessIdx: number) => {
        if (!sheet) return;
        setEditingSessionIdx(sessIdx);
        setEditDraft({ ...sheet.sessions[sessIdx].results });
        setExpandedDay(null);
    };

    const cancelEdit = () => { setEditingSessionIdx(null); setEditDraft({}); };

    const saveEdit = async () => {
        if (!sheet || editingSessionIdx === null) return;
        setSaving(true);
        try {
            const updatedSessions = sheet.sessions.map((s, i) =>
                i === editingSessionIdx ? { ...s, results: editDraft } : s
            );
            const updatedSheet = { ...sheet, sessions: updatedSessions };
            await dbPatch(`/daily_routines/${sheet.id}`, updatedSheet);
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
            const newSession: Session = {
                day: (sheet.sessions?.length || 0) + 1,
                date: todayStr(), employeeName: user?.name || '', employeeId: user?.employeeId || '', results: newResults,
            };
            const updatedSheet = { ...sheet, sessions: [...(sheet.sessions || []), newSession] };
            if (sheet.id) {
                await dbPatch(`/daily_routines/${sheet.id}`, updatedSheet);
            } else {
                await dbPost('/daily_routines', { ...updatedSheet, createdAt: new Date().toISOString() });
            }
            Alert.alert('Saved!', `Day ${newSession.day} recorded.`, [{ text: 'OK', onPress: () => navigation.goBack() }]);
        } catch {
            Alert.alert('Error', 'Could not save — check your connection to the database.');
        } finally {
            setSaving(false);
        }
    };

    const handleAddStep = () => {
        const name = newStepText.trim();
        if (!name || !sheet) return;
        const newIdx = (sheet.rows?.length || 0);
        setSheet(prev => prev ? { ...prev, rows: [...(prev.rows || []), { step: name }] } : prev);
        setNewResults(prev => ({ ...prev, [String(newIdx)]: null }));
        setNewStepText('');
        setShowAddStep(false);
    };

    const toggleDayExpand = (dayNum: number) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpandedDay(prev => prev === dayNum ? null : dayNum);
    };

    const allSessions = sheet?.sessions || [];
    const rows = sheet?.rows || [];
    const nextDay = allSessions.length + 1;
    const isEditMode = editingSessionIdx !== null;
    const editingSess = isEditMode ? allSessions[editingSessionIdx!] : null;

    const activeResults = isEditMode ? editDraft : newResults;

    return (
        <View style={s.container}>
            {/* ── Header ── */}
            <View style={[s.header, isEditMode && s.headerEditMode]}>
                <TouchableOpacity style={s.backBtn} onPress={isEditMode ? cancelEdit : () => navigation.goBack()}>
                    {isEditMode ? <X size={18} color="#92400e" /> : <ArrowLeft size={18} color={COLORS.textDark} />}
                </TouchableOpacity>
                <View style={s.headerTitle}>
                    <Text style={[s.title, isEditMode && s.titleEditMode]}>
                        {isEditMode ? `Correcting Day ${editingSess?.day}` : 'Daily Routines'}
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
                    {saving ? <ActivityIndicator color="#000" size="small" /> : (
                        <><Save size={15} color="#000" />
                            <Text style={s.saveBtnText}>{isEditMode ? 'Save Edit' : `Save Day ${nextDay}`}</Text></>
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
                <View style={s.center}><ActivityIndicator color={COLORS.primary} size="large" /></View>
            ) : !sheet || rows.length === 0 ? (
                <View style={s.center}>
                    <Text style={s.emptyText}>
                        {availablePrograms.length === 0 ? 'No programs found for this client.' : 'Select a program above to load the sheet.'}
                    </Text>
                </View>
            ) : (
                <ScrollView style={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
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
                        </View>

                        <View style={s.tableHeader}>
                            <Text style={[s.headerCell, { flex: 1 }]}>Routine / Step</Text>
                            <Text style={[s.headerCell, { width: 80, textAlign: 'center' }]}>Score / NA</Text>
                        </View>

                        {rows.map((row, rowIdx) => {
                            const val = activeResults[String(rowIdx)] ?? null;
                            return (
                                <View key={rowIdx} style={[s.row, rowIdx % 2 === 1 && s.rowAlt]}>
                                    <Text style={s.rowNum}>{rowIdx + 1}</Text>
                                    <Text style={s.stepText}>{row.step}</Text>
                                    <TouchableOpacity
                                        style={[s.resultBtn, val && s.resultBtnFilled, isEditMode && s.resultBtnEditMode]}
                                        onPress={() => handleOpenCellOptions(rowIdx)}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={[s.resultBtnText, !val && s.resultBtnTextEmpty]}>{val || 'Tap'}</Text>
                                    </TouchableOpacity>
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
                                            placeholder="New routine/step…"
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
                                        <Text style={s.addStepBtnText}>+ Add Routine</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}
                        <View style={s.entryFooter}>
                            <Text style={s.entryFooterText}>
                                Enter Correct Response (+) over number of opportunities (X), or NA
                            </Text>
                        </View>
                    </View>

                    {/* Past Sessions */}
                    {allSessions.length > 0 && !isEditMode && (
                        <View style={s.sectionCard}>
                            <Text style={s.sectionTitle}>Past Sessions</Text>
                            {allSessions.map((sess, sessIdx) => {
                                const isExpanded = expandedDay === sess.day;
                                const filledCount = Object.values(sess.results || {}).filter(Boolean).length;
                                return (
                                    <View key={sess.day} style={s.accordionItem}>
                                        <TouchableOpacity style={s.accordionHeader} onPress={() => toggleDayExpand(sess.day)} activeOpacity={0.75}>
                                            <View style={s.accordionLeft}>
                                                <Text style={s.accordionDay}>Day {sess.day}</Text>
                                                <Text style={s.accordionMeta}>{fmtDate(sess.date)} · {sess.employeeName || '—'}</Text>
                                            </View>
                                            <View style={s.accordionRight}>
                                                <Text style={s.statText}>Filled: {filledCount}/{rows.length}</Text>
                                                {isExpanded
                                                    ? <ChevronUp size={16} color="#94a3b8" style={{ marginLeft: 6 }} />
                                                    : <ChevronDown size={16} color="#94a3b8" style={{ marginLeft: 6 }} />}
                                            </View>
                                        </TouchableOpacity>

                                        {isExpanded && (
                                            <View style={s.accordionBody}>
                                                {rows.map((row, ri) => {
                                                    const v = sess.results[String(ri)];
                                                    return (
                                                        <View key={ri} style={[s.dayRow, ri % 2 === 1 && s.dayRowAlt]}>
                                                            <Text style={s.dayRowNum}>{ri + 1}</Text>
                                                            <Text style={s.dayRowStep}>{row.step}</Text>
                                                            <View style={s.dayRowResult}>
                                                                <Text style={s.dayRowResultText}>{v || '—'}</Text>
                                                            </View>
                                                        </View>
                                                    );
                                                })}
                                                <TouchableOpacity style={s.editDayBtn} onPress={() => startEdit(sessIdx)}>
                                                    <Pencil size={12} color="#d97706" />
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

            {/* Fractional Value Modal */}
            <Modal
                transparent
                visible={activeCellIdx !== null}
                animationType="fade"
                onRequestClose={() => setActiveCellIdx(null)}
            >
                <KeyboardAvoidingView style={s.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    <View style={s.modalCard}>
                        <View style={s.modalHeader}>
                            <Text style={s.modalTitle}>Enter Score</Text>
                            <TouchableOpacity onPress={() => setActiveCellIdx(null)}><X size={20} color="#64748b" /></TouchableOpacity>
                        </View>
                        <Text style={s.modalSubtitle}>{activeCellIdx !== null ? sheet?.rows[activeCellIdx]?.step : ''}</Text>
                        
                        <View style={s.fractionInputRow}>
                            <View style={s.fractionCol}>
                                <Text style={s.fractionLabel}>Correct (+)</Text>
                                <TextInput
                                    style={s.fractionInput}
                                    keyboardType="number-pad"
                                    placeholder="0"
                                    value={modalCorrect}
                                    onChangeText={setModalCorrect}
                                    autoFocus
                                />
                            </View>
                            <Text style={s.fractionSlash}>/</Text>
                            <View style={s.fractionCol}>
                                <Text style={s.fractionLabel}>Opportunities (X)</Text>
                                <TextInput
                                    style={s.fractionInput}
                                    keyboardType="number-pad"
                                    placeholder="0"
                                    value={modalTotal}
                                    onChangeText={setModalTotal}
                                />
                            </View>
                        </View>

                        <View style={s.modalBtnRow}>
                            <TouchableOpacity style={s.modalBtnAction} onPress={() => handleApplyModalNumbers()}>
                                <Text style={s.modalBtnActionText}>Apply Score</Text>
                            </TouchableOpacity>
                        </View>
                        
                        <View style={s.modalDivider} />
                        
                        <View style={s.modalBtnRowSecondary}>
                            <TouchableOpacity style={s.modalBtnNA} onPress={() => handleApplyCellVal('NA')}>
                                <Text style={s.modalBtnNAText}>Mark as N/A</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={s.modalBtnClear} onPress={() => handleApplyCellVal(null)}>
                                <Text style={s.modalBtnClearText}>Clear Cell</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
};

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f0f2f5' },
    header: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ec4899', paddingTop: 52, paddingBottom: 14, paddingHorizontal: 16, gap: 12 },
    headerEditMode: { backgroundColor: '#fffde7', borderBottomWidth: 2, borderBottomColor: '#ec4899' },
    backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.1)', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { flex: 1 },
    title: { fontSize: 17, fontWeight: '800', color: '#fff', fontFamily: FONTS.bold },
    titleEditMode: { color: '#9d174d' },
    subtitle: { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontFamily: FONTS.regular, marginTop: 1 },
    subtitleEditMode: { color: '#be185d' },
    saveBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 9, paddingHorizontal: 14, paddingVertical: 8 },
    saveBtnEdit: { backgroundColor: '#ec4899' },
    saveBtnText: { fontSize: 13, fontWeight: '700', color: '#fff', fontFamily: FONTS.bold },

    programSelector: { backgroundColor: 'white', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    sectionLabel: { fontSize: 10, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, fontFamily: FONTS.bold },
    programChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 100, backgroundColor: '#f1f5f9', marginRight: 8, borderWidth: 1.5, borderColor: 'transparent' },
    programChipActive: { backgroundColor: '#fdf2f8', borderColor: '#ec4899' },
    programChipText: { fontSize: 13, fontWeight: '600', color: '#64748b', fontFamily: FONTS.regular },
    programChipTextActive: { color: '#9d174d', fontFamily: FONTS.bold },

    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
    emptyText: { fontSize: 14, color: '#94a3b8', textAlign: 'center', fontFamily: FONTS.regular, lineHeight: 22 },
    scroll: { flex: 1 },

    sectionCard: { backgroundColor: 'white', marginHorizontal: 12, marginTop: 12, borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
    sectionTitle: { fontSize: 11, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: FONTS.bold, paddingHorizontal: 14, paddingTop: 14, paddingBottom: 8 },

    sessionBanner: { paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#fdf2f8', borderBottomWidth: 1, borderBottomColor: '#fbcfe8', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    sessionBannerEdit: { backgroundColor: '#fffde7', borderBottomColor: '#ffe082' },
    sessionBannerTitle: { fontSize: 14, fontWeight: '800', color: '#be185d', fontFamily: FONTS.bold },
    sessionBannerTitleEdit: { color: '#d97706' },
    sessionBannerEmp: { fontSize: 11, color: '#ec4899', marginTop: 2, fontFamily: FONTS.regular },
    sessionBannerEmpEdit: { color: '#d97706' },

    tableHeader: { flexDirection: 'row', backgroundColor: '#fdf2f8', borderBottomWidth: 1.5, borderBottomColor: '#fbcfe8', paddingVertical: 8, paddingHorizontal: 12 },
    headerCell: { fontSize: 9, fontWeight: '700', color: '#9d174d', textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: FONTS.bold },

    row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', backgroundColor: 'white' },
    rowAlt: { backgroundColor: '#fafbff' },
    rowNum: { width: 22, fontSize: 10, color: '#94a3b8', fontWeight: '600', fontFamily: FONTS.regular },
    stepText: { flex: 1, fontSize: 13, fontWeight: '600', color: '#1e293b', fontFamily: FONTS.bold, flexShrink: 1 },
    resultBtn: { width: 72, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', borderWidth: 1.5, borderColor: '#e2e8f0', borderStyle: 'dashed' },
    resultBtnFilled: { backgroundColor: '#fdf2f8', borderColor: '#fbcfe8', borderStyle: 'solid' },
    resultBtnEditMode: { borderWidth: 2, borderStyle: 'solid' },
    resultBtnText: { fontSize: 16, fontWeight: '800', color: '#be185d', fontFamily: FONTS.bold },
    resultBtnTextEmpty: { fontSize: 13, fontWeight: '600', color: '#cbd5e1' },

    addStepBar: { paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
    addStepBtn: { borderWidth: 1.5, borderColor: '#fbcfe8', borderStyle: 'dashed', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14, alignSelf: 'flex-start' },
    addStepBtnText: { fontSize: 13, fontWeight: '700', color: '#ec4899', fontFamily: FONTS.bold },
    addStepRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    addStepInput: { flex: 1, borderWidth: 1.5, borderColor: '#fbcfe8', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, backgroundColor: '#fff', color: '#1e293b', fontFamily: FONTS.regular },
    addStepConfirm: { backgroundColor: '#ec4899', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
    addStepConfirmText: { fontSize: 13, fontWeight: '700', color: 'white', fontFamily: FONTS.bold },
    addStepCancel: { backgroundColor: '#f8fafc', borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 10, paddingVertical: 8 },
    addStepCancelText: { fontSize: 13, color: '#64748b', fontFamily: FONTS.regular },

    entryFooter: { paddingVertical: 12, paddingHorizontal: 14, borderTopWidth: 1, borderTopColor: '#f1f5f9', alignItems: 'center' },
    entryFooterText: { fontSize: 11, color: '#94a3b8', fontFamily: FONTS.regular, textAlign: 'center' },

    accordionItem: { borderTopWidth: 1, borderTopColor: '#f1f5f9' },
    accordionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, paddingHorizontal: 14 },
    accordionLeft: { flex: 1 },
    accordionDay: { fontSize: 14, fontWeight: '800', color: '#1e293b', fontFamily: FONTS.bold },
    accordionMeta: { fontSize: 11, color: '#94a3b8', marginTop: 2, fontFamily: FONTS.regular },
    accordionRight: { flexDirection: 'row', alignItems: 'center' },
    statText: { fontSize: 12, fontWeight: '700', color: '#64748b', fontFamily: FONTS.bold },

    accordionBody: { backgroundColor: '#fafbff', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingBottom: 6 },
    dayRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    dayRowAlt: { backgroundColor: '#f0f4ff' },
    dayRowNum: { width: 22, fontSize: 10, color: '#94a3b8', fontFamily: FONTS.regular },
    dayRowStep: { flex: 1, fontSize: 13, color: '#334155', fontFamily: FONTS.regular },
    dayRowResult: { width: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: '#e2e8f0', borderRadius: 6, paddingVertical: 4 },
    dayRowResultText: { fontSize: 12, fontWeight: '800', color: '#334155' },
    editDayBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-end', margin: 12, backgroundColor: '#fffde7', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: '#ffe082' },
    editDayBtnText: { fontSize: 12, fontWeight: '700', color: '#d97706', fontFamily: FONTS.bold },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 20 },
    modalCard: { backgroundColor: 'white', borderRadius: 20, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    modalTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b', fontFamily: FONTS.bold },
    modalSubtitle: { fontSize: 14, color: '#64748b', fontFamily: FONTS.regular, marginBottom: 20 },
    fractionInputRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 20 },
    fractionCol: { flex: 1, alignItems: 'center' },
    fractionLabel: { fontSize: 12, color: '#94a3b8', fontWeight: '600', marginBottom: 8 },
    fractionInput: { width: '100%', backgroundColor: '#f8fafc', borderWidth: 2, borderColor: '#e2e8f0', borderRadius: 12, fontSize: 24, fontWeight: '800', color: '#ec4899', textAlign: 'center', paddingVertical: 12 },
    fractionSlash: { fontSize: 36, fontWeight: '200', color: '#cbd5e1', paddingTop: 18 },
    modalBtnRow: { flexDirection: 'row', gap: 12 },
    modalBtnAction: { flex: 1, backgroundColor: '#ec4899', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
    modalBtnActionText: { color: 'white', fontSize: 15, fontWeight: 'bold' },
    modalDivider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 20 },
    modalBtnRowSecondary: { flexDirection: 'row', gap: 12 },
    modalBtnNA: { flex: 1, backgroundColor: '#f1f5f9', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
    modalBtnNAText: { color: '#64748b', fontSize: 14, fontWeight: 'bold' },
    modalBtnClear: { flex: 1, backgroundColor: '#fef2f2', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
    modalBtnClearText: { color: '#dc2626', fontSize: 14, fontWeight: 'bold' },
});
