import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type EventType = 'Class Session' | 'School Event' | 'Assignment' | 'Other';

export type RepeatOption = 'None' | 'Daily' | 'Weekly' | 'Monthly' | 'Yearly';

export type CalendarEvent = {
  id: string;
  title: string;
  date: string; // ISO date string (YYYY-MM-DD) - original event date
  time: string; // Time string (HH:MM)
  repeat: RepeatOption;
  color: string; // Hex color code
  eventType: EventType;
  createdAt: number;
  userId?: string; // For future multi-user support
};

// Event occurrence for display purposes (represents one instance of a recurring event)
export type EventOccurrence = {
  event: CalendarEvent; // The original event
  occurrenceDate: string; // The date this occurrence falls on (YYYY-MM-DD)
  occurrenceKey: string; // Unique key for React (event.id + occurrenceDate)
};

interface CalendarContextType {
  events: CalendarEvent[];
  loading: boolean;
  createEvent: (event: Omit<CalendarEvent, 'id' | 'createdAt'>) => Promise<string>; // Returns event ID
  updateEvent: (id: string, updates: Partial<CalendarEvent>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  getEventsForMonth: (year: number, month: number) => EventOccurrence[];
  refreshEvents: () => Promise<void>;
}

const CalendarContext = createContext<CalendarContextType | undefined>(undefined);

export function useCalendar() {
  const ctx = useContext(CalendarContext);
  if (!ctx) throw new Error('useCalendar must be used within CalendarProvider');
  return ctx;
}

const EVENTS_KEY = 'scribit_calendar_events';

function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substr(2, 9) + Date.now();
}

