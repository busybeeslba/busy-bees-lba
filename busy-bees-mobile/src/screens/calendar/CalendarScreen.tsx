import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList, Alert, Modal, Animated, PanResponder, Dimensions } from 'react-native';
import { ScreenLayout } from '../../components/ScreenLayout';
import { useTheme } from '../../hooks/useTheme';
import { COLORS, FONTS } from '../../constants/theme';
import { Calendar as CalendarIcon, Clock, MapPin, User, ChevronLeft, ChevronRight, Plus, Trash2, Pencil, X } from 'lucide-react-native';

import { useFocusEffect } from '@react-navigation/native';
import { fetchSchedule, deleteSchedule, fetchSessions, updateSchedule } from '../../lib/db';
import { useAppStore } from '../../store/useAppStore';

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

const ACTIONS_WIDTH = 140;

const SwipeableRow = ({ children, onEdit, onDelete }: any) => {
    const translateX = React.useRef(new Animated.Value(0)).current;
    const isOpen = React.useRef(false);
    
    const panResponder = React.useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => false,
            onMoveShouldSetPanResponderCapture: (_, gestureState) => {
                return Math.abs(gestureState.dx) > 15 && Math.abs(gestureState.dy) < 15;
            },
            onMoveShouldSetPanResponder: (_, gestureState) => {
                return Math.abs(gestureState.dx) > 15 && Math.abs(gestureState.dy) < 15;
            },
            onPanResponderGrant: () => {
                translateX.setOffset(isOpen.current ? -ACTIONS_WIDTH : 0);
                translateX.setValue(0);
            },
            onPanResponderMove: (_, gestureState) => {
                let newX = gestureState.dx;
                const totalX = (isOpen.current ? -ACTIONS_WIDTH : 0) + newX;
                
                if (totalX > 0) {
                    translateX.setValue(isOpen.current ? ACTIONS_WIDTH : 0); 
                } else if (totalX < -ACTIONS_WIDTH - 20) {
                    const boundX = -ACTIONS_WIDTH - 20;
                    const overX = totalX - boundX; 
                    translateX.setValue(newX - overX + overX * 0.1); 
                } else {
                    translateX.setValue(newX);
                }
            },
            onPanResponderTerminationRequest: () => false,
            onPanResponderRelease: (_, gestureState) => {
                translateX.flattenOffset();
                
                const isSwipingLeft = gestureState.dx < -30 || gestureState.vx < -0.5;
                const isSwipingRight = gestureState.dx > 30 || gestureState.vx > 0.5;
                
                if (isSwipingLeft) {
                    isOpen.current = true;
                    Animated.timing(translateX, {
                        toValue: -ACTIONS_WIDTH,
                        duration: 250,
                        useNativeDriver: true,
                    }).start();
                } else if (isSwipingRight) {
                    isOpen.current = false;
                    Animated.timing(translateX, {
                        toValue: 0,
                        duration: 250,
                        useNativeDriver: true,
                    }).start();
                } else {
                    Animated.timing(translateX, {
                        toValue: isOpen.current ? -ACTIONS_WIDTH : 0,
                        duration: 250,
                        useNativeDriver: true,
                    }).start();
                }
            },
            onPanResponderTerminate: () => {
                translateX.flattenOffset();
                Animated.timing(translateX, {
                    toValue: 0,
                    duration: 250,
                    useNativeDriver: true,
                }).start();
                isOpen.current = false;
            }
        })
    ).current;

    const closeRow = (action: () => void) => {
        isOpen.current = false;
        Animated.timing(translateX, {
            toValue: 0,
            duration: 250,
            useNativeDriver: true,
        }).start(() => action());
    };

    return (
        <View style={{ marginBottom: 16 }}>
            <View style={{
                position: 'absolute',
                top: 0, bottom: 0, right: 0,
                width: ACTIONS_WIDTH,
                flexDirection: 'row',
                borderRadius: 20,
                overflow: 'hidden',
                backgroundColor: '#EF4444'
            }}>
                <TouchableOpacity 
                    style={{ flex: 1, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' }} 
                    onPress={() => closeRow(onEdit)}
                >
                    <Pencil size={24} color="#FFF" />
                </TouchableOpacity>
                <TouchableOpacity 
                    style={{ flex: 1, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center' }}
                    onPress={() => closeRow(onDelete)}
                >
                    <Trash2 size={24} color="#FFF" />
                </TouchableOpacity>
            </View>

            <Animated.View 
                style={{ transform: [{ translateX }] }}
                {...panResponder.panHandlers}
            >
                {children}
            </Animated.View>
        </View>
    );
};

const TIME_SLOTS = [
    '08:00 AM', '08:30 AM', '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM',
    '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM',
    '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM',
    '05:00 PM', '05:30 PM', '06:00 PM'
];

import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';

export const CalendarScreen = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { colors, isDarkMode } = useTheme();
    const { user } = useAppStore();
    const [schedule, setSchedule] = useState<any[]>([]);
    const [sessions, setSessions] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'sessions' | 'availability'>('sessions');

    const [editSlot, setEditSlot] = useState<any>(null);
    const [editStartTime, setEditStartTime] = useState('');
    const [editEndTime, setEditEndTime] = useState('');
    const [showEditModal, setShowEditModal] = useState(false);
    const [showEditStartPicker, setShowEditStartPicker] = useState(false);
    const [showEditEndPicker, setShowEditEndPicker] = useState(false);

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

    const loadSchedule = async () => {
        try {
            // Load both availability slots and assigned sessions
            const [schedData, sessData] = await Promise.all([
                fetchSchedule(),
                fetchSessions()
            ]);
            
            // Filter globally by this user
            const mySched = schedData.filter((s: any) => s.employeeId === (user?.employeeId || user?.id));
            const mySess = sessData.filter((s: any) => s.employeeId === (user?.employeeId || user?.id) || s.userId === user?.id);
            
            setSchedule(mySched);
            setSessions(mySess);
        } catch (err) {
            console.error('Failed to load schedule', err);
        }
    };

    const handleDelete = (id: string) => {
        Alert.alert(
            'Delete Slot',
            'Are you sure you want to delete this availability slot?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteSchedule(id);
                            loadSchedule(); // refresh
                        } catch (err) {
                            Alert.alert('Error', 'Failed to delete slot.');
                        }
                    }
                }
            ]
        );
    };

    const handleEditPress = (item: any) => {
        setEditSlot(item);
        setEditStartTime(item.rawStartTime || item.time);
        setEditEndTime(item.rawEndTime || '05:00 PM');
        setShowEditModal(true);
    };

    const handleSaveEdit = async () => {
        if (!editSlot) return;
        try {
            await updateSchedule(editSlot.id, {
                startTime: editStartTime,
                endTime: editEndTime
            });
            setShowEditModal(false);
            loadSchedule();
        } catch (err) {
            Alert.alert('Error', 'Failed to update slot.');
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            loadSchedule();
        }, [user])
    );

    const formatTime = (timeStr: string) => {
        if (!timeStr) return '';
        if (timeStr.includes('AM') || timeStr.includes('PM')) return timeStr;
        const [h, m] = timeStr.split(':');
        let hours = parseInt(h, 10);
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        return `${hours.toString().padStart(2, '0')}:${m} ${ampm}`;
    };

    const calculateDuration = (start: string, end: string) => {
        if (!start || !end) return '';
        const [sH, sM] = start.split(':').map(Number);
        const [eH, eM] = end.split(':').map(Number);
        if (isNaN(sH) || isNaN(eH)) return '';
        const diffMins = (eH * 60 + eM) - (sH * 60 + sM);
        if (diffMins <= 0) return '';
        const h = Math.floor(diffMins / 60);
        const m = diffMins % 60;
        if (h > 0 && m > 0) return `${h}h ${m}m`;
        if (h > 0) return `${h}h`;
        return `${m}m`;
    };

    const calculateSessionDuration = (session: any) => {
        if (session.durationSeconds) {
            const h = Math.floor(session.durationSeconds / 3600);
            const m = Math.floor((session.durationSeconds % 3600) / 60);
            if (h > 0 && m > 0) return `${h}h ${m}m`;
            if (h > 0) return `${h}h`;
            return `${m}m`;
        }
        return '';
    };

    const formatTimeFromISO = (isoString?: string) => {
        if (!isoString) return '';
        const d = new Date(isoString);
        let hours = d.getHours();
        const m = d.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        return `${hours.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${ampm}`;
    };

    // Prepare lists depending on current tab
    const mappedSessions = sessions.filter(e => {
        if (!e.startTime) return false;
        const sessionDate = new Date(e.startTime).toISOString().split('T')[0];
        return sessionDate === selectedDate || selectedDate === 'ALL';
    }).map((item: any) => ({
        id: item.id?.toString() || Math.random().toString(),
        time: formatTimeFromISO(item.startTime),
        date: new Date(item.startTime).toISOString().split('T')[0],
        client: item.clientName || 'Assigned Client',
        address: 'See session details',
        service: item.serviceType || item.notes || 'Session',
        status: item.status,
        duration: calculateSessionDuration(item),
        type: 'session'
    }));

    const mappedAvailability = schedule.filter(e => e.date === selectedDate || selectedDate === 'ALL').map((item: any) => ({
        id: item.id?.toString() || Math.random().toString(),
        time: formatTime(item.startTime),
        date: item.date,
        client: 'Availability Slot',
        address: 'Online / Remote',
        service: 'My Availability',
        status: item.status === 'available' ? 'upcoming' : item.status,
        duration: calculateDuration(item.startTime, item.endTime),
        type: 'availability',
        rawStartTime: item.startTime,
        rawEndTime: item.endTime
    }));

    const displayList = activeTab === 'sessions' ? mappedSessions : mappedAvailability;

    const renderEventCard = ({ item }: { item: any }) => {
        const isEditable = item.status === 'upcoming' && item.client === 'Availability Slot';

        const cardContent = (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: '#000', marginBottom: 0 }]}>
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

        if (isEditable) {
            return (
                <SwipeableRow 
                    onEdit={() => handleEditPress(item)} 
                    onDelete={() => handleDelete(item.id)}
                >
                    {cardContent}
                </SwipeableRow>
            );
        }

        return <View style={{ marginBottom: 16 }}>{cardContent}</View>;
    };

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
                {/* TABS COMPONENT */}
                <View style={styles.tabContainer}>
                    <TouchableOpacity 
                        style={[styles.tabBtn, activeTab === 'sessions' && { backgroundColor: COLORS.primary }]} 
                        onPress={() => setActiveTab('sessions')}
                    >
                        <Text style={[styles.tabText, activeTab === 'sessions' && styles.tabTextActive]}>Upcoming Visits</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.tabBtn, activeTab === 'availability' && { backgroundColor: COLORS.primary }]} 
                        onPress={() => setActiveTab('availability')}
                    >
                        <Text style={[styles.tabText, activeTab === 'availability' && styles.tabTextActive]}>My Availability</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.listHeader}>
                    <Text style={[styles.listTitle, { color: colors.text }]}>
                        {activeTab === 'sessions' ? 'Assigned Sessions' : 'Open Slots'}
                    </Text>
                    <Text style={[styles.listCount, { color: colors.secondaryText }]}>{displayList.length} total</Text>
                </View>

                {displayList.length > 0 ? (
                    <FlatList
                        data={displayList}
                        renderItem={renderEventCard}
                        keyExtractor={item => item.id}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                    />
                ) : (
                    <View style={styles.emptyState}>
                        <CalendarIcon size={48} color={COLORS.borderLight} />
                        <Text style={[styles.emptyText, { color: colors.secondaryText }]}>
                            {activeTab === 'sessions' ? 'No visits assigned for this day.' : 'No availability slots opened.'}
                        </Text>
                        <TouchableOpacity style={styles.emptyBtn} onPress={handleAddPress}>
                            <Text style={styles.emptyBtnText}>
                                {activeTab === 'sessions' ? 'Refresh Schedule' : 'Add Availability'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {/* Modals for Edit functionality */}
            {showEditModal && (
                <Modal transparent visible={showEditModal} animationType="fade">
                    <View style={styles.modalOverlay}>
                        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                            <View style={styles.modalHeader}>
                                <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Slot</Text>
                                <TouchableOpacity onPress={() => setShowEditModal(false)}>
                                    <X size={24} color={colors.secondaryText} />
                                </TouchableOpacity>
                            </View>
                            
                            <View style={{ marginBottom: 20 }}>
                                <Text style={[styles.modalLabel, { color: colors.text }]}>Start Time</Text>
                                <TouchableOpacity
                                    style={[styles.inputBox, { backgroundColor: colors.card, borderColor: colors.border }]}
                                    onPress={() => setShowEditStartPicker(true)}
                                >
                                    <Clock size={20} color={colors.secondaryText} style={{ marginRight: 8 }} />
                                    <Text style={[styles.inputText, { color: colors.text }]}>{editStartTime}</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={{ marginBottom: 24 }}>
                                <Text style={[styles.modalLabel, { color: colors.text }]}>End Time</Text>
                                <TouchableOpacity
                                    style={[styles.inputBox, { backgroundColor: colors.card, borderColor: colors.border }]}
                                    onPress={() => setShowEditEndPicker(true)}
                                >
                                    <Clock size={20} color={colors.secondaryText} style={{ marginRight: 8 }} />
                                    <Text style={[styles.inputText, { color: colors.text }]}>{editEndTime}</Text>
                                </TouchableOpacity>
                            </View>
                            
                            <View style={{ flexDirection: 'row', gap: 12 }}>
                                <TouchableOpacity 
                                    style={[styles.modalBtn, { flex: 1, backgroundColor: 'transparent', borderColor: COLORS.primary, borderWidth: 1 }]}
                                    onPress={() => setShowEditModal(false)}
                                >
                                    <Text style={{ color: COLORS.primary, fontFamily: FONTS.bold, textAlign: 'center' }}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.modalBtn, { flex: 1, backgroundColor: COLORS.primary }]}
                                    onPress={handleSaveEdit}
                                >
                                    <Text style={{ color: '#FFF', fontFamily: FONTS.bold, textAlign: 'center' }}>Save</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            )}

            {showEditStartPicker && (
                <Modal transparent visible={showEditStartPicker} animationType="fade">
                    <View style={styles.modalOverlay}>
                        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                            <View style={styles.modalHeader}>
                                <Text style={[styles.modalTitle, { color: colors.text }]}>Start Time</Text>
                                <TouchableOpacity onPress={() => setShowEditStartPicker(false)}>
                                    <X size={24} color={colors.secondaryText} />
                                </TouchableOpacity>
                            </View>
                            <FlatList
                                data={TIME_SLOTS}
                                keyExtractor={(item) => item}
                                style={{ maxHeight: 300 }}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={[styles.timeSlot, { borderBottomColor: colors.border }]}
                                        onPress={() => {
                                            setEditStartTime(item);
                                            setShowEditStartPicker(false);
                                        }}
                                    >
                                        <Text style={[styles.timeText, { color: colors.text }]}>{item}</Text>
                                    </TouchableOpacity>
                                )}
                            />
                        </View>
                    </View>
                </Modal>
            )}

            {showEditEndPicker && (
                <Modal transparent visible={showEditEndPicker} animationType="fade">
                    <View style={styles.modalOverlay}>
                        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                            <View style={styles.modalHeader}>
                                <Text style={[styles.modalTitle, { color: colors.text }]}>End Time</Text>
                                <TouchableOpacity onPress={() => setShowEditEndPicker(false)}>
                                    <X size={24} color={colors.secondaryText} />
                                </TouchableOpacity>
                            </View>
                            <FlatList
                                data={TIME_SLOTS}
                                keyExtractor={(item) => item}
                                style={{ maxHeight: 300 }}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={[styles.timeSlot, { borderBottomColor: colors.border }]}
                                        onPress={() => {
                                            setEditEndTime(item);
                                            setShowEditEndPicker(false);
                                        }}
                                    >
                                        <Text style={[styles.timeText, { color: colors.text }]}>{item}</Text>
                                    </TouchableOpacity>
                                )}
                            />
                        </View>
                    </View>
                </Modal>
            )}

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
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#E5E7EB', // Light generic color, you can change based on theme
        borderRadius: 12,
        padding: 4,
        marginBottom: 20,
    },
    tabBtn: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 8,
    },
    tabText: {
        fontSize: 14,
        fontFamily: FONTS.semiBold,
        color: '#6B7280',
    },
    tabTextActive: {
        color: '#FFF',
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
        paddingRight: 32, // make room for delete btn
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
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 24,
    },
    modalContent: {
        borderRadius: 16,
        padding: 20,
        maxHeight: 450,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    modalTitle: {
        fontSize: 18,
        fontFamily: FONTS.bold,
    },
    modalLabel: {
        fontSize: 14,
        fontFamily: FONTS.bold,
        marginBottom: 8,
    },
    inputBox: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 50,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 16,
    },
    inputText: {
        fontSize: 16,
        fontFamily: FONTS.medium,
    },
    modalBtn: {
        paddingVertical: 14,
        borderRadius: 12,
    },
    timeSlot: {
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    timeText: {
        fontSize: 16,
        fontFamily: FONTS.medium,
        textAlign: 'center',
    }
});
