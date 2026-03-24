import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList, Alert } from 'react-native';
import { ScreenLayout } from '../../components/ScreenLayout';
import { useTheme } from '../../hooks/useTheme';
import { COLORS, FONTS } from '../../constants/theme';
import { Calendar as CalendarIcon, Clock, MapPin, User, ChevronLeft, ChevronRight, Plus } from 'lucide-react-native';

const MOCK_SCHEDULE = [
    {
        id: '1',
        time: '09:00 AM',
        date: '2025-05-15',
        client: 'TechCorp HQ',
        address: '123 Innovation Dr, Tech City',
        service: 'Q2 Maintenance',
        status: 'upcoming',
        duration: '2h'
    },
    {
        id: '2',
        time: '01:30 PM',
        date: '2025-05-15',
        client: 'Green Valley School',
        address: '45 Education Ln, Suburbs',
        service: 'System Inspection',
        status: 'upcoming',
        duration: '1.5h'
    },
    {
        id: '3',
        time: '10:00 AM',
        date: '2025-05-16',
        client: 'City Center Mall',
        address: '88 Market St, Downtown',
        service: 'Emergency Repair',
        status: 'pending',
        duration: '3h'
    }
];

// Helper to generate current week days based on start date
const getWeekDays = (startDate: Date) => {
    const days = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + i);
        days.push({
            day: d.toLocaleDateString('en-US', { weekday: 'short' }),
            date: d.getDate(),
            fullDate: d.toISOString().split('T')[0],
            isToday: d.toDateString() === new Date().toDateString()
        });
    }
    return days;
};

import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';

