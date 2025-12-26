import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
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
  const deletedBookIdsRef = useRef<Set<string>>(new Set());
  const deletedPageIdsRef = useRef<Set<string>>(new Set());
  const recentlyUpdatedBooksRef = useRef<Map<string, number>>(new Map()); // Track recently updated books to prevent overwrite
  const localBookStateRef = useRef<Map<string, Book>>(new Map()); // Track local book state to always prefer over remote

  // Load books and pages from Firestore and AsyncStorage
  useEffect(() => {
    const loadBooksAndPages = async () => {
      setLoading(true);
      
      // Load from AsyncStorage first
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
      
      // Ensure favorited is always a boolean
      const normalizedBooks = deduplicatedBooks.map((book: Book) => ({
        ...book,
        favorited: book.favorited === true, // Explicitly set to boolean
      }));
      
      // Save deduplicated data back to AsyncStorage if duplicates were found
      if (deduplicatedBooks.length !== parsedLocalBooks.length) {
        await AsyncStorage.setItem(BOOKS_KEY, JSON.stringify(normalizedBooks));
        console.log('NotesProvider: Removed', parsedLocalBooks.length - deduplicatedBooks.length, 'duplicate books from storage');
      }
      if (deduplicatedPages.length !== parsedLocalPages.length) {
        await AsyncStorage.setItem(PAGES_KEY, JSON.stringify(deduplicatedPages));
        console.log('NotesProvider: Removed', parsedLocalPages.length - deduplicatedPages.length, 'duplicate pages from storage');
      }
      
      // Set initial state from local storage ONLY
      setBooks(normalizedBooks);
      setPages(deduplicatedPages);
      
      console.log('NotesProvider: Loaded local books:', normalizedBooks.length, normalizedBooks.map((b: Book) => ({ id: b.id, title: b.title })));
      
      // Set default selected book if not set
      if (!selectedBookId && normalizedBooks.length > 0) {
        setSelectedBookId(normalizedBooks[0].id);
      }
      
      // Listen to Firestore books (for real-time updates from other devices, but don't overwrite local)
      const unsubBooks = onSnapshot(collection(db, 'books'), (snapshot) => {
        const remoteBooks: Book[] = [];
        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          // Convert Firebase timestamps to numbers for local storage, handle invalid dates
          let createdAt = Date.now();
          if (data.createdAt) {
            if (data.createdAt.toMillis) {
              const millis = data.createdAt.toMillis();
              // Validate date is within reasonable bounds
              if (millis > 0 && millis < 4102444800000) { // Year 2100
                createdAt = millis;
              }
            } else if (typeof data.createdAt === 'number' && data.createdAt > 0 && data.createdAt < 4102444800000) {
              createdAt = data.createdAt;
            }
          }
          
          // Ensure favorited is always a boolean
          remoteBooks.push({ 
            id: docSnap.id, 
            ...data,
            favorited: data.favorited === true, // Explicitly set to boolean
            createdAt,
          } as Book);
        });
        
        // Get current books state and check deleted IDs from ref
        setBooks(currentBooks => {
          // CRITICAL: Always use currentBooks (the actual React state), never parsedLocalBooks
          // This ensures we preserve any local state changes
          const booksToUse = currentBooks.length > 0 ? currentBooks : normalizedBooks;
          const deletedIds = deletedBookIdsRef.current;
          const recentlyUpdated = recentlyUpdatedBooksRef.current;
          const localState = localBookStateRef.current;
          const now = Date.now();
          
          // Filter out books that were locally deleted (don't re-add them)
          const validRemoteBooks = remoteBooks.filter(remoteBook => 
            !deletedIds.has(remoteBook.id)
          );
          
          // Find books that exist in Firebase but not locally (new books from other devices)
          // AND are not in the deleted list
          const newBooks = validRemoteBooks.filter(remoteBook => 
            !booksToUse.find((localBook: Book) => localBook.id === remoteBook.id) &&
            !deletedIds.has(remoteBook.id)
          );
          
          // Start with local books - they are the source of truth
          // Apply tracked local state first (most recent local changes)
          let mergedBooks = booksToUse.map((localBook: Book) => {
            if (localState.has(localBook.id)) {
              const tracked = localState.get(localBook.id)!;
              console.log('NotesProvider: Using tracked local state for book:', localBook.id, 'favorited:', tracked.favorited);
              return tracked;
            }
            return localBook;
          });
          
          // Only add truly new books from Firebase (don't overwrite existing local books)
          if (newBooks.length > 0) {
            mergedBooks = [...mergedBooks, ...newBooks];
            // Deduplicate by ID before saving
            const uniqueMergedBooks = Array.from(
              new Map(mergedBooks.map(book => [book.id, book])).values()
            );
            AsyncStorage.setItem(BOOKS_KEY, JSON.stringify(uniqueMergedBooks));
            console.log('NotesProvider: Added', newBooks.length, 'new books from Firebase');
            return uniqueMergedBooks;
          }
          
          // Clean up old entries from recentlyUpdated (older than 10 seconds)
          const tenSecondsAgo = now - 10000;
          recentlyUpdated.forEach((timestamp, bookId) => {
            if (timestamp < tenSecondsAgo) {
              recentlyUpdated.delete(bookId);
            }
          });
          
          // Deduplicate by ID before returning (in case duplicates somehow got in)
          const uniqueBooks = Array.from(
            new Map(mergedBooks.map(book => [book.id, book])).values()
          );
          
          return uniqueBooks;
        });
      }, (error) => {
        console.error('Error loading books from Firestore:', error);
        // Keep local books if Firebase fails
        setBooks(normalizedBooks);
      });
      
      // Listen to Firestore pages (for real-time updates from other devices, but don't overwrite local)
      const unsubPages = onSnapshot(collection(db, 'pages'), (snapshot) => {
        const remotePages: Page[] = [];
        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          // Convert Firebase timestamps to numbers for local storage, handle invalid dates
          let createdAt = Date.now();
          let lastOpened = Date.now();
          
          if (data.createdAt) {
            if (data.createdAt.toMillis) {
              const millis = data.createdAt.toMillis();
              if (millis > 0 && millis < 4102444800000) {
                createdAt = millis;
              }
            } else if (typeof data.createdAt === 'number' && data.createdAt > 0 && data.createdAt < 4102444800000) {
              createdAt = data.createdAt;
            }
          }
          
          if (data.lastOpened) {
            if (data.lastOpened.toMillis) {
              const millis = data.lastOpened.toMillis();
              if (millis > 0 && millis < 4102444800000) {
                lastOpened = millis;
              }
            } else if (typeof data.lastOpened === 'number' && data.lastOpened > 0 && data.lastOpened < 4102444800000) {
              lastOpened = data.lastOpened;
            }
          }
          
          remotePages.push({ 
            id: docSnap.id, 
            ...data,
            createdAt,
            lastOpened,
          } as Page);
        });
        
        // Get current pages state and check deleted IDs from ref
        setPages(currentPages => {
          const pagesToUse = currentPages.length > 0 ? currentPages : parsedLocalPages;
          const deletedIds = deletedPageIdsRef.current;
          
          // Filter out pages that were locally deleted (don't re-add them)
          const validRemotePages = remotePages.filter(remotePage => 
            !deletedIds.has(remotePage.id)
          );
          
          // Find pages that exist in Firebase but not locally (new pages from other devices)
          // AND are not in the deleted list
          const newPages = validRemotePages.filter(remotePage => 
            !pagesToUse.find((localPage: Page) => localPage.id === remotePage.id) &&
            !deletedIds.has(remotePage.id)
          );
          
          // Find pages that exist in both - keep local version (local is source of truth)
          let mergedPages = [...pagesToUse];
          
          // Only add truly new pages from Firebase that weren't locally deleted
          if (newPages.length > 0) {
            mergedPages = [...mergedPages, ...newPages];
            // Deduplicate by ID before saving
            const uniqueMergedPages = Array.from(
              new Map(mergedPages.map(page => [page.id, page])).values()
            );
            AsyncStorage.setItem(PAGES_KEY, JSON.stringify(uniqueMergedPages));
            console.log('NotesProvider: Added', newPages.length, 'new pages from Firebase');
            return uniqueMergedPages;
          }
          
          // Deduplicate by ID before returning (in case duplicates somehow got in)
          const uniquePages = Array.from(
            new Map(mergedPages.map(page => [page.id, page])).values()
          );
          
          return uniquePages;
        });
      }, (error) => {
        console.error('Error loading pages from Firestore:', error);
        // Keep local pages if Firebase fails
        setPages(deduplicatedPages);
      });
      
      // Sync local changes to Firebase after initial load (with a delay to avoid conflicts)
      // This ensures Firebase is up to date with any local changes
      setTimeout(async () => {
        try {
          const currentBooks = await AsyncStorage.getItem(BOOKS_KEY);
          const currentPages = await AsyncStorage.getItem(PAGES_KEY);
          if (currentBooks && currentPages) {
            const booksToSync = JSON.parse(currentBooks);
            const pagesToSync = JSON.parse(currentPages);
            
            // Sync books to Firebase
            for (const book of booksToSync) {
              await setDoc(doc(db, 'books', book.id), {
                ...book,
                createdAt: book.createdAt ? new Date(book.createdAt) : serverTimestamp(),
              }, { merge: true });
            }
            
            // Sync pages to Firebase
            for (const page of pagesToSync) {
              await setDoc(doc(db, 'pages', page.id), {
                ...page,
                createdAt: page.createdAt ? new Date(page.createdAt) : serverTimestamp(),
                lastOpened: page.lastOpened ? new Date(page.lastOpened) : serverTimestamp(),
              }, { merge: true });
            }
            
            console.log('NotesProvider: Initial sync to Firebase completed');
          }
        } catch (error) {
          console.error('Error during initial sync to Firebase:', error);
        }
      }, 2000); // 2 second delay to let Firebase listeners settle
      
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
          createdAt: book.createdAt ? new Date(book.createdAt) : serverTimestamp(),
        }, { merge: true });
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
          createdAt: page.createdAt ? new Date(page.createdAt) : serverTimestamp(),
          lastOpened: page.lastOpened ? new Date(page.lastOpened) : serverTimestamp(),
        }, { merge: true });
      }
      console.log('NotesProvider: Successfully synced', pages.length, 'pages to Firebase');
    } catch (error) {
      console.error('Error syncing pages to Firebase:', error);
    }
  };

  // CRUD for books
  const createBook = async (title: string, icon?: string) => {
    const id = generateId();
    const newBook: Book = {
      id,
      title,
      createdAt: Date.now(),
      icon: icon || 'BookType 1 -Blue.png', // Default icon
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
    const book = books.find(b => b.id === id);
    if (!book) {
      console.error('NotesProvider: Book not found for update:', id);
      return;
    }
    
    const updatedBook = { ...book, ...updates };
    const updatedBooks = books.map(b => b.id === id ? updatedBook : b);
    setBooks(updatedBooks);
    await AsyncStorage.setItem(BOOKS_KEY, JSON.stringify(updatedBooks));
    
    // Then sync to Firebase - use setDoc with merge to handle cases where document doesn't exist
    try {
      const ref = doc(db, 'books', id);
      await setDoc(ref, {
        ...updatedBook,
        createdAt: book.createdAt ? new Date(book.createdAt) : serverTimestamp(),
      }, { merge: true });
      console.log('NotesProvider: Book updated and synced to Firebase');
    } catch (error) {
      console.error('Error syncing book update to Firebase:', error);
      // Don't throw - local update is already done
    }
  };

  const deleteBook = async (id: string) => {
    // Mark as deleted immediately to prevent re-adding from Firebase
    deletedBookIdsRef.current.add(id);
    
    // Get all page IDs for this book to mark them as deleted too
    const pageIdsToDelete = pages.filter(page => page.bookId === id).map(page => page.id);
    pageIdsToDelete.forEach(pageId => deletedPageIdsRef.current.add(pageId));
    
    // Update local state immediately - save to AsyncStorage first
    const updatedBooks = books.filter(book => book.id !== id);
    const updatedPages = pages.filter(page => page.bookId !== id);
    setBooks(updatedBooks);
    setPages(updatedPages);
    await AsyncStorage.setItem(BOOKS_KEY, JSON.stringify(updatedBooks));
    await AsyncStorage.setItem(PAGES_KEY, JSON.stringify(updatedPages));
    
    // Then sync to Firebase - handle cases where documents might not exist
    try {
      // Delete all pages in this book from Firebase
      const q = query(collection(db, 'pages'), where('bookId', '==', id));
      const snapshot = await getDocs(q);
      const deletePagePromises = snapshot.docs.map(docSnap => 
        deleteDoc(doc(db, 'pages', docSnap.id)).catch(err => {
          // If page doesn't exist in Firebase, that's okay - it's already deleted locally
          console.log('NotesProvider: Page not found in Firebase (already deleted):', docSnap.id);
        })
      );
      await Promise.all(deletePagePromises);
      
      // Delete the book from Firebase
      const bookRef = doc(db, 'books', id);
      await deleteDoc(bookRef).catch(err => {
        // If book doesn't exist in Firebase, that's okay - it's already deleted locally
        console.log('NotesProvider: Book not found in Firebase (already deleted):', id);
      });
      
      console.log('NotesProvider: Book deleted and synced to Firebase');
    } catch (error) {
      console.error('Error syncing book deletion to Firebase:', error);
      // Don't throw - local deletion is already done
    }
    
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
      const page = pages.find(p => p.id === id);
      if (!page) {
        console.error('NotesProvider: Page not found for update:', id);
        return;
      }
      
      const updatedPage = { ...page, ...updates };
      const updatedPages = pages.map(p => p.id === id ? updatedPage : p);
      setPages(updatedPages);
      await AsyncStorage.setItem(PAGES_KEY, JSON.stringify(updatedPages));
      
      // Then sync to Firebase - use setDoc with merge to handle cases where document doesn't exist
      const ref = doc(db, 'pages', id);
      await setDoc(ref, {
        ...updatedPage,
        createdAt: page.createdAt ? new Date(page.createdAt) : serverTimestamp(),
        lastOpened: updates.lastOpened ? new Date(updates.lastOpened as number) : (page.lastOpened ? new Date(page.lastOpened) : serverTimestamp()),
      }, { merge: true });
      console.log('Page updated successfully and synced to Firebase');
    } catch (error) {
      console.error('Error updating page:', error);
      // Don't throw - local update is already done
    }
  };

  const deletePage = async (id: string) => {
    // Mark as deleted immediately to prevent re-adding from Firebase
    deletedPageIdsRef.current.add(id);
    
    // Update local state immediately - save to AsyncStorage first
    const updatedPages = pages.filter(page => page.id !== id);
    setPages(updatedPages);
    await AsyncStorage.setItem(PAGES_KEY, JSON.stringify(updatedPages));
    
    // Then sync to Firebase - handle cases where document might not exist
    try {
      const ref = doc(db, 'pages', id);
      await deleteDoc(ref).catch(err => {
        // If page doesn't exist in Firebase, that's okay - it's already deleted locally
        console.log('NotesProvider: Page not found in Firebase (already deleted):', id);
      });
      console.log('Page deleted and synced to Firebase');
    } catch (error) {
      console.error('Error syncing page deletion to Firebase:', error);
      // Don't throw - local deletion is already done
    }
  };

  const pinPage = async (id: string, pinned: boolean) => {
    await updatePage(id, { pinned });
  };

  const toggleBookFavorite = async (id: string, favorited: boolean) => {
    const newFavoritedValue = !favorited;
    console.log('NotesProvider: Toggling favorite for book:', id, 'from', favorited, 'to', newFavoritedValue);
    
    // Mark this book as recently updated to prevent onSnapshot from overwriting
    const now = Date.now();
    recentlyUpdatedBooksRef.current.set(id, now);
    
    // Update local state immediately using functional update to ensure we have latest state
    setBooks(currentBooks => {
      const book = currentBooks.find(b => b.id === id);
      if (!book) {
        console.error('NotesProvider: Book not found for favorite toggle:', id);
        return currentBooks;
      }
      
      const updatedBook = { ...book, favorited: newFavoritedValue };
      
      // Track this local state change FIRST so onSnapshot always uses it (before state update)
      localBookStateRef.current.set(id, updatedBook);
      
      // Create a completely new array with new object references to ensure React detects the change
      const updatedBooks = currentBooks.map(b => {
        if (b.id === id) {
          // Create a completely new object for the updated book
          return { ...b, favorited: newFavoritedValue };
        }
        // Return existing book (React will optimize this)
        return b;
      });
      
      // Save to AsyncStorage
      AsyncStorage.setItem(BOOKS_KEY, JSON.stringify(updatedBooks)).catch(err => {
        console.error('Error saving to AsyncStorage:', err);
      });
      
      const foundBook = updatedBooks.find(b => b.id === id);
      console.log('NotesProvider: Updated local state, book favorited:', foundBook?.favorited, 'Total books:', updatedBooks.length);
      console.log('NotesProvider: All books favorited status:', updatedBooks.map(b => ({ id: b.id, title: b.title, favorited: b.favorited })));
      
      // Force a state update by returning a new array reference
      return [...updatedBooks];
    });
    
    // Then sync to Firebase - get the book from current state
    try {
      // Use functional update to get the latest book state
      setBooks(currentBooks => {
        const book = currentBooks.find(b => b.id === id);
        if (!book) {
          console.error('NotesProvider: Book not found for Firebase sync:', id);
          return currentBooks;
        }
        
        // Sync to Firebase
        const ref = doc(db, 'books', id);
        setDoc(ref, {
          ...book,
          favorited: newFavoritedValue,
          createdAt: book.createdAt ? new Date(book.createdAt) : serverTimestamp(),
        }, { merge: true }).then(() => {
          console.log('NotesProvider: Book favorite toggled and synced to Firebase, favorited:', newFavoritedValue);
          // Clear the tracked local state after successful sync (after a delay to ensure onSnapshot has processed)
          setTimeout(() => {
            localBookStateRef.current.delete(id);
            console.log('NotesProvider: Cleared tracked local state for book:', id);
          }, 2000);
        }).catch((error) => {
          console.error('Error syncing book favorite toggle to Firebase:', error);
        });
        
        return currentBooks;
      });
    } catch (error) {
      console.error('Error setting up Firebase sync:', error);
      // Don't throw - local update is already done
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
      // Use setDoc directly to avoid recursive updateBook call
      const ref = doc(db, 'books', id);
      setDoc(ref, {
        ...updatedBook,
        createdAt: book.createdAt ? new Date(book.createdAt) : serverTimestamp(),
      }, { merge: true }).then(() => {
        console.log('NotesProvider: Book usage tracked and synced to Firebase');
      }).catch((error) => {
        console.error('Error syncing book usage to Firebase:', error);
        // Don't throw - local update is already done
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