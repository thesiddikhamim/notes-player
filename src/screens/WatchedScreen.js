import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';
import * as VideoThumbnails from 'expo-video-thumbnails';

export default function WatchedScreen({ navigation }) {
  const [folderUri, setFolderUri] = useState(null);
  const [videos, setVideos] = useState([]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadFolderAndVideos();
    });
    return unsubscribe;
  }, [navigation]);

  const loadFolderAndVideos = async () => {
    const savedFolder = await AsyncStorage.getItem('video_folder');
    if (savedFolder) {
      setFolderUri(savedFolder);
      loadVideos(savedFolder);
    }
  };

  const loadVideos = async (folder) => {
    try {
      if (Platform.OS === 'web') return; // Folder API doesn't work on Web
      
      let videoFiles = [];
      try {
        if (folder.startsWith('content://')) {
            const files = await FileSystem.StorageAccessFramework.readDirectoryAsync(folder);
            videoFiles = files.filter(f => {
              const dec = decodeURIComponent(f).toLowerCase();
              return dec.endsWith('.mp4') || dec.endsWith('.mov') || dec.endsWith('.mkv') || dec.endsWith('.webm');
            });
        } else {
            const files = await FileSystem.readDirectoryAsync(folder);
            videoFiles = files.filter(f => f.match(/\.(mp4|mov|mkv|webm)$/i));
            videoFiles = videoFiles.map(f => folder + (folder.endsWith('/') ? '' : '/') + f);
        }
      } catch (e) {
        return;
      }
      
      const watchedStr = await AsyncStorage.getItem('watched_videos');
      const watchedIds = watchedStr ? JSON.parse(watchedStr) : [];
      
      // Merge with individual added videos just in case
      const savedAdded = await AsyncStorage.getItem('added_videos');
      let addedUris = savedAdded ? JSON.parse(savedAdded) : [];
      
      const allUrisSet = new Set([...videoFiles, ...addedUris]);
      const allUris = Array.from(allUrisSet);

      const filteredFiles = allUris.filter(f => watchedIds.includes(f));

      let videoData = await Promise.all(filteredFiles.map(async (uri) => {
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
          duration: "--:--"
        };
      }));

      setVideos(videoData);
    } catch (e) {
      console.log('Error loading videos', e);
    }
  };

  const renderItem = ({ item }) => {
    return (
      <TouchableOpacity
        style={styles.videoItem}
        onPress={() => navigation.navigate('Player', { video: item })}
      >
        <View style={styles.thumbnailContainer}>
          <Image source={{ uri: item.thumb }} style={styles.thumbnail} />
          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>{item.duration}</Text>
          </View>
        </View>
        <View style={styles.videoInfo}>
          <Text style={styles.videoTitle} numberOfLines={2}>{item.filename}</Text>
          <Text style={styles.videoSubtitle}>Watched</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (!folderUri) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No video folder selected.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.contentWrapper}>
        <FlatList
          data={videos}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No watched videos yet.</Text>
            </View>
          }
        />
      </View>
    </View>
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
  },
  emptyContainer: {
    padding: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
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
  videoSubtitle: {
    color: '#AAAAAA',
    fontSize: 13,
  },
});