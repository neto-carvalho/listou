/**
 * Layout raiz do app
 * Gerencia autenticação e navegação principal
 */

import { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '@/hooks/useAuth';

// Manter splash screen enquanto carrega
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  const [fontsLoaded] = useFonts({
    'PlusJakartaSans-Bold': require('../assets/fonts/PlusJakartaSans-Bold.ttf'),
    'Inter-Regular': require('../assets/fonts/Inter-Regular.ttf'),
    'Inter-Medium': require('../assets/fonts/Inter-Medium.ttf'),
    'Inter-SemiBold': require('../assets/fonts/Inter-SemiBold.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded && !authLoading) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, authLoading]);

  useEffect(() => {
    if (authLoading || !fontsLoaded) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      // Redirecionar para login se não autenticado
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      // Redirecionar para home se já autenticado
      router.replace('/(main)');
    }
  }, [isAuthenticated, segments, authLoading, fontsLoaded]);

  if (!fontsLoaded || authLoading) {
    return null;
  }

  return (
    <>
      <StatusBar style="auto" />
      <Slot />
    </>
  );
}
