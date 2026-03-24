import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground, Image } from 'react-native';
import { useAppStore } from '../../store/useAppStore';
import { COLORS, FONTS } from '../../constants/theme';
import { Fingerprint } from 'lucide-react-native';

// Google Logo SVG (simplified as View/Text for now or use image)
const GoogleLogo = () => (
    <View style={styles.googleIcon}>
        {/* Simple colored blocks to mimic Google G */}
        <View style={[styles.gBlock, { backgroundColor: '#4285F4', top: 0, left: 0 }]} />
        <View style={[styles.gBlock, { backgroundColor: '#34A853', top: 0, right: 0 }]} />
        <View style={[styles.gBlock, { backgroundColor: '#FBBC05', bottom: 0, right: 0 }]} />
        <View style={[styles.gBlock, { backgroundColor: '#EA4335', bottom: 0, left: 0 }]} />
    </View>
);

export const LoginScreen = () => {
    const login = useAppStore((state) => state.login);

    const handleGoogleLogin = () => {
        login({
            id: 'mock-user-1',
            name: 'Alex Johnson',
            email: 'alex@busybees.com',
            avatarUrl: 'https://ui-avatars.com/api/?name=Alex+Johnson&background=137fec&color=fff',
        });
    };

    return (
        <View style={styles.container}>
            <View style={styles.card}>

                {/* Header Section */}
                <View style={styles.headerContent}>
                    <View style={styles.logoContainer}>
                        <Image
                            source={require('../../../assets/logo.png')}
                            style={styles.logo}
                            resizeMode="contain"
                        />
                    </View>
                    <Text style={styles.title}>Busy Bees LBA</Text>
                    <Text style={styles.subtitle}>Sign in to track your sessions</Text>
                </View>

                {/* Form Section */}
                <View style={styles.formContainer}>
                    <TouchableOpacity style={styles.googleBtn} onPress={handleGoogleLogin} activeOpacity={0.8}>
                        {/* Mock Google Icon */}
                        <View style={{ width: 18, height: 18, marginRight: 12, borderRadius: 9, overflow: 'hidden', position: 'relative' }}>
                            <View style={{ position: 'absolute', width: 18, height: 9, backgroundColor: '#EA4335', top: 0 }} />
                            <View style={{ position: 'absolute', width: 18, height: 9, backgroundColor: '#34A853', bottom: 0 }} />
                            <View style={{ position: 'absolute', width: 9, height: 18, backgroundColor: '#FBBC05', left: 0, borderTopRightRadius: 10, transform: [{ rotate: '45deg' }] }} />
                            <View style={{ position: 'absolute', width: 10, height: 10, backgroundColor: '#4285F4', right: 0, top: 0, borderBottomLeftRadius: 10 }} />
                            {/* Simplified G Mock */}
                            <View style={{ position: 'absolute', inset: 4, backgroundColor: '#fff', borderRadius: 10 }} />
                            <View style={{ position: 'absolute', right: 2, top: 8, width: 8, height: 2, backgroundColor: '#4285F4' }} />
                        </View>
                        <Text style={styles.googleBtnText}>Continue with Google</Text>
                    </TouchableOpacity>
                    <Text style={styles.secureText}>Secure sign-on via your corporate account</Text>
                </View>

                {/* Footer Actions */}
                <View style={styles.footer}>
                    <TouchableOpacity style={styles.bioBtn} onPress={handleGoogleLogin}>
                        <View style={styles.bioIconCircle}>
                            <Fingerprint size={32} color={COLORS.secondaryTextLight} />
                        </View>
                        <Text style={styles.bioText}>Sign in with Biometrics</Text>
                    </TouchableOpacity>

                    <View style={styles.helpLinkContainer}>
                        <Text style={styles.helpText}>Having trouble? </Text>
                        <TouchableOpacity>
                            <Text style={styles.linkText}>Need help?</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Background Overlay (matches the design code optional BG image) */}
                {/* We keep it simple white card on gray bg as per container styles */}

            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.backgroundLight,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    card: {
        width: '100%',
        maxWidth: 480,
        backgroundColor: COLORS.white,
        borderRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 8,
        minHeight: 600,
        overflow: 'hidden',
        alignItems: 'center',
        paddingVertical: 48,
    },
    headerContent: {
        alignItems: 'center',
        marginBottom: 32,
        width: '100%',
    },
    logoContainer: {
        width: 150,
        height: 150,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    logo: {
        width: '100%',
        height: '100%',
    },
    title: {
        fontFamily: FONTS.bold,
        fontSize: 24,
        color: COLORS.textLight,
        marginBottom: 4,
    },
    subtitle: {
        fontFamily: FONTS.medium,
        fontSize: 14,
        color: COLORS.secondaryTextLight,
    },
    formContainer: {
        width: '100%',
        paddingHorizontal: 24,
        marginBottom: 40,
    },
    googleBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 56,
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: COLORS.borderLight,
        borderRadius: 8,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    googleBtnText: {
        fontFamily: FONTS.medium,
        fontSize: 16,
        color: '#3c4043',
    },
    secureText: {
        textAlign: 'center',
        fontSize: 12,
        color: COLORS.secondaryTextLight,
        fontFamily: FONTS.regular,
    },
    footer: {
        marginTop: 'auto', // Push to bottom if container was flex
        alignItems: 'center',
        paddingBottom: 24,
        gap: 32,
    },
    bioBtn: {
        alignItems: 'center',
        gap: 8,
    },
    bioIconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        borderWidth: 1,
        borderColor: COLORS.borderLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    bioText: {
        fontSize: 14,
        fontWeight: '500',
        color: COLORS.secondaryTextLight,
        fontFamily: FONTS.medium,
    },
    helpLinkContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    helpText: {
        fontSize: 14,
        color: COLORS.secondaryTextLight,
        fontFamily: FONTS.regular,
    },
    linkText: {
        fontSize: 14,
        color: COLORS.primary,
        fontFamily: FONTS.semiBold,
    },
    googleIcon: {
        width: 18,
        height: 18,
        marginRight: 12,
    },
    gBlock: {
        position: 'absolute',
        width: 9,
        height: 9,
    }
});
