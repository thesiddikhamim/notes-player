import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, BackHandler, useWindowDimensions } from 'react-native';
import { Video, Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useKeepAwake, deactivateKeepAwake } from 'expo-keep-awake';

export default function VideoPlayer({ source, onGoBack, onTimeUpdate, videoRef, onEndReached }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioMode, setAudioMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [screenOffPlay, setScreenOffPlay] = useState(false);
  const [status, setStatus] = useState({});
  const { width, height } = useWindowDimensions();

  // Keep screen awake normally, unless screenOffPlay is true
  useKeepAwake();
  useEffect(() => {
    if (screenOffPlay) {
      deactivateKeepAwake();
    }
  }, [screenOffPlay]);

  useEffect(() => {
    // Set Audio Mode for background play
    Audio.setAudioModeAsync({
      staysActiveInBackground: true,
      shouldDuckAndroid: false,
      playsInSilentModeIOS: true,
      allowsRecordingIOS: false,
    });

    const onBackPress = () => {
      if (isFullscreen) {
        toggleFullscreen();
        return true;
      }
      return false;
    };
    BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
  }, [isFullscreen]);

  const toggleFullscreen = async () => {
    if (isFullscreen) {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      setIsFullscreen(false);
    } else {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
      setIsFullscreen(true);
    }
  };

  const handlePlaybackStatusUpdate = (newStatus) => {
    setStatus(newStatus);
    if (newStatus.isLoaded) {
      if (newStatus.isPlaying !== isPlaying) {
        setIsPlaying(newStatus.isPlaying);
      }
      if (onTimeUpdate) {
        onTimeUpdate(newStatus.positionMillis / 1000); // Send time in seconds
      }
      if (newStatus.didJustFinish) {
        if (onEndReached) onEndReached();
      }
    }
  };

  const togglePlayPause = async () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      await videoRef.current.pauseAsync();
    } else {
      await videoRef.current.playAsync();
    }
  };

  return (
    <View style={[styles.container, isFullscreen && styles.fullscreenContainer]}>
      {audioMode ? (
        <View style={styles.audioModeView}>
          <Ionicons name="musical-notes" size={48} color="#fff" />
          <Text style={styles.audioModeText}>Audio Mode</Text>
        </View>
      ) : (
        <Video
          ref={videoRef}
          source={{ uri: source }}
          style={styles.video}
          shouldPlay={isPlaying}
          resizeMode={Video.RESIZE_MODE_CONTAIN}
          onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
        />
      )}

      {/* Controls Overlay */}
      <View style={styles.controlsOverlay} pointerEvents="box-none">
        <View style={styles.topRow}>
          <TouchableOpacity onPress={onGoBack} style={styles.iconButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.topRightControls}>
            <TouchableOpacity onPress={() => setAudioMode(!audioMode)} style={styles.iconButton}>
              <Ionicons name={audioMode ? "headset" : "headset-outline"} size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setScreenOffPlay(!screenOffPlay)} style={styles.iconButton}>
              <Ionicons name={screenOffPlay ? "moon" : "moon-outline"} size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={toggleFullscreen} style={styles.iconButton}>
              <Ionicons name={isFullscreen ? "contract" : "expand"} size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.centerControl} pointerEvents="box-none">
           <TouchableOpacity onPress={togglePlayPause} style={styles.playPauseButton}>
             <Ionicons name={isPlaying ? "pause" : "play"} size={48} color="#fff" />
           </TouchableOpacity>
        </View>

        <View style={styles.bottomRow}>
             {/* Progress bar mock */}
             <Text style={styles.timeText}>
               {status.positionMillis ? (status.positionMillis / 1000).toFixed(0) : '0'}s / {status.durationMillis ? (status.durationMillis / 1000).toFixed(0) : '0'}s
             </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '38%',
    backgroundColor: '#000',
    position: 'relative',
  },
  fullscreenContainer: {
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 999,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  audioModeView: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  audioModeText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    padding: 10,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  topRightControls: {
    flexDirection: 'row',
  },
  iconButton: {
    padding: 8,
  },
  centerControl: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    color: '#fff',
  }
});
