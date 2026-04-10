import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform, View, ActivityIndicator, AppState } from 'react-native';
import { LucideIcon, Home, Clock, Settings, FileText, Calendar } from 'lucide-react-native';
import { RootStackParamList, AuthStackParamList, MainTabParamList } from '../types/navigation';
import { useAppStore } from '../store/useAppStore';

// Screens (using placeholders for now, will replace imports later)
import { LoginScreen } from '../screens/auth/LoginScreen';
import { DashboardScreen } from '../screens/dashboard/DashboardScreen';
import { SessionDetailsScreen } from '../screens/session/SessionDetailsScreen';
import { DocumentTemplatePickerModal } from '../screens/session/DocumentTemplatePickerModal';
import { DocumentFormScreen } from '../screens/session/DocumentFormScreen';
import { CompleteSessionScreen } from '../screens/session/CompleteSessionScreen';
import { SessionCompletedScreen } from '../screens/session/SessionCompletedScreen';
import { HistoryScreen } from '../screens/history/HistoryScreen';
import { HistoryDetailsScreen } from '../screens/history/HistoryDetailsScreen';
import { SettingsScreen } from '../screens/settings/SettingsScreen';
import { EditProfileScreen } from '../screens/settings/EditProfileScreen';
import { CalendarScreen } from '../screens/calendar/CalendarScreen';
import { SetAvailabilityScreen } from '../screens/calendar/SetAvailabilityScreen';
import { BaselineSheetScreen } from '../screens/forms/BaselineSheetScreen';
import { MassTrialScreen } from '../screens/forms/MassTrialScreen';
import { DailyRoutinesScreen } from '../screens/forms/DailyRoutinesScreen';
import { TransactionSheetScreen } from '../screens/forms/TransactionSheetScreen';

import { tabStyles } from './styles';
import { COLORS, FONTS } from '../constants/theme';
import { useTheme } from '../hooks/useTheme';

const Stack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function AuthNavigator() {
    return (
        <AuthStack.Navigator screenOptions={{ headerShown: false }}>
            <AuthStack.Screen name="Login" component={LoginScreen} />
        </AuthStack.Navigator>
    );
}

function MainTabs() {
    const insets = useSafeAreaInsets();
    const { colors, isDarkMode } = useTheme();

    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarActiveTintColor: COLORS.primary, // Primary color stays same or adapt if needed
                tabBarInactiveTintColor: isDarkMode ? COLORS.secondaryTextDark : COLORS.secondaryTextLight,
                tabBarStyle: {
                    ...tabStyles.bar,
                    height: Platform.OS === 'ios' ? 80 : 60 + insets.bottom,
                    paddingBottom: Platform.OS === 'ios' ? 0 : insets.bottom,
                    backgroundColor: isDarkMode ? '#1e293b' : 'rgba(255,255,255,0.9)',
                    borderTopColor: colors.border,
                },
                tabBarLabelStyle: { fontFamily: FONTS.bold, fontSize: 10, marginTop: 4 },
                tabBarIconStyle: { marginTop: 4 },
            })}
        >
            <Tab.Screen
                name="Dashboard"
                component={DashboardScreen}
                options={{
                    tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
                }}
            />
            <Tab.Screen
                name="Calendar"
                component={CalendarScreen}
                options={{
                    tabBarIcon: ({ color, size }) => <Calendar color={color} size={size} />,
                }}
            />
            <Tab.Screen
                name="History"
                component={HistoryScreen}
                options={{
                    tabBarIcon: ({ color, size }) => <Clock color={color} size={size} />,
                }}
            />
            <Tab.Screen
                name="Settings"
                component={SettingsScreen}
                options={{
                    tabBarIcon: ({ color, size }) => <Settings color={color} size={size} />,
                }}
            />
        </Tab.Navigator>
    );
}

import { supabase } from '../lib/supabase';

