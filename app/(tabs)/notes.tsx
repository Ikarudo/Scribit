import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Modal, TextInput, Alert, Pressable, Keyboard } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome, Feather } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useNotes, Book } from '@/components/NotesProvider';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@/components/useAuth';
import { BOOK_ICONS, getBookIconSource } from '@/components/BookIcons';
import TenTapNoteEditor, { type TenTapNoteEditorRef } from '@/components/TenTapNoteEditor';
import { toEditorContent } from '@/components/notesContentUtils';
import {
  NOTE_TEMPLATES,
  type NoteTemplateId,
  buildNoteTemplateHtml,
  defaultTitleForTemplate,
} from '@/components/noteTemplates';

// Material 3 theme – matches home/tasks
const M3 = {
  background: '#f2edf8',
  surface: '#FFFFFF',
  surfaceContainer: '#F8F4FF',
  surfaceContainerHigh: '#F0EBF8',
  surfaceContainerHighest: '#EAE4F5',
  primary: '#7C5DE8',
  primaryContainer: '#E8E0FC',
  onPrimary: '#FFFFFF',
  onSurface: '#1C1B22',
  onSurfaceVariant: '#5C5868',
  outline: '#D4CFE0',
  outlineVariant: '#E6E1ED',
  errorContainer: '#FFEBEE',
  onErrorContainer: '#b85757',
  scrim: 'rgba(28, 27, 34, 0.4)',
};

const springConfig = { damping: 14, stiffness: 380 };

