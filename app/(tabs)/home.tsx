import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome, Feather } from '@expo/vector-icons';
import { useNotes, Note } from '@/components/NotesProvider';
import NoteEditor from '@/components/NoteEditor';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const { notes, loading, pinNote, deleteNote, createNote, updateNote } = useNotes();
  const [editorVisible, setEditorVisible] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const router = useRouter();

  // Sort and select notes for sections
  const recentlyUsed = [...notes]
    .sort((a, b) => b.lastOpened - a.lastOpened)
    .slice(0, 5);
  const frequentlyUsed = [...notes]
    .sort((a, b) => b.openCount - a.openCount)
    .slice(0, 5);
  const allNotes = [...notes].sort((a, b) => b.createdAt - a.createdAt);

  const handlePin = (id: string, pinned: boolean) => {
    pinNote(id, !pinned);
  };

  const handleDelete = (id: string) => {
    if (!id) {
      Alert.alert('Delete Error', 'This note cannot be deleted because it has no ID.');
      return;
    }
    Alert.alert('Delete Note', 'Are you sure you want to delete this note?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteNote(id) },
    ]);
  };

  const handleOpenEditor = (note?: Note) => {
    setEditingNote(note || null);
    setEditorVisible(true);
  };

  const handleSave = async (data: { title: string; content: string; category: string; pinned: boolean }) => {
    if (editingNote) {
      await updateNote(editingNote.id, {
        ...data,
        lastOpened: Date.now(),
        openCount: (editingNote.openCount || 0) + 1,
      });
    } else {
      await createNote(data);
    }
    setEditorVisible(false);
    setEditingNote(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity>
          <Feather name="menu" size={28} color="#222" />
        </TouchableOpacity>
        <Image source={require('../../assets/images/Scribit Logo.png')} style={styles.logo} resizeMode="contain" />
        <TouchableOpacity>
          <FontAwesome name="user-circle-o" size={28} color="#222" />
        </TouchableOpacity>
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.newNoteBtn} onPress={() => router.push('/(tabs)/notes')}>
            <FontAwesome name="plus" size={18} color="#fff" />
            <Text style={styles.newNoteBtnText}>New Note</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.sectionTitle}>Recently Used</Text>
        <View style={styles.notesGrid}>
          {recentlyUsed.length === 0 && <Text style={styles.emptyText}>No recent notes.</Text>}
          {recentlyUsed.map((note) => (
            <TouchableOpacity key={note.id || note.title} onPress={() => handleOpenEditor(note)} style={[styles.noteCard, { backgroundColor: note.pinned ? '#E6F0FF' : '#FFF' }]}> 
              <Text style={styles.noteTitle}>{note.title}</Text>
              <View style={styles.noteFooter}>
                <FontAwesome name="clock-o" size={16} color="#222" style={{ marginRight: 4 }} />
                <Text style={styles.noteTime}>{new Date(note.lastOpened).toLocaleString()}</Text>
                <TouchableOpacity onPress={() => handlePin(note.id, note.pinned)} style={{ marginLeft: 8 }}>
                  <FontAwesome name={note.pinned ? 'star' : 'star-o'} size={18} color={note.pinned ? '#FFD700' : '#888'} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(note.id)} style={{ marginLeft: 8 }}>
                  <FontAwesome name="trash" size={18} color="#FF7B7B" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.sectionTitle}>Frequently Used</Text>
        <View style={styles.freqGrid}>
          {frequentlyUsed.length === 0 && <Text style={styles.emptyText}>No frequent notes.</Text>}
          {frequentlyUsed.map((note) => (
            <TouchableOpacity key={note.id || note.title} onPress={() => handleOpenEditor(note)} style={[styles.freqCard, { backgroundColor: note.pinned ? '#E6F0FF' : '#FFF' }]}> 
              <Text style={styles.freqTitle}>{note.title}</Text>
              <Text style={styles.freqSubtitle}>Opened {note.openCount} times</Text>
              <View style={{ flexDirection: 'row', marginTop: 6 }}>
                <TouchableOpacity onPress={() => handlePin(note.id, note.pinned)} style={{ marginRight: 12 }}>
                  <FontAwesome name={note.pinned ? 'star' : 'star-o'} size={18} color={note.pinned ? '#FFD700' : '#888'} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(note.id)}>
                  <FontAwesome name="trash" size={18} color="#FF7B7B" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.sectionTitle}>All Notes</Text>
        <View style={styles.freqGrid}>
          {allNotes.length === 0 && <Text style={styles.emptyText}>No notes yet.</Text>}
          {allNotes.map((note) => (
            <TouchableOpacity key={note.id || note.title} onPress={() => handleOpenEditor(note)} style={[styles.freqCard, { backgroundColor: note.pinned ? '#E6F0FF' : '#FFF' }]}> 
              <Text style={styles.freqTitle}>{note.title}</Text>
              <Text style={styles.freqSubtitle}>{note.category}</Text>
              <View style={{ flexDirection: 'row', marginTop: 6 }}>
                <TouchableOpacity onPress={() => handlePin(note.id, note.pinned)} style={{ marginRight: 12 }}>
                  <FontAwesome name={note.pinned ? 'star' : 'star-o'} size={18} color={note.pinned ? '#FFD700' : '#888'} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(note.id)}>
                  <FontAwesome name="trash" size={18} color="#FF7B7B" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
      <NoteEditor
        visible={editorVisible}
        onClose={() => { setEditorVisible(false); setEditingNote(null); }}
        onSave={handleSave}
        initialNote={editingNote ? {
          title: editingNote.title,
          content: editingNote.content,
          category: editingNote.category,
          pinned: editingNote.pinned,
        } : undefined}
      />
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
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
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
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 1,
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