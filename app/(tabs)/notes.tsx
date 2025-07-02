import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome, Feather, MaterialCommunityIcons } from '@expo/vector-icons';

const paperStyles = [
  { label: 'Grid' },
  { label: 'Lined' },
  { label: 'Blank' },
  { label: 'Dotted' },
];

const tools = [
  { label: 'Pen', icon: <Feather name="pen-tool" size={28} color="#fff" />, active: true },
  { label: 'Pencil', icon: <MaterialCommunityIcons name="pencil" size={28} color="#888" /> },
  { label: 'Highlight', icon: <MaterialCommunityIcons name="marker" size={28} color="#888" /> },
  { label: 'Eraser', icon: <MaterialCommunityIcons name="eraser" size={28} color="#888" /> },
  { label: 'Color', icon: <FontAwesome name="paint-brush" size={28} color="#888" /> },
  { label: 'Image', icon: <FontAwesome name="image" size={28} color="#888" /> },
];

export default function NotesScreen() {
  const [selectedPaper, setSelectedPaper] = useState('Grid');
  const [selectedTool, setSelectedTool] = useState('Pen');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity>
          <Feather name="menu" size={28} color="#222" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Math</Text>
        <Image source={require('../../assets/images/Scribit Logo.png')} style={styles.logo} resizeMode="contain" />
        <TouchableOpacity>
          <FontAwesome name="plus" size={28} color="#222" />
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View style={styles.toolbarRow}>
          {tools.map((tool, idx) => (
            <TouchableOpacity
              key={tool.label}
              style={[styles.toolBtn, selectedTool === tool.label && styles.toolBtnActive]}
              onPress={() => setSelectedTool(tool.label)}
            >
              {React.cloneElement(tool.icon, {
                color: selectedTool === tool.label ? '#fff' : '#888',
              })}
              <Text style={[styles.toolLabel, selectedTool === tool.label && { color: '#7B61FF' }]}>{tool.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.noteArea}>
          <Text style={styles.noteTitle}>Class Notes</Text>
        </View>
        <View style={styles.paperStyleSection}>
          <Text style={styles.paperStyleLabel}>Paper Style</Text>
          <View style={styles.paperStyleRow}>
            {paperStyles.map((style) => (
              <TouchableOpacity
                key={style.label}
                style={[styles.paperBtn, selectedPaper === style.label && styles.paperBtnActive]}
                onPress={() => setSelectedPaper(style.label)}
              >
                <Text style={[styles.paperBtnText, selectedPaper === style.label && { color: '#7B61FF' }]}>{style.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
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
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#222',
    flex: 1,
    textAlign: 'left',
    marginLeft: 16,
  },
  logo: {
    width: 60,
    height: 40,
    marginHorizontal: 8,
  },
  toolbarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginBottom: 10,
    marginTop: 4,
  },
  toolBtn: {
    alignItems: 'center',
    marginHorizontal: 4,
    padding: 6,
    borderRadius: 24,
  },
  toolBtnActive: {
    backgroundColor: '#7B61FF',
  },
  toolLabel: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  noteArea: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginHorizontal: 16,
    marginTop: 10,
    minHeight: 320,
    padding: 18,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 1,
  },
  noteTitle: {
    fontSize: 22,
    color: '#3B5EFF',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  paperStyleSection: {
    backgroundColor: '#F7F8FA',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingVertical: 18,
    marginTop: 10,
    paddingHorizontal: 16,
  },
  paperStyleLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 12,
  },
  paperStyleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  paperBtn: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    backgroundColor: '#fff',
    marginRight: 10,
  },
  paperBtnActive: {
    borderColor: '#7B61FF',
  },
  paperBtnText: {
    fontSize: 16,
    color: '#222',
  },
}); 