import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import * as DocumentPicker from 'expo-document-picker';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as VideoThumbnails from 'expo-video-thumbnails';

export default function LibraryScreen({ navigation }) {
  const [folderUri, setFolderUri] = useState(null);
  const [videos, setVideos] = useState([]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadFolder();
    });

    // Add a settings button to header
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
          <Ionicons name="settings-outline" size={24} color="#fff" style={{ marginRight: 15 }} />
        </TouchableOpacity>
      )
    });

    return unsubscribe;
  }, [navigation]);

  const loadFolder = async () => {
    const savedFolder = await AsyncStorage.getItem('video_folder');
    if (savedFolder) {
      setFolderUri(savedFolder);
      loadVideos(savedFolder);
    }
  };

  const loadVideos = async (folder) => {
    try {
      // Assuming folder is an album ID or actual path, using FileSystem to read
      let videoFiles = [];
      try {
        const files = await FileSystem.readDirectoryAsync(folder);
        videoFiles = files.filter(f => f.match(/\.(mp4|mov|mkv|webm)$/i));
      } catch (e) {
        // Fallback: If folder from MediaLibrary
      }
      
      let videoData = await Promise.all(videoFiles.map(async (filename) => {
        const uri = folder + (folder.endsWith('/') ? '' : '/') + filename;
        let thumb = null;
        try {
          const { uri: thumbUri } = await VideoThumbnails.getThumbnailAsync(uri, { time: 1000 });
          thumb = thumbUri;
        } catch (e) { }

        return {
          id: filename,
          filename: filename.replace(/\.[^/.]+$/, ''),
          originalName: filename,
          uri,
          thumb,
          duration: "Unknown" // We would get this from metadata
        };
      }));

      // Sort by saved order
      const savedOrder = await AsyncStorage.getItem('video_order');
      if (savedOrder) {
        const orderArr = JSON.parse(savedOrder);
        videoData.sort((a, b) => {
          let idxA = orderArr.indexOf(a.id);
          let idxB = orderArr.indexOf(b.id);
          if (idxA === -1) idxA = 9999;
          if (idxB === -1) idxB = 9999;
          return idxA - idxB;
        });
      }

      setVideos(videoData);
    } catch (e) {
      console.log('Error loading videos', e);
    }
  };

  const selectFolder = async () => {
    // This is a naive implementation since real folder picking needs SAF (Storage Access Framework) in RN,
    // which expo-document-picker partially supports or one can use expo-file-system SAF.
    const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
    if (permissions.granted) {
      await AsyncStorage.setItem('video_folder', permissions.directoryUri);
      setFolderUri(permissions.directoryUri);
      loadVideos(permissions.directoryUri);
    }
  };

  const onDragEnd = async ({ data }) => {
    setVideos(data);
    await AsyncStorage.setItem('video_order', JSON.stringify(data.map(d => d.id)));
  };

  const renderItem = ({ item, drag, isActive }) => {
    return (
      <ScaleDecorator>
        <TouchableOpacity
          style={[styles.videoItem, isActive && { backgroundColor: '#2a2a2a' }]}
          onPress={() => navigation.navigate('Player', { video: item })}
          disabled={isActive}
        >
          <Image source={{ uri: item.thumb }} style={styles.thumbnail} />
          <View style={styles.videoInfo}>
            <Text style={styles.videoTitle} numberOfLines={1}>{item.filename}</Text>
            <Text style={styles.videoDuration}>{item.duration}</Text>
          </View>
          <TouchableOpacity onLongPress={drag} style={styles.dragHandle}>
            <Ionicons name="menu" size={24} color="#555" />
          </TouchableOpacity>
        </TouchableOpacity>
      </ScaleDecorator>
    );
  };

  if (!folderUri) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No video folder selected.</Text>
        <TouchableOpacity style={styles.button} onPress={selectFolder}>
          <Text style={styles.buttonText}>Set Video Folder</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <DraggableFlatList
        data={videos}
        onDragEnd={onDragEnd}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 15 }}
      />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d0d',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0d0d0d',
  },
  emptyText: {
    color: '#555',
    marginBottom: 20,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  videoItem: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    marginBottom: 10,
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  thumbnail: {
    width: 80,
    height: 45,
    backgroundColor: '#333',
    borderRadius: 4,
  },
  videoInfo: {
    flex: 1,
    marginLeft: 15,
  },
  videoTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  videoDuration: {
    color: '#555',
    fontSize: 12,
    marginTop: 4,
  },
  dragHandle: {
    padding: 10,
  }
});
