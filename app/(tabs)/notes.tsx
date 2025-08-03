import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Modal, TextInput, FlatList, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNotes, Book, Page } from '@/components/NotesProvider';
import { useRouter, useLocalSearchParams } from 'expo-router';

const paperStyles = [
  { label: 'Grid' },
  { label: 'Lined' },
  { label: 'Blank' },
  { label: 'Dotted' },
];

export default function NotesScreen() {
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
    await createBook(newBookTitle.trim());
    setNewBookTitle('');
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
                            <FontAwesome name="times" size={16} color="#FF6B6B" />
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
                              <FontAwesome name="trash" size={18} color="#FF6B6B" />
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
        <Image source={require('../../assets/images/Scribit Logo.png')} style={styles.logo} resizeMode="contain" />
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
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 }}>
              <TouchableOpacity onPress={() => setShowBookModal(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAddBook} style={styles.saveBtn}>
                <Text style={styles.saveText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      
      {/* Toolbar */}
      <ScrollView horizontal contentContainerStyle={styles.toolbarRow} showsHorizontalScrollIndicator={false}>
        <TouchableOpacity style={[styles.toolBtn, styles.toolBtnActive]}> {/* Text is default and active */}
          <FontAwesome name="font" size={28} color="#fff" />
          <Text style={[styles.toolLabel, { color: '#7B61FF' }]}>Text</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolBtn}>
          <FontAwesome name="image" size={28} color="#888" />
          <Text style={styles.toolLabel}>Image</Text>
        </TouchableOpacity>
      </ScrollView>


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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    marginBottom: 8,
  },
  bookDropdownContainer: {
    flex: 1,
    marginHorizontal: 8,
    marginLeft: 0, // Remove left margin since burger menu is gone
    position: 'relative', // Add relative positioning for dropdown
  },
  bookDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F8FA',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222',
  },
  logo: {
    width: 50,
    height: 32,
    marginHorizontal: 8,
  },
  toolbarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    marginBottom: 8,
    marginTop: 2,
  },
  toolBtn: {
    alignItems: 'center',
    marginHorizontal: 4,
    padding: 6,
    borderRadius: 24,
    opacity: 0.7,
  },
  toolBtnActive: {
    backgroundColor: '#7B61FF',
    opacity: 1,
  },
  toolLabel: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  pagesSection: {
    backgroundColor: '#F7F8FA',
    borderRadius: 12,
    margin: 12,
    padding: 10,
    marginTop: 8,
  },
  pagesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  pagesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222',
  },
  pageBtn: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    backgroundColor: '#fff',
  },
  pageBtnActive: {
    borderColor: '#7B61FF',
    backgroundColor: '#F0EDFF',
  },
  pageBtnLongPressed: {
    borderColor: '#FF6B6B', // Red border for long press
    backgroundColor: '#FFE0E0', // Light red background for long press
  },
  pageBtnText: {
    fontSize: 15,
    color: '#222',
  },
  emptyPagesContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyPagesText: {
    fontSize: 18,
    color: '#888',
    marginBottom: 10,
  },
  quickAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0E0E0',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  quickAddText: {
    fontSize: 16,
    color: '#7B61FF',
    marginLeft: 8,
  },
  noteArea: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginHorizontal: 16,
    marginTop: 8,
    minHeight: 220,
    padding: 18,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 1,
  },
  noteInput: {
    fontSize: 17,
    color: '#222',
    minHeight: 120,
    textAlignVertical: 'top',
  },
  savePageBtn: {
    backgroundColor: '#7B61FF',
    borderRadius: 8,
    alignSelf: 'flex-end',
    marginTop: 12,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  savePageBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 4,
  },
  modalTitle: {
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 12,
    color: '#222',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    padding: 10,
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: '#FAFAFA',
    color: '#222',
  },
  cancelBtn: {
    marginRight: 18,
  },
  cancelText: {
    color: '#888',
    fontSize: 16,
  },
  saveBtn: {
    backgroundColor: '#7B61FF',
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  saveText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  bookManagementContent: {
    width: '90%',
    maxHeight: '80%',
  },
  bookManagementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  refreshBtn: {
    marginRight: 10,
  },
  bookList: {
    flex: 1,
  },
  bookItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  bookRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flex: 1,
  },
  bookNameContainer: {
    flex: 1,
    marginRight: 10,
  },
  bookName: {
    fontSize: 16,
    color: '#222',
  },
  selectedBookName: {
    fontWeight: 'bold',
    color: '#7B61FF',
  },
  bookActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bookActionBtn: {
    marginLeft: 15,
  },
  bookEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  bookEditInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    marginRight: 10,
    backgroundColor: '#FAFAFA',
    color: '#222',
  },
  bookEditBtn: {
    padding: 5,
  },
  emptyText: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    paddingVertical: 20,
  },
  debugText: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    marginTop: 10,
  },
  dropdownMenu: {
    position: 'absolute',
    top: '100%', // Position below the dropdown button
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 1000, // Ensure it's above other content
    marginTop: 4, // Add some spacing from the button
    maxHeight: 300, // Increased height for better visibility
  },
  dropdownList: {
    maxHeight: 280, // Increased height for better visibility
  },
  dropdownItem: {
    paddingVertical: 16, // Increased padding for better touch targets
    paddingHorizontal: 20, // Increased padding for better touch targets
    fontSize: 18, // Increased font size for better readability
    color: '#222',
  },
  dropdownBookItem: {
    paddingVertical: 16, // Increased padding for better touch targets
    paddingHorizontal: 20, // Increased padding for better touch targets
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  dropdownBookRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownBookName: {
    flex: 1,
    marginRight: 15, // Increased margin for better spacing
  },
  dropdownBookText: {
    fontSize: 18, // Increased font size for better readability
    color: '#222',
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
    marginLeft: 15, // Increased margin for better touch targets
    padding: 8, // Added padding for better touch targets
  },
  dropdownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 9, // Ensure it's below the dropdown but above other content
  },
});