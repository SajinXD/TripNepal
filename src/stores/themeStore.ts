import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ThemeState {
  isDark: boolean;
  toggleDark: () => void;
  loadTheme: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  isDark: false,

  toggleDark: async () => {
    const next = !get().isDark;
    set({ isDark: next });
    await AsyncStorage.setItem('theme', next ? 'dark' : 'light');
  },

  loadTheme: async () => {
    const saved = await AsyncStorage.getItem('theme');
    if (saved === 'dark') set({ isDark: true });
  },
}));
