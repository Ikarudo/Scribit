import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';
import { Calendar, DateData } from 'react-native-calendars';
import { useCalendar, CalendarEvent, EventOccurrence } from '@/components/CalendarProvider';
import EventCreationModal from '@/components/EventCreationModal';
import { useReminders } from '@/components/RemindersProvider';
import { useAuth } from '@/components/useAuth';
export default function CalendarScreen() {
  const { loading: authLoading } = useAuth();
  const { events, loading, createEvent, deleteEvent, getEventsForMonth } = useCalendar();
  const { createReminderForCalendarEvent } = useReminders();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | undefined>(undefined);
  const [viewMode, setViewMode] = useState<'month' | 'day'>('month');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  // Get events for current month (returns occurrences)
  const monthEventOccurrences = getEventsForMonth(currentYear, currentMonth) || [];

  // Convert events to react-native-calendars format
  const markedDates = useMemo(() => {
  const marked: { [key: string]: { marked?: boolean; dots: Array<{ color: string }>; selected?: boolean; selectedColor?: string } } = {};
    
    // Group events by date
    monthEventOccurrences.forEach((occurrence) => {
      if (!occurrence || !occurrence.event) return;
      const dateStr = occurrence.occurrenceDate;
      if (!dateStr || typeof dateStr !== 'string') return;
      if (!marked[dateStr]) {
        marked[dateStr] = {
          marked: true,
          dots: [],
        };
      }
      // Add dot for this event (limit to 3 dots per day)
      const color = occurrence.event.color;
      if (marked[dateStr].dots && marked[dateStr].dots.length < 3 && color && typeof color === 'string') {
        marked[dateStr].dots!.push({ color: color });
      }
    });

    // Mark today with special styling
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    if (marked[todayStr]) {
      // Today has events - keep dots but add selection
      marked[todayStr].selected = true;
      marked[todayStr].selectedColor = '#F0EDFF';
    } else {
      // Today has no events - just mark as selected
      marked[todayStr] = {
        marked: true,
        dots: [],
        selected: true,
        selectedColor: '#F0EDFF',
      };
    }

    return marked;
  }, [monthEventOccurrences]);

  // Format current date for calendar
  const currentDateString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;

  // Get events for today
  const getEventsForToday = (): EventOccurrence[] => {
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return (monthEventOccurrences || []).filter(occurrence => occurrence && occurrence.occurrenceDate === dateStr);
  };

  // Get events based on view mode
  const getDisplayEvents = (): EventOccurrence[] => {
    if (viewMode === 'day') {
      return getEventsForToday();
    }
    return monthEventOccurrences || [];
  };

  // Sort occurrences by date and time
  const sortedEvents = [...(getDisplayEvents() || [])].filter(occurrence => occurrence && occurrence.event).sort((a, b) => {
    const dateCompare = (a.occurrenceDate || '').localeCompare(b.occurrenceDate || '');
    if (dateCompare !== 0) return dateCompare;
    return (a.event.time || '').localeCompare(b.event.time || '');
  });
// Group events by event type
const groupedEvents: Record<string, EventOccurrence[]> = sortedEvents.reduce(
  (groups, occurrence) => {
  try {
    if (!occurrence || !occurrence.event) return groups;
    const type = occurrence.event.eventType;
    const eventType = (type && typeof type === 'string' && type.trim()) ? type.trim() : 'Other';
    if (!groups[eventType]) {
      groups[eventType] = [];
    }
    groups[eventType].push(occurrence);
return groups as Record<string, EventOccurrence[]>;
  } catch (error) {
    console.error('Error in groupedEvents reduce:', error);
    return groups;
  }
}, {} as Record<string, EventOccurrence[]>);
  // Toggle group collapse
  const toggleGroup = (eventType: string) => {
    const newCollapsed = new Set(collapsedGroups);
    if (newCollapsed.has(eventType)) {
      newCollapsed.delete(eventType);
    } else {
      newCollapsed.add(eventType);
    }
    setCollapsedGroups(newCollapsed);
  };

  // Navigate to previous month
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  // Navigate to next month
  const goToNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  // Navigate to today
  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Handle date press from calendar - opens event creation modal
  const handleDatePress = (day: DateData) => {
    const date = new Date(day.year, day.month - 1, day.day);
    setSelectedDate(date);
    setShowEventModal(true);
  };

  // Handle month change in calendar
  const handleMonthChange = (month: DateData) => {
    setCurrentDate(new Date(month.year, month.month - 1, 1));
  };

  // Handle create new event
  const handleCreateEvent = () => {
    setSelectedDate(undefined);
    setSelectedEvent(undefined);
    setShowEventModal(true);
  };

  // Handle save event
  const handleSaveEvent = async (eventData: Omit<CalendarEvent, 'id' | 'createdAt'>) => {
    try {
      // For now, always create a new calendar event entry;
      // you could enhance this later to call updateEvent when editing.
      const id = await createEvent(eventData);
      const fullEvent: CalendarEvent = {
        ...eventData,
        id,
        createdAt: Date.now(),
      };

      // Automatically create a reminder for upcoming events
      await createReminderForCalendarEvent(fullEvent);
    } catch (error) {
      Alert.alert('Error', 'Failed to save event. Please try again.');
      console.error('Error saving event:', error);
    }
  };

  // Handle delete event
  const handleDeleteEvent = (eventId: string) => {
    Alert.alert(
      'Delete Event',
      'Are you sure you want to delete this event?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteEvent(eventId);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete event. Please try again.');
              console.error('Error deleting event:', error);
            }
          },
        },
      ]
    );
  };
