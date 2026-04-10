import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { COLORS, FONTS } from '../../constants/theme';
import { ClipboardCheck, BarChart2, CheckSquare, X } from 'lucide-react-native';

const FORM_TEMPLATES = [
    {
        id: 'baseline_form',
        name: 'Baseline Form',
        description: 'Track skill introduction, mastery, and generalization',
        icon: ClipboardCheck,
        color: '#f59e0b',
        route: 'BaselineSheet' as const,
    },
    {
        id: 'mass_trial',
        name: 'Mass Trial / DTT',
        description: 'Discrete Trial Training — 5 trials per STO per session',
        icon: BarChart2,
        color: '#6366f1',
        route: 'MassTrial' as const,
    },
    {
        id: 'daily_routines',
        name: 'Daily Routines Form',
        description: 'Track correct responses over opportunities for daily routines',
        icon: CheckSquare,
        color: '#ec4899',
        route: 'DailyRoutines' as const,
    },
    {
        id: 'transaction_form',
        name: 'Transaction Form',
        description: 'Log and track location transitions and client behaviors',
        icon: ClipboardCheck,
        color: '#10b981',
        route: 'TransactionSheet' as const,
    },
];

export const DocumentTemplatePickerModal = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

    const handleSelect = (route: 'BaselineSheet' | 'MassTrial' | 'DailyRoutines' | 'TransactionSheet') => {
        navigation.replace(route);
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Select Form</Text>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
                    <X size={24} color={COLORS.textLight} />
                </TouchableOpacity>
            </View>
            <Text style={styles.subtitle}>
                Choose the form you need to fill out for this session. Data will be saved to the web application automatically.
            </Text>

            <FlatList
                data={FORM_TEMPLATES}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.list}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={styles.item}
                        onPress={() => handleSelect(item.route)}
                        activeOpacity={0.75}
                    >
                        <View style={[styles.iconBox, { backgroundColor: `${item.color}18` }]}>
                            <item.icon size={26} color={item.color} />
                        </View>
                        <View style={styles.itemInfo}>
                            <Text style={styles.itemName}>{item.name}</Text>
                            <Text style={styles.itemDesc}>{item.description}</Text>
                        </View>
                        <Text style={styles.arrow}>›</Text>
                    </TouchableOpacity>
                )}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.backgroundLight,
        paddingTop: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingBottom: 8,
    },
    closeBtn: { padding: 4 },
    title: {
        fontSize: 22,
        fontFamily: FONTS.bold,
        color: COLORS.textLight,
    },
    subtitle: {
        fontSize: 13,
        fontFamily: FONTS.regular,
        color: COLORS.secondaryTextLight,
        paddingHorizontal: 24,
        paddingBottom: 20,
        lineHeight: 18,
    },
    list: {
        paddingHorizontal: 24,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        marginBottom: 14,
        padding: 18,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 2,
    },
    iconBox: {
        width: 52,
        height: 52,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    itemInfo: { flex: 1 },
    itemName: {
        fontSize: 16,
        fontFamily: FONTS.semiBold,
        color: COLORS.textLight,
        marginBottom: 4,
    },
    itemDesc: {
        fontSize: 12,
        fontFamily: FONTS.regular,
        color: COLORS.secondaryTextLight,
    },
    arrow: {
        fontSize: 24,
        color: COLORS.borderLight,
        fontFamily: FONTS.bold,
    },
});
