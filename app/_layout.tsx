import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { ThemeProvider as NavThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { NotesProvider } from '@/components/NotesProvider';
import { CalendarProvider } from '@/components/CalendarProvider';
import { TasksProvider } from '@/components/TasksProvider';
import { RemindersProvider } from '@/components/RemindersProvider';
import { UserProfileProvider } from '@/components/UserProfileProvider';
import { ThemeProvider, useNavigationTheme } from '@/components/ThemeContext';
import { useAuth } from '@/components/useAuth';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome5.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <NotesProvider>
      <CalendarProvider>
        <TasksProvider>
          <RemindersProvider>
            <ThemeProvider>
              <RootLayoutNav />
            </ThemeProvider>
          </RemindersProvider>
        </TasksProvider>
      </CalendarProvider>
    </NotesProvider>
  );
}

function RootLayoutNav() {
  const navTheme = useNavigationTheme();
  const { user } = useAuth();

  return (
    <NavThemeProvider value={navTheme}>
      <UserProfileProvider user={user}>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        </Stack>
      </UserProfileProvider>
    </NavThemeProvider>
  );
}
