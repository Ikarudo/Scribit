import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, Switch } from 'react-native';

const categories = ['General', 'School', 'Personal', 'Work'];

export default function NoteEditor({
  visible,
  onClose,
  onSave,
  initialNote,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (note: { title: string; content: string; category: string; pinned: boolean }) => void;
  initialNote?: { title: string; content: string; category: string; pinned: boolean };
}) {
  const [title, setTitle] = useState(initialNote?.title || '');
  const [content, setContent] = useState(initialNote?.content || '');
  const [category, setCategory] = useState(initialNote?.category || 'General');
  const [pinned, setPinned] = useState(initialNote?.pinned || false);

  useEffect(() => {
    setTitle(initialNote?.title || '');
    setContent(initialNote?.content || '');
    setCategory(initialNote?.category || 'General');
    setPinned(initialNote?.pinned || false);
  }, [initialNote, visible]);

  const handleSave = () => {
    if (!title.trim()) return;
    onSave({ title, content, category, pinned });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Enter note title"
          />
          <Text style={styles.label}>Content</Text>
          <TextInput
            style={[styles.input, { height: 80 }]}
            value={content}
            onChangeText={setContent}
            placeholder="Enter note content"
            multiline
          />
          <Text style={styles.label}>Category</Text>
          <View style={styles.categoryRow}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryBtn, category === cat && styles.categoryBtnActive]}
                onPress={() => setCategory(cat)}
              >
                <Text style={[styles.categoryText, category === cat && { color: '#7B61FF' }]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.pinRow}>
            <Text style={styles.label}>Pin Note</Text>
            <Switch value={pinned} onValueChange={setPinned} />
          </View>
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={!title.trim()}>
              <Text style={styles.saveText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
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
  label: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 6,
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
  categoryRow: {
    flexDirection: 'row',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  categoryBtn: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginRight: 8,
    marginBottom: 6,
    backgroundColor: '#fff',
  },
  categoryBtnActive: {
    borderColor: '#7B61FF',
    backgroundColor: '#F0EDFF',
  },
  categoryText: {
    fontSize: 15,
    color: '#222',
  },
  pinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    justifyContent: 'space-between',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
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
}); 