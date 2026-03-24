import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, TextInput, Alert, Platform, Modal, FlatList, KeyboardAvoidingView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { RootStackParamList } from '../../types/navigation';
import { useAppStore } from '../../store/useAppStore';
import { ScreenLayout } from '../../components/ScreenLayout';
import { COLORS, FONTS } from '../../constants/theme';
import { ChevronDown, Paperclip, FileText, Image as ImageIcon, Trash2, Square, Check, Search, Maximize2, Minimize2, ClipboardList } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { dbGet } from '../../lib/db';

export const SessionDetailsScreen = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const insets = useSafeAreaInsets();
    const { colors, isDarkMode } = useTheme();
    const {
        activeSession,
        startSession,
        updateSessionNotes,
        updateActiveSession,
        addDocument,
        removeDocument,
        clients,
        availableServices,
        fetchFromDB,
    } = useAppStore();

    // Local state
    const [client, setClient] = useState(activeSession?.clientName || '');
    const [clientId, setClientId] = useState(activeSession?.clientId || '');
    const [service, setService] = useState(activeSession?.serviceType || '');
    const [showClientPicker, setShowClientPicker] = useState(false);
    const [showServicePicker, setShowServicePicker] = useState(false);
    const [clientSearch, setClientSearch] = useState('');
    const [serviceSearch, setServiceSearch] = useState('');
    const [expandNotes, setExpandNotes] = useState(false);
    // Whether this client already has at least 1 baseline session saved
    const [hasBaselineData, setHasBaselineData] = useState(false);

    // Filtered lists
    const filteredClients = clients.filter(c => {
        const q = clientSearch.toLowerCase();
        return (
            (c.kidsName || c.name || '').toLowerCase().includes(q) ||
            (c.guardian || '').toLowerCase().includes(q) ||
            (c.guardianLastName || '').toLowerCase().includes(q)
        );
    });
    const filteredServices = availableServices.filter(s =>
        (s.name || '').toLowerCase().includes(serviceSearch.toLowerCase()) ||
        (s.provider || '').toLowerCase().includes(serviceSearch.toLowerCase())
    );

    // Timer Logic
    const [elapsed, setElapsed] = useState(0);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        fetchFromDB();
    }, []);

    // Check if this client has any saved baseline sessions
    useEffect(() => {
        const cId = activeSession?.clientId;
        const cName = activeSession?.clientName;
        if (!cId && !cName) return;
        setHasBaselineData(false);
        dbGet<any[]>('/academic_baselines')
            .then(data => {
                const found = (Array.isArray(data) ? data : []).find(s =>
                    (s.clientId === cId || s.clientName === cName) &&
                    Array.isArray(s.sessions) && s.sessions.length > 0
                );
                setHasBaselineData(!!found);
            })
            .catch(() => setHasBaselineData(false));
    }, [activeSession?.clientId, activeSession?.clientName]);

    useEffect(() => {
        if (!activeSession) {
            startSession({
                clientName: client || 'Unknown',
                serviceType: service || 'General',
                notes: '',
            });
        }
    }, []);

    useEffect(() => {
        if (activeSession?.startTime) {
            const start = new Date(activeSession.startTime).getTime();
            intervalRef.current = setInterval(() => {
                const now = Date.now();
                setElapsed(Math.floor((now - start) / 1000));
            }, 1000);
        }
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [activeSession?.startTime]);

    const formatTime = (totalSeconds: number) => {
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        return {
            h: h.toString().padStart(2, '0'),
            m: m.toString().padStart(2, '0'),
            s: s.toString().padStart(2, '0')
        };
    };

    const time = formatTime(elapsed);

    const handleAddDocument = () => {
        navigation.navigate('DocumentTemplatePicker');
    };

    const handleEndSession = () => {
        if (activeSession) {
            updateSessionNotes(activeSession.id, activeSession.notes || '');
            navigation.navigate('CompleteSession');
        }
    };

    const handleUpdateNotes = (text: string) => {
        if (activeSession) {
            updateSessionNotes(activeSession.id, text);
        }
    }

    if (!activeSession) return null;

    // Dynamic Styles
    const dropdownStyle = [styles.dropdown, { backgroundColor: colors.card, borderColor: colors.border }];
    const dropdownTextStyle = [styles.dropdownText, { color: colors.text }];
    const sectionTitleStyle = [styles.sectionTitle, { color: colors.text }];
    const timerBoxStyle = [styles.timerBox, { backgroundColor: colors.card, borderColor: colors.border }];
    const timerValueStyle = [styles.timerValue, { color: colors.text }];
    const textAreaStyle = [styles.textArea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }];
    const docItemStyle = [styles.docItem, { backgroundColor: colors.card, borderColor: colors.border }];
    const docNameStyle = [styles.docName, { color: colors.text }];

    // Footer needs special handling for safe area
    const footerStyle = [
        styles.footer,
        {
            backgroundColor: isDarkMode ? colors.card : 'rgba(255,255,255,0.9)',
            borderTopColor: colors.border,
            paddingBottom: insets.bottom + 24
        }
    ];

    return (
        <>
            <ScreenLayout useSafePadding={false}>
                <View style={{ flex: 1 }}>
                    <KeyboardAwareScrollView
                        style={{ flex: 1 }}
                        contentContainerStyle={styles.scroll}
                        enableOnAndroid={true}
                        extraScrollHeight={120}
                        keyboardShouldPersistTaps="handled"
                    >

                        {/* Client Picker Button */}
                        <View style={[styles.section, { marginTop: 24 }]}>
                            <Text style={[styles.label, { color: colors.secondaryText }]}>CLIENT</Text>
                            <TouchableOpacity style={dropdownStyle} onPress={() => setShowClientPicker(true)}>
                                <Text style={[dropdownTextStyle, !client && { color: colors.secondaryText }]}>
                                    {client || (clients.length === 0 ? 'Loading clients...' : 'Select a client...')}
                                </Text>
                                <ChevronDown size={20} color={colors.secondaryText} />
                            </TouchableOpacity>
                        </View>

                        {/* Timer Section */}
                        <View style={styles.timerContainer}>
                            <Text style={[styles.label, { color: colors.secondaryText }]}>ELAPSED TIME</Text>
                            <View style={styles.timerRow}>
                                <View style={styles.timerBlock}>
                                    <View style={timerBoxStyle}><Text style={timerValueStyle}>{time.h}</Text></View>
                                    <Text style={styles.timerLabel}>HOURS</Text>
                                </View>
                                <Text style={styles.colon}>:</Text>
                                <View style={styles.timerBlock}>
                                    <View style={timerBoxStyle}><Text style={timerValueStyle}>{time.m}</Text></View>
                                    <Text style={styles.timerLabel}>MINUTES</Text>
                                </View>
                                <Text style={styles.colon}>:</Text>
                                <View style={styles.timerBlock}>
                                    <View style={timerBoxStyle}><Text style={timerValueStyle}>{time.s}</Text></View>
                                    <Text style={styles.timerLabel}>SECONDS</Text>
                                </View>
                            </View>
                        </View>

                        {/* Service Picker Button */}
                        <View style={styles.section}>
                            <Text style={[styles.label, { color: colors.secondaryText }]}>SERVICE TYPE</Text>
                            <TouchableOpacity style={dropdownStyle} onPress={() => setShowServicePicker(true)}>
                                <Text style={[dropdownTextStyle, !service && { color: colors.secondaryText }]}>
                                    {service || (availableServices.length === 0 ? 'Loading services...' : 'Select a service...')}
                                </Text>
                                <ChevronDown size={20} color={colors.secondaryText} />
                            </TouchableOpacity>
                        </View>

                        {/* Session Notes */}
                        <View style={styles.section}>
                            <View style={styles.sectionTitleRow}>
                                <Text style={sectionTitleStyle}>Session Summary</Text>
                                <TouchableOpacity
                                    onPress={() => setExpandNotes(true)}
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                    style={styles.expandBtn}
                                >
                                    <Maximize2 size={16} color={COLORS.primary} />
                                </TouchableOpacity>
                            </View>
                            <TextInput
                                style={textAreaStyle}
                                placeholder="Enter work details, progress updates, and field notes here..."
                                placeholderTextColor={colors.secondaryText}
                                multiline
                                textAlignVertical="top"
                                value={activeSession.notes}
                                onChangeText={handleUpdateNotes}
                            />
                        </View>

                        {/* Forms Section */}
                        <View style={styles.section}>
                            <Text style={sectionTitleStyle}>Forms</Text>

                            {/* ── Baseline Sheet quick-access card (only when data exists) ── */}
                            {hasBaselineData && (
                                <TouchableOpacity
                                    style={styles.baselineCard}
                                    onPress={() => navigation.navigate('BaselineSheet')}
                                    activeOpacity={0.8}
                                >
                                    <View style={styles.baselineIconBox}>
                                        <ClipboardList size={24} color="#92400e" />
                                    </View>
                                    <View style={styles.baselineInfo}>
                                        <Text style={styles.baselineName}>Baseline Sheet</Text>
                                        <Text style={styles.baselineDesc}>Track pass / fail per STO across sessions</Text>
                                    </View>
                                    <View style={styles.baselineArrow}>
                                        <Text style={styles.baselineArrowText}>›</Text>
                                    </View>
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity style={styles.addDocBtn} onPress={handleAddDocument}>
                                <Paperclip size={20} color={COLORS.primary} />
                                <Text style={styles.addDocText}>Other Forms</Text>
                            </TouchableOpacity>
                            <View style={styles.docList}>
                                {activeSession.documents.map((doc, index) => (
                                    <View key={index} style={docItemStyle}>
                                        <View style={styles.docLeft}>
                                            {doc.pdfUrl.endsWith('jpg') ? (
                                                <ImageIcon size={20} color={colors.secondaryText} />
                                            ) : (
                                                <FileText size={20} color={colors.secondaryText} />
                                            )}
                                            <View style={{ marginLeft: 12 }}>
                                                <Text style={docNameStyle}>{doc.type}</Text>
                                                <Text style={styles.docSize}>1.2 MB</Text>
                                            </View>
                                        </View>
                                        <TouchableOpacity onPress={() => removeDocument(activeSession.id, doc.id)}>
                                            <Trash2 size={20} color={COLORS.error} />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </View>
                        </View>

                    </KeyboardAwareScrollView>

                    {/* Footer */}
                    <View style={footerStyle}>
                        <TouchableOpacity style={styles.endBtn} onPress={handleEndSession}>
                            <Square size={20} color={COLORS.white} fill={COLORS.white} />
                            <Text style={styles.endBtnText}>End Session</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScreenLayout>

            {/* ── Fullscreen Notes Modal ──────────────────────────────────── */}
            <Modal visible={expandNotes} animationType="slide" presentationStyle="fullScreen">
                <View style={[styles.fullNoteModal, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
                    {/* Header */}
                    <View style={styles.fullNoteHeader}>
                        <Text style={styles.fullNoteTitle}>Session Summary</Text>
                        <TouchableOpacity
                            onPress={() => setExpandNotes(false)}
                            style={styles.fullNoteDoneBtn}
                        >
                            <Minimize2 size={16} color={COLORS.white} />
                            <Text style={styles.fullNoteDoneText}>Done</Text>
                        </TouchableOpacity>
                    </View>
                    {/* Full-screen text area */}
                    <TextInput
                        style={styles.fullNoteInput}
                        placeholder="Enter work details, progress updates, and field notes here..."
                        placeholderTextColor="#94a3b8"
                        multiline
                        textAlignVertical="top"
                        autoFocus
                        value={activeSession?.notes || ''}
                        onChangeText={handleUpdateNotes}
                    />
                </View>
            </Modal>

            {/* ── Client Picker Modal ─────────────────────────────────────── */}
            <Modal visible={showClientPicker} transparent animationType="slide">
                <KeyboardAvoidingView
                    style={pickerStyles.overlay}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <View style={[pickerStyles.sheet, { backgroundColor: isDarkMode ? '#1f2937' : '#fff' }]}>
                        <Text style={[pickerStyles.title, { color: colors.text }]}>Select Client</Text>
                        {/* Search bar */}
                        <View style={[pickerStyles.searchRow, { backgroundColor: isDarkMode ? '#374151' : '#f3f4f6', borderColor: colors.border }]}>
                            <Search size={16} color={colors.secondaryText} />
                            <TextInput
                                style={[pickerStyles.searchInput, { color: colors.text }]}
                                placeholder="Search clients..."
                                placeholderTextColor={colors.secondaryText}
                                value={clientSearch}
                                onChangeText={setClientSearch}
                                autoCapitalize="none"
                                autoCorrect={false}
                                spellCheck={false}
                                clearButtonMode="while-editing"
                            />
                        </View>
                        <FlatList
                            data={filteredClients}
                            keyExtractor={item => String(item.id)}
                            keyboardShouldPersistTaps="handled"
                            renderItem={({ item }) => {
                                const displayName = item.kidsName || item.name || 'Unknown';
                                const isSelected = displayName === client;
                                return (
                                    <TouchableOpacity
                                        style={[pickerStyles.item, isSelected && { backgroundColor: COLORS.primary + '22' }]}
                                        onPress={() => {
                                            const displayName = item.kidsName || item.name || 'Unknown';
                                            const cliId = `CLI-${item.id}`;
                                            setClient(displayName);
                                            setClientId(String(item.id));
                                            // ✅ Sync into the Zustand store so forms can pre-populate
                                            updateActiveSession({
                                                clientId: cliId,
                                                clientName: displayName,
                                            });
                                            setShowClientPicker(false);
                                        }}
                                    >
                                        <View style={{ flex: 1 }}>
                                            <Text style={[pickerStyles.itemText, { color: colors.text }]}>{displayName}</Text>
                                            <Text style={[pickerStyles.itemSub, { color: colors.secondaryText }]}>
                                                {item.guardian} {item.guardianLastName} · CLI-{item.id}
                                            </Text>
                                        </View>
                                        {isSelected && <Check size={18} color={COLORS.primary} />}
                                    </TouchableOpacity>
                                );
                            }}
                            ListEmptyComponent={
                                <Text style={[pickerStyles.itemSub, { textAlign: 'center', padding: 24, color: colors.secondaryText }]}>
                                    No clients found. Ensure the shared database is running on port 3001.
                                </Text>
                            }
                        />
                        <TouchableOpacity style={pickerStyles.cancelBtn} onPress={() => { setShowClientPicker(false); setClientSearch(''); }}>
                            <Text style={pickerStyles.cancelText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* ── Service Picker Modal ────────────────────────────────────── */}
            <Modal visible={showServicePicker} transparent animationType="slide">
                <KeyboardAvoidingView
                    style={pickerStyles.overlay}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <View style={[pickerStyles.sheet, { backgroundColor: isDarkMode ? '#1f2937' : '#fff' }]}>
                        <Text style={[pickerStyles.title, { color: colors.text }]}>Select Service</Text>
                        {/* Search bar */}
                        <View style={[pickerStyles.searchRow, { backgroundColor: isDarkMode ? '#374151' : '#f3f4f6', borderColor: colors.border }]}>
                            <Search size={16} color={colors.secondaryText} />
                            <TextInput
                                style={[pickerStyles.searchInput, { color: colors.text }]}
                                placeholder="Search services..."
                                placeholderTextColor={colors.secondaryText}
                                value={serviceSearch}
                                onChangeText={setServiceSearch}
                                autoCapitalize="none"
                                autoCorrect={false}
                                spellCheck={false}
                                clearButtonMode="while-editing"
                            />
                        </View>
                        <FlatList
                            data={filteredServices}
                            keyExtractor={item => String(item.id)}
                            keyboardShouldPersistTaps="handled"
                            renderItem={({ item }) => {
                                const isSelected = item.name === service;
                                return (
                                    <TouchableOpacity
                                        style={[pickerStyles.item, isSelected && { backgroundColor: COLORS.primary + '22' }]}
                                        onPress={() => {
                                            setService(item.name);
                                            // ✅ Sync into the Zustand store so forms can pre-populate
                                            updateActiveSession({ serviceType: item.name });
                                            setShowServicePicker(false);
                                        }}
                                    >
                                        <View style={{ flex: 1 }}>
                                            <Text style={[pickerStyles.itemText, { color: colors.text }]}>{item.name}</Text>
                                            <Text style={[pickerStyles.itemSub, { color: colors.secondaryText }]}>{item.provider}</Text>
                                        </View>
                                        {isSelected && <Check size={18} color={COLORS.primary} />}
                                    </TouchableOpacity>
                                );
                            }}
                            ListEmptyComponent={
                                <Text style={[pickerStyles.itemSub, { textAlign: 'center', padding: 24, color: colors.secondaryText }]}>
                                    No services found.
                                </Text>
                            }
                        />
                        <TouchableOpacity style={pickerStyles.cancelBtn} onPress={() => { setShowServicePicker(false); setServiceSearch(''); }}>
                            <Text style={pickerStyles.cancelText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    scroll: {
        flexGrow: 1,
        paddingBottom: 150, // Moved here from inline style for cleanliness
    },
    section: {
        paddingHorizontal: 16,
        marginTop: 24,
    },
    label: {
        fontSize: 12,
        fontFamily: FONTS.semiBold,
        letterSpacing: 1,
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    dropdown: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 56,
        borderRadius: 12,
        paddingHorizontal: 16,
        borderWidth: 1,
    },
    dropdownText: {
        fontSize: 16,
        fontFamily: FONTS.medium,
    },
    timerContainer: {
        marginTop: 24,
        alignItems: 'center',
    },
    timerRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 16,
    },
    timerBlock: {
        alignItems: 'center',
        gap: 8,
    },
    timerBox: {
        width: 64,
        height: 64,
        borderRadius: 12,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    timerValue: {
        fontSize: 28, // ~3xl
        fontFamily: FONTS.bold,
    },
    timerLabel: {
        fontSize: 10,
        fontFamily: FONTS.medium,
        color: COLORS.secondaryTextLight, // Static for now as it's secondary
        textTransform: 'uppercase',
    },
    colon: {
        fontSize: 24,
        fontFamily: FONTS.bold,
        color: COLORS.secondaryTextDark,
        marginTop: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontFamily: FONTS.semiBold,
        marginBottom: 12,
    },
    textArea: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 16,
        height: 140,
        fontSize: 16,
        fontFamily: FONTS.regular,
    },
    addDocBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 56,
        backgroundColor: 'rgba(19, 127, 236, 0.1)', // Primary / 10
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(19, 127, 236, 0.2)',
        gap: 12,
        marginBottom: 16,
    },
    addDocText: {
        fontSize: 16,
        fontFamily: FONTS.bold,
        color: COLORS.primary,
    },
    docList: {
        gap: 8,
    },
    docItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
    },
    docLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    docName: {
        fontSize: 14,
        fontFamily: FONTS.medium,
    },
    docSize: {
        fontSize: 12,
        color: COLORS.secondaryTextDark,
    },
    // ── Baseline Sheet quick-access card ──────────────────────────────────
    baselineCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fffde7',
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#FFC107',
        padding: 14,
        marginBottom: 12,
        shadowColor: '#FFC107',
        shadowOpacity: 0.12,
        shadowRadius: 6,
        elevation: 2,
    },
    baselineIconBox: {
        width: 46,
        height: 46,
        borderRadius: 12,
        backgroundColor: '#fff9c4',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    baselineInfo: { flex: 1 },
    baselineName: {
        fontSize: 15,
        fontFamily: FONTS.bold,
        color: '#92400e',
        marginBottom: 3,
    },
    baselineDesc: {
        fontSize: 12,
        fontFamily: FONTS.regular,
        color: '#b45309',
    },
    baselineArrow: { paddingLeft: 8 },
    baselineArrowText: {
        fontSize: 26,
        color: '#d97706',
        fontFamily: FONTS.bold,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 16,
        borderTopWidth: 1,
    },
    endBtn: {
        height: 56,
        backgroundColor: COLORS.error,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        shadowColor: COLORS.error,
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    endBtnText: {
        fontSize: 18,
        fontFamily: FONTS.bold,
        color: COLORS.white,
    },
    // Expand button row
    sectionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    expandBtn: {
        padding: 6,
        borderRadius: 8,
        backgroundColor: 'rgba(0,227,191,0.1)',
    },
    // Fullscreen notes modal
    fullNoteModal: {
        flex: 1,
        backgroundColor: '#ffffff',
        flexDirection: 'column',
    },
    fullNoteHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
        backgroundColor: '#f8fafc',
    },
    fullNoteTitle: {
        fontSize: 18,
        fontFamily: FONTS.bold,
        color: '#0f172a',
    },
    fullNoteDoneBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: COLORS.primary,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 10,
    },
    fullNoteDoneText: {
        color: COLORS.white,
        fontFamily: FONTS.semiBold,
        fontSize: 14,
    },
    fullNoteInput: {
        flex: 1,
        padding: 20,
        fontSize: 16,
        fontFamily: FONTS.regular,
        color: '#0f172a',
        lineHeight: 24,
    },
});

// ── Picker Modal Styles ───────────────────────────────────────────────────────
const pickerStyles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    sheet: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 16,
        paddingBottom: 32,
        maxHeight: '75%',
    },
    title: {
        fontSize: 17,
        fontFamily: FONTS.bold,
        textAlign: 'center',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.borderLight,
        marginBottom: 4,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.borderLight,
    },
    itemText: {
        fontSize: 15,
        fontFamily: FONTS.medium,
        marginBottom: 2,
    },
    itemSub: {
        fontSize: 12,
        fontFamily: FONTS.regular,
        color: COLORS.secondaryTextLight,
    },
    cancelBtn: {
        marginTop: 8,
        marginHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: COLORS.backgroundLight,
        alignItems: 'center',
    },
    cancelText: {
        fontSize: 16,
        fontFamily: FONTS.bold,
        color: COLORS.textLight,
    },
    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        marginBottom: 8,
        borderRadius: 10,
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 8,
        gap: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        fontFamily: FONTS.regular,
        paddingVertical: 0,
    },
});
