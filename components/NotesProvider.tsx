import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
// DEPRECATED: Firestore imports - kept for future removal
// import { db } from '../FirebaseConfig';
// import {
//   collection,
//   setDoc,
//   updateDoc,
//   deleteDoc,
//   doc,
//   getDocs,
//   onSnapshot,
//   serverTimestamp,
//   query,
//   where,
//   addDoc,
//   orderBy,
// } from 'firebase/firestore';

export type Book = {
  id: string;
  title: string;
  createdAt: number;
  favorited?: boolean;
  lastOpened?: number;
  openCount?: number;
  icon?: string; // Icon filename from assets/images
};

export type Page = {
  id: string;
  bookId: string;
  title: string;
  content: string;
  pinned: boolean;
  lastOpened: number;
  openCount: number;
  createdAt: number;
};

interface NotesContextType {
  books: Book[];
  pages: Page[];
  selectedBookId: string | null;
  setSelectedBookId: (id: string) => void;
  loading: boolean;
  createBook: (title: string, icon?: string) => Promise<void>;
  updateBook: (id: string, updates: Partial<Book>) => Promise<void>;
  deleteBook: (id: string) => Promise<void>;
  createPage: (page: Partial<Page>) => Promise<void>;
  updatePage: (id: string, updates: Partial<Page>) => Promise<void>;
  deletePage: (id: string) => Promise<void>;
  pinPage: (id: string, pinned: boolean) => Promise<void>;
  toggleBookFavorite: (id: string) => Promise<void>;
  refreshBooksAndPages: () => Promise<void>;
  // DEPRECATED: Firestore sync functions - kept for API compatibility but are no-ops
  syncLocalBooksToFirebase: () => Promise<void>;
  syncLocalPagesToFirebase: () => Promise<void>;
}

const NotesContext = createContext<NotesContextType | undefined>(undefined);

export function useNotes() {
  const ctx = useContext(NotesContext);
  if (!ctx) throw new Error('useNotes must be used within NotesProvider');
  return ctx;
}

const BOOKS_KEY = 'scribit_books';
const PAGES_KEY = 'scribit_pages';

function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substr(2, 9) + Date.now();
}

