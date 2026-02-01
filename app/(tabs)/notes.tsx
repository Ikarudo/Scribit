import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Modal, TextInput, Alert, Pressable, Keyboard, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome5, Feather } from '@expo/vector-icons';
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

// Authentic Material 3 Light Theme Color Scheme
const M3 = {
  // Surface colors
  background: '#FEF7FF',
  surface: '#FEF7FF',
  surfaceContainerLowest: '#FFFFFF',
  surfaceContainerLow: '#F8F2FA',
  surfaceContainer: '#F2ECF4',
  surfaceContainerHigh: '#ECE6EE',
  surfaceContainerHighest: '#E7E0E8',
  
  // Primary colors
  primary: '#6750A4',
  onPrimary: '#FFFFFF',
  primaryContainer: '#E9DDFF',
  onPrimaryContainer: '#22005D',
  
  // Secondary colors
  secondary: '#625B71',
  onSecondary: '#FFFFFF',
  secondaryContainer: '#E8DEF8',
  onSecondaryContainer: '#1E192B',
  
  // Tertiary colors
  tertiary: '#7E5260',
  onTertiary: '#FFFFFF',
  tertiaryContainer: '#FFD9E3',
  onTertiaryContainer: '#31101D',
  
  // Text colors
  onSurface: '#1D1B20',
  onSurfaceVariant: '#49454E',
  
  // Outline colors
  outline: '#7A757F',
  outlineVariant: '#CAC4CF',
  
  // Error colors
  error: '#BA1A1A',
  onError: '#FFFFFF',
  errorContainer: '#FFDAD6',
  onErrorContainer: '#410002',
  
  // Other
  scrim: 'rgba(0, 0, 0, 0.4)',
  shadow: '#000000',
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

  // Dismiss keyboard when leaving notes tab
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
    
    let finalTitle = '';
    if (!finalTitle) {
      const now = new Date();
      const timestamp = `${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      
      const existingPagesWithTimestamp = bookPages.filter(page => 
        page.title.startsWith(timestamp)
      );
      
      if (existingPagesWithTimestamp.length > 0) {
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

  const tabBarClearance = 50;

  return (
    <View style={[styles.container, { backgroundColor: M3.background, paddingBottom: insets.bottom + tabBarClearance }]}>
      {/* Compact navigation bar - now with chip-style buttons */}
      <SafeAreaView edges={['top']} style={styles.navBar}>
        <View style={styles.navContent}>
          {/* Book selector - now inline chip style */}
          <TouchableOpacity
            style={styles.navChip}
            onPress={() => {
              setShowPageDropdown(false);
              setShowBookDropdown(!showBookDropdown);
            }}
            activeOpacity={0.7}
          >
            <Image
              source={getBookIconSource(currentBook?.icon)}
              style={styles.navChipIcon}
              resizeMode="contain"
            />
            <Text style={styles.navChipText} numberOfLines={1}>
              {currentBook?.title || 'Books'}
            </Text>
            <Feather name="chevron-down" size={16} color={M3.onSurfaceVariant} />
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.navDivider} />

          {/* Page selector - now inline chip style */}
          <TouchableOpacity
            style={[styles.navChip, styles.navChipPage]}
            onPress={() => {
              setShowBookDropdown(false);
              setShowPageDropdown(!showPageDropdown);
            }}
            activeOpacity={0.7}
          >
            <Feather name="file-text" size={16} color={M3.onSurfaceVariant} />
            <Text style={styles.navChipText} numberOfLines={1}>
              {selectedPage?.title || 'Pages'}
            </Text>
            <Feather name="chevron-down" size={16} color={M3.onSurfaceVariant} />
          </TouchableOpacity>

          {/* Action buttons */}
          <View style={styles.navActions}>
            <TouchableOpacity
              style={styles.navIconBtn}
              onPress={() => { handleCloseDropdowns(); setShowPageModal(true); }}
              hitSlop={8}
            >
              <Feather name="file-plus" size={20} color={M3.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.navIconBtn}
              onPress={() => { handleCloseDropdowns(); setShowBookModal(true); }}
              hitSlop={8}
            >
              <Feather name="book" size={20} color={M3.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      {/* Note editor area - maximized */}
      {bookPages.length > 0 && selectedPage ? (
        <View style={styles.editorContainer}>
          {/* Minimal header with save button */}
          <View style={styles.editorHeader}>
            <Text style={styles.editorTitle} numberOfLines={1}>
              {selectedPage.title || 'Untitled'}
            </Text>
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleSavePage}
              hitSlop={8}
            >
              <Feather name="save" size={18} color={M3.primary} />
            </TouchableOpacity>
          </View>
          
          {/* Editor */}
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
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrap}>
            <Feather name="file-text" size={44} color={M3.outline} />
          </View>
          <Text style={styles.emptyTitle}>No page selected</Text>
          <Text style={styles.emptySub}>Create a book and add a page to start</Text>
          <TouchableOpacity
            style={styles.emptyBtn}
            onPress={() => setShowPageModal(true)}
          >
            <Feather name="plus" size={18} color={M3.onPrimary} />
            <Text style={styles.emptyBtnText}>New page</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Book creation modal */}
      <Modal visible={showBookModal} animationType="slide" transparent onRequestClose={() => setShowBookModal(false)}>
        <KeyboardAvoidingView style={StyleSheet.absoluteFill} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
          <Pressable style={styles.modalOverlay} onPress={() => { setShowBookModal(false); setNewBookTitle(''); setSelectedIcon('BookType 1 -Blue.png'); }} />
          <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, 1) + 1 }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>New book</Text>
            <TextInput
              style={styles.modalInput}
              value={newBookTitle}
              onChangeText={setNewBookTitle}
              placeholder="Book title"
              placeholderTextColor={M3.onSurfaceVariant}
              autoFocus
            />
            <Text style={styles.modalLabel}>ICON</Text>
            <ScrollView style={styles.iconScroll} contentContainerStyle={styles.iconGrid} showsVerticalScrollIndicator={false}>
              {BOOK_ICONS.map((name) => (
                <TouchableOpacity
                  key={name}
                  style={[styles.iconOption, selectedIcon === name && styles.iconSelected]}
                  onPress={() => setSelectedIcon(name)}
                  activeOpacity={0.8}
                >
                  <Image source={getBookIconSource(name)} style={styles.iconImg} resizeMode="contain" />
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => { setShowBookModal(false); setSelectedIcon('BookType 1 -Blue.png'); }} style={styles.modalCancel}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAddBook} style={styles.modalCreate}>
                <Text style={styles.modalCreateText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Page creation modal */}
      <Modal visible={showPageModal} animationType="slide" transparent onRequestClose={() => setShowPageModal(false)}>
        <KeyboardAvoidingView style={StyleSheet.absoluteFill} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
          <Pressable style={styles.modalOverlay} onPress={() => setShowPageModal(false)} />
          <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, 20) + 16 }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>New page</Text>
            <TextInput
              style={styles.modalInput}
              value={newPageTitle}
              onChangeText={setNewPageTitle}
              placeholder="Page name (optional)"
              placeholderTextColor={M3.onSurfaceVariant}
            />
            <Text style={styles.modalLabel}>TEMPLATE</Text>
            <ScrollView style={styles.templateScroll} contentContainerStyle={styles.templateGrid} showsVerticalScrollIndicator={false}>
              {NOTE_TEMPLATES.map((t) => {
                const selected = t.id === selectedTemplateId;
                return (
                  <TouchableOpacity
                    key={t.id}
                    style={[styles.templateCard, selected && styles.templateSelected]}
                    onPress={() => setSelectedTemplateId(t.id)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.templateHeader}>
                      <Text style={[styles.templateName, selected && styles.templateNameSelected]}>{t.name}</Text>
                      {selected && <View style={styles.templateBadge}><Text style={styles.templateBadgeText}>✓</Text></View>}
                    </View>
                    <Text style={styles.templateDesc} numberOfLines={2}>{t.description}</Text>
                    {t.sections.length > 0 && (
                      <View style={styles.templateTags}>
                        {t.sections.slice(0, 3).map((s) => (
                          <View key={s} style={styles.templateTag}><Text style={styles.templateTagText} numberOfLines={1}>{s}</Text></View>
                        ))}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setShowPageModal(false)} style={styles.modalCancel}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAddPageWithCustomTitle} style={styles.modalCreate}>
                <Text style={styles.modalCreateText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Book dropdown */}
      <Modal visible={showBookDropdown} transparent animationType="fade" onRequestClose={handleCloseDropdowns}>
        <Pressable style={styles.dropdownOverlay} onPress={handleCloseDropdowns}>
          <Pressable style={styles.dropdownContent} onPress={() => {}}>
            <View style={styles.dropdownHeader}>
              <Text style={styles.dropdownTitle}>Books</Text>
              <TouchableOpacity onPress={handleCloseDropdowns} hitSlop={8}>
                <Feather name="x" size={20} color={M3.onSurfaceVariant} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.dropdownScroll} showsVerticalScrollIndicator={false}>
              {books.length === 0 ? (
                <Text style={styles.dropdownEmpty}>No books yet</Text>
              ) : (
                [...books]
                  .sort((a, b) => (b.lastOpened || b.createdAt || 0) - (a.lastOpened || a.createdAt || 0))
                  .map((book) => (
                  <View key={book.id} style={styles.bookItem}>
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
                          <Feather name="x" size={18} color={M3.error} />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.bookRow}
                        onPress={() => {
                          setSelectedBookId(book.id);
                          setShowBookDropdown(false);
                        }}
                      >
                        <Image source={getBookIconSource(book.icon)} style={styles.bookIcon} resizeMode="contain" />
                        <Text style={[styles.bookText, selectedBookId === book.id && styles.bookTextActive]} numberOfLines={1}>
                          {book.title}
                        </Text>
                        <View style={styles.bookActions}>
                          <TouchableOpacity onPress={() => handleToggleBookFavorite(book.id)} hitSlop={8}>
                            <FontAwesome5 name="star" size={16} color={book.favorited ? '#FFAB00' : M3.outlineVariant} solid={book.favorited} />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => handleRenameBook(book)} hitSlop={8}>
                            <Feather name="edit-2" size={16} color={M3.primary} />
                          </TouchableOpacity>
                          <TouchableOpacity onLongPress={() => handleDeleteBook(book.id)} delayLongPress={500} hitSlop={8}>
                            <Feather name="trash-2" size={16} color={M3.error} />
                          </TouchableOpacity>
                        </View>
                      </TouchableOpacity>
                    )}
                  </View>
                ))
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Page dropdown */}
      <Modal visible={showPageDropdown} transparent animationType="fade" onRequestClose={handleCloseDropdowns}>
        <Pressable style={styles.dropdownOverlay} onPress={handleCloseDropdowns}>
          <Pressable style={styles.dropdownContent} onPress={() => {}}>
            <View style={styles.dropdownHeader}>
              <Text style={styles.dropdownTitle}>Pages</Text>
              <TouchableOpacity onPress={handleCloseDropdowns} hitSlop={8}>
                <Feather name="x" size={20} color={M3.onSurfaceVariant} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.dropdownScroll} showsVerticalScrollIndicator={false}>
              {bookPages.length === 0 ? (
                <Text style={styles.dropdownEmpty}>No pages yet</Text>
              ) : (
                bookPages.map((page) => (
                  <TouchableOpacity
                    key={page.id}
                    style={[styles.pageItem, selectedPageId === page.id && styles.pageItemActive]}
                    onPress={() => {
                      handleSelectPage(page.id);
                      setShowPageDropdown(false);
                    }}
                    onLongPress={() => handlePageLongPress(page.id)}
                    delayLongPress={500}
                  >
                    <Text style={[styles.pageText, selectedPageId === page.id && styles.pageTextActive]} numberOfLines={1}>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 0.15,
  },
  
  // Navigation bar - compact and functional
  navBar: {
    backgroundColor: M3.surfaceContainerLow,
    borderBottomWidth: 0.5,
    borderBottomColor: M3.outlineVariant,
  },
  navContent: {
    marginTop:7,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 8,
  },
  navChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: M3.surfaceContainerHighest,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 4,
    minWidth: 0,
  },
  navChipPage: {
    flex: 1.1,
  },
  navChipIcon: {
    width: 25,
    height: 25,
  },
  navChipText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: M3.onSurface,
    letterSpacing: 0.1,
    minWidth: 0,
  },
  navDivider: {
    width: 1,
    height: 24,
    backgroundColor: M3.outlineVariant,
  },
  navActions: {
    flexDirection: 'row',
    gap: 4,
  },
  navIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: M3.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Editor container - maximized
  editorContainer: {
    flex: 1,
    maxWidth: '98%',
    marginLeft: 3,
    backgroundColor: M3.surface,
  },
  editorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: M3.outlineVariant,
  },
  editorTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: M3.onSurface,
    letterSpacing: 0.15,
    marginRight: 12,
  },
  saveBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: M3.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: M3.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: M3.onSurface,
    marginBottom: 8,
    letterSpacing: 0,
  },
  emptySub: {
    fontSize: 14,
    color: M3.onSurfaceVariant,
    fontWeight: '400',
    textAlign: 'center',
    marginBottom: 24,
    letterSpacing: 0.25,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: M3.primary,
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    shadowColor: M3.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  emptyBtnText: {
    fontSize: 14,
    fontWeight: '500',
    color: M3.onPrimary,
    letterSpacing: 0.1,
  },
  
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: M3.scrim,
  },
  modalSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: M3.surfaceContainerLow,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    shadowColor: M3.shadow,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
    maxHeight: '88%',
  },
  modalHandle: {
    width: 32,
    height: 4,
    borderRadius: 2,
    backgroundColor: M3.onSurfaceVariant,
    opacity: 0.4,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '400',
    color: M3.onSurface,
    marginBottom: 20,
    letterSpacing: 0,
  },
  modalInput: {
    borderRadius: 12,
    backgroundColor: M3.surfaceContainerHighest,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: M3.onSurface,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: M3.outline,
  },
  modalLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: M3.onSurfaceVariant,
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  iconScroll: {
    maxHeight: 180,
    marginBottom: 20,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  iconOption: {
    width: 60,
    height: 60,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: M3.outline,
    backgroundColor: M3.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  iconSelected: {
    borderWidth: 2,
    borderColor: M3.primary,
    backgroundColor: M3.secondaryContainer,
  },
  iconImg: {
    width: '85%',
    height: '85%',
  },
  templateScroll: {
    maxHeight: 280,
    marginBottom: 20,
  },
  templateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  templateCard: {
    width: '48%',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: M3.outline,
    backgroundColor: M3.surfaceContainerHighest,
    padding: 12,
    minHeight: 110,
  },
  templateSelected: {
    borderWidth: 2,
    borderColor: M3.primary,
    backgroundColor: M3.secondaryContainer,
  },
  templateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  templateName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: M3.onSurface,
    letterSpacing: 0.1,
  },
  templateNameSelected: {
    color: M3.primary,
  },
  templateBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: M3.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  templateBadgeText: {
    color: M3.onPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  templateDesc: {
    fontSize: 12,
    color: M3.onSurfaceVariant,
    marginBottom: 8,
    lineHeight: 16,
    letterSpacing: 0.4,
  },
  templateTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  templateTag: {
    backgroundColor: M3.surface,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  templateTagText: {
    fontSize: 10,
    color: M3.onSurfaceVariant,
    fontWeight: '500',
    letterSpacing: 0.4,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
    paddingTop: 1,
  },
  modalCancel: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 20,
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '500',
    color: M3.primary,
    letterSpacing: 0.1,
  },
  modalCreate: {
    backgroundColor: M3.primary,
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 10,
    shadowColor: M3.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  modalCreateText: {
    fontSize: 14,
    fontWeight: '500',
    color: M3.onPrimary,
    letterSpacing: 0.1,
  },
  
  // Dropdowns
  dropdownOverlay: {
    flex: 1,
    backgroundColor: M3.scrim,
    paddingTop: 100,
    paddingHorizontal: 16,
  },
  dropdownContent: {
    backgroundColor: M3.surfaceContainerLow,
    borderRadius: 16,
    shadowColor: M3.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
    maxHeight: 400,
    overflow: 'hidden',
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: M3.outlineVariant,
  },
  dropdownTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: M3.onSurface,
    letterSpacing: 0.15,
  },
  dropdownScroll: {
    maxHeight: 320,
  },
  dropdownEmpty: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    fontSize: 14,
    color: M3.onSurfaceVariant,
    textAlign: 'center',
    letterSpacing: 0.25,
  },
  
  // Book items
  bookItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: M3.outlineVariant,
  },
  bookRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bookIcon: {
    width: 28,
    height: 28,
  },
  bookText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '400',
    color: M3.onSurface,
    letterSpacing: 0.15,
    minWidth: 0,
  },
  bookTextActive: {
    fontWeight: '500',
    color: M3.primary,
  },
  bookActions: {
    flexDirection: 'row',
    gap: 12,
  },
  bookEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bookEditInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: M3.outline,
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    backgroundColor: M3.surfaceContainerHighest,
    color: M3.onSurface,
  },
  bookEditBtn: {
    padding: 8,
  },
  
  // Page items
  pageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: M3.outlineVariant,
  },
  pageItemActive: {
    backgroundColor: M3.secondaryContainer,
  },
  pageText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '400',
    color: M3.onSurface,
    letterSpacing: 0.15,
    marginRight: 8,
  },
  pageTextActive: {
    fontWeight: '500',
    color: M3.primary,
  },
});