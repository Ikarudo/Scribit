import React, { useState } from 'react';
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
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useReminders, ReminderSource } from '@/components/RemindersProvider';
import ReminderCreationModal from '@/components/ReminderCreationModal';
import { useAuth } from '@/components/useAuth';

const LIST_PAD = 20;
const springConfig = { damping: 14, stiffness: 380 };

// Authentic Material 3 Light Theme Color Scheme
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
};

const GROUP_CONFIG: Record<
  ReminderSource,
  { title: string; icon: string; tintKey: number }
> = {
  calendar: { title: 'From Calendar', icon: 'calendar', tintKey: 0 },
  task: { title: 'From Tasks', icon: 'check-square', tintKey: 1 },
  manual: { title: 'Created Here', icon: 'bell', tintKey: 2 },
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

export default function RemindersScreen() {
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
    const tint = M3.cardTints[config.tintKey % M3.cardTints.length];

    return (
      <View key={source} style={styles.groupBlock}>
        <View style={[styles.groupHeader, { backgroundColor: tint }]}>
          <View style={styles.groupHeaderLeft}>
            <View style={styles.groupIconWrap}>
              <Feather
                name={config.icon as 'calendar' | 'check-square' | 'bell'}
                size={18}
                color={M3.primary}
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
              thumbColor={muted ? M3.outlineVariant : M3.primary}
              trackColor={{ false: M3.surfaceContainerHighest, true: M3.primaryContainer }}
              ios_backgroundColor={M3.surfaceContainerHighest}
            />
          </View>
        </View>

        {data.map((reminder) => (
          <View
            key={reminder.id}
            style={[styles.reminderRow, { backgroundColor: M3.surfaceContainerLow }]}
          >
            <View style={styles.reminderBody}>
              <Text style={styles.reminderTitle} numberOfLines={2}>
                {reminder.title}
              </Text>
              <View style={styles.reminderMeta}>
                <Feather name="calendar" size={12} color={M3.onSurfaceVariant} />
                <Text style={styles.reminderMetaText}>{formatDate(reminder.date)}</Text>
                <Feather
                  name="clock"
                  size={12}
                  color={M3.onSurfaceVariant}
                  style={{ marginLeft: 12 }}
                />
                <Text style={styles.reminderMetaText}>{formatTime(reminder.time)}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => deleteReminder(reminder.id)}
              hitSlop={8}
            >
              <Feather name="trash-2" size={16} color={M3.error} />
            </TouchableOpacity>
          </View>
        ))}
      </View>
    );
  };

  if (authLoading || loading) {
    return (
      <View style={[styles.container, { backgroundColor: M3.background }]}>
        <View style={styles.loadingRoot}>
          <Text style={[styles.loadingText, { color: M3.onSurfaceVariant }]}>
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
    <View style={[styles.container, { backgroundColor: M3.background }]}>
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
            <Feather name="bell" size={16} color={M3.primary} />
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
            <Feather name="plus" size={20} color={M3.onPrimary} />
            <Text style={styles.addText}>New reminder</Text>
          </PressableScale>
        </View>

        {renderGroup('calendar')}
        {renderGroup('task')}
        {renderGroup('manual')}

        {totalReminders === 0 && (
          <View style={styles.emptyRoot}>
            <View style={styles.emptyIconWrap}>
              <Feather name="bell" size={44} color={M3.outline} />
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
    letterSpacing: 0.15,
  },
  scrollContent: {
    paddingHorizontal: LIST_PAD,
  },
  headline: {
    fontSize: 32,
    fontWeight: '400',
    color: M3.onSurface,
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
    backgroundColor: M3.primaryContainer,
    marginBottom: 24,
  },
  statsChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: M3.onPrimaryContainer,
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
    backgroundColor: M3.primary,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 6,
    shadowColor: M3.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  addText: {
    fontSize: 14,
    fontWeight: '500',
    color: M3.onPrimary,
    letterSpacing: 0.1,
  },
  groupBlock: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: M3.shadow,
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
    backgroundColor: M3.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: M3.onSurface,
    letterSpacing: 0.15,
  },
  groupCount: {
    fontSize: 14,
    fontWeight: '500',
    color: M3.onSurfaceVariant,
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
    color: M3.onSurfaceVariant,
    letterSpacing: 0.4,
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: M3.outlineVariant,
  },
  reminderBody: {
    flex: 1,
    minWidth: 0,
  },
  reminderTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: M3.onSurface,
    marginBottom: 4,
    letterSpacing: 0.1,
  },
  reminderMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reminderMetaText: {
    fontSize: 12,
    color: M3.onSurfaceVariant,
    marginLeft: 4,
    fontWeight: '400',
    letterSpacing: 0.4,
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
    backgroundColor: M3.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: M3.onSurface,
    marginBottom: 8,
    letterSpacing: 0,
  },
  emptySub: {
    fontSize: 14,
    color: M3.onSurfaceVariant,
    fontWeight: '400',
    textAlign: 'center',
    paddingHorizontal: 24,
    letterSpacing: 0.25,
    lineHeight: 20,
  },
});