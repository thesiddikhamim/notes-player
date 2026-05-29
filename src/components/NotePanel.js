import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Markdown from 'react-native-markdown-display';

export default function NotePanel({ videoId, currentTime }) {
  const [note, setNote] = useState('');
  const [isPreview, setIsPreview] = useState(false);
  const [saveStatus, setSaveStatus] = useState('Saved ✓');

  useEffect(() => {
    const loadNote = async () => {
      const saved = await AsyncStorage.getItem(`notes_${videoId}`);
      if (saved) setNote(saved);
    };
    loadNote();
  }, [videoId]);

  const handleNoteChange = (text) => {
    setNote(text);
    setSaveStatus('Saving...');
    saveNote(text);
  };

  const saveNote = async (text) => {
    await AsyncStorage.setItem(`notes_${videoId}`, text);
    setTimeout(() => setSaveStatus('Saved ✓'), 600);
  };

  const insertTimestamp = () => {
    const minutes = Math.floor(currentTime / 60);
    const seconds = Math.floor(currentTime % 60).toString().padStart(2, '0');
    const timestampStr = `**[${minutes}:${seconds}]** `;
    
    // We append the timestamp at the end for simplicity, 
    // or ideally at cursor position if we track selection
    const newNote = note + (note.length > 0 && !note.endsWith('\n') ? '\n' : '') + timestampStr;
    handleNoteChange(newNote);
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.toolbar}>
        <View style={styles.leftToolbar}>
          <TouchableOpacity 
            style={[styles.timestampBtn, !isPreview && styles.redModeBtn]} 
            onPress={() => setIsPreview(!isPreview)}
          >
            <Text style={styles.timestampBtnText}>{isPreview ? 'Edit' : 'Edit'}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.modeBtn, isPreview && styles.redModeBtn]} 
            onPress={() => setIsPreview(true)}
          >
            <Text style={styles.modeBtnText}>Preview</Text>
          </TouchableOpacity>
          {!isPreview && (
            <TouchableOpacity style={styles.addTimeBtn} onPress={insertTimestamp}>
              <Text style={styles.addTimeBtnText}>+ Time</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.saveStatus}>{saveStatus}</Text>
      </View>

      {isPreview ? (
        <ScrollView style={styles.previewContainer}>
          <Markdown style={markdownStyles}>{note}</Markdown>
        </ScrollView>
      ) : (
        <TextInput
          style={styles.editor}
          multiline
          value={note}
          onChangeText={handleNoteChange}
          placeholder="Write your notes here..."
          placeholderTextColor="#555"
          textAlignVertical="top"
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  leftToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timestampBtn: {
    backgroundColor: '#333',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginRight: 10,
  },
  redModeBtn: {
    backgroundColor: '#E63946', // Refined brand red
  },
  timestampBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  modeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  modeBtnText: {
    color: '#888',
    fontSize: 13,
  },
  addTimeBtn: {
    marginLeft: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#2A2A2A',
    borderRadius: 4,
  },
  addTimeBtnText: {
    color: '#4DA8DA',
    fontSize: 12,
  },
  saveStatus: {
    color: '#888',
    fontSize: 12,
  },
  editor: {
    flex: 1,
    padding: 15,
    color: '#E0E0E0',
    fontSize: 15,
    lineHeight: 24,
    fontFamily: 'monospace',
    backgroundColor: '#0F0F0F',
  },
  previewContainer: {
    flex: 1,
    padding: 15,
    backgroundColor: '#0F0F0F',
  }
});

const markdownStyles = {
  body: { color: '#E0E0E0', fontSize: 15, lineHeight: 24 },
  heading1: { color: '#FFF', marginTop: 10, marginBottom: 5, fontSize: 24, fontWeight: 'bold' },
  heading2: { color: '#FFF', marginTop: 10, marginBottom: 5, fontSize: 20, fontWeight: 'bold' },
  strong: { color: '#E63946', fontWeight: 'bold' },
  em: { fontStyle: 'italic', color: '#FFF' },
  blockquote: {
    borderLeftWidth: 4,
    borderLeftColor: '#E63946',
    paddingLeft: 10,
    color: '#AAA',
    backgroundColor: '#1A1A1A',
    marginTop: 10,
    marginBottom: 10,
  },
  code_inline: {
    backgroundColor: '#2A2A2A',
    color: '#4DA8DA',
  },
  code_block: {
    backgroundColor: '#1A1A1A',
    color: '#FFF',
    padding: 10,
  }
};
