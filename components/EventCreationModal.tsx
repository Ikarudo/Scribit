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
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { CalendarEvent, EventType, RepeatOption } from './CalendarProvider';
import DatePickerModal from './DatePickerModal';
import TimePickerModal from './TimePickerModal';

const M3 = {
  surface: '#FFFFFF',
  primary: '#7C5DE8',
  primaryContainer: '#E8E0FC',
  onPrimary: '#FFFFFF',
  onSurface: '#1C1B22',
  onSurfaceVariant: '#5C5868',
  outline: '#D4CFE0',
  outlineVariant: '#E6E1ED',
  surfaceContainerHigh: '#F0EBF8',
  scrim: 'rgba(28, 27, 34, 0.4)',
};

const EVENT_TYPES: EventType[] = ['Class Session', 'School Event', 'Assignment', 'Task', 'Other'];
const REPEAT_OPTIONS: RepeatOption[] = ['None', 'Daily', 'Weekly', 'Monthly', 'Yearly'];
const COLOR_OPTIONS = [
  '#7B61FF', '#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3',
  '#F38181', '#AA96DA', '#FCBAD3', '#FFD93D', '#6BCB77',
];

type EventCreationModalProps = {
  visible: boolean;
  onClose: () => void;
  onSave: (event: Omit<CalendarEvent, 'id' | 'createdAt'>) => void;
  initialDate?: Date;
  initialEvent?: CalendarEvent;
};

// Helper function to convert 24-hour time to 12-hour with AM/PM
const convertTo12Hour = (time24: string): { time: string; ampm: 'AM' | 'PM' } => {
  if (!time24 || !time24.includes(':')) {
    return { time: '09:00', ampm: 'AM' };
  }
  const [hours, minutes] = time24.split(':').map(Number);
  const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  return { time: `${String(hour12).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`, ampm };
};

