import React from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps } from 'react-native';

interface InputProps extends TextInputProps {
    label?: string;
    error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, style, ...props }) => {
    return (
        <View style={styles.container}>
            {label && <Text style={styles.label}>{label}</Text>}
            <TextInput
                style={[styles.input, error ? styles.inputError : null, style]}
                placeholderTextColor="#999"
                {...props}
            />
            {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
        width: '100%',
    },
    label: {
        marginBottom: 6,
        fontSize: 14,
        fontWeight: '500',
        color: '#333',
    },
    input: {
        height: 48,
        borderWidth: 1,
        borderColor: '#DDD',
        borderRadius: 8,
        paddingHorizontal: 12,
        fontSize: 16,
        backgroundColor: '#FAFAFA',
        color: '#333',
    },
    inputError: {
        borderColor: '#FF4444',
    },
    errorText: {
        marginTop: 4,
        fontSize: 12,
        color: '#FF4444',
    },
});
