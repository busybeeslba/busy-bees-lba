import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { ScreenLayout } from '../../components/ScreenLayout';
import { COLORS, FONTS } from '../../constants/theme';
import { FileText, Clock, Calendar, UserCheck, ClipboardList, ChevronRight } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../../hooks/useTheme';
import { MapComponent } from '../../components/MapComponent';
import { useAppStore } from '../../store/useAppStore';
import { dbGet } from '../../lib/db';

type HistoryDetailsRouteProp = RouteProp<RootStackParamList, 'HistoryDetails'>;

export const HistoryDetailsScreen = () => {
    const route = useRoute<HistoryDetailsRouteProp>();
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { session } = route.params;
    const { colors } = useTheme();
    const { updateActiveSession } = useAppStore();

    const [baselineSheets, setBaselineSheets] = useState<any[]>([]);
    const [loadingBaseline, setLoadingBaseline] = useState(true);

    useEffect(() => {
        const cId = session.clientId;
        const cName = session.clientName;
        dbGet<any[]>('/academic_baselines')
            .then(data => {
                const matched = (Array.isArray(data) ? data : []).filter((s: any) =>
                    (s.clientId === cId || s.clientName === cName) &&
                    Array.isArray(s.sessions) && s.sessions.length > 0
                );
                setBaselineSheets(matched);
            })
            .catch(() => { })
            .finally(() => setLoadingBaseline(false));
    }, [session.clientId, session.clientName]);

    const openBaseline = (sheet: any) => {
        updateActiveSession({
            clientId: sheet.clientId,
            clientName: sheet.clientName,
        });
        navigation.navigate('BaselineSheet', { program: sheet.program });
    };

    const formatDateTime = (dateString: string) => {
        return new Date(dateString).toLocaleString();
    };

    const formattedDuration = useMemo(() => {
        const seconds = session.durationSeconds || 0;
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        if (mins === 0) return `${secs} sec`;
        return `${mins} min ${secs} sec`;
    }, [session.durationSeconds]);

    // Parse signature (JSON strokes or plain text)
    const signatureContent = useMemo(() => {
        if (!session.signature) return null;
        try {
            const parsed = JSON.parse(session.signature);
            if (Array.isArray(parsed)) {
                return (
                    <Svg style={StyleSheet.absoluteFill} viewBox="0 0 400 240">
                        {parsed.map((d: string, i: number) => (
                            <Path
                                key={i}
                                d={d}
                                stroke={colors.text}
                                strokeWidth={2}
                                fill="none"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        ))}
                    </Svg>
                );
            }
        } catch (e) {
            // Not JSON, assume plain text name
            return (
                <Text style={styles.typedSignature}>{session.signature}</Text>
            );
        }
        return null; // Should treat as string if parse fails, but catch handles it
    }, [session.signature, colors.text]); // Added colors.text dependency

    const cardStyle = [styles.card, { backgroundColor: colors.card }];
    const textStyle = { color: colors.text };
    const secondaryTextStyle = { color: colors.secondaryText };

    return (
        <ScreenLayout useSafePadding={false}>
            <ScrollView contentContainerStyle={styles.scroll}>
                {/* ID Tag - Reduced spacing by removing header and adjusting styles */}
                <View style={styles.idTag}>
                    <Text style={styles.idText}>SESSION ID: {session.id}</Text>
                </View>

                {/* Main Card */}
                <View style={cardStyle}>
                    <Text style={[styles.clientName, textStyle]}>{session.clientName}</Text>
                    <Text style={[styles.serviceType, secondaryTextStyle]}>{session.serviceType}</Text>

                    <View style={[styles.statsRow, { borderTopColor: colors.border }]}>
                        <View style={styles.statItem}>
                            <Calendar size={18} color={colors.secondaryText} />
                            <Text style={[styles.statLabel, secondaryTextStyle]}>Date</Text>
                            <Text style={[styles.statValue, textStyle]}>{new Date(session.startTime).toLocaleDateString()}</Text>
                        </View>
                        <View style={[styles.divider, { backgroundColor: colors.border }]} />
                        <View style={styles.statItem}>
                            <Clock size={18} color={colors.secondaryText} />
                            <Text style={[styles.statLabel, secondaryTextStyle]}>Duration</Text>
                            <Text style={[styles.statValue, textStyle]}>{formattedDuration}</Text>
                        </View>
                    </View>
                </View>

                {/* Notes */}
                {session.notes && (
                    <View style={cardStyle}>
                        <Text style={[styles.sectionTitle, textStyle]}>Session Notes</Text>
                        <Text style={[styles.notesText, textStyle]}>{session.notes}</Text>
                    </View>
                )}

                {/* Documents */}
                <View style={cardStyle}>
                    <Text style={[styles.sectionTitle, textStyle]}>Documents ({session.documents.length})</Text>
                    {session.documents.length === 0 ? (
                        <Text style={[styles.emptyText, secondaryTextStyle]}>No documents created.</Text>
                    ) : (
                        session.documents.map((doc, index) => (
                            <View key={index} style={[styles.docItem, { borderBottomColor: colors.border }]}>
                                <View style={styles.docIconBox}>
                                    <FileText size={20} color={COLORS.primary} />
                                </View>
                                <View style={styles.docInfo}>
                                    <Text style={[styles.docName, textStyle]}>{doc.type}</Text>
                                    <Text style={[styles.docDate, secondaryTextStyle]}>{new Date(doc.createdAt).toLocaleTimeString()}</Text>
                                </View>
                            </View>
                        ))
                    )}
                </View>

                {/* Signature */}
                <View style={cardStyle}>
                    <Text style={[styles.sectionTitle, textStyle]}>Signature</Text>
                    <View style={styles.sigContainer}>
                        {session.signature ? (
                            <View style={[styles.sigBox, { borderColor: colors.border, backgroundColor: colors.background }]}>
                                {signatureContent}
                            </View>
                        ) : (
                            <Text style={[styles.emptyText, secondaryTextStyle]}>No signature recorded</Text>
                        )}
                        <View style={styles.signedByRow}>
                            <UserCheck size={14} color={COLORS.success} />
                            <Text style={[styles.signedByText, secondaryTextStyle]}>Signed at {formatDateTime(session.signedAt || session.endTime || '')}</Text>
                        </View>
                    </View>
                </View>

                {/* ── Baseline Sheets ── */}
                <View style={cardStyle}>
                    <View style={styles.sectionRow}>
                        <ClipboardList size={17} color="#d97706" />
                        <Text style={[styles.sectionTitle, textStyle, { marginBottom: 0, marginLeft: 8 }]}>Baseline Sheets</Text>
                    </View>
                    {loadingBaseline ? (
                        <ActivityIndicator color="#FFC107" style={{ marginTop: 12 }} />
                    ) : baselineSheets.length === 0 ? (
                        <Text style={[styles.emptyText, secondaryTextStyle, { marginTop: 12 }]}>No baseline sheets for this client.</Text>
                    ) : (
                        baselineSheets.map((sheet, idx) => {
                            const rows: any[] = sheet.rows || [];
                            const sessions: any[] = sheet.sessions || [];
                            const totalPass = rows.reduce((n: number, _: any, ri: number) =>
                                n + sessions.filter((s: any) => s.results?.[String(ri)] === 'pass').length, 0);
                            const totalFail = rows.reduce((n: number, _: any, ri: number) =>
                                n + sessions.filter((s: any) => s.results?.[String(ri)] === 'fail').length, 0);
                            const total = totalPass + totalFail;
                            const pct = total > 0 ? Math.round(totalPass / total * 100) : null;
                            return (
                                <TouchableOpacity key={idx} style={styles.baselineRow} onPress={() => openBaseline(sheet)} activeOpacity={0.75}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.baselineProgram, textStyle]}>{sheet.program}</Text>
                                        <Text style={styles.baselineStat}>
                                            {sessions.length} session{sessions.length !== 1 ? 's' : ''}{'  '}
                                            <Text style={{ color: '#15803d', fontWeight: '700' }}>✓{totalPass}</Text>
                                            {'  '}
                                            <Text style={{ color: '#dc2626', fontWeight: '700' }}>✗{totalFail}</Text>
                                            {pct !== null && <Text style={{ color: '#6366f1', fontWeight: '700' }}>  {pct}%</Text>}
                                        </Text>
                                    </View>
                                    <ChevronRight size={16} color={colors.secondaryText} />
                                </TouchableOpacity>
                            );
                        })
                    )}
                </View>

                {/* Session Route Map */}
                {session.route && session.route.length > 0 && (
                    <View style={cardStyle}>
                        <Text style={[styles.sectionTitle, textStyle]}>Session Route</Text>
                        <View style={styles.mapWrapper}>
                            <MapComponent
                                route={session.route}
                                currentLocation={undefined}
                            />
                        </View>
                        <View style={styles.mapFooter}>
                            <Text style={[styles.mapSubtitle, secondaryTextStyle]}>
                                Total Points: {session.route.length}
                            </Text>
                        </View>
                    </View>
                )}
            </ScrollView>
        </ScreenLayout >
    );
};

