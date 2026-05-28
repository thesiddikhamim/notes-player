import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image } from 'react-native';
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
      let videoFiles = [];
      try {
        const files = await FileSystem.readDirectoryAsync(folder);
        videoFiles = files.filter(f => f.match(/\.(mp4|mov|mkv|webm)$/i));
      } catch (e) {
        return;
      }
      
      const watchedStr = await AsyncStorage.getItem('watched_videos');
      const watchedIds = watchedStr ? JSON.parse(watchedStr) : [];
      
      const filteredFiles = videoFiles.filter(f => watchedIds.includes(f));

      let videoData = await Promise.all(filteredFiles.map(async (filename) => {
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
      <FlatList
        data={videos}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 15 }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No watched videos yet.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#555',
    fontSize: 16,
  },
  videoItem: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'center',
  },
  thumbnailContainer: {
    width: 140,
    height: 80,
    backgroundColor: '#222',
    borderRadius: 8,
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  videoInfo: {
    flex: 1,
    marginLeft: 15,
  },
  videoTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  videoSubtitle: {
    color: '#aaa',
    fontSize: 13,
  },
});