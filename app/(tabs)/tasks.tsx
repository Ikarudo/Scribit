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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome, Feather } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useTasks, Task, TaskPriority } from '@/components/TasksProvider';
import { useCalendar } from '@/components/CalendarProvider';
import { useReminders } from '@/components/RemindersProvider';
import TaskCreationModal from '@/components/TaskCreationModal';
import { useAuth } from '@/components/useAuth';

const LIST_PAD = 20;
const springConfig = { damping: 14, stiffness: 380 };

const PRIORITY_ORDER: TaskPriority[] = ['High', 'Medium', 'Low'];
const PRIORITY_COLORS = {
  High: '#E85D5D',
  Medium: '#E8B83C',
  Low: '#5CB85C',
};
const PRIORITY_TINT = {
  High: '#FFF0EB',
  Medium: '#FFF8E8',
  Low: '#E8F8F2',
};

const M3 = {
  background: '#f2edf8',
  surface: '#FFFFFF',
  primary: '#7C5DE8',
  primaryContainer: '#E8E0FC',
  onPrimary: '#FFFFFF',
  onSurface: '#1C1B22',
  onSurfaceVariant: '#5C5868',
  outline: '#D4CFE0',
  outlineVariant: '#E6E1ED',
  surfaceContainerHighest: '#EAE4F5',
  errorContainer: '#FFEBEE',
  onErrorContainer: '#b85757',
  tint: ['#F0EBFF', '#E8F8F2', '#FFF0EB', '#E8F0FF', '#f2e6f5', '#f9ead6'],
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

export default function TasksScreen() {
  const insets = useSafeAreaInsets();
  const { loading: authLoading } = useAuth();
  const { tasks, loading, createTask, updateTask, deleteTask, toggleTaskComplete } = useTasks();
  const { createEvent, deleteEvent } = useCalendar();
  const { createReminderForTask } = useReminders();
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | undefined>(undefined);

  const groupedTasks = tasks.reduce((groups, task) => {
    const p = task.priority;
    if (!groups[p]) groups[p] = [];
    groups[p].push(task);
    return groups;
  }, {} as Record<TaskPriority, Task[]>);

  PRIORITY_ORDER.forEach((p) => {
    if (groupedTasks[p]) {
      groupedTasks[p].sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        return b.createdAt - a.createdAt;
      });
    }
  });

  const formatDate = (dateStr: string): string => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '';
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[date.getMonth()];
      const day = date.getDate();
      const year = date.getFullYear();
      const today = new Date();
      const isToday = date.toDateString() === today.toDateString();
      const isTomorrow = date.toDateString() === new Date(today.getTime() + 86400000).toDateString();
      if (isToday) return 'Today';
      if (isTomorrow) return 'Tomorrow';
      if (date.getFullYear() === today.getFullYear()) return `${month} ${day}`;
      return `${month} ${day}, ${year}`;
    } catch {
      return '';
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

  const isDateToday = (dateStr: string): boolean => {
    if (!dateStr) return false;
    try {
      return new Date(dateStr).toDateString() === new Date().toDateString();
    } catch {
      return false;
    }
  };

  const handleCreateTask = () => {
    setSelectedTask(undefined);
    setShowTaskModal(true);
  };

  const handleEditTask = (task: Task) => {
    setSelectedTask(task);
    setShowTaskModal(true);
  };

  const handleSaveTask = async (
    taskData: Omit<Task, 'id' | 'createdAt'>,
    options?: { createReminder?: boolean }
  ) => {
    try {
      const shouldCreateReminder =
        !!options?.createReminder && !!taskData.dueDate && !!taskData.dueTime;

      if (selectedTask) {
        if (selectedTask.calendarEventId) {
          try {
            await deleteEvent(selectedTask.calendarEventId);
          } catch (e) {
            console.error(e);
          }
        }
        let calendarEventId: string | undefined;
        if (taskData.dueDate && !isDateToday(taskData.dueDate)) {
          try {
            calendarEventId = await createEvent({
              title: taskData.name,
              date: taskData.dueDate,
              time: taskData.dueTime || '09:00',
              repeat: 'None',
              color: PRIORITY_COLORS[taskData.priority],
              eventType: 'Assignment',
            });
          } catch (e) {
            console.error(e);
          }
        }
        await updateTask(selectedTask.id, { ...taskData, calendarEventId });
        if (shouldCreateReminder) {
          await createReminderForTask({
            ...selectedTask,
            ...taskData,
            calendarEventId,
          });
        }
      } else {
        let calendarEventId: string | undefined;
        if (taskData.dueDate && !isDateToday(taskData.dueDate)) {
          try {
            calendarEventId = await createEvent({
              title: taskData.name,
              date: taskData.dueDate,
              time: taskData.dueTime || '09:00',
              repeat: 'None',
              color: PRIORITY_COLORS[taskData.priority],
              eventType: 'Assignment',
            });
          } catch (e) {
            console.error(e);
          }
        }
        await createTask({ ...taskData, calendarEventId });
        if (shouldCreateReminder) {
          await createReminderForTask({
            id: 'temp',
            name: taskData.name,
            description: taskData.description,
            priority: taskData.priority,
            completed: taskData.completed,
            dueDate: taskData.dueDate,
            dueTime: taskData.dueTime,
            createdAt: Date.now(),
            calendarEventId,
          });
        }
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to save task. Please try again.');
      console.error(e);
    }
  };

  const handleDeleteTask = (taskId: string, showConfirmation: boolean = true) => {
    const performDelete = async () => {
      try {
        const task = tasks.find((t) => t.id === taskId);
        if (task?.calendarEventId) {
          try {
            await deleteEvent(task.calendarEventId);
          } catch (e) {
            console.error(e);
          }
        }
        await deleteTask(taskId);
        if (showConfirmation) {
          setShowTaskModal(false);
          setSelectedTask(undefined);
        }
      } catch (e) {
        Alert.alert('Error', 'Failed to delete task. Please try again.');
        console.error(e);
      }
    };
    if (showConfirmation) {
      Alert.alert('Delete Task', 'Are you sure you want to delete this task?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: performDelete },
      ]);
    } else {
      performDelete();
    }
  };

  const handleToggleComplete = async (taskId: string) => {
    try {
      await toggleTaskComplete(taskId);
    } catch (e) {
      Alert.alert('Error', 'Failed to update task. Please try again.');
      console.error(e);
    }
  };

  const handleChangePriority = async (task: Task, newPriority: TaskPriority) => {
    try {
      await updateTask(task.id, { priority: newPriority });
    } catch (e) {
      Alert.alert('Error', 'Failed to update priority. Please try again.');
      console.error(e);
    }
  };

  if (authLoading || loading) {
    return (
      <View style={[styles.container, { backgroundColor: M3.background }]}>
        <View style={styles.loadingRoot}>
          <Text style={[styles.loadingText, { color: M3.onSurfaceVariant }]}>
            Loading tasks…
          </Text>
        </View>
      </View>
    );
  }

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.completed).length;
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
        <Text style={styles.headline}>Get it done</Text>
        {totalTasks > 0 && (
          <View style={styles.statsChip}>
            <Feather name="check-circle" size={16} color={M3.primary} />
            <Text style={styles.statsChipText}>
              {completedTasks} of {totalTasks} completed
            </Text>
          </View>
        )}

        <View style={styles.headerRow}>
          <Text style={styles.sectionTitle}>Tasks</Text>
          <PressableScale
            onPress={handleCreateTask}
            style={styles.addWrap}
            contentStyle={styles.addBtn}
          >
            <Feather name="plus" size={20} color={M3.onPrimary} />
            <Text style={styles.addText}>New task</Text>
          </PressableScale>
        </View>

        {PRIORITY_ORDER.map((priority) => {
          const priorityTasks = groupedTasks[priority] || [];
          if (priorityTasks.length === 0) return null;

          const tint = PRIORITY_TINT[priority];
          const color = PRIORITY_COLORS[priority];

          return (
            <View key={priority} style={styles.priorityBlock}>
              <View style={styles.priorityHeader}>
                <View style={[styles.priorityDot, { backgroundColor: color }]} />
                <Text style={styles.priorityLabel}>{priority} priority</Text>
                <Text style={styles.priorityCount}>{priorityTasks.length}</Text>
              </View>

              {priorityTasks.map((task) => (
                <PressableScale
                  key={task.id}
                  onPress={() => handleEditTask(task)}
                  style={styles.taskWrap}
                  contentStyle={[
                    styles.taskCard,
                    { backgroundColor: tint },
                    task.completed && styles.taskCardCompleted,
                  ]}
                >
                  <TouchableOpacity
                    style={[styles.checkbox, task.completed && styles.checkboxChecked]}
                    onPress={() => handleToggleComplete(task.id)}
                    hitSlop={8}
                  >
                    {task.completed && (
                      <Feather name="check" size={14} color={M3.onPrimary} />
                    )}
                  </TouchableOpacity>
                  <View style={styles.taskBody}>
                    <Text
                      style={[styles.taskName, task.completed && styles.taskNameCompleted]}
                      numberOfLines={2}
                    >
                      {task.name}
                    </Text>
                    {task.description ? (
                      <Text
                        style={[styles.taskDesc, task.completed && styles.taskDescCompleted]}
                        numberOfLines={2}
                      >
                        {task.description}
                      </Text>
                    ) : null}
                    {task.dueDate ? (
                      <View style={styles.taskMeta}>
                        <Feather name="calendar" size={12} color={M3.onSurfaceVariant} />
                        <Text
                          style={[styles.taskMetaText, task.completed && styles.taskMetaCompleted]}
                        >
                          {formatDate(task.dueDate)}
                        </Text>
                        {task.dueTime ? (
                          <>
                            <Feather
                              name="clock"
                              size={12}
                              color={M3.onSurfaceVariant}
                              style={{ marginLeft: 12 }}
                            />
                            <Text
                              style={[
                                styles.taskMetaText,
                                task.completed && styles.taskMetaCompleted,
                              ]}
                            >
                              {formatTime(task.dueTime)}
                            </Text>
                          </>
                        ) : null}
                      </View>
                    ) : null}
                  </View>
                  <View style={styles.taskActions}>
                    <TouchableOpacity
                      style={styles.priorityBtn}
                      onPress={() => {
                        const i = PRIORITY_ORDER.indexOf(task.priority);
                        handleChangePriority(
                          task,
                          PRIORITY_ORDER[(i + 1) % PRIORITY_ORDER.length]
                        );
                      }}
                      hitSlop={8}
                    >
                      <View style={[styles.priorityDotSmall, { backgroundColor: color }]} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => handleDeleteTask(task.id, true)}
                      hitSlop={8}
                    >
                      <Feather name="trash-2" size={16} color={M3.onErrorContainer} />
                    </TouchableOpacity>
                  </View>
                </PressableScale>
              ))}
            </View>
          );
        })}

        {totalTasks === 0 && (
          <View style={styles.emptyRoot}>
            <View style={styles.emptyIconWrap}>
              <Feather name="check-square" size={44} color={M3.outlineVariant} />
            </View>
            <Text style={styles.emptyTitle}>No tasks yet</Text>
            <Text style={styles.emptySub}>Tap “New task” to add your first one</Text>
          </View>
        )}
      </ScrollView>

      <TaskCreationModal
        visible={showTaskModal}
        onClose={() => {
          setShowTaskModal(false);
          setSelectedTask(undefined);
        }}
        onSave={handleSaveTask}
        onDelete={selectedTask ? (id) => handleDeleteTask(id, true) : undefined}
        initialTask={selectedTask}
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
    marginBottom: 12,
  },
  statsChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: M3.primaryContainer,
    marginBottom: 24,
  },
  statsChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: M3.primary,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: M3.onSurface,
  },
  addWrap: {
    alignSelf: 'flex-start',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: M3.primary,
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
    shadowColor: M3.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  addText: {
    fontSize: 15,
    fontWeight: '700',
    color: M3.onPrimary,
  },
  priorityBlock: {
    marginBottom: 24,
  },
  priorityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  priorityLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: M3.onSurface,
  },
  priorityCount: {
    fontSize: 14,
    fontWeight: '600',
    color: M3.onSurfaceVariant,
  },
  taskWrap: {
    width: '100%',
    marginBottom: 10,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: M3.outline,
    overflow: 'hidden',
  },
  taskCardCompleted: {
    opacity: 0.75,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: M3.primary,
    backgroundColor: M3.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  checkboxChecked: {
    backgroundColor: M3.primary,
    borderColor: M3.primary,
  },
  taskBody: {
    flex: 1,
    minWidth: 0,
  },
  taskName: {
    fontSize: 16,
    fontWeight: '700',
    color: M3.onSurface,
    marginBottom: 2,
  },
  taskNameCompleted: {
    textDecorationLine: 'line-through',
    color: M3.onSurfaceVariant,
  },
  taskDesc: {
    fontSize: 14,
    color: M3.onSurfaceVariant,
    marginBottom: 4,
  },
  taskDescCompleted: {
    color: M3.outlineVariant,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  taskMetaText: {
    fontSize: 12,
    color: M3.onSurfaceVariant,
    marginLeft: 4,
    fontWeight: '500',
  },
  taskMetaCompleted: {
    color: M3.outlineVariant,
  },
  taskActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priorityBtn: {
    padding: 4,
  },
  priorityDotSmall: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: M3.surface,
  },
  deleteBtn: {
    padding: 4,
  },
  emptyRoot: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: M3.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: M3.onSurface,
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 15,
    color: M3.onSurfaceVariant,
    fontWeight: '500',
  },
});
