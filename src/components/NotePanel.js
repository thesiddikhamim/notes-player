import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Markdown from 'react-native-markdown-display';

export default function NotePanel({ videoId, currentTime }) {
  const [note, setNote] = useState('');
  const [isPreview, setIsPreview] = useState(false);

  useEffect(() => {
    loadNote();
  }, [videoId]);

  const loadNote = async () => {
    const saved = await AsyncStorage.getItem(`notes_${videoId}`);
    if (saved) setNote(saved);
  };

  const handleNoteChange = (text) => {
    setNote(text);
    saveNote(text);
  };

  const saveNote = async (text) => {
    await AsyncStorage.setItem(`notes_${videoId}`, text);
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
        <TouchableOpacity style={styles.timestampBtn} onPress={insertTimestamp}>
          <Text style={styles.timestampBtnText}>+ Timestamp</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.modeBtn} onPress={() => setIsPreview(!isPreview)}>
          <Text style={styles.modeBtnText}>{isPreview ? 'Edit' : 'Preview'}</Text>
        </TouchableOpacity>
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
    backgroundColor: '#0d0d0d',
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  timestampBtn: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
  },
  timestampBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  modeBtn: {
    backgroundColor: '#333',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
  },
  modeBtnText: {
    color: '#fff',
  },
  editor: {
    flex: 1,
    padding: 15,
    color: '#fff',
    fontSize: 16,
  },
  previewContainer: {
    flex: 1,
    padding: 15,
  }
});

const markdownStyles = {
  body: { color: '#fff' },
  heading1: { color: '#fff', marginTop: 10, marginBottom: 5 },
  heading2: { color: '#fff', marginTop: 10, marginBottom: 5 },
  strong: { color: '#4CAF50', fontWeight: 'bold' },
};
