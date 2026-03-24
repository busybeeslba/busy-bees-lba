import { useAppStore } from '../store/useAppStore';
import { COLORS } from '../constants/theme';

export const useTheme = () => {
    const isDarkMode = useAppStore(state => state.isDarkMode);

    return {
        isDarkMode,
        colors: {
            background: isDarkMode ? COLORS.backgroundDark : COLORS.backgroundLight,
            text: isDarkMode ? COLORS.textDark : COLORS.textLight,
            secondaryText: isDarkMode ? COLORS.secondaryTextDark : COLORS.secondaryTextLight,
            border: isDarkMode ? COLORS.borderDark : COLORS.borderLight,
            card: isDarkMode ? '#1e293b' : COLORS.white, // Dark card color
            ...COLORS
        }
    };
};
