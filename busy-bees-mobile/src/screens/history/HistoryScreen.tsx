import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { ScreenLayout } from '../../components/ScreenLayout';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { useAppStore } from '../../store/useAppStore';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { COLORS, FONTS } from '../../constants/theme';
import { Search, ChevronRight, Clock, MapPin, ClipboardList } from 'lucide-react-native';
import { dbGet } from '../../lib/db';


import { useTheme } from '../../hooks/useTheme';

export const HistoryScreen = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const completedSessions = useAppStore(state => state.completedSessions);
    const { updateActiveSession } = useAppStore();
    const [searchQuery, setSearchQuery] = useState('');
    const { colors, isDarkMode } = useTheme();
    // Set of "clientId|clientName" that have baseline sheet data
    const [baselineClients, setBaselineClients] = useState<Set<string>>(new Set());

    useEffect(() => {
        dbGet<any[]>('/academic_baselines')
            .then(data => {
                const keys = new Set<string>();
                (Array.isArray(data) ? data : []).forEach((s: any) => {
                    if (Array.isArray(s.sessions) && s.sessions.length > 0) {
                        keys.add(`${s.clientId}|${s.clientName}`);
                    }
                });
                setBaselineClients(keys);
            })
            .catch(() => { });
    }, []);

    const hasBaseline = (session: any) =>
        baselineClients.has(`${session.clientId}|${session.clientName}`) ||
        [...baselineClients].some(k => k.endsWith(`|${session.clientName}`));

    const filteredSessions = completedSessions.filter(session =>
        session.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        session.serviceType.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handlePress = (session: any) => {
        navigation.navigate('HistoryDetails', { session });
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
    };

    const formatDuration = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        return `${h}h ${m}m`;
    };

    // Dynamic Styles
    const searchBoxStyle = [styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }];
    const textStyle = { color: colors.text };
    const secondaryTextStyle = { color: colors.secondaryText };
    const cardStyle = [styles.card, { backgroundColor: colors.card, borderColor: colors.border }];

    return (
        <ScreenLayout>
            <View style={styles.header}>
                <Text style={[styles.title, textStyle]}>Session History</Text>
            </View>

            <View style={styles.searchContainer}>
                <View style={searchBoxStyle}>
                    <Search size={20} color={colors.secondaryText} />
                    <TextInput
                        style={[styles.searchInput, textStyle]}
                        placeholder="Search client or service..."
                        placeholderTextColor={colors.secondaryText}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
            </View>

            {filteredSessions.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={[styles.emptyText, secondaryTextStyle]}>No sessions found.</Text>
                </View>
            ) : (
                <FlatList
                    data={filteredSessions}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.list}
                    renderItem={({ item }) => (
                        <TouchableOpacity onPress={() => handlePress(item)} activeOpacity={0.7} style={styles.cardWrapper}>
                            <View style={cardStyle}>
                                <View style={styles.cardHeader}>
                                    <Text style={[styles.clientName, textStyle]}>{item.clientName}</Text>
                                    <Text style={[styles.date, secondaryTextStyle]}>{formatDate(item.startTime)}</Text>
                                </View>
                                <View style={styles.cardBody}>
                                    <Text style={[styles.service, textStyle]}>{item.serviceType}</Text>
                                    <View style={styles.metaRow}>
                                        <Clock size={14} color={colors.secondaryText} />
                                        <Text style={[styles.metaText, secondaryTextStyle]}>{formatDuration(item.durationSeconds)}</Text>
                                        <View style={[styles.dotSeparator, { backgroundColor: colors.secondaryText }]} />
                                        <MapPin size={14} color={colors.secondaryText} />
                                        <Text style={[styles.metaText, secondaryTextStyle]}>{item.route.length} pts</Text>
                                    </View>
                                </View>
                                <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
                                    <View style={styles.completedBadge}>
                                        <Text style={styles.badgeText}>COMPLETED</Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        {hasBaseline(item) && (
                                            <TouchableOpacity
                                                style={styles.baselineBadge}
                                                onPress={(e) => {
                                                    e.stopPropagation();
                                                    updateActiveSession({
                                                        clientId: item.clientId,
                                                        clientName: item.clientName,
                                                    });
                                                    navigation.navigate('BaselineSheet', {});
                                                }}
                                            >
                                                <ClipboardList size={11} color="#d97706" />
                                                <Text style={styles.baselineBadgeText}>Baseline</Text>
                                            </TouchableOpacity>
                                        )}
                                        <ChevronRight size={16} color={colors.secondaryText} />
                                    </View>
                                </View>
                            </View>
                        </TouchableOpacity>
                    )}
                />
            )}
        </ScreenLayout>
    );
};

const styles = StyleSheet.create({
    header: {
        marginBottom: 16,
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    title: {
        fontSize: 24,
        fontFamily: FONTS.bold,
        color: COLORS.textLight,
    },
    searchContainer: {
        marginBottom: 16,
        paddingHorizontal: 16,
    },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: COLORS.borderLight,
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 48,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontFamily: FONTS.regular,
        fontSize: 14,
        color: COLORS.textLight,
    },
    list: {
        paddingBottom: 100,
        paddingHorizontal: 16,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 60,
    },
    emptyText: {
        color: COLORS.secondaryTextLight,
        fontSize: 16,
        fontFamily: FONTS.medium,
    },
    cardWrapper: {
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    card: {
        backgroundColor: COLORS.white,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: COLORS.borderLight,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    clientName: {
        fontSize: 16,
        fontFamily: FONTS.bold,
        color: COLORS.textLight,
    },
    date: {
        fontSize: 12,
        fontFamily: FONTS.medium,
        color: COLORS.secondaryTextLight,
    },
    cardBody: {
        marginBottom: 12,
    },
    service: {
        fontSize: 14,
        fontFamily: FONTS.medium,
        color: COLORS.textLight,
        marginBottom: 6,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    metaText: {
        fontSize: 12,
        fontFamily: FONTS.medium,
        color: COLORS.secondaryTextLight,
        marginLeft: 4,
    },
    dotSeparator: {
        width: 3,
        height: 3,
        borderRadius: 1.5,
        backgroundColor: COLORS.secondaryTextDark,
        marginHorizontal: 8,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: COLORS.backgroundLight,
        paddingTop: 12,
        marginTop: 4,
    },
    completedBadge: {
        backgroundColor: 'rgba(52, 168, 83, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    badgeText: {
        color: COLORS.success,
        fontSize: 10,
        fontFamily: FONTS.bold,
    },
    baselineBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#fffde7',
        borderWidth: 1,
        borderColor: '#FFC107',
        borderRadius: 6,
        paddingHorizontal: 7,
        paddingVertical: 3,
    },
    baselineBadgeText: {
        fontSize: 10,
        fontFamily: FONTS.bold,
        color: '#d97706',
    },
});