export default function AppNavigator() {
    const { colors } = useTheme();
    const isLoggedIn = useAppStore((state) => state.isLoggedIn);
    const user = useAppStore((state) => state.user);
    const isInitializingAuth = useAppStore((state) => state.isInitializingAuth);
    const initializeAuth = useAppStore((state) => state.initializeAuth);
    const currentLocation = useAppStore((state) => state.currentLocation);
    const isClockedIn = useAppStore((state) => state.isClockedIn);
    const channelRef = React.useRef<any>(null);

    React.useEffect(() => {
        initializeAuth();
    }, []);

    // 1. Establish Presence WebSocket Base Connection
    React.useEffect(() => {
        const connectUser = () => {
            if (isLoggedIn && user?.email) {
                if (channelRef.current) {
                    supabase.removeChannel(channelRef.current);
                    channelRef.current = null;
                }
                
                channelRef.current = supabase.channel('online-users');
                channelRef.current.subscribe(async (status: string) => {
                    if (status === 'SUBSCRIBED') {
                        // Access the freshest location state unconditionally
                        const latestLocation = useAppStore.getState().currentLocation;
                        const activelyClockedIn = useAppStore.getState().isClockedIn;
                        await channelRef.current.track({ 
                            email: user.email,
                            location: activelyClockedIn ? latestLocation : null,
                            deviceType: 'mobile'
                        });
                    }
                });
            }
        };

        connectUser();

        const subscription = AppState.addEventListener('change', (nextAppState) => {
            if (nextAppState === 'active') { connectUser(); }
        });

        return () => {
            subscription.remove();
            if (channelRef.current) {
                const chan = channelRef.current;
                (async () => {
                    await chan.untrack();
                    await supabase.removeChannel(chan);
                })();
                channelRef.current = null;
            }
        };
    }, [isLoggedIn, user?.email]);

    // 2. Dynamic GPS Broadcast (Update WebSocket when Location changes)
    React.useEffect(() => {
        if (channelRef.current && isLoggedIn && user?.email) {
            channelRef.current.track({
                email: user.email,
                location: isClockedIn ? currentLocation : null,
                deviceType: 'mobile'
            }).catch(() => {});
        }
    }, [currentLocation, isLoggedIn, user?.email, isClockedIn]);

    if (isInitializingAuth) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                {!isLoggedIn ? (
                    <Stack.Screen name="Auth" component={AuthNavigator} />
                ) : (
                    <Stack.Group
                        screenOptions={{
                            headerStyle: {
                                backgroundColor: colors.background,
                            },
                            headerTintColor: colors.text,
                            headerShadowVisible: false,
                            headerTitleStyle: {
                                fontFamily: FONTS.bold,
                            },
                        }}
                    >
                        <Stack.Screen name="Main" component={MainTabs} />
                        <Stack.Screen
                            name="SessionDetails"
                            component={SessionDetailsScreen}
                            options={{ headerShown: true, title: 'Active Session' }}
                        />
                        <Stack.Screen
                            name="DocumentTemplatePicker"
                            component={DocumentTemplatePickerModal}
                            options={{ presentation: 'modal', title: 'Select Form' }}
                        />
                        <Stack.Screen
                            name="DocumentForm"
                            component={DocumentFormScreen}
                            options={{ headerShown: true, title: 'New Document' }}
                        />
                        <Stack.Screen
                            name="CompleteSession"
                            component={CompleteSessionScreen}
                            options={{ headerShown: true, title: 'Complete Session' }}
                        />
                        <Stack.Screen
                            name="SessionCompleted"
                            component={SessionCompletedScreen}
                            options={{ gestureEnabled: false }}
                        />
                        <Stack.Screen
                            name="HistoryDetails"
                            component={HistoryDetailsScreen}
                            options={{ headerShown: true, title: 'Session Details' }}
                        />
                        <Stack.Screen
                            name="EditProfile"
                            component={EditProfileScreen}
                            options={{ headerShown: true, title: 'Edit Profile' }}
                        />
                        <Stack.Screen
                            name="SetAvailability"
                            component={SetAvailabilityScreen}
                            options={{ headerShown: true, title: 'Set Availability' }}
                        />
                        <Stack.Screen
                            name="BaselineSheet"
                            component={BaselineSheetScreen}
                            options={{ headerShown: true, title: 'Baseline Sheet' }}
                        />
                        <Stack.Screen
                            name="MassTrial"
                            component={MassTrialScreen}
                            options={{ headerShown: false, title: 'Mass Trial / DTT' }}
                        />
                        <Stack.Screen
                            name="DailyRoutines"
                            component={DailyRoutinesScreen}
                            options={{ headerShown: true, title: 'Daily Routines' }}
                        />
                        <Stack.Screen
                            name="TransactionSheet"
                            component={TransactionSheetScreen}
                            options={{ headerShown: false, title: 'Transaction Form' }}
                        />
                    </Stack.Group>
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
}
