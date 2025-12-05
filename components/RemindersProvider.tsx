import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { CalendarEvent } from './CalendarProvider';
import { Task } from './TasksProvider';

export type ReminderSource = 'calendar' | 'task' | 'manual';

export type Reminder = {
  id: string;
  title: string;
  date: string;   // YYYY-MM-DD
  time: string;   // HH:MM 24-hour
  source: ReminderSource;
  sourceId?: string;        // calendar event id or task id
  notificationId?: string;  // Expo notification id
  createdAt: number;
};

export type SourceMuteState = {
  calendar: boolean;
  task: boolean;
  manual: boolean;
};

interface RemindersContextType {
  reminders: Reminder[];
  loading: boolean;
  sourceMute: SourceMuteState;

  createReminder: (input: Omit<Reminder, 'id' | 'createdAt' | 'notificationId'>) => Promise<void>;
  updateReminder: (id: string, updates: Partial<Reminder>) => Promise<void>;
  deleteReminder: (id: string) => Promise<void>;

  setSourceMute: (source: ReminderSource, muted: boolean) => Promise<void>;

  createReminderForCalendarEvent: (event: CalendarEvent) => Promise<void>;
  createReminderForTask: (task: Task) => Promise<void>;
}

const RemindersContext = createContext<RemindersContextType | undefined>(undefined);

export function useReminders() {
  const ctx = useContext(RemindersContext);
  if (!ctx) throw new Error('useReminders must be used within RemindersProvider');
  return ctx;
}

const REMINDERS_KEY = 'scribit_reminders';
const REMINDERS_MUTE_KEY = 'scribit_reminders_mute';

function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substr(2, 9) + Date.now();
}

// Configure notifications handler once
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const RemindersProvider = ({ children }: { children: ReactNode }) => {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [sourceMute, setSourceMuteState] = useState<SourceMuteState>({
    calendar: false,
    task: false,
    manual: false,
  });
  const [loading, setLoading] = useState(true);

  // Load reminders and mute state from storage, request permissions
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const storedReminders = await AsyncStorage.getItem(REMINDERS_KEY);
        const storedMute = await AsyncStorage.getItem(REMINDERS_MUTE_KEY);

        setReminders(storedReminders ? JSON.parse(storedReminders) : []);
        setSourceMuteState(
          storedMute
            ? JSON.parse(storedMute)
            : { calendar: false, task: false, manual: false }
        );

        const { status } = await Notifications.getPermissionsAsync();
        if (status !== 'granted') {
          await Notifications.requestPermissionsAsync();
        }

        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.DEFAULT,
          });
        }
      } catch (error) {
        console.error('Error initializing reminders:', error);
        setReminders([]);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  const saveReminders = async (updated: Reminder[]) => {
    setReminders(updated);
    await AsyncStorage.setItem(REMINDERS_KEY, JSON.stringify(updated));
  };

  const saveMuteState = async (mute: SourceMuteState) => {
    setSourceMuteState(mute);
    await AsyncStorage.setItem(REMINDERS_MUTE_KEY, JSON.stringify(mute));
  };

  // Helpers
  const parseDateTime = (dateStr: string, timeStr: string): Date | null => {
    if (!dateStr || !timeStr) return null;
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      const [hh, mm] = timeStr.split(':').map(Number);
      return new Date(y, m - 1, d, hh, mm);
    } catch {
      return null;
    }
  };

  const scheduleNotification = async (
    reminder: Omit<Reminder, 'id' | 'createdAt' | 'notificationId'>
  ): Promise<string | undefined> => {
    // Respect mute by source
    if (sourceMute[reminder.source]) return undefined;

    const triggerDate = parseDateTime(reminder.date, reminder.time);
    if (!triggerDate || triggerDate <= new Date()) {
      return undefined;
    }

    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: reminder.title,
        },
        trigger: triggerDate,
      });
      return notificationId;
    } catch (error) {
      console.error('Error scheduling reminder notification:', error);
      return undefined;
    }
  };

  const createReminder = async (
    input: Omit<Reminder, 'id' | 'createdAt' | 'notificationId'>
  ) => {
    const id = generateId();

    const notificationId = await scheduleNotification(input);

    const newReminder: Reminder = {
      id,
      ...input,
      notificationId,
      createdAt: Date.now(),
    };

    const updated = [...reminders, newReminder];
    await saveReminders(updated);
  };

  const updateReminder = async (id: string, updates: Partial<Reminder>) => {
    const existing = reminders.find(r => r.id === id);
    if (!existing) return;

    // If date/time or sourceMute changed relevance, reschedule notification
    let notificationId = existing.notificationId;

    const updatedBase = { ...existing, ...updates };

    // Cancel old notification if date/time changed
    if (
      (updates.date && updates.date !== existing.date) ||
      (updates.time && updates.time !== existing.time)
    ) {
      if (notificationId) {
        try {
          await Notifications.cancelScheduledNotificationAsync(notificationId);
        } catch (error) {
          console.error('Error cancelling old notification:', error);
        }
      }
      notificationId = await scheduleNotification(updatedBase);
    }

    const updatedReminders = reminders.map(r =>
      r.id === id ? { ...updatedBase, notificationId } : r
    );
    await saveReminders(updatedReminders);
  };

  const deleteReminder = async (id: string) => {
    const existing = reminders.find(r => r.id === id);
    if (existing?.notificationId) {
      try {
        await Notifications.cancelScheduledNotificationAsync(existing.notificationId);
      } catch (error) {
        console.error('Error cancelling notification on delete:', error);
      }
    }
    const updated = reminders.filter(r => r.id !== id);
    await saveReminders(updated);
  };

  const setSourceMute = async (source: ReminderSource, muted: boolean) => {
    const updatedMute: SourceMuteState = { ...sourceMute, [source]: muted };
    await saveMuteState(updatedMute);

    // If muting, cancel future notifications of that source
    if (muted) {
      const now = new Date();
      const updatedReminders = await Promise.all(
        reminders.map(async r => {
          if (r.source === source && r.notificationId) {
            const triggerDate = parseDateTime(r.date, r.time);
            if (triggerDate && triggerDate > now) {
              try {
                await Notifications.cancelScheduledNotificationAsync(r.notificationId);
              } catch (error) {
                console.error('Error cancelling notification for mute:', error);
              }
            }
            return { ...r, notificationId: undefined };
          }
          return r;
        })
      );

      await saveReminders(updatedReminders);
    }
  };

  const createReminderForCalendarEvent = async (event: CalendarEvent) => {
    if (!event.date || !event.time) return;
    const triggerDate = parseDateTime(event.date, event.time);
    if (!triggerDate || triggerDate <= new Date()) return;

    await createReminder({
      title: event.title || 'Calendar Event',
      date: event.date,
      time: event.time,
      source: 'calendar',
      sourceId: event.id,
    });
  };

  const createReminderForTask = async (task: Task) => {
    if (!task.dueDate || !task.dueTime) return;
    const triggerDate = parseDateTime(task.dueDate, task.dueTime);
    if (!triggerDate || triggerDate <= new Date()) return;

    await createReminder({
      title: task.name || 'Task Reminder',
      date: task.dueDate,
      time: task.dueTime,
      source: 'task',
      sourceId: task.id,
    });
  };

  return (
    <RemindersContext.Provider
      value={{
        reminders,
        loading,
        sourceMute,
        createReminder,
        updateReminder,
        deleteReminder,
        setSourceMute,
        createReminderForCalendarEvent,
        createReminderForTask,
      }}
    >
      {children}
    </RemindersContext.Provider>
  );
};


