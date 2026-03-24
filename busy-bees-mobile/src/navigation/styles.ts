import { StyleSheet, Platform } from 'react-native';
import { COLORS, FONTS } from '../constants/theme';

export const tabStyles = StyleSheet.create({
    bar: {
        height: Platform.OS === 'ios' ? 80 : 60, // Keep specific height for iOS design match, relaxed for Android
        backgroundColor: 'rgba(255,255,255,0.9)',
        borderTopWidth: 1,
        borderTopColor: COLORS.borderLight,
        // position: 'absolute', // Keeping absolute removed to fix overlap
        // bottom: 0,
        elevation: 8,
        paddingBottom: Platform.OS === 'android' ? 4 : 0, // Slight padding for Android buttons if needed
    },
    item: {
        paddingTop: 8,
    },
    label: {
        fontFamily: FONTS.bold,
        fontSize: 10,
        marginTop: 4,
    }
});
