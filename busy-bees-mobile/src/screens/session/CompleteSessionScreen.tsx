import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, PanResponder, Platform, ViewStyle, TextInput, KeyboardAvoidingView, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { RootStackParamList } from '../../types/navigation';
import { useAppStore } from '../../store/useAppStore';
import { ScreenLayout } from '../../components/ScreenLayout';
import { COLORS, FONTS } from '../../constants/theme';
import { PenTool, CheckCircle, RotateCcw, Type } from 'lucide-react-native';
import { MapComponent } from '../../components/MapComponent';
import { useTheme } from '../../hooks/useTheme';

type SignatureMode = 'draw' | 'type';

export const CompleteSessionScreen = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const insets = useSafeAreaInsets();
    const { colors, isDarkMode } = useTheme();
    const { activeSession, completeSession } = useAppStore();

    // Signature State
    const [mode, setMode] = useState<SignatureMode>('draw');
    const [paths, setPaths] = useState<string[]>([]);
    const [currentPath, setCurrentPath] = useState<string>('');
    const currentPathRef = useRef<string>(''); // Ref to hold latest path for PanResponder
    const [typedName, setTypedName] = useState('');
    const [scrollEnabled, setScrollEnabled] = useState(true);

    // PanResponder for drawing
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: (evt) => {
                setScrollEnabled(false);
                const { locationX, locationY } = evt.nativeEvent;
                const newPath = `M${locationX.toFixed(0)},${locationY.toFixed(0)}`;
                currentPathRef.current = newPath;
                setCurrentPath(newPath);
                console.log('GRANT:', newPath);
            },
            onPanResponderMove: (evt) => {
                const { locationX, locationY } = evt.nativeEvent;
                const newPoint = ` L${locationX.toFixed(0)},${locationY.toFixed(0)}`;
                currentPathRef.current += newPoint;
                setCurrentPath(currentPathRef.current);
                // console.log('MOVE:', currentPathRef.current.length);
            },
            onPanResponderRelease: () => {
                console.log('RELEASE START:', currentPathRef.current);
                setScrollEnabled(true);
                if (currentPathRef.current) {
                    const pathToAdd = currentPathRef.current;
                    setPaths((prev) => {
                        console.log('ADDING PATH. Prev:', prev.length, 'New:', pathToAdd);
                        return [...prev, pathToAdd];
                    });
                    currentPathRef.current = '';
                    setCurrentPath('');
                }
            },
            onPanResponderTerminate: () => {
                console.log('TERMINATE');
                setScrollEnabled(true);
                if (currentPathRef.current) {
                    setPaths((prev) => [...prev, currentPathRef.current]);
                    currentPathRef.current = '';
                    setCurrentPath('');
                }
            },
        })
    ).current;

    const handleClear = () => {
        setPaths([]);
        setCurrentPath('');
        currentPathRef.current = '';
        setTypedName('');
    };

    const handleComplete = () => {
        let finalSignature = '';

        if (mode === 'draw') {
            const finalPaths = [...paths];
            if (currentPath) finalPaths.push(currentPath);
            if (finalPaths.length > 0) {
                finalSignature = JSON.stringify(finalPaths);
            }
        } else {
            if (typedName.trim().length > 0) {
                finalSignature = typedName.trim();
            }
        }

        if (!finalSignature) {
            Alert.alert('Signature Required', 'Please sign or type your name to complete the session.');
            return;
        }

        if (activeSession) {
            completeSession(finalSignature);
            // @ts-ignore
            navigation.replace('SessionCompleted');
        }
    };

    const hasSignature = mode === 'draw'
        ? (paths.length > 0 || currentPath.length > 0)
        : (typedName.trim().length > 0);

    // Dynamic Styles for Toggle
    const toggleContainerStyle = [styles.toggleContainer, { backgroundColor: colors.border }];
    const getToggleItemStyle = (active: boolean) => [
        styles.toggleItem,
        active && { backgroundColor: colors.card, shadowColor: '#000', shadowOpacity: 0.1, elevation: 2 }
    ];
    const getToggleTextStyle = (active: boolean) => [
        styles.toggleText,
        { color: active ? colors.text : colors.secondaryText }
    ];

    // Dynamic Styles for Pad/Input
    const footerStyle = [
        styles.footer,
        {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            paddingBottom: insets.bottom > 0 ? insets.bottom + 24 : 32
        }
    ];

    const signaturePadStyle = [
        styles.signaturePad,
        {
            backgroundColor: colors.card,
            borderColor: colors.border,
        },
        hasSignature && mode === 'draw' && {
            borderStyle: 'solid',
            borderColor: COLORS.primary,
            backgroundColor: isDarkMode ? colors.card : '#fff',
        }
    ];

    const textInputStyle = [
        styles.textInput,
        {
            backgroundColor: colors.card,
            borderColor: hasSignature ? COLORS.primary : colors.border,
            color: colors.text
        }
    ];

    const instructionsStyle = [styles.instructions, { color: colors.secondaryText }];
    const signHereTextStyle = [styles.signHereText, { color: colors.secondaryText }];
    const clearTextStyle = [styles.clearText, { color: colors.secondaryText }];

    return (
        <ScreenLayout useSafePadding={false}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.scrollContent} scrollEnabled={scrollEnabled}>
                    <View style={styles.content}>
                        <Text style={instructionsStyle}>
                            Please collect the client's signature below to verify the session.
                        </Text>

                        {/* Toggle */}
                        <View style={toggleContainerStyle}>
                            <TouchableOpacity
                                style={getToggleItemStyle(mode === 'draw')}
                                onPress={() => setMode('draw')}
                            >
                                <PenTool size={16} color={mode === 'draw' ? colors.text : colors.secondaryText} />
                                <Text style={getToggleTextStyle(mode === 'draw')}>Draw</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={getToggleItemStyle(mode === 'type')}
                                onPress={() => setMode('type')}
                            >
                                <Type size={16} color={mode === 'type' ? colors.text : colors.secondaryText} />
                                <Text style={getToggleTextStyle(mode === 'type')}>Type Name</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.signatureContainer}>
                            {mode === 'draw' ? (
                                <View
                                    style={signaturePadStyle as unknown as ViewStyle}
                                    {...panResponder.panHandlers}
                                >
                                    {!hasSignature && (
                                        <View style={styles.placeholder}>
                                            <PenTool size={32} color={colors.secondaryText} />
                                            <Text style={signHereTextStyle}>Tap and drag to sign</Text>
                                        </View>
                                    )}
                                    <Svg style={StyleSheet.absoluteFill}>
                                        {paths.map((path, index) => (
                                            <Path
                                                key={index}
                                                d={path}
                                                stroke={colors.text}
                                                strokeWidth={3}
                                                fill="none"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            />
                                        ))}
                                        <Path
                                            d={currentPath}
                                            stroke={colors.text}
                                            strokeWidth={3}
                                            fill="none"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </Svg>
                                </View>
                            ) : (
                                <TextInput
                                    style={textInputStyle}
                                    placeholder="Type Name Here"
                                    placeholderTextColor={colors.secondaryText}
                                    value={typedName}
                                    onChangeText={setTypedName}
                                    autoCorrect={false}
                                />
                            )}

                            {hasSignature && (
                                <TouchableOpacity onPress={handleClear} style={styles.clearBtn}>
                                    <RotateCcw size={16} color={colors.secondaryText} />
                                    <Text style={clearTextStyle}>Clear</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {hasSignature && (
                            <View style={styles.signedBadge}>
                                <CheckCircle size={16} color={COLORS.success} />
                                <Text style={styles.signedText}>
                                    {mode === 'draw' ? 'Signature Captured' : 'Name Entered'}
                                </Text>
                            </View>
                        )}

                        {/* Session Route Map */}
                        {activeSession && activeSession.route.length > 0 && (
                            <View style={styles.mapContainer}>
                                <Text style={styles.mapTitle}>Session Route</Text>
                                <View style={styles.mapWrapper}>
                                    <MapComponent
                                        route={activeSession.route}
                                        currentLocation={undefined} // Static view of route
                                    />
                                </View>
                                <Text style={styles.mapSubtitle}>
                                    Total Points: {activeSession.route.length}
                                </Text>
                            </View>
                        )}
                    </View>
                </ScrollView>

                <View style={footerStyle}>
                    <TouchableOpacity
                        style={[styles.completeBtn, !hasSignature && styles.disabledBtn]}
                        onPress={handleComplete}
                        disabled={!hasSignature}
                    >
                        <Text style={styles.completeBtnText}>Complete Session</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </ScreenLayout>
    );
};

