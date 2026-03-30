import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground, Image, Alert } from 'react-native';
import { useAppStore } from '../../store/useAppStore';
import { COLORS, FONTS } from '../../constants/theme';
import { Fingerprint } from 'lucide-react-native';

import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase } from '../../lib/supabase';

WebBrowser.maybeCompleteAuthSession();

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
    const [isLoading, setIsLoading] = React.useState(false);

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        try {
            const redirectTo = makeRedirectUri({
                scheme: 'busybees',
                path: 'auth/callback',
            });
            console.log("Deep link redirect URL generated:", redirectTo);
            // Example output in Expo Go: exp://192.168.x.x:8081/--/auth/callback

            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo,
                    skipBrowserRedirect: true,
                }
            });

            if (error) throw error;

            if (data?.url) {
                const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo, { showInRecents: true });
                if (res.type === 'success') {
                    // Modern PKCE flow returns ?code=, deprecated Implicit flow returns #access_token=
                    const urlStr = res.url;
                    
                    const parsed = Linking.parse(urlStr);
                    const code = parsed.queryParams?.code as string;
                    
                    // In iOS, fragments (#) are sometimes parsed differently by Linking. 
                    // To be safe, we'll extract them natively if they exist.
                    const access_token = (parsed.queryParams?.access_token as string) || (urlStr.includes('access_token=') ? urlStr.split('access_token=')[1].split('&')[0] : null);
                    const refresh_token = (parsed.queryParams?.refresh_token as string) || (urlStr.includes('refresh_token=') ? urlStr.split('refresh_token=')[1].split('&')[0] : null);

                    let authUser = null;

                    if (code) {
                        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
                        if (error) throw error;
                        authUser = data.user;
                    } else if (access_token) {
                        const { data, error } = await supabase.auth.setSession({ access_token, refresh_token: refresh_token || '' });
                        if (error) throw error;
                        authUser = data.user;
                    } else {
                        throw new Error("Authentication payload missing required tokens from Google (No Code or Access Token).");
                    }
                    
                    if (authUser) {
                        if (!authUser.email) throw new Error("No email found in session.");

                        // Firewall Verification against `public.users` (with Timeout for dead iOS TCP sockets)
                        const fetchDbUser = supabase.from('users').select('*').eq('email', authUser.email).single();
                        const timeoutReq = new Promise<any>((_, reject) => setTimeout(() => reject(new Error("Network timeout: Could not verify firewall. Please close and reopen the app.")), 10000));
                        
                        const { data: dbUser, error: dbError } = await Promise.race([fetchDbUser, timeoutReq]);

                        if (dbError || !dbUser || dbUser.status !== 'Active') {
                            await supabase.auth.signOut();
                            throw new Error("Access Denied. Your Google account is not registered as an Active Employee.");
                        }

                        // Connect AppStore to Live User DB Properties
                        login({
                            id: String(dbUser.id),
                            name: `${dbUser.firstName} ${dbUser.lastName}`,
                            email: dbUser.email,
                            avatarUrl: dbUser.avatar || null,
                            phoneNumber: dbUser.phone || '',
                            employeeId: dbUser.employeeId || '',
                        });
                    }
                }
            }
        } catch (err: any) {
            Alert.alert('Sign In Error', err.message || 'An error occurred during sign in.');
        } finally {
            setIsLoading(false);
        }
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
                    <TouchableOpacity style={styles.googleBtn} onPress={handleGoogleLogin} activeOpacity={0.8} disabled={isLoading}>
                        {isLoading ? (
                            <Text style={styles.googleBtnText}>Checking Firewall...</Text>
                        ) : (
                            <>
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
                            </>
                        )}
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
