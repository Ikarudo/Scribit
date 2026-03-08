import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';
import { Task, TaskPriority } from './TasksProvider';
import DatePickerModal from './DatePickerModal';
import TimePickerModal from './TimePickerModal';
import type { AppTheme } from '@/theme';

const PRIORITY_COLORS = { High: '#E85D5D', Medium: '#E8B83C', Low: '#5CB85C' };

const PRIORITY_OPTIONS: TaskPriority[] = ['High', 'Medium', 'Low'];

type TaskCreationModalProps = {
  visible: boolean;
  onClose: () => void;
  onSave: (task: Omit<Task, 'id' | 'createdAt'>, options?: { createReminder?: boolean }) => void;
  onDelete?: (taskId: string) => void;
  initialTask?: Task;
};

function createStyles(theme: AppTheme) {
  const c = theme.colors;
  return StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: c.scrim,
    },
    sheet: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: c.surface,
      borderTopLeftRadius: 32,
      borderTopRightRadius: 32,
      paddingHorizontal: 24,
      paddingTop: 12,
      maxHeight: '90%',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 12,
    },
    handle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: c.outline,
      alignSelf: 'center',
      marginBottom: 20,
    },
    title: {
      fontSize: 24,
      fontWeight: '800',
      color: c.onSurface,
      letterSpacing: -0.3,
      marginBottom: 20,
    },
    scroll: {
      maxHeight: 400,
      marginBottom: 20,
    },
    label: {
      fontSize: 11,
      fontWeight: '700',
      color: c.onSurfaceVariant,
      letterSpacing: 1.2,
      marginBottom: 10,
    },
    input: {
      borderRadius: 16,
      backgroundColor: c.surfaceVariant,
      borderWidth: 1.5,
      borderColor: c.outline,
      paddingHorizontal: 18,
      paddingVertical: 16,
      fontSize: 16,
      color: c.onSurface,
      marginBottom: 20,
    },
    textArea: {
      minHeight: 96,
      textAlignVertical: 'top',
    },
    hint: {
      fontSize: 12,
      color: c.onSurfaceVariant,
      marginTop: -8,
      marginBottom: 12,
    },
    dateButton: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 16,
      backgroundColor: c.surfaceVariant,
      borderWidth: 1.5,
      borderColor: c.outline,
      paddingHorizontal: 18,
      paddingVertical: 16,
      marginBottom: 20,
    },
    dateButtonText: {
      flex: 1,
      fontSize: 16,
      color: c.onSurface,
    },
    timeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 16,
      backgroundColor: c.surfaceVariant,
      borderWidth: 1.5,
      borderColor: c.outline,
      paddingHorizontal: 18,
      paddingVertical: 16,
      marginBottom: 20,
    },
    timeButtonText: {
      flex: 1,
      fontSize: 16,
      color: c.onSurface,
    },
    placeholder: {
      color: c.onSurfaceVariant,
    },
    clearBtn: {
      padding: 4,
    },
    optionsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginBottom: 20,
    },
    optionButton: {
      paddingVertical: 12,
      paddingHorizontal: 18,
      borderRadius: 14,
      borderWidth: 2,
      borderColor: c.outline,
      backgroundColor: c.surfaceVariant,
    },
    optionText: {
      fontSize: 14,
      color: c.onSurface,
      fontWeight: '600',
    },
    optionTextActive: {
      color: '#FFFFFF',
    },
    checkboxRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    checkbox: {
      width: 26,
      height: 26,
      borderRadius: 8,
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
    checkboxLabel: {
      fontSize: 16,
      color: c.onSurface,
      fontWeight: '500',
    },
    actions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
      gap: 12,
    },
    deleteBtn: {
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 16,
      backgroundColor: c.errorContainer,
      marginRight: 'auto',
    },
    deleteText: {
      color: c.onErrorContainer,
      fontSize: 16,
      fontWeight: '700',
    },
    cancelBtn: {
      paddingVertical: 12,
      paddingHorizontal: 20,
    },
    cancelText: {
      fontSize: 16,
      fontWeight: '600',
      color: c.onSurfaceVariant,
    },
    saveBtn: {
      backgroundColor: c.primary,
      borderRadius: 16,
      paddingHorizontal: 28,
      paddingVertical: 14,
      minWidth: 88,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: c.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 6,
      elevation: 3,
    },
    saveText: {
      fontSize: 16,
      fontWeight: '700',
      color: c.onPrimary,
    },
  });
}

