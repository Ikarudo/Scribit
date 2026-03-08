import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Pressable,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome5, Feather } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';
import { useReminders, ReminderSource } from '@/components/RemindersProvider';
import ReminderCreationModal from '@/components/ReminderCreationModal';
import { useAuth } from '@/components/useAuth';
import { useIsDark } from '@/components/ThemeContext';
import { cardTintsLight, cardTintsDark } from '@/theme';
import { PressableScale } from '@/components/ui/PressableScale';
import type { AppTheme } from '@/theme';

const LIST_PAD = 20;

const GROUP_CONFIG: Record<
  ReminderSource,
  { title: string; icon: string; tintKey: number }
> = {
  calendar: { title: 'From Calendar', icon: 'calendar', tintKey: 0 },
  task: { title: 'From Tasks', icon: 'check-square', tintKey: 1 },
  manual: { title: 'Created Here', icon: 'bell', tintKey: 2 },
};

export default function RemindersScreen() {
  const theme = useTheme<AppTheme>();
  const styles = useMemo(() => createRemindersStyles(theme), [theme]);
  const isDark = useIsDark();
  const cardTints = isDark ? cardTintsDark : cardTintsLight;
  const insets = useSafeAreaInsets();
  const { loading: authLoading } = useAuth();
  const {
    reminders,
    loading,
    sourceMute,
    setSourceMute,
    deleteReminder,
    createReminder,
  } = useReminders();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const grouped = {
    calendar: reminders.filter((r) => r.source === 'calendar'),
    task: reminders.filter((r) => r.source === 'task'),
    manual: reminders.filter((r) => r.source === 'manual'),
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

  const handleCreateReminder = async (data: { title: string; date: string; time: string }) => {
    try {
      await createReminder({
        title: data.title,
        date: data.date,
        time: data.time,
        source: 'manual',
        sourceId: undefined,
      });
    } catch (e) {
      Alert.alert('Error', 'Failed to create reminder. Please try again.');
      console.error(e);
    }
  };

  const renderGroup = (source: ReminderSource) => {
    const data = grouped[source];
    if (data.length === 0) return null;

    const config = GROUP_CONFIG[source];
    const muted = sourceMute[source];
    const tint = cardTints[config.tintKey % cardTints.length];

    return (
      <View key={source} style={styles.groupBlock}>
        <View style={[styles.groupHeader, { backgroundColor: tint }]}>
          <View style={styles.groupHeaderLeft}>
            <View style={styles.groupIconWrap}>
              <Feather
                name={config.icon as 'calendar' | 'check-square' | 'bell'}
                size={18}
                color={theme.colors.primary}
              />
            </View>
            <Text style={styles.groupTitle}>{config.title}</Text>
            <Text style={styles.groupCount}>{data.length}</Text>
          </View>
          <View style={styles.groupHeaderRight}>
            <Text style={styles.muteLabel}>{muted ? 'Muted' : 'Active'}</Text>
            <Switch
              value={muted}
              onValueChange={(v) => setSourceMute(source, v)}
              thumbColor={muted ? theme.colors.outlineVariant : theme.colors.primary}
              trackColor={{ false: theme.colors.surfaceVariant, true: theme.colors.primaryContainer }}
              ios_backgroundColor={theme.colors.surfaceVariant}
            />
          </View>
        </View>

        {data.map((reminder) => {
          let isPast = false;
          try {
            const [y, m, d] = reminder.date.split('-').map(Number);
            const [hh, mm] = (reminder.time || '00:00').split(':').map(Number);
            const dt = new Date(y, m - 1, d, hh || 0, mm || 0);
            if (!Number.isNaN(dt.getTime())) {
              isPast = dt < new Date();
            }
          } catch {
            isPast = false;
          }

          return (
            <View
              key={reminder.id}
              style={[
                styles.reminderRow,
                { backgroundColor: theme.colors.surfaceVariant },
                isPast && styles.reminderRowPast,
              ]}
            >
              <View style={styles.reminderBody}>
                <Text
                  style={[styles.reminderTitle, isPast && styles.reminderTitlePast]}
                  numberOfLines={2}
                >
                  {reminder.title}
                </Text>
                <View style={styles.reminderMeta}>
                  <Feather name="calendar" size={12} color={theme.colors.onSurfaceVariant} />
                  <Text
                    style={[styles.reminderMetaText, isPast && styles.reminderMetaTextPast]}
                  >
                    {formatDate(reminder.date)}
                  </Text>
                  <Feather
                    name="clock"
                    size={12}
                    color={theme.colors.onSurfaceVariant}
                    style={{ marginLeft: 12 }}
                  />
                  <Text
                    style={[styles.reminderMetaText, isPast && styles.reminderMetaTextPast]}
                  >
                    {formatTime(reminder.time)}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => deleteReminder(reminder.id)}
                hitSlop={8}
              >
                <Feather name="trash-2" size={16} color={theme.colors.error} />
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    );
  };

  if (authLoading || loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingRoot}>
          <Text style={[styles.loadingText, { color: theme.colors.onSurfaceVariant }]}>
            Loading reminders…
          </Text>
        </View>
      </View>
    );
  }

  const totalReminders = reminders.length;
  const scrollBottom = Math.max(insets.bottom, 24) + 90;
  const scrollTop = 24 + insets.top;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: scrollTop, paddingBottom: scrollBottom },
        ]}
      >
        <Text style={styles.headline}>Reminders</Text>
        {totalReminders > 0 && (
          <View style={styles.statsChip}>
            <Feather name="bell" size={16} color={theme.colors.primary} />
            <Text style={styles.statsChipText}>
              {totalReminders} active reminder{totalReminders === 1 ? '' : 's'}
            </Text>
          </View>
        )}

        <View style={styles.headerRow}>
          <PressableScale
            onPress={() => setShowCreateModal(true)}
            style={styles.addWrap}
            contentStyle={styles.addBtn}
          >
            <Feather name="plus" size={20} color={theme.colors.onPrimary} />
            <Text style={styles.addText}>New reminder</Text>
          </PressableScale>
        </View>

        {renderGroup('calendar')}
        {renderGroup('task')}
        {renderGroup('manual')}

        {totalReminders === 0 && (
          <View style={styles.emptyRoot}>
            <View style={styles.emptyIconWrap}>
              <Feather name="bell" size={44} color={theme.colors.outline} />
            </View>
            <Text style={styles.emptyTitle}>No reminders yet</Text>
            <Text style={styles.emptySub}>
              Reminders from Calendar and Tasks show up here, or tap "New reminder" to add one.
            </Text>
          </View>
        )}
      </ScrollView>

      <ReminderCreationModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSave={handleCreateReminder}
      />
    </View>
  );
}

