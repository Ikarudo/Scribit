import React, { useState, useMemo } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Pressable } from 'react-native';
import { useTheme } from 'react-native-paper';
import { Feather } from '@expo/vector-icons';
import type { AppTheme } from '@/theme';

type DatePickerModalProps = {
  visible: boolean;
  onClose: () => void;
  onSelectDate: (date: string) => void; // YYYY-MM-DD format
  initialDate?: string;
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function createStyles(theme: AppTheme) {
  const c = theme.colors;
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: c.scrim,
      justifyContent: 'center',
      alignItems: 'center',
    },
    modal: {
      width: '90%',
      maxWidth: 400,
      backgroundColor: c.surface,
      borderRadius: 24,
      padding: 24,
      borderWidth: 1,
      borderColor: c.outline,
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
      color: c.onSurface,
      letterSpacing: -0.3,
    },
    closeButton: { padding: 8 },
    navigation: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    navButton: { padding: 8 },
    todayButton: {
      paddingVertical: 10,
      paddingHorizontal: 18,
      backgroundColor: c.primaryContainer,
      borderRadius: 14,
    },
    todayText: {
      fontSize: 14,
      fontWeight: '700',
      color: c.primary,
    },
    monthYear: {
      fontSize: 18,
      fontWeight: '700',
      color: c.onSurface,
    },
    daysOfWeekRow: {
      flexDirection: 'row',
      marginBottom: 8,
    },
    dayOfWeekCell: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 8,
    },
    dayOfWeekText: {
      fontSize: 12,
      fontWeight: '600',
      color: c.onSurfaceVariant,
    },
    calendarGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    dayCell: {
      width: '14.28%',
      aspectRatio: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 12,
    },
    todayCell: {
      backgroundColor: c.primaryContainer,
      borderWidth: 2,
      borderColor: c.primary,
    },
    selectedCell: {
      backgroundColor: c.primary,
    },
    dayNumber: {
      fontSize: 14,
      color: c.onSurface,
      fontWeight: '600',
    },
    selectedText: {
      color: c.onPrimary,
      fontWeight: 'bold',
    },
  });
}

export default function DatePickerModal({
  visible,
  onClose,
  onSelectDate,
  initialDate,
}: DatePickerModalProps) {
  const theme = useTheme<AppTheme>();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const today = new Date();
  
  // Parse date string (YYYY-MM-DD) without timezone issues
  const parseDateString = (dateStr: string): { year: number; month: number; day: number } => {
    const parts = dateStr.split('-');
    return {
      year: parseInt(parts[0], 10),
      month: parseInt(parts[1], 10) - 1, // Month is 0-indexed
      day: parseInt(parts[2], 10),
    };
  };

  const [selectedYear, setSelectedYear] = useState(() => {
    if (initialDate) {
      const parsed = parseDateString(initialDate);
      return parsed.year;
    }
    return today.getFullYear();
  });
  const [selectedMonth, setSelectedMonth] = useState(() => {
    if (initialDate) {
      const parsed = parseDateString(initialDate);
      return parsed.month;
    }
    return today.getMonth();
  });

  const firstDay = new Date(selectedYear, selectedMonth, 1);
  const lastDay = new Date(selectedYear, selectedMonth + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  // Create array of days to display
  const days: (number | null)[] = [];
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(day);
  }

  const handleDateSelect = (day: number) => {
    const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onSelectDate(dateStr);
    onClose();
  };

  const goToPreviousMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const goToToday = () => {
    setSelectedYear(today.getFullYear());
    setSelectedMonth(today.getMonth());
  };

  const isToday = (day: number) => {
    return (
      today.getFullYear() === selectedYear &&
      today.getMonth() === selectedMonth &&
      today.getDate() === day
    );
  };

  const isSelected = (day: number) => {
    if (!initialDate) return false;
    const parsed = parseDateString(initialDate);
    return (
      parsed.year === selectedYear &&
      parsed.month === selectedMonth &&
      parsed.day === day
    );
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.modal} onStartShouldSetResponder={() => true}>
          <View style={styles.header}>
            <Text style={styles.title}>Select date</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Feather name="x" size={24} color={theme.colors.onSurface} />
            </TouchableOpacity>
          </View>

          {/* Month Navigation */}
          <View style={styles.navigation}>
            <TouchableOpacity onPress={goToPreviousMonth} style={styles.navButton}>
              <Feather name="chevron-left" size={24} color={theme.colors.onSurface} />
            </TouchableOpacity>
            <TouchableOpacity onPress={goToToday} style={styles.todayButton}>
              <Text style={styles.todayText}>Today</Text>
            </TouchableOpacity>
            <Text style={styles.monthYear}>
              {MONTHS[selectedMonth]} {selectedYear}
            </Text>
            <TouchableOpacity onPress={goToNextMonth} style={styles.navButton}>
              <Feather name="chevron-right" size={24} color={theme.colors.onSurface} />
            </TouchableOpacity>
          </View>

          {/* Days of week header */}
          <View style={styles.daysOfWeekRow}>
            {DAYS_OF_WEEK.map((day, index) => (
              <View key={index} style={styles.dayOfWeekCell}>
                <Text style={styles.dayOfWeekText}>{day}</Text>
              </View>
            ))}
          </View>

          {/* Calendar grid */}
          <View style={styles.calendarGrid}>
            {days.map((day, index) => {
              if (day === null) {
                return <View key={index} style={styles.dayCell} />;
              }

              const todayStyle = isToday(day) ? styles.todayCell : null;
              const selectedStyle = isSelected(day) ? styles.selectedCell : null;

              return (
                <TouchableOpacity
                  key={index}
                  style={[styles.dayCell, todayStyle, selectedStyle]}
                  onPress={() => handleDateSelect(day)}
                >
                  <Text
                    style={[
                      styles.dayNumber,
                      isToday(day) && styles.todayText,
                      isSelected(day) && styles.selectedText,
                    ]}
                  >
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}