export const NotesProvider = ({ children }: { children: ReactNode }) => {
  const [books, setBooks] = useState<Book[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [trackedBooks, setTrackedBooks] = useState<Set<string>>(new Set());
  // DEPRECATED: Removed Firebase-specific tracking refs (deletedBookIdsRef, deletedPageIdsRef, etc.)
  // These were used to prevent Firebase from re-adding deleted items

  // Load books and pages from AsyncStorage only (offline-only mode)
  useEffect(() => {
    const loadBooksAndPages = async () => {
      setLoading(true);
      
      try {
        // Load from AsyncStorage
        const localBooks = await AsyncStorage.getItem(BOOKS_KEY);
        const localPages = await AsyncStorage.getItem(PAGES_KEY);
        const parsedLocalBooks = localBooks ? JSON.parse(localBooks) : [];
        const parsedLocalPages = localPages ? JSON.parse(localPages) : [];
        
        // Deduplicate books by ID (keep the first occurrence)
        const uniqueBooksMap = new Map<string, Book>();
        parsedLocalBooks.forEach((book: Book) => {
          if (!uniqueBooksMap.has(book.id)) {
            uniqueBooksMap.set(book.id, book);
          }
        });
        const deduplicatedBooks = Array.from(uniqueBooksMap.values());
        
        // Deduplicate pages by ID (keep the first occurrence)
        const uniquePagesMap = new Map<string, Page>();
        parsedLocalPages.forEach((page: Page) => {
          if (!uniquePagesMap.has(page.id)) {
            uniquePagesMap.set(page.id, page);
          }
        });
        const deduplicatedPages = Array.from(uniquePagesMap.values());
        
        // Ensure favorited is always a boolean (default to false if undefined)
        // Also check if any books are missing the favorited property or if it's not a boolean
        let needsSave = false;
        const normalizedBooks = deduplicatedBooks.map((book: Book) => {
          const hasFavorited = 'favorited' in book;
          const isBoolean = typeof book.favorited === 'boolean';
          if (!hasFavorited || !isBoolean) {
            needsSave = true; // Need to save if any book is missing favorited or it's not a boolean
          }
          return {
            ...book,
            favorited: book.favorited === true, // Explicitly set to boolean (false if undefined/null)
          };
        });
        
        // Log favorited books for debugging
        const favoritedCount = normalizedBooks.filter(b => b.favorited === true).length;
        console.log('NotesProvider: Loaded', favoritedCount, 'favorited books out of', normalizedBooks.length, 'total');
        console.log('NotesProvider: All books favorited status:', normalizedBooks.map(b => ({ id: b.id, title: b.title, favorited: b.favorited })));
        if (favoritedCount > 0) {
          console.log('NotesProvider: Favorited books:', normalizedBooks.filter(b => b.favorited === true).map(b => ({ id: b.id, title: b.title })));
        }
        
        // ALWAYS save normalized data back to AsyncStorage to ensure favorited property exists
        // This ensures all books have the favorited property
        await AsyncStorage.setItem(BOOKS_KEY, JSON.stringify(normalizedBooks));
        if (deduplicatedBooks.length !== parsedLocalBooks.length) {
          console.log('NotesProvider: Removed', parsedLocalBooks.length - deduplicatedBooks.length, 'duplicate books from storage');
        }
        if (needsSave) {
          console.log('NotesProvider: Added/updated favorited property for all books');
        }
        if (deduplicatedPages.length !== parsedLocalPages.length) {
          await AsyncStorage.setItem(PAGES_KEY, JSON.stringify(deduplicatedPages));
          console.log('NotesProvider: Removed', parsedLocalPages.length - deduplicatedPages.length, 'duplicate pages from storage');
        }
        
        // Set initial state from local storage
        setBooks(normalizedBooks);
        setPages(deduplicatedPages);
        
        console.log('NotesProvider: Loaded local books:', normalizedBooks.length, normalizedBooks.map((b: Book) => ({ id: b.id, title: b.title, favorited: b.favorited })));
        
        // Set default selected book if not set
        if (!selectedBookId && normalizedBooks.length > 0) {
          setSelectedBookId(normalizedBooks[0].id);
        }
      } catch (error) {
        console.error('Error loading books and pages from AsyncStorage:', error);
        setBooks([]);
        setPages([]);
      } finally {
        setLoading(false);
      }
    };
    
    loadBooksAndPages();
  }, []);

  // DEPRECATED: Firestore sync functions - now no-ops in offline-only mode
  const syncLocalBooksToFirebase = async () => {
    console.log('NotesProvider: syncLocalBooksToFirebase called (deprecated - offline-only mode)');
    // No-op: App is now offline-only
  };

  const syncLocalPagesToFirebase = async () => {
    console.log('NotesProvider: syncLocalPagesToFirebase called (deprecated - offline-only mode)');
    // No-op: App is now offline-only
  };

  // CRUD for books
  const createBook = async (title: string, icon?: string) => {
    const id = generateId();
    const newBook: Book = {
      id,
      title,
      createdAt: Date.now(),
      favorited: false, // Explicitly set to false
      icon: icon || 'BookType 1 -Blue.png', // Default icon
    };
    
    // Update local state immediately
    const updatedBooks = [...books, newBook];
    setBooks(updatedBooks);
    await AsyncStorage.setItem(BOOKS_KEY, JSON.stringify(updatedBooks));
    
    console.log('NotesProvider: Book created locally');
    
    setSelectedBookId(id);
  };

  const updateBook = async (id: string, updates: Partial<Book>) => {
    // Update local state immediately
    const book = books.find(b => b.id === id);
    if (!book) {
      console.error('NotesProvider: Book not found for update:', id);
      return;
    }
    
    // Ensure favorited is always a boolean if it's being updated
    const normalizedUpdates = { ...updates };
    if ('favorited' in updates) {
      normalizedUpdates.favorited = updates.favorited === true;
    }
    
    const updatedBook = { ...book, ...normalizedUpdates };
    // Ensure favorited is always present (default to false if not set)
    if (updatedBook.favorited === undefined) {
      updatedBook.favorited = false;
    }
    
    const updatedBooks = books.map(b => b.id === id ? updatedBook : b);
    setBooks(updatedBooks);
    await AsyncStorage.setItem(BOOKS_KEY, JSON.stringify(updatedBooks));
    
    console.log('NotesProvider: Book updated locally, favorited:', updatedBook.favorited);
  };

  const deleteBook = async (id: string) => {
    // Update local state immediately - save to AsyncStorage
    const updatedBooks = books.filter(book => book.id !== id);
    const updatedPages = pages.filter(page => page.bookId !== id);
    setBooks(updatedBooks);
    setPages(updatedPages);
    await AsyncStorage.setItem(BOOKS_KEY, JSON.stringify(updatedBooks));
    await AsyncStorage.setItem(PAGES_KEY, JSON.stringify(updatedPages));
    
    console.log('NotesProvider: Book deleted locally');
    
    // If the deleted book was selected, select another
    if (selectedBookId === id && updatedBooks.length > 0) {
      setSelectedBookId(updatedBooks[0].id);
    } else if (selectedBookId === id) {
      setSelectedBookId(null);
    }
  };

  // CRUD for pages
  const createPage = async (page: Partial<Page>) => {
    if (!selectedBookId) {
      throw new Error('No book selected');
    }
    try {
      console.log('Creating page for book:', selectedBookId, 'with data:', page);
      const id = generateId();
      const newPage: Page = {
        id,
        bookId: selectedBookId,
        title: page.title || '',
        content: page.content || '',
        pinned: page.pinned || false,
        lastOpened: Date.now(),
        openCount: 1,
        createdAt: Date.now(),
      };
      console.log('New page object:', newPage);
      
      // Update local state immediately
      const updatedPages = [...pages, newPage];
      setPages(updatedPages);
      await AsyncStorage.setItem(PAGES_KEY, JSON.stringify(updatedPages));
      
      console.log('Page created successfully locally');
    } catch (error) {
      console.error('Error creating page:', error);
      throw error;
    }
  };

  const updatePage = async (id: string, updates: Partial<Page>) => {
    try {
      console.log('Updating page:', id, 'with updates:', updates);
      
      // Update local state immediately
      const page = pages.find(p => p.id === id);
      if (!page) {
        console.error('NotesProvider: Page not found for update:', id);
        return;
      }
      
      const updatedPage = { ...page, ...updates };
      const updatedPages = pages.map(p => p.id === id ? updatedPage : p);
      setPages(updatedPages);
      await AsyncStorage.setItem(PAGES_KEY, JSON.stringify(updatedPages));
      
      console.log('Page updated successfully locally');
    } catch (error) {
      console.error('Error updating page:', error);
      // Don't throw - local update is already done
    }
  };

  const deletePage = async (id: string) => {
    // Update local state immediately - save to AsyncStorage
    const updatedPages = pages.filter(page => page.id !== id);
    setPages(updatedPages);
    await AsyncStorage.setItem(PAGES_KEY, JSON.stringify(updatedPages));
    
    console.log('Page deleted locally');
  };

  const pinPage = async (id: string, pinned: boolean) => {
    await updatePage(id, { pinned });
  };

  const toggleBookFavorite = async (id: string) => {
    // Get current favorited value from state
    setBooks(currentBooks => {
      const book = currentBooks.find(b => b.id === id);
      if (!book) {
        console.error('NotesProvider: Book not found for favorite toggle:', id);
        return currentBooks;
      }
      
      const currentFavorited = book.favorited === true;
      const newFavoritedValue = !currentFavorited;
      console.log('NotesProvider: Toggling favorite for book:', id, 'from', currentFavorited, 'to', newFavoritedValue);
      
      // Create updated books array
      const updatedBooksArray = currentBooks.map(b => {
        if (b.id === id) {
          // Create a completely new object for the updated book with favorited explicitly set
          return { ...b, favorited: newFavoritedValue };
        }
        // Return existing book
        return b;
      });
      
      const updatedBook = updatedBooksArray.find(b => b.id === id);
      console.log('NotesProvider: Book favorite toggled in state, favorited:', updatedBook?.favorited);
      console.log('NotesProvider: All books after toggle:', updatedBooksArray.map(b => ({ id: b.id, title: b.title, favorited: b.favorited })));
      
      // Save to AsyncStorage asynchronously (don't block state update)
      AsyncStorage.setItem(BOOKS_KEY, JSON.stringify(updatedBooksArray)).then(() => {
        const favoritedCount = updatedBooksArray.filter(b => b.favorited === true).length;
        console.log('NotesProvider: Favorite status saved to AsyncStorage, favorited:', newFavoritedValue);
        console.log('NotesProvider: Total favorited books after save:', favoritedCount);
      }).catch(err => {
        console.error('Error saving to AsyncStorage:', err);
      });
      
      return [...updatedBooksArray]; // Return new array reference
    });
  };

  const refreshBooksAndPages = async () => {
    setLoading(true);
    try {
      // Reload from AsyncStorage
      const localBooks = await AsyncStorage.getItem(BOOKS_KEY);
      const localPages = await AsyncStorage.getItem(PAGES_KEY);
      const parsedLocalBooks = localBooks ? JSON.parse(localBooks) : [];
      const parsedLocalPages = localPages ? JSON.parse(localPages) : [];
      
      // Deduplicate
      const uniqueBooksMap = new Map<string, Book>();
      parsedLocalBooks.forEach((book: Book) => {
        if (!uniqueBooksMap.has(book.id)) {
          uniqueBooksMap.set(book.id, book);
        }
      });
      const deduplicatedBooks = Array.from(uniqueBooksMap.values());
      
      const uniquePagesMap = new Map<string, Page>();
      parsedLocalPages.forEach((page: Page) => {
        if (!uniquePagesMap.has(page.id)) {
          uniquePagesMap.set(page.id, page);
        }
      });
      const deduplicatedPages = Array.from(uniquePagesMap.values());
      
      // Normalize books
      const normalizedBooks = deduplicatedBooks.map((book: Book) => ({
        ...book,
        favorited: book.favorited === true,
      }));
      
      setBooks(normalizedBooks);
      setPages(deduplicatedPages);
      console.log('NotesProvider: Refreshed books and pages from local storage');
    } catch (error) {
      console.error('Error refreshing books and pages:', error);
    } finally {
      setLoading(false);
    }
  };

  const setSelectedBookIdWithTracking = (id: string) => {
    // Don't update if it's already the selected book
    if (selectedBookId === id) {
      return;
    }
    
    // Update book usage statistics when selected (but only once per session)
    const book = books.find(b => b.id === id);
    if (book && !trackedBooks.has(id)) {
      const updatedBook = {
        ...book,
        lastOpened: Date.now(),
        openCount: (book.openCount || 0) + 1
      };
      
      // Update local state immediately
      const updatedBooks = books.map(b => b.id === id ? updatedBook : b);
      setBooks(updatedBooks);
      AsyncStorage.setItem(BOOKS_KEY, JSON.stringify(updatedBooks));
      
      // Mark this book as tracked for this session
      setTrackedBooks(prev => new Set([...prev, id]));
      
      console.log('NotesProvider: Book usage tracked locally');
    }
    setSelectedBookId(id);
  };

  return (
    <NotesContext.Provider
      value={{
        books,
        pages,
        selectedBookId,
        setSelectedBookId: setSelectedBookIdWithTracking,
        loading,
        createBook,
        updateBook,
        deleteBook,
        createPage,
        updatePage,
        deletePage,
        pinPage,
        toggleBookFavorite,
        refreshBooksAndPages,
        syncLocalBooksToFirebase,
        syncLocalPagesToFirebase,
      }}
    >
      {children}
    </NotesContext.Provider>
  );
}; 