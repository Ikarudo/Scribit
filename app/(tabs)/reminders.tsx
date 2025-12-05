import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome } from '@expo/vector-icons';
import { useReminders, ReminderSource } from '@/components/RemindersProvider';
import ReminderCreationModal from '@/components/ReminderCreationModal';
import { useAuth } from '@/components/useAuth';

export default function RemindersScreen() {
  const { loading: authLoading } = useAuth();
  const { reminders, loading, sourceMute, setSourceMute, deleteReminder } = useReminders();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const grouped = {
    calendar: reminders.filter(r => r.source === 'calendar'),
    task: reminders.filter(r => r.source === 'task'),
    manual: reminders.filter(r => r.source === 'manual'),
  };

  const formatDate = (dateStr: string): string => {
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[date.getMonth()];
      const day = date.getDate();
      const year = date.getFullYear();
      const today = new Date();
      const isToday = date.toDateString() === today.toDateString();
      const isTomorrow = date.toDateString() === new Date(today.getTime() + 86400000).toDateString();
      if (isToday) return 'Today';
      if (isTomorrow) return 'Tomorrow';
      if (year === today.getFullYear()) return `${month} ${day}`;
      return `${month} ${day}, ${year}`;
    } catch {
      return dateStr;
    }
  };

  const formatTime = (time24: string): string => {
    if (!time24 || !time24.includes(':')) return '';
    try {
      const [hours, minutes] = time24.split(':').map(Number);
      if (isNaN(hours) || isNaN(minutes)) return '';
      const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
      const ampm = hours >= 12 ? 'PM' : 'AM';
      return `${hour12}:${String(minutes).padStart(2, '0')} ${ampm}`;
    } catch {
      return '';
    }
  };

  const renderGroup = (source: ReminderSource, title: string, icon: string) => {
    const data = grouped[source];
    if (data.length === 0) return null;

    const muted = sourceMute[source];

    return (
      <View style={styles.groupSection}>
        <View style={styles.groupHeader}>
          <View style={styles.groupHeaderLeft}>
            <FontAwesome name={icon as any} size={18} color="#7B61FF" style={{ marginRight: 8 }} />
            <Text style={styles.groupTitle}>{title}</Text>
            <Text style={styles.groupCount}>({data.length})</Text>
          </View>
          <View style={styles.groupHeaderRight}>
            <Text style={styles.muteLabel}>{muted ? 'Muted' : 'Active'}</Text>
            <Switch
              value={muted}
              onValueChange={(value) => setSourceMute(source, value)}
              thumbColor={muted ? '#ccc' : '#7B61FF'}
              trackColor={{ false: '#E0E0E0', true: '#C5C5C5' }}
            />
          </View>
        </View>

        {data.map(reminder => (
          <View key={reminder.id} style={styles.reminderItem}>
            <View style={styles.reminderContent}>
              <Text style={styles.reminderTitle} numberOfLines={2}>{reminder.title}</Text>
              <View style={styles.reminderMeta}>
                <FontAwesome name="calendar" size={12} color="#888" />
                <Text style={styles.reminderMetaText}>{formatDate(reminder.date)}</Text>
                <FontAwesome name="clock-o" size={12} color="#888" style={{ marginLeft: 12 }} />
                <Text style={styles.reminderMetaText}>{formatTime(reminder.time)}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => deleteReminder(reminder.id)}
            >
              <FontAwesome name="trash" size={16} color="#FF7B7B" />
            </TouchableOpacity>
          </View>
        ))}
      </View>
    );
  };

  if (authLoading || loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading reminders...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const totalReminders = reminders.length;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Reminders</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowCreateModal(true)}
        >
          <FontAwesome name="plus" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {totalReminders > 0 && (
        <View style={styles.statsContainer}>
          <Text style={styles.statsText}>
            {totalReminders} active reminder{totalReminders === 1 ? '' : 's'}
          </Text>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false}>
        {renderGroup('calendar', 'From Calendar', 'calendar')}
        {renderGroup('task', 'From Tasks', 'check-square-o')}
        {renderGroup('manual', 'Created Here', 'bell')}

        {totalReminders === 0 && (
          <View style={styles.emptyContainer}>
            <FontAwesome name="bell-o" size={48} color="#E0E0E0" />
            <Text style={styles.emptyText}>No reminders yet</Text>
            <Text style={styles.emptySubtext}>
              Reminders from Calendar and Tasks will appear here, or tap + to create one.
            </Text>
          </View>
        )}
      </ScrollView>

      <ReminderCreationModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSave={async ({ title, date, time }) => {
          // Manual reminders are scheduled through RemindersProvider
          // via createReminder exposed through context. For simplicity,
          // we call the hook function here using source 'manual'.
          const { createReminder } = useReminders();
          await createReminder({
            title,
            date,
            time,
            source: 'manual',
            sourceId: undefined,
          });
        }}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#222',
  },
  addButton: {
    backgroundColor: '#7B61FF',
    borderRadius: 26,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7B61FF',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  statsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 8,
  },
  statsText: {
    fontSize: 14,
    color: '#888',
    fontWeight: '500',
  },
  groupSection: {
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: '#F7F8FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    overflow: 'hidden',
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    backgroundColor: '#EBEBEB',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  groupHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222',
  },
  groupCount: {
    fontSize: 14,
    color: '#888',
    marginLeft: 8,
  },
  muteLabel: {
    fontSize: 12,
    color: '#888',
    marginRight: 8,
  },
  reminderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#EDEDED',
    backgroundColor: '#fff',
  },
  reminderContent: {
    flex: 1,
  },
  reminderTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#222',
    marginBottom: 4,
  },
  reminderMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reminderMetaText: {
    fontSize: 12,
    color: '#888',
    marginLeft: 4,
  },
  deleteButton: {
    padding: 4,
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    marginHorizontal: 16,
  },
  emptyText: {
    fontSize: 18,
    color: '#888',
    marginTop: 16,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#BDBDBD',
    marginTop: 8,
    textAlign: 'center',
  },
});