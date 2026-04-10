import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Alert, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform, Modal
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { dbGet, dbPost, dbPatch } from '../../lib/db';
import { useAppStore } from '../../store/useAppStore';
import { COLORS, FONTS } from '../../constants/theme';
import { ArrowLeft, Save, X, Activity, Plus, Trash2, CheckCircle, XCircle } from 'lucide-react-native';

type PassFailNA = 'N/A' | 'Pass' | 'Fail' | '';
type YesNo = 'Yes' | 'No' | '';
type PromptType = 'I' | 'V' | 'G' | 'PP' | 'FP' | '';

interface TransactionLocation {
    id: string;
    name: string;
    transition: PassFailNA;
    delay: PassFailNA;
    delayTime: string;
    transitionNote: string;
    prompt: PromptType;
    promptCount: string;
    assistantNeeded: PassFailNA;
    food: PassFailNA;
    promptNote: string;
    cwTaskAssigned: string;
    cwTaskCompleted: string;
    cwNote: string;
    pgTaskAssigned: string;
    pgTaskCompleted: string;
    pgNote: string;
    scheduleChange: YesNo;
    scheduleNote: string;
    crisis: YesNo;
    crisisNote: string;
    summaryExtra: string;
}

interface Session {
    id: string;
    date: string;
    employeeId: string;
    employeeName: string;
    cellPhoneLocation: string;
    locations: TransactionLocation[];
}

interface TransactionSheet {
    id?: string | number;
    clientId: string;
    clientName: string;
    program: string;
    sessions: Session[];
    createdAt?: string;
}

const todayStr = () => new Date().toISOString().slice(0, 10);
const generateId = () => Math.random().toString(36).substr(2, 9);

const newLocationBase = (): Omit<TransactionLocation, 'id' | 'name'> => ({
    transition: '', delay: '', delayTime: '', transitionNote: '',
    prompt: '', promptCount: '', assistantNeeded: '', food: '', promptNote: '',
    cwTaskAssigned: '', cwTaskCompleted: '', cwNote: '',
    pgTaskAssigned: '', pgTaskCompleted: '', pgNote: '',
    scheduleChange: '', scheduleNote: '',
    crisis: '', crisisNote: '',
    summaryExtra: ''
});

