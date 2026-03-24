import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { useAppStore } from '../../store/useAppStore';
import { COLORS, FONTS } from '../../constants/theme';
import { ArrowLeft, Save, FileText } from 'lucide-react-native';

type DocumentFormRouteProp = RouteProp<RootStackParamList, 'DocumentForm'>;

export const DocumentFormScreen = () => {
    const route = useRoute<DocumentFormRouteProp>();
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { addDocument, activeSession } = useAppStore();
    const { templateType } = route.params;

    // Mock Dynamic Form State
    const [formData, setFormData] = useState<Record<string, string>>({});

    const getTemplateTitle = () => {
        switch (templateType) {
            case 'site_assessment': return 'Site Assessment';
            case 'maintenance_checklist': return 'Maintenance Checklist';
            case 'work_completion': return 'Work Completion';
            default: return 'Document';
        }
    }

    const handleSave = () => {
        if (!activeSession) return;

        // Simulate PDF Generation
        addDocument({
            id: `doc-${Date.now()}`,
            templateType,
            type: getTemplateTitle(),
            createdAt: new Date().toISOString(),
            pdfUrl: `mock_docs/${templateType}_${Date.now()}.pdf`,
        });

        Alert.alert('Success', 'Document generated successfully!', [
            { text: 'OK', onPress: () => navigation.goBack() }
        ]);
    };

    return (
        <View style={styles.container}>
            {/* Custom Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ArrowLeft size={24} color={COLORS.textLight} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{getTemplateTitle()}</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scroll}>
                <View style={styles.formGroup}>
                    <Text style={styles.label}>Location / Area</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. Main Lobby"
                        placeholderTextColor={COLORS.secondaryTextDark}
                    />
                </View>

                {templateType === 'site_assessment' && (
                    <>
                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Hazards Identified</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                multiline
                                placeholder="Describe any potential hazards..."
                                placeholderTextColor={COLORS.secondaryTextDark}
                            />
                        </View>
                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Risk Level</Text>
                            <View style={styles.radioGroup}>
                                {['Low', 'Medium', 'High'].map(level => (
                                    <TouchableOpacity key={level} style={styles.radioBtn}>
                                        <View style={styles.radioCircle} />
                                        <Text style={styles.radioText}>{level}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </>
                )}

                {templateType === 'maintenance_checklist' && (
                    <>
                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Items Checked</Text>
                            <View style={styles.checkboxGroup}>
                                {['HVAC System', 'Lighting', 'Fire Alarm', 'Plumbing'].map(item => (
                                    <TouchableOpacity key={item} style={styles.checkBtn}>
                                        <View style={styles.checkSquare} />
                                        <Text style={styles.checkText}>{item}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </>
                )}

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Additional Notes</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        multiline
                        placeholder="Any other observations..."
                        placeholderTextColor={COLORS.secondaryTextDark}
                    />
                </View>

            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.genBtn} onPress={handleSave}>
                    <FileText size={20} color={COLORS.white} />
                    <Text style={styles.genBtnText}>Generate PDF</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.backgroundLight,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 16,
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.borderLight,
    },
    backBtn: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: FONTS.bold,
        color: COLORS.textLight,
    },
    scroll: {
        padding: 24,
        paddingBottom: 100,
    },
    formGroup: {
        marginBottom: 24,
    },
    label: {
        fontSize: 14,
        fontFamily: FONTS.medium,
        color: COLORS.textLight,
        marginBottom: 8,
    },
    input: {
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: COLORS.borderLight,
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 50,
        fontFamily: FONTS.regular,
        fontSize: 16,
        color: COLORS.textLight,
    },
    textArea: {
        height: 120,
        paddingVertical: 12,
        textAlignVertical: 'top',
    },
    radioGroup: {
        flexDirection: 'row',
        gap: 16,
    },
    radioBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    radioCircle: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: COLORS.borderLight,
    },
    radioText: {
        fontFamily: FONTS.medium,
        color: COLORS.secondaryTextLight,
    },
    checkboxGroup: {
        gap: 12,
    },
    checkBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: COLORS.white,
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.borderLight,
    },
    checkSquare: {
        width: 20,
        height: 20,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: COLORS.borderLight,
    },
    checkText: {
        fontFamily: FONTS.medium,
        color: COLORS.textLight,
    },
    footer: {
        padding: 16,
        backgroundColor: COLORS.white,
        borderTopWidth: 1,
        borderTopColor: COLORS.borderLight,
    },
    genBtn: {
        height: 56,
        backgroundColor: COLORS.primary,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        shadowColor: COLORS.primary,
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    genBtnText: {
        fontSize: 18,
        fontFamily: FONTS.bold,
        color: COLORS.white,
    }
});
