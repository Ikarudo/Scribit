import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome5, Feather } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';
import { Calendar, DateData } from 'react-native-calendars';
import { useCalendar, CalendarEvent, EventOccurrence } from '@/components/CalendarProvider';
import { parseLocalDate } from '@/constants/dateUtils';
import EventCreationModal from '@/components/EventCreationModal';
import { useReminders } from '@/components/RemindersProvider';
import { useAuth } from '@/components/useAuth';
import { useIsDark } from '@/components/ThemeContext';
import { cardTintsLight, cardTintsDark } from '@/theme';
import { PressableScale } from '@/components/ui/PressableScale';
import type { AppTheme } from '@/theme';

const LIST_PAD = 20;

export default function CalendarScreen() {
  const theme = useTheme<AppTheme>();
  const styles = useMemo(() => createCalendarStyles(theme), [theme]);
  const isDark = useIsDark();
  const cardTints = isDark ? cardTintsDark : cardTintsLight;
  const insets = useSafeAreaInsets();
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

  const calendarTheme = useMemo(
    () =>
      ({
        backgroundColor: isDark ? theme.colors.surface : '#FFFFFF',
        calendarBackground: isDark ? theme.colors.surface : '#FFFFFF',
        textSectionTitleColor: theme.colors.onSurfaceVariant,
        selectedDayBackgroundColor: theme.colors.primaryContainer,
        selectedDayTextColor: theme.colors.onPrimaryContainer,
        todayTextColor: theme.colors.primary,
        dayTextColor: theme.colors.onSurface,
        textDisabledColor: theme.colors.outlineVariant,
        dotColor: theme.colors.primary,
        selectedDotColor: theme.colors.primary,
        arrowColor: theme.colors.primary,
        monthTextColor: theme.colors.onSurface,
        textDayFontWeight: '400',
        textMonthFontWeight: '400',
        textDayHeaderFontWeight: '500',
        textDayFontSize: 14,
        textMonthFontSize: 22,
        textDayHeaderFontSize: 12,
      } as const),
    [theme, isDark]
  );

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
      marked[todayStr].selected = true;
      marked[todayStr].selectedColor = theme.colors.primaryContainer;
    } else {
      marked[todayStr] = {
        marked: true,
        dots: [],
        selected: true,
        selectedColor: theme.colors.primaryContainer,
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
      const date = parseLocalDate(dateStr);
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
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingRoot}>
          <Text style={[styles.loadingText, { color: theme.colors.onSurfaceVariant }]}>Loading calendar…</Text>
        </View>
      </View>
    );
  }

  const scrollBottom = Math.max(insets.bottom, 24) + 90;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingTop: 24 + insets.top, paddingBottom: scrollBottom }]}
      >
        <View style={styles.headerRow}>
          <Text style={styles.headline}>Calendar</Text>
          <PressableScale onPress={handleCreateEvent} style={styles.addWrap} contentStyle={styles.addBtn}>
            <Feather name="plus" size={22} color={theme.colors.onPrimary} />
            <Text style={styles.addText}>New event</Text>
          </PressableScale>
        </View>

        <View style={styles.navRow}>
          <TouchableOpacity onPress={goToPreviousMonth} style={styles.navBtn} hitSlop={12}>
            <Feather name="chevron-left" size={24} color={theme.colors.onSurface} />
          </TouchableOpacity>
          <PressableScale onPress={goToToday} style={styles.todayWrap} contentStyle={styles.todayBtn}>
            <Text style={styles.todayText}>Today</Text>
          </PressableScale>
          <TouchableOpacity onPress={goToNextMonth} style={styles.navBtn} hitSlop={12}>
            <Feather name="chevron-right" size={24} color={theme.colors.onSurface} />
          </TouchableOpacity>
        </View>

        <View style={styles.calendarContainer}>
          <Calendar
            key={isDark ? 'calendar-dark' : 'calendar-light'}
            current={currentDateString}
            onDayPress={handleDatePress}
            onMonthChange={handleMonthChange}
            markedDates={markedDates}
            markingType="multi-dot"
            theme={calendarTheme}
            style={styles.calendar}
            enableSwipeMonths={true}
            hideExtraDays={true}
            firstDay={0}
            hideArrows={true}
          />
        </View>

        <View style={styles.toggleContainer}>
          <PressableScale
            onPress={() => setViewMode('month')}
            style={styles.toggleWrap}
            contentStyle={[styles.toggleBtn, viewMode === 'month' && styles.toggleBtnActive]}
          >
            <Text style={[styles.toggleText, viewMode === 'month' && styles.toggleTextActive]}>This month</Text>
          </PressableScale>
          <PressableScale
            onPress={() => setViewMode('day')}
            style={styles.toggleWrap}
            contentStyle={[styles.toggleBtn, viewMode === 'day' && styles.toggleBtnActive]}
          >
            <Text style={[styles.toggleText, viewMode === 'day' && styles.toggleTextActive]}>Today</Text>
          </PressableScale>
        </View>

        {sortedEvents.length > 0 ? (
          <View style={styles.eventsSection}>
            {Object.entries(groupedEvents).map(([eventType, occurrences], idx) => {
              if (!Array.isArray(occurrences)) {
                console.error('occurrences is not an array:', occurrences);
                return null;
              }
              const isCollapsed = collapsedGroups.has(eventType);
              const eventTypeString = String(eventType);
              const tint = cardTints[idx % cardTints.length];
              return (
                <View key={eventTypeString} style={styles.eventGroup}>
                  <TouchableOpacity
                    style={[styles.groupHeader, { backgroundColor: tint }]}
                    onPress={() => toggleGroup(eventTypeString)}
                  >
                    <Text style={styles.groupTitle}>{String(eventTypeString)}</Text>
                    <View style={styles.groupHeaderRight}>
                      <Text style={styles.groupCount}>{String(occurrences?.length ?? 0)}</Text>
                      <Feather name={isCollapsed ? 'chevron-down' : 'chevron-up'} size={18} color={theme.colors.onSurfaceVariant} />
                    </View>
                  </TouchableOpacity>
                  {!isCollapsed ? (
                    <View style={styles.groupContent}>
                      {occurrences.map((occurrence) => {
                        if (!occurrence || !occurrence.event || !occurrence.occurrenceKey) return null;
                        const eventDate = parseLocalDate(occurrence.occurrenceDate);
                        const today = new Date();
                        eventDate.setHours(0, 0, 0, 0);
                        today.setHours(0, 0, 0, 0);
                        const isPast = eventDate < today;
                        return (
                          <PressableScale
                            key={occurrence.occurrenceKey}
                            onPress={() => {}}
                            style={styles.eventWrap}
                            contentStyle={[styles.eventItem, isPast && styles.eventItemPast]}
                          >
                            <TouchableOpacity
                              style={styles.eventTouch}
                              onLongPress={() => handleDeleteEvent(occurrence.event.id)}
                              activeOpacity={1}
                            >
                              <View style={[styles.eventColorBar, { backgroundColor: occurrence.event.color || theme.colors.primary }]} />
                              <View style={styles.eventContent}>
                                <Text style={[styles.eventTitle, isPast && styles.eventTitlePast]} numberOfLines={1}>
                                  {String(occurrence.event.title || 'Untitled Event')}
                                </Text>
                                <View style={styles.eventDetails}>
                                  {viewMode === 'month' ? (
                                    <View style={styles.eventDetailRow}>
                                      <Feather name="calendar" size={12} color={theme.colors.onSurfaceVariant} />
                                      <Text style={[styles.eventDetailText, isPast && styles.eventDetailTextPast]}>
                                        {formatDate(occurrence.occurrenceDate)}
                                      </Text>
                                    </View>
                                  ) : null}
                                  <View style={styles.eventDetailRow}>
                                    <Feather name="clock" size={12} color={theme.colors.onSurfaceVariant} />
                                    <Text style={[styles.eventDetailText, isPast && styles.eventDetailTextPast]}>
                                      {formatTime(occurrence.event.time)}
                                    </Text>
                                  </View>
                                  {occurrence.event.repeat && occurrence.event.repeat !== 'None' ? (
                                    <View style={styles.eventDetailRow}>
                                      <Feather name="repeat" size={12} color={theme.colors.onSurfaceVariant} />
                                      <Text style={[styles.eventDetailText, isPast && styles.eventDetailTextPast]}>
                                        {String(occurrence.event.repeat)}
                                      </Text>
                                    </View>
                                  ) : null}
                                </View>
                              </View>
                            </TouchableOpacity>
                          </PressableScale>
                        );
                      })}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyRoot}>
            <View style={styles.emptyIconWrap}>
              <Feather name="calendar" size={44} color={theme.colors.outline} />
            </View>
            <Text style={styles.emptyTitle}>
              {viewMode === 'day' ? 'No events today' : 'No events this month'}
            </Text>
            <Text style={styles.emptySub}>Tap a date or "New event" to create one</Text>
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
    </View>
  );
}

function createCalendarStyles(theme: AppTheme) {
  const c = theme.colors;
  return StyleSheet.create({
  container: { flex: 1 },
  loadingRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: { 
    fontSize: 16, 
    fontWeight: '500',
    letterSpacing: 0.15,
  },
  scrollContent: { paddingHorizontal: LIST_PAD },
  headline: {
    fontSize: 32,
    fontWeight: '400',
    color: c.onSurface,
    letterSpacing: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  addWrap: { alignSelf: 'flex-start' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.primary,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 6,
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  addText: { 
    fontSize: 14, 
    fontWeight: '500', 
    color: c.onPrimary,
    letterSpacing: 0.1,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  navBtn: { 
    padding: 8,
    borderRadius: 20,
  },
  todayWrap: { flex: 1, marginHorizontal: 12 },
  todayBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: c.secondaryContainer,
    alignItems: 'center',
  },
  todayText: { 
    fontSize: 14, 
    fontWeight: '500', 
    color: c.onSecondaryContainer,
    letterSpacing: 0.1,
  },
  calendarContainer: { marginBottom: 20 },
  calendar: {
    borderRadius: 16,
    padding: 8,
    backgroundColor: c.surfaceVariant,
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  toggleContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  toggleWrap: { flex: 1 },
  toggleBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: c.surfaceVariant,
    alignItems: 'center',
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  toggleBtnActive: {
    backgroundColor: c.secondaryContainer,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '500',
    color: c.onSurfaceVariant,
    letterSpacing: 0.1,
  },
  toggleTextActive: { 
    color: c.onSecondaryContainer,
  },
  eventsSection: { marginBottom: 24 },
  eventGroup: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  groupTitle: { 
    fontSize: 16, 
    fontWeight: '500', 
    color: c.onSurface,
    letterSpacing: 0.15,
  },
  groupHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  groupCount: { 
    fontSize: 14, 
    fontWeight: '500', 
    color: c.onSurfaceVariant,
    letterSpacing: 0.1,
  },
  groupContent: { 
    padding: 12,
    backgroundColor: c.surfaceVariant,
  },
  eventWrap: { marginBottom: 10 },
  eventItem: {
    flexDirection: 'row',
    backgroundColor: c.surface,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  eventItemPast: {
    opacity: 0.55,
  },
  eventTouch: { flex: 1, flexDirection: 'row' },
  eventColorBar: { width: 4 },
  eventContent: { flex: 1, padding: 14 },
  eventTitle: { 
    fontSize: 15, 
    fontWeight: '500', 
    color: c.onSurface, 
    marginBottom: 6,
    letterSpacing: 0.1,
  },
  eventTitlePast: {
    textDecorationLine: 'line-through',
  },
  eventDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  eventDetailRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  eventDetailText: { 
    fontSize: 12, 
    color: c.onSurfaceVariant, 
    fontWeight: '400',
    letterSpacing: 0.4,
  },
  eventDetailTextPast: {
    textDecorationLine: 'line-through',
  },
  emptyRoot: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: c.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { 
    fontSize: 18, 
    fontWeight: '500', 
    color: c.onSurface, 
    marginBottom: 6,
    letterSpacing: 0,
  },
  emptySub: { 
    fontSize: 14, 
    color: c.onSurfaceVariant, 
    fontWeight: '400',
    letterSpacing: 0.25,
  },
  });
}
