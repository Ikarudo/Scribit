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
import { FontAwesome5, Feather } from '@expo/vector-icons';
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

// Authentic Material 3 Light Theme Color Scheme
// Based on M3 tonal palette system with proper token naming
const M3 = {
  // Surface colors - from neutral tonal palette
  background: '#FEF7FF',
  surface: '#FEF7FF',             
  surfaceContainerLowest: '#FFFFFF',
  surfaceContainerLow: '#F8F2FA',
  surfaceContainer: '#F2ECF4',     // tone 94
  surfaceContainerHigh: '#ECE6EE',  // tone 92
  surfaceContainerHighest: '#E7E0E8', // tone 90
  
  // Primary colors - purple tonal palette
  primary: '#6750A4',              // primary (tone 40)
  onPrimary: '#FFFFFF',            // on-primary
  primaryContainer: '#E9DDFF',     // primary-container (tone 90)
  onPrimaryContainer: '#22005D',   // on-primary-container (tone 10)
  
  // Secondary colors - purple tonal palette  
  secondary: '#625B71',            // secondary (tone 40)
  onSecondary: '#FFFFFF',
  secondaryContainer: '#E8DEF8',   // secondary-container (tone 90)
  onSecondaryContainer: '#1E192B',
  
  // Tertiary colors - pink tonal palette
  tertiary: '#7E5260',             // tertiary (tone 40)
  onTertiary: '#FFFFFF',
  tertiaryContainer: '#FFD9E3',    // tertiary-container (tone 90)
  onTertiaryContainer: '#31101D',
  
  // Text colors
  onSurface: '#1D1B20',            // on-surface (tone 10)
  onSurfaceVariant: '#49454E',     // on-surface-variant (tone 30)
  
  // Outline colors
  outline: '#7A757F',              // outline (tone 50)
  outlineVariant: '#CAC4CF',       // outline-variant (tone 80)
  
  // Error colors
  error: '#BA1A1A',
  onError: '#FFFFFF',
  errorContainer: '#FFDAD6',
  onErrorContainer: '#410002',
  
  // Inverse colors
  inverseSurface: '#313033',
  inverseOnSurface: '#F5EFF4',
  inversePrimary: '#CFBCFF',
  
  // Other
  scrim: 'rgba(0, 0, 0, 0.4)',
  shadow: '#000000',
  
  // Custom accent colors for cards (using tertiary and secondary tints)
  cardTints: [
    '#F6EDFF',  // primary tint
    '#E8DEF8',  // secondary tint  
    '#FFD9E3',  // tertiary tint
    '#E8F5E9',  // green tint (custom)
    '#FFF8E1',  // amber tint (custom)
    '#E3F2FD',  // blue tint (custom)
  ],
  
  // Star color (amber)
  star: '#FFAB00',
  starOutline: '#9E7900',
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
        <Feather name={icon} size={40} color={M3.outline} />
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
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to create book. Please try again.');
    }
  };

  const getTint = (i: number) => M3.cardTints[i % M3.cardTints.length];

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
        {/* M3 Top app bar */}
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
            <FontAwesome5 name="user-circle" size={26} color={M3.onSurface} />
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
                    <FontAwesome5
                      name="star"
                      solid={book.favorited}
                      size={18}
                      color={book.favorited ? M3.star : M3.outline}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    hitSlop={10}
                    onPress={() => handleDelete(book.id)}
                    style={styles.iconBtn}
                  >
                    <FontAwesome5 name="trash" size={16} color={M3.error} />
                  </TouchableOpacity>
                </View>
              </PressableScale>
            ))
          )}
        </ScrollView>

        {/* Favourites – list rows */}
        <Text style={[styles.sectionTitle, { marginTop: 32 }]}>Favourites</Text>
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
                      <FontAwesome5
                        name="star"
                        solid={book.favorited}
                        size={18}
                        color={book.favorited ? M3.star : M3.outline}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      hitSlop={10}
                      onPress={() => handleDelete(book.id)}
                      style={styles.iconBtn}
                    >
                      <FontAwesome5 name="trash" size={16} color={M3.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              </PressableScale>
            ))
          )}
        </View>

        {/* All books – list rows */}
        <Text style={[styles.sectionTitle, { marginTop: 32 }]}>All books</Text>
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
                      <FontAwesome5
                        name="star"
                        solid={book.favorited}
                        size={18}
                        color={book.favorited ? M3.star : M3.outline}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      hitSlop={10}
                      onPress={() => handleDelete(book.id)}
                      style={styles.iconBtn}
                    >
                      <FontAwesome5 name="trash" size={16} color={M3.error} />
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
    fontWeight: '500',
  },
  appBar: {
    marginHorizontal: 8,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: M3.surface,
    borderRadius: 28,
    shadowColor: M3.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
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
  scrollContent: {
    paddingHorizontal: LIST_PAD,
    paddingTop: 24,
  },
  headline: {
    fontSize: 32,
    fontWeight: '400',
    color: M3.onSurface,
    letterSpacing: 0,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '400',
    color: M3.onSurface,
    marginBottom: 16,
    letterSpacing: 0,
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
    borderRadius: 16,
    padding: 16,
    minHeight: 200,
    justifyContent: 'space-between',
    overflow: 'hidden',
    shadowColor: M3.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  horizBookIcon: {
    width: 88,
    height: 88,
    alignSelf: 'center',
    marginBottom: 10,
  },
  horizCardTitle: {
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
    color: M3.onSurface,
    lineHeight: 20,
    marginBottom: 10,
    letterSpacing: 0.1,
  },
  horizCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  iconBtn: {
    padding: 8,
    borderRadius: 20,
  },
  listBlock: {
    gap: 12,
    marginBottom: 8,
  },
  listRowWrap: {
    width: '100%',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    overflow: 'hidden',
    shadowColor: M3.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  listRowIconWrap: {
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  listRowIcon: {
    width: 64,
    height: 64,
  },
  listRowBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  listRowTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: M3.onSurface,
    flex: 1,
    letterSpacing: 0.1,
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
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: M3.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: M3.onSurfaceVariant,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  fab: {
    position: 'absolute',
    right: LIST_PAD,
    width: 56,
    height: 56,
    borderRadius: 16,
    shadowColor: M3.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
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
  sheetHandle: {
    width: 32,
    height: 4,
    borderRadius: 2,
    backgroundColor: M3.onSurfaceVariant,
    opacity: 0.4,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 24,
    fontWeight: '400',
    color: M3.onSurface,
    marginBottom: 20,
    letterSpacing: 0,
  },
  sheetInput: {
    borderRadius: 12,
    backgroundColor: M3.surfaceContainerHighest,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: M3.onSurface,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: M3.outline,
  },
  sheetLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: M3.onSurfaceVariant,
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  sheetIconScroll: {
    maxHeight: 180,
    marginBottom: 24,
  },
  sheetIconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  sheetIconOption: {
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
  sheetIconSelected: {
    borderWidth: 2,
    borderColor: M3.primary,
    backgroundColor: M3.secondaryContainer,
  },
  sheetIconImg: {
    width: '85%',
    height: '85%',
  },
  sheetActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
    paddingTop: 8,
  },
  sheetCancel: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 20,
  },
  sheetCancelText: {
    fontSize: 14,
    fontWeight: '500',
    color: M3.primary,
    letterSpacing: 0.1,
  },
  sheetAddWrap: {
    alignSelf: 'flex-start',
  },
  sheetAdd: {
    backgroundColor: M3.primary,
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 10,
    minWidth: 90,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: M3.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  sheetAddText: {
    fontSize: 14,
    fontWeight: '500',
    color: M3.onPrimary,
    letterSpacing: 0.1,
  },
});