const styles = StyleSheet.create({
    scrollContent: {
        flexGrow: 1,
    },
    content: {
        flex: 1,
        padding: 24,
        paddingTop: 40,
    },
    instructions: {
        fontSize: 16,
        fontFamily: FONTS.regular,
        textAlign: 'center',
        marginBottom: 24,
    },
    toggleContainer: {
        flexDirection: 'row',
        padding: 4,
        borderRadius: 12,
        marginBottom: 24,
    },
    toggleItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        gap: 8,
        borderRadius: 8,
    },
    toggleText: {
        fontFamily: FONTS.medium,
        fontSize: 14,
    },
    signatureContainer: {
        marginBottom: 24,
    },
    signaturePad: {
        height: 240,
        borderWidth: 2,
        borderRadius: 16,
        borderStyle: 'dashed',
        overflow: 'hidden',
    },
    textInput: {
        height: 80,
        borderWidth: 2,
        borderRadius: 16,
        paddingHorizontal: 20,
        fontSize: 24,
        fontFamily: FONTS.medium, // Can use a handwriting font if loaded
        textAlign: 'center',
    },
    placeholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    signHereText: {
        marginTop: 12,
        fontFamily: FONTS.medium,
    },
    clearBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 12,
        gap: 6,
        padding: 8,
    },
    clearText: {
        fontFamily: FONTS.medium,
        fontSize: 14,
    },
    signedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 0,
        gap: 8,
    },
    signedText: {
        color: COLORS.success,
        fontFamily: FONTS.bold,
        fontSize: 14,
    },
    footer: {
        padding: 24,
        borderTopWidth: 1,
    },
    completeBtn: {
        height: 56,
        backgroundColor: COLORS.primary,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: COLORS.primary,
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    disabledBtn: {
        backgroundColor: '#94a3b8',
        shadowOpacity: 0,
        elevation: 0,
    },
    completeBtnText: {
        fontSize: 18,
        color: COLORS.white,
        fontFamily: FONTS.bold,
    },
    mapContainer: {
        marginTop: 32,
        width: '100%',
    },
    mapTitle: {
        fontSize: 16,
        fontFamily: FONTS.bold,
        color: COLORS.textDark,
        marginBottom: 12,
        marginLeft: 4,
    },
    mapWrapper: {
        height: 200,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: COLORS.borderLight,
        backgroundColor: COLORS.backgroundLight,
    },
    mapSubtitle: {
        fontSize: 12,
        fontFamily: FONTS.medium,
        color: COLORS.secondaryTextDark,
        marginTop: 8,
        textAlign: 'right',
        marginRight: 4,
    }
});
