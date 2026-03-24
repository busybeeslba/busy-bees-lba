import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface BadgeProps {
    label: string;
    variant?: 'success' | 'warning' | 'neutral' | 'error';
}

export const Badge: React.FC<BadgeProps> = ({ label, variant = 'neutral' }) => {
    const getColors = () => {
        switch (variant) {
            case 'success': return { bg: '#E6F4EA', text: '#1E4620' };
            case 'warning': return { bg: '#FEF7E0', text: '#5C3C00' };
            case 'error': return { bg: '#FCE8E6', text: '#C5221F' };
            default: return { bg: '#F1F3F4', text: '#5F6368' };
        }
    };

    const colors = getColors();

    return (
        <View style={[styles.container, { backgroundColor: colors.bg }]}>
            <Text style={[styles.text, { color: colors.text }]}>{label}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 12,
        alignSelf: 'flex-start',
    },
    text: {
        fontSize: 12,
        fontWeight: '600',
    },
});
