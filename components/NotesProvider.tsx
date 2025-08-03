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
  query,
  where,
  addDoc,
  orderBy,
} from 'firebase/firestore';

export type Book = {
  id: string;
  title: string;
  createdAt: number;
  favorited?: boolean;
  lastOpened?: number;
  openCount?: number;
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
  createBook: (title: string) => Promise<void>;
  updateBook: (id: string, updates: Partial<Book>) => Promise<void>;
  deleteBook: (id: string) => Promise<void>;
  createPage: (page: Partial<Page>) => Promise<void>;
  updatePage: (id: string, updates: Partial<Page>) => Promise<void>;
  deletePage: (id: string) => Promise<void>;
  pinPage: (id: string, pinned: boolean) => Promise<void>;
  toggleBookFavorite: (id: string, favorited: boolean) => Promise<void>;
  refreshBooksAndPages: () => Promise<void>;
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

  // Load books and pages from Firestore and AsyncStorage
  useEffect(() => {
    const loadBooksAndPages = async () => {
      setLoading(true);
      
      // Load from AsyncStorage first
      const localBooks = await AsyncStorage.getItem(BOOKS_KEY);
      const localPages = await AsyncStorage.getItem(PAGES_KEY);
      const parsedLocalBooks = localBooks ? JSON.parse(localBooks) : [];
      const parsedLocalPages = localPages ? JSON.parse(localPages) : [];
      
      // Set initial state from local storage ONLY
      setBooks(parsedLocalBooks);
      setPages(parsedLocalPages);
      
      console.log('NotesProvider: Loaded local books:', parsedLocalBooks.length, parsedLocalBooks.map(b => ({ id: b.id, title: b.title })));
      
      // Set default selected book if not set
      if (!selectedBookId && parsedLocalBooks.length > 0) {
        setSelectedBookId(parsedLocalBooks[0].id);
      }
      
      // Listen to Firestore books (for real-time updates from other devices, but don't overwrite local)
      const unsubBooks = onSnapshot(collection(db, 'books'), (snapshot) => {
        const remoteBooks: Book[] = [];
        snapshot.forEach(docSnap => {
          remoteBooks.push({ id: docSnap.id, ...docSnap.data() } as Book);
        });
        
        // Only add new books from Firebase that don't exist locally
        const currentBooks = books.length > 0 ? books : parsedLocalBooks;
        const newBooks = remoteBooks.filter(remoteBook => 
          !currentBooks.find(localBook => localBook.id === remoteBook.id)
        );
        
        if (newBooks.length > 0) {
          const updatedBooks = [...currentBooks, ...newBooks];
          setBooks(updatedBooks);
          AsyncStorage.setItem(BOOKS_KEY, JSON.stringify(updatedBooks));
          console.log('NotesProvider: Added', newBooks.length, 'new books from Firebase');
        }
        // Only log if there are actually new books, not just updates
        else if (remoteBooks.length > currentBooks.length) {
          console.log('NotesProvider: Received remote books:', remoteBooks.length, remoteBooks.map(b => ({ id: b.id, title: b.title })));
        }
      }, (error) => {
        console.error('Error loading books from Firestore:', error);
        // Keep local books if Firebase fails
        setBooks(parsedLocalBooks);
      });
      
      // Listen to Firestore pages (for real-time updates from other devices, but don't overwrite local)
      const unsubPages = onSnapshot(collection(db, 'pages'), (snapshot) => {
        const remotePages: Page[] = [];
        snapshot.forEach(docSnap => {
          remotePages.push({ id: docSnap.id, ...docSnap.data() } as Page);
        });
        
        // Only add new pages from Firebase that don't exist locally
        const currentPages = pages.length > 0 ? pages : parsedLocalPages;
        const newPages = remotePages.filter(remotePage => 
          !currentPages.find(localPage => localPage.id === remotePage.id)
        );
        
        if (newPages.length > 0) {
          const updatedPages = [...currentPages, ...newPages];
          setPages(updatedPages);
          AsyncStorage.setItem(PAGES_KEY, JSON.stringify(updatedPages));
          console.log('NotesProvider: Added', newPages.length, 'new pages from Firebase');
        }
      }, (error) => {
        console.error('Error loading pages from Firestore:', error);
        // Keep local pages if Firebase fails
        setPages(parsedLocalPages);
      });
      
      setLoading(false);
      
      return () => {
        unsubBooks();
        unsubPages();
      };
    };
    loadBooksAndPages();
  }, []);

  // Sync local books to Firebase
  const syncLocalBooksToFirebase = async () => {
    try {
      console.log('NotesProvider: Syncing local books to Firebase...');
      for (const book of books) {
        await setDoc(doc(db, 'books', book.id), {
          ...book,
          createdAt: serverTimestamp(),
        });
      }
      console.log('NotesProvider: Successfully synced', books.length, 'books to Firebase');
    } catch (error) {
      console.error('Error syncing books to Firebase:', error);
    }
  };

  // Sync local pages to Firebase
  const syncLocalPagesToFirebase = async () => {
    try {
      console.log('NotesProvider: Syncing local pages to Firebase...');
      for (const page of pages) {
        await setDoc(doc(db, 'pages', page.id), {
          ...page,
          createdAt: serverTimestamp(),
          lastOpened: serverTimestamp(),
        });
      }
      console.log('NotesProvider: Successfully synced', pages.length, 'pages to Firebase');
    } catch (error) {
      console.error('Error syncing pages to Firebase:', error);
    }
  };

  // CRUD for books
  const createBook = async (title: string) => {
    const id = generateId();
    const newBook: Book = {
      id,
      title,
      createdAt: Date.now(),
    };
    
    // Update local state immediately
    const updatedBooks = [...books, newBook];
    setBooks(updatedBooks);
    await AsyncStorage.setItem(BOOKS_KEY, JSON.stringify(updatedBooks));
    
    // Then sync to Firebase
    try {
      await setDoc(doc(db, 'books', id), {
        ...newBook,
        createdAt: serverTimestamp(),
      });
      console.log('NotesProvider: Book created and synced to Firebase');
    } catch (error) {
      console.error('Error syncing book to Firebase:', error);
    }
    
    setSelectedBookId(id);
  };

  const updateBook = async (id: string, updates: Partial<Book>) => {
    // Update local state immediately
    const updatedBooks = books.map(book => 
      book.id === id ? { ...book, ...updates } : book
    );
    setBooks(updatedBooks);
    await AsyncStorage.setItem(BOOKS_KEY, JSON.stringify(updatedBooks));
    
    // Then sync to Firebase
    try {
      const ref = doc(db, 'books', id);
      await updateDoc(ref, updates);
      console.log('NotesProvider: Book updated and synced to Firebase');
    } catch (error) {
      console.error('Error syncing book update to Firebase:', error);
    }
  };

  const deleteBook = async (id: string) => {
    // Update local state immediately
    const updatedBooks = books.filter(book => book.id !== id);
    const updatedPages = pages.filter(page => page.bookId !== id);
    setBooks(updatedBooks);
    setPages(updatedPages);
    await AsyncStorage.setItem(BOOKS_KEY, JSON.stringify(updatedBooks));
    await AsyncStorage.setItem(PAGES_KEY, JSON.stringify(updatedPages));
    
    // Then sync to Firebase
    try {
      // Delete all pages in this book
      const q = query(collection(db, 'pages'), where('bookId', '==', id));
      const snapshot = await getDocs(q);
      for (const docSnap of snapshot.docs) {
        await deleteDoc(doc(db, 'pages', docSnap.id));
      }
      // Delete the book
      await deleteDoc(doc(db, 'books', id));
      console.log('NotesProvider: Book deleted and synced to Firebase');
    } catch (error) {
      console.error('Error syncing book deletion to Firebase:', error);
    }
    
    // If the deleted book was selected, select another
    if (selectedBookId === id && updatedBooks.length > 0) {
      setSelectedBookId(updatedBooks[0].id);
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
      
      // Then sync to Firebase
      await setDoc(doc(db, 'pages', id), {
        ...newPage,
        createdAt: serverTimestamp(),
        lastOpened: serverTimestamp(),
      });
      console.log('Page created successfully and synced to Firebase');
    } catch (error) {
      console.error('Error creating page:', error);
      throw error;
    }
  };

  const updatePage = async (id: string, updates: Partial<Page>) => {
    try {
      console.log('Updating page:', id, 'with updates:', updates);
      
      // Update local state immediately
      const updatedPages = pages.map(page => 
        page.id === id ? { ...page, ...updates } : page
      );
      setPages(updatedPages);
      await AsyncStorage.setItem(PAGES_KEY, JSON.stringify(updatedPages));
      
      // Then sync to Firebase
      const ref = doc(db, 'pages', id);
      await updateDoc(ref, updates);
      console.log('Page updated successfully and synced to Firebase');
    } catch (error) {
      console.error('Error updating page:', error);
      throw error;
    }
  };

  const deletePage = async (id: string) => {
    // Update local state immediately
    const updatedPages = pages.filter(page => page.id !== id);
    setPages(updatedPages);
    await AsyncStorage.setItem(PAGES_KEY, JSON.stringify(updatedPages));
    
    // Then sync to Firebase
    try {
      const ref = doc(db, 'pages', id);
      await deleteDoc(ref);
      console.log('Page deleted and synced to Firebase');
    } catch (error) {
      console.error('Error syncing page deletion to Firebase:', error);
    }
  };

  const pinPage = async (id: string, pinned: boolean) => {
    await updatePage(id, { pinned });
  };

  const toggleBookFavorite = async (id: string, favorited: boolean) => {
    // Update local state immediately
    const updatedBooks = books.map(book => 
      book.id === id ? { ...book, favorited: !favorited } : book
    );
    setBooks(updatedBooks);
    await AsyncStorage.setItem(BOOKS_KEY, JSON.stringify(updatedBooks));
    
    // Then sync to Firebase
    try {
      await updateBook(id, { favorited: !favorited });
      console.log('NotesProvider: Book favorite toggled and synced to Firebase');
    } catch (error) {
      console.error('Error syncing book favorite toggle to Firebase:', error);
    }
  };

  const refreshBooksAndPages = async () => {
    setLoading(true);
    const booksSnap = await getDocs(collection(db, 'books'));
    const remoteBooks: Book[] = [];
    booksSnap.forEach(docSnap => {
      remoteBooks.push({ id: docSnap.id, ...docSnap.data() } as Book);
    });
    setBooks(remoteBooks);
    await AsyncStorage.setItem(BOOKS_KEY, JSON.stringify(remoteBooks));
    const pagesSnap = await getDocs(collection(db, 'pages'));
    const remotePages: Page[] = [];
    pagesSnap.forEach(docSnap => {
      remotePages.push({ id: docSnap.id, ...docSnap.data() } as Page);
    });
    setPages(remotePages);
    await AsyncStorage.setItem(PAGES_KEY, JSON.stringify(remotePages));
    setLoading(false);
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
      
      // Then sync to Firebase (but don't await to prevent blocking)
      updateBook(id, {
        lastOpened: Date.now(),
        openCount: (book.openCount || 0) + 1
      }).then(() => {
        console.log('NotesProvider: Book usage tracked and synced to Firebase');
      }).catch((error) => {
        console.error('Error syncing book usage to Firebase:', error);
      });
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