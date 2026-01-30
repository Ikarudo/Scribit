import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';

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

type TimePickerModalProps = {
  visible: boolean;
  onClose: () => void;
  onSelectTime: (time: string) => void; // HH:MM format in 24-hour
  initialTime?: string;
};

export default function TimePickerModal({
  visible,
  onClose,
  onSelectTime,
  initialTime,
}: TimePickerModalProps) {
  // Parse time string (HH:MM) to hours and minutes
  const parseTime = (timeStr: string): { hours: number; minutes: number } => {
    if (!timeStr || !timeStr.includes(':')) {
      return { hours: 9, minutes: 0 };
    }
    const parts = timeStr.split(':');
    return {
      hours: parseInt(parts[0], 10) || 9,
      minutes: parseInt(parts[1], 10) || 0,
    };
  };

  const initialParsed = parseTime(initialTime || '');
  const [hours, setHours] = useState(initialParsed.hours);
  const [minutes, setMinutes] = useState(initialParsed.minutes);

  // Update state when modal opens or initialTime changes
  useEffect(() => {
    if (visible) {
      const parsed = parseTime(initialTime || '');
      setHours(parsed.hours);
      setMinutes(parsed.minutes);
    }
  }, [visible, initialTime]);

  const handleSave = () => {
    const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    onSelectTime(timeStr);
    onClose();
  };

  // Convert to 12-hour format for display
  const getDisplayTime = () => {
    const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    return `${hour12}:${String(minutes).padStart(2, '0')} ${ampm}`;
  };

  const quickTimes = [
    { label: '9:00 AM', h: 9, m: 0 },
    { label: '12:00 PM', h: 12, m: 0 },
    { label: '3:00 PM', h: 15, m: 0 },
    { label: '6:00 PM', h: 18, m: 0 },
  ];

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.modal} onStartShouldSetResponder={() => true}>
          <View style={styles.header}>
            <Text style={styles.title}>Select time</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Feather name="x" size={24} color={M3.onSurface} />
            </TouchableOpacity>
          </View>

          {/* Time Display */}
          <View style={styles.timeDisplay}>
            <Text style={styles.timeText}>{getDisplayTime()}</Text>
          </View>

          {/* Hour & Minute Pickers side by side */}
          <View style={styles.pickersRow}>
            <View style={styles.pickerBlock}>
              <Text style={styles.pickerLabel}>Hour</Text>
              <View style={styles.pickerControls}>
                <TouchableOpacity
                  style={styles.pickerBtn}
                  onPress={() => setHours((prev) => (prev === 0 ? 23 : prev - 1))}
                >
                  <Feather name="chevron-up" size={24} color={M3.primary} />
                </TouchableOpacity>
                <Text style={styles.pickerValue}>{String(hours).padStart(2, '0')}</Text>
                <TouchableOpacity
                  style={styles.pickerBtn}
                  onPress={() => setHours((prev) => (prev === 23 ? 0 : prev + 1))}
                >
                  <Feather name="chevron-down" size={24} color={M3.primary} />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.pickerBlock}>
              <Text style={styles.pickerLabel}>Minute</Text>
              <View style={styles.pickerControls}>
                <TouchableOpacity
                  style={styles.pickerBtn}
                  onPress={() => setMinutes((prev) => (prev === 59 ? 0 : prev + 1))}
                >
                  <Feather name="chevron-up" size={24} color={M3.primary} />
                </TouchableOpacity>
                <Text style={styles.pickerValue}>{String(minutes).padStart(2, '0')}</Text>
                <TouchableOpacity
                  style={styles.pickerBtn}
                  onPress={() => setMinutes((prev) => (prev === 0 ? 59 : prev - 1))}
                >
                  <Feather name="chevron-down" size={24} color={M3.primary} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Quick Time Buttons */}
          <View style={styles.quickTimeContainer}>
            <Text style={styles.quickTimeLabel}>Quick select</Text>
            <View style={styles.quickTimeRow}>
              {quickTimes.map(({ label, h, m }) => (
                <TouchableOpacity
                  key={label}
                  style={styles.quickTimeButton}
                  onPress={() => { setHours(h); setMinutes(m); }}
                >
                  <Text style={styles.quickTimeText}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: M3.scrim,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: '90%',
    maxWidth: 380,
    backgroundColor: M3.surface,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: M3.outline,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: M3.onSurface,
    letterSpacing: -0.3,
  },
  closeButton: { padding: 8 },
  timeDisplay: {
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 20,
    backgroundColor: M3.primaryContainer,
    borderRadius: 16,
  },
  timeText: {
    fontSize: 36,
    fontWeight: '800',
    color: M3.primary,
    letterSpacing: -0.5,
  },
  pickersRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
    gap: 24,
  },
  pickerBlock: {
    flex: 1,
    alignItems: 'center',
  },
  pickerLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: M3.onSurfaceVariant,
    letterSpacing: 1,
    marginBottom: 12,
  },
  pickerControls: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
  },
  pickerBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: M3.surfaceContainerHigh,
    borderWidth: 1.5,
    borderColor: M3.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerValue: {
    fontSize: 28,
    fontWeight: '800',
    color: M3.primary,
  },
  quickTimeContainer: {
    marginBottom: 24,
  },
  quickTimeLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: M3.onSurfaceVariant,
    letterSpacing: 1,
    marginBottom: 12,
  },
  quickTimeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickTimeButton: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: M3.surfaceContainerHigh,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: M3.outline,
    alignItems: 'center',
  },
  quickTimeText: {
    fontSize: 15,
    fontWeight: '600',
    color: M3.onSurface,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
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
    minWidth: 90,
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

