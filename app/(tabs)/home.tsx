import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Pressable,
  ScrollView,
  Alert,
  Modal,
  TextInput,
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome, Feather } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useNotes, Book } from '@/components/NotesProvider';
import { useRouter } from 'expo-router';
import { useAuth } from '@/components/useAuth';
import { getBookIconSource, BOOK_ICONS } from '@/components/BookIcons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HORIZ_CARD_WIDTH = 148;
const HORIZ_CARD_GAP = 14;
const LIST_PAD = 20;

// Material 3 Expressive – bold, colorful, pastel
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
  star: '#E8A83C',
  starOutline: '#B8A078',
  errorContainer: '#FFEBEE',
  onErrorContainer: '#b85757',
  scrim: 'rgba(28, 27, 34, 0.4)',
  // Pastel tints for cards
  tint: ['#F0EBFF', '#E8F8F2', '#FFF0EB', '#E8F0FF', '#f2e6f5', '#f9ead6'],
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

function EmptyState({
  icon,
  message,
  style,
}: {
  icon: 'book-open' | 'book' | 'star';
  message: string;
  style?: object;
}) {
  return (
    <View style={[styles.emptyRoot, style]}>
      <View style={styles.emptyIconWrap}>
        <Feather name={icon} size={40} color={M3.outlineVariant} />
      </View>
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { loading: authLoading } = useAuth();
  const { books, toggleBookFavorite, deleteBook, createBook } = useNotes();
  const router = useRouter();

  const [showBookModal, setShowBookModal] = useState(false);
  const [newBookTitle, setNewBookTitle] = useState('');
  const [selectedIcon, setSelectedIcon] = useState<string>('BookType 1 -Blue.png');

  const recentlyUsed = useMemo(
    () =>
      [...books]
        .sort((a, b) => (b.lastOpened || 0) - (a.lastOpened || 0))
        .slice(0, 8),
    [books]
  );
  const favoritedBooks = useMemo(
    () => books.filter((b) => b.favorited === true),
    [books]
  );
  const allBooks = useMemo(
    () => [...books].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)),
    [books]
  );

  const handleToggleFavorite = (id: string) => toggleBookFavorite(id);

  const handleDelete = (id: string) => {
    if (!id) {
      Alert.alert('Delete Error', 'This book cannot be deleted because it has no ID.');
      return;
    }
    Alert.alert(
      'Delete Book',
      'Are you sure you want to delete this book? This will also delete all its pages.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteBook(id) },
      ]
    );
  };

  const handleOpenBook = (book: Book) => {
    router.push({ pathname: '/(tabs)/notes', params: { bookId: book.id } });
  };

  const handleAddBook = async () => {
    if (!newBookTitle.trim()) {
      Alert.alert('Error', 'Please enter a book title');
      return;
    }
    try {
      await createBook(newBookTitle.trim(), selectedIcon);
      setNewBookTitle('');
      setSelectedIcon('BookType 1 -Blue.png');
      setShowBookModal(false);
      Alert.alert('Success', 'Book created successfully!');
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to create book. Please try again.');
    }
  };

  const getTint = (i: number) => M3.tint[i % M3.tint.length];

  const tabBarClearance = 72;
  const fabBottom = tabBarClearance + insets.bottom;
  const scrollBottom = fabBottom + 56 + 24;

  if (authLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: M3.background }]} edges={['top']}>
        <View style={styles.loadingRoot}>
          <Text style={[styles.loadingText, { color: M3.onSurfaceVariant }]}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: M3.background }]}>
      <SafeAreaView edges={['top']} style={styles.safeTop}>
        {/* M3 Top app bar – elevated, rounded bottom */}
        <View style={styles.appBar}>
          <TouchableOpacity hitSlop={16} style={styles.appBarIcon}>
            <Feather name="menu" size={24} color={M3.onSurface} />
          </TouchableOpacity>
          <View style={styles.appBarCenter}>
            <Image
              source={require('../../assets/images/Scribit Logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <TouchableOpacity
            hitSlop={16}
            onPress={() => router.push('/(tabs)/profile')}
            style={styles.appBarIcon}
          >
            <FontAwesome name="user-circle-o" size={26} color={M3.onSurface} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollBottom }]}
      >
        <Text style={styles.headline}>Your library</Text>

        {/* Recently used – horizontal carousel */}
        <Text style={styles.sectionTitle}>Recently used</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizScrollContent}
          snapToInterval={HORIZ_CARD_WIDTH + HORIZ_CARD_GAP}
          decelerationRate="fast"
        >
          {recentlyUsed.length === 0 ? (
            <View style={[styles.horizCardSlot, { width: SCREEN_WIDTH - LIST_PAD * 2 }]}>
              <EmptyState icon="book-open" message="No recent books" />
            </View>
          ) : (
            recentlyUsed.map((book, idx) => (
              <PressableScale
                key={book.id}
                onPress={() => handleOpenBook(book)}
                style={[styles.horizCardWrap, { marginRight: idx < recentlyUsed.length - 1 ? HORIZ_CARD_GAP : 0 }]}
                contentStyle={[styles.horizCard, { backgroundColor: getTint(idx) }]}
              >
                <Image
                  source={getBookIconSource(book.icon)}
                  style={styles.horizBookIcon}
                  resizeMode="contain"
                />
                <Text style={styles.horizCardTitle} numberOfLines={2}>{book.title}</Text>
                <View style={styles.horizCardActions}>
                  <TouchableOpacity
                    hitSlop={10}
                    onPress={() => handleToggleFavorite(book.id)}
                    style={styles.iconBtn}
                  >
                    <FontAwesome
                      name={book.favorited ? 'star' : 'star-o'}
                      size={18}
                      color={book.favorited ? M3.star : M3.starOutline}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    hitSlop={10}
                    onPress={() => handleDelete(book.id)}
                    style={styles.iconBtn}
                  >
                    <FontAwesome name="trash" size={16} color={M3.onErrorContainer} />
                  </TouchableOpacity>
                </View>
              </PressableScale>
            ))
          )}
        </ScrollView>

        {/* Favourites – list rows */}
        <Text style={[styles.label, { marginTop: 20 }]}></Text>
        <Text style={styles.sectionTitle }>Favourites</Text>
        <View style={styles.listBlock}>
          {favoritedBooks.length === 0 ? (
            <EmptyState icon="star" message="No favourited books" />
          ) : (
            favoritedBooks.map((book, idx) => (
              <PressableScale
                key={book.id}
                onPress={() => handleOpenBook(book)}
                style={styles.listRowWrap}
                contentStyle={[styles.listRow, { backgroundColor: getTint(idx) }]}
              >
                <View style={styles.listRowIconWrap}>
                  <Image
                    source={getBookIconSource(book.icon)}
                    style={styles.listRowIcon}
                    resizeMode="contain"
                  />
                </View>
                <View style={styles.listRowBody}>
                  <Text style={styles.listRowTitle} numberOfLines={1}>{book.title}</Text>
                  <View style={styles.listRowActions}>
                    <TouchableOpacity
                      hitSlop={10}
                      onPress={() => handleToggleFavorite(book.id)}
                      style={styles.iconBtn}
                    >
                      <FontAwesome
                        name={book.favorited ? 'star' : 'star-o'}
                        size={18}
                        color={book.favorited ? M3.star : M3.starOutline}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      hitSlop={10}
                      onPress={() => handleDelete(book.id)}
                      style={styles.iconBtn}
                    >
                      <FontAwesome name="trash" size={16} color={M3.onErrorContainer} />
                    </TouchableOpacity>
                  </View>
                </View>
              </PressableScale>
            ))
          )}
        </View>

        {/* All books – list rows */}
        <Text style={[styles.label, { marginTop: 28 }]}></Text>
        <Text style={styles.sectionTitle}>All books</Text>
        <View style={[styles.listBlock, { marginBottom: 0 }]}>
          {allBooks.length === 0 ? (
            <EmptyState icon="book" message="No books yet" />
          ) : (
            allBooks.map((book, idx) => (
              <PressableScale
                key={book.id}
                onPress={() => handleOpenBook(book)}
                style={styles.listRowWrap}
                contentStyle={[styles.listRow, { backgroundColor: getTint(idx) }]}
              >
                <View style={styles.listRowIconWrap}>
                  <Image
                    source={getBookIconSource(book.icon)}
                    style={styles.listRowIcon}
                    resizeMode="contain"
                  />
                </View>
                <View style={styles.listRowBody}>
                  <Text style={styles.listRowTitle} numberOfLines={1}>{book.title}</Text>
                  <View style={styles.listRowActions}>
                    <TouchableOpacity
                      hitSlop={10}
                      onPress={() => handleToggleFavorite(book.id)}
                      style={styles.iconBtn}
                    >
                      <FontAwesome
                        name={book.favorited ? 'star' : 'star-o'}
                        size={18}
                        color={book.favorited ? M3.star : M3.starOutline}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      hitSlop={10}
                      onPress={() => handleDelete(book.id)}
                      style={styles.iconBtn}
                    >
                      <FontAwesome name="trash" size={16} color={M3.onErrorContainer} />
                    </TouchableOpacity>
                  </View>
                </View>
              </PressableScale>
            ))
          )}
        </View>
      </ScrollView>

      {/* FAB */}
      <PressableScale
        onPress={() => setShowBookModal(true)}
        style={[styles.fab, { bottom: fabBottom }]}
        contentStyle={styles.fabInner}
      >
        <Feather name="plus" size={28} color={M3.onPrimary} />
      </PressableScale>

      {/* Bottom sheet – Add book */}
      <Modal
        visible={showBookModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowBookModal(false)}
      >
        <View style={StyleSheet.absoluteFill}>
          <Pressable
            style={styles.sheetOverlay}
            onPress={() => {
              setShowBookModal(false);
              setNewBookTitle('');
              setSelectedIcon('BookType 1 -Blue.png');
            }}
          />
          <View
            style={[
              styles.sheet,
              { paddingBottom: Math.max(insets.bottom, 20) + 16 },
            ]}
          >
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
            <ScrollView
              style={styles.sheetIconScroll}
              contentContainerStyle={styles.sheetIconGrid}
              showsVerticalScrollIndicator={false}
            >
              {BOOK_ICONS.map((name) => (
                <TouchableOpacity
                  key={name}
                  style={[
                    styles.sheetIconOption,
                    selectedIcon === name && styles.sheetIconSelected,
                  ]}
                  onPress={() => setSelectedIcon(name)}
                  activeOpacity={0.8}
                >
                  <Image
                    source={getBookIconSource(name)}
                    style={styles.sheetIconImg}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.sheetActions}>
              <TouchableOpacity
                onPress={() => {
                  setShowBookModal(false);
                  setNewBookTitle('');
                  setSelectedIcon('BookType 1 -Blue.png');
                }}
                style={styles.sheetCancel}
                activeOpacity={0.7}
              >
                <Text style={styles.sheetCancelText}>Cancel</Text>
              </TouchableOpacity>
              <PressableScale
                onPress={handleAddBook}
                style={styles.sheetAddWrap}
                contentStyle={styles.sheetAdd}
              >
                <Text style={styles.sheetAddText}>Create</Text>
              </PressableScale>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeTop: {
    backgroundColor: 'transparent',
  },
  loadingRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  appBar: {
    marginTop:8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: M3.surfaceContainerHigh,
    borderTopLeftRadius:28,
    borderTopRightRadius:28,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    shadowColor: '#5C4FB8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  appBarIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appBarCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logo: {
    width: 66,
    height: 62,
  },
  appBarTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: M3.onSurface,
    letterSpacing: 0.3,
  },
  scrollContent: {
    paddingHorizontal: LIST_PAD,
    paddingTop: 24,
  },
  headline: {
    fontSize: 28,
    fontWeight: '800',
    color: M3.onSurface,
    letterSpacing: -0.5,
    marginBottom: 24,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: M3.onSurfaceVariant,
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: M3.onSurface,
    marginBottom: 14,
  },
  horizScrollContent: {
    paddingRight: LIST_PAD,
  },
  horizCardSlot: {
    marginRight: 0,
  },
  horizCardWrap: {
    width: HORIZ_CARD_WIDTH,
  },
  horizCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: M3.outline,
    padding: 16,
    minHeight: 200,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  horizBookIcon: {
    width: 88,
    height: 88,
    alignSelf: 'center',
    marginBottom: 10,
  },
  horizCardTitle: {
    fontSize: 17,
    textAlign: 'center',
    fontWeight: '700',
    color: M3.onSurface,
    lineHeight: 20,
    marginBottom: 10,
  },
  horizCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconBtn: {
    padding: 4,
  },
  listBlock: {
    gap: 10,
    marginBottom: 8,
  },
  listRowWrap: {
    width: '100%',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: M3.outline,
    borderRadius: 20,
    padding: 14,
    overflow: 'hidden',
  },
  listRowIconWrap: {
    // width: 56,
    // height: 56,
    // borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.0)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  listRowIcon: {
    width: 74,
    height: 74,
  },
  listRowBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  listRowTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: M3.onSurface,
    flex: 1,
  },
  listRowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  emptyRoot: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: M3.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyText: {
    fontSize: 15,
    color: M3.onSurfaceVariant,
    fontWeight: '500',
  },
  fab: {
    position: 'absolute',
    right: LIST_PAD,
    width: 56,
    height: 56,
    borderRadius: 16,
    shadowColor: M3.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  fabInner: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
    backgroundColor: M3.primary,
    alignItems: 'center',
    justifyContent: 'center',
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
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
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
    borderRadius: 16,
    backgroundColor: M3.surfaceContainerHigh,
    borderWidth: 1.5,
    borderColor: M3.outline,
    paddingHorizontal: 18,
    paddingVertical: 16,
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
});
