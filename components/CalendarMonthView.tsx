import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { EventOccurrence } from './CalendarProvider';

type CalendarMonthViewProps = {
  year: number;
  month: number;
  events: EventOccurrence[];
  onDatePress?: (date: Date) => void;
};

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function CalendarMonthView({ year, month, events, onDatePress }: CalendarMonthViewProps) {
  // Get first day of month and number of days
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  // Create array of days to display
  const days: (number | null)[] = [];
  
  // Add empty cells for days before the first day of the month
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(null);
  }
  
  // Add all days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(day);
  }

  // Get events for a specific date
  const getEventsForDate = (day: number): EventOccurrence[] => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(occurrence => occurrence.occurrenceDate === dateStr);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.monthYear}>{MONTHS[month] || 'Unknown'} {String(year)}</Text>
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

          const dateEvents = getEventsForDate(day);
          const isToday = (() => {
            const today = new Date();
            return today.getFullYear() === year &&
                   today.getMonth() === month &&
                   today.getDate() === day;
          })();

          return (
            <TouchableOpacity
              key={index}
              style={[styles.dayCell, isToday ? styles.todayCell : null]}
              onPress={() => onDatePress?.(new Date(year, month, day))}
            >
              <Text style={[styles.dayNumber, isToday ? styles.todayText : null]}>{String(day)}</Text>
              {dateEvents.length > 0 && (
                <View style={styles.eventsContainer}>
                  {dateEvents.slice(0, 3).map((occurrence) => (
                    <View
                      key={occurrence.occurrenceKey}
                      style={[styles.eventDot, { backgroundColor: occurrence.event.color }]}
                    />
                  ))}
                  {dateEvents.length > 3 && (
                    <Text style={styles.moreEventsText}>
                      +{dateEvents.length - 3}
                    </Text>
                  )}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    maxHeight: 300,
    backgroundColor: '#ffffffff',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  monthYear: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#222',
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
    color: '#888',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 4,
    paddingHorizontal: 2,
    borderWidth: 0.5,
    borderColor: '#F0F0F0',
  },
  todayCell: {
    backgroundColor: '#F0EDFF',
    borderColor: '#7B61FF',
    borderWidth: 2,
  },
  dayNumber: {
    fontSize: 14,
    color: '#222',
    fontWeight: '500',
  },
  todayText: {
    color: '#7B61FF',
    fontWeight: 'bold',
  },
  eventsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
    gap: 2,
  },
  eventDot: {
    width: 12,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 1,
  },
  moreEventsText: {
    fontSize: 8,
    color: '#888',
    fontWeight: '600',
  },
});