export const CalendarScreen = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { colors, isDarkMode } = useTheme();
    // Start from today, but find the beginning of the week (Sunday)
    const [currentWeekStart, setCurrentWeekStart] = useState(() => {
        const d = new Date();
        const day = d.getDay(); // 0 is Sunday
        const diff = d.getDate() - day; // adjust when day is sunday
        return new Date(d.setDate(diff));
    });

    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    // Generate days for the current view
    const weekDays = getWeekDays(currentWeekStart);

    const handlePrevWeek = () => {
        const newDate = new Date(currentWeekStart);
        newDate.setDate(newDate.getDate() - 7);
        setCurrentWeekStart(newDate);
    };

    const handleNextWeek = () => {
        const newDate = new Date(currentWeekStart);
        newDate.setDate(newDate.getDate() + 7);
        setCurrentWeekStart(newDate);
    };

    // Format header date (e.g., "May 2025")
    const headerDateString = currentWeekStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const handleAddPress = () => {
        // Option 1: "set up my availability" 
        // Option 2: "add event"
        // Using Alert for native ActionSheet-like behavior on iOS/Android
        Alert.alert(
            'Manage Schedule',
            'Choose an action:',
            [
                {
                    text: 'Set up my availability',
                    onPress: () => navigation.navigate('SetAvailability'),
                },
                {
                    text: 'Add Event',
                    onPress: () => Alert.alert('Coming Soon', 'Event creation will be implemented shortly.'),
                },
                { text: 'Cancel', style: 'cancel' }
            ]
        );
    };

    const filteredEvents = MOCK_SCHEDULE.filter(e => e.date === selectedDate || selectedDate === 'ALL'); // Simple filter logic

    const renderEventCard = ({ item }: { item: any }) => (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: '#000' }]}>
            <View style={styles.cardLeft}>
                <Text style={[styles.time, { color: colors.text }]}>{item.time}</Text>
                <Text style={[styles.duration, { color: colors.secondaryText }]}>{item.duration}</Text>
                <View style={[styles.line, { backgroundColor: colors.border }]} />
            </View>
            <View style={styles.cardRight}>
                <View style={styles.badgeRow}>
                    <View style={[styles.badge, { backgroundColor: item.status === 'upcoming' ? '#DBEAFE' : '#FEF3C7' }]}>
                        <Text style={[styles.badgeText, { color: item.status === 'upcoming' ? '#1E40AF' : '#92400E' }]}>
                            {item.status.toUpperCase()}
                        </Text>
                    </View>
                    <Text style={[styles.serviceType, { color: colors.secondaryText }]}>{item.service}</Text>
                </View>
                <Text style={[styles.clientName, { color: colors.text }]}>{item.client}</Text>

                <View style={styles.locationRow}>
                    <MapPin size={14} color={colors.secondaryText} />
                    <Text style={[styles.address, { color: colors.secondaryText }]}>{item.address}</Text>
                </View>
            </View>
        </View>
    );

    return (
        <ScreenLayout>
            <View style={styles.header}>
                <View>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Schedule</Text>
                    <View style={styles.dateNavRow}>
                        <TouchableOpacity onPress={handlePrevWeek} style={styles.navBtn}>
                            <ChevronLeft size={20} color={colors.secondaryText} />
                        </TouchableOpacity>
                        <Text style={[styles.headerSubtitle, { color: colors.secondaryText }]}>{headerDateString}</Text>
                        <TouchableOpacity onPress={handleNextWeek} style={styles.navBtn}>
                            <ChevronRight size={20} color={colors.secondaryText} />
                        </TouchableOpacity>
                    </View>
                </View>
                <TouchableOpacity style={[styles.addBtn, { backgroundColor: COLORS.primary }]} onPress={handleAddPress}>
                    <Plus size={24} color="#FFF" />
                </TouchableOpacity>
            </View>

            {/* Calendar Strip */}
            <View style={styles.calendarStrip}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.calendarScroll}>
                    {weekDays.map((day, index) => {
                        const isSelected = day.fullDate === selectedDate;
                        return (
                            <TouchableOpacity
                                key={index}
                                style={[
                                    styles.dayItem,
                                    isSelected && { backgroundColor: COLORS.primary, shadowOpacity: 0.3 }
                                ]}
                                onPress={() => setSelectedDate(day.fullDate)}
                            >
                                <Text style={[
                                    styles.dayName,
                                    { color: isSelected ? '#FFF' : colors.secondaryText }
                                ]}>
                                    {day.day}
                                </Text>
                                <Text style={[
                                    styles.dayDate,
                                    { color: isSelected ? '#FFF' : colors.text }
                                ]}>
                                    {day.date}
                                </Text>
                                {day.isToday && !isSelected && (
                                    <View style={[styles.dot, { backgroundColor: COLORS.primary }]} />
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            {/* Event List */}
            <View style={[styles.content, { backgroundColor: isDarkMode ? '#111827' : '#F9FAFB' }]}>
                <View style={styles.listHeader}>
                    <Text style={[styles.listTitle, { color: colors.text }]}>Upcoming Visits</Text>
                    <Text style={[styles.listCount, { color: colors.secondaryText }]}>{filteredEvents.length} total</Text>
                </View>

                {filteredEvents.length > 0 ? (
                    <FlatList
                        data={filteredEvents}
                        renderItem={renderEventCard}
                        keyExtractor={item => item.id}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                    />
                ) : (
                    <View style={styles.emptyState}>
                        <CalendarIcon size={48} color={COLORS.borderLight} />
                        <Text style={[styles.emptyText, { color: colors.secondaryText }]}>No visits scheduled for this day.</Text>
                        <TouchableOpacity style={styles.emptyBtn}>
                            <Text style={styles.emptyBtnText}>Add New Visit</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </ScreenLayout>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 24,
    },
    headerTitle: {
        fontSize: 28,
        fontFamily: FONTS.bold,
    },
    headerSubtitle: {
        fontSize: 16,
        fontFamily: FONTS.medium,
    },
    dateNavRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        gap: 8,
    },
    navBtn: {
        padding: 4,
    },
    addBtn: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    calendarStrip: {
        paddingBottom: 24,
    },
    calendarScroll: {
        paddingHorizontal: 24,
        gap: 12,
    },
    dayItem: {
        width: 60,
        height: 80,
        borderRadius: 16,
        backgroundColor: 'transparent',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'transparent', // Placeholder for potential border
    },
    dayName: {
        fontSize: 12,
        fontFamily: FONTS.medium,
        marginBottom: 8,
    },
    dayDate: {
        fontSize: 18,
        fontFamily: FONTS.bold,
    },
    dot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        marginTop: 6,
    },
    content: {
        flex: 1,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingTop: 32,
        paddingHorizontal: 24,
    },
    listHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    listTitle: {
        fontSize: 18,
        fontFamily: FONTS.bold,
    },
    listCount: {
        fontSize: 14,
        fontFamily: FONTS.medium,
    },
    listContent: {
        paddingBottom: 100,
    },
    card: {
        flexDirection: 'row',
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        // Shadow default
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    cardLeft: {
        alignItems: 'center',
        marginRight: 16,
        width: 60,
    },
    time: {
        fontSize: 14,
        fontFamily: FONTS.bold,
        marginBottom: 4,
        textAlign: 'center',
    },
    duration: {
        fontSize: 12,
        fontFamily: FONTS.medium,
        marginBottom: 8,
    },
    line: {
        width: 2,
        flex: 1,
        borderRadius: 1,
    },
    cardRight: {
        flex: 1,
    },
    badgeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    badgeText: {
        fontSize: 10,
        fontFamily: FONTS.bold,
    },
    serviceType: {
        fontSize: 12,
        fontFamily: FONTS.medium,
    },
    clientName: {
        fontSize: 16,
        fontFamily: FONTS.bold,
        marginBottom: 8,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    address: {
        fontSize: 13,
        fontFamily: FONTS.regular,
        flex: 1,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 60,
        gap: 16,
    },
    emptyText: {
        fontSize: 16,
        fontFamily: FONTS.medium,
    },
    emptyBtn: {
        paddingVertical: 12,
        paddingHorizontal: 24,
    },
    emptyBtnText: {
        fontSize: 14,
        fontFamily: FONTS.bold,
        color: COLORS.primary,
    }
});
