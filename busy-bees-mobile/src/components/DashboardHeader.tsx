import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { COLORS, FONTS } from '../constants/theme';
import { Bell } from 'lucide-react-native';

import { useTheme } from '../hooks/useTheme';

export const DashboardHeader = () => {
    const user = useAppStore(state => state.user);
    const [imageError, setImageError] = React.useState(false);
    const { colors, isDarkMode } = useTheme();

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(part => part[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const containerStyle = [styles.container, { backgroundColor: colors.background, borderBottomColor: colors.border }];
    const nameStyle = [styles.name, { color: colors.text }];
    const bellBtnStyle = [styles.bellBtn, { backgroundColor: isDarkMode ? '#374151' : '#F3F4F6' }];

    return (
        <View style={containerStyle}>
            <View style={styles.profileSection}>
                {user?.avatarUrl && !imageError ? (
                    <Image
                        source={{ uri: user.avatarUrl }}
                        style={styles.avatar}
                        onError={() => setImageError(true)}
                    />
                ) : (
                    <View style={[styles.avatar, styles.fallbackAvatar]}>
                        <Text style={styles.initialsText}>
                            {user?.name ? getInitials(user.name) : '??'}
                        </Text>
                    </View>
                )}
                <View style={styles.textContainer}>
                    <Text style={styles.label}>EMPLOYEE PORTAL</Text>
                    <Text style={nameStyle}>{user?.name}</Text>
                </View>
            </View>
            {useAppStore(state => state.notificationsEnabled) && (
                <TouchableOpacity style={bellBtnStyle}>
                    <Bell size={20} color={colors.secondaryText} />
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: COLORS.backgroundLight,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.borderLight,
    },
    profileSection: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: COLORS.primary,
        marginRight: 12,
    },
    fallbackAvatar: {
        backgroundColor: '#FFD700', // Gold/Yellow like web
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 0, // No border for fallback to match web look usually, or keep consistent
    },
    initialsText: {
        fontFamily: FONTS.bold,
        fontSize: 16,
        color: COLORS.textDark,
    },
    textContainer: {
        justifyContent: 'center',
    },
    label: {
        fontSize: 10,
        fontFamily: FONTS.bold,
        color: COLORS.secondaryTextLight,
        letterSpacing: 0.5,
        marginBottom: 2,
    },
    name: {
        fontSize: 18,
        fontFamily: FONTS.bold,
        color: COLORS.textLight,
        lineHeight: 22,
    },
    bellBtn: {
        width: 40,
        height: 40,
        borderRadius: 8,
        backgroundColor: '#F3F4F6', // gray-100
        justifyContent: 'center',
        alignItems: 'center',
    }
});
