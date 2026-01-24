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
import { FontAwesome, Feather } from '@expo/vector-icons';
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

// Material 3 Expressive – match home page
const M3 = {
  background: '#F5F0FA',
  surface: '#FFFFFF',
  surfaceContainerHigh: '#F0EBF8',
  primary: '#7C5DE8',
  primaryContainer: '#E8E0FC',
  onPrimary: '#FFFFFF',
  onSurface: '#1C1B22',
  onSurfaceVariant: '#5C5868',
  outline: '#D4CFE0',
  outlineVariant: '#E6E1ED',
  errorContainer: '#FFEBEE',
  onErrorContainer: '#b85757',
  scrim: 'rgba(28, 27, 34, 0.4)',
  tint: ['#F0EBFF', '#E8F8F2', '#FFF0EB', '#E8F0FF', '#f2e6f5', '#f9ead6'],
  stat: { books: '#7C5DE8', tasks: '#5CB85C', events: '#E85D5D', reminders: '#E8B83C' },
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
          contentStyle={[styles.userCard, { backgroundColor: M3.tint[0] }]}
        >
          <View style={styles.avatarRow}>
            <View style={styles.avatarOuter}>
              <View style={styles.avatarCircle}>
                <FontAwesome name="user" size={40} color={M3.primary} />
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
        <Text style={styles.label}>YOUR ACTIVITY</Text>
        <Text style={styles.sectionTitle}>Quick stats</Text>
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: M3.tint[0] }]}>
            <View style={[styles.statIconWrap, { backgroundColor: M3.primaryContainer }]}>
              <FontAwesome name="book" size={22} color={M3.stat.books} />
            </View>
            <Text style={styles.statNumber}>{stats.books}</Text>
            <Text style={styles.statLabel}>Books</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: M3.tint[1] }]}>
            <View style={[styles.statIconWrap, { backgroundColor: '#E8F5E9' }]}>
              <FontAwesome name="check-square" size={22} color={M3.stat.tasks} />
            </View>
            <Text style={styles.statNumber}>{stats.tasks}</Text>
            <Text style={styles.statLabel}>Tasks</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: M3.tint[2] }]}>
            <View style={[styles.statIconWrap, { backgroundColor: '#FFEBEE' }]}>
              <FontAwesome name="calendar" size={22} color={M3.stat.events} />
            </View>
            <Text style={styles.statNumber}>{stats.events}</Text>
            <Text style={styles.statLabel}>Events</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: M3.tint[3] }]}>
            <View style={[styles.statIconWrap, { backgroundColor: '#FFF8E1' }]}>
              <FontAwesome name="bell" size={22} color={M3.stat.reminders} />
            </View>
            <Text style={styles.statNumber}>{stats.reminders}</Text>
            <Text style={styles.statLabel}>Reminders</Text>
          </View>
        </View>

        {/* Task progress */}
        {stats.tasks > 0 && (
          <>
            <Text style={[styles.label, { marginTop: 8 }]}>TASK PROGRESS</Text>
            <Text style={styles.sectionTitle}>You're on a roll</Text>
            <View style={[styles.progressCard, { backgroundColor: M3.tint[4] }]}>
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
                <Text style={styles.progressCelebrate}>🎉 All done!</Text>
              )}
            </View>
          </>
        )}

        {/* Settings */}
        <Text style={[styles.label, { marginTop: stats.tasks > 0 ? 8 : 0 }]}>SETTINGS</Text>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.settingsBlock}>
          <PressableScale
            onPress={() => setShowEditModal(true)}
            style={styles.settingRowWrap}
            contentStyle={styles.settingRow}
          >
            <View style={[styles.settingIconWrap, { backgroundColor: M3.primaryContainer }]}>
              <FontAwesome name="user" size={18} color={M3.primary} />
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
              <FontAwesome name="sign-out" size={18} color={M3.onErrorContainer} />
            </View>
            <View style={styles.settingBody}>
              <Text style={[styles.settingTitle, { color: M3.onErrorContainer }]}>Sign out</Text>
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
  },
  scrollContent: {
    paddingHorizontal: LIST_PAD,
  },
  headline: {
    fontSize: 28,
    fontWeight: '800',
    color: M3.onSurface,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subhead: {
    fontSize: 18,
    fontWeight: '600',
    color: M3.onSurfaceVariant,
    marginBottom: 24,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: M3.onSurfaceVariant,
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: M3.onSurface,
    marginBottom: 14,
  },
  userCardWrap: {
    width: '100%',
    marginBottom: 28,
  },
  userCard: {
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    overflow: 'hidden',
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
    borderColor: M3.tint[0],
  },
  username: {
    fontSize: 22,
    fontWeight: '800',
    color: M3.onSurface,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 15,
    color: M3.onSurfaceVariant,
    marginBottom: 10,
  },
  memberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  memberSince: {
    fontSize: 13,
    color: M3.onSurfaceVariant,
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 28,
  },
  statCard: {
    width: '47%',
    borderRadius: 20,
    padding: 18,
    alignItems: 'center',
    overflow: 'hidden',
  },
  statIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statNumber: {
    fontSize: 26,
    fontWeight: '800',
    color: M3.onSurface,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 14,
    color: M3.onSurfaceVariant,
    fontWeight: '600',
  },
  progressCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 28,
    overflow: 'hidden',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressText: {
    fontSize: 16,
    fontWeight: '600',
    color: M3.onSurface,
  },
  progressPercent: {
    fontSize: 18,
    fontWeight: '800',
    color: M3.primary,
  },
  progressBar: {
    height: 10,
    backgroundColor: M3.outlineVariant,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: M3.primary,
    borderRadius: 5,
  },
  progressCelebrate: {
    fontSize: 14,
    fontWeight: '600',
    color: M3.primary,
    marginTop: 10,
    textAlign: 'center',
  },
  settingsBlock: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: M3.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
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
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  settingBody: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: M3.onSurface,
    marginBottom: 2,
  },
  settingSub: {
    fontSize: 13,
    color: M3.onSurfaceVariant,
    fontWeight: '500',
  },
});
