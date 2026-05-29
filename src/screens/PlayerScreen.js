import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, } from 'react-native';
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

  useEffect(() => { const checkIfWatched = async () => { const watchedStr = await AsyncStorage.getItem('watched_videos'); if (watchedStr) { const watchedArr = JSON.parse(watchedStr); setIsWatched(watchedArr.includes(video.id)); } }; checkIfWatched(); }, [video.id]);


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
      <View style={styles.playerWrapper}>
        <VideoPlayer 
          source={video.uri} 
          onGoBack={() => navigation.goBack()} 
          onTimeUpdate={setCurrentTime}
          videoRef={videoRef}
          onEndReached={() => {
            if (!isWatched) toggleWatched();
          }}
        />
      </View>
      <View style={styles.contentPanel}>
        <View style={styles.headerInfo}>
          <Text style={styles.title} numberOfLines={2}>{video.filename}</Text>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity 
            style={styles.actionItem} 
            onPress={() => setActiveTab('notes')}
          >
            <Ionicons name="create-outline" size={24} color={activeTab === 'notes' ? '#FFF' : '#E63946'} />
            <Text style={[styles.actionText, activeTab === 'notes' ? styles.activeActionText : { color: '#E63946' }]}>Notes</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionItem} 
            onPress={toggleWatched}
          >
            <Ionicons name={isWatched ? "refresh" : "checkmark-circle-outline"} size={24} color={isWatched ? '#4DA8DA' : '#888'} />
            <Text style={[styles.actionText, isWatched ? { color: '#4DA8DA' } : null]}>{isWatched ? 'Unwatch' : 'Watched'}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionItem} 
            onPress={() => setActiveTab('transcript')}
          >
            <Ionicons name="document-text-outline" size={24} color={activeTab === 'transcript' ? '#FFF' : '#888'} />
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
    backgroundColor: '#000000',
  },
  playerWrapper: {
    width: '100%',
    aspectRatio: 16 / 9,
    maxWidth: 800,
    alignSelf: 'center',
    backgroundColor: '#000',
  },
  contentPanel: {
    flex: 1, 
    backgroundColor: '#0F0F0F',
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
  },
  headerInfo: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
    backgroundColor: '#0F0F0F',
  },
  title: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  subtitle: {
    color: '#AAAAAA',
    fontSize: 13,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
    backgroundColor: '#1A1A1A',
  },
  actionItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  actionText: {
    color: '#888',
    fontSize: 12,
    marginTop: 6,
    fontWeight: '600',
  },
  activeActionText: {
    color: '#FFF',
  },
  panelContent: {
    flex: 1,
    backgroundColor: '#000000',
  }
});

