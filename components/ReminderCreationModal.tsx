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
import DatePickerModal from './DatePickerModal';
import TimePickerModal from './TimePickerModal';

type ReminderCreationModalProps = {
  visible: boolean;
  onClose: () => void;
  onSave: (data: { title: string; date: string; time: string }) => void;
};

export default function ReminderCreationModal({
  visible,
  onClose,
  onSave,
}: ReminderCreationModalProps) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
    if (visible) {
      setTitle('');
      setDate('');
      setTime('');
    }
  }, [visible]);

  const handleSave = () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a reminder title');
      return;
    }
    if (!date) {
      Alert.alert('Error', 'Please select a due date');
      return;
    }
    if (!time) {
      Alert.alert('Error', 'Please select a time');
      return;
    }
    onSave({ title: title.trim(), date, time });
    onClose();
  };

  // Format date for display
  const formatDateDisplay = (dateStr: string): string => {
    try {
      const parts = dateStr.split('-');
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const dateObj = new Date(year, month, day);

      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthName = months[dateObj.getMonth()];
      const today = new Date();
      const isToday = dateObj.toDateString() === today.toDateString();
      const isTomorrow = dateObj.toDateString() === new Date(today.getTime() + 86400000).toDateString();

      if (isToday) return 'Today';
      if (isTomorrow) return 'Tomorrow';
      if (year === today.getFullYear()) {
        return `${monthName} ${day}`;
      }
      return `${monthName} ${day}, ${year}`;
    } catch {
      return dateStr;
    }
  };

  // Format time for display
  const formatTimeDisplay = (time24: string): string => {
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

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>Create Reminder</Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.label}>Title *</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Reminder title"
              placeholderTextColor="#BDBDBD"
            />

            <Text style={styles.label}>Due Date *</Text>
            <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
              <FontAwesome name="calendar" size={16} color="#7B61FF" style={{ marginRight: 8 }} />
              <Text style={[styles.dateButtonText, !date && styles.dateButtonPlaceholder]}>
                {date ? formatDateDisplay(date) : 'Select date'}
              </Text>
              {date && (
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    setDate('');
                  }}
                  style={styles.clearButton}
                >
                  <FontAwesome name="times" size={14} color="#888" />
                </TouchableOpacity>
              )}
            </TouchableOpacity>

            <Text style={styles.label}>Time *</Text>
            <TouchableOpacity
              style={styles.timeButton}
              onPress={() => setShowTimePicker(true)}
            >
              <FontAwesome name="clock-o" size={16} color="#7B61FF" style={{ marginRight: 8 }} />
              <Text style={[styles.timeButtonText, !time && styles.timeButtonPlaceholder]}>
                {time ? formatTimeDisplay(time) : 'Select time'}
              </Text>
              {time && (
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    setTime('');
                  }}
                  style={styles.clearTimeButton}
                >
                  <FontAwesome name="times" size={14} color="#888" />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <DatePickerModal
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        onSelectDate={(selected) => {
          setDate(selected);
          setShowDatePicker(false);
        }}
        initialDate={date}
      />

      <TimePickerModal
        visible={showTimePicker}
        onClose={() => setShowTimePicker(false)}
        onSelectTime={(selected) => {
          setTime(selected);
          setShowTimePicker(false);
        }}
        initialTime={time}
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
    maxHeight: '80%',
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
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
    gap: 12,
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


