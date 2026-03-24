import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/theme';

interface ScreenLayoutProps {
    children: React.ReactNode;
    style?: ViewStyle;
    useSafePadding?: boolean;
}

import { useTheme } from '../hooks/useTheme';

export const ScreenLayout: React.FC<ScreenLayoutProps> = ({ children, style, useSafePadding = true }) => {
    const insets = useSafeAreaInsets();
    const { colors, isDarkMode } = useTheme();

    return (
        <View style={[styles.safeArea, { paddingTop: useSafePadding ? insets.top + 32 : 0, backgroundColor: colors.background }]}>
            <StatusBar style={isDarkMode ? "light" : "dark"} backgroundColor={colors.background} />
            <View style={[styles.container, style]}>{children}</View>
        </View>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: COLORS.backgroundLight,
    },
    container: {
        flex: 1,
    },
});
