import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const PlaceholderScreen = ({ name }: { name: string }) => (
    <View style={styles.container}>
        <Text style={styles.text}>{name}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
    text: { fontSize: 20, fontWeight: 'bold', color: '#333' },
});

export const LoginScreen = () => <PlaceholderScreen name="Login Screen" />;
export const DashboardScreen = () => <PlaceholderScreen name="Dashboard Screen" />;
export const SessionDetailsScreen = () => <PlaceholderScreen name="Session Details" />;
export const DocumentTemplatePickerModal = () => <PlaceholderScreen name="Template Picker" />;
export const DocumentFormScreen = () => <PlaceholderScreen name="Document Form" />;
export const CompleteSessionScreen = () => <PlaceholderScreen name="Complete Session" />;
export const SessionCompletedScreen = () => <PlaceholderScreen name="Session Completed" />;
export const HistoryScreen = () => <PlaceholderScreen name="History Screen" />;
export const HistoryDetailsScreen = () => <PlaceholderScreen name="History Details" />;
export const SettingsScreen = () => <PlaceholderScreen name="Settings Screen" />;
