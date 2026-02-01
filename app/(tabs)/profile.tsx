import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Pressable,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome5, Feather } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { signOut } from 'firebase/auth';
import { auth } from '@/FirebaseConfig';
import { useRouter } from 'expo-router';
import { useAuth } from '@/components/useAuth';
import { useUserProfile } from '@/components/UserProfileProvider';
import { useNotes } from '@/components/NotesProvider';
import { useTasks } from '@/components/TasksProvider';
import { useCalendar } from '@/components/CalendarProvider';
import { useReminders } from '@/components/RemindersProvider';
import EditProfileModal from '@/components/EditProfileModal';

const LIST_PAD = 20;
const springConfig = { damping: 14, stiffness: 380 };

// Authentic Material 3 Light Theme Color Scheme - matching HomeScreen
const M3 = {
  // Surface colors
  background: '#FEF7FF',
  surface: '#FEF7FF',
  surfaceContainerLowest: '#FFFFFF',
  surfaceContainerLow: '#F8F2FA',
  surfaceContainer: '#F2ECF4',
  surfaceContainerHigh: '#ECE6EE',
  surfaceContainerHighest: '#E7E0E8',
  
  // Primary colors
  primary: '#6750A4',
  onPrimary: '#FFFFFF',
  primaryContainer: '#E9DDFF',
  onPrimaryContainer: '#22005D',
  
  // Secondary colors
  secondary: '#625B71',
  onSecondary: '#FFFFFF',
  secondaryContainer: '#E8DEF8',
  onSecondaryContainer: '#1E192B',
  
  // Tertiary colors
  tertiary: '#7E5260',
  onTertiary: '#FFFFFF',
  tertiaryContainer: '#FFD9E3',
  onTertiaryContainer: '#31101D',
  
  // Text colors
  onSurface: '#1D1B20',
  onSurfaceVariant: '#49454E',
  
  // Outline colors
  outline: '#7A757F',
  outlineVariant: '#CAC4CF',
  
  // Error colors
  error: '#BA1A1A',
  onError: '#FFFFFF',
  errorContainer: '#FFDAD6',
  onErrorContainer: '#410002',
  
  // Other
  scrim: 'rgba(0, 0, 0, 0.4)',
  shadow: '#000000',
  
  // Card tints
  cardTints: [
    '#F6EDFF',  // primary tint
    '#E8DEF8',  // secondary tint  
    '#FFD9E3',  // tertiary tint
    '#E8F5E9',  // green tint
    '#FFF8E1',  // amber tint
    '#E3F2FD',  // blue tint
  ],
  
  // Stat colors - using M3 palette derivatives
  stat: { 
    books: '#6750A4',    // primary
    tasks: '#2E7D32',    // green
    events: '#C62828',   // red
    reminders: '#F57C00' // orange
  },
};

