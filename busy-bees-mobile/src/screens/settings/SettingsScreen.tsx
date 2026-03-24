import React from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, Alert, TouchableOpacity } from 'react-native';
import { DashboardHeader } from '../../components/DashboardHeader';
import { ScreenLayout } from '../../components/ScreenLayout';
import { useAppStore } from '../../store/useAppStore';
import { COLORS, FONTS } from '../../constants/theme';
import { User, Moon, LogOut, ChevronRight, Shield, Bell, HelpCircle } from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';

import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';

export const SettingsScreen = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { user, logout } = useAppStore();
    const { colors, isDarkMode } = useTheme();

    const handleLogout = () => {
        Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign Out', onPress: logout, style: 'destructive' }
        ]);
    };

    const menuContainerStyle = [styles.menuContainer, { backgroundColor: colors.card, borderColor: colors.border }];
    const textStyle = { color: colors.text };

    return (
        <ScreenLayout>
            <DashboardHeader />

            <ScrollView contentContainerStyle={styles.scroll}>
                <View style={styles.header}>
                    <Text style={[styles.title, textStyle]}>Settings</Text>
                </View>

                {/* Preferences */}

                {/* Preferences */}
                <Text style={styles.sectionHeader}>PREFERENCES</Text>
                <View style={menuContainerStyle}>
                    <View style={styles.menuItem}>
                        <View style={styles.menuLeft}>
                            <View style={[styles.iconBox, { backgroundColor: isDarkMode ? '#334155' : '#EEF2FF' }]}>
                                <Moon size={20} color={COLORS.primary} />
                            </View>
                            <Text style={[styles.menuText, textStyle]}>Dark Mode</Text>
                        </View>
                        <Switch
                            value={useAppStore(state => state.isDarkMode)}
                            onValueChange={(val) => useAppStore.getState().toggleDarkMode(val)}
                            trackColor={{ false: COLORS.borderLight, true: COLORS.primary }}
                        />
                    </View>
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                    <View style={styles.menuItem}>
                        <View style={styles.menuLeft}>
                            <View style={[styles.iconBox, { backgroundColor: isDarkMode ? '#064e3b' : '#ECFDF5' }]}>
                                <Bell size={20} color={COLORS.success} />
                            </View>
                            <Text style={[styles.menuText, textStyle]}>Notifications</Text>
                        </View>
                        <Switch
                            value={useAppStore(state => state.notificationsEnabled)}
                            onValueChange={(val) => useAppStore.getState().toggleNotifications(val)}
                            trackColor={{ false: COLORS.borderLight, true: COLORS.primary }}
                        />
                    </View>
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                    <View style={styles.menuItem}>
                        <View style={styles.menuLeft}>
                            <View style={[styles.iconBox, { backgroundColor: isDarkMode ? '#1e3a8a' : '#EFF6FF' }]}>
                                {/* Use LocateFixed or MapPin for coordinates icon */}
                                <Shield size={20} color={COLORS.primary} />
                            </View>
                            <Text style={[styles.menuText, textStyle]}>Show Coordinates</Text>
                        </View>
                        <Switch
                            value={useAppStore(state => state.showCoordinates)}
                            onValueChange={(val) => useAppStore.getState().toggleShowCoordinates(val)}
                            trackColor={{ false: COLORS.borderLight, true: COLORS.primary }}
                        />
                    </View>
                </View>

                {/* Account */}
                <Text style={styles.sectionHeader}>ACCOUNT</Text>
                <View style={menuContainerStyle}>
                    <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('EditProfile')}>
                        <View style={styles.menuLeft}>
                            <View style={[styles.iconBox, { backgroundColor: isDarkMode ? '#374151' : '#F3F4F6' }]}>
                                <User size={20} color={isDarkMode ? '#9ca3af' : COLORS.textLight} />
                            </View>
                            <Text style={[styles.menuText, textStyle]}>Edit Profile</Text>
                        </View>
                        <ChevronRight size={20} color={colors.secondaryText} />
                    </TouchableOpacity>

                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    <TouchableOpacity style={styles.menuItem}>
                        <View style={styles.menuLeft}>
                            <View style={[styles.iconBox, { backgroundColor: isDarkMode ? '#431407' : '#FFF7ED' }]}>
                                <Shield size={20} color={COLORS.warning} />
                            </View>
                            <Text style={[styles.menuText, textStyle]}>Privacy & Security</Text>
                        </View>
                        <ChevronRight size={20} color={colors.secondaryText} />
                    </TouchableOpacity>

                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    <TouchableOpacity style={styles.menuItem}>
                        <View style={styles.menuLeft}>
                            <View style={[styles.iconBox, { backgroundColor: isDarkMode ? '#172554' : '#EFF6FF' }]}>
                                <HelpCircle size={20} color={colors.secondaryText} />
                            </View>
                            <Text style={[styles.menuText, textStyle]}>Help & Support</Text>
                        </View>
                        <ChevronRight size={20} color={colors.secondaryText} />
                    </TouchableOpacity>
                </View>

                <TouchableOpacity style={[styles.logoutBtn, isDarkMode && { backgroundColor: '#450a0a', borderColor: '#7f1d1d' }]} onPress={handleLogout}>
                    <LogOut size={20} color={COLORS.error} />
                    <Text style={styles.logoutText}>Sign Out</Text>
                </TouchableOpacity>

                <Text style={styles.version}>Version 1.0.0 (MVP)</Text>

            </ScrollView>
        </ScreenLayout>
    );
};

const styles = StyleSheet.create({
    header: {
        marginBottom: 24,
        marginTop: 8,
    },
    title: {
        fontSize: 28,
        fontFamily: FONTS.bold,
        color: COLORS.textLight,
    },
    scroll: {
        paddingHorizontal: 24,
        paddingBottom: 40,
    },
    profileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        backgroundColor: COLORS.white,
        borderRadius: 20,
        marginBottom: 32,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 4,
    },
    avatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: COLORS.borderLight,
    },
    profileInfo: {
        marginLeft: 16,
    },
    name: {
        fontSize: 18,
        fontFamily: FONTS.bold,
        color: COLORS.textLight,
        marginBottom: 4,
    },
    email: {
        fontSize: 14,
        fontFamily: FONTS.medium,
        color: COLORS.secondaryTextLight,
        marginBottom: 8,
    },
    roleContainer: {
        backgroundColor: COLORS.textLight, // Dark bg for tag
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        alignSelf: 'flex-start',
    },
    role: {
        fontSize: 10,
        color: COLORS.white,
        fontFamily: FONTS.bold,
        letterSpacing: 0.5,
    },
    sectionHeader: {
        fontSize: 12,
        fontFamily: FONTS.bold,
        color: COLORS.secondaryTextLight,
        marginBottom: 12,
        marginLeft: 8,
        letterSpacing: 1,
    },
    menuContainer: {
        backgroundColor: COLORS.white,
        borderRadius: 16,
        paddingHorizontal: 16,
        marginBottom: 32,
        borderWidth: 1,
        borderColor: COLORS.borderLight,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
    },
    menuLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    iconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    menuText: {
        fontSize: 16,
        fontFamily: FONTS.medium,
        color: COLORS.textLight,
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.backgroundLight,
    },
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#FEF2F2',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#FEE2E2',
    },
    logoutText: {
        fontSize: 16,
        fontFamily: FONTS.bold,
        color: COLORS.error,
    },
    version: {
        textAlign: 'center',
        marginTop: 24,
        color: COLORS.secondaryTextLight,
        fontSize: 12,
        fontFamily: FONTS.medium,
    }
});
