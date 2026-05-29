import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
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

    return unsubscribe;
  }, [navigation]);

  const loadFolder = async () => {
    const savedFolder = await AsyncStorage.getItem('video_folder');
    if (savedFolder) {
      setFolderUri(savedFolder);
    }
    loadVideos(savedFolder);
  };

  const loadVideos = async (folder) => {
    try {
      let videoUris = [];
      
      if (folder && Platform.OS !== 'web') {
        try {
          if (folder.startsWith('content://')) {
            const files = await FileSystem.StorageAccessFramework.readDirectoryAsync(folder);
            videoUris = files.filter(f => {
              const dec = decodeURIComponent(f).toLowerCase();
              return dec.endsWith('.mp4') || dec.endsWith('.mov') || dec.endsWith('.mkv') || dec.endsWith('.webm');
            });
          } else {
            const files = await FileSystem.readDirectoryAsync(folder);
            const filtered = files.filter(f => f.match(/\.(mp4|mov|mkv|webm)$/i));
            videoUris = filtered.map(f => folder + (folder.endsWith('/') ? '' : '/') + f);
          }
        } catch (e) {
          console.log('Error reading folder', e);
        }
      }
      
      const savedAdded = await AsyncStorage.getItem('added_videos');
      let addedUris = savedAdded ? JSON.parse(savedAdded) : [];
      
      const allUrisSet = new Set([...videoUris, ...addedUris]);
      const allUris = Array.from(allUrisSet);

      let videoData = await Promise.all(allUris.map(async (uri) => {
        let thumb = null;
        try {
          const { uri: thumbUri } = await VideoThumbnails.getThumbnailAsync(uri, { time: 1000 });
          thumb = thumbUri;
        } catch (e) { }

        const decodedUri = decodeURIComponent(uri);
        const filename = decodedUri.split('/').pop().split(':').pop();

        return {
          id: uri,
          filename: filename.replace(/\.[^/.]+$/, ''),
          originalName: filename,
          uri,
          thumb,
          duration: "Unknown"
        };
      }));

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
    if (Platform.OS === 'web') {
      alert("Folder selection is not supported on the web version. Please add individual videos using the + button.");
      return;
    }
    const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
    if (permissions.granted) {
      await AsyncStorage.setItem('video_folder', permissions.directoryUri);
      setFolderUri(permissions.directoryUri);
      loadVideos(permissions.directoryUri);
    }
  };

  const addIndividualVideo = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'video/*',
        multiple: true,
        copyToCacheDirectory: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newUris = result.assets.map(a => a.uri);
        const savedAdded = await AsyncStorage.getItem('added_videos');
        let addedUris = savedAdded ? JSON.parse(savedAdded) : [];
        
        const combined = Array.from(new Set([...addedUris, ...newUris]));
        await AsyncStorage.setItem('added_videos', JSON.stringify(combined));
        
        loadVideos(folderUri);
      }
    } catch (e) {
      console.log('Error adding individual video', e);
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
          style={[styles.videoItem, isActive && { backgroundColor: '#1A1A1A' }]}
          onPress={() => navigation.navigate('Player', { video: item })}
          disabled={isActive}
        >
          <View style={styles.thumbnailContainer}>
            <Image source={{ uri: item.thumb }} style={styles.thumbnail} />
            <View style={styles.durationBadge}>
              <Text style={styles.durationText}>{item.duration}</Text>
            </View>
          </View>
          <View style={styles.videoInfo}>
            <Text style={styles.videoTitle} numberOfLines={2}>{item.filename}</Text>
          </View>
          <TouchableOpacity onLongPress={drag} style={styles.dragHandle}>
            <Ionicons name="menu" size={24} color="#888" />
          </TouchableOpacity>
        </TouchableOpacity>
      </ScaleDecorator>
    );
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.contentWrapper}>
        {videos.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No videos found.</Text>
            <TouchableOpacity style={styles.button} onPress={selectFolder}>
              <Text style={styles.buttonText}>Set Video Folder</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <DraggableFlatList
            data={videos}
            onDragEnd={onDragEnd}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>
      <TouchableOpacity style={styles.fab} onPress={addIndividualVideo}>
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
  },
  contentWrapper: {
    flex: 1,
    width: '100%',
    maxWidth: 800,
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  emptyText: {
    color: '#888',
    marginBottom: 20,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#E63946',
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
    marginBottom: 16,
    alignItems: 'flex-start',
    backgroundColor: '#000000',
  },
  thumbnailContainer: {
    width: 160,
    height: 90,
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.85)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
  },
  durationText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  videoInfo: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
    paddingVertical: 4,
  },
  videoTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 21,
    marginBottom: 6,
  },
  dragHandle: {
    padding: 10,
    justifyContent: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#E63946',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  }
});
