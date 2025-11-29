import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome } from '@expo/vector-icons';
import { useTasks, Task, TaskPriority } from '@/components/TasksProvider';
import { useCalendar } from '@/components/CalendarProvider';
import TaskCreationModal from '@/components/TaskCreationModal';

const PRIORITY_ORDER: TaskPriority[] = ['High', 'Medium', 'Low'];
const PRIORITY_COLORS = {
  High: '#FF6B6B',
  Medium: '#FFE66D',
  Low: '#6BCB77',
};

export default function TasksScreen() {
  const { tasks, loading, createTask, updateTask, deleteTask, toggleTaskComplete } = useTasks();
  const { createEvent, deleteEvent } = useCalendar();
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | undefined>(undefined);

  // Group tasks by priority
  const groupedTasks = tasks.reduce((groups, task) => {
    const priority = task.priority;
    if (!groups[priority]) {
      groups[priority] = [];
    }
    groups[priority].push(task);
    return groups;
  }, {} as Record<TaskPriority, Task[]>);

  // Sort tasks within each priority group by due date (earliest first), then by creation date
  PRIORITY_ORDER.forEach(priority => {
    if (groupedTasks[priority]) {
      groupedTasks[priority].sort((a, b) => {
        // Completed tasks go to the bottom
        if (a.completed !== b.completed) {
          return a.completed ? 1 : -1;
        }
        // Then sort by due date
        if (a.dueDate && b.dueDate) {
          return a.dueDate.localeCompare(b.dueDate);
        }
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        // Finally by creation date (newest first)
        return b.createdAt - a.createdAt;
      });
    }
  });

  // Format date for display
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
      if (date.getFullYear() === today.getFullYear()) {
        return `${month} ${day}`;
      }
      return `${month} ${day}, ${year}`;
    } catch (error) {
      return '';
    }
  };

  // Format time for display (convert 24-hour to 12-hour with AM/PM)
  const formatTime = (time24: string): string => {
    if (!time24 || !time24.includes(':')) {
      return '';
    }
    try {
      const [hours, minutes] = time24.split(':').map(Number);
      if (isNaN(hours) || isNaN(minutes)) return '';
      const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
      const ampm = hours >= 12 ? 'PM' : 'AM';
      return `${hour12}:${String(minutes).padStart(2, '0')} ${ampm}`;
    } catch (error) {
      return '';
    }
  };

  // Check if date is today
  const isDateToday = (dateStr: string): boolean => {
    if (!dateStr) return false;
    try {
      const date = new Date(dateStr);
      const today = new Date();
      return date.toDateString() === today.toDateString();
    } catch (error) {
      return false;
    }
  };

  // Handle create new task
  const handleCreateTask = () => {
    setSelectedTask(undefined);
    setShowTaskModal(true);
  };

  // Handle edit task
  const handleEditTask = (task: Task) => {
    setSelectedTask(task);
    setShowTaskModal(true);
  };

  // Handle save task
  const handleSaveTask = async (taskData: Omit<Task, 'id' | 'createdAt'>) => {
    try {
      if (selectedTask) {
        // If updating and calendar event exists, delete old one first
        if (selectedTask.calendarEventId) {
          try {
            await deleteEvent(selectedTask.calendarEventId);
          } catch (error) {
            console.error('Error deleting old calendar event:', error);
          }
        }

        // Update existing task
        let calendarEventId = undefined;
        
        // If due date is provided and not today, create new calendar event
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
          } catch (error) {
            console.error('Error creating calendar event for task:', error);
          }
        }

        await updateTask(selectedTask.id, { ...taskData, calendarEventId });
      } else {
        // Create new task
        let calendarEventId = undefined;
        
        // If due date is provided and not today, add to calendar
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
          } catch (error) {
            console.error('Error creating calendar event for task:', error);
            // Don't fail the task creation if calendar event fails
          }
        }

        await createTask({ ...taskData, calendarEventId });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save task. Please try again.');
      console.error('Error saving task:', error);
    }
  };

  // Handle delete task
  const handleDeleteTask = (taskId: string, showConfirmation: boolean = true) => {
    const performDelete = async () => {
      try {
        // Find the task to get its calendar event ID
        const task = tasks.find(t => t.id === taskId);
        
        // Delete associated calendar event if it exists
        if (task?.calendarEventId) {
          try {
            await deleteEvent(task.calendarEventId);
          } catch (error) {
            console.error('Error deleting calendar event:', error);
            // Continue with task deletion even if calendar event deletion fails
          }
        }

        await deleteTask(taskId);
        if (showConfirmation) {
          setShowTaskModal(false);
          setSelectedTask(undefined);
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to delete task. Please try again.');
        console.error('Error deleting task:', error);
      }
    };

    if (showConfirmation) {
      Alert.alert(
        'Delete Task',
        'Are you sure you want to delete this task?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: performDelete,
          },
        ]
      );
    } else {
      performDelete();
    }
  };

  // Handle toggle complete
  const handleToggleComplete = async (taskId: string) => {
    try {
      await toggleTaskComplete(taskId);
    } catch (error) {
      Alert.alert('Error', 'Failed to update task. Please try again.');
      console.error('Error toggling task complete:', error);
    }
  };

  // Handle change priority
  const handleChangePriority = async (task: Task, newPriority: TaskPriority) => {
    try {
      await updateTask(task.id, { priority: newPriority });
    } catch (error) {
      Alert.alert('Error', 'Failed to update priority. Please try again.');
      console.error('Error changing priority:', error);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading tasks...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.completed).length;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tasks</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleCreateTask}>
          <FontAwesome name="plus" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      {totalTasks > 0 && (
        <View style={styles.statsContainer}>
          <Text style={styles.statsText}>
            {completedTasks} of {totalTasks} completed
          </Text>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Tasks grouped by priority */}
        {PRIORITY_ORDER.map((priority) => {
          const priorityTasks = groupedTasks[priority] || [];
          if (priorityTasks.length === 0) return null;

          return (
            <View key={priority} style={styles.prioritySection}>
              <View style={styles.priorityHeader}>
                <View style={[styles.priorityIndicator, { backgroundColor: PRIORITY_COLORS[priority] }]} />
                <Text style={styles.priorityTitle}>{priority} Priority</Text>
                <Text style={styles.priorityCount}>({priorityTasks.length})</Text>
              </View>

              {priorityTasks.map((task) => (
                <TouchableOpacity
                  key={task.id}
                  style={[styles.taskItem, task.completed && styles.taskItemCompleted]}
                  onPress={() => handleEditTask(task)}
                >
                  <TouchableOpacity
                    style={[styles.checkbox, task.completed && styles.checkboxChecked]}
                    onPress={() => handleToggleComplete(task.id)}
                  >
                    {task.completed && <FontAwesome name="check" size={14} color="#fff" />}
                  </TouchableOpacity>
                  
                  <View style={styles.taskContent}>
                    <Text style={[styles.taskName, task.completed && styles.taskNameCompleted]}>
                      {task.name}
                    </Text>
                    {task.description && (
                      <Text style={[styles.taskDescription, task.completed && styles.taskDescriptionCompleted]} numberOfLines={2}>
                        {task.description}
                      </Text>
                    )}
                    {task.dueDate && (
                      <View style={styles.taskMeta}>
                        <FontAwesome name="calendar" size={12} color="#888" />
                        <Text style={[styles.taskDueDate, task.completed && styles.taskDueDateCompleted]}>
                          {formatDate(task.dueDate)}
                        </Text>
                        {task.dueTime && (
                          <>
                            <FontAwesome name="clock-o" size={12} color="#888" style={{ marginLeft: 12 }} />
                            <Text style={[styles.taskDueDate, task.completed && styles.taskDueDateCompleted]}>
                              {formatTime(task.dueTime)}
                            </Text>
                          </>
                        )}
                      </View>
                    )}
                  </View>

                  <View style={styles.taskActions}>
                    <TouchableOpacity
                      style={styles.priorityButton}
                      onPress={() => {
                        const currentIndex = PRIORITY_ORDER.indexOf(task.priority);
                        const nextIndex = (currentIndex + 1) % PRIORITY_ORDER.length;
                        handleChangePriority(task, PRIORITY_ORDER[nextIndex]);
                      }}
                    >
                      <View style={[styles.priorityDot, { backgroundColor: PRIORITY_COLORS[task.priority] }]} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDeleteTask(task.id, true)}
                    >
                      <FontAwesome name="trash" size={16} color="#FF7B7B" />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          );
        })}

        {/* Empty State */}
        {totalTasks === 0 && (
          <View style={styles.emptyContainer}>
            <FontAwesome name="check-square-o" size={48} color="#E0E0E0" />
            <Text style={styles.emptyText}>No tasks yet</Text>
            <Text style={styles.emptySubtext}>Tap the + button to create your first task</Text>
          </View>
        )}
      </ScrollView>

      {/* Task Creation Modal */}
      <TaskCreationModal
        visible={showTaskModal}
        onClose={() => {
          setShowTaskModal(false);
          setSelectedTask(undefined);
        }}
        onSave={handleSaveTask}
        onDelete={selectedTask ? (taskId) => handleDeleteTask(taskId, true) : undefined}
        initialTask={selectedTask}
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
  prioritySection: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  priorityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  priorityIndicator: {
    width: 4,
    height: 20,
    borderRadius: 2,
    marginRight: 8,
  },
  priorityTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
  },
  priorityCount: {
    fontSize: 14,
    color: '#888',
    marginLeft: 8,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F8FA',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  taskItemCompleted: {
    opacity: 0.6,
    backgroundColor: '#F0F0F0',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#7B61FF',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    backgroundColor: '#FAFAFA',
  },
  checkboxChecked: {
    backgroundColor: '#7B61FF',
    borderColor: '#7B61FF',
  },
  taskContent: {
    flex: 1,
  },
  taskName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
    marginBottom: 4,
  },
  taskNameCompleted: {
    textDecorationLine: 'line-through',
    color: '#888',
  },
  taskDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
  },
  taskDescriptionCompleted: {
    color: '#999',
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  taskDueDate: {
    fontSize: 12,
    color: '#888',
    marginLeft: 6,
  },
  taskDueDateCompleted: {
    color: '#999',
  },
  taskActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  priorityButton: {
    padding: 4,
  },
  priorityDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#fff',
  },
  deleteButton: {
    padding: 4,
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