function createRemindersStyles(theme: AppTheme) {
  const c = theme.colors;
  return StyleSheet.create({
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
    letterSpacing: 0.15,
  },
  scrollContent: {
    paddingHorizontal: LIST_PAD,
  },
  headline: {
    fontSize: 32,
    fontWeight: '400',
    color: c.onSurface,
    letterSpacing: 0,
    marginBottom: 16,
  },
  statsChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: c.primaryContainer,
    marginBottom: 24,
  },
  statsChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: c.onPrimaryContainer,
    letterSpacing: 0.1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  addWrap: {
    alignSelf: 'flex-start',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.primary,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 6,
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  addText: {
    fontSize: 14,
    fontWeight: '500',
    color: c.onPrimary,
    letterSpacing: 0.1,
  },
  groupBlock: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  groupHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  groupIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: c.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: c.onSurface,
    letterSpacing: 0.15,
  },
  groupCount: {
    fontSize: 14,
    fontWeight: '500',
    color: c.onSurfaceVariant,
    letterSpacing: 0.1,
  },
  groupHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  muteLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: c.onSurfaceVariant,
    letterSpacing: 0.4,
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: c.outlineVariant,
  },
  reminderRowPast: {
    opacity: 0.55,
  },
  reminderBody: {
    flex: 1,
    minWidth: 0,
  },
  reminderTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: c.onSurface,
    marginBottom: 4,
    letterSpacing: 0.1,
  },
  reminderTitlePast: {
    textDecorationLine: 'line-through',
  },
  reminderMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reminderMetaText: {
    fontSize: 12,
    color: c.onSurfaceVariant,
    marginLeft: 4,
    fontWeight: '400',
    letterSpacing: 0.4,
  },
  reminderMetaTextPast: {
    textDecorationLine: 'line-through',
  },
  deleteBtn: {
    padding: 8,
    borderRadius: 20,
  },
  emptyRoot: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: c.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: c.onSurface,
    marginBottom: 8,
    letterSpacing: 0,
  },
  emptySub: {
    fontSize: 14,
    color: c.onSurfaceVariant,
    fontWeight: '400',
    textAlign: 'center',
    paddingHorizontal: 24,
    letterSpacing: 0.25,
    lineHeight: 20,
  },
  });
}