import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { COLORS, FONTS } from '../constants/theme';

interface ButtonProps {
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'danger' | 'outline';
    size?: 'small' | 'medium' | 'large';
    isLoading?: boolean;
    disabled?: boolean;
    style?: ViewStyle;
    textStyle?: TextStyle;
    icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
    title,
    onPress,
    variant = 'primary',
    size = 'medium',
    isLoading = false,
    disabled = false,
    style,
    textStyle,
    icon,
}) => {
    const getBackgroundColor = () => {
        if (disabled) return COLORS.secondaryTextDark;
        switch (variant) {
            case 'primary': return COLORS.primary;
            case 'secondary': return COLORS.textLight;
            case 'danger': return COLORS.error;
            case 'outline': return 'transparent';
            default: return COLORS.primary;
        }
    };

    const getTextColor = () => {
        if (disabled) return '#E0E0E0';
        switch (variant) {
            case 'primary': return COLORS.white;
            case 'secondary': return COLORS.white;
            case 'danger': return COLORS.white;
            case 'outline': return COLORS.textLight;
            default: return COLORS.white;
        }
    };

    const getBorder = () => {
        if (variant === 'outline') {
            return { borderWidth: 1, borderColor: COLORS.borderLight };
        }
        return {};
    };

    return (
        <TouchableOpacity
            style={[
                styles.container,
                { backgroundColor: getBackgroundColor() },
                getBorder(),
                size === 'small' && styles.small,
                size === 'large' && styles.large,
                style,
            ]}
            onPress={onPress}
            disabled={disabled || isLoading}
            activeOpacity={0.8}
        >
            {isLoading ? (
                <ActivityIndicator color={getTextColor()} />
            ) : (
                <>
                    {icon}
                    <Text style={[styles.text, { color: getTextColor(), marginLeft: icon ? 8 : 0 }, textStyle]}>
                        {title}
                    </Text>
                </>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 12,
        minHeight: 48,
    },
    text: {
        fontFamily: FONTS.bold,
        fontSize: 16,
    },
    small: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        minHeight: 36,
    },
    large: {
        paddingVertical: 16,
        paddingHorizontal: 32,
        minHeight: 56,
    },
});
