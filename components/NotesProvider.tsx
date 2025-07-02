import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../FirebaseConfig';
import {
  collection,
  setDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';

export type Note = {
  id: string;
  title: string;
  content: string;
  category: string;
  pinned: boolean;
  lastOpened: number;
  openCount: number;
  createdAt: number;
};

interface NotesContextType {
  notes: Note[];
  loading: boolean;
  createNote: (note: Partial<Note>) => Promise<void>;
  updateNote: (id: string, updates: Partial<Note>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  pinNote: (id: string, pinned: boolean) => Promise<void>;
  setCategory: (id: string, category: string) => Promise<void>;
  refreshNotes: () => Promise<void>;
}

const NotesContext = createContext<NotesContextType | undefined>(undefined);

export function useNotes() {
  const ctx = useContext(NotesContext);
  if (!ctx) throw new Error('useNotes must be used within NotesProvider');
  return ctx;
}

const NOTES_KEY = 'scribit_notes';

function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substr(2, 9) + Date.now();
}

export const NotesProvider = ({ children }: { children: ReactNode }) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  // One-time cleanup for notes with empty IDs
  useEffect(() => {
    const cleanupBadNotes = async () => {
      // Remove from local state and AsyncStorage
      setNotes((prev) => prev.filter((n) => n.id));
      const local = await AsyncStorage.getItem(NOTES_KEY);
      if (local) {
        const notesArr = JSON.parse(local);
        const filtered = notesArr.filter((n: any) => n.id);
        await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(filtered));
      }
      // Try to delete from Firestore (if any exist)
      try {
        await deleteDoc(doc(db, 'notes', ''));
      } catch {}
    };
    cleanupBadNotes();
  }, []);

  // Load notes from AsyncStorage and Firestore
  useEffect(() => {
    const loadNotes = async () => {
      setLoading(true);
      // Load from AsyncStorage
      const local = await AsyncStorage.getItem(NOTES_KEY);
      let localNotes: Note[] = local ? JSON.parse(local) : [];
      setNotes(localNotes);
      // Listen to Firestore
      const unsub = onSnapshot(collection(db, 'notes'), (snapshot) => {
        const remoteNotes: Note[] = [];
        snapshot.forEach(docSnap => {
          remoteNotes.push({ id: docSnap.id, ...docSnap.data() } as Note);
        });
        setNotes(remoteNotes);
        AsyncStorage.setItem(NOTES_KEY, JSON.stringify(remoteNotes));
        setLoading(false);
      });
      return () => unsub();
    };
    loadNotes();
  }, []);

  // CRUD operations
  const createNote = async (note: Partial<Note>) => {
    const id = generateId();
    const newNote: Note = {
      id,
      title: note.title || '',
      content: note.content || '',
      category: note.category || 'General',
      pinned: note.pinned || false,
      lastOpened: Date.now(),
      openCount: 1,
      createdAt: Date.now(),
    };
    await setDoc(doc(db, 'notes', id), {
      ...newNote,
      createdAt: serverTimestamp(),
      lastOpened: Date.now(),
    });
    // Firestore will update notes via onSnapshot
  };

  const updateNote = async (id: string, updates: Partial<Note>) => {
    const ref = doc(db, 'notes', id);
    await updateDoc(ref, updates);
  };

  const deleteNote = async (id: string) => {
    const ref = doc(db, 'notes', id);
    await deleteDoc(ref);
  };

  const pinNote = async (id: string, pinned: boolean) => {
    await updateNote(id, { pinned });
  };

  const setCategory = async (id: string, category: string) => {
    await updateNote(id, { category });
  };

  const refreshNotes = async () => {
    setLoading(true);
    const snapshot = await getDocs(collection(db, 'notes'));
    const remoteNotes: Note[] = [];
    snapshot.forEach(docSnap => {
      remoteNotes.push({ id: docSnap.id, ...docSnap.data() } as Note);
    });
    setNotes(remoteNotes);
    await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(remoteNotes));
    setLoading(false);
  };

  return (
    <NotesContext.Provider
      value={{ notes, loading, createNote, updateNote, deleteNote, pinNote, setCategory, refreshNotes }}
    >
      {children}
    </NotesContext.Provider>
  );
}; 