const formatDate = (dateStr: string | undefined): string => {
  if (!dateStr || typeof dateStr !== 'string') return 'Invalid Date';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'Invalid Date';
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthIndex = date.getMonth();
    const month = months[monthIndex];
    const day = date.getDate();
    if (!month || !day || isNaN(day) || isNaN(monthIndex)) return 'Invalid Date';
    return `${month} ${day}`;
  } catch (error) {
    return 'Invalid Date';
  }
};
  const formatTime = (time24: string | undefined): string => {
    if (!time24 || typeof time24 !== 'string' || !time24.includes(':')) {
      return '12:00 AM';
    }
    try {
      const [hoursStr, minutesStr] = time24.split(':');
      const hours = parseInt(hoursStr, 10);
      const minutes = parseInt(minutesStr, 10);
      if (isNaN(hours) || isNaN(minutes)) return '12:00 AM';
      const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
      const ampm = hours >= 12 ? 'PM' : 'AM';
      return `${hour12}:${String(minutes).padStart(2, '0')} ${ampm}`;
    } catch (error) {
      return '12:00 AM';
    }
  };
  if (authLoading || loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading calendar...</Text>
        </View>
      </SafeAreaView>
    );
  }
return (
  <SafeAreaView style={styles.container}>
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Calendar</Text>
      <TouchableOpacity style={styles.addButton} onPress={handleCreateEvent}>
        <FontAwesome5 name="plus" size={20} color="#fff" />
      </TouchableOpacity>
    </View>
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.navigation}>
        <TouchableOpacity onPress={goToPreviousMonth} style={styles.navButton}>
          <FontAwesome5 name="chevron-left" size={20} color="#222" />
        </TouchableOpacity>
        <TouchableOpacity onPress={goToToday} style={styles.todayButton}>
          <Text style={styles.todayText}>Today</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={goToNextMonth} style={styles.navButton}>
          <FontAwesome5 name="chevron-right" size={20} color="#222" />
        </TouchableOpacity>
      </View>
      <View style={styles.calendarContainer}>
        <Calendar
          current={currentDateString}
          onDayPress={handleDatePress}
          onMonthChange={handleMonthChange}
          markedDates={markedDates}
          markingType="multi-dot"
          theme={{
            backgroundColor: '#ffffff',
            calendarBackground: '#ffffff',
            textSectionTitleColor: '#888',
            selectedDayBackgroundColor: '#F0EDFF',
            selectedDayTextColor: '#7B61FF',
            todayTextColor: '#7B61FF',
            dayTextColor: '#222',
            textDisabledColor: '#E0E0E0',
            dotColor: '#7B61FF',
            selectedDotColor: '#7B61FF',
            arrowColor: '#7B61FF',
            monthTextColor: '#222',
            textDayFontWeight: '500',
            textMonthFontWeight: '700',
            textDayHeaderFontWeight: '600',
            textDayFontSize: 14,
            textMonthFontSize: 22,
            textDayHeaderFontSize: 12,
            todayBackgroundColor: '#F0EDFF',
          }}
          style={styles.calendar}
          enableSwipeMonths={true}
          hideExtraDays={true}
          firstDay={0}
          hideArrows={true}
        />
      </View>
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[styles.toggleButton, viewMode === 'month' ? styles.toggleButtonActive : null]}
          onPress={() => setViewMode('month')}
        >
          <Text style={[styles.toggleText, viewMode === 'month' ? styles.toggleTextActive : null]}>
            This Month
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, viewMode === 'day' ? styles.toggleButtonActive : null]}
          onPress={() => setViewMode('day')}
        >
          <Text style={[styles.toggleText, viewMode === 'day' ? styles.toggleTextActive : null]}>
            Today
          </Text>
        </TouchableOpacity>
      </View>
      {sortedEvents.length > 0 ? (
        <View style={styles.eventsSection}>
          {Object.entries(groupedEvents).map(([eventType, occurrences]) => {
            if (!Array.isArray(occurrences)) {
              console.error('occurrences is not an array:', occurrences);
              return null;
            }
            const isCollapsed = collapsedGroups.has(eventType);
            const eventTypeString = String(eventType);
            return (
              <View key={eventTypeString} style={styles.eventGroup}>
                <TouchableOpacity
                  style={styles.groupHeader}
                  onPress={() => toggleGroup(eventTypeString)}
                >
                  <Text style={styles.groupTitle}>{String(eventTypeString)}</Text>
                  <View style={styles.groupHeaderRight}>
                    <Text style={styles.groupCount}>{String(occurrences?.length ?? 0)}</Text>
                    <View style={styles.chevronContainer}>
                      <FontAwesome5
                        name={isCollapsed ? 'chevron-down' : 'chevron-up'}
                        size={16}
                        color="#888"
                      />
                    </View>
                  </View>
                </TouchableOpacity>
{!isCollapsed ? (
  <View style={styles.groupContent}>
    {occurrences.map((occurrence) => {
      if (!occurrence || !occurrence.event || !occurrence.occurrenceKey) {
        return null;
      }
      return (
        <TouchableOpacity
          key={occurrence.occurrenceKey}
          style={styles.eventItem}
          onLongPress={() => handleDeleteEvent(occurrence.event.id)}
        >
          <View style={[styles.eventColorBar, { backgroundColor: occurrence.event.color || '#7B61FF' }]} />
          <View style={styles.eventContent}>
            <View style={styles.eventHeader}>
              <Text style={styles.eventTitle}>{String(occurrence.event.title || 'Untitled Event')}</Text>
            </View>
            <View style={styles.eventDetails}>
              {viewMode === 'month' ? (
                <View style={styles.eventDetailRow}>
                  <FontAwesome5 name="calendar" size={12} color="#888" />
                  <Text style={styles.eventDetailText}>{formatDate(occurrence.occurrenceDate)}</Text>
                </View>
              ) : null}
              <View style={styles.eventDetailRow}>
                <FontAwesome5 name="clock" size={12} color="#888" />
                <Text style={styles.eventDetailText}>{formatTime(occurrence.event.time)}</Text>
              </View>
              {occurrence.event.repeat && occurrence.event.repeat !== 'None' ? (
                <View style={styles.eventDetailRowWithMargin}>
                  <FontAwesome5 name="redo-alt" size={12} color="#888" />
                  <Text style={styles.eventDetailText}>{String(occurrence.event.repeat)}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </TouchableOpacity>
      );
    })}
  </View>
) : null}
              </View>
            );
          })}
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <FontAwesome5 name="calendar-alt" size={48} color="#E0E0E0" />
          <Text style={styles.emptyText}>
            {viewMode === 'day' ? 'No events today' : 'No events this month'}
          </Text>
          <Text style={styles.emptySubtext}>Tap a date on the calendar or the + button to create an event</Text>
        </View>
      )}
    </ScrollView>
     <EventCreationModal
      visible={showEventModal}
      onClose={() => {
        setShowEventModal(false);
        setSelectedDate(undefined);
        setSelectedEvent(undefined);
      }}
      onSave={handleSaveEvent}
      initialDate={selectedDate}
      initialEvent={selectedEvent}
    />
  </SafeAreaView>
);
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#888',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#222',
  },
  addButton: {
    backgroundColor: '#7B61FF',
    borderRadius: 26,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7B61FF',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 } as any,
    shadowRadius: 4,
    elevation: 3,
  },
  navigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12, 
    marginBottom: 8,
  },
  navButton: {
    padding: 8,
  },
  todayButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#F7F8FA',
    borderRadius: 10,
  },
  todayText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7B61FF',
  },
  calendarContainer: {
    marginHorizontal: 4, 
    marginBottom: 0,
  },
  calendar: {
    borderRadius: 12,
    padding: 8,
    backgroundColor: '#ffffff',
    borderWidth: 0,
  },
  toggleContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 0, 
    marginBottom: 10,
    backgroundColor: '#F7F8FA',
    borderRadius: 12,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#7B61FF',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
  },
  toggleTextActive: {
    color: '#fff',
  },
  eventsSection: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  eventGroup: {
    marginBottom: 12, 
    backgroundColor: '#F7F8FA',
    borderRadius: 12,
    overflow: 'hidden',
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    backgroundColor: '#EBEBEB', 
    borderBottomWidth: 1, 
    borderBottomColor: '#E0E0E0',
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222',
  },
  groupHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7B61FF',
  },
  groupContent: {
    padding: 8,
  },
  eventItem: {
    flexDirection: 'row',
    backgroundColor: '#fff', 
    borderRadius: 10,
    marginBottom: 8, 
    overflow: 'hidden',
    elevation: 1, 
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 } as any,
    shadowRadius: 2,
    borderWidth: 1, 
    borderColor: '#F0F0F0',
  },
  eventColorBar: {
    width: 5, 
  },
  eventContent: {
    flex: 1,
    padding: 12, 
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4, 
  },
  eventTitle: {
    fontSize: 15, 
    fontWeight: '700', 
    color: '#222',
    flex: 1,
  },
  eventTypeBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginLeft: 10,
  },
  eventTypeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  eventDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  eventDetailText: {
    fontSize: 12, 
    color: '#888',
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    marginHorizontal: 16,
  },
  emptyText: {
    fontSize: 18,
    color: '#888',
    marginTop: 16,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#BDBDBD',
    marginTop: 8,
  },
  eventDetailRow: {
  flexDirection: 'row',
  alignItems: 'center',
  },
  eventDetailRowWithMargin: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  chevronContainer: {
    marginLeft: 8,
  },
  eventDetailRowConditional: {
  flexDirection: 'row',
  alignItems: 'center',
},
});