import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Alert, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { ScreenLayout } from '../../components/ScreenLayout';
import { Button } from '../../components/Button';
import { useAppStore } from '../../store/useAppStore';
import { COLORS, FONTS } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { User, Mail, Phone, BadgeCheck } from 'lucide-react-native';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const EditProfileScreen = () => {
    const navigation = useNavigation<NavigationProp>();
    const { user, updateUser } = useAppStore();
    const { colors, isDarkMode } = useTheme();

    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
    const [employeeId, setEmployeeId] = useState(user?.employeeId || '');
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        if (!name.trim() || !email.trim()) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        setLoading(true);
        // Simulate API call
        setTimeout(() => {
            updateUser({ name, email, phoneNumber, employeeId });
            setLoading(false);
            Alert.alert('Success', 'Profile updated successfully', [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);
        }, 1000);
    };

    const inputStyle = [
        styles.input,
        {
            backgroundColor: colors.card,
            color: colors.text,
            borderColor: colors.border
        }
    ];

    const iconColor = colors.secondaryText;

    return (
        <ScreenLayout>
            <ScrollView contentContainerStyle={styles.scroll}>
                <View style={styles.header}>
                    <Text style={[styles.title, { color: colors.text }]}>Edit Profile</Text>
                    <Text style={[styles.subtitle, { color: colors.secondaryText }]}>Update your personal information</Text>
                </View>

                <View style={styles.form}>
                    {/* Name Input */}
                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: colors.text }]}>Full Name</Text>
                        <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <User size={20} color={iconColor} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.textInput, { color: colors.text }]}
                                value={name}
                                onChangeText={setName}
                                placeholder="Enter your full name"
                                placeholderTextColor={colors.secondaryText}
                            />
                        </View>
                    </View>

                    {/* Email Input */}
                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: colors.text }]}>Email Address</Text>
                        <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <Mail size={20} color={iconColor} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.textInput, { color: colors.text }]}
                                value={email}
                                onChangeText={setEmail}
                                placeholder="Enter your email"
                                placeholderTextColor={colors.secondaryText}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>
                    </View>

                    {/* Phone Number Input */}
                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: colors.text }]}>Phone Number</Text>
                        <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <Phone size={20} color={iconColor} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.textInput, { color: colors.text }]}
                                value={phoneNumber}
                                onChangeText={setPhoneNumber}
                                placeholder="Enter your phone number"
                                placeholderTextColor={colors.secondaryText}
                                keyboardType="phone-pad"
                            />
                        </View>
                    </View>

                    {/* Employee ID Input */}
                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: colors.text }]}>Employee ID</Text>
                        <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <BadgeCheck size={20} color={iconColor} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.textInput, { color: colors.text }]}
                                value={employeeId}
                                onChangeText={setEmployeeId}
                                placeholder="Enter Employee ID"
                                placeholderTextColor={colors.secondaryText}
                            />
                        </View>
                    </View>
                </View>

                <View style={styles.actions}>
                    <Button
                        title="Save Changes"
                        onPress={handleSave}
                        isLoading={loading}
                    />
                    <Button
                        title="Cancel"
                        variant="secondary"
                        onPress={() => navigation.goBack()}
                        style={{ marginTop: 12 }}
                    />
                </View>
            </ScrollView>
        </ScreenLayout>
    );
};

const styles = StyleSheet.create({
    scroll: {
        padding: 24,
    },
    header: {
        marginBottom: 32,
    },
    title: {
        fontSize: 28,
        fontFamily: FONTS.bold,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        fontFamily: FONTS.medium,
    },
    form: {
        marginBottom: 32,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontFamily: FONTS.bold,
        marginBottom: 8,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 56,
    },
    inputIcon: {
        marginRight: 12,
    },
    textInput: {
        flex: 1,
        fontFamily: FONTS.medium,
        fontSize: 16,
        paddingVertical: 0, // Fix alignment on Android
    },
    input: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        fontFamily: FONTS.medium,
    },
    actions: {
        marginTop: 'auto',
    },
});
