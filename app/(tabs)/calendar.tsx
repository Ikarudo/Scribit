import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList, Alert, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome } from '@expo/vector-icons';
import { useCalendar, CalendarEvent, EventOccurrence } from '@/components/CalendarProvider';
import CalendarMonthView from '@/components/CalendarMonthView'; 
import EventCreationModal from '@/components/EventCreationModal';
import { useReminders } from '@/components/RemindersProvider';
import { useAuth } from '@/components/useAuth';

const { width } = Dimensions.get('window');

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
  const monthEventOccurrences = getEventsForMonth(currentYear, currentMonth);

  // Get events for today
  const getEventsForToday = (): EventOccurrence[] => {
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return monthEventOccurrences.filter(occurrence => occurrence.occurrenceDate === dateStr);
  };

  // Get events based on view mode
  const getDisplayEvents = (): EventOccurrence[] => {
    if (viewMode === 'day') {
      return getEventsForToday();
    }
    return monthEventOccurrences;
  };

  // Sort occurrences by date and time
  const sortedEvents = [...getDisplayEvents()].sort((a, b) => {
    const dateCompare = a.occurrenceDate.localeCompare(b.occurrenceDate);
    if (dateCompare !== 0) return dateCompare;
    return a.event.time.localeCompare(b.event.time);
  });

  // Group events by event type
  const groupedEvents = sortedEvents.reduce((groups, occurrence) => {
    const type = occurrence.event.eventType;
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(occurrence);
    return groups;
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
  const handleDatePress = (date: Date) => {
    setSelectedDate(date);
    setShowEventModal(true);
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

  // Format date for display
  const formatDate = (dateStr: string): string => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '';
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[date.getMonth()];
      const day = date.getDate();
      if (!month || !day) return '';
      return `${month} ${day}`;
    } catch (error) {
      return '';
    }
  };

  // Format time for display (convert 24-hour to 12-hour with AM/PM)
  const formatTime = (time24: string): string => {
    if (!time24 || !time24.includes(':')) {
      return '12:00 AM';
    }
    try {
      const [hours, minutes] = time24.split(':').map(Number);
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
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Calendar</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleCreateEvent}>
          <FontAwesome name="plus" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Month Navigation - Streamlined Padding */}
        <View style={styles.navigation}>
          <TouchableOpacity onPress={goToPreviousMonth} style={styles.navButton}>
            <FontAwesome name="chevron-left" size={20} color="#222" />
          </TouchableOpacity>
          <TouchableOpacity onPress={goToToday} style={styles.todayButton}>
            <Text style={styles.todayText}>Today</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={goToNextMonth} style={styles.navButton}>
            <FontAwesome name="chevron-right" size={20} color="#222" />
          </TouchableOpacity>
        </View>
        
        {/* Calendar Month View - Enlarged by reducing horizontal margins */}
        <View style={styles.calendarContainer}>
          <CalendarMonthView
            year={currentYear}
            month={currentMonth}
            events={monthEventOccurrences}
            onDatePress={handleDatePress}
          />
        </View>

        {/* View Mode Toggle - Moved closer to calendar (marginTop: 0) */}
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

        {/* Events List - Moved closer to the toggle module */}
        {sortedEvents.length > 0 ? (
          <View style={styles.eventsSection}>
            {Object.entries(groupedEvents).map(([eventType, occurrences]) => {
              const isCollapsed = collapsedGroups.has(eventType);
              return (
                <View key={eventType} style={styles.eventGroup}>
                  <TouchableOpacity
                    style={styles.groupHeader}
                    onPress={() => toggleGroup(eventType)}
                  >
                    <Text style={styles.groupTitle}>{String(eventType || 'Other')}</Text>
                    <View style={styles.groupHeaderRight}>
                      <Text style={styles.groupCount}>{String(occurrences.length)}</Text>
                      <FontAwesome
                        name={isCollapsed ? 'chevron-down' : 'chevron-up'}
                        size={16}
                        color="#888"
                        style={{ marginLeft: 8 }}
                      />
                    </View>
                  </TouchableOpacity>
                  {!isCollapsed && (
                    <View style={styles.groupContent}>
                      {occurrences.map((occurrence) => (
                        <TouchableOpacity
                          key={occurrence.occurrenceKey}
                          style={styles.eventItem}
                          onLongPress={() => handleDeleteEvent(occurrence.event.id)}
                        >
                          <View style={[styles.eventColorBar, { backgroundColor: occurrence.event.color }]} />
                          <View style={styles.eventContent}>
                            <View style={styles.eventHeader}>
                              <Text style={styles.eventTitle}>{String(occurrence.event.title || 'Untitled Event')}</Text>
                            </View>
                            <View style={styles.eventDetails}>
                              {viewMode === 'month' && (
                                <>
                                  <FontAwesome name="calendar" size={12} color="#888" />
                                  <Text style={styles.eventDetailText}>{String(formatDate(occurrence.occurrenceDate) || 'Invalid Date')}</Text>
                                </>
                              )}
                              <FontAwesome name="clock-o" size={12} color="#888" style={{ marginLeft: viewMode === 'month' ? 12 : 0 }} />
                              <Text style={styles.eventDetailText}>{String(formatTime(occurrence.event.time) || '12:00 AM')}</Text>
                              {occurrence.event.repeat !== 'None' && occurrence.event.repeat && (
                                <>
                                  <FontAwesome name="repeat" size={12} color="#888" style={{ marginLeft: 12 }} />
                                  <Text style={styles.eventDetailText}>{String(occurrence.event.repeat)}</Text>
                                </>
                              )}
                            </View>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <FontAwesome name="calendar-o" size={48} color="#E0E0E0" />
            <Text style={styles.emptyText}>
              {viewMode === 'day' ? 'No events today' : 'No events this month'}
            </Text>
            <Text style={styles.emptySubtext}>Tap a date on the calendar or the + button to create an event</Text>
          </View>
        )}
      </ScrollView>

      {/* Event Creation Modal */}
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
    fontWeight: 'bold',
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
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  navigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    // Adjusted padding to use the same minimal value for wider calendar
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
    // Streamlined look by removing explicit button style changes
  },
  todayText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7B61FF',
  },
  // Container to maximize calendar width/size
  calendarContainer: {
    // Reduced margin significantly to make the calendar wider
    marginHorizontal: 4, 
    marginBottom: 0, // Slight space before the toggle
  },
  toggleContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 0, // Moved right up against the calendar container
    marginBottom: 10, // Moved closer to event list
    backgroundColor: '#F7F8FA',
    borderRadius: 12,
    padding: 4,
    // Streamlined UI: No shadow/border added here
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
    // Streamlined UI: Removed any unnecessary margin/padding
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: 'bold',
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
    // Streamlined UI: Padding fine-tuned
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
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    borderWidth: 1, 
    borderColor: '#F0F0F0',
    // Streamlined UI: Subtle border/shadow added for clear separation
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
    marginLeft: 8,
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
});