function PressableScale({
  children,
  onPress,
  style,
  contentStyle,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  style?: object;
  contentStyle?: object;
}) {
  const scale = useSharedValue(1);
  const s = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.96, springConfig);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, springConfig);
      }}
      style={style}
    >
      <Animated.View style={[s, contentStyle]}>{children}</Animated.View>
    </Pressable>
  );
}

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
  const [selectedTemplateId, setSelectedTemplateId] = useState<NoteTemplateId>('blank');
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [longPressedPageId, setLongPressedPageId] = useState<string | null>(null);
  const editorRef = useRef<TenTapNoteEditorRef>(null);
  const [showBookDropdown, setShowBookDropdown] = useState(false);
  const [showPageDropdown, setShowPageDropdown] = useState(false);
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [editingBookTitle, setEditingBookTitle] = useState('');
  const insets = useSafeAreaInsets();

  // Get current book and its pages
  const currentBook = books.find((b) => b.id === selectedBookId) || books[0];
  const bookPages = pages.filter((p) => p.bookId === (currentBook?.id || ''));
  const selectedPage = bookPages.find((p) => p.id === selectedPageId) || bookPages[0];

  // Auto-select first page when no selection
  useEffect(() => {
    if (currentBook && bookPages.length > 0 && !selectedPageId) {
      setSelectedPageId(bookPages[0].id);
    }
  }, [currentBook, bookPages, selectedPageId]);

  // Save current page and switch to first page only when switching *books*.
  // Must not depend on selectedPageId — otherwise selecting a different page
  // re-runs this effect and overwrites selection back to first page.
  const prevBookIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!currentBook) return;
    const isBookSwitch = prevBookIdRef.current !== null && prevBookIdRef.current !== currentBook.id;
    prevBookIdRef.current = currentBook.id;

    const pagesForBook = pages.filter((p) => p.bookId === currentBook.id);
    if (pagesForBook.length > 0) {
      if (isBookSwitch && selectedPageId && editorRef.current) {
        const pageIdToSave = selectedPageId;
        const first = pagesForBook[0];
        (async () => {
          try {
            const html = await editorRef.current!.getHTML();
            await updatePage(pageIdToSave, { content: html });
          } catch (e) {
            console.warn('NotesScreen: Failed to save page on book switch', e);
          }
          setSelectedPageId(first.id);
        })();
      } else if (!isBookSwitch) {
        setSelectedPageId(pagesForBook[0].id);
      }
    } else {
      setSelectedPageId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Intentionally only on book change; pages/selectedPageId/updatePage read from closure.
  }, [currentBook?.id]);

  // Handle book selection from router params
  useEffect(() => {
    if (bookIdFromParams && books.length > 0) {
      const bookExists = books.find(b => b.id === bookIdFromParams);
      if (bookExists) {
        setSelectedBookId(bookIdFromParams);
      }
    }
  }, [bookIdFromParams, books]);

  useEffect(() => {
    if (showPageModal) {
      setSelectedTemplateId('blank');
    }
  }, [showPageModal]);

  // Dismiss keyboard when leaving notes tab – prevents keyboard from appearing when tapping tab bar
  useFocusEffect(
    useCallback(() => {
      return () => Keyboard.dismiss();
    }, [])
  );

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
    
    const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const makeUniqueTitle = (base: string) => {
      const existing = bookPages.filter((p) => (p.title || '').startsWith(base));
      if (existing.length === 0) return base;
      const numbers = existing.map((p) => {
        const match = (p.title || '').match(new RegExp(`^${escapeRegExp(base)}(?: (\\d+))?$`));
        return match ? (parseInt(match[1], 10) || 1) : 1;
      });
      const nextNumber = Math.max(...numbers) + 1;
      return `${base} ${nextNumber}`;
    };

    const now = new Date();
    const userTitle = newPageTitle.trim();
    const baseTitle = userTitle || defaultTitleForTemplate(selectedTemplateId, now);
    const finalTitle = userTitle ? userTitle : makeUniqueTitle(baseTitle);
    const content = buildNoteTemplateHtml(selectedTemplateId, now);
    
    try {
      const newId = await createPage({ title: finalTitle, content, pinned: false });
      setNewPageTitle('');
      setShowPageModal(false);
      setSelectedPageId(newId);
      setTimeout(() => editorRef.current?.focus('end'), 150);
    } catch (error) {
      console.error('Error creating page:', error);
      Alert.alert('Error', 'Failed to create page. Please try again.');
    }
  };

  const handleSelectPage = useCallback(async (id: string) => {
    if (id === selectedPageId) return;
    const nextPage = bookPages.find((p) => p.id === id);
    if (!nextPage) return;
    if (selectedPageId && editorRef.current) {
      try {
        const html = await editorRef.current.getHTML();
        await updatePage(selectedPageId, { content: html });
      } catch (e) {
        console.warn('NotesScreen: Failed to save page on switch', e);
      }
    }
    setSelectedPageId(id);
  }, [selectedPageId, bookPages, updatePage]);

  const handleSavePage = useCallback(async () => {
    if (!selectedBookId) {
      Alert.alert('Error', 'Please select a book first');
      return;
    }
    if (!selectedPageId || !selectedPage) {
      Alert.alert('Error', 'Please select a page to save');
      return;
    }
    if (!editorRef.current) return;
    try {
      const html = await editorRef.current.getHTML();
      await updatePage(selectedPage.id, {
        content: html,
        lastOpened: Date.now(),
        openCount: (selectedPage.openCount || 0) + 1,
      });
    } catch (error) {
      console.error('Error saving page:', error);
      Alert.alert('Error', 'Failed to save page. Please try again.');
    }
  }, [selectedBookId, selectedPageId, selectedPage, updatePage]);

  const handleDeletePage = (pageId: string) => {
    setLongPressedPageId(null);
    Alert.alert('Delete Page', 'Are you sure you want to delete this page?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deletePage(pageId);
          if (selectedPageId === pageId) {
            const rest = bookPages.filter((p) => p.id !== pageId);
            setSelectedPageId(rest.length > 0 ? rest[0].id : null);
          }
        },
      },
    ]);
  };

  const handlePageLongPress = (pageId: string) => {
    setLongPressedPageId(pageId);
    // Add a small delay to show visual feedback before showing alert
    setTimeout(() => {
      handleDeletePage(pageId);
    }, 100);
  };

  const handleToggleBookFavorite = (bookId: string) => {
    toggleBookFavorite(bookId);
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

  const handleCloseDropdowns = () => {
    setShowBookDropdown(false);
    setShowPageDropdown(false);
  };

  // UI
  if (authLoading || loading) {
    return (
      <View style={[styles.container, { backgroundColor: M3.background }]}>
        <SafeAreaView style={styles.loadingRoot}>
          <Text style={[styles.loadingText, { color: M3.onSurfaceVariant }]}>Loading...</Text>
        </SafeAreaView>
      </View>
    );
  }

  // Tab bar height (70) + margin (8) + buffer – prevents note editor from extending under tab bar
  const tabBarClearance = 30;

  return (
    <View style={[styles.container, { backgroundColor: M3.background, paddingBottom: insets.bottom + tabBarClearance }]}>
      {/* Compact row: Books dropdown | + Book | Pages dropdown | + Page – no bar, minimal */}
      <SafeAreaView edges={['top']} style={styles.headerRow}>
        <View style={styles.compactRow}>
          {/* Books dropdown */}
          <View style={styles.dropdownWrapper}>
            <TouchableOpacity
              style={styles.compactDropdown}
              onPress={() => {
                setShowPageDropdown(false);
                setShowBookDropdown(!showBookDropdown);
              }}
              activeOpacity={0.8}
            >
              <Image
                source={getBookIconSource(currentBook?.icon)}
                style={styles.compactDropdownIcon}
                resizeMode="contain"
              />
              <Text style={styles.compactDropdownText} numberOfLines={1}>
                {currentBook?.title || 'No Books'}
              </Text>
              <Feather name="chevron-down" size={18} color={M3.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          <PressableScale onPress={() => { handleCloseDropdowns(); setShowBookModal(true); }} style={styles.addBtnWrap} contentStyle={styles.addIconBtn}>
            <Feather name="plus" size={22} color={M3.onPrimary} />
          </PressableScale>

          {/* Pages dropdown */}
          <View style={styles.dropdownWrapper}>
            <TouchableOpacity
              style={styles.compactDropdown}
              onPress={() => {
                setShowBookDropdown(false);
                setShowPageDropdown(!showPageDropdown);
              }}
              activeOpacity={0.8}
            >
              <Feather name="file-text" size={18} color={M3.onSurfaceVariant} />
              <Text style={styles.compactDropdownText} numberOfLines={1}>
                {selectedPage?.title || 'No Pages'}
              </Text>
              <Feather name="chevron-down" size={18} color={M3.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          <PressableScale onPress={() => { handleCloseDropdowns(); setShowPageModal(true); }} style={styles.addBtnWrap} contentStyle={styles.addIconBtn}>
            <Feather name="plus" size={22} color={M3.onPrimary} />
          </PressableScale>
        </View>
      </SafeAreaView>

      {/* Note area – maximized, full width */}
      {bookPages.length > 0 && selectedPage ? (
        <View style={styles.noteArea}>
          <View style={styles.noteAreaHeader}>
            <Text style={styles.noteAreaTitle} numberOfLines={1}>
              {selectedPage.title || 'Untitled'}
            </Text>
            <PressableScale onPress={handleSavePage} style={styles.saveBtnWrap} contentStyle={styles.savePageBtn}>
              <Feather name="save" size={18} color={M3.onPrimary} />
              <Text style={styles.savePageBtnText}>Save</Text>
            </PressableScale>
          </View>
          <TenTapNoteEditor
            ref={editorRef}
            key={selectedPage.id}
            initialContent={toEditorContent(selectedPage.content || '')}
            placeholder="Start typing your note..."
            onContentChange={
              selectedPageId && selectedPage
                ? (html) => updatePage(selectedPage.id, { content: html })
                : undefined
            }
          />
        </View>
      ) : (
        <View style={styles.emptyNoteState}>
          <View style={styles.emptyNoteIconWrap}>
            <Feather name="file-text" size={48} color={M3.outlineVariant} />
          </View>
          <Text style={styles.emptyNoteTitle}>No note selected</Text>
          <Text style={styles.emptyNoteSub}>Select a book and add a page to start writing</Text>
          <PressableScale onPress={() => setShowPageModal(true)} style={styles.emptyAddWrap} contentStyle={styles.emptyAddBtn}>
            <Feather name="plus" size={20} color={M3.onPrimary} />
            <Text style={styles.emptyAddText}>Add page</Text>
          </PressableScale>
        </View>
      )}

      {/* Add Book – bottom sheet */}
      <Modal visible={showBookModal} animationType="slide" transparent onRequestClose={() => setShowBookModal(false)}>
        <View style={StyleSheet.absoluteFill}>
          <Pressable style={styles.sheetOverlay} onPress={() => { setShowBookModal(false); setNewBookTitle(''); setSelectedIcon('BookType 1 -Blue.png'); }} />
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 20) + 16 }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>New book</Text>
            <TextInput
              style={styles.sheetInput}
              value={newBookTitle}
              onChangeText={setNewBookTitle}
              placeholder="Book title"
              placeholderTextColor={M3.onSurfaceVariant}
              autoFocus
            />
            <Text style={styles.sheetLabel}>ICON</Text>
            <ScrollView style={styles.sheetIconScroll} contentContainerStyle={styles.sheetIconGrid} showsVerticalScrollIndicator={false}>
              {BOOK_ICONS.map((name) => (
                <TouchableOpacity
                  key={name}
                  style={[styles.sheetIconOption, selectedIcon === name && styles.sheetIconSelected]}
                  onPress={() => setSelectedIcon(name)}
                  activeOpacity={0.8}
                >
                  <Image source={getBookIconSource(name)} style={styles.sheetIconImg} resizeMode="contain" />
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.sheetActions}>
              <TouchableOpacity onPress={() => { setShowBookModal(false); setSelectedIcon('BookType 1 -Blue.png'); }} style={styles.sheetCancel} activeOpacity={0.7}>
                <Text style={styles.sheetCancelText}>Cancel</Text>
              </TouchableOpacity>
              <PressableScale onPress={handleAddBook} style={styles.sheetAddWrap} contentStyle={styles.sheetAdd}>
                <Text style={styles.sheetAddText}>Create</Text>
              </PressableScale>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Page – bottom sheet */}
      <Modal visible={showPageModal} animationType="slide" transparent onRequestClose={() => setShowPageModal(false)}>
        <View style={StyleSheet.absoluteFill}>
          <Pressable style={styles.sheetOverlay} onPress={() => setShowPageModal(false)} />
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 20) + 16 }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>New page</Text>
            <TextInput
              style={styles.sheetInput}
              value={newPageTitle}
              onChangeText={setNewPageTitle}
              placeholder="Page name (optional — uses date/time if blank)"
              placeholderTextColor={M3.onSurfaceVariant}
            />
            <Text style={styles.sheetLabel}>START WITH</Text>
            <ScrollView style={styles.templateScroll} contentContainerStyle={styles.templateGrid} showsVerticalScrollIndicator={false}>
              {NOTE_TEMPLATES.map((t) => {
                const selected = t.id === selectedTemplateId;
                return (
                  <TouchableOpacity
                    key={t.id}
                    style={[styles.templateCard, selected && styles.templateCardSelected]}
                    onPress={() => setSelectedTemplateId(t.id)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.templateCardHeader}>
                      <Text style={[styles.templateName, selected && styles.templateNameSelected]}>{t.name}</Text>
                      {selected && <View style={styles.templateBadge}><Text style={styles.templateBadgeText}>Selected</Text></View>}
                    </View>
                    <Text style={styles.templateDescription} numberOfLines={2}>{t.description}</Text>
                    {t.sections.length > 0 ? (
                      <View style={styles.templatePillsRow}>
                        {t.sections.slice(0, 4).map((s) => (
                          <View key={s} style={styles.templatePill}><Text style={styles.templatePillText} numberOfLines={1}>{s}</Text></View>
                        ))}
                      </View>
                    ) : (
                      <Text style={styles.templateBlankHint}>Blank page, no structure.</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <View style={styles.sheetActions}>
              <TouchableOpacity onPress={() => setShowPageModal(false)} style={styles.sheetCancel} activeOpacity={0.7}>
                <Text style={styles.sheetCancelText}>Cancel</Text>
              </TouchableOpacity>
              <PressableScale onPress={handleAddPageWithCustomTitle} style={styles.sheetAddWrap} contentStyle={styles.sheetAdd}>
                <Text style={styles.sheetAddText}>{selectedTemplateId === 'blank' ? 'Create' : 'Create from template'}</Text>
              </PressableScale>
            </View>
          </View>
        </View>
      </Modal>

      {/* Book dropdown – Modal so it appears on top */}
      <Modal visible={showBookDropdown} transparent animationType="none" onRequestClose={handleCloseDropdowns}>
        <Pressable style={styles.dropdownModalOverlay} onPress={handleCloseDropdowns}>
          <Pressable style={styles.dropdownModalContent} onPress={() => {}}>
            <ScrollView style={styles.dropdownList} showsVerticalScrollIndicator={false}>
              {books.length === 0 ? (
                <Text style={styles.dropdownEmpty}>No books yet</Text>
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
                          placeholderTextColor={M3.onSurfaceVariant}
                          autoFocus
                        />
                        <TouchableOpacity onPress={handleSaveBookRename} style={styles.bookEditBtn}>
                          <Feather name="check" size={18} color={M3.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleCancelBookRename} style={styles.bookEditBtn}>
                          <Feather name="x" size={18} color={M3.onErrorContainer} />
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
                          <Image source={getBookIconSource(book.icon)} style={styles.dropdownBookIcon} resizeMode="contain" />
                          <Text style={[styles.dropdownBookText, selectedBookId === book.id && styles.selectedBookText]} numberOfLines={1}>
                            {book.title}
                          </Text>
                        </TouchableOpacity>
                        <View style={styles.dropdownBookActions}>
                          <TouchableOpacity onPress={() => handleToggleBookFavorite(book.id)} style={styles.dropdownActionBtn}>
                            <FontAwesome name={book.favorited ? 'star' : 'star-o'} size={18} color={book.favorited ? '#E8A83C' : M3.onSurfaceVariant} />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => handleRenameBook(book)} style={styles.dropdownActionBtn}>
                            <Feather name="edit-2" size={16} color={M3.primary} />
                          </TouchableOpacity>
                          <TouchableOpacity onLongPress={() => handleDeleteBook(book.id)} delayLongPress={500} style={styles.dropdownActionBtn}>
                            <Feather name="trash-2" size={16} color={M3.onErrorContainer} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                ))
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Page dropdown – Modal so it appears on top */}
      <Modal visible={showPageDropdown} transparent animationType="none" onRequestClose={handleCloseDropdowns}>
        <Pressable style={styles.dropdownModalOverlay} onPress={handleCloseDropdowns}>
          <Pressable style={styles.dropdownModalContent} onPress={() => {}}>
            <ScrollView style={styles.dropdownList} showsVerticalScrollIndicator={false}>
              {bookPages.length === 0 ? (
                <Text style={styles.dropdownEmpty}>No pages yet</Text>
              ) : (
                bookPages.map((page) => (
                  <TouchableOpacity
                    key={page.id}
                    style={[styles.dropdownPageItem, selectedPageId === page.id && styles.dropdownPageItemActive]}
                    onPress={() => {
                      handleSelectPage(page.id);
                      setShowPageDropdown(false);
                    }}
                    onLongPress={() => handlePageLongPress(page.id)}
                    delayLongPress={500}
                  >
                    <Text style={[styles.dropdownPageText, selectedPageId === page.id && styles.selectedPageText]} numberOfLines={1}>
                      {page.title || 'Untitled'}
                    </Text>
                    {selectedPageId === page.id && <Feather name="check" size={18} color={M3.primary} />}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const HORIZ_PAD = 12;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    paddingHorizontal: HORIZ_PAD,
    paddingTop: 4,
    paddingBottom: 8,
    backgroundColor: M3.background,
  },
  loadingRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dropdownWrapper: {
    flex: 1,
    position: 'relative',
    minWidth: 0,
  },
  compactDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: M3.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: M3.outline,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
    gap: 8,
  },
  compactDropdownIcon: {
    width: 24,
    height: 24,
  },
  compactDropdownText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: M3.onSurface,
    minWidth: 0,
  },
  addBtnWrap: {
    alignSelf: 'flex-start',
  },
  addIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: M3.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: M3.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  dropdownModalOverlay: {
    flex: 1,
    backgroundColor: M3.scrim,
    paddingTop: 70,
    paddingHorizontal: HORIZ_PAD,
  },
  dropdownModalContent: {
    backgroundColor: M3.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: M3.outline,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
    maxHeight: 320,
    overflow: 'hidden',
  },
  dropdownList: {
    maxHeight: 260,
  },
  dropdownEmpty: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    fontSize: 15,
    color: M3.onSurfaceVariant,
    textAlign: 'center',
  },
  dropdownBookItem: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: M3.outlineVariant,
  },
  dropdownBookRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownBookName: {
    flex: 1,
    marginRight: 12,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  dropdownBookIcon: {
    width: 28,
    height: 28,
    marginRight: 10,
  },
  dropdownBookText: {
    fontSize: 15,
    color: M3.onSurface,
    fontWeight: '500',
    flex: 1,
  },
  selectedBookText: {
    fontWeight: '700',
    color: M3.primary,
  },
  dropdownBookActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dropdownActionBtn: {
    marginLeft: 6,
    padding: 8,
    minWidth: 36,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bookEditInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: M3.outline,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    backgroundColor: M3.surfaceContainerHigh,
    color: M3.onSurface,
    minHeight: 44,
  },
  bookEditBtn: {
    padding: 8,
    minWidth: 36,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownPageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: M3.outlineVariant,
  },
  dropdownPageItemActive: {
    backgroundColor: M3.primaryContainer,
  },
  dropdownPageText: {
    flex: 1,
    fontSize: 15,
    color: M3.onSurface,
    fontWeight: '500',
    marginRight: 8,
  },
  selectedPageText: {
    fontWeight: '700',
    color: M3.primary,
  },
  noteArea: {
    flex: 1,
    backgroundColor: M3.surface,
    marginHorizontal: 0,
    marginTop: 8,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    overflow: 'hidden',
  },
  noteAreaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: M3.outlineVariant,
  },
  noteAreaTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: M3.onSurface,
    flex: 1,
    marginRight: 12,
  },
  saveBtnWrap: {
    alignSelf: 'flex-start',
  },
  savePageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: M3.primary,
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 10,
    shadowColor: M3.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  savePageBtnText: {
    color: M3.onPrimary,
    fontWeight: '700',
    fontSize: 15,
  },
  emptyNoteState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyNoteIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: M3.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyNoteTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: M3.onSurface,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyNoteSub: {
    fontSize: 15,
    color: M3.onSurfaceVariant,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyAddWrap: {
    alignSelf: 'center',
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: M3.primary,
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 14,
    shadowColor: M3.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  emptyAddText: {
    color: M3.onPrimary,
    fontWeight: '700',
    fontSize: 16,
  },
  sheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: M3.scrim,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: M3.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 12,
    maxHeight: '88%',
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: M3.outlineVariant,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: M3.onSurface,
    marginBottom: 20,
    letterSpacing: -0.3,
  },
  sheetInput: {
    borderRadius: 14,
    backgroundColor: M3.surfaceContainerHigh,
    borderWidth: 1.5,
    borderColor: M3.outline,
    paddingHorizontal: 18,
    paddingVertical: 14,
    fontSize: 16,
    color: M3.onSurface,
    marginBottom: 20,
  },
  sheetLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: M3.onSurfaceVariant,
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  sheetIconScroll: {
    maxHeight: 180,
    marginBottom: 20,
  },
  sheetIconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  sheetIconOption: {
    width: 52,
    height: 52,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: M3.outline,
    backgroundColor: M3.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  sheetIconSelected: {
    borderColor: M3.primary,
    backgroundColor: M3.primaryContainer,
  },
  sheetIconImg: {
    width: '100%',
    height: '100%',
  },
  sheetActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
  },
  sheetCancel: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  sheetCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: M3.onSurfaceVariant,
  },
  sheetAddWrap: {
    alignSelf: 'flex-start',
  },
  sheetAdd: {
    backgroundColor: M3.primary,
    borderRadius: 16,
    paddingHorizontal: 28,
    paddingVertical: 14,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: M3.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  sheetAddText: {
    fontSize: 16,
    fontWeight: '700',
    color: M3.onPrimary,
  },
  templateScroll: {
    maxHeight: 260,
    marginBottom: 20,
  },
  templateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  templateCard: {
    width: '48%',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: M3.outline,
    backgroundColor: M3.surfaceContainerHigh,
    padding: 12,
    minHeight: 120,
  },
  templateCardSelected: {
    borderColor: M3.primary,
    backgroundColor: M3.primaryContainer,
  },
  templateCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 6,
  },
  templateName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    color: M3.onSurface,
  },
  templateNameSelected: {
    color: M3.primary,
  },
  templateBadge: {
    backgroundColor: M3.primary,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  templateBadgeText: {
    color: M3.onPrimary,
    fontSize: 11,
    fontWeight: '800',
  },
  templateDescription: {
    fontSize: 12,
    color: M3.onSurfaceVariant,
    marginBottom: 10,
    lineHeight: 16,
  },
  templatePillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  templatePill: {
    backgroundColor: M3.surface,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: M3.outlineVariant,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  templatePillText: {
    fontSize: 11,
    color: M3.onSurfaceVariant,
    fontWeight: '700',
  },
  templateBlankHint: {
    fontSize: 12,
    color: M3.onSurfaceVariant,
    fontWeight: '600',
  },
});