export default function TaskCreationModal({
  visible,
  onClose,
  onSave,
  onDelete,
  initialTask,
}: TaskCreationModalProps) {
  const theme = useTheme<AppTheme>();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('Medium');
  const [completed, setCompleted] = useState(false);
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [addReminder, setAddReminder] = useState(false);

  // Update state when modal opens or initialTask changes
  useEffect(() => {
    if (visible) {
      if (initialTask) {
        setName(initialTask.name);
        setDescription(initialTask.description || '');
        setPriority(initialTask.priority);
        setCompleted(initialTask.completed);
        setDueDate(initialTask.dueDate || '');
        setDueTime(initialTask.dueTime || '');
      } else {
        setName('');
        setDescription('');
        setPriority('Medium');
        setCompleted(false);
        setDueDate('');
        setDueTime('');
        setAddReminder(false);
      }
    }
  }, [visible, initialTask]);

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a task name');
      return;
    }

    // Validate time format if provided
    if (dueTime && dueTime.trim()) {
      const timeRegex = /^\d{1,2}:\d{2}$/;
      if (!timeRegex.test(dueTime)) {
        Alert.alert('Error', 'Please enter a valid time (HH:MM)');
        return;
      }
      const [hours, minutes] = dueTime.split(':').map(Number);
      if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        Alert.alert('Error', 'Please enter a valid time');
        return;
      }
    }

    onSave(
      {
        name: name.trim(),
        description: description.trim() || undefined,
        priority,
        completed,
        dueDate: dueDate.trim() || undefined,
        dueTime: dueTime.trim() || undefined,
        calendarEventId: initialTask?.calendarEventId,
      },
      { createReminder: addReminder }
    );

    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  // Format date for display
  const formatDateDisplay = (dateStr: string): string => {
    try {
      // Parse date string manually to avoid timezone issues
      const parts = dateStr.split('-');
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const date = new Date(year, month, day);
      
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthName = months[date.getMonth()];
      const today = new Date();
      const isToday = date.toDateString() === today.toDateString();
      const isTomorrow = date.toDateString() === new Date(today.getTime() + 86400000).toDateString();
      
      if (isToday) return 'Today';
      if (isTomorrow) return 'Tomorrow';
      if (year === today.getFullYear()) {
        return `${monthName} ${day}`;
      }
      return `${monthName} ${day}, ${year}`;
    } catch (error) {
      return dateStr;
    }
  };

  // Format time for display (convert 24-hour to 12-hour with AM/PM)
  const formatTimeDisplay = (time24: string): string => {
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

  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleCancel}>
      <KeyboardAvoidingView
        style={StyleSheet.absoluteFill}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <Pressable style={styles.overlay} onPress={handleCancel} />
        <View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, 20) + 16 },
          ]}
        >
          <View style={styles.handle} />
          <Text style={styles.title}>
            {initialTask ? 'Edit task' : 'New task'}
          </Text>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
            <Text style={styles.label}>NAME</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Task name"
              placeholderTextColor={theme.colors.onSurfaceVariant}
            />

            <Text style={styles.label}>DESCRIPTION (OPTIONAL)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Description"
              placeholderTextColor={theme.colors.onSurfaceVariant}
              multiline
              numberOfLines={4}
            />

            <Text style={styles.label}>PRIORITY</Text>
            <View style={styles.optionsRow}>
              {PRIORITY_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.optionButton,
                    priority === option && {
                      backgroundColor: PRIORITY_COLORS[option],
                      borderColor: PRIORITY_COLORS[option],
                    },
                  ]}
                  onPress={() => setPriority(option)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.optionText,
                      priority === option && styles.optionTextActive,
                    ]}
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>DUE DATE (OPTIONAL)</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.7}
            >
              <Feather name="calendar" size={18} color={theme.colors.primary} style={{ marginRight: 10 }} />
              <Text style={[styles.dateButtonText, !dueDate && styles.placeholder]}>
                {dueDate ? formatDateDisplay(dueDate) : 'Select date'}
              </Text>
              {dueDate && (
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    setDueDate('');
                  }}
                  style={styles.clearBtn}
                  hitSlop={8}
                >
                  <Feather name="x" size={18} color={theme.colors.onSurfaceVariant} />
                </TouchableOpacity>
              )}
            </TouchableOpacity>

            {dueDate && (
              <>
                <Text style={styles.label}>TIME (OPTIONAL)</Text>
                <TouchableOpacity
                  style={styles.timeButton}
                  onPress={() => setShowTimePicker(true)}
                  activeOpacity={0.7}
                >
                  <Feather name="clock" size={18} color={theme.colors.primary} style={{ marginRight: 10 }} />
                  <Text style={[styles.timeButtonText, !dueTime && styles.placeholder]}>
                    {dueTime ? formatTimeDisplay(dueTime) : 'Select time'}
                  </Text>
                  {dueTime && (
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        setDueTime('');
                      }}
                      style={styles.clearBtn}
                      hitSlop={8}
                    >
                      <Feather name="x" size={18} color={theme.colors.onSurfaceVariant} />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              </>
            )}
            <Text style={styles.hint}>
              If the due date is not today, the task is added to the calendar.
            </Text>

            <View style={styles.checkboxRow}>
              <TouchableOpacity
                style={[styles.checkbox, completed && styles.checkboxChecked]}
                onPress={() => setCompleted(!completed)}
              >
                {completed && <Feather name="check" size={14} color={theme.colors.onPrimary} />}
              </TouchableOpacity>
              <Text style={styles.checkboxLabel}>Mark as completed</Text>
            </View>

            {dueDate && (
              <View style={styles.checkboxRow}>
                <TouchableOpacity
                  style={[styles.checkbox, addReminder && styles.checkboxChecked]}
                  onPress={() => setAddReminder(!addReminder)}
                >
                  {addReminder && <Feather name="check" size={14} color={theme.colors.onPrimary} />}
                </TouchableOpacity>
                <Text style={styles.checkboxLabel}>Add reminder for this task</Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.actions}>
            {initialTask && onDelete && (
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => {
                  onDelete(initialTask.id);
                  onClose();
                }}
              >
                <Text style={styles.deleteText}>Delete</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Date Picker Modal */}
      <DatePickerModal
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        onSelectDate={(date) => {
          setDueDate(date);
          setShowDatePicker(false);
        }}
        initialDate={dueDate}
      />

      {/* Time Picker Modal */}
      <TimePickerModal
        visible={showTimePicker}
        onClose={() => setShowTimePicker(false)}
        onSelectTime={(time) => {
          setDueTime(time);
          setShowTimePicker(false);
        }}
        initialTime={dueTime}
      />
    </Modal>
  );
}