function PressableScale({
  children,
  onPress,
  style,
  contentStyle,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  style?: object;
  contentStyle?: object;
}) {
  const scale = useSharedValue(1);
  const s = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.96, springConfig);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, springConfig);
      }}
      style={style}
    >
      <Animated.View style={[s, contentStyle]}>{children}</Animated.View>
    </Pressable>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading, updateProfile } = useUserProfile();
  const { books } = useNotes();
  const { tasks } = useTasks();
  const { events } = useCalendar();
  const { reminders } = useReminders();
  const router = useRouter();
  const [showEditModal, setShowEditModal] = useState(false);

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
            } catch (error: any) {
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
      <SafeAreaView style={[styles.container, { backgroundColor: M3.background }]} edges={['top']}>
        <View style={styles.loadingRoot}>
          <Text style={[styles.loadingText, { color: M3.onSurfaceVariant }]}>Loading...</Text>
        </View>
      </SafeAreaView>
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
    <View style={[styles.container, { backgroundColor: M3.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: scrollTop, paddingBottom: scrollBottom },
        ]}
      >
        <Text style={styles.headline}>Your space</Text>
        <Text style={styles.subhead}>
          Hey, {profile?.username || 'User'} 👋
        </Text>

        {/* User card */}
        <PressableScale
          onPress={() => setShowEditModal(true)}
          style={styles.userCardWrap}
          contentStyle={[styles.userCard, { backgroundColor: M3.cardTints[0] }]}
        >
          <View style={styles.avatarRow}>
            <View style={styles.avatarOuter}>
              <View style={styles.avatarCircle}>
                <FontAwesome5 name="user" size={40} color={M3.primary} />
              </View>
              <TouchableOpacity
                style={styles.editBadge}
                onPress={() => setShowEditModal(true)}
                hitSlop={8}
              >
                <Feather name="edit-2" size={14} color={M3.onPrimary} />
              </TouchableOpacity>
            </View>
          </View>
          <Text style={styles.username}>{profile?.username || 'User'}</Text>
          <Text style={styles.userEmail}>{user?.email || 'No email'}</Text>
          {profile?.createdAt && (
            <View style={styles.memberChip}>
              <Feather name="calendar" size={12} color={M3.onSurfaceVariant} />
              <Text style={styles.memberSince}>
                Member since {formatDate(profile.createdAt)}
              </Text>
            </View>
          )}
        </PressableScale>

        {/* Stats */}
        <Text style={styles.sectionTitle}>Quick stats</Text>
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: M3.cardTints[0] }]}>
            <View style={[styles.statIconWrap, { backgroundColor: M3.primaryContainer }]}>
              <FontAwesome5 name="book" size={22} color={M3.stat.books} />
            </View>
            <Text style={styles.statNumber}>{stats.books}</Text>
            <Text style={styles.statLabel}>Books</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: M3.cardTints[3] }]}>
            <View style={[styles.statIconWrap, { backgroundColor: '#C8E6C9' }]}>
              <FontAwesome5 name="check-square" size={22} color={M3.stat.tasks} />
            </View>
            <Text style={styles.statNumber}>{stats.tasks}</Text>
            <Text style={styles.statLabel}>Tasks</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: M3.cardTints[2] }]}>
            <View style={[styles.statIconWrap, { backgroundColor: '#FFCDD2' }]}>
              <FontAwesome5 name="calendar" size={22} color={M3.stat.events} />
            </View>
            <Text style={styles.statNumber}>{stats.events}</Text>
            <Text style={styles.statLabel}>Events</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: M3.cardTints[4] }]}>
            <View style={[styles.statIconWrap, { backgroundColor: '#FFE0B2' }]}>
              <FontAwesome5 name="bell" size={22} color={M3.stat.reminders} />
            </View>
            <Text style={styles.statNumber}>{stats.reminders}</Text>
            <Text style={styles.statLabel}>Reminders</Text>
          </View>
        </View>

        {/* Task progress */}
        {stats.tasks > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
              {progressPct === 0 ? 'Your progress' : progressPct === 100 ? 'All done!' : "You're on a roll"}
            </Text>
            <View style={[styles.progressCard, { backgroundColor: M3.cardTints[1] }]}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressText}>
                  {stats.completedTasks} of {stats.tasks} done
                </Text>
                <Text style={styles.progressPercent}>{progressPct}%</Text>
              </View>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${progressPct}%` },
                  ]}
                />
              </View>
              {progressPct === 100 && (
                <Text style={styles.progressCelebrate}>🎉 Great job completing all your tasks!</Text>
              )}
            </View>
          </>
        )}

        {/* Settings */}
        <Text style={[styles.sectionTitle, { marginTop: stats.tasks > 0 ? 24 : 0 }]}>Account</Text>
        <View style={styles.settingsBlock}>
          <PressableScale
            onPress={() => setShowEditModal(true)}
            style={styles.settingRowWrap}
            contentStyle={styles.settingRow}
          >
            <View style={[styles.settingIconWrap, { backgroundColor: M3.primaryContainer }]}>
              <FontAwesome5 name="user" size={18} color={M3.primary} />
            </View>
            <View style={styles.settingBody}>
              <Text style={styles.settingTitle}>Edit profile</Text>
              <Text style={styles.settingSub}>Change your username</Text>
            </View>
            <Feather name="chevron-right" size={20} color={M3.onSurfaceVariant} />
          </PressableScale>

          <PressableScale
            onPress={handleSignOut}
            style={styles.settingRowWrap}
            contentStyle={[styles.settingRow, styles.settingRowLast]}
          >
            <View style={[styles.settingIconWrap, { backgroundColor: M3.errorContainer }]}>
              <FontAwesome5 name="sign-out-alt" size={18} color={M3.error} />
            </View>
            <View style={styles.settingBody}>
              <Text style={[styles.settingTitle, { color: M3.error }]}>Sign out</Text>
              <Text style={styles.settingSub}>Sign out of your account</Text>
            </View>
            <Feather name="chevron-right" size={20} color={M3.onSurfaceVariant} />
          </PressableScale>
        </View>
      </ScrollView>

      <EditProfileModal
        visible={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSave={handleSaveProfile}
        currentUsername={profile?.username || ''}
      />
    </View>
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
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  scrollContent: {
    paddingHorizontal: LIST_PAD,
  },
  headline: {
    fontSize: 32,
    fontWeight: '400',
    color: M3.onSurface,
    letterSpacing: 0,
    marginBottom: 4,
  },
  subhead: {
    fontSize: 18,
    fontWeight: '500',
    color: M3.onSurfaceVariant,
    marginBottom: 24,
    letterSpacing: 0.15,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '400',
    color: M3.onSurface,
    marginBottom: 16,
    letterSpacing: 0,
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
    shadowColor: M3.shadow,
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
    backgroundColor: M3.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: M3.primaryContainer,
  },
  editBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: M3.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: M3.cardTints[0],
    shadowColor: M3.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  username: {
    fontSize: 22,
    fontWeight: '500',
    color: M3.onSurface,
    marginBottom: 4,
    letterSpacing: 0,
  },
  userEmail: {
    fontSize: 14,
    color: M3.onSurfaceVariant,
    marginBottom: 12,
    letterSpacing: 0.25,
  },
  memberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: M3.surfaceContainerHighest,
  },
  memberSince: {
    fontSize: 12,
    color: M3.onSurfaceVariant,
    fontWeight: '500',
    letterSpacing: 0.4,
  },
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
    shadowColor: M3.shadow,
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
    fontSize: 28,
    fontWeight: '400',
    color: M3.onSurface,
    marginBottom: 2,
    letterSpacing: 0,
  },
  statLabel: {
    fontSize: 14,
    color: M3.onSurfaceVariant,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  progressCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 32,
    overflow: 'hidden',
    shadowColor: M3.shadow,
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
  progressText: {
    fontSize: 16,
    fontWeight: '500',
    color: M3.onSurface,
    letterSpacing: 0.15,
  },
  progressPercent: {
    fontSize: 18,
    fontWeight: '500',
    color: M3.primary,
    letterSpacing: 0,
  },
  progressBar: {
    height: 12,
    backgroundColor: M3.surfaceContainerHighest,
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: M3.primary,
    borderRadius: 6,
  },
  progressCelebrate: {
    fontSize: 14,
    fontWeight: '500',
    color: M3.primary,
    marginTop: 12,
    textAlign: 'center',
    letterSpacing: 0.1,
  },
  settingsBlock: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: M3.surfaceContainerLow,
    shadowColor: M3.shadow,
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
    borderBottomColor: M3.outlineVariant,
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
    fontSize: 16,
    fontWeight: '500',
    color: M3.onSurface,
    marginBottom: 2,
    letterSpacing: 0.15,
  },
  settingSub: {
    fontSize: 14,
    color: M3.onSurfaceVariant,
    fontWeight: '400',
    letterSpacing: 0.25,
  },
});