import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome5, Feather } from '@expo/vector-icons';
import { Text, useTheme, Surface, Switch, List } from 'react-native-paper';
import { signOut } from 'firebase/auth';
import { auth } from '@/FirebaseConfig';
import { useRouter } from 'expo-router';
import { useAuth } from '@/components/useAuth';
import { useUserProfile } from '@/components/UserProfileProvider';
import { useNotes } from '@/components/NotesProvider';
import { useTasks } from '@/components/TasksProvider';
import { useCalendar } from '@/components/CalendarProvider';
import { useReminders } from '@/components/RemindersProvider';
import { useAppTheme } from '@/components/ThemeContext';
import { cardTintsLight, cardTintsDark } from '@/theme';
import EditProfileModal from '@/components/EditProfileModal';
import { PressableScale } from '@/components/ui/PressableScale';
import * as ImagePicker from 'expo-image-picker';
import type { AppTheme } from '@/theme';

const LIST_PAD = 20;

const STAT_COLORS = {
  books: '#6750A4',
  tasks: '#2E7D32',
  events: '#C62828',
  reminders: '#F57C00',
};

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme<AppTheme>();
  const { isDark, setDarkMode } = useAppTheme();
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading, updateProfile } = useUserProfile();
  const { books } = useNotes();
  const { tasks } = useTasks();
  const { events } = useCalendar();
  const { reminders } = useReminders();
  const router = useRouter();
  const [showEditModal, setShowEditModal] = useState(false);

  const cardTints = isDark ? cardTintsDark : cardTintsLight;

  const handlePickAvatar = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert(
          'Permission needed',
          'Please allow access to your photos to set a profile picture.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaType.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const uri = result.assets[0].uri;
      if (!uri) return;

      await updateProfile({ avatarUri: uri });
    } catch (error) {
      console.error('Error picking profile image:', error);
      Alert.alert('Error', 'Unable to update profile picture. Please try again.');
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut(auth);
              router.replace('/');
            } catch (error: unknown) {
              Alert.alert('Error', 'Failed to sign out. Please try again.');
              console.error('Sign out error:', error);
            }
          },
        },
      ]
    );
  };

  const handleSaveProfile = async (username: string) => {
    await updateProfile({ username });
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (authLoading || profileLoading) {
    return (
      <Surface style={[styles.container, { backgroundColor: theme.colors.background }]} elevation={0}>
        <View style={styles.loadingRoot}>
          <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>Loading...</Text>
        </View>
      </Surface>
    );
  }

  const stats = {
    books: books.length,
    tasks: tasks.length,
    completedTasks: tasks.filter((t) => t.completed).length,
    events: events.length,
    reminders: reminders.length,
  };
  const progressPct = stats.tasks > 0 ? Math.round((stats.completedTasks / stats.tasks) * 100) : 0;

  const scrollBottom = Math.max(insets.bottom, 24) + 90;
  const scrollTop = 24 + insets.top;

  return (
    <Surface style={[styles.container, { backgroundColor: theme.colors.background }]} elevation={0}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: scrollTop, paddingBottom: scrollBottom },
        ]}
      >
        <Text variant="headlineLarge" style={[styles.headline, { color: theme.colors.onSurface }]}>
          Your space
        </Text>
        <Text variant="titleMedium" style={[styles.subhead, { color: theme.colors.onSurfaceVariant }]}>
          Hey, {profile?.username || 'User'} 👋
        </Text>

        {/* User card */}
        <PressableScale
          onPress={() => setShowEditModal(true)}
          style={styles.userCardWrap}
          contentStyle={[styles.userCard, { backgroundColor: cardTints[0], shadowColor: theme.colors.shadow }]}
        >
          <View style={styles.avatarRow}>
            <PressableScale
              onPress={handlePickAvatar}
              style={styles.avatarOuter}
              contentStyle={styles.avatarOuter}
            >
              <View
                style={[
                  styles.avatarCircle,
                  { backgroundColor: theme.colors.surface, borderColor: theme.colors.primaryContainer },
                ]}
              >
                {profile?.avatarUri ? (
                  <Image source={{ uri: profile.avatarUri }} style={styles.avatarImage} />
                ) : (
                  <FontAwesome5 name="user" size={40} color={theme.colors.primary} />
                )}
              </View>
              <View style={[styles.editBadge, { backgroundColor: theme.colors.primary, borderColor: cardTints[0] }]}>
                <Feather name="camera" size={14} color={theme.colors.onPrimary} />
              </View>
            </PressableScale>
          </View>
          <Text variant="titleLarge" style={[styles.username, { color: theme.colors.onSurface }]}>
            {profile?.username || 'User'}
          </Text>
          <Text variant="bodyMedium" style={[styles.userEmail, { color: theme.colors.onSurfaceVariant }]}>
            {user?.email || 'No email'}
          </Text>
          {profile?.createdAt && (
            <View style={[styles.memberChip, { backgroundColor: theme.colors.surfaceVariant }]}>
              <Feather name="calendar" size={12} color={theme.colors.onSurfaceVariant} />
              <Text variant="labelMedium" style={[styles.memberSince, { color: theme.colors.onSurfaceVariant }]}>
                Member since {formatDate(profile.createdAt)}
              </Text>
            </View>
          )}
        </PressableScale>

        {/* Stats */}
        <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
          Quick stats
        </Text>
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: cardTints[0], shadowColor: theme.colors.shadow }]}>
            <View style={[styles.statIconWrap, { backgroundColor: theme.colors.primaryContainer }]}>
              <FontAwesome5 name="book" size={22} color={STAT_COLORS.books} />
            </View>
            <Text variant="headlineMedium" style={[styles.statNumber, { color: theme.colors.onSurface }]}>{stats.books}</Text>
            <Text variant="labelLarge" style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>Books</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: cardTints[3], shadowColor: theme.colors.shadow }]}>
            <View style={[styles.statIconWrap, { backgroundColor: '#C8E6C9' }]}>
              <FontAwesome5 name="check-square" size={22} color={STAT_COLORS.tasks} />
            </View>
            <Text variant="headlineMedium" style={[styles.statNumber, { color: theme.colors.onSurface }]}>{stats.tasks}</Text>
            <Text variant="labelLarge" style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>Tasks</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: cardTints[2], shadowColor: theme.colors.shadow }]}>
            <View style={[styles.statIconWrap, { backgroundColor: '#FFCDD2' }]}>
              <FontAwesome5 name="calendar" size={22} color={STAT_COLORS.events} />
            </View>
            <Text variant="headlineMedium" style={[styles.statNumber, { color: theme.colors.onSurface }]}>{stats.events}</Text>
            <Text variant="labelLarge" style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>Events</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: cardTints[4], shadowColor: theme.colors.shadow }]}>
            <View style={[styles.statIconWrap, { backgroundColor: '#FFE0B2' }]}>
              <FontAwesome5 name="bell" size={22} color={STAT_COLORS.reminders} />
            </View>
            <Text variant="headlineMedium" style={[styles.statNumber, { color: theme.colors.onSurface }]}>{stats.reminders}</Text>
            <Text variant="labelLarge" style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>Reminders</Text>
          </View>
        </View>

        {/* Task progress */}
        {stats.tasks > 0 && (
          <>
            <Text variant="titleMedium" style={[styles.sectionTitle, { marginTop: 24, color: theme.colors.onSurface }]}>
              {progressPct === 0 ? 'Your progress' : progressPct === 100 ? 'All done!' : "You're on a roll"}
            </Text>
            <View style={[styles.progressCard, { backgroundColor: cardTints[1], shadowColor: theme.colors.shadow }]}>
              <View style={styles.progressHeader}>
                <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>
                  {stats.completedTasks} of {stats.tasks} done
                </Text>
                <Text variant="titleMedium" style={{ color: theme.colors.primary }}>{progressPct}%</Text>
              </View>
              <View style={[styles.progressBar, { backgroundColor: theme.colors.surfaceVariant }]}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${progressPct}%`, backgroundColor: theme.colors.primary },
                  ]}
                />
              </View>
              {progressPct === 100 && (
                <Text variant="bodyMedium" style={[styles.progressCelebrate, { color: theme.colors.primary }]}>
                  🎉 Great job completing all your tasks!
                </Text>
              )}
            </View>
          </>
        )}

        {/* Account */}
        <Text variant="titleMedium" style={[styles.sectionTitle, { marginTop: stats.tasks > 0 ? 24 : 0, color: theme.colors.onSurface }]}>
          Account
        </Text>
        <View style={[styles.settingsBlock, { backgroundColor: theme.colors.surfaceVariant, shadowColor: theme.colors.shadow }]}>
          {/* Dark mode toggle */}
          <List.Item
            title="Dark mode"
            description="Use dark theme"
            left={(props) => <List.Icon {...props} icon="brightness-6" />}
            right={() => (
              <Switch
                value={isDark}
                onValueChange={setDarkMode}
                color={theme.colors.primary}
              />
            )}
            style={styles.settingRow}
          />
          <PressableScale
            onPress={() => setShowEditModal(true)}
            style={styles.settingRowWrap}
            contentStyle={[styles.settingRow, { borderBottomColor: theme.colors.outlineVariant }]}
          >
            <View style={[styles.settingIconWrap, { backgroundColor: theme.colors.primaryContainer }]}>
              <FontAwesome5 name="user" size={18} color={theme.colors.primary} />
            </View>
            <View style={styles.settingBody}>
              <Text variant="bodyLarge" style={[styles.settingTitle, { color: theme.colors.onSurface }]}>Edit profile</Text>
              <Text variant="bodyMedium" style={[styles.settingSub, { color: theme.colors.onSurfaceVariant }]}>Change your username</Text>
            </View>
            <Feather name="chevron-right" size={20} color={theme.colors.onSurfaceVariant} />
          </PressableScale>

          <PressableScale
            onPress={handleSignOut}
            style={styles.settingRowWrap}
            contentStyle={[styles.settingRow, styles.settingRowLast]}
          >
            <View style={[styles.settingIconWrap, { backgroundColor: theme.colors.errorContainer }]}>
              <FontAwesome5 name="sign-out-alt" size={18} color={theme.colors.error} />
            </View>
            <View style={styles.settingBody}>
              <Text variant="bodyLarge" style={[styles.settingTitle, { color: theme.colors.error }]}>Sign out</Text>
              <Text variant="bodyMedium" style={[styles.settingSub, { color: theme.colors.onSurfaceVariant }]}>Sign out of your account</Text>
            </View>
            <Feather name="chevron-right" size={20} color={theme.colors.onSurfaceVariant} />
          </PressableScale>
        </View>
      </ScrollView>

      <EditProfileModal
        visible={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSave={handleSaveProfile}
        currentUsername={profile?.username || ''}
      />
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: LIST_PAD,
  },
  headline: {
    marginBottom: 4,
  },
  subhead: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  userCardWrap: {
    width: '100%',
    marginBottom: 32,
  },
  userCard: {
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  avatarRow: {
    marginBottom: 16,
  },
  avatarOuter: {
    position: 'relative',
  },
  avatarCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 48,
    resizeMode: 'cover',
  },
  editBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  username: {
    marginBottom: 4,
  },
  userEmail: {
    marginBottom: 12,
  },
  memberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  memberSince: {},
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 32,
  },
  statCard: {
    width: '47.5%',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  statIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statNumber: {
    marginBottom: 2,
  },
  statLabel: {},
  progressCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 32,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressBar: {
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
  },
  progressCelebrate: {
    marginTop: 12,
    textAlign: 'center',
  },
  settingsBlock: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
    marginBottom: 24,
  },
  settingRowWrap: {
    width: '100%',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  settingRowLast: {
    borderBottomWidth: 0,
  },
  settingIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  settingBody: {
    flex: 1,
  },
  settingTitle: {
    marginBottom: 2,
  },
  settingSub: {},
});
