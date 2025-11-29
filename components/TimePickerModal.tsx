import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

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

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Select Time</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <FontAwesome name="times" size={20} color="#222" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Time Display */}
            <View style={styles.timeDisplay}>
              <Text style={styles.timeText}>{getDisplayTime()}</Text>
              <Text style={styles.time24Text}>
                {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}
              </Text>
            </View>

            {/* Hour Picker */}
            <View style={styles.pickerContainer}>
              <Text style={styles.pickerLabel}>Hour</Text>
              <View style={styles.pickerRow}>
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => setHours((prev) => (prev === 0 ? 23 : prev - 1))}
                >
                  <FontAwesome name="chevron-down" size={20} color="#7B61FF" />
                </TouchableOpacity>
                <View style={styles.pickerValueContainer}>
                  <Text style={styles.pickerValue}>{String(hours).padStart(2, '0')}</Text>
                </View>
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => setHours((prev) => (prev === 23 ? 0 : prev + 1))}
                >
                  <FontAwesome name="chevron-up" size={20} color="#7B61FF" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Minute Picker */}
            <View style={styles.pickerContainer}>
              <Text style={styles.pickerLabel}>Minute</Text>
              <View style={styles.pickerRow}>
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => setMinutes((prev) => (prev === 0 ? 59 : prev - 1))}
                >
                  <FontAwesome name="chevron-down" size={20} color="#7B61FF" />
                </TouchableOpacity>
                <View style={styles.pickerValueContainer}>
                  <Text style={styles.pickerValue}>{String(minutes).padStart(2, '0')}</Text>
                </View>
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => setMinutes((prev) => (prev === 59 ? 0 : prev + 1))}
                >
                  <FontAwesome name="chevron-up" size={20} color="#7B61FF" />
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          {/* Quick Time Buttons */}
          <View style={styles.quickTimeContainer}>
            <Text style={styles.quickTimeLabel}>Quick Select</Text>
            <View style={styles.quickTimeRow}>
              {['09:00', '12:00', '15:00', '18:00'].map((time) => {
                const [h, m] = time.split(':').map(Number);
                return (
                  <TouchableOpacity
                    key={time}
                    style={styles.quickTimeButton}
                    onPress={() => {
                      setHours(h);
                      setMinutes(m);
                    }}
                  >
                    <Text style={styles.quickTimeText}>{time}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Actions */}
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
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: '85%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#222',
  },
  closeButton: {
    padding: 4,
  },
  timeDisplay: {
    alignItems: 'center',
    marginBottom: 32,
    paddingVertical: 20,
    backgroundColor: '#F7F8FA',
    borderRadius: 12,
  },
  timeText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#7B61FF',
    marginBottom: 4,
  },
  time24Text: {
    fontSize: 16,
    color: '#888',
    fontWeight: '500',
  },
  pickerContainer: {
    marginBottom: 24,
  },
  pickerLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
    marginBottom: 12,
    textAlign: 'center',
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  pickerButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F7F8FA',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#7B61FF',
  },
  pickerValueContainer: {
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#F7F8FA',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#7B61FF',
  },
  pickerValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#7B61FF',
  },
  quickTimeContainer: {
    marginBottom: 24,
  },
  quickTimeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
    marginBottom: 12,
  },
  quickTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  quickTimeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#F7F8FA',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  quickTimeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#222',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
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

