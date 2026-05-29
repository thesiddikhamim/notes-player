import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import { Ionicons } from '@expo/vector-icons';
import * as VideoThumbnails from 'expo-video-thumbnails';

const VIDEOS_DIR = FileSystem.documentDirectory + 'videos/';
const THUMB_CONCURRENCY = 3;

// Run an async mapper across items with a concurrency cap. Used to avoid
// overwhelming the native thumbnail decoder when a folder has many videos.
async function mapWithConcurrency(items, mapper, concurrency) {
  const results = new Array(items.length);
  let next = 0;
  const workerCount = Math.min(concurrency, items.length);
  const workers = Array.from({ length: workerCount }, async () => {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      try {
        results[i] = await mapper(items[i], i);
      } catch (e) {
        results[i] = null;
      }
    }
  });
  await Promise.all(workers);
  return results;
}

export default function LibraryScreen({ navigation }) {
  const [folderUri, setFolderUri] = useState(null);
  const [videos, setVideos] = useState([]);
  const loadIdRef = useRef(0); // guards against stale async updates

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
    const myLoadId = ++loadIdRef.current;
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

      // Prune individually-added videos whose underlying file no longer exists
      // (e.g. cache-directory copies from older app versions, or files the user
      // deleted from disk). content:// URIs are kept as-is since SAF presence
      // can't be reliably checked here.
      const validAddedUris = [];
      for (const u of addedUris) {
        if (typeof u !== 'string') continue;
        if (u.startsWith('file://')) {
          try {
            const info = await FileSystem.getInfoAsync(u);
            if (info.exists) validAddedUris.push(u);
          } catch (e) {
            // ignore, drop the URI
          }
        } else {
          validAddedUris.push(u);
        }
      }
      if (validAddedUris.length !== addedUris.length) {
        await AsyncStorage.setItem('added_videos', JSON.stringify(validAddedUris));
        addedUris = validAddedUris;
      }

      const allUrisSet = new Set([...videoUris, ...addedUris]);
      const allUris = Array.from(allUrisSet);

      // Build the list shape immediately without thumbnails so the UI renders
      // right away even when there are many videos.
      let videoData = allUris.map((uri) => {
        const decodedUri = decodeURIComponent(uri);
        const filename = decodedUri.split('/').pop().split(':').pop();
        return {
          id: uri,
          filename: filename.replace(/\.[^/.]+$/, ''),
          originalName: filename,
          uri,
          thumb: null,
          duration: 'Unknown',
        };
      });

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

      if (myLoadId !== loadIdRef.current) return;
      setVideos(videoData);

      // Generate thumbnails progressively with bounded concurrency so the
      // native module isn't flooded when folders contain many videos.
      await mapWithConcurrency(
        videoData,
        async (item) => {
          if (myLoadId !== loadIdRef.current) return null;
          try {
            const { uri: thumbUri } = await VideoThumbnails.getThumbnailAsync(item.uri, { time: 1000 });
            if (myLoadId !== loadIdRef.current) return null;
            setVideos((prev) =>
              prev.map((v) => (v.id === item.id ? { ...v, thumb: thumbUri } : v))
            );
          } catch (e) {
            // leave thumb as null
          }
          return null;
        },
        THUMB_CONCURRENCY
      );
    } catch (e) {
      console.log('Error loading videos', e);
    }
  };

  const selectFolder = async () => {
    if (Platform.OS === 'web') {
      alert('Folder selection is not supported on the web version. Please add individual videos using the + button.');
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
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      // DocumentPicker copies into the cache directory, which Android may wipe
      // at any time (after reboot, low storage, etc). Move each picked file
      // into documentDirectory so it survives across app restarts.
      const dirInfo = await FileSystem.getInfoAsync(VIDEOS_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(VIDEOS_DIR, { intermediates: true });
      }

      const persistedUris = [];
      for (const asset of result.assets) {
        const rawName = asset.name || asset.uri.split('/').pop() || 'video';
        const safeName = rawName.replace(/[^\w.\-]+/g, '_');
        const dest = VIDEOS_DIR + Date.now() + '_' + safeName;
        try {
          await FileSystem.copyAsync({ from: asset.uri, to: dest });
          persistedUris.push(dest);
        } catch (err) {
          console.log('Failed to persist picked video, falling back to cache uri', err);
          persistedUris.push(asset.uri);
        }
      }

      const savedAdded = await AsyncStorage.getItem('added_videos');
      const addedUris = savedAdded ? JSON.parse(savedAdded) : [];
      const combined = Array.from(new Set([...addedUris, ...persistedUris]));
      await AsyncStorage.setItem('added_videos', JSON.stringify(combined));

      loadVideos(folderUri);
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
          </View>
          <TouchableOpacity onLongPress={drag} style={styles.dragHandle}>
            <Ionicons name="menu" size={24} color="#888" />
          </TouchableOpacity>
        </TouchableOpacity>
      </ScaleDecorator>
    );
  };

  return (
    <View style={styles.container}>
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