export const CalendarProvider = ({ children }: { children: ReactNode }) => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Load events from AsyncStorage
  useEffect(() => {
    const loadEvents = async () => {
      setLoading(true);
      
      try {
        const localEvents = await AsyncStorage.getItem(EVENTS_KEY);
        const parsedLocalEvents = localEvents ? JSON.parse(localEvents) : [];

        // Validate and clean events
        const cleanedEvents = parsedLocalEvents.filter((event: any) => {
          return event && 
                typeof event.id === 'string' && 
                typeof event.title === 'string' &&
                typeof event.date === 'string' &&
                typeof event.color === 'string' &&
                typeof event.eventType === 'string';
        });

        setEvents(cleanedEvents);
        console.log('CalendarProvider: Loaded', cleanedEvents.length, 'valid events');
      } catch (error) {
        console.error('Error loading events:', error);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };
    
    loadEvents();
  }, []);

  // CRUD for events
  const createEvent = async (eventData: Omit<CalendarEvent, 'id' | 'createdAt'>): Promise<string> => {
    const id = generateId();
    const newEvent: CalendarEvent = {
      id,
      ...eventData,
      createdAt: Date.now(),
    };
    
    // Update local state and storage
    const updatedEvents = [...events, newEvent];
    setEvents(updatedEvents);
    await AsyncStorage.setItem(EVENTS_KEY, JSON.stringify(updatedEvents));
    console.log('CalendarProvider: Event created');
    return id;
  };

  const updateEvent = async (id: string, updates: Partial<CalendarEvent>) => {
    // Update local state and storage
    const updatedEvents = events.map(event => 
      event.id === id ? { ...event, ...updates } : event
    );
    setEvents(updatedEvents);
    await AsyncStorage.setItem(EVENTS_KEY, JSON.stringify(updatedEvents));
    console.log('CalendarProvider: Event updated');
  };

  const deleteEvent = async (id: string) => {
    // Update local state and storage
    const updatedEvents = events.filter(event => event.id !== id);
    setEvents(updatedEvents);
    await AsyncStorage.setItem(EVENTS_KEY, JSON.stringify(updatedEvents));
    console.log('CalendarProvider: Event deleted');
  };

  const parseDateString = (dateStr: string): Date => {
    if (!dateStr || typeof dateStr !== 'string') {
      return new Date(); // Return current date as fallback
    }
    const parts = dateStr.split('-');
    if (parts.length !== 3) {
      return new Date(); // Return current date as fallback
    }
    const [year, month, day] = parts.map(Number);
    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      return new Date(); // Return current date as fallback
    }
    return new Date(year, month - 1, day);
  };

  // Generate all occurrences of a recurring event for a given month (for display only)
  const generateRecurringOccurrences = (
    event: CalendarEvent,
    year: number,
    month: number
  ): EventOccurrence[] => {
    if (event.repeat === 'None') {
      // Non-recurring event - only return if it's in this month
      const eventDate = parseDateString(event.date);
      if (eventDate.getFullYear() === year && eventDate.getMonth() === month) {
        return [{
          event,
          occurrenceDate: event.date,
          occurrenceKey: `${event.id}-${event.date}`,
        }];
      }
      return [];
    }

    const occurrences: EventOccurrence[] = [];
    const startDate = parseDateString(event.date);
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);

    // For recurring events, we need to find all occurrences within the month
    let currentDate = new Date(startDate);

    // Handle different repeat types
    if (event.repeat === 'Daily') {
      // For daily events, show every day in the month (starting from event start date)
      // Start from the first day of the month or the event start date, whichever is later
      currentDate = new Date(Math.max(monthStart.getTime(), startDate.getTime()));
      
      // If event started before this month, start from the first day of this month
      if (startDate < monthStart) {
        currentDate = new Date(monthStart);
      }
      
      // Generate daily occurrences within the month
      while (currentDate <= monthEnd && currentDate >= monthStart) {
        const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
        occurrences.push({
          event,
          occurrenceDate: dateStr,
          occurrenceKey: `${event.id}-${dateStr}`,
        });
        currentDate.setDate(currentDate.getDate() + 1);
      }
    } else if (event.repeat === 'Weekly') {
      // Find the day of week (0 = Sunday, 6 = Saturday) that the event occurs on
      const dayOfWeek = startDate.getDay();
      
      // If event starts after this month, no occurrences
      if (startDate > monthEnd) {
        return [];
      }
      
      // Start from the event's start date
      currentDate = new Date(startDate);
      
      // If the start date is before this month, find the first occurrence in this month
      if (startDate < monthStart) {
        // Find the first day of this month that matches the day of week
        currentDate = new Date(year, month, 1);
        const firstDayOfWeek = currentDate.getDay();
        let daysToAdd = (dayOfWeek - firstDayOfWeek + 7) % 7;
        currentDate.setDate(currentDate.getDate() + daysToAdd);
        
        // Now ensure this aligns with the weekly pattern from the start date
        // Calculate days from start date
        const daysFromStart = Math.floor((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        
        // If not a multiple of 7, move to the next week that is
        if (daysFromStart % 7 !== 0) {
          const weeksToAdd = Math.ceil(daysFromStart / 7);
          currentDate = new Date(startDate);
          currentDate.setDate(currentDate.getDate() + (weeksToAdd * 7));
        }
        
        // Make sure we're in the current month
        if (currentDate < monthStart) {
          currentDate.setDate(currentDate.getDate() + 7);
        }
      }
      
      // Generate weekly occurrences within the month
      while (currentDate <= monthEnd) {
        // Only include if it's within the month and on or after the start date
        if (currentDate >= monthStart && currentDate >= startDate) {
          const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
          occurrences.push({
            event,
            occurrenceDate: dateStr,
            occurrenceKey: `${event.id}-${dateStr}`,
          });
        }
        // Move to next week
        currentDate.setDate(currentDate.getDate() + 7);
      }
    } else if (event.repeat === 'Monthly') {
      // Show on the same day of month each month
      const dayOfMonth = startDate.getDate();
      
      // Check if this month has that day (e.g., Feb 30 doesn't exist)
      const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
      if (dayOfMonth <= lastDayOfMonth) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayOfMonth).padStart(2, '0')}`;
        const occurrenceDate = new Date(dateStr);
        
        // Only include if the occurrence date is on or after the original event date
        if (occurrenceDate >= startDate) {
          occurrences.push({
            event,
            occurrenceDate: dateStr,
            occurrenceKey: `${event.id}-${dateStr}`,
          });
        }
      }
    } else if (event.repeat === 'Yearly') {
      // Show on the same date each year
      const eventMonth = startDate.getMonth();
      const eventDay = startDate.getDate();
      
      // Check if this is the same month and the year is >= the event year
      if (month === eventMonth && year >= startDate.getFullYear()) {
        // Check if this month has that day
        const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
        if (eventDay <= lastDayOfMonth) {
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(eventDay).padStart(2, '0')}`;
          occurrences.push({
            event,
            occurrenceDate: dateStr,
            occurrenceKey: `${event.id}-${dateStr}`,
          });
        }
      }
    }

    return occurrences;
  };

  // Get events for a specific month (including recurring events) - returns occurrences for display
  const getEventsForMonth = (year: number, month: number): EventOccurrence[] => {
    const allOccurrences: EventOccurrence[] = [];
    
    events.forEach(event => {
      const occurrences = generateRecurringOccurrences(event, year, month);
      allOccurrences.push(...occurrences);
    });
    
    return allOccurrences;
  };

  // Refresh events from storage
  const refreshEvents = async () => {
    try {
      const localEvents = await AsyncStorage.getItem(EVENTS_KEY);
      const parsedLocalEvents = localEvents ? JSON.parse(localEvents) : [];
      setEvents(parsedLocalEvents);
      console.log('CalendarProvider: Events refreshed from storage');
    } catch (error) {
      console.error('Error refreshing events:', error);
    }
  };

  return (
    <CalendarContext.Provider
      value={{
        events,
        loading,
        createEvent,
        updateEvent,
        deleteEvent,
        getEventsForMonth,
        refreshEvents,
      }}
    >
      {children}
    </CalendarContext.Provider>
  );
};

