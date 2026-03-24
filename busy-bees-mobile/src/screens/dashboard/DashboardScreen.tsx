import React, { useEffect, useRef, useState } from 'react';
import {
    View, Text, StyleSheet, Animated, Alert,
    LayoutAnimation, UIManager, Platform,
} from 'react-native';
import { ScreenLayout } from '../../components/ScreenLayout';
import { DashboardHeader } from '../../components/DashboardHeader';
import { useAppStore } from '../../store/useAppStore';
import { COLORS, FONTS } from '../../constants/theme';
import {
    Play, MapPin, LocateFixed, Plus, Minus, Navigation,
    LogIn, LogOut, Clock, CheckCircle,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { TouchableOpacity } from 'react-native';
import * as Location from 'expo-location';
import { MapComponent } from '../../components/MapComponent';
import { useTheme } from '../../hooks/useTheme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface ClockInRecord {
    time: Date;
    address: string | null;
    lat: number | null;
    lng: number | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtTime = (d: Date) =>
    d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
const fmtDate = (d: Date) =>
    d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

// ── Component ─────────────────────────────────────────────────────────────────
export const DashboardScreen = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { isGPSActive, currentLocation, updateLocation, activeSession } = useAppStore();
    const locationInterval = useRef<NodeJS.Timeout | null>(null);
    const [permissionStatus, setPermissionStatus] = useState<string>('undetermined');

    // ── Clock In ──────────────────────────────────────────────────────────────
    const [clockInRecord, setClockInRecord] = useState<ClockInRecord | null>(null);
    const [clockingIn, setClockingIn] = useState(false);
    const [nowStr, setNowStr] = useState('');

    // Live running clock once clocked in
    useEffect(() => {
        if (!clockInRecord) return;
        setNowStr(fmtTime(new Date()));
        const t = setInterval(() => setNowStr(fmtTime(new Date())), 1000);
        return () => clearInterval(t);
    }, [clockInRecord]);

    const handleClockIn = async () => {
        setClockingIn(true);
        try {
            let lat: number | null = null;
            let lng: number | null = null;
            let address: string | null = null;

            const { status } = await Location.getForegroundPermissionsAsync();
            if (status === 'granted') {
                const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                lat = loc.coords.latitude;
                lng = loc.coords.longitude;
                try {
                    const [rev] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
                    if (rev) {
                        address = [rev.streetNumber, rev.street, rev.city].filter(Boolean).join(' ') || null;
                    }
                } catch { /* address is optional — silently ignore */ }
                updateLocation({ latitude: lat, longitude: lng, accuracy: loc.coords.accuracy || 5, timestamp: loc.timestamp });
            }

            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setClockInRecord({ time: new Date(), address, lat, lng });
        } catch {
            Alert.alert('Error', 'Could not capture location. Please try again.');
        } finally {
            setClockingIn(false);
        }
    };

    const handleClockOut = () => {
        Alert.alert(
            'Clock Out',
            'Are you sure you want to clock out? You will need to clock in again to start a new session.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Clock Out', style: 'destructive', onPress: () => {
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                        setClockInRecord(null);
                    },
                },
            ]
        );
    };
    // ─────────────────────────────────────────────────────────────────────────

    // ── GPS / Location ────────────────────────────────────────────────────────
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const { colors, isDarkMode } = useTheme();

    useEffect(() => {
        (async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                setPermissionStatus(status);
                if (status !== 'granted') return;
                const loc = await Location.getCurrentPositionAsync({});
                updateLocation({
                    latitude: loc.coords.latitude,
                    longitude: loc.coords.longitude,
                    accuracy: loc.coords.accuracy || 0,
                    timestamp: loc.timestamp,
                });
            } catch (error) {
                console.log('Error requesting permissions:', error);
            }
        })();
    }, []);

    useEffect(() => {
        let subscription: Location.LocationSubscription | null = null;
        if (isGPSActive) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 2, duration: 1000, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
                ])
            ).start();

            const startTracking = async () => {
                const { status } = await Location.getForegroundPermissionsAsync();
                if (status === 'granted') {
                    try {
                        subscription = await Location.watchPositionAsync(
                            { accuracy: Location.Accuracy.High, timeInterval: 2000, distanceInterval: 1 },
                            (loc) => updateLocation({
                                latitude: loc.coords.latitude,
                                longitude: loc.coords.longitude,
                                accuracy: loc.coords.accuracy || 5,
                                timestamp: loc.timestamp,
                            })
                        );
                    } catch (err) { console.log('Error watching position:', err); }
                } else {
                    locationInterval.current = setInterval(() => {
                        const rnd = () => (Math.random() - 0.5) * 0.0001;
                        updateLocation({ latitude: 37.7749 + rnd(), longitude: -122.4194 + rnd(), accuracy: 500, timestamp: Date.now() });
                    }, 3000);
                }
            };
            startTracking();
        } else {
            pulseAnim.setValue(1);
            if (subscription) (subscription as any).remove();
            if (locationInterval.current) clearInterval(locationInterval.current);
        }
        return () => {
            if (subscription) (subscription as any).remove();
            if (locationInterval.current) clearInterval(locationInterval.current);
        };
    }, [isGPSActive]);

    // ── Map controls ──────────────────────────────────────────────────────────
    const mapRef = useRef<any>(null);
    const [zoomLevel, setZoomLevel] = useState(0.005);

    const handleZoomIn = () => {
        const z = zoomLevel / 2; setZoomLevel(z);
        if (currentLocation && mapRef.current) mapRef.current.animateToRegion({ latitude: currentLocation.latitude, longitude: currentLocation.longitude, latitudeDelta: z, longitudeDelta: z }, 500);
    };
    const handleZoomOut = () => {
        const z = zoomLevel * 2; setZoomLevel(z);
        if (currentLocation && mapRef.current) mapRef.current.animateToRegion({ latitude: currentLocation.latitude, longitude: currentLocation.longitude, latitudeDelta: z, longitudeDelta: z }, 500);
    };
    const handleRecenter = () => {
        if (currentLocation && mapRef.current) { setZoomLevel(0.005); mapRef.current.animateToRegion({ latitude: currentLocation.latitude, longitude: currentLocation.longitude, latitudeDelta: 0.005, longitudeDelta: 0.005 }, 1000); }
    };
    const handleStartSession = () => navigation.navigate('SessionDetails');

    // ── Dynamic styles ────────────────────────────────────────────────────────
    const actionSectionStyle = [styles.actionSection, { backgroundColor: colors.background, borderBottomColor: colors.border }];
    const mapHeaderStyle = [styles.mapHeader, { backgroundColor: isDarkMode ? '#111827' : 'rgba(249,250,251,0.9)', borderBottomColor: colors.border }];
    const mapTitleStyle = [styles.mapTitle, { color: colors.text }];
    const controlBtnStyle = [styles.controlBtn, { backgroundColor: isDarkMode ? '#1f2937' : 'rgba(255,255,255,0.9)', borderColor: isDarkMode ? '#374151' : 'rgba(255,255,255,0.2)' }];
    const controlIconColor = isDarkMode ? '#e5e7eb' : COLORS.textLight;
    const infoCardStyle = [styles.infoCard, { backgroundColor: isDarkMode ? '#1f2937' : 'rgba(255,255,255,0.95)', borderColor: colors.border }];
    const iconBoxStyle = [styles.locationIconBox, { backgroundColor: isDarkMode ? '#374151' : COLORS.backgroundLight }];
    const labelStyle = [styles.coordsLabel, { color: colors.secondaryText }];
    const valueStyle = [styles.coordsValue, { color: colors.text }];
    const showCoords = useAppStore(state => state.showCoordinates);

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <ScreenLayout>
            <DashboardHeader />

            {/* ── Action Section ── */}
            <View style={actionSectionStyle}>
                {!clockInRecord ? (
                    /* ── NOT clocked in: show big green Clock In button ── */
                    <View style={styles.clockInWrap}>
                        <TouchableOpacity
                            style={[styles.clockInBtn, clockingIn && styles.clockInBtnDisabled]}
                            onPress={handleClockIn}
                            activeOpacity={0.85}
                            disabled={clockingIn}
                        >
                            <View style={styles.clockInIconCircle}>
                                <LogIn size={36} color="#fff" />
                            </View>
                            <Text style={styles.clockInTitle}>CLOCK IN</Text>
                            <Text style={styles.clockInSubtitle}>
                                {clockingIn ? 'Capturing location…' : 'Tap to record your arrival time'}
                            </Text>
                        </TouchableOpacity>
                        <Text style={styles.clockInHint}>You must clock in before starting a session</Text>
                    </View>
                ) : (
                    /* ── CLOCKED IN: show confirmation + Start Session ── */
                    <View style={styles.clockedInWrap}>

                        {/* Green confirmation card */}
                        <View style={styles.clockedCard}>
                            <View style={styles.clockedCardLeft}>
                                <CheckCircle size={20} color="#16a34a" />
                                <View style={{ marginLeft: 10 }}>
                                    <Text style={styles.clockedCardTitle}>Clocked In</Text>
                                    <Text style={styles.clockedCardTime}>
                                        {fmtDate(clockInRecord.time)} · {fmtTime(clockInRecord.time)}
                                    </Text>
                                    {clockInRecord.address && (
                                        <Text style={styles.clockedCardAddr} numberOfLines={1}>
                                            📍 {clockInRecord.address}
                                        </Text>
                                    )}
                                </View>
                            </View>
                            <View style={styles.liveTimerWrap}>
                                <Clock size={12} color="#6366f1" />
                                <Text style={styles.liveTimer}>{nowStr}</Text>
                            </View>
                        </View>

                        {/* Start New Session — only shown after Clock In */}
                        <TouchableOpacity style={styles.startBtn} onPress={handleStartSession} activeOpacity={0.9}>
                            <View style={styles.iconCircle}>
                                <Play size={36} color={COLORS.white} fill={COLORS.white} />
                            </View>
                            <Text style={styles.startTitle}>
                                {activeSession ? 'RETURN TO SESSION' : 'START NEW SESSION'}
                            </Text>
                            <Text style={styles.startSubtitle}>Clocked in — ready to start</Text>
                        </TouchableOpacity>

                        {/* Clock Out link */}
                        <TouchableOpacity style={styles.clockOutBtn} onPress={handleClockOut}>
                            <LogOut size={14} color="#ef4444" />
                            <Text style={styles.clockOutText}>Clock Out</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {/* ── Live Tracking Map ── */}
            <View style={styles.mapSection}>
                <View style={mapHeaderStyle}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <MapPin size={20} color={COLORS.primary} />
                        <Text style={mapTitleStyle}>LIVE TRACKING</Text>
                    </View>
                    {isGPSActive && (
                        <View style={styles.badge}>
                            <View style={styles.dot} />
                            <Text style={styles.badgeText}>GPS ACTIVE</Text>
                        </View>
                    )}
                </View>

                <View style={[styles.mapContainer, { backgroundColor: isDarkMode ? '#374151' : '#E5E7EB' }]}>
                    <MapComponent ref={mapRef} currentLocation={currentLocation} />

                    {/* Zoom / recenter controls */}
                    <View style={styles.mapControls}>
                        <TouchableOpacity style={controlBtnStyle} onPress={handleZoomIn}>
                            <Plus size={20} color={controlIconColor} />
                        </TouchableOpacity>
                        <TouchableOpacity style={controlBtnStyle} onPress={handleZoomOut}>
                            <Minus size={20} color={controlIconColor} />
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.controlBtn, { backgroundColor: COLORS.primary, borderColor: COLORS.primary }]} onPress={handleRecenter}>
                            <Navigation size={20} color={COLORS.white} />
                        </TouchableOpacity>
                    </View>

                    {/* Coordinates info card */}
                    {showCoords && (
                        <View style={infoCardStyle}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                <View style={iconBoxStyle}><LocateFixed size={20} color={COLORS.primary} /></View>
                                <View>
                                    <Text style={labelStyle}>CURRENT COORDINATES</Text>
                                    <Text style={valueStyle}>
                                        {currentLocation
                                            ? `${currentLocation.latitude.toFixed(6)}, ${currentLocation.longitude.toFixed(6)}`
                                            : 'Waiting for signal...'}
                                    </Text>
                                </View>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={labelStyle}>ACCURACY</Text>
                                <Text style={[styles.coordsLabel, { color: COLORS.success, fontSize: 12 }]}>
                                    ± {currentLocation?.accuracy ? Math.round(currentLocation.accuracy) : 3} meters
                                </Text>
                            </View>
                        </View>
                    )}
                </View>
            </View>
        </ScreenLayout>
    );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    actionSection: {
        paddingVertical: 24,
        paddingHorizontal: 20,
        alignItems: 'center',
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.borderLight,
        zIndex: 10,
    },

    // Pre-clockin
    clockInWrap: { width: '100%', alignItems: 'center', paddingTop: 12, paddingBottom: 4 },
    clockInBtn: {
        backgroundColor: '#16a34a',
        borderRadius: 28,
        paddingVertical: 28,
        paddingHorizontal: 24,
        width: '100%',
        maxWidth: 320,
        alignItems: 'center',
        shadowColor: '#16a34a',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 18,
        elevation: 10,
    },
    clockInBtnDisabled: { opacity: 0.65 },
    clockInIconCircle: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        padding: 14,
        borderRadius: 50,
        marginBottom: 14,
    },
    clockInTitle: { fontFamily: FONTS.bold, fontSize: 22, color: '#fff', letterSpacing: 0.8 },
    clockInSubtitle: { fontFamily: FONTS.medium, fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
    clockInHint: { marginTop: 14, fontSize: 12, color: '#94a3b8', fontFamily: FONTS.regular, textAlign: 'center' },

    // Post-clockin
    clockedInWrap: { width: '100%', alignItems: 'center', gap: 14 },
    clockedCard: {
        width: '100%',
        maxWidth: 320,
        backgroundColor: '#f0fdf4',
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: '#86efac',
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    clockedCardLeft: { flexDirection: 'row', alignItems: 'flex-start', flex: 1 },
    clockedCardTitle: { fontFamily: FONTS.bold, fontSize: 13, color: '#15803d' },
    clockedCardTime: { fontFamily: FONTS.regular, fontSize: 11, color: '#16a34a', marginTop: 1 },
    clockedCardAddr: { fontFamily: FONTS.regular, fontSize: 10, color: '#64748b', marginTop: 2, maxWidth: 170 },
    liveTimerWrap: { alignItems: 'center', paddingLeft: 8, gap: 3 },
    liveTimer: { fontFamily: FONTS.bold, fontSize: 11, color: '#6366f1', letterSpacing: 0.3 },

    startBtn: {
        backgroundColor: COLORS.primary,
        borderRadius: 28,
        paddingVertical: 24,
        paddingHorizontal: 24,
        width: '100%',
        maxWidth: 320,
        alignItems: 'center',
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 10,
    },
    iconCircle: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        padding: 14,
        borderRadius: 50,
        marginBottom: 12,
    },
    startTitle: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.white, letterSpacing: 0.5 },
    startSubtitle: { fontFamily: FONTS.medium, fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 },

    clockOutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingVertical: 7,
        paddingHorizontal: 16,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#fecaca',
        backgroundColor: '#fef2f2',
    },
    clockOutText: { fontFamily: FONTS.bold, fontSize: 12, color: '#ef4444' },

    // Map
    mapSection: { flex: 1 },
    mapHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.borderLight,
    },
    mapTitle: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.textLight, letterSpacing: 1 },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(34,197,94,0.1)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        gap: 6,
    },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.success },
    badgeText: { fontSize: 10, fontFamily: FONTS.bold, color: COLORS.success },
    mapContainer: { flex: 1, position: 'relative' },
    mapControls: { position: 'absolute', top: 16, right: 16, gap: 8 },
    controlBtn: {
        width: 40,
        height: 40,
        backgroundColor: 'rgba(255,255,255,0.9)',
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    infoCard: {
        position: 'absolute',
        bottom: 100,
        left: 16,
        right: 16,
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
        borderWidth: 1,
        borderColor: COLORS.borderLight,
    },
    locationIconBox: { padding: 8, borderRadius: 8 },
    coordsLabel: { fontSize: 10, fontFamily: FONTS.bold, color: COLORS.secondaryTextLight, marginBottom: 2 },
    coordsValue: { fontSize: 14, fontFamily: FONTS.bold, color: COLORS.textLight },
});
