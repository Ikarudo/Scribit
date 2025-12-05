import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome, Feather } from '@expo/vector-icons';
import { useNotes, Book } from '@/components/NotesProvider';
import { useRouter } from 'expo-router';
import { useAuth } from '@/components/useAuth';

export default function HomeScreen() {
  const { user, loading: authLoading } = useAuth();
  const { books, loading, toggleBookFavorite, deleteBook } = useNotes();
  const router = useRouter();

  // Sort and select books for sections
  const recentlyUsed = [...books]
    .sort((a, b) => (b.lastOpened || 0) - (a.lastOpened || 0))
    .slice(0, 5);
  const favoritedBooks = [...books]
    .filter(book => book.favorited)
    .slice(0, 5);
  const allBooks = [...books].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  const handleToggleFavorite = (id: string, favorited: boolean) => {
    toggleBookFavorite(id, !favorited);
  };

  const handleDelete = (id: string) => {
    if (!id) {
      Alert.alert('Delete Error', 'This book cannot be deleted because it has no ID.');
      return;
    }
    Alert.alert('Delete Book', 'Are you sure you want to delete this book? This will also delete all its pages.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteBook(id) },
    ]);
  };

  const handleOpenBook = (book: Book) => {
    // Navigate to notes tab with the book selected
    router.push({
      pathname: '/(tabs)/notes',
      params: { bookId: book.id }
    });
  };

  if (authLoading) {
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
      <View style={styles.headerRow}>
        <TouchableOpacity>
          <Feather name="menu" size={28} color="#222" />
        </TouchableOpacity>
        <Image source={require('../../assets/images/Scribit Logo.png')} style={styles.logo} resizeMode="contain" />
        <TouchableOpacity onPress={() => router.push('/(tabs)/profile')}>
          <FontAwesome name="user-circle-o" size={28} color="#222" />
        </TouchableOpacity>
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.newNoteBtn} onPress={() => router.push('/(tabs)/notes')}>
            <FontAwesome name="plus" size={18} color="#fff" />
            <Text style={styles.newNoteBtnText}>New Book</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.sectionTitle}>Recently Used</Text>
        <View style={styles.notesGrid}>
          {recentlyUsed.length === 0 && <Text style={styles.emptyText}>No recent books.</Text>}
          {recentlyUsed.map((book) => (
            <TouchableOpacity key={book.id} onPress={() => handleOpenBook(book)} style={styles.noteCard}> 
              <Text style={styles.noteTitle} numberOfLines={2}>{book.title}</Text>
              <View style={styles.noteFooter}>
                <TouchableOpacity onPress={() => handleToggleFavorite(book.id, book.favorited || false)} style={{ marginRight: 8 }}>
                  <FontAwesome name={book.favorited ? 'star' : 'star-o'} size={18} color={book.favorited ? '#FFD700' : '#888'} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(book.id)}>
                  <FontAwesome name="trash" size={18} color="#FF7B7B" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.sectionTitle}>Favourites</Text>
        <View style={styles.freqGrid}>
          {favoritedBooks.length === 0 && <Text style={styles.emptyText}>No favourited books.</Text>}
          {favoritedBooks.map((book) => (
            <TouchableOpacity key={book.id} onPress={() => handleOpenBook(book)} style={styles.freqCard}> 
              <Text style={styles.freqTitle} numberOfLines={2}>{book.title}</Text>
              <View style={{ flexDirection: 'row', marginTop: 6 }}>
                <TouchableOpacity onPress={() => handleToggleFavorite(book.id, book.favorited || false)} style={{ marginRight: 12 }}>
                  <FontAwesome name={book.favorited ? 'star' : 'star-o'} size={18} color={book.favorited ? '#FFD700' : '#888'} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(book.id)}>
                  <FontAwesome name="trash" size={18} color="#FF7B7B" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.sectionTitle}>All Books</Text>
        <View style={styles.freqGrid}>
          {allBooks.length === 0 && <Text style={styles.emptyText}>No books yet.</Text>}
          {allBooks.map((book) => (
            <TouchableOpacity key={book.id} onPress={() => handleOpenBook(book)} style={styles.freqCard}> 
              <Text style={styles.freqTitle} numberOfLines={2}>{book.title}</Text>
              <View style={{ flexDirection: 'row', marginTop: 6 }}>
                <TouchableOpacity onPress={() => handleToggleFavorite(book.id, book.favorited || false)} style={{ marginRight: 12 }}>
                  <FontAwesome name={book.favorited ? 'star' : 'star-o'} size={18} color={book.favorited ? '#FFD700' : '#888'} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(book.id)}>
                  <FontAwesome name="trash" size={18} color="#FF7B7B" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    marginBottom: 10,
  },
  logo: {
    width: 70,
    height: 50,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginBottom: 18,
    marginLeft: 20,
    marginTop: 10,
  },
  newNoteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7B61FF',
    borderRadius: 30,
    paddingHorizontal: 22,
    paddingVertical: 12,
    marginRight: 16,
  },
  newNoteBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#222',
    marginLeft: 20,
    marginTop: 18,
    marginBottom: 10,
  },
  notesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  noteCard: {
    width: '47%',
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    minHeight: 120,
    justifyContent: 'space-between',
    backgroundColor: '#F7F8FA',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  noteTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 12,
  },
  noteFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  noteTime: {
    color: '#222',
    fontSize: 14,
  },
  freqGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  freqCard: {
    width: '47%',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    minHeight: 80,
    justifyContent: 'center',
    backgroundColor: '#F7F8FA',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  freqTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 6,
  },
  freqSubtitle: {
    color: '#888',
    fontSize: 14,
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
    width: '100%',
    marginVertical: 20,
  },
}); 