import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import VideoPlayer from '../components/VideoPlayer';
import NotePanel from '../components/NotePanel';
import TranscriptionPanel from '../components/TranscriptionPanel';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PlayerScreen({ route, navigation }) {
  const { video } = route.params;
  const [activeTab, setActiveTab] = useState('notes');
  const [currentTime, setCurrentTime] = useState(0);
  const videoRef = useRef(null);

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
      />
      <View style={styles.contentPanel}>
        <View style={styles.tabBar}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'notes' && styles.activeTab]}
            onPress={() => setActiveTab('notes')}
          >
            <Text style={[styles.tabText, activeTab === 'notes' && styles.activeTabText]}>Notes</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'transcript' && styles.activeTab]}
            onPress={() => setActiveTab('transcript')}
          >
            <Text style={[styles.tabText, activeTab === 'transcript' && styles.activeTabText]}>Transcript</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.panelContent}>
          {activeTab === 'notes' ? (
            <NotePanel videoId={video.id} currentTime={currentTime} />
          ) : (
            <TranscriptionPanel currentTime={currentTime} onSeek={handleSeek} />
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
    flex: 1, // ~62% assuming Video is ~38% fixed height or ratio
    backgroundColor: '#0d0d0d',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#4CAF50',
  },
  tabText: {
    color: '#555',
    fontWeight: 'bold',
  },
  activeTabText: {
    color: '#fff',
  },
  panelContent: {
    flex: 1,
  }
});
