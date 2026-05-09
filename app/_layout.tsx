// app/_layout.tsx
// Root layout for the entire app.
import 'react-native-url-polyfill/auto';
import '../global.css';

import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useColorScheme } from 'nativewind';
import { useAuth } from '@/hooks/useAuth';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useThemeStore } from '@/stores/themeStore';

// Syncs Zustand themeStore → NativeWind color scheme on every toggle
function ThemeSync() {
  const { isDark, loadTheme } = useThemeStore();
  const { setColorScheme } = useColorScheme();
  useEffect(() => { loadTheme(); }, []);
  useEffect(() => { setColorScheme(isDark ? 'dark' : 'light'); }, [isDark]);
  return null;
}

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { user, profile, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const { isDark } = useThemeStore();
  
  // Register and initialize push notifications
  usePushNotifications();

  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

  // Hide splash screen when fonts are loaded
  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Handle Authentication Routing
  useEffect(() => {
    if (isLoading || !fontsLoaded) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inGuideGroup = segments[0] === '(guide)';
    const inTouristGroup = segments[0] === '(tourist)';
    const inKYCGroup = segments[0] === 'kyc';
    const isWelcome = segments[0] === 'welcome';

    if (!user) {
      if (!inAuthGroup && !isWelcome) {
        router.replace('/welcome');
      }
    } else if (user && profile) {
      const isGuide = profile.role === 'guide';
      if (inAuthGroup || isWelcome) {
        router.replace(isGuide ? '/(guide)/dashboard' : '/(tourist)/home');
      } else if (isGuide && inTouristGroup) {
        router.replace('/(guide)/dashboard');
      } else if (!isGuide && inGuideGroup) {
        router.replace('/(tourist)/home');
      }
    } else if (user && !profile) {
      // Logged in but profile still null after loading (DB trigger may have failed).
      // Use role from auth metadata to route — prevents user being stuck on login screen.
      if (inAuthGroup || isWelcome) {
        const metaRole = user.user_metadata?.role;
        router.replace(metaRole === 'guide' ? '/(guide)/dashboard' : '/(tourist)/home');
      }
    }
  }, [user, profile, isLoading, fontsLoaded, segments]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeSync />
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
            contentStyle: { backgroundColor: '#F8F9FA' },
          }}
        >
          <Stack.Screen name="welcome" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tourist)" />
          <Stack.Screen name="(guide)" />
          <Stack.Screen name="kyc" />
          <Stack.Screen name="personal-info" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="login-security" options={{ animation: 'slide_from_bottom' }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
