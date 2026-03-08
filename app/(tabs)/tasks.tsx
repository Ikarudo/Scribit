import React, { useState, useMemo } from 'react';
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
import { FontAwesome5, Feather } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';
import { useTasks, Task, TaskPriority } from '@/components/TasksProvider';
import { parseLocalDate } from '@/constants/dateUtils';
import { useCalendar } from '@/components/CalendarProvider';
import { useReminders } from '@/components/RemindersProvider';
import TaskCreationModal from '@/components/TaskCreationModal';
import { useAuth } from '@/components/useAuth';
import { PressableScale } from '@/components/ui/PressableScale';
import type { AppTheme } from '@/theme';

const LIST_PAD = 20;

const PRIORITY_ORDER: TaskPriority[] = ['High', 'Medium', 'Low'];

// Dark-mode priority accents (keep existing strong colors)
const PRIORITY_COLORS_DARK: Record<TaskPriority, string> = {
  High: '#C62828',
  Medium: '#F9DA2F',
  Low: '#347F37',
};

// Dark-mode card tints (existing)
const PRIORITY_TINT_DARK: Record<TaskPriority, string> = {
  High: '#b95d66',
  Medium: '#DCC751',
  Low: '#52A855',
};

// Light-mode priority accents – softer pastels to match the UI
const PRIORITY_COLORS_LIGHT: Record<TaskPriority, string> = {
  High: '#e45757ce',   // soft red
  Medium: '#FFB74D', // soft amber
  Low: '#81C784',    // soft green
};

// Light-mode card tints – very light pastel backgrounds
const PRIORITY_TINT_LIGHT: Record<TaskPriority, string> = {
  High: '#fdd3d9',
  Medium: '#ffefd6',
  Low: '#daf2dc',
};

export default function TasksScreen() {
  const theme = useTheme<AppTheme>();
  const styles = useMemo(() => createTasksStyles(theme), [theme]);
  const PRIORITY_COLORS = theme.dark ? PRIORITY_COLORS_DARK : PRIORITY_COLORS_LIGHT;
  const PRIORITY_TINT = theme.dark ? PRIORITY_TINT_DARK : PRIORITY_TINT_LIGHT;
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
      const date = parseLocalDate(dateStr);
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
      return parseLocalDate(dateStr).toDateString() === new Date().toDateString();
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
      // Reminder can be created with just dueDate; default time 09:00 used if dueTime missing
      const shouldCreateReminder =
        !!options?.createReminder && !!taskData.dueDate;

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
              eventType: 'Task',
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
            dueTime: taskData.dueTime || '09:00',
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
              eventType: 'Task',
            });
          } catch (e) {
            console.error(e);
          }
        }
        const newTaskId = await createTask({ ...taskData, calendarEventId });
        if (shouldCreateReminder) {
          await createReminderForTask({
            id: newTaskId,
            name: taskData.name,
            description: taskData.description,
            priority: taskData.priority,
            completed: taskData.completed,
            dueDate: taskData.dueDate,
            dueTime: taskData.dueTime || '09:00',
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
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingRoot}>
          <Text style={[styles.loadingText, { color: theme.colors.onSurfaceVariant }]}>
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
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
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
            <Feather name="check-circle" size={16} color={theme.colors.primary} />
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
            <Feather name="plus" size={20} color={theme.colors.onPrimary} />
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
                      <Feather name="check" size={14} color={theme.colors.onPrimary} />
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
                        <Feather name="calendar" size={12} color={theme.colors.onSurfaceVariant} />
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
                              color={theme.colors.onSurfaceVariant}
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
                      <Feather name="trash-2" size={16} color={theme.colors.error} />
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
              <Feather name="check-square" size={44} color={theme.colors.outline} />
            </View>
            <Text style={styles.emptyTitle}>No tasks yet</Text>
            <Text style={styles.emptySub}>Tap "New task" to add your first one</Text>
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

function createTasksStyles(theme: AppTheme) {
  const c = theme.colors;
  const subtleOnSurface = theme.dark ? c.onSurface : c.onSurfaceVariant;
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
  sectionTitle: {
    fontSize: 22,
    fontWeight: '400',
    color: c.onSurface,
    letterSpacing: 0,
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
  priorityBlock: {
    marginBottom: 28,
  },
  priorityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  priorityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  priorityLabel: {
    fontSize: 18,
    fontWeight: '500',
    color: c.onSurface,
    letterSpacing: 0.15,
  },
  priorityCount: {
    fontSize: 14,
    fontWeight: '500',
    color: subtleOnSurface,
    letterSpacing: 0.1,
  },
  taskWrap: {
    width: '100%',
    marginBottom: 10,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    overflow: 'hidden',
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  taskCardCompleted: {
    opacity: 0.65,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: c.primary,
    backgroundColor: c.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: c.primary,
    borderColor: c.primary,
  },
  taskBody: {
    flex: 1,
    minWidth: 0,
  },
  taskName: {
    fontSize: 16,
    fontWeight: '500',
    color: c.onSurface,
    marginBottom: 2,
    letterSpacing: 0.15,
  },
  taskNameCompleted: {
    textDecorationLine: 'line-through',
    color: subtleOnSurface,
  },
  taskDesc: {
    fontSize: 14,
    color: subtleOnSurface,
    marginBottom: 4,
    letterSpacing: 0.25,
  },
  taskDescCompleted: {
    opacity: 0.6,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  taskMetaText: {
    fontSize: 12,
    color: subtleOnSurface,
    marginLeft: 4,
    fontWeight: '400',
    letterSpacing: 0.4,
  },
  taskMetaCompleted: {
    opacity: 0.6,
  },
  taskActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  priorityBtn: {
    padding: 8,
    borderRadius: 20,
  },
  priorityDotSmall: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.9)',
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
    letterSpacing: 0.25,
  },
  });
}
