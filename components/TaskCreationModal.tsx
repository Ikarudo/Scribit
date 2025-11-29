import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Task, TaskPriority } from './TasksProvider';
import DatePickerModal from './DatePickerModal';
import TimePickerModal from './TimePickerModal';

const PRIORITY_OPTIONS: TaskPriority[] = ['High', 'Medium', 'Low'];

type TaskCreationModalProps = {
  visible: boolean;
  onClose: () => void;
  onSave: (task: Omit<Task, 'id' | 'createdAt'>) => void;
  onDelete?: (taskId: string) => void;
  initialTask?: Task;
};

export default function TaskCreationModal({
  visible,
  onClose,
  onSave,
  onDelete,
  initialTask,
}: TaskCreationModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('Medium');
  const [completed, setCompleted] = useState(false);
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

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

    onSave({
      name: name.trim(),
      description: description.trim() || undefined,
      priority,
      completed,
      dueDate: dueDate.trim() || undefined,
      dueTime: dueTime.trim() || undefined,
      calendarEventId: initialTask?.calendarEventId,
    });

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

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleCancel}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>{initialTask ? 'Edit Task' : 'Create New Task'}</Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Name */}
            <Text style={styles.label}>Task Name *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter task name"
              placeholderTextColor="#BDBDBD"
            />

            {/* Description */}
            <Text style={styles.label}>Description (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Enter task description"
              placeholderTextColor="#BDBDBD"
              multiline
              numberOfLines={4}
            />

            {/* Priority */}
            <Text style={styles.label}>Priority</Text>
            <View style={styles.optionsRow}>
              {PRIORITY_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.optionButton,
                    priority === option && styles.optionButtonActive,
                    priority === 'High' && option === 'High' && styles.priorityHigh,
                    priority === 'Medium' && option === 'Medium' && styles.priorityMedium,
                    priority === 'Low' && option === 'Low' && styles.priorityLow,
                  ]}
                  onPress={() => setPriority(option)}
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

            {/* Due Date */}
            <Text style={styles.label}>Due Date (Optional)</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <FontAwesome name="calendar" size={16} color="#7B61FF" style={{ marginRight: 8 }} />
              <Text style={[styles.dateButtonText, !dueDate && styles.dateButtonPlaceholder]}>
                {dueDate ? formatDateDisplay(dueDate) : 'Select date'}
              </Text>
              {dueDate && (
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    setDueDate('');
                  }}
                  style={styles.clearButton}
                >
                  <FontAwesome name="times" size={14} color="#888" />
                </TouchableOpacity>
              )}
            </TouchableOpacity>

            {/* Due Time */}
            {dueDate && (
              <>
                <Text style={styles.label}>Time (Optional)</Text>
                <TouchableOpacity
                  style={styles.timeButton}
                  onPress={() => setShowTimePicker(true)}
                >
                  <FontAwesome name="clock-o" size={16} color="#7B61FF" style={{ marginRight: 8 }} />
                  <Text style={[styles.timeButtonText, !dueTime && styles.timeButtonPlaceholder]}>
                    {dueTime ? formatTimeDisplay(dueTime) : 'Select time'}
                  </Text>
                  {dueTime && (
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        setDueTime('');
                      }}
                      style={styles.clearTimeButton}
                    >
                      <FontAwesome name="times" size={14} color="#888" />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              </>
            )}
            <Text style={styles.hint}>
              If the due date is not today, the task will be added to the calendar
            </Text>

            {/* Completed Checkbox */}
            <View style={styles.checkboxContainer}>
              <TouchableOpacity
                style={styles.checkbox}
                onPress={() => setCompleted(!completed)}
              >
                {completed && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
              <Text style={styles.checkboxLabel}>Mark as completed</Text>
            </View>
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            {initialTask && onDelete && (
              <TouchableOpacity 
                style={styles.deleteButton} 
                onPress={() => {
                  onDelete(initialTask.id);
                  onClose();
                }}
              >
                <Text style={styles.deleteText}>Delete</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

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

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: '90%',
    maxHeight: '85%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 5,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
    marginTop: 12,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    backgroundColor: '#FAFAFA',
    color: '#222',
    minHeight: 52,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
    marginBottom: 8,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 14,
    backgroundColor: '#FAFAFA',
    minHeight: 52,
  },
  dateButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#222',
  },
  dateButtonPlaceholder: {
    color: '#BDBDBD',
  },
  clearButton: {
    padding: 4,
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 14,
    backgroundColor: '#FAFAFA',
    minHeight: 52,
  },
  timeButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#222',
  },
  timeButtonPlaceholder: {
    color: '#BDBDBD',
  },
  clearTimeButton: {
    padding: 4,
    marginLeft: 8,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  optionButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    backgroundColor: '#FAFAFA',
  },
  optionButtonActive: {
    backgroundColor: '#7B61FF',
    borderColor: '#7B61FF',
  },
  priorityHigh: {
    backgroundColor: '#FF6B6B',
    borderColor: '#FF6B6B',
  },
  priorityMedium: {
    backgroundColor: '#FFE66D',
    borderColor: '#FFE66D',
  },
  priorityLow: {
    backgroundColor: '#6BCB77',
    borderColor: '#6BCB77',
  },
  optionText: {
    fontSize: 14,
    color: '#222',
    fontWeight: '500',
  },
  optionTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
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
  checkmark: {
    color: '#7B61FF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#222',
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
    gap: 12,
  },
  deleteButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    backgroundColor: '#FF7B7B',
    marginRight: 'auto',
  },
  deleteText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  cancelText: {
    color: '#888',
    fontSize: 16,
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#7B61FF',
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 10,
    minWidth: 80,
    alignItems: 'center',
    shadowColor: '#7B61FF',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  saveText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

