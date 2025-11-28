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
import { CalendarEvent, EventType, RepeatOption } from './CalendarProvider';

const EVENT_TYPES: EventType[] = ['Class Session', 'School Event', 'Assignment', 'Other'];
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

  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('09:00');
  const [ampm, setAmpm] = useState<'AM' | 'PM'>('AM');
  const [repeat, setRepeat] = useState<RepeatOption>('None');
  const [color, setColor] = useState(COLOR_OPTIONS[0]);
  const [eventType, setEventType] = useState<EventType>('Other');

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
          setDate(new Date().toISOString().split('T')[0]);
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

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleCancel}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>{initialEvent ? 'Edit Event' : 'Create New Event'}</Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Title */}
            <Text style={styles.label}>Event Title</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Enter event title"
              placeholderTextColor="#BDBDBD"
            />

            {/* Date */}
            <Text style={styles.label}>Date</Text>
            <TextInput
              style={styles.input}
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#BDBDBD"
            />

            {/* Time */}
            <Text style={styles.label}>Time</Text>
            <View style={styles.timeContainer}>
              <TextInput
                style={[styles.input, styles.timeInput]}
                value={time}
                onChangeText={(text) => {
                  // Allow only numbers and colon
                  const cleaned = text.replace(/[^0-9:]/g, '');
                  // Format as HH:MM
                  if (cleaned.length <= 5) {
                    setTime(cleaned);
                  }
                }}
                placeholder="09:00"
                placeholderTextColor="#BDBDBD"
                keyboardType="numeric"
              />
              <View style={styles.ampmContainer}>
                <TouchableOpacity
                  style={[styles.ampmButton, ampm === 'AM' && styles.ampmButtonActive]}
                  onPress={() => setAmpm('AM')}
                >
                  <Text style={[styles.ampmText, ampm === 'AM' && styles.ampmTextActive]}>
                    AM
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.ampmButton, ampm === 'PM' && styles.ampmButtonActive]}
                  onPress={() => setAmpm('PM')}
                >
                  <Text style={[styles.ampmText, ampm === 'PM' && styles.ampmTextActive]}>
                    PM
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Event Type */}
            <Text style={styles.label}>Event Type</Text>
            <View style={styles.optionsRow}>
              {EVENT_TYPES.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.optionButton,
                    eventType === type && styles.optionButtonActive,
                  ]}
                  onPress={() => setEventType(type)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      eventType === type && styles.optionTextActive,
                    ]}
                  >
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Repeat */}
            <Text style={styles.label}>Repeat</Text>
            <View style={styles.optionsRow}>
              {REPEAT_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.optionButton,
                    repeat === option && styles.optionButtonActive,
                  ]}
                  onPress={() => setRepeat(option)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      repeat === option && styles.optionTextActive,
                    ]}
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Color */}
            <Text style={styles.label}>Color</Text>
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
                  {color === colorOption && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
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
              <Text style={styles.saveText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
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
  timeContainer: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  timeInput: {
    flex: 1,
  },
  ampmContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  ampmButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    backgroundColor: '#FAFAFA',
    minWidth: 60,
    alignItems: 'center',
  },
  ampmButtonActive: {
    backgroundColor: '#7B61FF',
    borderColor: '#7B61FF',
  },
  ampmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
  },
  ampmTextActive: {
    color: '#fff',
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
  optionText: {
    fontSize: 14,
    color: '#222',
    fontWeight: '500',
  },
  optionTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  colorOption: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    borderColor: '#222',
    borderWidth: 3,
  },
  checkmark: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
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

