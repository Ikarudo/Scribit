import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Modal, TextInput, FlatList, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNotes, Book, Page } from '@/components/NotesProvider';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/components/useAuth';
import { BOOK_ICONS, getBookIconSource } from '@/components/BookIcons';

const paperStyles = [
  { label: 'Grid' },
  { label: 'Lined' },
  { label: 'Blank' },
  { label: 'Dotted' },
];

export default function NotesScreen() {
  const { loading: authLoading } = useAuth();
  const {
    books,
    pages,
    selectedBookId,
    setSelectedBookId,
    createBook,
    createPage,
    updatePage,
    deletePage,
    loading,
    toggleBookFavorite,
    updateBook,
    deleteBook,
    refreshBooksAndPages,
  } = useNotes();

  const router = useRouter();
  const params = useLocalSearchParams();
  const bookIdFromParams = params.bookId as string;

  const [showBookModal, setShowBookModal] = useState(false);
  const [newBookTitle, setNewBookTitle] = useState('');
  const [selectedIcon, setSelectedIcon] = useState<string>('BookType 1 -Blue.png');
  const [showPageModal, setShowPageModal] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState('');
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [pageContent, setPageContent] = useState('');
  const [longPressedPageId, setLongPressedPageId] = useState<string | null>(null);
  const [showBookDropdown, setShowBookDropdown] = useState(false);
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [editingBookTitle, setEditingBookTitle] = useState('');

  // Debug: Log books array
  useEffect(() => {
    console.log('NotesScreen: Books loaded:', books.length, books.map(b => ({ id: b.id, title: b.title })));
  }, [books]);

  // Debug: Log when modal opens
  useEffect(() => {
    if (showBookDropdown) {
      console.log('NotesScreen: Book dropdown opened with', books.length, 'books');
    }
  }, [showBookDropdown, books]);

  // Get current book and its pages
  const currentBook = books.find((b) => b.id === selectedBookId) || books[0];
  const bookPages = pages.filter((p) => p.bookId === (currentBook?.id || ''));
  const selectedPage = bookPages.find((p) => p.id === selectedPageId) || bookPages[0];

  // Auto-select first page when book changes
  useEffect(() => {
    if (currentBook && bookPages.length > 0 && !selectedPageId) {
      setSelectedPageId(bookPages[0].id);
      setPageContent(bookPages[0].content || '');
    }
  }, [currentBook, bookPages, selectedPageId]);

  // Reset selected page when switching books
  useEffect(() => {
    if (currentBook && bookPages.length > 0) {
      setSelectedPageId(bookPages[0].id);
      setPageContent(bookPages[0].content || '');
    } else {
      setSelectedPageId(null);
      setPageContent('');
    }
  }, [currentBook?.id]); // Only trigger when book changes

  // Handle book selection from router params
  useEffect(() => {
    if (bookIdFromParams && books.length > 0) {
      const bookExists = books.find(b => b.id === bookIdFromParams);
      if (bookExists) {
        setSelectedBookId(bookIdFromParams);
      }
    }
  }, [bookIdFromParams, books]);

  // Handlers
  const handleAddBook = async () => {
    if (!newBookTitle.trim()) return;
    await createBook(newBookTitle.trim(), selectedIcon);
    setNewBookTitle('');
    setSelectedIcon('BookType 1 -Blue.png');
    setShowBookModal(false);
  };

  const handleAddPage = async () => {
    if (!selectedBookId) {
      Alert.alert('Error', 'Please select a book first');
      return;
    }
    
    // Use the same logic as custom title - if no title provided, use timestamp
    let finalTitle = '';
    if (!finalTitle) {
      const now = new Date();
      const timestamp = `${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      
      // Check if a page with this timestamp already exists
      const existingPagesWithTimestamp = bookPages.filter(page => 
        page.title.startsWith(timestamp)
      );
      
      if (existingPagesWithTimestamp.length > 0) {
        // Find the highest number suffix
        const numbers = existingPagesWithTimestamp.map(page => {
          const match = page.title.match(new RegExp(`^${timestamp.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?: (\\d+))?$`));
          return match ? (parseInt(match[1]) || 1) : 1;
        });
        const nextNumber = Math.max(...numbers) + 1;
        finalTitle = `${timestamp} ${nextNumber}`;
      } else {
        finalTitle = timestamp;
      }
    }
    
    try {
      await createPage({ title: finalTitle, content: '', pinned: false });
      setNewPageTitle('');
      setShowPageModal(false);
      Alert.alert('Success', 'Page created successfully!');
    } catch (error) {
      console.error('Error creating page:', error);
      Alert.alert('Error', 'Failed to create page. Please try again.');
    }
  };

  const handleAddPageWithCustomTitle = async () => {
    if (!selectedBookId) {
      Alert.alert('Error', 'Please select a book first');
      return;
    }
    
    // If no custom title is provided, use timestamp
    let finalTitle = newPageTitle.trim();
    if (!finalTitle) {
      const now = new Date();
      const timestamp = `${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      
      // Check if a page with this timestamp already exists
      const existingPagesWithTimestamp = bookPages.filter(page => 
        page.title.startsWith(timestamp)
      );
      
      if (existingPagesWithTimestamp.length > 0) {
        // Find the highest number suffix
        const numbers = existingPagesWithTimestamp.map(page => {
          const match = page.title.match(new RegExp(`^${timestamp.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?: (\\d+))?$`));
          return match ? (parseInt(match[1]) || 1) : 1;
        });
        const nextNumber = Math.max(...numbers) + 1;
        finalTitle = `${timestamp} ${nextNumber}`;
      } else {
        finalTitle = timestamp;
      }
    }
    
    try {
      await createPage({ title: finalTitle, content: '', pinned: false });
      setNewPageTitle('');
      setShowPageModal(false);
      Alert.alert('Success', 'Page created successfully!');
    } catch (error) {
      console.error('Error creating page:', error);
      Alert.alert('Error', 'Failed to create page. Please try again.');
    }
  };

  const handleSelectPage = (id: string) => {
    setSelectedPageId(id);
    const page = bookPages.find((p) => p.id === id);
    setPageContent(page?.content || '');
  };

  const handleSavePage = async () => {
    if (!selectedBookId) {
      Alert.alert('Error', 'Please select a book first');
      return;
    }
    if (!selectedPageId) {
      Alert.alert('Error', 'Please select a page to save');
      return;
    }
    if (!selectedPage) {
      Alert.alert('Error', 'Selected page not found');
      return;
    }
    
    try {
      await updatePage(selectedPage.id, { 
        content: pageContent, 
        lastOpened: Date.now(), 
        openCount: (selectedPage.openCount || 0) + 1 
      });
      Alert.alert('Success', 'Page saved successfully!');
    } catch (error) {
      console.error('Error saving page:', error);
      Alert.alert('Error', 'Failed to save page. Please try again.');
    }
  };

  const handleDeletePage = (pageId: string) => {
    setLongPressedPageId(null);
    Alert.alert('Delete Page', 'Are you sure you want to delete this page?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deletePage(pageId) },
    ]);
  };

  const handlePageLongPress = (pageId: string) => {
    setLongPressedPageId(pageId);
    // Add a small delay to show visual feedback before showing alert
    setTimeout(() => {
      handleDeletePage(pageId);
    }, 100);
  };

  const handleToggleBookFavorite = (bookId: string, favorited: boolean) => {
    toggleBookFavorite(bookId, !favorited);
  };

  const handleDeleteBook = (bookId: string) => {
    Alert.alert('Delete Book', 'Are you sure you want to delete this book? This will also delete all its pages.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteBook(bookId) },
    ]);
  };

  const handleRenameBook = (book: Book) => {
    setEditingBookId(book.id);
    setEditingBookTitle(book.title);
  };

  const handleSaveBookRename = async () => {
    if (!editingBookId || !editingBookTitle.trim()) return;
    
    try {
      await updateBook(editingBookId, { title: editingBookTitle.trim() });
      setEditingBookId(null);
      setEditingBookTitle('');
    } catch (error) {
      console.error('Error renaming book:', error);
      Alert.alert('Error', 'Failed to rename book. Please try again.');
    }
  };

  const handleCancelBookRename = () => {
    setEditingBookId(null);
    setEditingBookTitle('');
  };

  const handleRefreshBooks = async () => {
    try {
      await refreshBooksAndPages();
      Alert.alert('Success', 'Books refreshed successfully!');
    } catch (error) {
      console.error('Error refreshing books:', error);
      Alert.alert('Error', 'Failed to refresh books. Please try again.');
    }
  };

  const handleCloseBookDropdown = () => {
    setShowBookDropdown(false);
  };

  // UI
  if (authLoading || loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Touchable area to close dropdown when clicking outside */}
      {showBookDropdown && (
        <TouchableOpacity 
          style={styles.dropdownOverlay} 
          onPress={() => setShowBookDropdown(false)}
          activeOpacity={1}
        />
      )}

      <View style={styles.logoContainer}>
        <Image source={require('../../assets/images/Scribit Logo.png')} style={styles.logo} resizeMode="contain" />
      </View>
      
      {/* Header: Book dropdown, add book, logo */}
      <View style={styles.headerRow}>
        {/* Book Dropdown */}
        <View style={styles.bookDropdownContainer}>
          <TouchableOpacity style={styles.bookDropdown} onPress={() => setShowBookDropdown(!showBookDropdown)}>
            <Text style={styles.headerTitle}>
              {currentBook && currentBook.title ? currentBook.title : 'No Books'}
            </Text>
            <FontAwesome name="caret-down" size={18} color="#222" style={{ marginLeft: 6 }} />
          </TouchableOpacity>
          
          {/* Dropdown Menu */}
          {showBookDropdown && (
            <View style={styles.dropdownMenu}>
              <ScrollView style={styles.dropdownList}>
                {loading ? (
                  <Text style={styles.dropdownItem}>Loading books...</Text>
                ) : books.length === 0 ? (
                  <Text style={styles.dropdownItem}>No books yet.</Text>
                ) : (
                  books.map((book) => (
                    <View key={book.id} style={styles.dropdownBookItem}>
                      {editingBookId === book.id ? (
                        <View style={styles.bookEditRow}>
                          <TextInput
                            style={styles.bookEditInput}
                            value={editingBookTitle}
                            onChangeText={setEditingBookTitle}
                            placeholder="Book Title"
                            autoFocus
                          />
                          <TouchableOpacity onPress={handleSaveBookRename} style={styles.bookEditBtn}>
                            <FontAwesome name="check" size={16} color="#7B61FF" />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={handleCancelBookRename} style={styles.bookEditBtn}>
                            <FontAwesome name="times" size={16} color="#a41010ff" />
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <View style={styles.dropdownBookRow}>
                          <TouchableOpacity 
                            style={styles.dropdownBookName}
                            onPress={() => {
                              setSelectedBookId(book.id);
                              setShowBookDropdown(false);
                            }}
                          >
                            <Image
                              source={getBookIconSource(book.icon)}
                              style={styles.dropdownBookIcon}
                              resizeMode="contain"
                            />
                            <Text style={[
                              styles.dropdownBookText,
                              selectedBookId === book.id && styles.selectedBookText
                            ]}>
                              {book.title}
                            </Text>
                          </TouchableOpacity>
                          <View style={styles.dropdownBookActions}>
                            <TouchableOpacity 
                              onPress={() => handleToggleBookFavorite(book.id, book.favorited || false)}
                              style={styles.dropdownActionBtn}
                            >
                              <FontAwesome 
                                name={book.favorited ? 'star' : 'star-o'} 
                                size={20} 
                                color={book.favorited ? '#FFD700' : '#888'} 
                              />
                            </TouchableOpacity>
                            <TouchableOpacity 
                              onPress={() => handleRenameBook(book)}
                              style={styles.dropdownActionBtn}
                            >
                              <FontAwesome name="pencil" size={18} color="#7B61FF" />
                            </TouchableOpacity>
                            <TouchableOpacity 
                              onLongPress={() => handleDeleteBook(book.id)}
                              delayLongPress={500}
                              style={styles.dropdownActionBtn}
                            >
                              <FontAwesome name="trash" size={18} color="#be1f1fff" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                    </View>
                  ))
                )}
              </ScrollView>
            </View>
          )}
        </View>
        {/* Add Book */}
        <TouchableOpacity onPress={() => setShowBookModal(true)}>
          <FontAwesome name="plus" size={28} color="#222" />
        </TouchableOpacity>
      </View>

      {/* Book Modal for Adding New Books */}
      <Modal visible={showBookModal} animationType="slide" transparent onRequestClose={() => setShowBookModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Book</Text>
            <TextInput
              style={styles.input}
              value={newBookTitle}
              onChangeText={setNewBookTitle}
              placeholder="Book Title"
            />
            
            {/* Icon Selection */}
            <Text style={styles.iconSelectionTitle}>Choose Icon</Text>
            <ScrollView 
              style={styles.iconScrollView}
              contentContainerStyle={styles.iconGrid}
              showsVerticalScrollIndicator={false}
            >
              {BOOK_ICONS.map((iconName) => (
                <TouchableOpacity
                  key={iconName}
                  style={[
                    styles.iconOption,
                    selectedIcon === iconName && styles.iconOptionSelected
                  ]}
                  onPress={() => setSelectedIcon(iconName)}
                >
                  <Image
                    source={getBookIconSource(iconName)}
                    style={styles.iconImage}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 }}>
              <TouchableOpacity onPress={() => {
                setShowBookModal(false);
                setSelectedIcon('BookType 1 -Blue.png');
              }} style={styles.cancelBtn}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAddBook} style={styles.saveBtn}>
                <Text style={styles.saveText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      
      {/* The Toolbar Section (containing the 'A' and 'Image' buttons) was removed from here. */}


      {/* Pages List for Book */}
      <View style={styles.pagesSection}>
        <View style={styles.pagesHeader}>
          <Text style={styles.pagesTitle}>Pages</Text>
          <TouchableOpacity onPress={() => setShowPageModal(true)}>
            <FontAwesome name="plus" size={20} color="#7B61FF" />
          </TouchableOpacity>
        </View>
        {bookPages.length > 0 ? (
          <FlatList
            data={bookPages}
            keyExtractor={p => p.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.pageBtn, 
                  selectedPageId === item.id && styles.pageBtnActive,
                  longPressedPageId === item.id && styles.pageBtnLongPressed
                ]}
                onPress={() => handleSelectPage(item.id)}
                onLongPress={() => handlePageLongPress(item.id)}
                delayLongPress={500}
              >
                <Text style={[styles.pageBtnText, selectedPageId === item.id && { color: '#7B61FF' }]}>
                  {item.title || 'Untitled'}
                </Text>
              </TouchableOpacity>
            )}
          />
        ) : (
          <View style={styles.emptyPagesContainer}>
            <Text style={styles.emptyPagesText}>No pages yet</Text>
            <TouchableOpacity style={styles.quickAddBtn} onPress={handleAddPage}>
              <FontAwesome name="plus" size={16} color="#7B61FF" />
              <Text style={styles.quickAddText}>Add First Page</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      {/* Add Page Modal */}
      <Modal visible={showPageModal} animationType="slide" transparent onRequestClose={() => setShowPageModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Page</Text>
            <TextInput
              style={styles.input}
              value={newPageTitle}
              onChangeText={setNewPageTitle}
              placeholder="Page Title (optional - will use timestamp if blank)"
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 }}>
              <TouchableOpacity onPress={() => setShowPageModal(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAddPageWithCustomTitle} style={styles.saveBtn}>
                <Text style={styles.saveText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Note Area (Text only for now) - Only show if pages exist */}
      {bookPages.length > 0 && selectedPage && (
        <View style={styles.noteArea}>
          <TextInput
            style={styles.noteInput}
            value={pageContent}
            onChangeText={setPageContent}
            placeholder="Start typing your note..."
            multiline
          />
          <TouchableOpacity style={styles.savePageBtn} onPress={handleSavePage}>
            <Text style={styles.savePageBtnText}>Save</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  logoContainer: {
    alignItems: 'center',
    paddingVertical: 0,
    backgroundColor: '#fff',
  },
  logo: {
    width: 115,
    height: 85,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 0,
  },
  bookDropdownContainer: {
    flex: 1,
    marginRight: 12,
    position: 'relative',
  },
  bookDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F7F8FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 52,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
    flex: 1,
  },
  addBookBtn: {
    backgroundColor: '#7B61FF',
    borderRadius: 26,
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7B61FF',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  // Removed toolbarContainer and toolbarRow styles
  // toolBtn and toolBtnActive styles are no longer used for the main screen layout
  toolLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 5,
    fontWeight: '600',
  },
  pagesSection: {
    backgroundColor: '#F7F8FA',
    borderRadius: 16,
    marginHorizontal: 16,
    // CHANGED: Removed extra top margin to bring it right under the books dropdown
    marginTop: 8, 
    padding: 14,
  },
  pagesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 0,
  },
  pagesTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#222',
  },
  addPageBtn: {
    backgroundColor: '#7B61FF',
    borderRadius: 18,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageBtn: {
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginRight: 10,
    backgroundColor: '#fff',
    minHeight: 48,
    justifyContent: 'center',
  },
  pageBtnActive: {
    borderColor: '#7B61FF',
    backgroundColor: '#ffffffff',
    shadowColor: '#7B61FF',
    color: '#ffffffff',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  pageBtnLongPressed: {
    borderColor: '#d00000ff',
    backgroundColor: '#bb0d0dff',
  },
  pageBtnText: {
    fontSize: 15,
    color: '#000000ff',
    fontWeight: '500',
  },
  emptyPagesContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyPagesText: {
    fontSize: 16,
    color: '#888',
    marginBottom: 12,
  },
  quickAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0EDFF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    minHeight: 58,
  },
  quickAddText: {
    fontSize: 15,
    color: '#7B61FF',
    marginLeft: 8,
    fontWeight: '600',
  },
  noteArea: {
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginHorizontal: 16,
    // ADJUSTED: Reduced margin top for tighter spacing
    marginTop: 8, 
    // ADDED: flex: 1 to make the note area fill the remaining space vertically
    flex: 1, 
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 1,
  },
  noteInput: {
    fontSize: 17,
    color: '#222',
    flex: 1,
    textAlignVertical: 'top',
    lineHeight: 24,
  },
  savePageBtn: {
    backgroundColor: '#7B61FF',
    borderRadius: 12,
    alignSelf: 'flex-end',
    marginTop: 12,
    paddingHorizontal: 28,
    paddingVertical: 14,
    minWidth: 100,
    alignItems: 'center',
    shadowColor: '#7B61FF',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  savePageBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 5,
  },
  modalTitle: {
    fontWeight: 'bold',
    fontSize: 20,
    marginBottom: 16,
    color: '#222',
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 8,
    backgroundColor: '#FAFAFA',
    color: '#222',
    minHeight: 52,
  },
  cancelBtn: {
    marginRight: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  cancelText: {
    color: '#888',
    fontSize: 16,
    fontWeight: '500',
  },
  saveBtn: {
    backgroundColor: '#7B61FF',
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 12,
    minWidth: 80,
    alignItems: 'center',
    shadowColor: '#7B61FF',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  saveText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 1000,
    marginTop: 8,
    maxHeight: 320,
  },
  dropdownList: {
    maxHeight: 300,
  },
  dropdownItem: {
    paddingVertical: 18,
    paddingHorizontal: 20,
    fontSize: 17,
    color: '#222',
  },
  dropdownBookItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  dropdownBookRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownBookName: {
    flex: 1,
    marginRight: 12,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dropdownBookIcon: {
    width: 35,
    height: 35,
    marginRight: 10,
  },
  dropdownBookText: {
    fontSize: 17,
    color: '#222',
    fontWeight: '500',
  },
  selectedBookText: {
    fontWeight: 'bold',
    color: '#7B61FF',
  },
  dropdownBookActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dropdownActionBtn: {
    marginLeft: 8,
    padding: 10,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bookEditInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    marginRight: 10,
    backgroundColor: '#FAFAFA',
    color: '#222',
    minHeight: 48,
  },
  bookEditBtn: {
    padding: 10,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 999,
  },
  iconSelectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
    marginTop: 12,
    marginBottom: 12,
  },
  iconScrollView: {
    maxHeight: 180,
    marginBottom: 8,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  iconOption: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    backgroundColor: '#FAFAFA',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 3,
    marginRight: 6,
    marginBottom: 6,
  },
  iconOptionSelected: {
    borderColor: '#7B61FF',
    backgroundColor: '#F0EDFF',
  },
  iconImage: {
    width: '100%',
    height: '100%',
  },
});