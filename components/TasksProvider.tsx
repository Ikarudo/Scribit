import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type TaskPriority = 'High' | 'Medium' | 'Low';

export type Task = {
  id: string;
  name: string;
  description?: string;
  priority: TaskPriority;
  completed: boolean;
  dueDate?: string; // ISO date string (YYYY-MM-DD)
  dueTime?: string; // Time string (HH:MM) in 24-hour format
  createdAt: number;
  calendarEventId?: string; // ID of the calendar event if created
};

interface TasksContextType {
  tasks: Task[];
  loading: boolean;
  createTask: (task: Omit<Task, 'id' | 'createdAt'>) => Promise<string>; // Returns new task ID
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  toggleTaskComplete: (id: string) => Promise<void>;
  refreshTasks: () => Promise<void>;
}

const TasksContext = createContext<TasksContextType | undefined>(undefined);

export function useTasks() {
  const ctx = useContext(TasksContext);
  if (!ctx) throw new Error('useTasks must be used within TasksProvider');
  return ctx;
}

const TASKS_KEY = 'scribit_tasks';

function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substr(2, 9) + Date.now();
}

export const TasksProvider = ({ children }: { children: ReactNode }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // Load tasks from AsyncStorage
  useEffect(() => {
    const loadTasks = async () => {
      setLoading(true);
      
      try {
        const localTasks = await AsyncStorage.getItem(TASKS_KEY);
        const parsedLocalTasks = localTasks ? JSON.parse(localTasks) : [];
        
        // Set state from local storage
        setTasks(parsedLocalTasks);
        console.log('TasksProvider: Loaded', parsedLocalTasks.length, 'tasks from storage');
      } catch (error) {
        console.error('Error loading tasks:', error);
        setTasks([]);
      } finally {
        setLoading(false);
      }
    };
    
    loadTasks();
  }, []);

  // CRUD for tasks
  const createTask = async (taskData: Omit<Task, 'id' | 'createdAt'>): Promise<string> => {
    const id = generateId();
    const newTask: Task = {
      id,
      ...taskData,
      createdAt: Date.now(),
    };
    
    // Update local state and storage
    const updatedTasks = [...tasks, newTask];
    setTasks(updatedTasks);
    await AsyncStorage.setItem(TASKS_KEY, JSON.stringify(updatedTasks));
    console.log('TasksProvider: Task created');
    return id;
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    // Update local state and storage
    const updatedTasks = tasks.map(task => 
      task.id === id ? { ...task, ...updates } : task
    );
    setTasks(updatedTasks);
    await AsyncStorage.setItem(TASKS_KEY, JSON.stringify(updatedTasks));
    console.log('TasksProvider: Task updated');
  };

  const deleteTask = async (id: string) => {
    // Update local state and storage
    const updatedTasks = tasks.filter(task => task.id !== id);
    setTasks(updatedTasks);
    await AsyncStorage.setItem(TASKS_KEY, JSON.stringify(updatedTasks));
    console.log('TasksProvider: Task deleted');
  };

  const toggleTaskComplete = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (task) {
      await updateTask(id, { completed: !task.completed });
    }
  };

  // Refresh tasks from storage
  const refreshTasks = async () => {
    try {
      const localTasks = await AsyncStorage.getItem(TASKS_KEY);
      const parsedLocalTasks = localTasks ? JSON.parse(localTasks) : [];
      setTasks(parsedLocalTasks);
      console.log('TasksProvider: Tasks refreshed from storage');
    } catch (error) {
      console.error('Error refreshing tasks:', error);
    }
  };

  return (
    <TasksContext.Provider
      value={{
        tasks,
        loading,
        createTask,
        updateTask,
        deleteTask,
        toggleTaskComplete,
        refreshTasks,
      }}
    >
      {children}
    </TasksContext.Provider>
  );
};

