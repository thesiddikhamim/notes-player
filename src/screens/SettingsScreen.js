import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

export default function SettingsScreen({ navigation }) {
  const [folderUri, setFolderUri] = useState('Not Set');

  useEffect(() => {
    loadFolder();
  }, []);

  const loadFolder = async () => {
    const savedFolder = await AsyncStorage.getItem('video_folder');
    if (savedFolder) {
      setFolderUri(savedFolder);
    }
  };

  const changeFolder = async () => {
    if (Platform.OS === 'web') {
      alert("Folder selection is not available on the web preview.");
      return;
    }
    const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
    if (permissions.granted) {
      await AsyncStorage.setItem('video_folder', permissions.directoryUri);
      await AsyncStorage.removeItem('video_order'); // Reset order
      setFolderUri(permissions.directoryUri);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Video Folder</Text>
        <Text style={styles.pathText}>{decodeURIComponent(folderUri)}</Text>
        <TouchableOpacity style={styles.btn} onPress={changeFolder}>
          <Text style={styles.btnText}>Change Folder</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.aboutText}>VideoNotePlayer</Text>
        <Text style={styles.aboutSubText}>Version 1.0.0</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    padding: 20,
  },
  section: {
    backgroundColor: '#111111',
    padding: 20,
    borderRadius: 8,
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  pathText: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 15,
  },
  btn: {
    backgroundColor: '#333',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  btnText: {
    color: '#fff',
    fontWeight: '500',
  },
  aboutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  aboutSubText: {
    color: '#555',
    marginTop: 5,
  }
});
