import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome } from '@expo/vector-icons';
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

export default function ProfileScreen() {
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
      day: 'numeric' 
    });
  };

  if (authLoading || profileLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const stats = {
    books: books.length,
    tasks: tasks.length,
    completedTasks: tasks.filter(t => t.completed).length,
    events: events.length,
    reminders: reminders.length,
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* User Info Card */}
        <View style={styles.userCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarCircle}>
              <FontAwesome name="user" size={40} color="#7B61FF" />
            </View>
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => setShowEditModal(true)}
            >
              <FontAwesome name="pencil" size={14} color="#fff" />
            </TouchableOpacity>
          </View>
          <Text style={styles.username}>{profile?.username || 'User'}</Text>
          <Text style={styles.userEmail}>{user?.email || 'No email'}</Text>
          {profile?.createdAt && (
            <Text style={styles.memberSince}>
              Member since {formatDate(profile.createdAt)}
            </Text>
          )}
        </View>

        {/* Stats Section */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Your Activity</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <FontAwesome name="book" size={24} color="#7B61FF" />
              <Text style={styles.statNumber}>{stats.books}</Text>
              <Text style={styles.statLabel}>Books</Text>
            </View>
            <View style={styles.statCard}>
              <FontAwesome name="check-square" size={24} color="#6BCB77" />
              <Text style={styles.statNumber}>{stats.tasks}</Text>
              <Text style={styles.statLabel}>Tasks</Text>
            </View>
            <View style={styles.statCard}>
              <FontAwesome name="calendar" size={24} color="#FF6B6B" />
              <Text style={styles.statNumber}>{stats.events}</Text>
              <Text style={styles.statLabel}>Events</Text>
            </View>
            <View style={styles.statCard}>
              <FontAwesome name="bell" size={24} color="#FFE66D" />
              <Text style={styles.statNumber}>{stats.reminders}</Text>
              <Text style={styles.statLabel}>Reminders</Text>
            </View>
          </View>
        </View>

        {/* Task Progress */}
        {stats.tasks > 0 && (
          <View style={styles.progressSection}>
            <Text style={styles.sectionTitle}>Task Progress</Text>
            <View style={styles.progressCard}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressText}>
                  {stats.completedTasks} of {stats.tasks} completed
                </Text>
                <Text style={styles.progressPercent}>
                  {Math.round((stats.completedTasks / stats.tasks) * 100)}%
                </Text>
              </View>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${(stats.completedTasks / stats.tasks) * 100}%` }
                  ]} 
                />
              </View>
            </View>
          </View>
        )}

        {/* Settings Section */}
        <View style={styles.settingsSection}>
          <TouchableOpacity style={styles.settingItem} onPress={() => setShowEditModal(true)}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: '#7B61FF20' }]}>
                <FontAwesome name="user" size={18} color="#7B61FF" />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingText}>Edit Profile</Text>
                <Text style={styles.settingSubtext}>Change your username</Text>
              </View>
            </View>
            <FontAwesome name="chevron-right" size={16} color="#888" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem} onPress={handleSignOut}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: '#FF7B7B20' }]}>
                <FontAwesome name="sign-out" size={18} color="#FF7B7B" />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingText}>Sign Out</Text>
                <Text style={styles.settingSubtext}>Sign out of your account</Text>
              </View>
            </View>
            <FontAwesome name="chevron-right" size={16} color="#888" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      <EditProfileModal
        visible={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSave={handleSaveProfile}
        currentUsername={profile?.username || ''}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#888',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#222',
  },
  userCard: {
    backgroundColor: '#F7F8FA',
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatarCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#7B61FF',
  },
  editButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#7B61FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: '#888',
    marginBottom: 8,
  },
  memberSince: {
    fontSize: 14,
    color: '#888',
  },
  statsSection: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: '47%',
    backgroundColor: '#F7F8FA',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#222',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#888',
    fontWeight: '500',
  },
  progressSection: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  progressCard: {
    backgroundColor: '#F7F8FA',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
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
    color: '#222',
  },
  progressPercent: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#7B61FF',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#7B61FF',
    borderRadius: 4,
  },
  settingsSection: {
    marginHorizontal: 20,
    marginBottom: 32,
    backgroundColor: '#F7F8FA',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
    marginBottom: 2,
  },
  settingSubtext: {
    fontSize: 13,
    color: '#888',
  },
});
