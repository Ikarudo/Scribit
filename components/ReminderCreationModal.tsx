import React, { useState, useEffect } from 'react';
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
import DatePickerModal from './DatePickerModal';
import TimePickerModal from './TimePickerModal';

const M3 = {
  surface: '#FFFFFF',
  surfaceContainerHigh: '#F0EBF8',
  primary: '#7C5DE8',
  onPrimary: '#FFFFFF',
  onSurface: '#1C1B22',
  onSurfaceVariant: '#5C5868',
  outline: '#D4CFE0',
  scrim: 'rgba(28, 27, 34, 0.4)',
};

type ReminderCreationModalProps = {
  visible: boolean;
  onClose: () => void;
  onSave: (data: { title: string; date: string; time: string }) => void | Promise<void>;
};

export default function ReminderCreationModal({
  visible,
  onClose,
  onSave,
}: ReminderCreationModalProps) {
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setTitle('');
      setDate('');
      setTime('');
    }
  }, [visible]);

  const handleSave = async () => {
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
    setSaving(true);
    try {
      await Promise.resolve(
        onSave({ title: title.trim(), date, time })
      );
      onClose();
    } catch (e) {
      Alert.alert('Error', 'Failed to create reminder. Please try again.');
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

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
      if (year === today.getFullYear()) return `${monthName} ${day}`;
      return `${monthName} ${day}, ${year}`;
    } catch {
      return dateStr;
    }
  };

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
      <KeyboardAvoidingView
        style={StyleSheet.absoluteFill}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <Pressable style={styles.overlay} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, 20) + 16 },
          ]}
        >
          <View style={styles.handle} />
          <Text style={styles.title}>New reminder</Text>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
            <Text style={styles.label}>TITLE</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Reminder title"
              placeholderTextColor={M3.onSurfaceVariant}
            />

            <Text style={styles.label}>DATE</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.7}
            >
              <Feather name="calendar" size={18} color={M3.primary} style={{ marginRight: 10 }} />
              <Text style={[styles.dateButtonText, !date && styles.placeholder]}>
                {date ? formatDateDisplay(date) : 'Select date'}
              </Text>
              {date ? (
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    setDate('');
                  }}
                  style={styles.clearBtn}
                  hitSlop={8}
                >
                  <Feather name="x" size={18} color={M3.onSurfaceVariant} />
                </TouchableOpacity>
              ) : null}
            </TouchableOpacity>

            <Text style={styles.label}>TIME</Text>
            <TouchableOpacity
              style={styles.timeButton}
              onPress={() => setShowTimePicker(true)}
              activeOpacity={0.7}
            >
              <Feather name="clock" size={18} color={M3.primary} style={{ marginRight: 10 }} />
              <Text style={[styles.timeButtonText, !time && styles.placeholder]}>
                {time ? formatTimeDisplay(time) : 'Select time'}
              </Text>
              {time ? (
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    setTime('');
                  }}
                  style={styles.clearBtn}
                  hitSlop={8}
                >
                  <Feather name="x" size={18} color={M3.onSurfaceVariant} />
                </TouchableOpacity>
              ) : null}
            </TouchableOpacity>
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              disabled={saving}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.8}
            >
              <Text style={styles.saveText}>{saving ? 'Saving…' : 'Save'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

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
    ...StyleSheet.absoluteFillObject,
    backgroundColor: M3.scrim,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: M3.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 12,
    maxHeight: '88%',
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
    backgroundColor: M3.outline,
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: M3.onSurface,
    letterSpacing: -0.3,
    marginBottom: 20,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: M3.onSurfaceVariant,
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  scroll: {
    maxHeight: 280,
    marginBottom: 20,
  },
  input: {
    borderRadius: 16,
    backgroundColor: M3.surfaceContainerHigh,
    borderWidth: 1.5,
    borderColor: M3.outline,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 16,
    color: M3.onSurface,
    marginBottom: 20,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: M3.surfaceContainerHigh,
    borderWidth: 1.5,
    borderColor: M3.outline,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginBottom: 20,
  },
  dateButtonText: {
    flex: 1,
    fontSize: 16,
    color: M3.onSurface,
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: M3.surfaceContainerHigh,
    borderWidth: 1.5,
    borderColor: M3.outline,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginBottom: 8,
  },
  timeButtonText: {
    flex: 1,
    fontSize: 16,
    color: M3.onSurface,
  },
  placeholder: {
    color: M3.onSurfaceVariant,
  },
  clearBtn: {
    padding: 4,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
  },
  cancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: M3.onSurfaceVariant,
  },
  saveBtn: {
    backgroundColor: M3.primary,
    borderRadius: 16,
    paddingHorizontal: 28,
    paddingVertical: 14,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: M3.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveText: {
    fontSize: 16,
    fontWeight: '700',
    color: M3.onPrimary,
  },
});
