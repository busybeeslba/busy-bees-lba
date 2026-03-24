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
import { ArrowLeft, Save, CheckCircle, XCircle, Pencil, X, ChevronDown, ChevronUp } from 'lucide-react-native';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

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

const todayStr = () => new Date().toISOString().slice(0, 10);

const fmtDate = (d: string) => {
    try {
        const safe = /^\d{4}-\d{2}-\d{2}$/.test(d) ? d + 'T12:00:00' : d;
        const dt = new Date(safe);
        return `${dt.toLocaleString('default', { month: 'short' })} ${dt.getDate()}`;
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

    const results: Record<string, CellResult> = {};
    oldRows.forEach((r: any, i: number) => {
        const pick = (cell: any): CellResult => (!cell ? null : cell.result === 'pass' ? 'pass' : cell.result === 'fail' ? 'fail' : null);
        const vals = [pick(r.introduced), pick(r.mastered), pick(r.generalized)];
        results[String(i)] = vals.includes('fail') ? 'fail' : vals.includes('pass') ? 'pass' : null;
    });

    return {
        id: data.id, clientId: data.clientId || '', clientName: data.clientName || '',
        program: data.program || '', rows,
        sessions: [{ day: 1, date: data.createdAt?.slice(0, 10) || todayStr(), employeeName: data.employeeName || '', employeeId: data.employeeId || '', results }],
        createdAt: data.createdAt,
    };
}

export const BaselineSheetScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { sheetId, clientId, sessionId, isNew, program: routeProgram } = route.params || {};
    const { activeSession, user, clients } = useAppStore();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [sheet, setSheet] = useState<MasterySheet | null>(null);
    const [newResults, setNewResults] = useState<Record<string, CellResult>>({});

    // Edit mode
    const [editingSessionIdx, setEditingSessionIdx] = useState<number | null>(null);
    const [editDraft, setEditDraft] = useState<Record<string, CellResult>>({});

    // Accordion: which past day is expanded
    const [expandedDay, setExpandedDay] = useState<number | null>(null);

    // Add step
    const [showAddStep, setShowAddStep] = useState(false);
    const [newStepText, setNewStepText] = useState('');

    const numericClientId = activeSession?.clientId?.replace('CLI-', '');
    const clientRecord: any =
        clients.find((c: any) => String(c.id) === numericClientId) ||
        clients.find((c: any) =>
            (c.kidsName || c.name || '').toLowerCase() ===
            (activeSession?.clientName || '').toLowerCase()
        );

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
        routeProgram || availablePrograms[0] || ''
    );

    // If routeProgram arrives after programs are loaded, sync it once
    useEffect(() => {
        if (routeProgram && availablePrograms.includes(routeProgram)) {
            setSelectedProgram(routeProgram);
        }
    }, [routeProgram, availablePrograms.join(',')]);

    useEffect(() => {
        if (!selectedProgram || !clientRecord) { setLoading(false); return; }
        setLoading(true);
        setEditingSessionIdx(null);
        setExpandedDay(null);
        const clientId = activeSession?.clientId || `CLI-${clientRecord.id}`;
        const fetchFromDB = () => {
            dbGet<any[]>('/program_mastery')
                .then((all: any[]) => {
                    const found = (Array.isArray(all) ? all : []).find(s =>
                        (s.clientId === clientId || s.clientName === (clientRecord.kidsName || clientRecord.name)) &&
                        s.program === selectedProgram
                    );
                    if (found) {
                        const migrated = migrateSheet(found);
                        setSheet(migrated);
                        setNewResults(initResults(migrated.rows));
                    } else {
                        let cats: any[] = [];
                        if (typeof clientRecord.programCategories === 'string') {
                            try { cats = JSON.parse(clientRecord.programCategories); } catch { cats = []; }
                        } else if (Array.isArray(clientRecord.programCategories)) {
                            cats = clientRecord.programCategories;
                        }
                        const cat = cats.find((c: any) => c.name === selectedProgram);
                        const rows: StepRow[] = cat?.targets?.map((t: any) => ({ step: t.name })) || [];
                        setSheet({ clientId, clientName: activeSession?.clientName || clientRecord.kidsName || clientRecord.name || '', program: selectedProgram, rows, sessions: [] });
                        setNewResults(initResults(rows));
                    }
                })
                .catch(() => { })
                .finally(() => setLoading(false));
        };
        fetchFromDB();
    }, [selectedProgram, clientRecord]);

    const toggleNewCell = (rowIdx: number) => {
        setNewResults(prev => ({ ...prev, [String(rowIdx)]: cycleResult(prev[String(rowIdx)] ?? null) }));
    };

    const startEdit = (sessIdx: number) => {
        if (!sheet) return;
        setEditingSessionIdx(sessIdx);
        setEditDraft({ ...sheet.sessions[sessIdx].results });
        setExpandedDay(null);
    };

    const cancelEdit = () => { setEditingSessionIdx(null); setEditDraft({}); };

    const toggleEditCell = (rowIdx: number) => {
        setEditDraft(prev => ({ ...prev, [String(rowIdx)]: cycleResult(prev[String(rowIdx)] ?? null) }));
    };

    const saveEdit = async () => {
        if (!sheet || editingSessionIdx === null) return;
        setSaving(true);
        try {
            const updatedSessions = sheet.sessions.map((s, i) =>
                i === editingSessionIdx ? { ...s, results: editDraft } : s
            );
            const updatedSheet = { ...sheet, sessions: updatedSessions };
            await dbPatch(`/program_mastery/${sheet.id}`, updatedSheet);
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
                await dbPatch(`/program_mastery/${sheet.id}`, updatedSheet);
            } else {
                await dbPost('/program_mastery', { ...updatedSheet, createdAt: new Date().toISOString() });
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

    // Current results depending on mode
    const activeResults = isEditMode ? editDraft : newResults;
    const toggleActiveCell = isEditMode ? toggleEditCell : toggleNewCell;

    return (
        <View style={s.container}>
            {/* ── Header ── */}
            <View style={[s.header, isEditMode && s.headerEditMode]}>
                <TouchableOpacity style={s.backBtn} onPress={isEditMode ? cancelEdit : () => navigation.goBack()}>
                    {isEditMode ? <X size={18} color="#92400e" /> : <ArrowLeft size={18} color={COLORS.textDark} />}
                </TouchableOpacity>
                <View style={s.headerTitle}>
                    <Text style={[s.title, isEditMode && s.titleEditMode]}>
                        {isEditMode ? `Correcting Day ${editingSess?.day}` : 'Baseline Sheet'}
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

                    {/* ── Section 1: Entry Form ── */}
                    <View style={s.sectionCard}>
                        {/* Session label */}
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

                        {/* Table header */}
                        <View style={s.tableHeader}>
                            <Text style={[s.headerCell, { flex: 1 }]}>#</Text>
                            <Text style={[s.headerCell, { flex: 4 }]}>STO</Text>
                            <Text style={[s.headerCell, { width: 72, textAlign: 'center' }]}>Result</Text>
                        </View>

                        {/* STO rows */}
                        {rows.map((row, rowIdx) => {
                            const val = activeResults[String(rowIdx)] ?? null;
                            return (
                                <View key={rowIdx} style={[s.row, rowIdx % 2 === 1 && s.rowAlt]}>
                                    <Text style={s.rowNum}>{rowIdx + 1}</Text>
                                    <Text style={s.stepText}>{row.step}</Text>
                                    <TouchableOpacity
                                        style={[s.resultBtn,
                                        val === 'pass' ? s.resultBtnPass :
                                            val === 'fail' ? s.resultBtnFail :
                                                s.resultBtnEmpty,
                                        isEditMode && s.resultBtnEditMode,
                                        ]}
                                        onPress={() => toggleActiveCell(rowIdx)}
                                        activeOpacity={0.7}
                                    >
                                        {val === 'pass' && <CheckCircle size={20} color="#15803d" />}
                                        {val === 'fail' && <XCircle size={20} color="#dc2626" />}
                                        {!val && <Text style={s.dashText}>—</Text>}
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
                                            placeholder="New step name…"
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
                                        <Text style={s.addStepBtnText}>+ Add Step</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}

                        {/* Footer summary */}
                        <View style={s.entryFooter}>
                            {(() => {
                                const fp = rows.filter((_, i) => activeResults[String(i)] === 'pass').length;
                                const ff = rows.filter((_, i) => activeResults[String(i)] === 'fail').length;
                                const ft = fp + ff;
                                const fpct = ft > 0 ? Math.round(fp / ft * 100) : null;
                                return (
                                    <Text style={s.entryFooterText}>
                                        {rows.length} steps · {' '}
                                        <Text style={{ color: '#15803d', fontWeight: '700' }}>{fp} pass</Text>
                                        {' · '}
                                        <Text style={{ color: '#dc2626', fontWeight: '700' }}>{ff} fail</Text>
                                        {fpct !== null ? <Text style={{ color: '#6366f1', fontWeight: '700' }}> · {fpct}%</Text> : null}
                                    </Text>
                                );
                            })()}
                        </View>
                    </View>

                    {/* ── Section 2: Past Days Accordion ── */}
                    {allSessions.length > 0 && !isEditMode && (
                        <View style={s.sectionCard}>
                            <Text style={s.sectionTitle}>Past Sessions</Text>
                            {allSessions.map((sess, sessIdx) => {
                                const passCount = rows.filter((_, i) => sess.results[String(i)] === 'pass').length;
                                const failCount = rows.filter((_, i) => sess.results[String(i)] === 'fail').length;
                                const total = passCount + failCount;
                                const pct = total > 0 ? Math.round(passCount / total * 100) : null;
                                const isExpanded = expandedDay === sess.day;
                                return (
                                    <View key={sess.day} style={s.accordionItem}>
                                        {/* ── Collapsed row ── */}
                                        <TouchableOpacity style={s.accordionHeader} onPress={() => toggleDayExpand(sess.day)} activeOpacity={0.75}>
                                            <View style={s.accordionLeft}>
                                                <Text style={s.accordionDay}>Day {sess.day}</Text>
                                                <Text style={s.accordionMeta}>{fmtDate(sess.date)} · {sess.employeeName || '—'}</Text>
                                            </View>
                                            <View style={s.accordionRight}>
                                                {passCount > 0 && <Text style={s.statPass}>✓{passCount}</Text>}
                                                {failCount > 0 && <Text style={s.statFail}> ✗{failCount}</Text>}
                                                {pct !== null && <Text style={s.statPct}> {pct}%</Text>}
                                                {total === 0 && <Text style={s.statNone}>—</Text>}
                                                {isExpanded
                                                    ? <ChevronUp size={16} color="#94a3b8" style={{ marginLeft: 6 }} />
                                                    : <ChevronDown size={16} color="#94a3b8" style={{ marginLeft: 6 }} />}
                                            </View>
                                        </TouchableOpacity>

                                        {/* ── Expanded view ── */}
                                        {isExpanded && (
                                            <View style={s.accordionBody}>
                                                {rows.map((row, ri) => {
                                                    const v = sess.results[String(ri)];
                                                    return (
                                                        <View key={ri} style={[s.dayRow, ri % 2 === 1 && s.dayRowAlt]}>
                                                            <Text style={s.dayRowNum}>{ri + 1}</Text>
                                                            <Text style={s.dayRowStep}>{row.step}</Text>
                                                            <View style={s.dayRowResult}>
                                                                {v === 'pass' && <CheckCircle size={16} color="#15803d" />}
                                                                {v === 'fail' && <XCircle size={16} color="#dc2626" />}
                                                                {!v && <Text style={s.dayRowNone}>—</Text>}
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
        </View>
    );
};

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f0f2f5' },

    // Header
    header: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#FFC107',
        paddingTop: 52, paddingBottom: 14, paddingHorizontal: 16, gap: 12,
    },
    headerEditMode: { backgroundColor: '#fffde7', borderBottomWidth: 2, borderBottomColor: '#FFC107' },
    backBtn: {
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: 'rgba(0,0,0,0.1)',
        alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: { flex: 1 },
    title: { fontSize: 17, fontWeight: '800', color: '#000', fontFamily: FONTS.bold },
    titleEditMode: { color: '#92400e' },
    subtitle: { fontSize: 12, color: 'rgba(0,0,0,0.6)', fontFamily: FONTS.regular, marginTop: 1 },
    subtitleEditMode: { color: '#d97706' },
    saveBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: 'rgba(0,0,0,0.12)', borderRadius: 9,
        paddingHorizontal: 14, paddingVertical: 8,
    },
    saveBtnEdit: { backgroundColor: '#FFC107' },
    saveBtnText: { fontSize: 13, fontWeight: '700', color: '#000', fontFamily: FONTS.bold },

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
    programChipActive: { backgroundColor: '#fffde7', borderColor: '#FFC107' },
    programChipText: { fontSize: 13, fontWeight: '600', color: '#64748b', fontFamily: FONTS.regular },
    programChipTextActive: { color: '#92400e', fontFamily: FONTS.bold },

    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
    emptyText: { fontSize: 14, color: '#94a3b8', textAlign: 'center', fontFamily: FONTS.regular, lineHeight: 22 },
    scroll: { flex: 1 },

    // Section cards
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
        backgroundColor: '#f0fdf4', borderBottomWidth: 1, borderBottomColor: '#bbf7d0',
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    sessionBannerEdit: { backgroundColor: '#fffde7', borderBottomColor: '#ffe082' },
    sessionBannerTitle: { fontSize: 14, fontWeight: '800', color: '#15803d', fontFamily: FONTS.bold },
    sessionBannerTitleEdit: { color: '#d97706' },
    sessionBannerEmp: { fontSize: 11, color: '#16a34a', marginTop: 2, fontFamily: FONTS.regular },
    sessionBannerEmpEdit: { color: '#d97706' },

    // Table header
    tableHeader: {
        flexDirection: 'row', backgroundColor: '#fffde7',
        borderBottomWidth: 1.5, borderBottomColor: '#ffe082',
        paddingVertical: 8, paddingHorizontal: 12,
    },
    headerCell: {
        fontSize: 9, fontWeight: '700', color: '#92400e',
        textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: FONTS.bold,
    },

    // STO rows
    row: {
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: 8, paddingHorizontal: 12,
        borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
        backgroundColor: 'white',
    },
    rowAlt: { backgroundColor: '#fafbff' },
    rowNum: { width: 22, fontSize: 10, color: '#94a3b8', fontWeight: '600', fontFamily: FONTS.regular },
    stepText: { flex: 1, fontSize: 13, fontWeight: '600', color: '#1e293b', fontFamily: FONTS.bold, flexShrink: 1 },
    resultBtn: {
        width: 72, height: 44, borderRadius: 10,
        alignItems: 'center', justifyContent: 'center',
    },
    resultBtnEditMode: { borderWidth: 2, borderStyle: 'solid' },
    resultBtnEmpty: { backgroundColor: '#f8fafc', borderWidth: 1.5, borderColor: '#e2e8f0', borderStyle: 'dashed' },
    resultBtnPass: { backgroundColor: '#f0fdf4', borderWidth: 1.5, borderColor: '#86efac' },
    resultBtnFail: { backgroundColor: '#fef2f2', borderWidth: 1.5, borderColor: '#fca5a5' },
    dashText: { fontSize: 18, color: '#cbd5e1', fontWeight: '300' },

    // Add Step
    addStepBar: {
        paddingHorizontal: 14, paddingVertical: 10,
        borderTopWidth: 1, borderTopColor: '#f1f5f9',
    },
    addStepBtn: {
        borderWidth: 1.5, borderColor: '#c7d2fe', borderStyle: 'dashed',
        borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14,
        alignSelf: 'flex-start',
    },
    addStepBtnText: { fontSize: 13, fontWeight: '700', color: '#6366f1', fontFamily: FONTS.bold },
    addStepRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    addStepInput: {
        flex: 1, borderWidth: 1.5, borderColor: '#c7d2fe', borderRadius: 8,
        paddingHorizontal: 12, paddingVertical: 8, fontSize: 13,
        backgroundColor: '#fff', color: '#1e293b', fontFamily: FONTS.regular,
    },
    addStepConfirm: { backgroundColor: '#6366f1', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
    addStepConfirmText: { fontSize: 13, fontWeight: '700', color: 'white', fontFamily: FONTS.bold },
    addStepCancel: {
        backgroundColor: '#f8fafc', borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0',
        paddingHorizontal: 10, paddingVertical: 8,
    },
    addStepCancelText: { fontSize: 13, color: '#64748b', fontFamily: FONTS.regular },

    // Entry footer
    entryFooter: {
        paddingVertical: 12, paddingHorizontal: 14,
        borderTopWidth: 1, borderTopColor: '#f1f5f9', alignItems: 'center',
    },
    entryFooterText: { fontSize: 12, color: '#94a3b8', fontFamily: FONTS.regular },

    // Past sessions accordion
    accordionItem: {
        borderTopWidth: 1, borderTopColor: '#f1f5f9',
    },
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
    statPct: { fontSize: 12, fontWeight: '700', color: '#6366f1', fontFamily: FONTS.bold },
    statNone: { fontSize: 12, color: '#cbd5e1', fontFamily: FONTS.regular },

    // Expanded body
    accordionBody: {
        backgroundColor: '#fafbff',
        borderTopWidth: 1, borderTopColor: '#f1f5f9',
        paddingBottom: 6,
    },
    dayRow: {
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: 8, paddingHorizontal: 14,
        borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
    },
    dayRowAlt: { backgroundColor: '#f0f4ff' },
    dayRowNum: { width: 22, fontSize: 10, color: '#94a3b8', fontFamily: FONTS.regular },
    dayRowStep: { flex: 1, fontSize: 13, color: '#334155', fontFamily: FONTS.regular },
    dayRowResult: { width: 32, alignItems: 'center' },
    dayRowNone: { fontSize: 14, color: '#cbd5e1' },
    editDayBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        alignSelf: 'flex-end', margin: 12,
        backgroundColor: '#fffde7', borderRadius: 8,
        paddingHorizontal: 12, paddingVertical: 7,
        borderWidth: 1, borderColor: '#ffe082',
    },
    editDayBtnText: { fontSize: 12, fontWeight: '700', color: '#d97706', fontFamily: FONTS.bold },
});
