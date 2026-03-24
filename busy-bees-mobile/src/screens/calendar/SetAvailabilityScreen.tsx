import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Modal, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../../types/navigation';
import { ScreenLayout } from '../../components/ScreenLayout';
import { Button } from '../../components/Button';
import { useTheme } from '../../hooks/useTheme';
import { COLORS, FONTS } from '../../constants/theme';
import { useAppStore } from '../../store/useAppStore';
import { saveAvailability } from '../../utils/api';
import { Clock, Calendar as CalendarIcon, X, Trash } from 'lucide-react-native';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const TIME_SLOTS = [
    '08:00 AM', '08:30 AM', '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM',
    '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM',
    '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM',
    '05:00 PM', '05:30 PM', '06:00 PM'
];

export const SetAvailabilityScreen = () => {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<NavigationProp>();
    const { colors, isDarkMode } = useTheme();
    const { availability, setAvailability, user } = useAppStore();

    // State
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [startTime, setStartTime] = useState('09:00 AM');
    const [endTime, setEndTime] = useState('05:00 PM');
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [loading, setLoading] = useState(false);

    // Multi-slot state
    const [availabilitySlots, setAvailabilitySlots] = useState<any[]>(availability || []);

    // Generate next 30 days for picker
    const getNext30Days = () => {
        const days = [];
        const today = new Date();
        for (let i = 0; i < 30; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() + i);
            days.push(d.toISOString().split('T')[0]);
        }
        return days;
    };

    const DATES = getNext30Days();

    const handleAddSlot = () => {
        const newSlot = {
            id: Date.now().toString(),
            date: selectedDate,
            startTime,
            endTime
        };
        setAvailabilitySlots([...availabilitySlots, newSlot]);
        Alert.alert('Slot Added', 'Detailed added to your list.');
    };

    const handleRemoveSlot = (id: string) => {
        setAvailabilitySlots(availabilitySlots.filter(slot => slot.id !== id));
    };

    const handleSave = async () => {
        if (availabilitySlots.length === 0) {
            Alert.alert('No Slots', 'Please add at least one availability slot.');
            return;
        }
        if (!user) {
            Alert.alert('Error', 'No active user found.');
            return;
        }

        setLoading(true);
        try {
            // Because JSON server doesn't support bulk post easily out of the box,
            // we will loop and post them individually, or we could just do it via promise map.
            const promises = availabilitySlots.map(slot =>
                saveAvailability({
                    id: slot.id, // using the generated timestamp string
                    employeeId: user.employeeId || user.id,
                    date: slot.date,
                    startTime: slot.startTime,
                    endTime: slot.endTime
                })
            );

            await Promise.all(promises);

            // Still update local store for immediate UI reflection if needed
            setAvailability(availabilitySlots);

            Alert.alert('Success', `Saved ${availabilitySlots.length} availability slots successfully`, [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);
        } catch (error) {
            console.error('Save Availability Error:', error);
            Alert.alert('Error', 'Failed to save availability to the server.');
        } finally {
            setLoading(false);
        }
    };

    const TimePickerModal = ({ visible, onClose, onSelect, title, data }: any) => (
        <Modal transparent visible={visible} animationType="fade">
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                    <View style={styles.modalHeader}>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>{title}</Text>
                        <TouchableOpacity onPress={onClose}>
                            <X size={24} color={colors.secondaryText} />
                        </TouchableOpacity>
                    </View>
                    <FlatList
                        data={data}
                        keyExtractor={(item) => item}
                        style={{ maxHeight: 300 }}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={[styles.timeSlot, { borderBottomColor: colors.border }]}
                                onPress={() => {
                                    onSelect(item);
                                    onClose();
                                }}
                            >
                                <Text style={[styles.timeText, { color: colors.text }]}>{item}</Text>
                            </TouchableOpacity>
                        )}
                    />
                </View>
            </View>
        </Modal>
    );

    return (
        <ScreenLayout useSafePadding={false}>
            <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: 10 }]}>
                <View style={styles.header}>
                    <Text style={[styles.subtitle, { color: colors.secondaryText }]}>
                        Add one or more time slots when you are available.
                    </Text>
                </View>

                {/* Input Section */}
                <View style={styles.inputContainer}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>New Slot</Text>

                    {/* Date Selection */}
                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: colors.text }]}>Date</Text>
                        <TouchableOpacity
                            style={[styles.inputBox, { backgroundColor: colors.card, borderColor: colors.border }]}
                            onPress={() => setShowDatePicker(true)}
                        >
                            <CalendarIcon size={20} color={colors.secondaryText} style={styles.icon} />
                            <Text style={[styles.inputText, { color: colors.text }]}>{selectedDate}</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.row}>
                        {/* Start Time */}
                        <View style={[styles.inputGroup, { flex: 1, marginRight: 12 }]}>
                            <Text style={[styles.label, { color: colors.text }]}>Start Time</Text>
                            <TouchableOpacity
                                style={[styles.inputBox, { backgroundColor: colors.card, borderColor: colors.border }]}
                                onPress={() => setShowStartPicker(true)}
                            >
                                <Clock size={20} color={colors.secondaryText} style={styles.icon} />
                                <Text style={[styles.inputText, { color: colors.text }]}>{startTime}</Text>
                            </TouchableOpacity>
                        </View>

                        {/* End Time */}
                        <View style={[styles.inputGroup, { flex: 1 }]}>
                            <Text style={[styles.label, { color: colors.text }]}>End Time</Text>
                            <TouchableOpacity
                                style={[styles.inputBox, { backgroundColor: colors.card, borderColor: colors.border }]}
                                onPress={() => setShowEndPicker(true)}
                            >
                                <Clock size={20} color={colors.secondaryText} style={styles.icon} />
                                <Text style={[styles.inputText, { color: colors.text }]}>{endTime}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <Button
                        title="Add Slot"
                        onPress={handleAddSlot}
                        style={{ marginTop: 12, backgroundColor: COLORS.primary }}
                        textStyle={{ color: '#FFF' }}
                    />
                </View>

                {/* Divider */}
                <View style={styles.divider} />

                {/* Added Slots List */}
                {availabilitySlots.length > 0 && (
                    <View style={styles.slotsContainer}>
                        <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 16 }]}>
                            Added Slots ({availabilitySlots.length})
                        </Text>
                        {availabilitySlots.map((slot) => (
                            <View
                                key={slot.id}
                                style={[styles.slotCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                            >
                                <View>
                                    <Text style={[styles.slotDate, { color: colors.text }]}>{slot.date}</Text>
                                    <Text style={[styles.slotTime, { color: colors.secondaryText }]}>
                                        {slot.startTime} - {slot.endTime}
                                    </Text>
                                </View>
                                <TouchableOpacity onPress={() => handleRemoveSlot(slot.id)} style={styles.removeBtn}>
                                    <Trash size={20} color={COLORS.error} />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                )}

                <View style={styles.actions}>
                    <Button
                        title={`Save All (${availabilitySlots.length})`}
                        onPress={handleSave}
                        isLoading={loading}
                        disabled={availabilitySlots.length === 0}
                        style={{ opacity: availabilitySlots.length === 0 ? 0.5 : 1, backgroundColor: COLORS.primary }}
                        textStyle={{ color: '#FFF' }}
                    />
                    <Button
                        title="Cancel"
                        variant="outline"
                        onPress={() => navigation.goBack()}
                        style={{ marginTop: 12, borderColor: COLORS.primary }}
                        textStyle={{ color: COLORS.primary }}
                    />
                </View>

                {/* Modals */}
                <TimePickerModal
                    visible={showStartPicker}
                    onClose={() => setShowStartPicker(false)}
                    onSelect={setStartTime}
                    title="Select Start Time"
                    data={TIME_SLOTS}
                />
                <TimePickerModal
                    visible={showEndPicker}
                    onClose={() => setShowEndPicker(false)}
                    onSelect={setEndTime}
                    title="Select End Time"
                    data={TIME_SLOTS}
                />
                <TimePickerModal
                    visible={showDatePicker}
                    onClose={() => setShowDatePicker(false)}
                    onSelect={setSelectedDate}
                    title="Select Date"
                    data={DATES}
                />
            </ScrollView>
        </ScreenLayout>
    );
};

const styles = StyleSheet.create({
    scroll: {
        paddingHorizontal: 24,
        paddingBottom: 24,
        paddingTop: 0,
        flexGrow: 1, // Push content to fill space
    },
    header: {
        marginBottom: 0,
    },
    title: {
        fontSize: 28,
        fontFamily: FONTS.bold,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        fontFamily: FONTS.medium,
    },
    inputContainer: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: FONTS.bold,
        marginBottom: 16,
    },
    inputGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontFamily: FONTS.bold,
        marginBottom: 8,
    },
    inputBox: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 56,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 16,
    },
    icon: {
        marginRight: 12,
    },
    inputText: {
        fontSize: 16,
        fontFamily: FONTS.medium,
    },
    row: {
        flexDirection: 'row',
        marginBottom: 16,
        gap: 12
    },
    divider: {
        height: 1,
        backgroundColor: '#E5E7EB', // COLORS.borderLight equivalent or use from theme
        marginVertical: 24,
    },
    slotsContainer: {
        marginBottom: 32,
    },
    slotCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 12,
    },
    slotDate: {
        fontSize: 16,
        fontFamily: FONTS.bold,
        marginBottom: 4,
    },
    slotTime: {
        fontSize: 14,
        fontFamily: FONTS.medium,
    },
    removeBtn: {
        padding: 8,
    },
    actions: {
        marginTop: 'auto', // Push to bottom
        marginBottom: 20
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 24,
    },
    modalContent: {
        borderRadius: 16,
        padding: 20,
        maxHeight: 400,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB', // Default light border, component override in render
    },
    modalTitle: {
        fontSize: 18,
        fontFamily: FONTS.bold,
    },
    timeSlot: {
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    timeText: {
        fontSize: 16,
        fontFamily: FONTS.medium,
        textAlign: 'center',
    },
});
