import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';
import * as VideoThumbnails from 'expo-video-thumbnails';

const THUMB_CONCURRENCY = 3;

async function mapWithConcurrency(items, mapper, concurrency) {
  let next = 0;
  const workerCount = Math.min(concurrency, items.length);
  const workers = Array.from({ length: workerCount }, async () => {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      try {
        await mapper(items[i], i);
      } catch (e) {
        // swallow per-item errors
      }
    }
  });
  await Promise.all(workers);
}

export default function WatchedScreen({ navigation }) {
  const [folderUri, setFolderUri] = useState(null);
  const [hasContent, setHasContent] = useState(false);
  const [videos, setVideos] = useState([]);
  const loadIdRef = useRef(0);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadFolderAndVideos();
    });
    return unsubscribe;
  }, [navigation]);

  const loadFolderAndVideos = async () => {
    const savedFolder = await AsyncStorage.getItem('video_folder');
    const savedAdded = await AsyncStorage.getItem('added_videos');
    setFolderUri(savedFolder);
    setHasContent(Boolean(savedFolder) || (savedAdded && JSON.parse(savedAdded).length > 0));
    loadVideos(savedFolder);
  };

  const loadVideos = async (folder) => {
    const myLoadId = ++loadIdRef.current;
    try {
      if (Platform.OS === 'web') return;

      let videoFiles = [];
      if (folder) {
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
          // ignore folder read errors; we'll still show added videos
        }
      }

      const watchedStr = await AsyncStorage.getItem('watched_videos');
      const watchedIds = watchedStr ? JSON.parse(watchedStr) : [];

      const savedAdded = await AsyncStorage.getItem('added_videos');
      const addedUris = savedAdded ? JSON.parse(savedAdded) : [];

      const allUris = Array.from(new Set([...videoFiles, ...addedUris]));
      const filteredFiles = allUris.filter(f => watchedIds.includes(f));

      const videoData = filteredFiles.map((uri) => {
        const decodedUri = decodeURIComponent(uri);
        const filename = decodedUri.split('/').pop().split(':').pop();
        return {
          id: uri,
          filename: filename.replace(/\.[^/.]+$/, ''),
          originalName: filename,
          uri,
          thumb: null,
          duration: '--:--',
        };
      });

      if (myLoadId !== loadIdRef.current) return;
      setVideos(videoData);

      await mapWithConcurrency(
        videoData,
        async (item) => {
          if (myLoadId !== loadIdRef.current) return;
          try {
            const { uri: thumbUri } = await VideoThumbnails.getThumbnailAsync(item.uri, { time: 1000 });
            if (myLoadId !== loadIdRef.current) return;
            setVideos((prev) =>
              prev.map((v) => (v.id === item.id ? { ...v, thumb: thumbUri } : v))
            );
          } catch (e) {
            // leave thumb null
          }
        },
        THUMB_CONCURRENCY
      );
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
          {item.thumb ? (
            <Image source={{ uri: item.thumb }} style={styles.thumbnail} />
          ) : (
            <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
              <Ionicons name="film-outline" size={28} color="#444" />
            </View>
          )}
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

  if (!hasContent) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No videos selected yet.</Text>
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
  thumbnailPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
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
