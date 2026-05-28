import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Markdown from 'react-native-markdown-display';

export default function NotePanel({ videoId, currentTime }) {
  const [note, setNote] = useState('');
  const [isPreview, setIsPreview] = useState(false);
  const [saveStatus, setSaveStatus] = useState('Saved ✓');

  useEffect(() => {
    loadNote();
  }, [videoId]);

  const loadNote = async () => {
    const saved = await AsyncStorage.getItem(`notes_${videoId}`);
    if (saved) setNote(saved);
  };

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
    backgroundColor: '#f44336', // the red edit button from screenshot
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
    backgroundColor: '#333',
    borderRadius: 4,
  },
  addTimeBtnText: {
    color: '#aaa',
    fontSize: 12,
  },
  saveStatus: {
    color: '#4CAF50',
    fontSize: 12,
  },
  editor: {
    flex: 1,
    padding: 15,
    color: '#fff',
    fontSize: 15,
    lineHeight: 24,
    fontFamily: 'monospace',
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