const styles = StyleSheet.create({
    scroll: {
        padding: 16,
        paddingBottom: 40,
    },
    idTag: {
        alignSelf: 'center',
        backgroundColor: COLORS.borderLight,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        marginBottom: 12, // Reduced from 16
        marginTop: 0, // Ensure no extra top margin
    },
    idText: {
        fontSize: 10,
        fontFamily: FONTS.bold,
        color: COLORS.secondaryTextLight,
        letterSpacing: 0.5,
    },
    card: {
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    clientName: {
        fontSize: 20,
        fontFamily: FONTS.bold,
        marginBottom: 4,
        textAlign: 'center',
    },
    serviceType: {
        fontSize: 14,
        fontFamily: FONTS.medium,
        marginBottom: 20,
        textAlign: 'center',
    },
    statsRow: {
        flexDirection: 'row',
        borderTopWidth: 1,
        paddingTop: 16,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    divider: {
        width: 1,
    },
    statLabel: {
        fontSize: 12,
        fontFamily: FONTS.medium,
        marginTop: 8,
    },
    statValue: {
        fontSize: 16,
        fontFamily: FONTS.bold,
        marginTop: 4,
    },
    sectionTitle: {
        fontSize: 16,
        fontFamily: FONTS.bold,
        marginBottom: 16,
    },
    notesText: {
        fontFamily: FONTS.regular,
        lineHeight: 22,
    },
    emptyText: {
        fontFamily: FONTS.medium,
        fontStyle: 'italic',
    },
    docItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    docIconBox: {
        width: 40,
        height: 40,
        backgroundColor: 'rgba(19, 127, 236, 0.1)',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    docInfo: {
        flex: 1,
    },
    docName: {
        fontSize: 14,
        fontFamily: FONTS.semiBold,
    },
    docDate: {
        fontSize: 12,
        marginTop: 2,
    },
    sigContainer: {
        marginTop: 8,
    },
    sigBox: {
        height: 120,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 8,
        marginBottom: 12,
        overflow: 'hidden',
    },
    typedSignature: {
        fontSize: 28,
        fontFamily: 'Cursive', // Ensure this font is available or fallback
        fontWeight: 'bold',
        fontStyle: 'italic',
    },
    signedByRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 6,
    },
    signedByText: {
        fontSize: 12,
        fontFamily: FONTS.medium,
    },
    sectionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 14,
    },
    baselineRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.06)',
    },
    baselineProgram: {
        fontSize: 14,
        fontFamily: FONTS.semiBold,
        marginBottom: 4,
    },
    baselineStat: {
        fontSize: 12,
        fontFamily: FONTS.regular,
        color: COLORS.secondaryTextLight,
    },
    mapWrapper: {
        height: 200,
        borderRadius: 8,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: COLORS.borderLight,
        backgroundColor: COLORS.backgroundLight,
        marginBottom: 8,
    },
    mapFooter: {
        alignItems: 'flex-end',
    },
    mapSubtitle: {
        fontSize: 12,
        fontFamily: FONTS.medium,
        marginTop: 4,
    }
});
