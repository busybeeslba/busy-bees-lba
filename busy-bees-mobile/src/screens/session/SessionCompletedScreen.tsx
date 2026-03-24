import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { COLORS, FONTS } from '../../constants/theme';
import { CheckCircle, Home, Clock } from 'lucide-react-native';

import { useTheme } from '../../hooks/useTheme';

export const SessionCompletedScreen = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { colors } = useTheme();

    const handleHome = () => {
        navigation.reset({
            index: 0,
            routes: [{ name: 'Main' }],
        });
    };

    const handleHistory = () => {
        navigation.reset({
            index: 0,
            routes: [{ name: 'Main', params: { screen: 'History' } }],
        });
    };

    const footerStyle = [
        styles.footer,
        { backgroundColor: colors.card }
    ];

    const secondaryTextStyle = [
        styles.secondaryBtnText,
        { color: colors.secondaryText }
    ];

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <View style={styles.iconCircle}>
                    <CheckCircle size={64} color={COLORS.white} />
                </View>
                <Text style={styles.title}>All Done!</Text>
                <Text style={styles.subtitle}>
                    Session has been successfully completed and saved.
                </Text>
            </View>

            <View style={footerStyle}>
                <TouchableOpacity style={styles.primaryBtn} onPress={handleHome}>
                    <Home size={20} color={COLORS.primary} />
                    <Text style={styles.primaryBtnText}>Return to Dashboard</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.secondaryBtn} onPress={handleHistory}>
                    <Clock size={20} color={colors.secondaryText} />
                    <Text style={secondaryTextStyle}>View in History</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.primary,
        justifyContent: 'space-between',
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
    },
    iconCircle: {
        width: 100,
        height: 100,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 32,
    },
    title: {
        fontSize: 32,
        fontFamily: FONTS.bold,
        color: COLORS.white,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        fontFamily: FONTS.medium,
        color: 'rgba(255,255,255,0.8)',
        textAlign: 'center',
        lineHeight: 24,
    },
    footer: {
        backgroundColor: COLORS.white,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 32,
        gap: 16,
    },
    primaryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        height: 56,
        backgroundColor: 'rgba(19, 127, 236, 0.1)',
        borderRadius: 16,
    },
    primaryBtnText: {
        fontSize: 16,
        fontFamily: FONTS.bold,
        color: COLORS.primary,
    },
    secondaryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        height: 56,
    },
    secondaryBtnText: {
        fontSize: 16,
        fontFamily: FONTS.bold,
        color: COLORS.secondaryTextLight,
    }
});