// Helper function to convert 12-hour time to 24-hour
const convertTo24Hour = (time12: string, ampm: 'AM' | 'PM'): string => {
  if (!time12 || !time12.includes(':')) {
    return '09:00';
  }
  const [hours, minutes] = time12.split(':').map(Number);
  let hour24 = hours;
  if (ampm === 'PM' && hours !== 12) {
    hour24 = hours + 12;
  } else if (ampm === 'AM' && hours === 12) {
    hour24 = 0;
  }
  return `${String(hour24).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

export default function EventCreationModal({
  visible,
  onClose,
  onSave,
  initialDate,
  initialEvent,
}: EventCreationModalProps) {
  // Initialize time with AM/PM from stored time
  const getInitialTime = () => {
    if (initialEvent?.time) {
      // Check if time already has AM/PM
      if (initialEvent.time.includes('AM') || initialEvent.time.includes('PM')) {
        const parts = initialEvent.time.split(' ');
        return {
          time: parts[0],
          ampm: (parts[1] || 'AM') as 'AM' | 'PM',
        };
      }
      // Convert 24-hour to 12-hour
      return convertTo12Hour(initialEvent.time);
    }
    return { time: '09:00', ampm: 'AM' as 'AM' | 'PM' };
  };

  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('09:00');
  const [ampm, setAmpm] = useState<'AM' | 'PM'>('AM');
  const [repeat, setRepeat] = useState<RepeatOption>('None');
  const [color, setColor] = useState(COLOR_OPTIONS[0]);
  const [eventType, setEventType] = useState<EventType>('Other');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Update state when modal opens or initialDate/initialEvent changes
  useEffect(() => {
    if (visible) {
      if (initialEvent) {
        setTitle(initialEvent.title);
        setDate(initialEvent.date);
        const timeData = getInitialTime();
        setTime(timeData.time);
        setAmpm(timeData.ampm);
        setRepeat(initialEvent.repeat);
        setColor(initialEvent.color);
        setEventType(initialEvent.eventType);
      } else {
        setTitle('');
        // Use initialDate if provided, otherwise today's date
        if (initialDate) {
          setDate(
            `${initialDate.getFullYear()}-${String(initialDate.getMonth() + 1).padStart(2, '0')}-${String(initialDate.getDate()).padStart(2, '0')}`
          );
        } else {
          const now = new Date();
          setDate(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`);
        }
        setTime('09:00');
        setAmpm('AM');
        setRepeat('None');
        setColor(COLOR_OPTIONS[0]);
        setEventType('Other');
      }
    }
  }, [visible, initialDate, initialEvent]);

  const handleSave = () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter an event title');
      return;
    }

    if (!date) {
      Alert.alert('Error', 'Please select a date');
      return;
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      Alert.alert('Error', 'Please enter a valid date (YYYY-MM-DD)');
      return;
    }

    if (!time) {
      Alert.alert('Error', 'Please enter a time');
      return;
    }

    // Validate time format (HH:MM)
    const timeRegex = /^\d{1,2}:\d{2}$/;
    if (!timeRegex.test(time)) {
      Alert.alert('Error', 'Please enter a valid time (HH:MM)');
      return;
    }

    // Validate hours and minutes
    const [hours, minutes] = time.split(':').map(Number);
    if (hours < 1 || hours > 12) {
      Alert.alert('Error', 'Hours must be between 1 and 12');
      return;
    }
    if (minutes < 0 || minutes > 59) {
      Alert.alert('Error', 'Minutes must be between 0 and 59');
      return;
    }

    // Convert 12-hour time to 24-hour for storage
    const time24 = convertTo24Hour(time, ampm);
    
    onSave({
      title: title.trim(),
      date,
      time: time24, // Store in 24-hour format
      repeat,
      color,
      eventType,
    });

    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  // Format date for display (e.g. "Jan 15, 2025")
  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return 'Select date';
    const [y, m, d] = dateStr.split('-').map(Number);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[m - 1]} ${d}, ${y}`;
  };

  // Format time for display (e.g. "9:00 AM")
  const formatTimeDisplay = () => {
    const time24 = convertTo24Hour(time, ampm);
    const { time: t, ampm: a } = convertTo12Hour(time24);
    const [h, min] = t.split(':');
    const hour = parseInt(h, 10);
    return `${hour}:${min} ${a}`;
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleCancel}>
      <KeyboardAvoidingView
        style={StyleSheet.absoluteFill}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <Pressable style={styles.overlay} onPress={handleCancel} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 0) + 0 }]}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{initialEvent ? 'Edit event' : 'New event'}</Text>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
            {/* Title */}
            <Text style={styles.label}>EVENT TITLE</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Enter event title"
              placeholderTextColor={M3.onSurfaceVariant}
            />

            {/* Date – tappable, opens date picker */}
            <Text style={styles.label}>DATE</Text>
            <TouchableOpacity
              style={styles.pickerField}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.8}
            >
              <Feather name="calendar" size={20} color={M3.onSurfaceVariant} />
              <Text style={[styles.pickerFieldText, !date && styles.pickerFieldPlaceholder]}>
                {date ? formatDateDisplay(date) : 'Select date'}
              </Text>
              <Feather name="chevron-right" size={20} color={M3.onSurfaceVariant} />
            </TouchableOpacity>

            {/* Time – tappable, opens time picker */}
            <Text style={styles.label}>TIME</Text>
            <TouchableOpacity
              style={styles.pickerField}
              onPress={() => setShowTimePicker(true)}
              activeOpacity={0.8}
            >
              <Feather name="clock" size={20} color={M3.onSurfaceVariant} />
              <Text style={styles.pickerFieldText}>{formatTimeDisplay()}</Text>
              <Feather name="chevron-right" size={20} color={M3.onSurfaceVariant} />
            </TouchableOpacity>

            {/* Event Type */}
            <Text style={styles.label}>EVENT TYPE</Text>
            <View style={styles.optionsRow}>
              {EVENT_TYPES.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.optionButton, eventType === type && styles.optionButtonActive]}
                  onPress={() => setEventType(type)}
                >
                  <Text style={[styles.optionText, eventType === type && styles.optionTextActive]}>{type}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Repeat */}
            <Text style={styles.label}>REPEAT</Text>
            <View style={styles.optionsRow}>
              {REPEAT_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[styles.optionButton, repeat === option && styles.optionButtonActive]}
                  onPress={() => setRepeat(option)}
                >
                  <Text style={[styles.optionText, repeat === option && styles.optionTextActive]}>{option}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Color */}
            <Text style={styles.label}>COLOR</Text>
            <View style={styles.colorRow}>
              {COLOR_OPTIONS.map((colorOption) => (
                <TouchableOpacity
                  key={colorOption}
                  style={[
                    styles.colorOption,
                    { backgroundColor: colorOption },
                    color === colorOption && styles.colorOptionSelected,
                  ]}
                  onPress={() => setColor(colorOption)}
                >
                  {color === colorOption && <Feather name="check" size={18} color="#fff" />}
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveText}>{initialEvent ? 'Save' : 'Create'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      <DatePickerModal
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        onSelectDate={(d) => { setDate(d); setShowDatePicker(false); }}
        initialDate={date}
      />
      <TimePickerModal
        visible={showTimePicker}
        onClose={() => setShowTimePicker(false)}
        onSelectTime={(t) => {
          const { time: t12, ampm: a } = convertTo12Hour(t);
          setTime(t12);
          setAmpm(a);
          setShowTimePicker(false);
        }}
        initialTime={convertTo24Hour(time, ampm)}
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
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 12,
    maxHeight: '90%',
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: M3.outlineVariant,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: M3.onSurface,
    marginBottom: 20,
    letterSpacing: -0.3,
  },
  scroll: { maxHeight: 400 },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: M3.onSurfaceVariant,
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  input: {
    borderRadius: 14,
    backgroundColor: M3.surfaceContainerHigh,
    borderWidth: 1.5,
    borderColor: M3.outline,
    paddingHorizontal: 18,
    paddingVertical: 14,
    fontSize: 16,
    color: M3.onSurface,
    marginBottom: 20,
  },
  pickerField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    backgroundColor: M3.surfaceContainerHigh,
    borderWidth: 1.5,
    borderColor: M3.outline,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginBottom: 20,
  },
  pickerFieldText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: M3.onSurface,
  },
  pickerFieldPlaceholder: {
    color: M3.onSurfaceVariant,
    fontWeight: '500',
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
    borderWidth: 1.5,
    borderColor: M3.outline,
    backgroundColor: M3.surfaceContainerHigh,
  },
  optionButtonActive: {
    backgroundColor: M3.primary,
    borderColor: M3.primary,
  },
  optionText: {
    fontSize: 14,
    color: M3.onSurface,
    fontWeight: '600',
  },
  optionTextActive: {
    color: M3.onPrimary,
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  colorOption: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    borderColor: M3.onSurface,
    borderWidth: 3,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    gap: 12,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  cancelText: {
    color: M3.onSurfaceVariant,
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: M3.primary,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 16,
    minWidth: 100,
    alignItems: 'center',
    shadowColor: M3.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  saveText: {
    color: M3.onPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
});