const LocationCard = ({ loc, onUpdate, onRemove }: { loc: TransactionLocation, onUpdate: (updates: Partial<TransactionLocation>) => void, onRemove: () => void }) => {
    return (
        <View style={s.locCard}>
            <View style={s.locHeader}>
                <Text style={s.locTitle}>{loc.name}</Text>
                <TouchableOpacity onPress={onRemove} style={s.removeBtn}>
                    <Trash2 size={16} color="#dc2626" />
                </TouchableOpacity>
            </View>

            <View style={s.locBody}>
                {/* Transition */}
                <View style={s.fieldGroup}>
                    <Text style={s.groupLabel}>Transition</Text>
                    <View style={s.row}>
                        <TouchableOpacity style={[s.btn, loc.transition === 'Pass' && s.btnPass]} onPress={() => onUpdate({ transition: 'Pass' })}>
                            <Text style={[s.btnText, loc.transition === 'Pass' && s.btnTextActive]}>Pass</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[s.btn, loc.transition === 'Fail' && s.btnFail]} onPress={() => onUpdate({ transition: 'Fail' })}>
                            <Text style={[s.btnText, loc.transition === 'Fail' && s.btnTextActive]}>Fail</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[s.btn, loc.transition === 'N/A' && s.btnActive]} onPress={() => onUpdate({ transition: 'N/A' })}>
                            <Text style={[s.btnText, loc.transition === 'N/A' && s.btnTextActive]}>N/A</Text>
                        </TouchableOpacity>
                    </View>
                    <TextInput
                        style={s.input}
                        placeholder="Transition Note..."
                        value={loc.transitionNote}
                        onChangeText={(text) => onUpdate({ transitionNote: text })}
                    />
                </View>

                {/* Prompts */}
                <View style={s.fieldGroup}>
                    <Text style={s.groupLabel}>Prompts Given</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                        {['I', 'V', 'G', 'PP', 'FP'].map(p => (
                            <TouchableOpacity key={p} style={[s.chip, loc.prompt === p && s.chipActive]} onPress={() => onUpdate({ prompt: p as any })}>
                                <Text style={[s.chipText, loc.prompt === p && s.btnTextActive]}>{p}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <TextInput
                        style={s.input}
                        placeholder="Given #"
                        keyboardType="number-pad"
                        value={loc.promptCount}
                        onChangeText={(text) => onUpdate({ promptCount: text })}
                    />
                    <TextInput
                        style={s.input}
                        placeholder="Prompts Note..."
                        value={loc.promptNote}
                        onChangeText={(text) => onUpdate({ promptNote: text })}
                    />
                </View>

                {/* Tracking */}
                <View style={s.fieldGroup}>
                    <Text style={s.groupLabel}>Classwork & Program Track</Text>
                    <View style={s.row}>
                        <TextInput style={[s.input, { flex: 1 }]} placeholder="CW Assign #" keyboardType="numeric" value={loc.cwTaskAssigned} onChangeText={(text) => onUpdate({ cwTaskAssigned: text })} />
                        <TextInput style={[s.input, { flex: 1 }]} placeholder="CW Complete #" keyboardType="numeric" value={loc.cwTaskCompleted} onChangeText={(text) => onUpdate({ cwTaskCompleted: text })} />
                    </View>
                    <View style={s.row}>
                        <TextInput style={[s.input, { flex: 1 }]} placeholder="PG Assign #" keyboardType="numeric" value={loc.pgTaskAssigned} onChangeText={(text) => onUpdate({ pgTaskAssigned: text })} />
                        <TextInput style={[s.input, { flex: 1 }]} placeholder="PG Complete #" keyboardType="numeric" value={loc.pgTaskCompleted} onChangeText={(text) => onUpdate({ pgTaskCompleted: text })} />
                    </View>
                </View>
            </View>
        </View>
    );
};

export const TransactionSheetScreen = () => {
    const navigation = useNavigation<any>();
    const { activeSession, user, clients } = useAppStore();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [sheet, setSheet] = useState<TransactionSheet | null>(null);

    const [showLocModal, setShowLocModal] = useState(false);
    const [customLoc, setCustomLoc] = useState('');

    const numericClientId = activeSession?.clientId?.replace('CLI-', '');
    const clientRecord: any =
        clients.find((c: any) => String(c.id) === numericClientId) ||
        clients.find((c: any) =>
            (c.kidsName || c.name || '').toLowerCase() ===
            (activeSession?.clientName || '').toLowerCase()
        );

    // Filter available programs
    const availablePrograms: string[] = (() => {
        let cats: any[] = [];
        if (typeof clientRecord?.programCategories === 'string') {
            try { cats = JSON.parse(clientRecord.programCategories); } catch { cats = []; }
        } else if (Array.isArray(clientRecord?.programCategories)) {
            cats = clientRecord.programCategories;
        }
        return cats.map((c: any) => c.name).filter(Boolean);
    })();

    const [selectedProgram, setSelectedProgram] = useState<string>(availablePrograms[0] || '');

    useEffect(() => {
        if (!selectedProgram || !clientRecord) { setLoading(false); return; }
        setLoading(true);
        const clientId = activeSession?.clientId || `CLI-${clientRecord.id}`;
        
        dbGet<any[]>('/transaction-sheets')
            .then((all: any[]) => {
                const found = (Array.isArray(all) ? all : []).find(s =>
                    (s.clientId === clientId || s.clientName === (clientRecord.kidsName || clientRecord.name)) &&
                    s.program === selectedProgram
                );
                if (found) {
                    setSheet(found);
                } else {
                    setSheet({
                        clientId,
                        clientName: activeSession?.clientName || clientRecord.kidsName || clientRecord.name || '',
                        program: selectedProgram,
                        sessions: []
                    });
                }
            })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, [selectedProgram, clientRecord]);

    const activeDbSession = sheet?.sessions[sheet.sessions.length - 1];
    
    // Auto-create a session for today if we don't have one active
    useEffect(() => {
        if (sheet && !loading) {
            const today = todayStr();
            const lastSession = sheet.sessions[sheet.sessions.length - 1];
            if (!lastSession || lastSession.date !== today) {
                const newSession: Session = {
                    id: generateId(),
                    date: today,
                    employeeId: user?.employeeId || '',
                    employeeName: user?.name || '',
                    cellPhoneLocation: '',
                    locations: []
                };
                setSheet(prev => prev ? { ...prev, sessions: [...prev.sessions, newSession] } : prev);
            }
        }
    }, [sheet, loading]);

    const updateActiveSession = (updates: Partial<Session>) => {
        setSheet(s => {
            if (!s || s.sessions.length === 0) return s;
            const updatedSessions = [...s.sessions];
            updatedSessions[updatedSessions.length - 1] = { ...updatedSessions[updatedSessions.length - 1], ...updates };
            return { ...s, sessions: updatedSessions };
        });
    };

    const addLocation = (name: string) => {
        if (!activeDbSession) return;
        updateActiveSession({
            locations: [...activeDbSession.locations, { id: generateId(), name, ...newLocationBase() }]
        });
        setShowLocModal(false);
        setCustomLoc('');
    };

    const updateLocation = (id: string, updates: Partial<TransactionLocation>) => {
        if (!activeDbSession) return;
        updateActiveSession({
            locations: activeDbSession.locations.map(loc => loc.id === id ? { ...loc, ...updates } : loc)
        });
    };

    const removeLocation = (id: string) => {
        if (!activeDbSession) return;
        Alert.alert('Remove Location?', 'Are you sure you want to delete this block?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Remove', style: 'destructive', onPress: () => {
                updateActiveSession({ locations: activeDbSession.locations.filter(loc => loc.id !== id) });
            }}
        ]);
    };

    const handleSave = async () => {
        if (!sheet) { Alert.alert('Error', 'No sheet loaded.'); return; }
        setSaving(true);
        try {
            if (sheet.id) {
                await dbPatch(`/transaction-sheets/${sheet.id}`, sheet);
            } else {
                await dbPost('/transaction-sheets', { ...sheet, createdAt: new Date().toISOString() });
            }
            Alert.alert('Saved!', 'Transaction sheet saved successfully.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
        } catch {
            Alert.alert('Error', 'Could not save — check your connection to the database.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <View style={s.container}>
            {/* Header */}
            <View style={s.header}>
                <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
                    <ArrowLeft size={18} color="#064e3b" />
                </TouchableOpacity>
                <View style={s.headerTitle}>
                    <Text style={s.title}>Transaction Form</Text>
                    <Text style={s.subtitle}>{activeSession?.clientName || 'No client'}</Text>
                </View>
                <TouchableOpacity
                    style={s.saveBtn}
                    onPress={handleSave}
                    disabled={saving || !sheet}
                >
                    {saving ? <ActivityIndicator color="#fff" size="small" /> : (
                        <><Save size={15} color="#fff" /><Text style={s.saveBtnText}>Save</Text></>
                    )}
                </TouchableOpacity>
            </View>

            {/* Program Selector */}
            {availablePrograms.length > 0 && (
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
                <View style={s.center}><ActivityIndicator color="#10b981" size="large" /></View>
            ) : !sheet ? (
                <View style={s.center}><Text style={s.emptyText}>Select a program above.</Text></View>
            ) : (
                <KeyboardAwareScrollView 
                    style={{ flex: 1 }} 
                    contentContainerStyle={s.scroll} 
                    enableOnAndroid={true}
                    extraScrollHeight={80}
                    keyboardShouldPersistTaps="handled"
                >
                    
                    <View style={s.sectionCard}>
                        <View style={s.sessionBanner}>
                            <Activity size={18} color="#15803d" />
                            <Text style={s.sessionBannerTitle}>Active Locations</Text>
                        </View>
                        
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingHorizontal: 12, paddingVertical: 12, backgroundColor: '#f8fafc' }}>
                            {['Cafeteria', 'GYM', '211', 'Launch', 'Bus'].map(loc => (
                                <TouchableOpacity key={loc} style={s.locAddChip} onPress={() => addLocation(loc)}>
                                    <Plus size={14} color="#0f766e" />
                                    <Text style={s.locAddChipText}>{loc}</Text>
                                </TouchableOpacity>
                            ))}
                            <TouchableOpacity style={[s.locAddChip, { backgroundColor: '#f1f5f9', borderColor: '#cbd5e1' }]} onPress={() => setShowLocModal(true)}>
                                <Plus size={14} color="#475569" />
                                <Text style={[s.locAddChipText, { color: '#475569' }]}>Custom</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>

                    {activeDbSession?.locations.map(loc => (
                        <LocationCard key={loc.id} loc={loc} onUpdate={(updates) => updateLocation(loc.id, updates)} onRemove={() => removeLocation(loc.id)} />
                    ))}

                    <View style={{ height: 100 }} />
                </KeyboardAwareScrollView>
            )}

            {/* Custom Location Modal */}
            <Modal visible={showLocModal} transparent animationType="fade">
                <KeyboardAvoidingView style={s.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                    <View style={s.modalBox}>
                        <Text style={s.modalTitle}>Custom Location</Text>
                        <TextInput
                            style={s.modalInput}
                            placeholder="e.g. Art Room"
                            value={customLoc}
                            onChangeText={setCustomLoc}
                            autoFocus
                        />
                        <View style={s.row}>
                            <TouchableOpacity style={[s.modalBtn, { backgroundColor: '#f1f5f9' }]} onPress={() => { setShowLocModal(false); setCustomLoc(''); }}>
                                <Text style={[s.modalBtnText, { color: '#64748b' }]}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[s.modalBtn, { backgroundColor: '#10b981' }]} onPress={() => addLocation(customLoc || 'Custom Location')}>
                                <Text style={[s.modalBtnText, { color: '#fff' }]}>Add</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
};

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f1f5f9' },
    header: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#10b981',
        paddingTop: 52, paddingBottom: 14, paddingHorizontal: 16, gap: 12,
    },
    backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#d1fae5', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { flex: 1 },
    title: { fontSize: 17, fontWeight: '800', color: '#fff', fontFamily: FONTS.bold },
    subtitle: { fontSize: 12, color: '#d1fae5', fontFamily: FONTS.regular, marginTop: 1 },
    saveBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#059669', borderRadius: 9, paddingHorizontal: 14, paddingVertical: 8 },
    saveBtnText: { fontSize: 13, fontWeight: '700', color: '#fff', fontFamily: FONTS.bold },
    
    programSelector: { backgroundColor: 'white', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
    sectionLabel: { fontSize: 10, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8, fontFamily: FONTS.bold },
    programChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 100, backgroundColor: '#f8fafc', marginRight: 8, borderWidth: 1.5, borderColor: 'transparent' },
    programChipActive: { backgroundColor: '#ecfdf5', borderColor: '#10b981' },
    programChipText: { fontSize: 13, fontWeight: '600', color: '#64748b', fontFamily: FONTS.regular },
    programChipTextActive: { color: '#047857', fontFamily: FONTS.bold },
    
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
    emptyText: { fontSize: 14, color: '#94a3b8', textAlign: 'center', fontFamily: FONTS.regular },
    scroll: { flexGrow: 1, padding: 12 },

    sectionCard: { backgroundColor: 'white', borderRadius: 16, overflow: 'hidden', marginBottom: 16 },
    sessionBanner: { paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#ecfdf5', flexDirection: 'row', alignItems: 'center', gap: 8 },
    sessionBannerTitle: { fontSize: 14, fontWeight: '800', color: '#065f46', fontFamily: FONTS.bold },
    
    locAddChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ccfbf1', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginRight: 8, borderWidth: 1, borderColor: '#99f6e4', gap: 4 },
    locAddChipText: { fontSize: 12, fontWeight: '700', color: '#0f766e' },

    locCard: { backgroundColor: 'white', borderRadius: 16, overflow: 'hidden', marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
    locHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    locTitle: { fontSize: 15, fontWeight: '800', color: '#334155', fontFamily: FONTS.bold },
    removeBtn: { padding: 4 },
    locBody: { padding: 12 },
    
    fieldGroup: { marginBottom: 16 },
    groupLabel: { fontSize: 11, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: 8 },
    row: { flexDirection: 'row', gap: 8, marginBottom: 8 },
    
    btn: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 8, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
    btnActive: { backgroundColor: '#e0e7ff', borderColor: '#a5b4fc' },
    btnPass: { backgroundColor: '#dcfce3', borderColor: '#86efac' },
    btnFail: { backgroundColor: '#fee2e2', borderColor: '#fca5a5' },
    btnText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
    btnTextActive: { color: '#1e293b' },
    
    chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
    chipActive: { backgroundColor: '#dbeafe', borderColor: '#93c5fd' },
    chipText: { fontSize: 13, fontWeight: '600', color: '#64748b' },

    input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, color: '#334155', marginBottom: 8 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
    modalBox: { backgroundColor: 'white', borderRadius: 16, padding: 20 },
    modalTitle: { fontSize: 16, fontWeight: '800', color: '#1e293b', marginBottom: 16 },
    modalInput: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, marginBottom: 16, width: '100%' },
    modalBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 8 },
    modalBtnText: { fontSize: 14, fontWeight: '700' },
});
