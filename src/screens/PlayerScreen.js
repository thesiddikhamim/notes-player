import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import VideoPlayer from '../components/VideoPlayer';
import NotePanel from '../components/NotePanel';
import TranscriptionPanel from '../components/TranscriptionPanel';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PlayerScreen({ route, navigation }) {
  const { video } = route.params;
  const [activeTab, setActiveTab] = useState('notes');
  const [currentTime, setCurrentTime] = useState(0);
  const [isWatched, setIsWatched] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    checkIfWatched();
  }, []);

  const checkIfWatched = async () => {
    const watchedStr = await AsyncStorage.getItem('watched_videos');
    if (watchedStr) {
      const watchedArr = JSON.parse(watchedStr);
      setIsWatched(watchedArr.includes(video.id));
    }
  };

  const toggleWatched = async () => {
    const watchedStr = await AsyncStorage.getItem('watched_videos');
    let watchedArr = watchedStr ? JSON.parse(watchedStr) : [];
    
    if (watchedArr.includes(video.id)) {
      watchedArr = watchedArr.filter(id => id !== video.id);
      setIsWatched(false);
    } else {
      watchedArr.push(video.id);
      setIsWatched(true);
    }
    await AsyncStorage.setItem('watched_videos', JSON.stringify(watchedArr));
  };

  const handleSeek = async (time) => {
    if (videoRef.current) {
      await videoRef.current.setPositionAsync(time * 1000);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <VideoPlayer 
        source={video.uri} 
        onGoBack={() => navigation.goBack()} 
        onTimeUpdate={setCurrentTime}
        videoRef={videoRef}
        onEndReached={() => {
          if (!isWatched) toggleWatched();
        }}
      />
      <View style={styles.contentPanel}>
        <View style={styles.headerInfo}>
          <Text style={styles.title} numberOfLines={2}>{video.filename}</Text>
          <Text style={styles.subtitle}>Library • VideoNotePlayer</Text>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity 
            style={styles.actionItem} 
            onPress={() => setActiveTab('notes')}
          >
            <Ionicons name="menu" size={24} color={activeTab === 'notes' ? '#fff' : '#888'} />
            <Text style={[styles.actionText, activeTab === 'notes' && styles.activeActionText]}>Notes</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionItem} 
            onPress={toggleWatched}
          >
            <Ionicons name="checkmark-circle" size={24} color={isWatched ? '#4CAF50' : '#888'} />
            <Text style={[styles.actionText, isWatched && styles.activeActionText]}>Watched</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionItem} 
            onPress={() => setActiveTab('transcript')}
          >
            <Ionicons name="document-text" size={24} color={activeTab === 'transcript' ? '#fff' : '#888'} />
            <Text style={[styles.actionText, activeTab === 'transcript' && styles.activeActionText]}>Transcript</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.panelContent}>
          {activeTab === 'notes' ? (
            <NotePanel videoId={video.id} currentTime={currentTime} />
          ) : (
            <TranscriptionPanel currentTime={currentTime} onSeek={handleSeek} videoId={video.id} />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d0d',
  },
  contentPanel: {
    flex: 1, 
    backgroundColor: '#0a0a0a', // Darker background to match screenshot
  },
  headerInfo: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    color: '#888',
    fontSize: 14,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  actionItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    color: '#888',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  activeActionText: {
    color: '#fff',
  },
  panelContent: {
    flex: 1,
  }
});

